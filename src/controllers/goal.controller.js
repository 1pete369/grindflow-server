import Goal from "../models/goal.model.js"
import Habit from "../models/habit.model.js"

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
    const updated = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true }
    )
    if (!updated) return res.status(404).json({ error: "Goal not found" })

    res.status(200).json(updated)
  } catch (err) {
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

// export const getGoalAnalytics = async (req, res) => {
//   try {
//     const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id }).populate("linkedHabits")
//     if (!goal) return res.status(404).json({ error: "Goal not found" })

//     const insights = await calculateGoalInsights(goal)
//     res.status(200).json(insights)
//   } catch (err) {
//     res.status(500).json({ error: "Failed to calculate goal analytics", details: err.message })
//   }
// }
