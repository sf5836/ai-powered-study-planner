import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";
import { UserPreference } from "../../models/UserPreference.js";

const router = Router();

const allowedFields = [
  "alertSensitivity",
  "defaultSessionLength",
  "breakInterval",
  "pushNotifications",
  "preSessionReminder",
  "reminderTime",
  "streakReminder",
  "theme",
];

function sanitizePatchPayload(input) {
  const updates = {};
  for (const key of allowedFields) {
    if (Object.hasOwn(input, key)) {
      updates[key] = input[key];
    }
  }
  return updates;
}

router.get("/preferences", authMiddleware, async (req, res, next) => {
  try {
    let preferences = await UserPreference.findOne({ userId: req.user.sub });
    if (!preferences) {
      preferences = await UserPreference.create({ userId: req.user.sub });
    }

    return res.json({ preferences });
  } catch (error) {
    return next(error);
  }
});

router.patch("/preferences", authMiddleware, async (req, res, next) => {
  try {
    const updates = sanitizePatchPayload(req.body || {});
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid preference fields provided" });
    }

    const preferences = await UserPreference.findOneAndUpdate(
      { userId: req.user.sub },
      { $set: updates },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return res.json({ preferences });
  } catch (error) {
    return next(error);
  }
});

export default router;
