import mongoose from "mongoose";

const plannerSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
      default: null,
      index: true,
    },
    topicName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 140,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    startHour: {
      type: Number,
      required: true,
      min: 0,
      max: 23,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 15,
      max: 360,
    },
    notes: {
      type: String,
      default: "",
      maxlength: 800,
    },
  },
  { timestamps: true }
);

plannerSessionSchema.index({ userId: 1, date: 1, startHour: 1 });

export const PlannerSession = mongoose.model("PlannerSession", plannerSessionSchema);
