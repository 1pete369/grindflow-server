import { getBasicTaskAnalytics, getPremiumTaskAnalytics } from "../analytics/task.analytics.js"
import Task from "../models/task.model.js"

// 1. Create a new task
export const createTask = async (req, res) => {
  try {
    const task = new Task({ ...req.body, userId: req.user._id })
    const saved = await task.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(500).json({ error: "Failed to create task", details: err })
  }
}

// 2. Get all tasks for a user
export const getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id }).sort({
      startTime: 1,
    })
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

// 4. Update a task
export const updateTask = async (req, res) => {
  try {
    const updated = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: req.body },
      { new: true }
    )

    if (!updated) {
      return res.status(404).json({ error: "Task not found" })
    }

    res.json(updated)
  } catch (err) {
    console.log("Error updating task:", err.message)
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

// 6. Toggle completion status
// Basic toggle of isCompleted
// export const toggleTaskCompletion = async (req, res) => {
//   try {
//     const task = await Task.findOne({
//       _id: req.params.id,
//       userId: req.user._id,
//     })
//     if (!task) return res.status(404).json({ error: "Task not found" })

//     task.isCompleted = !task.isCompleted
//     await task.save()
//     res.json(task)
//   } catch (err) {
//     res.status(500).json({ error: "Failed to toggle task completion" })
//   }
// }

export const toggleTaskCompletion = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
    if (!task) return res.status(404).json({ error: "Task not found" })

    const todayISO = new Date().toISOString().slice(0, 10)

    const alreadyCompletedToday = task.completedDates.includes(todayISO)

    if (alreadyCompletedToday) {
      // Unmark completion
      task.completedDates = task.completedDates.filter((d) => d !== todayISO)
    } else {
      // Mark completion
      task.completedDates.push(todayISO)
    }

    // Optionally update global isCompleted (for non-recurring tasks)
    if (task.recurring === "none") {
      task.isCompleted = !alreadyCompletedToday
    }

    await task.save()
    res.json(task)
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle task completion" })
  }
}

/**
 * GET /api/tasks/analytics
 * - Responds with "basic" analytics for all users.
 * - If userPlan !== "free", merges premium analytics on top of basic.
 */
export const getTaskAnalytics = async (req, res) => {
  const userId = req.user._id
  const userPlan = req.user.plan || "premium"

  try {
    const tasks = await Task.find({ userId })

    // 1) Compute basic analytics (always available)
    const basic = getBasicTaskAnalytics(tasks)

    // 2) If userPlan is "free", just return basic.
    if (userPlan === "free") {
      return res.status(200).json(basic)
    }

    // 3) Otherwise (premium or any non-free tier), merge in premium fields.
    const premium = getPremiumTaskAnalytics(tasks)
    return res.status(200).json({ ...basic, ...premium })
  } catch (err) {
    console.error("❌ Analytics Error:", err)
    res.status(500).json({ message: "Failed to load task analytics" })
  }
}
