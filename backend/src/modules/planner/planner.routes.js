import { Router } from "express";
import mongoose from "mongoose";
import { generatePlannerRecommendations } from "../../config/aiService.js";
import { authMiddleware } from "../../middleware/auth.js";
import { PlannerSession } from "../../models/PlannerSession.js";
import { Subject } from "../../models/Subject.js";
import { Topic } from "../../models/Topic.js";

const router = Router();

function parsePagination(query) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 100)));
  return { page, limit, skip: (page - 1) * limit };
}

function normalizeSessionPayload(payload = {}) {
  return {
    subjectId: payload.subjectId,
    topicId: payload.topicId || null,
    topicName: payload.topicName ? String(payload.topicName).trim() : "",
    date: payload.date,
    startHour: Number(payload.startHour),
    durationMinutes: Number(payload.durationMinutes),
    notes: String(payload.notes || ""),
  };
}

function validateSessionPayload(session) {
  if (!mongoose.isValidObjectId(session.subjectId)) {
    return "subjectId is invalid";
  }
  if (session.topicId && !mongoose.isValidObjectId(session.topicId)) {
    return "topicId is invalid";
  }
  if (!session.topicName || session.topicName.length < 2) {
    return "topicName must be at least 2 characters";
  }
  const date = new Date(session.date);
  if (Number.isNaN(date.getTime())) {
    return "date must be a valid date";
  }
  if (!Number.isFinite(session.startHour) || session.startHour < 0 || session.startHour > 23) {
    return "startHour must be between 0 and 23";
  }
  if (!Number.isFinite(session.durationMinutes) || session.durationMinutes < 15 || session.durationMinutes > 360) {
    return "durationMinutes must be between 15 and 360";
  }

  return null;
}

function getWeekStartDate(value) {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      parsed.setHours(0, 0, 0, 0);
      return parsed;
    }
  }

  const today = new Date();
  const day = today.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function daysUntil(deadline) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(deadline);
  due.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((due.getTime() - now.getTime()) / 86400000));
}

router.get("/sessions", authMiddleware, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const startDate = String(req.query.startDate || "").trim();
    const endDate = String(req.query.endDate || "").trim();

    const filter = { userId: req.user.sub };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const parsed = new Date(startDate);
        if (!Number.isNaN(parsed.getTime())) {
          filter.date.$gte = parsed;
        }
      }
      if (endDate) {
        const parsed = new Date(endDate);
        if (!Number.isNaN(parsed.getTime())) {
          filter.date.$lte = parsed;
        }
      }
    }

    const [items, total] = await Promise.all([
      PlannerSession.find(filter).sort({ date: 1, startHour: 1 }).skip(skip).limit(limit),
      PlannerSession.countDocuments(filter),
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

router.post("/sessions", authMiddleware, async (req, res, next) => {
  try {
    const session = normalizeSessionPayload(req.body);
    const validationError = validateSessionPayload(session);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const subject = await Subject.findOne({ _id: session.subjectId, userId: req.user.sub });
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    if (session.topicId) {
      const topic = await Topic.findOne({
        _id: session.topicId,
        userId: req.user.sub,
        subjectId: session.subjectId,
      });
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
    }

    const item = await PlannerSession.create({
      userId: req.user.sub,
      ...session,
      date: new Date(session.date),
    });

    return res.status(201).json({ item });
  } catch (error) {
    return next(error);
  }
});

router.post("/generate", authMiddleware, async (req, res, next) => {
  try {
    const weekStartDate = getWeekStartDate(req.body?.weekStartDate);
    const availableMinutesPerDay = Math.max(30, Math.min(480, Number(req.body?.availableMinutesPerDay || 120)));
    const preferenceByTopic = req.body?.preferenceByTopic || {};

    const topicIds = Array.isArray(req.body?.topicIds) ? req.body.topicIds.filter((id) => mongoose.isValidObjectId(id)) : [];

    const filter = { userId: req.user.sub };
    if (topicIds.length > 0) {
      filter._id = { $in: topicIds };
    }

    let topics = await Topic.find(filter).sort({ deadline: 1, difficulty: -1 }).limit(200);
    if (topics.length === 0) {
      const subjects = await Subject.find({ userId: req.user.sub }).sort({ createdAt: -1 }).limit(200);
      if (subjects.length === 0) {
        return res.status(400).json({ message: "No topics or subjects available for generation" });
      }

      const fallbackDeadline = new Date();
      fallbackDeadline.setDate(fallbackDeadline.getDate() + 14);

      topics = subjects.map((subject) => ({
        _id: `subject-${subject._id}`,
        subjectId: subject._id,
        name: `${subject.name} Study`,
        deadline: fallbackDeadline,
        difficulty: 3,
        preparationPercent: 50,
      }));
    }

    const payload = {
      schemaVersion: "v1",
      modelVersion: "planner-heuristic-v1",
      weekStartDate: weekStartDate.toISOString(),
      availableMinutesPerDay,
      topics: topics.map((topic) => ({
        topicId: String(topic._id),
        subjectId: String(topic.subjectId),
        topicName: topic.name,
        deadlineDays: daysUntil(topic.deadline),
        difficulty: topic.difficulty,
        preparationPercent: topic.preparationPercent,
        preference: Math.max(0, Math.min(100, Number(preferenceByTopic[String(topic._id)] ?? 50))),
      })),
    };

    const plan = await generatePlannerRecommendations(payload);
    const suggestions = Array.isArray(plan.suggestions) ? plan.suggestions : [];

    const toInsert = suggestions
      .filter((suggestion) => mongoose.isValidObjectId(suggestion.subjectId))
      .map((suggestion) => {
        const date = new Date(weekStartDate);
        date.setDate(weekStartDate.getDate() + Number(suggestion.dayOffset || 0));

        return {
          userId: req.user.sub,
          subjectId: suggestion.subjectId,
          topicId: mongoose.isValidObjectId(suggestion.topicId) ? suggestion.topicId : null,
          topicName: String(suggestion.topicName || "Study Topic"),
          date,
          startHour: Math.max(0, Math.min(23, Number(suggestion.startHour || 15))),
          durationMinutes: Math.max(15, Math.min(180, Number(suggestion.durationMinutes || 60))),
          notes: `AI Generated (${plan.modelVersion || "planner"}) score=${Number(suggestion.priorityScore || 0).toFixed(2)}`,
        };
      });

    const created = toInsert.length > 0 ? await PlannerSession.insertMany(toInsert) : [];

    return res.status(201).json({
      weekStartDate,
      count: created.length,
      source: plan.modelVersion || "planner-fallback-v1",
      items: created,
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/sessions/:id", authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid planner session id" });
    }

    const updates = {};

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

    if (Object.hasOwn(req.body || {}, "topicId")) {
      if (req.body.topicId && !mongoose.isValidObjectId(req.body.topicId)) {
        return res.status(400).json({ message: "topicId is invalid" });
      }
      updates.topicId = req.body.topicId || null;
    }

    if (Object.hasOwn(req.body || {}, "topicName")) {
      const topicName = String(req.body.topicName || "").trim();
      if (topicName.length < 2) {
        return res.status(400).json({ message: "topicName must be at least 2 characters" });
      }
      updates.topicName = topicName;
    }

    if (Object.hasOwn(req.body || {}, "date")) {
      const date = new Date(req.body.date);
      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({ message: "date must be a valid date" });
      }
      updates.date = date;
    }

    if (Object.hasOwn(req.body || {}, "startHour")) {
      const startHour = Number(req.body.startHour);
      if (!Number.isFinite(startHour) || startHour < 0 || startHour > 23) {
        return res.status(400).json({ message: "startHour must be between 0 and 23" });
      }
      updates.startHour = startHour;
    }

    if (Object.hasOwn(req.body || {}, "durationMinutes")) {
      const durationMinutes = Number(req.body.durationMinutes);
      if (!Number.isFinite(durationMinutes) || durationMinutes < 15 || durationMinutes > 360) {
        return res.status(400).json({ message: "durationMinutes must be between 15 and 360" });
      }
      updates.durationMinutes = durationMinutes;
    }

    if (Object.hasOwn(req.body || {}, "notes")) {
      updates.notes = String(req.body.notes || "").slice(0, 800);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid updates provided" });
    }

    const existing = await PlannerSession.findOne({ _id: id, userId: req.user.sub });
    if (!existing) {
      return res.status(404).json({ message: "Planner session not found" });
    }

    if (Object.hasOwn(updates, "topicId") && updates.topicId) {
      const subjectId = updates.subjectId || existing.subjectId;
      const topic = await Topic.findOne({
        _id: updates.topicId,
        userId: req.user.sub,
        subjectId,
      });
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
    }

    const item = await PlannerSession.findOneAndUpdate(
      { _id: id, userId: req.user.sub },
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});

router.delete("/sessions/:id", authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid planner session id" });
    }

    const result = await PlannerSession.deleteOne({ _id: id, userId: req.user.sub });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Planner session not found" });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
