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

const router = express.Router()

router.use(protectRoute) // all goal routes are protected

router.post("/", createGoal)
router.get("/", getAllGoals)

// ➜ Analytics routes must come *before* “/:id” 
router.get("/analytics/basic", getBasicGoalAnalytics)
router.get("/analytics/premium", getPremiumGoalAnalytics)

router.get("/:id", getGoalById)
router.patch("/:id", updateGoal)
router.delete("/:id", deleteGoal)

export default router
