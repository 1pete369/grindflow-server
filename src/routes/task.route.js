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

const router = express.Router()

// 🔐 Apply protectRoute to all routes
router.use(protectRoute)

router.post("/", createTask)
router.get("/", getAllTasks)
router.get("/analytics", getTaskAnalytics) // put this BEFORE /:id
router.get("/:id", getTaskById)
router.patch("/:id", updateTask)
router.delete("/:id", deleteTask)
router.patch("/:id/toggle", toggleTaskCompletion)

export default router
