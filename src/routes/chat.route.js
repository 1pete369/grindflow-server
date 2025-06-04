import express from "express"
import {
  createChatRoom,
  getChatRooms,
  joinChatRoom,
  getRoomMessages,
} from "../controllers/chat.controller.js"
import { protectRoute } from "../middleware/auth.middleware.js"

const router = express.Router()
router.use(protectRoute)

// Create a new room
router.post("/rooms", createChatRoom)

// Get all rooms (public + private you belong to)
router.get("/rooms", getChatRooms)

// Join a private room
router.post("/rooms/:roomId/join", joinChatRoom)

// Get message history for a room
router.get("/rooms/:roomId/messages", getRoomMessages)

export default router
