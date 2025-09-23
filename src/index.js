// index.js
import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.route.js";
import taskRoutes from "./routes/task.route.js";
import goalRoutes from "./routes/goal.route.js";
import habitRoutes from "./routes/habit.route.js";
import journalRoutes from "./routes/journal.route.js";
import noteRoutes from "./routes/note.route.js";
import reminderRoutes from "./routes/reminder.route.js";
import chatRoutes from "./routes/chat.route.js";
import userRoutes from "./routes/user.route.js";
import referralRoutes from "./routes/referral.route.js";
import challengeRoutes from "./routes/challenge.route.js";
import searchRoutes from "./routes/search.route.js";
import snapshotRoutes from "./routes/snapshot.route.js";
import calendarRoutes from "./routes/calendar.route.js";
import folderRouter from "./routes/folder.route.js";

dotenv.config();

const app = express();

// -------------------- Proxy --------------------
app.set("trust proxy", 1);

// -------------------- Allowlist --------------------
const raw =
  process.env.CORS_ORIGIN ||
  "http://localhost:3000,https://grindflowclub.vercel.app";
const ALLOWLIST = Array.from(new Set(raw.split(",").map((s) => s.trim()).filter(Boolean)));
const vercelPreviewRegex = /^https:\/\/grindflowclub-[a-z0-9-]+\.vercel\.app$/i;

// -------------------- CORS SHIM (no cors package) --------------------
// 1) Reflect ACAO/ACC on EVERY response for allowed origins
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader("Vary", "Origin");
  if (origin && (ALLOWLIST.includes(origin) || vercelPreviewRegex.test(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  next();
});

// 2) End ALL preflights early with 204 + proper headers
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] ||
        "Content-Type, Authorization, X-Requested-With, Accept"
    );
    return res.status(204).end();
  }
  next();
});

// -------------------- Parsers --------------------
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// -------------------- Health --------------------
app.get("/", (_req, res) => {
  res.status(200).send("API is running");
});
app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true, uptime: process.uptime() });
});
app.get("/api/healthz", (_req, res) => {
  res.status(200).send("OK");
});

// -------------------- Routes --------------------
app.use("/api/auth", authRoutes);
app.use("/api/task", taskRoutes);
app.use("/api/goal", goalRoutes);
app.use("/api/habit", habitRoutes);
app.use("/api/journal", journalRoutes);
app.use("/api/note", noteRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/users", userRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/snapshot", snapshotRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/folder", folderRouter);

// -------------------- 404 --------------------
app.use((req, res) => {
  const origin = req.headers.origin;
  if (origin && (ALLOWLIST.includes(origin) || vercelPreviewRegex.test(origin))) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Credentials", "true");
  }
  res.status(404).json({ error: "Not Found", path: req.originalUrl });
});

// -------------------- Error Handler --------------------
app.use((err, req, res, _next) => {
  const origin = req.headers.origin;
  if (origin && (ALLOWLIST.includes(origin) || vercelPreviewRegex.test(origin))) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Credentials", "true");
  }
  const status = err.status || 500;
  res.status(status).json({
    error: err.name || "Error",
    message: process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message,
  });
});

export default app;
