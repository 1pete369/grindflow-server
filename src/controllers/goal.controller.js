import { computeBasicGoalStats, computePremiumGoalStats } from "../analytics/goal.analytics.js"
import Goal from "../models/goal.model.js"

// ✅ Create a new goal
export const createGoal = async (req, res) => {
  try {
    const {
      title,
      description,
      targetDate,
      priority,
      category,
      linkedHabits = [], // ✅ fallback to empty array
    } = req.body

    const newGoal = await Goal.create({
      userId: req.user._id,
      title,
      description,
      targetDate,
      priority,
      category,
      linkedHabits,
    })

    res.status(201).json(newGoal)
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to create goal", details: err.message })
  }
}

// ✅ Get all goals for user
export const getAllGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user._id }).populate(
      "linkedHabits"
    )
    res.status(200).json(goals)
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch goals", details: err.message })
  }
}

// ✅ Get single goal by ID
export const getGoalById = async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate("linkedHabits")

    if (!goal) return res.status(404).json({ error: "Goal not found" })

    res.status(200).json(goal)
  } catch (err) {
    res.status(500).json({ error: "Failed to get goal", details: err.message })
  }
}

// ✅ Update a goal
export const updateGoal = async (req, res) => {
  try {
    const updates = req.body
    const goalId = req.params.id
    const userId = req.user._id

    // Get the current goal to check if it's being marked as completed
    const currentGoal = await Goal.findOne({ _id: goalId, userId })
    if (!currentGoal) return res.status(404).json({ error: "Goal not found" })

    const updated = await Goal.findOneAndUpdate(
      { _id: goalId, userId },
      updates,
      { new: true }
    )

    // If goal is being marked as completed, mark all linked habits as completed
    if (updates.isCompleted === true && !currentGoal.isCompleted) {
      const Habit = (await import("../models/habit.model.js")).default
      
      // Find all habits linked to this goal
      const linkedHabits = await Habit.find({ 
        linkedGoalId: goalId, 
        userId 
      })

      // Mark all linked habits as completed
      for (const habit of linkedHabits) {
        // Add today's date to completedDates if not already there
        const today = new Date().toISOString()
        if (!habit.completedDates.some(date => 
          new Date(date).toISOString().split('T')[0] === today.split('T')[0]
        )) {
          habit.completedDates.push(today)
          habit.lastCompletedAt = new Date()
          
          // Recalculate streaks
          const { calculateStreaks } = await import("../helpers/habit.helper.js")
          const { streak, longestStreak } = calculateStreaks(
            habit.completedDates.map(d => new Date(d).toISOString().split('T')[0]),
            habit.frequency,
            habit.days
          )
          habit.streak = streak
          habit.longestStreak = longestStreak
          
          await habit.save()
        }
      }
    }

    res.status(200).json(updated)
  } catch (err) {
    console.error("Update goal error:", err)
    res
      .status(500)
      .json({ error: "Failed to update goal", details: err.message })
  }
}

// ✅ Delete a goal
export const deleteGoal = async (req, res) => {
  try {
    const deleted = await Goal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    })

    if (!deleted) return res.status(404).json({ error: "Goal not found" })

    res.status(200).json({ message: "Goal deleted successfully" })
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to delete goal", details: err.message })
  }
}


/** Basic analytics for all users. **/
export const getBasicGoalAnalytics = async (req, res) => {
  try {
    const stats = await computeBasicGoalStats(req.user._id)
    return res.status(200).json(stats)
  } catch (err) {
    console.error("Basic Goal Analytics Error:", err)
    return res.status(500).json({ error: "Could not fetch goal analytics" })
  }
}

/** Premium analytics for users with isPremium=true. **/
export const getPremiumGoalAnalytics = async (req, res) => {
  try {
    if (req.user.isPremium) {
      return res.status(403).json({ error: "Premium access required" })
    }
    const stats = await computePremiumGoalStats(req.user._id)
    return res.status(200).json(stats)
  } catch (err) {
    console.error("Premium Goal Analytics Error:", err)
    return res
      .status(500)
      .json({ error: "Could not fetch premium goal analytics" })
  }
}