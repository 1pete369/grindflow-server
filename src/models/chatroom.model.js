import mongoose from "mongoose"

const ChatRoomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // e.g. "Daily Wins"
  isPrivate: { type: Boolean, default: false }, // public vs private room
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // user IDs who can join
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.model("ChatRoom", ChatRoomSchema)
