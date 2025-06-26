// server.js
import http from "http"
import mongoose from "mongoose"
import dotenv from "dotenv"

import app from "./index.js" // import the Express app
import { registerSocket } from "./socketHandler.js"
import { connectDB } from "./lib/db.js"
import { Server as SocketIOServer } from "socket.io"

dotenv.config()

const PORT = process.env.PORT || 5001

// Create HTTP server from Express app
const server = http.createServer(app)

// Initialize Socket.IO on that server
const io = new SocketIOServer(server, {
  cors: {
    origin: "http://192.168.29.67:8081", // same as in index.js
    methods: ["GET", "POST"],
    credentials: true,
  },
})

// Register all Socket.IO event handlers
registerSocket(io)

// Connect to MongoDB, then start listening
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log("Server started on port", PORT)
    })
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err)
    process.exit(1)
  })
