// src/routes/goal.routes.js
import express from "express"
import {
  createGoal,
  deleteGoal,
  getAllGoals,
  getBasicGoalAnalytics,
  getGoalById,
  getPremiumGoalAnalytics,
  updateGoal,
} from "../controllers/goal.controller.js"
import { protectRoute } from "../middleware/auth.middleware.js"

// ← import quota middleware and the Goal model
import { checkQuota } from "../middleware/quota.middleware.js"
import Goal from "../models/goal.model.js"

const router = express.Router()

router.use(protectRoute)

// enforce per-plan goal limits on creation
router.post(
  "/",
  checkQuota("goals", Goal),
  createGoal
)

router.get("/", getAllGoals)

// analytics (before :id)
router.get("/analytics/basic", getBasicGoalAnalytics)
router.get("/analytics/premium", getPremiumGoalAnalytics)

router.get("/:id", getGoalById)
router.patch("/:id", updateGoal)
router.delete("/:id", deleteGoal)

export default router
