import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { Router } from "express";
import { env } from "../../config/env.js";
import { authMiddleware } from "../../middleware/auth.js";
import { RefreshToken } from "../../models/RefreshToken.js";
import { User } from "../../models/User.js";
import { UserPreference } from "../../models/UserPreference.js";

const router = Router();

function issueAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      tokenType: "access",
    },
    env.jwtAccessSecret,
    { expiresIn: env.accessTokenTtl }
  );
}

function issueRefreshToken(user, jti) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      tokenType: "refresh",
      jti,
    },
    env.jwtRefreshSecret,
    { expiresIn: env.refreshTokenTtl }
  );
}

function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
  };
}

async function createAuthPayload(user) {
  const jti = crypto.randomUUID();
  const accessToken = issueAccessToken(user);
  const refreshToken = issueRefreshToken(user, jti);
  const tokenHash = await bcrypt.hash(refreshToken, 10);
  const decoded = jwt.decode(refreshToken);
  const expiresAt = new Date((decoded.exp || 0) * 1000);

  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    jti,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  };
}

router.post("/signup", async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "fullName, email, and password are required" });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName: String(fullName).trim(),
      email: normalizedEmail,
      passwordHash,
    });

    await UserPreference.create({ userId: user._id });
    const authPayload = await createAuthPayload(user);

    return res.status(201).json(authPayload);
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const authPayload = await createAuthPayload(user);

    return res.json(authPayload);
  } catch (error) {
    return next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: "refreshToken is required" });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
    } catch {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    if (payload.tokenType !== "refresh" || !payload.jti) {
      return res.status(401).json({ message: "Invalid refresh token payload" });
    }

    const tokenRecord = await RefreshToken.findOne({
      jti: payload.jti,
      userId: payload.sub,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenRecord) {
      return res.status(401).json({ message: "Refresh token revoked or not found" });
    }

    const matches = await bcrypt.compare(refreshToken, tokenRecord.tokenHash);
    if (!matches) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    tokenRecord.revokedAt = new Date();
    await tokenRecord.save();

    const authPayload = await createAuthPayload(user);

    return res.json(authPayload);
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", authMiddleware, async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};

    if (refreshToken) {
      try {
        const payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
        if (payload.tokenType === "refresh" && payload.jti) {
          await RefreshToken.updateOne(
            {
              jti: payload.jti,
              userId: req.user.sub,
              revokedAt: null,
            },
            { $set: { revokedAt: new Date() } }
          );
        }
      } catch {
        // Ignore invalid refresh token payload during logout.
      }
    } else {
      await RefreshToken.updateMany(
        {
          userId: req.user.sub,
          revokedAt: null,
        },
        { $set: { revokedAt: new Date() } }
      );
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

router.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub).select("_id fullName email");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    return next(error);
  }
});

export default router;
