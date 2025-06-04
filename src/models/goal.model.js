// src/models/goal.model.js

import mongoose from "mongoose"

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    targetDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    linkedHabits: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Habit",
        },
      ],
      default: [],
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    category: {
      type: String,
      default: "General",
    },
    missedDays: {
      type: Number,
      default: 0,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
)

// INDEXES
// Quickly find all goals belonging to a particular user:
goalSchema.index({ userId: 1 })

// (Optional) If you often query "Goal.find({ _id: someId }).populate('linkedHabits')",
// the linkedHabits themselves are fetched by Habit._id, which is already indexed by default.

// If you ever run queries on the linkedHabits array directly, you could optionally add:
// goalSchema.index({ linkedHabits: 1 })

const Goal = mongoose.model("Goal", goalSchema)
export default Goal
