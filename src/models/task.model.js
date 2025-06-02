import mongoose from "mongoose"

const taskSchema = new mongoose.Schema(
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
    isCompleted: {
      type: Boolean,
      default: false,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      required: true,
      trim: true,
    },
    recurring: {
      type: String,
      enum: ["none", "daily", "weekly", "monthly"],
      default: "none",
    },
    days: {
      type: [String],
      default: [],
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    completedDates: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
)

const Task = mongoose.model("Task", taskSchema)
export default Task
