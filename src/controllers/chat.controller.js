import ChatRoom from "../models/chatroom.model.js"
import Message from "../models/message.model.js"

// Create a new chat room
// POST /api/chat/rooms
export const createChatRoom = async (req, res) => {
  try {
    const { name, isPrivate, members } = req.body
    // members: array of userIds (optional for public rooms)
    const newRoom = await ChatRoom.create({
      name,
      isPrivate: isPrivate || false,
      members: members || [],
    })
    return res.status(201).json(newRoom)
  } catch (err) {
    console.error("Create ChatRoom Error:", err)
    return res.status(500).json({ error: "Could not create chat room" })
  }
}

// Get all public rooms (or those the user is a member of if private)
export const getChatRooms = async (req, res) => {
  try {
    const userId = req.user._id
    // Fetch rooms where isPrivate=false OR user is in members
    const rooms = await ChatRoom.find({
      $or: [{ isPrivate: false }, { members: userId }],
    }).sort({ createdAt: -1 })
    return res.status(200).json(rooms)
  } catch (err) {
    console.error("Get ChatRooms Error:", err)
    return res.status(500).json({ error: "Could not fetch chat rooms" })
  }
}

// Join a private room (add user to members array)
// POST /api/chat/rooms/:roomId/join
export const joinChatRoom = async (req, res) => {
  try {
    const { roomId } = req.params
    const userId = req.user._id

    const room = await ChatRoom.findById(roomId)
    if (!room) return res.status(404).json({ error: "Room not found" })

    // If it’s private and user not already a member, add them

    if (room.isPrivate && !room.members.includes(userId)) {
      room.members.push(userId)
      await room.save()
      return res.status(200).json({ message: "Joined room" })
    } else if (room.isPrivate && room.members.includes(userId)) {
      return res.status(200).json({ message: "Already a member" })
    } else{
      return res.status(200).json({ message: "Joined public room" })
    }
  } catch (err) {
    console.error("Join ChatRoom Error:", err)
    return res.status(500).json({ error: "Could not join chat room" })
  }
}

// Get message history for a room (last N messages)
// GET /api/chat/rooms/:roomId/messages?limit=50
export const getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params
    const limit = parseInt(req.query.limit) || 50

    // Ensure user is allowed: if private, check membership
    const room = await ChatRoom.findById(roomId)
    if (!room) return res.status(404).json({ error: "Room not found" })

    if (room.isPrivate && !room.members.includes(req.user._id)) {
      return res.status(403).json({ error: "Not a member of this room" })
    }

    // Fetch last `limit` messages, sorted by createdAt ascending
    const messages = await Message.find({ roomId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId","text") // optional: populate sender info
      .exec()

    // Reverse to ascending order before sending
    return res.status(200).json(messages.reverse())
  } catch (err) {
    console.error("Get Room Messages Error:", err)
    return res.status(500).json({ error: "Could not fetch messages" })
  }
}
