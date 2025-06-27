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

// ← import your quota-checking middleware and the Task model
import { checkQuota } from "../middleware/quota.middleware.js"
import Task from "../models/task.model.js"

const router = express.Router()

// 🔐 Protect all routes
router.use(protectRoute)

// 🛑 Enforce per-plan task limits on creation
router.post(
  "/",
  checkQuota("tasks", Task),
  createTask
)

router.get("/", getAllTasks)
router.get("/analytics", getTaskAnalytics) // before /:id
router.get("/:id", getTaskById)
router.patch("/:id", updateTask)
router.delete("/:id", deleteTask)
router.patch("/:id/toggle", toggleTaskCompletion)

export default router
