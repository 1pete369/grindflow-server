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
const CLIENT_ORIGIN = process.env.CORS_ORIGIN?.split(",")[0] || process.env.CLIENT_ORIGIN || "http://localhost:3000"

// Create HTTP server from Express app
const server = http.createServer(app)

// Initialize Socket.IO on that server
const io = new SocketIOServer(server, {
  cors: {
    origin: CLIENT_ORIGIN,
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

      // Start background self-ping to mitigate free tier cold starts
      startSelfPing()
    })
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err)
    process.exit(1)
  })

// --- Utilities ---
function startSelfPing() {
  if (String(process.env.DISABLE_SELF_PING).toLowerCase() === "true") return

  const intervalMinutes = Number(process.env.PING_INTERVAL_MIN || 14)
  const intervalMs = Math.max(5, isFinite(intervalMinutes) ? intervalMinutes : 14) * 60 * 1000

  const baseUrl =
    process.env.SELF_PING_URL ||
    (process.env.RENDER_EXTERNAL_URL
      ? `${process.env.RENDER_EXTERNAL_URL}`
      : `http://localhost:${PORT}`)

  const url = `${baseUrl.replace(/\/$/, "")}/healthz`

  const ping = async () => {
    try {
      await fetch(url, { method: "GET" })
      // console.log("Self ping OK:", url)
    } catch (e) {
      // console.warn("Self ping failed:", (e && e.message) || e)
    }
  }

  // immediate ping, then schedule
  ping()
  const timer = setInterval(ping, intervalMs)

  const cleanup = () => clearInterval(timer)
  process.on("SIGINT", cleanup)
  process.on("SIGTERM", cleanup)
}
