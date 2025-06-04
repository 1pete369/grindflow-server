// socketHandler.js
import { Server as SocketIOServer } from "socket.io"
import Message from "./models/message.model.js"
import { authenticateSocket } from "./middleware/auth.middleware.js"

export function registerSocket(io) {
  // Apply Socket.IO-level authentication
  io.use(authenticateSocket)

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id)

    // Join a chat room
    socket.on("joinRoom", ({ roomId }) => {
      socket.join(roomId)
      console.log(`Socket ${socket.id} joined room ${roomId}`)
    })

    // Leave a chat room
    socket.on("leaveRoom", ({ roomId }) => {
      socket.leave(roomId)
      console.log(`Socket ${socket.id} left room ${roomId}`)
    })

    // Handle sending a new message
    socket.on("sendMessage", async ({ roomId, text }) => {
      try {
        // Save message to MongoDB
        const newMsg = await Message.create({
          roomId,
          userId: socket.user._id,
          text,
        })
        // Broadcast to everyone in the room
        io.to(roomId).emit("newMessage", newMsg)
      } catch (err) {
        console.error("Error sending message:", err)
        socket.emit("error", { error: "Message failed to send" })
      }
    })

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id)
    })
  })
}
