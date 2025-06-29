
// routes/task.routes.js
import express from "express"
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  toggleTaskCompletion,
  getTaskAnalytics,
} from "../controllers/task.controller.js"
import { protectRoute } from "../middleware/auth.middleware.js"
import { checkQuota } from "../middleware/quota.middleware.js"
import Task from "../models/task.model.js"

const router = express.Router()

// Protect all task routes
router.use(protectRoute)

// Create a task (with per-plan quota enforcement)
router.post(
  "/",
  checkQuota("tasks", Task),
  createTask
)

// Fetch tasks. Optionally filter by date: /api/tasks?date=YYYY-MM-DD
router.get("/", getAllTasks)

// Analytics endpoint must come before :id
router.get("/analytics", getTaskAnalytics)

// Single-task routes
router.get("/:id", getTaskById)
router.patch("/:id", updateTask)
router.delete("/:id", deleteTask)
router.patch("/:id/toggle", toggleTaskCompletion)

export default router