import { computeBasicHabitStats, computePremiumHabitStats } from "../analytics/habit.analytics.js"
import {
  updateGoalProgress
} from "../helpers/goal.helper.js"
import { updateGoalMetrics } from "../helpers/goalMetrics.helper.js"
import { calculateStreaks } from "../helpers/habit.helper.js"
import Goal from "../models/goal.model.js"
import Habit from "../models/habit.model.js"

// ✅ Create a habit
export const createHabit = async (req, res) => {
  try {
    const {
      title,
      description,
      frequency,
      days = [],
      startDate,
      type = "build",
      slipDates = [],
      icon,
      category,
      linkedGoalId = null,
    } = req.body

    const newHabit = await Habit.create({
      userId: req.user._id,
      title,
      description,
      frequency,
      days,
      startDate,
      type,
      slipDates,
      icon,
      category,
      linkedGoalId,
    })

    // 🔁 Optionally link habit to goal if goalId is provided
    if (linkedGoalId) {
      await Goal.findByIdAndUpdate(linkedGoalId, {
        $push: { linkedHabits: newHabit._id },
      })

      // ⬇️ Call progress recalculation
      if (linkedGoalId) {
        await updateGoalProgress(linkedGoalId)
        await updateGoalMetrics(linkedGoalId) // ← recalc missedDays, streaks, etc.
      }
    }

    res.status(201).json(newHabit)
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to create habit", details: err.message })
  }
}

// ✅ Get all habits for a user
export const getAllHabits = async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user._id }).populate(
      "linkedGoalId"
    )
    res.status(200).json(habits)
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch habits", details: err.message })
  }
}

// ✅ Get one habit
export const getHabitById = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate("linkedGoalId")

    if (!habit) return res.status(404).json({ error: "Habit not found" })

    res.status(200).json(habit)
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch habit", details: err.message })
  }
}

// ✅ Update a habit
export const updateHabit = async (req, res) => {
  try {
    const updates = { ...req.body }
    delete updates.userId

    if (updates.type === undefined) delete updates.type

    const updatedHabit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true }
    )

    if (!updatedHabit) return res.status(404).json({ error: "Habit not found" })

    res.status(200).json(updatedHabit)
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update habit", details: err.message })
  }
}

// ✅ Delete a habit
export const deleteHabit = async (req, res) => {
  try {
    const deletedHabit = await Habit.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    })

    if (!deletedHabit) return res.status(404).json({ error: "Habit not found" })

    // 🔁 Remove habit from linked goal
    if (deletedHabit.linkedGoalId) {
      await Goal.findByIdAndUpdate(deletedHabit.linkedGoalId, {
        $pull: { linkedHabits: deletedHabit._id },
      })

      // ⬇️ Recalculate progress since one habit is gone
      if (deletedHabit.linkedGoalId) {
        await updateGoalProgress(deletedHabit.linkedGoalId)
        await updateGoalMetrics(deletedHabit.linkedGoalId) // ← recalc missedDays, streaks, etc.
      }
    }

    res.status(200).json({ message: "Habit deleted successfully" })
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to delete habit", details: err.message })
  }
}

// Record a slip for a quit habit
export const recordHabitSlip = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user._id

    const habit = await Habit.findOne({ _id: id, userId })
    if (!habit) return res.status(404).json({ error: "Habit not found" })

    if (habit.type !== "quit") {
      return res.status(400).json({ error: "Slips only valid for quit habits" })
    }

    const today = new Date().toISOString()

    const already = habit.slipDates.some(
      (d) => new Date(d).toDateString() === new Date().toDateString()
    )
    if (!already) {
      habit.slipDates.push(today)
    }

    // Reset streak and update longest if needed
    if (habit.streak > habit.longestStreak) {
      habit.longestStreak = habit.streak
    }
    habit.streak = 0

    await habit.save()

    if (habit.linkedGoalId) {
      await updateGoalProgress(habit.linkedGoalId)
      await updateGoalMetrics(habit.linkedGoalId)
    }

    return res.status(200).json({ success: true, habit })
  } catch (err) {
    console.error("Record Slip Error:", err)
    return res.status(500).json({ error: "Something went wrong" })
  }
}

export const toggleHabitCompleted = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user._id
    const timeZone = "Asia/Kolkata"

    const habit = await Habit.findOne({ _id: id, userId })
    if (!habit) return res.status(404).json({ error: "Habit not found" })
    if (habit.type === "quit") {
      return res.status(400).json({ error: "Use /:id/slip to record slip for quit habits" })
    }

    // “YYYY-MM-DD” string for today in Asia/Kolkata
    const today = new Date().toLocaleDateString("en-CA", { timeZone })

    // Check if today is already in completedDates
    const isMarked = habit.completedDates.some(
      (date) =>
        new Date(date).toLocaleDateString("en-CA", { timeZone }) === today
    )

    if (isMarked) {
      // Unmark: remove today’s date
      habit.completedDates = habit.completedDates.filter(
        (date) =>
          new Date(date).toLocaleDateString("en-CA", { timeZone }) !== today
      )

      // Recompute streaks now that today is removed
      const { streak, longestStreak } = calculateStreaks(
        habit.completedDates.map(
          (d) => new Date(d).toISOString().split("T")[0]
        ),
        habit.frequency,
        habit.days
      )
      habit.streak = streak
      habit.longestStreak = longestStreak
      habit.lastCompletedAt = null
    } else {
      // Mark today
      habit.completedDates.push(new Date().toISOString())

      // Recompute streaks including today
      const { streak, longestStreak } = calculateStreaks(
        habit.completedDates.map(
          (d) => new Date(d).toISOString().split("T")[0]
        ),
        habit.frequency,
        habit.days
      )
      habit.streak = streak
      habit.longestStreak = longestStreak
      habit.lastCompletedAt = new Date()
    }

    await habit.save()

    // If this habit is linked to a goal, recompute that goal’s progress and metrics
    if (habit.linkedGoalId) {
      await updateGoalProgress(habit.linkedGoalId)
      await updateGoalMetrics(habit.linkedGoalId) // ← recalc missedDays, streaks, etc.
    }

    return res.status(200).json({ success: true, habit })
  } catch (err) {
    console.error("Toggle Habit Error:", err)
    return res.status(500).json({ error: "Something went wrong" })
  }
}


export const getBasicHabitAnalytics = async (req, res) => {
  try {
    const userId = req.user._id
    const stats = await computeBasicHabitStats(userId)
    return res.status(200).json(stats)
  } catch (err) {
    console.error("Basic Habit Analytics Error:", err)
    return res.status(500).json({ error: "Could not fetch habit analytics" })
  }
}

export const getPremiumHabitAnalytics = async (req, res) => {
  try {
    // Deny if user is NOT premium
    if (!req.user.isPremium) {
      return res.status(403).json({ error: "Premium access required" })
    }

    const userId = req.user._id
    // Read optional from/to query parameters (YYYY-MM-DD)
    const { from, to } = req.query

    // Pass them into computePremiumHabitStats if provided
    const options = {}
    if (from) options.fromDate = from
    if (to) options.toDate = to

    const stats = await computePremiumHabitStats(userId, options)
    return res.status(200).json(stats)
  } catch (err) {
    console.error("Premium Habit Analytics Error:", err)
    return res.status(500).json({ error: "Could not fetch premium habit analytics" })
  }
}
