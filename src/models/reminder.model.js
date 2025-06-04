import mongoose from "mongoose"

const ReminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  remindAt: { type: Date, required: true }, // exact timestamp to fire
  type: { type: String, default: "custom" }, // e.g., 'habit', 'goal_deadline', or 'custom'
  relatedId: { type: mongoose.Schema.Types.ObjectId, default: null }, // optional link to habit/goal
  isSent: { type: Boolean, default: false }, // flips to true once “sent”
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

export default mongoose.model("Reminder", ReminderSchema)
