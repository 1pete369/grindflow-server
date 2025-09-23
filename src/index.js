// index.js
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
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
app.set("trust proxy", 1); // Render proxy: correct IP & secure cookies

// -------------------- CORS --------------------
const isProd = process.env.NODE_ENV === "production";

// Build allowlist from env or use sensible defaults
// CORS_ORIGIN can be comma-separated list
const raw =
  process.env.CORS_ORIGIN ||
  "http://localhost:3000,https://grindflowclub.vercel.app";

const allowlist = Array.from(
  new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  )
);

// Also allow Vercel preview URLs like https://grindflowclub-abc123.vercel.app
const vercelPreviewRegex = /^https:\/\/grindflowclub-[a-z0-9-]+\.vercel\.app$/i;

// Always set Vary so caches don't mix different origins
app.use((req, res, next) => {
  res.setHeader("Vary", "Origin");
  next();
});

const corsOptionsDelegate = (origin, cb) => {
  // Allow server-to-server, curl/Postman, health checks (no Origin header)
  if (!origin) return cb(null, true);

  if (allowlist.includes(origin)) return cb(null, true);
  if (vercelPreviewRegex.test(origin)) return cb(null, true);

  const err = new Error(`Not allowed by CORS: ${origin}`);
  err.name = "CorsError";
  return cb(err);
};

const corsOptions = {
  origin: isProd ? corsOptionsDelegate : true, // dev: allow all
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

// IMPORTANT: CORS must be before parsers & routes
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); // explicit preflight for any path

// Some clients require this header explicitly for credentialed requests
app.use((_, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
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
app.use((req, res, next) => {
  // Keep CORS headers on 404s as well
  res.set("Access-Control-Allow-Credentials", "true");
  // If the request had an Origin and it's allowed, reflect it
  const origin = req.headers.origin;
  if (origin && (allowlist.includes(origin) || vercelPreviewRegex.test(origin))) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.status(404).json({ error: "Not Found", path: req.originalUrl });
});

// -------------------- Global Error Handler --------------------
// Ensures CORS headers are present even on errors (including CORS errors)
app.use((err, req, res, _next) => {
  const status = err.name === "CorsError" ? 403 : err.status || 500;

  // Preserve CORS headers on error
  res.set("Access-Control-Allow-Credentials", "true");
  const origin = req.headers.origin;
  if (origin && (allowlist.includes(origin) || vercelPreviewRegex.test(origin))) {
    res.set("Access-Control-Allow-Origin", origin);
  }

  // Basic error payload (don’t leak internals in prod)
  const payload = {
    error: err.name || "Error",
    message: isProd ? (err.name === "CorsError" ? err.message : "Internal Server Error") : err.message,
  };

  res.status(status).json(payload);
});

export default app;
