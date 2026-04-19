import { Router } from "express";
import mongoose from "mongoose";
import { authMiddleware } from "../../middleware/auth.js";
import { Subject } from "../../models/Subject.js";
import { Topic } from "../../models/Topic.js";

const router = Router();

function parsePagination(query) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
  return { page, limit, skip: (page - 1) * limit };
}

function normalizeTopicPayload(payload = {}) {
  return {
    subjectId: payload.subjectId,
    name: payload.name ? String(payload.name).trim() : "",
    deadline: payload.deadline,
    difficulty: Number(payload.difficulty),
    preparationPercent: Number(payload.preparationPercent),
  };
}

function validateTopicPayload(topic) {
  if (!mongoose.isValidObjectId(topic.subjectId)) {
    return "subjectId is invalid";
  }
  if (!topic.name || topic.name.length < 2) {
    return "name must be at least 2 characters";
  }
  const deadline = new Date(topic.deadline);
  if (Number.isNaN(deadline.getTime())) {
    return "deadline must be a valid date";
  }
  if (!Number.isFinite(topic.difficulty) || topic.difficulty < 1 || topic.difficulty > 5) {
    return "difficulty must be between 1 and 5";
  }
  if (!Number.isFinite(topic.preparationPercent) || topic.preparationPercent < 0 || topic.preparationPercent > 100) {
    return "preparationPercent must be between 0 and 100";
  }

  return null;
}

router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const q = String(req.query.q || "").trim();
    const subjectId = String(req.query.subjectId || "").trim();

    const filter = {
      userId: req.user.sub,
      ...(q ? { name: { $regex: q, $options: "i" } } : {}),
      ...(subjectId && mongoose.isValidObjectId(subjectId) ? { subjectId } : {}),
    };

    const [items, total] = await Promise.all([
      Topic.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Topic.countDocuments(filter),
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
    const topic = normalizeTopicPayload(req.body);
    const validationError = validateTopicPayload(topic);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const subject = await Subject.findOne({ _id: topic.subjectId, userId: req.user.sub });
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const item = await Topic.create({
      userId: req.user.sub,
      subjectId: topic.subjectId,
      name: topic.name,
      deadline: new Date(topic.deadline),
      difficulty: topic.difficulty,
      preparationPercent: topic.preparationPercent,
    });

    return res.status(201).json({ item });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Topic with this name already exists in subject" });
    }
    return next(error);
  }
});

router.patch("/:id", authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid topic id" });
    }

    const updates = {};
    if (Object.hasOwn(req.body || {}, "name")) {
      const name = String(req.body.name || "").trim();
      if (name.length < 2) {
        return res.status(400).json({ message: "name must be at least 2 characters" });
      }
      updates.name = name;
    }
    if (Object.hasOwn(req.body || {}, "deadline")) {
      const deadline = new Date(req.body.deadline);
      if (Number.isNaN(deadline.getTime())) {
        return res.status(400).json({ message: "deadline must be a valid date" });
      }
      updates.deadline = deadline;
    }
    if (Object.hasOwn(req.body || {}, "difficulty")) {
      const difficulty = Number(req.body.difficulty);
      if (!Number.isFinite(difficulty) || difficulty < 1 || difficulty > 5) {
        return res.status(400).json({ message: "difficulty must be between 1 and 5" });
      }
      updates.difficulty = difficulty;
    }
    if (Object.hasOwn(req.body || {}, "preparationPercent")) {
      const preparationPercent = Number(req.body.preparationPercent);
      if (!Number.isFinite(preparationPercent) || preparationPercent < 0 || preparationPercent > 100) {
        return res.status(400).json({ message: "preparationPercent must be between 0 and 100" });
      }
      updates.preparationPercent = preparationPercent;
    }
    if (Object.hasOwn(req.body || {}, "subjectId")) {
      if (!mongoose.isValidObjectId(req.body.subjectId)) {
        return res.status(400).json({ message: "subjectId is invalid" });
      }
      const subject = await Subject.findOne({ _id: req.body.subjectId, userId: req.user.sub });
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }
      updates.subjectId = req.body.subjectId;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid updates provided" });
    }

    const item = await Topic.findOneAndUpdate(
      { _id: id, userId: req.user.sub },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ message: "Topic not found" });
    }

    return res.json({ item });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Topic with this name already exists in subject" });
    }
    return next(error);
  }
});

router.delete("/:id", authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid topic id" });
    }

    const result = await Topic.deleteOne({ _id: id, userId: req.user.sub });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Topic not found" });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
