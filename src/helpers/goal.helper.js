import dayjs from "dayjs"
import minMax from "dayjs/plugin/minMax.js"
dayjs.extend(minMax)

import Goal from "../models/goal.model.js"

/**
 * How many times this habit “should” be completed from
 * max(habit.startDate, habit.createdAt) through goalTargetDate (inclusive).
 *
 * @param {object} habit - Mongoose habit document (has .frequency, .days[], .startDate, .createdAt)
 * @param {string|Date} goalTargetDate - ISO string or Date for goal.targetDate
 * @returns {number}
 */
export const calculateExpectedCompletions = (habit, goalTargetDate) => {
  // 1) Force both startDate and createdAt to the very start of their day
  //    so that “diff(…, 'day')+1” counts full calendar days.
  const start = dayjs.max(
    dayjs(habit.startDate).startOf("day"),
    dayjs(habit.createdAt).startOf("day")
  )
  const end = dayjs(goalTargetDate).startOf("day")

  let count = 0

  if (habit.frequency === "daily") {
    // Every single day in [start..end], inclusive
    count = end.diff(start, "day") + 1

  } else if (habit.frequency === "weekly") {
    // Step day by day; only count if day-of-week ∈ habit.days
    let temp = start
    while (temp.isBefore(end) || temp.isSame(end, "day")) {
      if (habit.days.includes(temp.format("dddd"))) {
        count++
      }
      temp = temp.add(1, "day")
    }
  }

  return count
}

/**
 * Fetches the goal, populates linkedHabits, and recomputes:
 *   totalExpected = sum(calculateExpectedCompletions(habit, goal.targetDate))
 *   totalDone     = sum(habit.completedDates.length)
 * Sets goal.progress = round((totalDone/totalExpected)*100).
 *
 * @param {string|ObjectId} goalId
 */
export const updateGoalProgress = async (goalId) => {
  const goal = await Goal.findById(goalId).populate("linkedHabits")
  if (!goal) return

  let totalExpected = 0
  let totalDone = 0

  for (const habit of goal.linkedHabits) {
    const expected = calculateExpectedCompletions(habit, goal.targetDate)
    totalExpected += expected
    totalDone += habit.completedDates.length
  }

  goal.progress =
    totalExpected > 0
      ? Math.min(100, Math.round((totalDone / totalExpected) * 100))
      : 0

  await goal.save()
}
