// server.js
import http from "http"
import dotenv from "dotenv"
import cron from "node-cron"
import { Server as SocketIOServer } from "socket.io"

import app from "./index.js" // Express app (CORS configured here)
import { registerSocket } from "./socketHandler.js"
import { connectDB } from "./lib/db.js"

dotenv.config()

const PORT = process.env.PORT || 5001
const isProd = process.env.NODE_ENV === "production"

// --- Build the same allowlist used by Express (index.js) ---
const rawOrigins =
  process.env.CORS_ORIGIN ||
  "http://localhost:3000,https://grindflowclub.vercel.app"

const CLIENT_ALLOWLIST = Array.from(
  new Set(
    rawOrigins
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  )
)

// OPTIONAL: allow Vercel preview URLs for your project
const vercelPreviewRegex = /^https:\/\/grindflowclub-[a-z0-9-]+\.vercel\.app$/i

// Create HTTP server from Express app
const server = http.createServer(app)

// Socket.IO using the same CORS policy as Express
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true) // server-to-server / native apps
      if (CLIENT_ALLOWLIST.includes(origin)) return cb(null, true)
      if (vercelPreviewRegex.test(origin)) return cb(null, true)
      return cb(new Error(`Socket.IO CORS blocked: ${origin}`))
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
})

// Register all Socket.IO handlers
registerSocket(io)

// Connect DB then start server
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log("Server started on port", PORT)
      startSelfPing()
    })
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err)
    process.exit(1)
  })

// --- Utilities ---
// Keep the Render free tier instance warm by pinging /healthz
function startSelfPing() {
  if (!isProd) return // only in production
  if (String(process.env.DISABLE_SELF_PING || "").toLowerCase() === "true") return

  const intervalMinutes = Number(process.env.PING_INTERVAL_MIN || 14)
  const every = Math.max(1, Number.isFinite(intervalMinutes) ? Math.floor(intervalMinutes) : 14)

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
    } catch (_e) {
      // console.warn("Self ping failed:", (e && e.message) || e)
    }
  }

  // immediate ping
  ping()

  // Prefer cron "every N minutes"
  try {
    const expr = `*/${every} * * * *`
    cron.schedule(expr, ping, { scheduled: true })
  } catch {
    // Fallback to setInterval (~every minutes)
    const timer = setInterval(ping, every * 60 * 1000)
    const cleanup = () => clearInterval(timer)
    process.on("SIGINT", cleanup)
    process.on("SIGTERM", cleanup)
  }
}
