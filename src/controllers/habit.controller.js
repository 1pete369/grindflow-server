import { updateGoalProgress } from "../../helpers/goal.helper.js"
import { calculateStreaks } from "../../helpers/habit.helper.js"
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
      await Goal.calculateProgress(linkedGoalId)
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
      await Goal.calculateProgress(deletedHabit.linkedGoalId)
    }

    res.status(200).json({ message: "Habit deleted successfully" })
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to delete habit", details: err.message })
  }
}

export const toggleHabitCompleted = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user._id
    const timeZone = "Asia/Kolkata"

    const habit = await Habit.findOne({ _id: id, userId })
    if (!habit) return res.status(404).json({ error: "Habit not found" })

    // “YYYY-MM-DD” string for today in Asia/Kolkata
    const today = new Date().toLocaleDateString("en-CA", { timeZone })

    // Check if today is already in completedDates
    const isMarked = habit.completedDates.some(date =>
      new Date(date).toLocaleDateString("en-CA", { timeZone }) === today
    )

    if (isMarked) {
      // Unmark: remove today’s date
      habit.completedDates = habit.completedDates.filter(date =>
        new Date(date).toLocaleDateString("en-CA", { timeZone }) !== today
      )

      // Recompute streaks now that today is removed
      const { streak, longestStreak } = calculateStreaks(
        habit.completedDates.map(d => new Date(d).toISOString().split("T")[0]),
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
        habit.completedDates.map(d => new Date(d).toISOString().split("T")[0]),
        habit.frequency,
        habit.days
      )
      habit.streak = streak
      habit.longestStreak = longestStreak
      habit.lastCompletedAt = new Date()
    }

    await habit.save()

    // If this habit is linked to a goal, recompute that goal’s progress
    if (habit.linkedGoalId) {
      await updateGoalProgress(habit.linkedGoalId)
    }

    return res.status(200).json({ success: true, habit })

  } catch (err) {
    console.error("Toggle Habit Error:", err)
    return res.status(500).json({ error: "Something went wrong" })
  }
}

// if (habit.linkedGoalId) {
//   await Goal.calculateProgress(habit.linkedGoalId, timeZone)
// }
