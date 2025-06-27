// src/routes/habit.routes.js
import express from "express"
import {
  createHabit,
  getAllHabits,
  getHabitById,
  updateHabit,
  deleteHabit,
  toggleHabitCompleted,
  getBasicHabitAnalytics,
  getPremiumHabitAnalytics,
} from "../controllers/habit.controller.js"
import { protectRoute } from "../middleware/auth.middleware.js"

// ← import quota middleware and the Habit model
import { checkQuota } from "../middleware/quota.middleware.js"
import Habit from "../models/habit.model.js"

const router = express.Router()

router.use(protectRoute)

// enforce per-plan habit limits on creation
router.post(
  "/",
  checkQuota("habits", Habit),
  createHabit
)

router.get("/", getAllHabits)

router.get("/analytics/basic", getBasicHabitAnalytics)
router.get("/analytics/premium", getPremiumHabitAnalytics)

router.get("/:id", getHabitById)
router.patch("/:id", updateHabit)
router.delete("/:id", deleteHabit)
router.patch("/:id/complete", toggleHabitCompleted)

export default router
