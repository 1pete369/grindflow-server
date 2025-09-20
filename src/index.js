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

// Body parser
app.use(express.json({ limit: "10mb" }))
app.use(cookieParser())

// CORS (for your Next.js frontend)
app.use(
  cors({
    origin: "http://localhost:3000", // Your Next.js frontend
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
)

// Basic health check
app.get("/", (req, res) => {
  res.send("Api is running")
})

// Register REST routes
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
