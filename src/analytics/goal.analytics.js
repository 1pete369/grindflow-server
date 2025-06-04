// src/analytics/goal.analytics.js

import mongoose from "mongoose"
import Goal from "../models/goal.model.js"

const DAY_IN_MS = 1000 * 60 * 60 * 24

/**
 * Compute “Basic” goal stats (free tier):
 * - totalGoals, activeGoals, completedGoals, cancelledGoals
 * - avgProgress
 * - upcomingSoon (goals due in next 7 days & still active)
 * - overdueGoals (active but past targetDate)
 * - avgDaysUntilDeadline (across all active goals)
 */
export async function computeBasicGoalStats(userId) {
  // 1) Counts by status
  const totalGoals = await Goal.countDocuments({ userId })
  const activeGoals = await Goal.countDocuments({ userId, status: "active" })
  const completedGoals = await Goal.countDocuments({ userId, status: "completed" })
  const cancelledGoals = await Goal.countDocuments({ userId, status: "cancelled" })

  // 2) Average progress
  const avgProgressAgg = await Goal.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, avgProgress: { $avg: "$progress" } } },
  ])
  const avgProgress = avgProgressAgg[0]?.avgProgress || 0

  const now = new Date()
  const todayISO = now.toISOString().slice(0, 10)
  const next7 = new Date(now.getTime() + 7 * DAY_IN_MS)

  // 3) upcomingSoon: active goals with targetDate in [today, today+7]
  const upcomingSoon = await Goal.countDocuments({
    userId,
    status: "active",
    targetDate: { $gte: todayISO, $lte: next7 },
  })

  // 4) overdueGoals: active goals with targetDate < today
  const overdueGoals = await Goal.countDocuments({
    userId,
    status: "active",
    targetDate: { $lt: todayISO },
  })

  // 5) avgDaysUntilDeadline: average (targetDate – today) in days, for active goals
  //    We subtract day by day in aggregation.
  const deadlines = await Goal.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: "active" } },
    {
      $project: {
        diffInMs: { $subtract: ["$targetDate", now] },
      },
    },
    {
      $project: {
        diffInDays: { $divide: ["$diffInMs", DAY_IN_MS] },
      },
    },
    {
      $group: {
        _id: null,
        avgDaysUntilDeadline: { $avg: "$diffInDays" },
      },
    },
  ])
  const avgDaysUntilDeadline = deadlines[0]?.avgDaysUntilDeadline || 0

  return {
    totalGoals,
    activeGoals,
    completedGoals,
    cancelledGoals,
    avgProgress: Math.round(avgProgress * 100) / 100,
    upcomingSoon,
    overdueGoals,
    avgDaysUntilDeadline: Math.round(avgDaysUntilDeadline * 100) / 100,
  }
}

/**
 * Compute “Premium” goal stats:
 * - categoryDistribution, priorityDistribution
 * - topProgressGoals (title + progress)
 * - goalCompletionRate
 * - goalCompletionTimeline (last 30 days: { date: X, completed: Y })
 * - timeToCompletionStats (avg + median in days for completed goals)
 * - avgProgressByCategory
 * - avgCompletionTimeByCategory (optional)
 * - goalsAboutToExpire (next 7 days, with status)
 */
export async function computePremiumGoalStats(userId, options = {}) {
  // options.fromDate, options.toDate not used here, but you could filter timeline to a range.

  // 1) Category distribution and priority distribution
  const [catDist, prioDist] = await Promise.all([
    Goal.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
    Goal.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]),
  ])

  // 2) Top 3 goals by progress
  const topProgressGoals = await Goal.find({ userId })
    .sort({ progress: -1 })
    .limit(3)
    .select("title progress")

  // 3) Overall completion rate
  const totalGoals = await Goal.countDocuments({ userId })
  const completedGoals = await Goal.countDocuments({
    userId,
    status: "completed",
  })
  const goalCompletionRate =
    totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_IN_MS)

  // 4) Goal completion timeline (last 30 days)
  const completionTimelineAgg = await Goal.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        status: "completed",
        updatedAt: { $gte: thirtyDaysAgo }, // assume “completed” date = `updatedAt` when status flipped
      },
    },
    {
      $project: {
        completedDate: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
      },
    },
    {
      $group: {
        _id: "$completedDate",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ])
  // Convert to an object keyed by date:
  const goalCompletionTimeline = {}
  completionTimelineAgg.forEach((doc) => {
    goalCompletionTimeline[doc._id] = { completed: doc.count }
  })

  // 5) Time-to-completion stats for completed goals:
  //    We assume “time to complete” = difference (completedAt – createdAt).
  //    Since you don’t store “completedAt” separately, you can approximate with `updatedAt` when status=“completed.” 
  //    So: find each goal where status=”completed”, compute (updatedAt – createdAt).
  const timeDiffDocs = await Goal.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        status: "completed",
      },
    },
    {
      $project: {
        diffInMs: { $subtract: ["$updatedAt", "$createdAt"] },
      },
    },
    {
      $project: {
        diffInDays: { $divide: ["$diffInMs", DAY_IN_MS] },
      },
    },
  ])
  const diffs = timeDiffDocs.map((d) => d.diffInDays)
  let avgCompletionTimeInDays = 0,
    medianCompletionTimeInDays = 0

  if (diffs.length) {
    // Average:
    avgCompletionTimeInDays = diffs.reduce((a, b) => a + b, 0) / diffs.length
    // Median:
    const sortedDiffs = diffs.slice().sort((a, b) => a - b)
    const mid = Math.floor(sortedDiffs.length / 2)
    if (sortedDiffs.length % 2 === 1) {
      medianCompletionTimeInDays = sortedDiffs[mid]
    } else {
      medianCompletionTimeInDays = (sortedDiffs[mid - 1] + sortedDiffs[mid]) / 2
    }
  }

  // 6) Average progress by category
  const avgProgressByCategoryAgg = await Goal.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: "$category",
        avgProgress: { $avg: "$progress" },
      },
    },
  ])
  const avgProgressByCategory = {}
  avgProgressByCategoryAgg.forEach((doc) => {
    avgProgressByCategory[doc._id] = Math.round(doc.avgProgress * 100) / 100
  })

  // 7) Goals about to expire (next 7 days)
  const next7 = new Date(now.getTime() + 7 * DAY_IN_MS)
  const goalsAboutToExpireDocs = await Goal.find({
    userId,
    status: "active",
    targetDate: { $gte: now, $lte: next7 },
  }).select("title targetDate status")
  // If desired, you could return just a count or an array of `{ title, targetDate }`.
  const goalsAboutToExpire = goalsAboutToExpireDocs.map((g) => ({
    title: g.title,
    targetDate: g.targetDate.toISOString().slice(0, 10),
    status: g.status,
  }))

  return {
    categoryDistribution: catDist,
    priorityDistribution: prioDist,
    topProgressGoals,
    goalCompletionRate,
    goalCompletionTimeline,
    avgCompletionTimeInDays: Math.round(avgCompletionTimeInDays * 100) / 100,
    medianCompletionTimeInDays: Math.round(medianCompletionTimeInDays * 100) / 100,
    avgProgressByCategory,
    goalsAboutToExpire,
  }
}
