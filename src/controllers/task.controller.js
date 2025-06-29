
// controllers/task.controller.js
import {
  getBasicTaskAnalytics,
  getPremiumTaskAnalytics,
} from "../analytics/task.analytics.js"
import Task from "../models/task.model.js"

// 1. Create a new task
export const createTask = async (req, res) => {
  try {
    // req.body should include scheduledDate (ISO string)
    const task = new Task({ ...req.body, userId: req.user._id })
    const saved = await task.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(500).json({ error: "Failed to create task", details: err })
  }
}

// 2. Get all tasks (optionally filtered by ?date=YYYY-MM-DD)
export const getAllTasks = async (req, res) => {
  try {
    const { date } = req.query
    const filter = { userId: req.user._id }
    if (date) {
      const start = new Date(date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)
      filter.scheduledDate = { $gte: start, $lt: end }
    }

    const tasks = await Task.find(filter).sort({ startTime: 1 })
    res.json(tasks)
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tasks" })
  }
}

// 3. Get a specific task by ID
export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
    if (!task) return res.status(404).json({ error: "Task not found" })
    res.json(task)
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch task" })
  }
}

// 4. Update a task (including scheduledDate)
export const updateTask = async (req, res) => {
  try {
    const updated = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: req.body },
      { new: true }
    )

    if (!updated) return res.status(404).json({ error: "Task not found" })
    res.json(updated)
  } catch (err) {
    console.error("Error updating task:", err.message)
    res.status(500).json({ error: "Failed to update task" })
  }
}

// 5. Delete a task
export const deleteTask = async (req, res) => {
  try {
    const deleted = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    })
    if (!deleted) return res.status(404).json({ error: "Task not found" })
    res.json({ message: "Task deleted" })
  } catch (err) {
    res.status(500).json({ error: "Failed to delete task" })
  }
}

// 6. Toggle completion (adds/removes today’s ISO date)
export const toggleTaskCompletion = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
    if (!task) return res.status(404).json({ error: "Task not found" })

    const todayISO = new Date().toISOString().slice(0, 10)
    const doneToday = task.completedDates.includes(todayISO)

    if (doneToday) {
      task.completedDates = task.completedDates.filter(d => d !== todayISO)
    } else {
      task.completedDates.push(todayISO)
    }

    if (task.recurring === "none") {
      task.isCompleted = !doneToday
    }

    await task.save()
    res.json(task)
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle task completion" })
  }
}

// 7. Analytics endpoint
export const getTaskAnalytics = async (req, res) => {
  const userId = req.user._id
  const userPlan = req.user.plan || "premium"
  try {
    const tasks = await Task.find({ userId })
    const basic = getBasicTaskAnalytics(tasks)
    if (userPlan === "free") {
      return res.status(200).json(basic)
    }
    const premium = getPremiumTaskAnalytics(tasks)
    return res.status(200).json({ ...basic, ...premium })
  } catch (err) {
    console.error("Analytics Error:", err)
    res.status(500).json({ message: "Failed to load task analytics" })
  }
}
