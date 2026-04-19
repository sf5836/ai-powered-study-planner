import mongoose from "mongoose";

const userPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    alertSensitivity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    defaultSessionLength: {
      type: Number,
      default: 45,
      min: 15,
      max: 180,
    },
    breakInterval: {
      type: Number,
      default: 25,
      min: 5,
      max: 120,
    },
    pushNotifications: {
      type: Boolean,
      default: true,
    },
    preSessionReminder: {
      type: Boolean,
      default: true,
    },
    reminderTime: {
      type: String,
      default: "08:30",
    },
    streakReminder: {
      type: Boolean,
      default: true,
    },
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "light",
    },
  },
  {
    timestamps: true,
  }
);

export const UserPreference = mongoose.model("UserPreference", userPreferenceSchema);
