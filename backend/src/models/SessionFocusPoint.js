import mongoose from "mongoose";

const sessionFocusPointSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudySession",
      required: true,
      index: true,
    },
    secondOffset: {
      type: Number,
      required: true,
      min: 0,
    },
    focusPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    emotion: {
      type: String,
      enum: ["happy", "neutral", "confused", "bored", "stressed", "tired", "frustrated"],
      default: "neutral",
    },
    confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    readinessScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    alertLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

sessionFocusPointSchema.index({ sessionId: 1, secondOffset: 1 }, { unique: true });
sessionFocusPointSchema.index({ userId: 1, createdAt: -1 });

export const SessionFocusPoint = mongoose.model("SessionFocusPoint", sessionFocusPointSchema);
