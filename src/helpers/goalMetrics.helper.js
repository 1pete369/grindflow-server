import dayjs from "dayjs"
import minMax from "dayjs/plugin/minMax.js"
import Goal from "../models/goal.model.js"
dayjs.extend(minMax)

export const updateGoalMetrics = async (goalId) => {
  const goal = await Goal.findById(goalId).populate("linkedHabits")
  if (!goal) return

  // 1) Find the earliest “true start” among all linked habits
  let goalStart = null
  goal.linkedHabits.forEach((h) => {
    const startH = dayjs.max(dayjs(h.startDate), dayjs(h.createdAt))
    goalStart = goalStart ? dayjs.min(goalStart, startH) : startH
  })

  // 2) Decide the end of our window (commonly “today”)
  const today = dayjs().startOf("day")
  const rangeEnd = dayjs.min(today, dayjs(goal.targetDate))

  // 3) Build array of all dates from goalStart → rangeEnd
  const allDates = []
  let cursor = goalStart.startOf("day")
  while (cursor.isBefore(rangeEnd) || cursor.isSame(rangeEnd, "day")) {
    allDates.push(cursor.format("YYYY-MM-DD"))
    cursor = cursor.add(1, "day")
  }

  // 4) For each habit, prepare a “completed set” and define helpers
  const helpers = goal.linkedHabits.map((h) => {
    const habitStart = dayjs.max(dayjs(h.startDate), dayjs(h.createdAt))
    const doneSet = new Set(
      h.completedDates.map((d) => dayjs(d).format("YYYY-MM-DD"))
    )
    return {
      frequency: h.frequency,
      validDays: h.days, // e.g. ["Sunday","Friday"]
      habitStart,
      doneSet,
      isRequiredOn: (Dstr) => {
        const D = dayjs(Dstr, "YYYY-MM-DD")
        if (D.isBefore(habitStart, "day") || D.isAfter(rangeEnd, "day")) {
          return false
        }
        if (h.frequency === "daily") return true
        // weekly:
        return h.days.includes(D.format("dddd"))
      },
      isDoneOn: (Dstr) => doneSet.has(Dstr),
    }
  })

  // 5) Build two parallel arrays: isSuccess[D], isMissed[D]
  const isSuccess = {}
  const isMissed = {}
  allDates.forEach((D) => {
    // find all habits that _should_ run on D
    const required = helpers.filter((hp) => hp.isRequiredOn(D))
    if (required.length === 0) {
      // No habit scheduled → neither success nor missed
      isSuccess[D] = false
      isMissed[D] = false
    } else {
      // Check if every required habit was done on D
      const allDone = required.every((hp) => hp.isDoneOn(D))
      isSuccess[D] = allDone
      isMissed[D] = !allDone
    }
  })

  // 6) Count missedDays
  const missedDaysCount = allDates.reduce(
    (sum, D) => sum + (isMissed[D] ? 1 : 0),
    0
  )

  // 7) Compute current streak (most recent consecutive successes)
  let currentStreak = 0
  for (let i = allDates.length - 1; i >= 0; i--) {
    const D = allDates[i]
    if (isSuccess[D]) {
      currentStreak += 1
    } else {
      break
    }
  }

  // 8) Compute longestStreak
  let longestStreak = 0
  let running = 0
  allDates.forEach((D) => {
    if (isSuccess[D]) {
      running += 1
    } else {
      longestStreak = Math.max(longestStreak, running)
      running = 0
    }
  })
  longestStreak = Math.max(longestStreak, running)

  // 9) Save these back onto the goal
  goal.missedDays = missedDaysCount
  goal.currentStreak = currentStreak
  goal.longestStreak = longestStreak
  await goal.save()
}
