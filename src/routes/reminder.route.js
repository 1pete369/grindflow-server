// routes/reminder.routes.js
import express from "express"
import {
  createReminder,
  getReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
} from "../controllers/reminder.controller.js"
import { protectRoute } from "../middleware/auth.middleware.js"

const router = express.Router()

// Protect all routes
router.use(protectRoute)

router.post("/", createReminder)
router.get("/", getReminders)
router.get("/:reminderId", getReminderById)
router.put("/:reminderId", updateReminder)
router.delete("/:reminderId", deleteReminder)

export default router
