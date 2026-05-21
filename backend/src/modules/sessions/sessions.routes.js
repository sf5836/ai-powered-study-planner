import { Router } from "express";
import mongoose from "mongoose";
import { inferFromSignals } from "../../config/aiService.js";
import { enqueueReportJob } from "../../jobs/queue.js";
import { authMiddleware } from "../../middleware/auth.js";
import { SessionFocusPoint } from "../../models/SessionFocusPoint.js";
import { StudySession } from "../../models/StudySession.js";
import { Subject } from "../../models/Subject.js";
import { Topic } from "../../models/Topic.js";
import { Notification } from "../../models/Notification.js";
import { getSocketGateway } from "../../realtime/socket.gateway.js";
import { SESSION_EVENTS } from "../../realtime/session.events.js";

const router = Router();

function toObjectId(value) {
  return new mongoose.Types.ObjectId(value);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

async function buildSessionStats(sessionId, userId) {
  const aggregates = await SessionFocusPoint.aggregate([
    {
      $match: {
        sessionId: toObjectId(sessionId),
        userId: toObjectId(userId),
      },
    },
    {
      $group: {
        _id: "$sessionId",
        avgFocus: { $avg: "$focusPercent" },
        avgReadiness: { $avg: "$readinessScore" },
        l1: {
          $sum: {
            $cond: [{ $eq: ["$alertLevel", 1] }, 1, 0],
          },
        },
        l2: {
          $sum: {
            $cond: [{ $eq: ["$alertLevel", 2] }, 1, 0],
          },
        },
        l3: {
          $sum: {
            $cond: [{ $eq: ["$alertLevel", 3] }, 1, 0],
          },
        },
      },
    },
  ]);

  const summary = aggregates[0];
  if (!summary) {
    return {
      avgFocusPercent: 0,
      readinessScore: 0,
      alertCountL1: 0,
      alertCountL2: 0,
      alertCountL3: 0,
    };
  }

  return {
    avgFocusPercent: Math.round(summary.avgFocus || 0),
    readinessScore: Math.round(summary.avgReadiness || 0),
    alertCountL1: summary.l1 || 0,
    alertCountL2: summary.l2 || 0,
    alertCountL3: summary.l3 || 0,
  };
}

router.get("/active", authMiddleware, async (req, res, next) => {
  try {
    const item = await StudySession.findOne({
      userId: req.user.sub,
      status: { $in: ["active", "paused"] },
    }).sort({ startedAt: -1 });

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});

router.post("/start", authMiddleware, async (req, res, next) => {
  try {
    const subjectId = String(req.body.subjectId || "").trim();
    const topicId = String(req.body.topicId || "").trim();
    const topicName = String(req.body.topicName || "").trim();

    if (!mongoose.isValidObjectId(subjectId)) {
      return res.status(400).json({ message: "subjectId is invalid" });
    }
    if (topicId && !mongoose.isValidObjectId(topicId)) {
      return res.status(400).json({ message: "topicId is invalid" });
    }
    if (!topicName || topicName.length < 2) {
      return res.status(400).json({ message: "topicName must be at least 2 characters" });
    }

    const subject = await Subject.findOne({ _id: subjectId, userId: req.user.sub });
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    if (topicId) {
      const topic = await Topic.findOne({
        _id: topicId,
        subjectId,
        userId: req.user.sub,
      });
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
    }

    const existing = await StudySession.findOne({
      userId: req.user.sub,
      status: { $in: ["active", "paused"] },
    }).sort({ startedAt: -1 });

    if (existing) {
      return res.status(409).json({ message: "A study session is already active", item: existing });
    }

    const item = await StudySession.create({
      userId: req.user.sub,
      subjectId,
      topicId: topicId || null,
      topicName,
      startedAt: new Date(),
      status: "active",
    });

    try {
      const notification = await Notification.create({
        userId: req.user.sub,
        type: "system",
        title: "Session started",
        message: `You started ${topicName}. Stay focused!`,
        status: "sent",
      });

      const io = getSocketGateway();
      io?.emit("notifications:new", { item: notification });
    } catch {
      // Notifications should not block session start.
    }

    const io = getSocketGateway();
    io?.emit(SESSION_EVENTS.START, { sessionId: String(item._id), status: item.status });

    return res.status(201).json({ item });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/events", authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid session id" });
    }

    const session = await StudySession.findOne({ _id: id, userId: req.user.sub });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    if (session.status === "completed" || session.status === "aborted") {
      return res.status(400).json({ message: "Session is already ended" });
    }

    const secondOffset = Number(req.body.secondOffset);
    const alertLevel = Number(req.body.alertLevel || 0);

    const signals = {
      lookingAway: Boolean(req.body.lookingAway),
      yawning: Boolean(req.body.yawning),
      slouching: Boolean(req.body.slouching),
      phoneDetected: Boolean(req.body.phoneDetected),
      elapsedSeconds: Number(req.body.elapsedSeconds || secondOffset),
      alertLevel: clamp(Math.round(alertLevel), 0, 3),
      calibrationSeconds: Number(req.body.calibrationSeconds || 0),
    };

    if (!Number.isFinite(secondOffset) || secondOffset < 0) {
      return res.status(400).json({ message: "secondOffset must be a positive number" });
    }

    const inference = await inferFromSignals(signals);
    const focusPercent = Number(inference.focus?.score || 0);
    const emotion = String(inference.emotion?.label || "neutral").trim();
    const confidence = Number(inference.emotion?.confidence || 0);
    const readinessScore = Number(inference.readiness?.score || 0);

    const item = await SessionFocusPoint.findOneAndUpdate(
      {
        sessionId: id,
        userId: req.user.sub,
        secondOffset: Math.floor(secondOffset),
      },
      {
        $set: {
          focusPercent: clamp(Math.round(focusPercent), 0, 100),
          emotion,
          confidence: clamp(Math.round(confidence), 0, 100),
          readinessScore: clamp(Math.round(readinessScore), 0, 100),
          alertLevel: clamp(Math.round(alertLevel), 0, 3),
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    const io = getSocketGateway();
    io?.emit(SESSION_EVENTS.UPDATE, {
      sessionId: String(session._id),
      focusPercent: clamp(Math.round(focusPercent), 0, 100),
      readinessScore: clamp(Math.round(readinessScore), 0, 100),
      emotion,
      confidence: clamp(Math.round(confidence), 0, 100),
      alertLevel: clamp(Math.round(alertLevel), 0, 3),
    });

    return res.status(201).json({
      item,
      inference: {
        source: inference.source,
        focusPercent,
        emotion,
        confidence,
        readinessScore,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Duplicate event offset" });
    }
    return next(error);
  }
});

router.post("/:id/pause", authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid session id" });
    }

    const item = await StudySession.findOne({ _id: id, userId: req.user.sub });
    if (!item) {
      return res.status(404).json({ message: "Session not found" });
    }
    if (item.status === "completed" || item.status === "aborted") {
      return res.status(400).json({ message: "Session is already ended" });
    }
    if (item.status === "paused") {
      return res.json({ item });
    }

    item.status = "paused";
    item.pausedAt = new Date();
    await item.save();

    const io = getSocketGateway();
    io?.emit(SESSION_EVENTS.UPDATE, { sessionId: String(item._id), status: item.status });

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/resume", authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid session id" });
    }

    const item = await StudySession.findOne({ _id: id, userId: req.user.sub });
    if (!item) {
      return res.status(404).json({ message: "Session not found" });
    }
    if (item.status === "completed" || item.status === "aborted") {
      return res.status(400).json({ message: "Session is already ended" });
    }
    if (item.status === "active") {
      return res.json({ item });
    }

    const pausedAt = item.pausedAt ? item.pausedAt.getTime() : Date.now();
    const pausedSeconds = Math.max(0, Math.round((Date.now() - pausedAt) / 1000));

    item.totalPausedSeconds += pausedSeconds;
    item.pausedAt = null;
    item.status = "active";
    await item.save();

    const io = getSocketGateway();
    io?.emit(SESSION_EVENTS.UPDATE, { sessionId: String(item._id), status: item.status });

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/end", authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid session id" });
    }

    const notes = String(req.body.notes || "").slice(0, 2000);
    const item = await StudySession.findOne({ _id: id, userId: req.user.sub });
    if (!item) {
      return res.status(404).json({ message: "Session not found" });
    }
    if (item.status === "completed" || item.status === "aborted") {
      return res.json({ item });
    }

    const now = Date.now();
    let totalPausedSeconds = item.totalPausedSeconds;
    if (item.status === "paused" && item.pausedAt) {
      totalPausedSeconds += Math.max(0, Math.round((now - item.pausedAt.getTime()) / 1000));
    }

    const rawDurationSeconds = Math.max(0, Math.round((now - item.startedAt.getTime()) / 1000));
    const effectiveSeconds = Math.max(0, rawDurationSeconds - totalPausedSeconds);

    const stats = await buildSessionStats(item._id, req.user.sub);

    item.status = "completed";
    item.endedAt = new Date(now);
    item.pausedAt = null;
    item.totalPausedSeconds = totalPausedSeconds;
    item.durationMinutes = Math.max(1, Math.round(effectiveSeconds / 60));
    item.avgFocusPercent = stats.avgFocusPercent;
    item.readinessScore = stats.readinessScore;
    item.alertCountL1 = stats.alertCountL1;
    item.alertCountL2 = stats.alertCountL2;
    item.alertCountL3 = stats.alertCountL3;
    item.notes = notes || item.notes;
    await item.save();

    const io = getSocketGateway();
    io?.emit(SESSION_EVENTS.END, { sessionId: String(item._id), status: item.status });

    try {
      const notification = await Notification.create({
        userId: req.user.sub,
        type: "system",
        title: "Session complete",
        message: `Great work! You completed ${item.topicName}.`,
        status: "sent",
      });

      io?.emit("notifications:new", { item: notification });
    } catch {
      // Notifications should not block session completion.
    }

    // Ensure a report record exists before responding; processing remains async via worker.
    try {
      await enqueueReportJob({ userId: req.user.sub, sessionId: String(item._id) });
    } catch {
      // Report generation metadata should not block session completion response.
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});

router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const items = await StudySession.find({ userId: req.user.sub }).sort({ startedAt: -1 }).limit(100);
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

export default router;
