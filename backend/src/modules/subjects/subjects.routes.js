import { Router } from "express";
import mongoose from "mongoose";
import { authMiddleware } from "../../middleware/auth.js";
import { PlannerSession } from "../../models/PlannerSession.js";
import { Subject } from "../../models/Subject.js";
import { Topic } from "../../models/Topic.js";

const router = Router();

function parsePagination(query) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
  return { page, limit, skip: (page - 1) * limit };
}

function validateSubjectPayload(payload) {
  const { name, color } = payload || {};
  if (!name || String(name).trim().length < 2) {
    return "name must be at least 2 characters";
  }

  if (!color || !/^#([A-Fa-f0-9]{6})$/.test(String(color))) {
    return "color must be a valid hex value like #00C2CB";
  }

  return null;
}

router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const q = String(req.query.q || "").trim();

    const filter = {
      userId: req.user.sub,
      ...(q ? { name: { $regex: q, $options: "i" } } : {}),
    };

    const [items, total] = await Promise.all([
      Subject.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Subject.countDocuments(filter),
    ]);

    return res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const validationError = validateSubjectPayload(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const subject = await Subject.create({
      userId: req.user.sub,
      name: String(req.body.name).trim(),
      color: String(req.body.color),
    });

    return res.status(201).json({ item: subject });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Subject with this name already exists" });
    }
    return next(error);
  }
});

router.patch("/:id", authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid subject id" });
    }

    const updates = {};
    if (Object.hasOwn(req.body || {}, "name")) {
      if (String(req.body.name).trim().length < 2) {
        return res.status(400).json({ message: "name must be at least 2 characters" });
      }
      updates.name = String(req.body.name).trim();
    }
    if (Object.hasOwn(req.body || {}, "color")) {
      if (!/^#([A-Fa-f0-9]{6})$/.test(String(req.body.color))) {
        return res.status(400).json({ message: "color must be a valid hex value like #00C2CB" });
      }
      updates.color = String(req.body.color);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid updates provided" });
    }

    const item = await Subject.findOneAndUpdate(
      { _id: id, userId: req.user.sub },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ message: "Subject not found" });
    }

    return res.json({ item });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Subject with this name already exists" });
    }
    return next(error);
  }
});

router.delete("/:id", authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid subject id" });
    }

    const result = await Subject.deleteOne({ _id: id, userId: req.user.sub });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Subject not found" });
    }

    await Promise.all([
      Topic.deleteMany({ userId: req.user.sub, subjectId: id }),
      PlannerSession.deleteMany({ userId: req.user.sub, subjectId: id }),
    ]);

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
