import mongoose from "mongoose"
import dayjs from "dayjs"
import minMax from "dayjs/plugin/minMax.js"
dayjs.extend(minMax)

import Habit from "../models/habit.model.js"
import { calculateExpectedCompletions } from "../helpers/goal.helper.js"

/**
 * Build an array of all “required” dates (YYYY-MM-DD) for a given habit
 * from its start up through windowEnd (inclusive).
 */
const buildRequiredDates = (habit, windowEnd) => {
  const requiredDates = []
  const start = dayjs.max(
    dayjs(habit.startDate).startOf("day"),
    dayjs(habit.createdAt).startOf("day")
  )
  const end = dayjs(windowEnd).startOf("day")

  if (habit.frequency === "daily") {
    let cursor = start
    while (cursor.isBefore(end) || cursor.isSame(end, "day")) {
      requiredDates.push(cursor.format("YYYY-MM-DD"))
      cursor = cursor.add(1, "day")
    }

  } else if (habit.frequency === "weekly") {
    let cursor = start
    while (cursor.isBefore(end) || cursor.isSame(end, "day")) {
      if (habit.days.includes(cursor.format("dddd"))) {
        requiredDates.push(cursor.format("YYYY-MM-DD"))
      }
      cursor = cursor.add(1, "day")
    }

  } else if (habit.frequency === "monthly") {
    let cursor = start
    const targetDay = cursor.date()
    while (cursor.isBefore(end) || cursor.isSame(end, "day")) {
      if (cursor.date() === targetDay) {
        requiredDates.push(cursor.format("YYYY-MM-DD"))
      }
      cursor = cursor.add(1, "day")
    }
  }

  return requiredDates
}

/**
 * Compute “basic” habit analytics (free tier).
 *   - totalHabits
 *   - activeHabits
 *   - archivedHabits
 *   - totalCompleted
 *   - avgStreak
 *   - categoryDist
 *   - frequencyDist
 */
export const computeBasicHabitStats = async (userId) => {
  // 1) Count total / active / archived
  const totalHabits = await Habit.countDocuments({ userId })
  const activeHabits = await Habit.countDocuments({ userId, isArchived: false })
  const archivedHabits = totalHabits - activeHabits

  // 2) Sum up completedDates lengths
  const totalCompletedAgg = await Habit.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $project: { numCompleted: { $size: "$completedDates" } } },
    { $group: { _id: null, totalCompleted: { $sum: "$numCompleted" } } }
  ])
  const totalCompleted = totalCompletedAgg[0]?.totalCompleted || 0

  // 3) Average streak across all habits
  const avgStreakAgg = await Habit.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, avgStreak: { $avg: "$streak" } } }
  ])
  const avgStreak = avgStreakAgg[0]?.avgStreak || 0

  // 4) Category distribution
  const categoryDist = await Habit.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: "$category", count: { $sum: 1 } } }
  ])

  // 5) Frequency distribution
  const frequencyDist = await Habit.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: "$frequency", count: { $sum: 1 } } }
  ])

  return {
    totalHabits,
    activeHabits,
    archivedHabits,
    totalCompleted,
    avgStreak: Math.round(avgStreak * 100) / 100,
    categoryDist,
    frequencyDist
  }
}

/**
 * Compute “premium” habit analytics (only for req.user.isPremium === true).
 *
 * Accepts optional `options.fromDate` and `options.toDate` (YYYY-MM-DD).
 * If not provided, defaults to [earliestHabitStart..today].
 *
 * Returns:
 *   - freqDist
 *   - topStreaks
 *   - completionRate
 *   - totalRemainingAll
 *   - habitDetails
 *   - categoryDetailed
 *   - frequencyDetailed
 *   - dailyTrend
 *   - perHabitStreakTimeline
 *   - perHabitHeatmap
 *   - consistency
 */
export const computePremiumHabitStats = async (userId, options = {}) => {
  // 1) Frequency distribution
  const freqDist = await Habit.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: "$frequency", count: { $sum: 1 } } }
  ])

  // 2) Top 3 habits by longestStreak
  const topStreaks = await Habit.find({ userId })
    .sort({ longestStreak: -1 })
    .limit(3)
    .select("title longestStreak")

  // 3) Fetch all habits for the user (we will reuse)
  const allHabits = await Habit.find({ userId })

  // 4) Determine date window [fromDate..toDate]
  //    If user passed ?from=YYYY-MM-DD, use it; otherwise, earliest habit start.
  //    If user passed ?to=YYYY-MM-DD, use it; otherwise, today.
  const todayStr = dayjs().format("YYYY-MM-DD")
  const toDate = options.toDate || todayStr

  // Find the earliest start across all habits:
  let earliest = dayjs().startOf("day")
  allHabits.forEach(h => {
    const s = dayjs(h.startDate).startOf("day")
    earliest = dayjs.min(earliest, s)
  })
  const earliestStr = earliest.format("YYYY-MM-DD")
  const fromDate = options.fromDate || earliestStr

  // 5) Overall completion rate & total remaining (done vs. expected through toDate)
  let totalDoneAll = 0
  let totalExpectedAll = 0

  allHabits.forEach(h => {
    // Count all completedDates up to toDate (we treat any timestamp on toDate as valid)
    const doneCount = (h.completedDates || []).filter(d =>
      dayjs(d).format("YYYY-MM-DD") <= toDate
    ).length

    totalDoneAll += doneCount
    totalExpectedAll += calculateExpectedCompletions(h, toDate)
  })

  const completionRate = totalExpectedAll > 0
    ? Math.round((totalDoneAll / totalExpectedAll) * 100)
    : 0

  const totalRemainingAll = Math.max(0, totalExpectedAll - totalDoneAll)

  // 6) Per-habit details (with “requiredCount”, “doneCount”, “remainingCount”)
  const habitDetails = allHabits.map(h => {
    // Build required dates from h.start through toDate
    const requiredDates = buildRequiredDates(h, toDate)
      .filter(dateStr => dateStr >= fromDate && dateStr <= toDate)

    const requiredCount = requiredDates.length

    // Convert completedDates to YYYY-MM-DD, filtering only up to toDate
    const doneSet = new Set(
      (h.completedDates || [])
        .map(d => dayjs(d).format("YYYY-MM-DD"))
        .filter(dd => dd >= fromDate && dd <= toDate)
    )
    const doneCount = doneSet.size

    // Missed dates = those required in [fromDate..toDate] not in doneSet
    const missedDates = requiredDates.filter(dateStr => !doneSet.has(dateStr))

    const remainingCount = requiredCount - doneCount

    return {
      _id: h._id,
      title: h.title,
      category: h.category,
      frequency: h.frequency,
      requiredCount,       // total required slots in this window
      doneCount,           // how many of those slots have been checked off
      remainingCount,      // how many still left to mark
      completedDates: Array.from(doneSet).sort(),
      missedDates: missedDates.sort(),
      streak: h.streak,
      longestStreak: h.longestStreak
    }
  })

  // 7) Category-wise detailed analytics
  const categoryDetailedMap = {}
  for (const h of allHabits) {
    const cat = h.category
    if (!categoryDetailedMap[cat]) {
      categoryDetailedMap[cat] = { totalHabits: 0, totalDone: 0, totalExpected: 0 }
    }
    categoryDetailedMap[cat].totalHabits += 1

    const doneCount = (h.completedDates || []).filter(d =>
      dayjs(d).format("YYYY-MM-DD") <= toDate
    ).length
    const expectedCount = calculateExpectedCompletions(h, toDate)

    categoryDetailedMap[cat].totalDone += doneCount
    categoryDetailedMap[cat].totalExpected += expectedCount
  }
  const categoryDetailed = Object.entries(categoryDetailedMap).map(
    ([category, { totalHabits, totalDone, totalExpected }]) => ({
      category,
      totalHabits,
      totalDone,
      totalExpected,
      completionRate:
        totalExpected > 0
          ? Math.round((totalDone / totalExpected) * 100)
          : 0
    })
  )

  // 8) Frequency-wise detailed analytics
  const freqDetailedMap = {}
  for (const h of allHabits) {
    const freq = h.frequency
    if (!freqDetailedMap[freq]) {
      freqDetailedMap[freq] = { totalHabits: 0, totalDone: 0, totalExpected: 0 }
    }
    freqDetailedMap[freq].totalHabits += 1

    const doneCount = (h.completedDates || []).filter(d =>
      dayjs(d).format("YYYY-MM-DD") <= toDate
    ).length
    const expectedCount = calculateExpectedCompletions(h, toDate)

    freqDetailedMap[freq].totalDone += doneCount
    freqDetailedMap[freq].totalExpected += expectedCount
  }
  const frequencyDetailed = Object.entries(freqDetailedMap).map(
    ([frequency, { totalHabits, totalDone, totalExpected }]) => ({
      frequency,
      totalHabits,
      totalDone,
      totalExpected,
      completionRate:
        totalExpected > 0
          ? Math.round((totalDone / totalExpected) * 100)
          : 0
    })
  )

  // 9) Daily Trend: for each date in [fromDate..toDate], how many completions occurred
  const dailyTrendMap = {}
  let cursorDate = dayjs(fromDate)
  const lastDate = dayjs(toDate)
  while (cursorDate.isBefore(lastDate) || cursorDate.isSame(lastDate, "day")) {
    dailyTrendMap[cursorDate.format("YYYY-MM-DD")] = 0
    cursorDate = cursorDate.add(1, "day")
  }
  // Increment for each habit’s completedDates
  allHabits.forEach(h => {
    (h.completedDates || []).forEach(d => {
      const ds = dayjs(d).format("YYYY-MM-DD")
      if (ds >= fromDate && ds <= toDate) {
        dailyTrendMap[ds]++
      }
    })
  })
  const dailyTrend = Object.entries(dailyTrendMap).map(
    ([date, count]) => ({ date, count })
  )

  // 10) Per-Habit Streak Timeline: list array of { date, streak } for each habit
  const perHabitStreakTimeline = allHabits.map(h => {
    const doneDates = (h.completedDates || [])
      .map(d => dayjs(d).format("YYYY-MM-DD"))
      .filter(ds => ds >= fromDate && ds <= toDate)
      .sort((a, b) => dayjs(a).unix() - dayjs(b).unix())

    const timeline = []
    let currentStreak = 0
    let prevDay = null

    doneDates.forEach(ds => {
      const thisDay = dayjs(ds, "YYYY-MM-DD")
      if (prevDay && thisDay.diff(prevDay, "day") === 1) {
        currentStreak++
      } else {
        currentStreak = 1
      }
      timeline.push({ date: ds, streak: currentStreak })
      prevDay = thisDay
    })

    return {
      habitId: h._id,
      timeline
    }
  })

  // 11) Per-Habit Heatmap Data: array of { date, completed } for each habit
  const perHabitHeatmap = allHabits.map(h => {
    const requiredDates = buildRequiredDates(h, toDate)
      .filter(ds => ds >= fromDate && ds <= toDate)

    const doneSet = new Set(
      (h.completedDates || [])
        .map(d => dayjs(d).format("YYYY-MM-DD"))
        .filter(ds => ds >= fromDate && ds <= toDate)
    )

    const heatmapArray = requiredDates.map(ds => ({
      date: ds,
      completed: doneSet.has(ds)
    }))

    return {
      habitId: h._id,
      heatmap: heatmapArray
    }
  })

  // 12) Consistency Score (daily habits only): stddev of gaps between days
  const consistency = allHabits.map(h => {
    if (h.frequency !== "daily") {
      return {
        habitId: h._id,
        consistencyScore: null // only compute for daily
      }
    }

    const doneDates = (h.completedDates || [])
      .map(d => dayjs(d).format("YYYY-MM-DD"))
      .filter(ds => ds >= fromDate && ds <= toDate)
      .sort((a, b) => dayjs(a).unix() - dayjs(b).unix())

    if (doneDates.length < 2) {
      return {
        habitId: h._id,
        consistencyScore: 0
      }
    }

    const gaps = []
    for (let i = 1; i < doneDates.length; i++) {
      const prev = dayjs(doneDates[i - 1], "YYYY-MM-DD")
      const curr = dayjs(doneDates[i], "YYYY-MM-DD")
      gaps.push(curr.diff(prev, "day"))
    }

    const mean = gaps.reduce((sum, g) => sum + g, 0) / gaps.length
    const variance =
      gaps.reduce((sum, g) => sum + Math.pow(g - mean, 2), 0) / gaps.length
    const stddev = Math.sqrt(variance)

    return {
      habitId: h._id,
      consistencyScore: Math.round(stddev * 100) / 100
    }
  })

  return {
    freqDist,
    topStreaks,
    completionRate,
    totalRemainingAll,
    habitDetails,
    categoryDetailed,
    frequencyDetailed,
    dailyTrend,
    perHabitStreakTimeline,
    perHabitHeatmap,
    consistency
  }
}
