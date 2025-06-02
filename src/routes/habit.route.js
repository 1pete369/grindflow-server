import express from "express"
import {
  createHabit,
  getAllHabits,
  getHabitById,
  updateHabit,
  deleteHabit,
  toggleHabitCompleted,
} from "../controllers/habit.controller.js"
import { protectRoute } from "../middleware/auth.middleware.js"

const router = express.Router()

router.use(protectRoute)

router.post("/", createHabit)
router.get("/", getAllHabits)
router.get("/:id", getHabitById)
router.patch("/:id", updateHabit)
router.delete("/:id", deleteHabit)
router.patch("/:id/complete", toggleHabitCompleted )

export default router

