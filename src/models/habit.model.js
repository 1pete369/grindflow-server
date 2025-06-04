// src/models/habit.model.js

import mongoose from "mongoose"

const habitSchema = new mongoose.Schema(
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
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true,
    },
    days: {
      type: [String], // e.g., ["Monday", "Wednesday"]
      default: [],
    },
    startDate: {
      type: Date,
      required: true,
    },
    completedDates: {
      type: [Date],
      default: [],
    },
    streak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastCompletedAt: {
      type: Date,
      default: null, // for time-based insights
    },
    linkedGoalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      default: null,
    },
    icon: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: "General",
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

// INDEXES
// Quickly find all habits belonging to a particular user:
habitSchema.index({ userId: 1 })

// Quickly find all habits linked to a given goal:
habitSchema.index({ linkedGoalId: 1 })

// (Optional) Speed up queries that look for a date inside the completedDates array:
// e.g. Habit.find({ completedDates: { $elemMatch: { $gte: someDate, $lt: anotherDate } } })
habitSchema.index({ completedDates: 1 })

const Habit = mongoose.model("Habit", habitSchema)
export default Habit
