// src/routes/calendar.route.js
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getCalendar } from "../controllers/calendar.controller.js";

const router = express.Router();

// GET /api/calendar?year=YYYY&month=MM
router.get("/", protectRoute, getCalendar);

export default router;
