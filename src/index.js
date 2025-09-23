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

// -------------- HOT CORS SHIM (reflect ACAO/ACC everywhere) --------------
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader("Vary", "Origin");
  if (origin && (allowlist.includes(origin) || vercelPreviewRegex.test(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  next();
});

// Short-circuit ALL preflights with OK + proper headers
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
// -------------- END HOT CORS SHIM ---------------------------------------

// Keep cors() for good measure (will not hurt)
const corsOptionsDelegate = (origin, cb) => {
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
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

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
  if (origin && (allowlist.includes(origin) || vercelPreviewRegex.test(origin))) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Credentials", "true");
  }
  res.status(404).json({ error: "Not Found", path: req.originalUrl });
});

// -------------------- Global Error Handler --------------------
app.use((err, req, res, _next) => {
  const status = err.name === "CorsError" ? 403 : err.status || 500;

  const origin = req.headers.origin;
  if (origin && (allowlist.includes(origin) || vercelPreviewRegex.test(origin))) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Credentials", "true");
  }

  const payload = {
    error: err.name || "Error",
    message:
      isProd && err.name !== "CorsError" ? "Internal Server Error" : err.message,
  };

  res.status(status).json(payload);
});

export default app;
