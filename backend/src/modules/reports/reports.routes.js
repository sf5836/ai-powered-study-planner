import { Router } from "express";
import fs from "node:fs";
import mongoose from "mongoose";
import { enqueueReportJob } from "../../jobs/queue.js";
import { Report } from "../../models/Report.js";
import { authMiddleware } from "../../middleware/auth.js";
import { SessionFocusPoint } from "../../models/SessionFocusPoint.js";
import { StudySession } from "../../models/StudySession.js";
import { cacheGetJson, cacheSetJson } from "../../shared/utils/cache.js";

const router = Router();

const EMOTIONS = ["happy", "neutral", "confused", "bored", "stressed", "tired", "frustrated"];

function parseRange(range) {
  const value = String(range || "7d").trim();
  if (value === "all") {
    return null;
  }
  if (value === "30d") {
    return 30;
  }
  return 7;
}

function emotionBreakdownFrom(points) {
  const counts = {
    happy: 0,
    neutral: 0,
    confused: 0,
    bored: 0,
    stressed: 0,
    tired: 0,
    frustrated: 0,
  };

  if (points.length === 0) {
    counts.neutral = 100;
    return counts;
  }

  points.forEach((point) => {
    if (EMOTIONS.includes(point.emotion)) {
      counts[point.emotion] += 1;
    }
  });

  const total = points.length;
  Object.keys(counts).forEach((emotion) => {
    counts[emotion] = Math.round((counts[emotion] / total) * 100);
  });

  return counts;
}

router.get("/sessions", authMiddleware, async (req, res, next) => {
  try {
    const range = parseRange(req.query.range);
    const subjectId = String(req.query.subjectId || "all").trim();

    const filter = {
      userId: req.user.sub,
      status: "completed",
    };

    if (range !== null) {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - range);
      filter.startedAt = { $gte: threshold };
    }

    if (subjectId !== "all") {
      if (!mongoose.isValidObjectId(subjectId)) {
        return res.status(400).json({ message: "subjectId is invalid" });
      }
      filter.subjectId = subjectId;
    }

    const sessions = await StudySession.find(filter)
      .select("_id subjectId topicId topicName startedAt durationMinutes avgFocusPercent")
      .sort({ startedAt: -1 })
      .limit(500)
      .lean();
    const sessionIds = sessions.map((session) => session._id);

    const points =
      sessionIds.length > 0
        ? await SessionFocusPoint.find({
            userId: req.user.sub,
            sessionId: { $in: sessionIds },
          })
            .select("sessionId secondOffset focusPercent emotion")
            .sort({ secondOffset: 1 })
            .lean()
        : [];

    const pointsBySession = new Map();
    points.forEach((point) => {
      const key = String(point.sessionId);
      const existing = pointsBySession.get(key) || [];
      existing.push(point);
      pointsBySession.set(key, existing);
    });

    const items = sessions.map((session) => {
      const sessionPoints = pointsBySession.get(String(session._id)) || [];

      return {
        id: String(session._id),
        subjectId: String(session.subjectId),
        topicId: session.topicId ? String(session.topicId) : "",
        topicName: session.topicName,
        startTime: session.startedAt,
        durationMinutes: session.durationMinutes,
        focusPercent: session.avgFocusPercent,
        emotionBreakdown: emotionBreakdownFrom(sessionPoints),
        focusTimeline: sessionPoints.map((point) => point.focusPercent),
      };
    });

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.get("/summary", authMiddleware, async (req, res, next) => {
  try {
    const range = parseRange(req.query.range);
    const subjectId = String(req.query.subjectId || "all").trim();

    const cacheKey = `reports:summary:${req.user.sub}:${range ?? "all"}:${subjectId}`;
    const cached = await cacheGetJson(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const filter = {
      userId: new mongoose.Types.ObjectId(req.user.sub),
      status: "completed",
    };

    if (range !== null) {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - range);
      filter.startedAt = { $gte: threshold };
    }

    if (subjectId !== "all") {
      if (!mongoose.isValidObjectId(subjectId)) {
        return res.status(400).json({ message: "subjectId is invalid" });
      }
      filter.subjectId = new mongoose.Types.ObjectId(subjectId);
    }

    const [aggregate] = await StudySession.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          sessionsCount: { $sum: 1 },
          avgFocusPercent: { $avg: "$avgFocusPercent" },
          totalMinutes: { $sum: "$durationMinutes" },
          bestFocusPercent: { $max: "$avgFocusPercent" },
        },
      },
    ]);

    const payload = {
      sessionsCount: aggregate?.sessionsCount || 0,
      avgFocusPercent: Math.round(aggregate?.avgFocusPercent || 0),
      totalMinutes: aggregate?.totalMinutes || 0,
      bestFocusPercent: Math.round(aggregate?.bestFocusPercent || 0),
      cached: false,
    };

    await cacheSetJson(cacheKey, payload);
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

router.post("/:sessionId/generate", authMiddleware, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!mongoose.isValidObjectId(sessionId)) {
      return res.status(400).json({ message: "Invalid session id" });
    }

    const session = await StudySession.findOne({ _id: sessionId, userId: req.user.sub, status: "completed" });
    if (!session) {
      return res.status(404).json({ message: "Completed session not found" });
    }

    const result = await enqueueReportJob({ userId: req.user.sub, sessionId });

    return res.status(202).json({
      queued: result.queued,
      report: {
        id: String(result.report._id),
        status: result.report.status,
        attempts: result.report.attempts,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:sessionId/status", authMiddleware, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!mongoose.isValidObjectId(sessionId)) {
      return res.status(400).json({ message: "Invalid session id" });
    }

    const report = await Report.findOne({ userId: req.user.sub, sessionId });
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    return res.json({
      item: {
        id: String(report._id),
        status: report.status,
        attempts: report.attempts,
        summary: report.summary,
        fileName: report.fileName,
        completedAt: report.completedAt,
        lastError: report.lastError,
        deadLetterReason: report.deadLetterReason,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:sessionId/download", authMiddleware, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!mongoose.isValidObjectId(sessionId)) {
      return res.status(400).json({ message: "Invalid session id" });
    }

    const report = await Report.findOne({ userId: req.user.sub, sessionId, status: "completed" });
    if (!report) {
      return res.status(404).json({ message: "Report file not ready" });
    }

    if (!report.filePath || !fs.existsSync(report.filePath)) {
      return res.status(404).json({ message: "Report artifact missing" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${report.fileName || `report-${sessionId}.pdf`}"`);
    return fs.createReadStream(report.filePath).pipe(res);
  } catch (error) {
    return next(error);
  }
});

router.delete("/sessions/:id", authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid session id" });
    }

    const result = await StudySession.deleteOne({ _id: id, userId: req.user.sub });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Session not found" });
    }

    await Promise.all([
      SessionFocusPoint.deleteMany({ sessionId: id, userId: req.user.sub }),
      Report.deleteOne({ sessionId: id, userId: req.user.sub }),
    ]);

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
