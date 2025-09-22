// index.js
import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import dotenv from "dotenv"

import authRoutes from "./routes/auth.route.js"
import taskRoutes from "./routes/task.route.js"
import goalRoutes from "./routes/goal.route.js"
import habitRoutes from "./routes/habit.route.js"
import journalRoutes from "./routes/journal.route.js"
import noteRoutes from "./routes/note.route.js"
import reminderRoutes from "./routes/reminder.route.js"
import chatRoutes from "./routes/chat.route.js"
import userRoutes from "./routes/user.route.js"
import referralRoutes from "./routes/referral.route.js"
import challengeRoutes from "./routes/challenge.route.js"
import searchRoutes from "./routes/search.route.js"
import snapshotRoutes from "./routes/snapshot.route.js"
import calendarRoutes from "./routes/calendar.route.js"
import folderRouter from "./routes/folder.route.js"

dotenv.config()

const app = express()

// Behind Render's proxy so secure cookies & req.ip work
app.set("trust proxy", 1)

// ---------- CORS ----------
const isProd = process.env.NODE_ENV === "production"

// Build allowlist from env + sensible defaults
const raw =
  process.env.CORS_ORIGIN ||
  "http://localhost:3000,https://grindflowclub.vercel.app"

const allowlist = Array.from(
  new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  )
)

// OPTIONAL: allow Vercel preview URLs for your project
const vercelPreviewRegex = /^https:\/\/grindflowclub-[a-z0-9-]+\.vercel\.app$/i

const corsOptions = {
  origin(origin, cb) {
    // Allow server-to-server, curl, health checks (no Origin header)
    if (!origin) return cb(null, true)

    if (allowlist.includes(origin)) return cb(null, true)
    if (vercelPreviewRegex.test(origin)) return cb(null, true)

    return cb(new Error(`Not allowed by CORS: ${origin}`))
  },
  credentials: true, // so browser can send/receive cookies
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
}

// This header helps some clients when using credentials
app.use((_, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true")
  next()
})

// CORS MUST be before parsers & routes
app.use(cors(isProd ? corsOptions : { ...corsOptions, origin: true }))
// Express 5: use RegExp to handle preflight on any path
app.options(/.*/, cors(isProd ? corsOptions : { ...corsOptions, origin: true }))

// ---------- Parsers ----------
app.use(express.json({ limit: "10mb" }))
app.use(cookieParser())

// ---------- Health ----------
app.get("/", (_req, res) => {
  res.send("Api is running")
})
app.get("/healthz", (_req, res) => res.status(200).send("OK"))
app.get("/api/healthz", (_req, res) => res.status(200).send("OK"))

// ---------- Routes ----------
app.use("/api/auth", authRoutes)
app.use("/api/task", taskRoutes)
app.use("/api/goal", goalRoutes)
app.use("/api/habit", habitRoutes)
app.use("/api/journal", journalRoutes)
app.use("/api/note", noteRoutes)
app.use("/api/reminders", reminderRoutes)
app.use("/api/chat", chatRoutes)
app.use("/api/users", userRoutes)
app.use("/api/referrals", referralRoutes)
app.use("/api/challenges", challengeRoutes)
app.use("/api/search", searchRoutes)
app.use("/api/snapshot", snapshotRoutes)
app.use("/api/calendar", calendarRoutes)
app.use("/api/folder", folderRouter)

export default app
