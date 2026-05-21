import { Router } from "express";
import mongoose from "mongoose";
import { authMiddleware } from "../../middleware/auth.js";
import { Notification } from "../../models/Notification.js";
import { getSocketGateway } from "../../realtime/socket.gateway.js";

const router = Router();

router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const status = String(req.query.status || "all");
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 30)));

    const filter = { userId: req.user.sub };
    if (status !== "all") {
      filter.status = status;
    }

    const items = await Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean();

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const allowedTypes = ["pre_session", "streak", "deadline", "system"];
    const typeInput = String(req.body.type || "system").trim();
    const type = allowedTypes.includes(typeInput) ? typeInput : "system";

    const title = String(req.body.title || "").trim();
    const message = String(req.body.message || "").trim();
    const scheduledForRaw = req.body.scheduledFor;

    if (!title || title.length < 2) {
      return res.status(400).json({ message: "title must be at least 2 characters" });
    }
    if (!message || message.length < 2) {
      return res.status(400).json({ message: "message must be at least 2 characters" });
    }

    let scheduledFor = null;
    if (scheduledForRaw) {
      const parsed = new Date(scheduledForRaw);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ message: "scheduledFor must be a valid ISO date" });
      }
      scheduledFor = parsed;
    }

    const item = await Notification.create({
      userId: req.user.sub,
      type,
      title,
      message,
      scheduledFor,
      status: "pending",
    });

    const io = getSocketGateway();
    io?.emit("notifications:new", { item });

    return res.status(201).json({ item });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id", authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const status = String(req.body.status || "").trim();
    const allowedStatuses = ["pending", "sent", "read", "dismissed"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "status must be one of pending|sent|read|dismissed" });
    }

    const patch = { status };
    if (status === "read") {
      patch.readAt = new Date();
    }

    const item = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user.sub },
      { $set: patch },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const deleted = await Notification.findOneAndDelete({ _id: id, userId: req.user.sub });
    if (!deleted) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
