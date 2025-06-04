import mongoose from "mongoose"

// Sub‐document schema for participants
const ParticipantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  joinDate: { type: Date, default: Date.now },
  completedCount: { type: Number, default: 0 },
  lastCheckInDate: { type: Date, default: null }, // to prevent multiple check‐ins in same day
})

// Main Challenge schema
const ChallengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [ParticipantSchema], // array of participants
  },
  { timestamps: true }
)

const Challenge =
  mongoose.models.Challenge || mongoose.model("Challenge", ChallengeSchema)

export default Challenge
