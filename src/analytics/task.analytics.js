// ─── task.analytics.js ──────────────────────────────────────────────────────

/**
 * Helper to check if a task is completed on a given ISO date string.
 */
const isCompletedOn = (task, isoDate) =>
  task.completedDates?.includes(isoDate) ||
  (
    task.recurring === "none" &&
    task.createdAt.toISOString().slice(0, 10) === isoDate &&
    task.isCompleted
  )

/**
 * Compute "basic" analytics for a list of tasks:
 * - todayTasks, todayCompleted, todayCompletionRate
 * - totalTasks, totalCompleted, totalCompletionRate
 * - categoryDistribution, priorityDistribution
 * - recurrenceDistribution
 */
export function getBasicTaskAnalytics(tasks) {
  const today = new Date()
  const todayISO = today.toISOString().slice(0, 10)
  const todayDay = today.toLocaleDateString("en-US", { weekday: "long" })
  const todayDate = today.getDate()

  let todayTasks = 0
  let todayCompleted = 0
  let totalTasks = 0
  let totalCompleted = 0

  const categoryCount = {}
  const priorityCount = {}
  const recurrenceCount = { none: 0, daily: 0, weekly: 0, monthly: 0 }

  for (const task of tasks) {
    const createdISO = task.createdAt.toISOString().slice(0, 10)

    // Count recurrence
    if (recurrenceCount.hasOwnProperty(task.recurring)) {
      recurrenceCount[task.recurring]++
    }

    // Determine if task applies to "today"
    const isToday = (() => {
      switch (task.recurring) {
        case "daily":
          return true
        case "weekly":
          return task.days?.includes(todayDay)
        case "monthly":
          return task.createdAt.getDate() === todayDate
        case "none":
        default:
          return createdISO === todayISO
      }
    })()

    const completedToday = isCompletedOn(task, todayISO)

    totalTasks++
    // If a one-off task was created on createdISO and marked completed on that same date
    if (isCompletedOn(task, createdISO)) {
      totalCompleted++
    }

    if (isToday) {
      todayTasks++
      if (completedToday) {
        todayCompleted++
      }
    }

    // Build category & priority distributions
    categoryCount[task.category] = (categoryCount[task.category] || 0) + 1
    priorityCount[task.priority] = (priorityCount[task.priority] || 0) + 1
  }

  const todayCompletionRate = todayTasks
    ? (todayCompleted / todayTasks) * 100
    : 0

  const totalCompletionRate = totalTasks
    ? (totalCompleted / totalTasks) * 100
    : 0

  return {
    todayTasks,
    todayCompleted,
    todayCompletionRate,
    totalTasks,
    totalCompleted,
    totalCompletionRate,
    categoryDistribution: categoryCount,
    priorityDistribution: priorityCount,
    recurrenceDistribution: recurrenceCount,
  }
}

/**
 * Compute "premium" analytics for a list of tasks:
 * - last7DaysTrend: array of { date, total, completed } for each of last 7 days
 * - mostProductiveDay: weekday with highest completion rate
 * - missedDoneRatio: (totalCompleted / (totalCompleted + missed)) * 100
 * - mostProductiveHour: hour-of-day (0–23) with most completions
 * - longestStreak, currentStreak
 * - completionTimeline: { [ISODate]: { total, completed } }
 * - categoryOverTime: { [ISODate]: { [category]: { total, completed } } }
 * - completionRateByCategory: { [category]: percentageCompleted }
 * - completionRateByPriority: { [priority]: percentageCompleted }
 * - avgTasksPerDayLast7: number
 * - avgCompletionRateLast7: number
 */
export function getPremiumTaskAnalytics(tasks) {
  const today = new Date()
  const todayISO = today.toISOString().slice(0, 10)
  const todayDay = today.toLocaleDateString("en-US", { weekday: "long" })
  const todayDate = today.getDate()

  const completionTimeline = {}
  const categoryOverTime = {}
  const dayOfWeekMap = {}   // { [weekday]: { total, completed } }
  const hourStats = {}      // { [hour]: count }
  const completedDateStrings = []

  let totalTasks = 0
  let totalCompleted = 0

  // For per-category and per-priority completion rates
  const categoryTotals = {}
  const categoryCompletions = {}
  const priorityTotals = {}
  const priorityCompletions = {}

  // Will accumulate daily totals & completions over last 7 days
  const dailyCountMap = {}      // { [ISODate]: totalTaskCount }
  const dailyCompleteMap = {}   // { [ISODate]: totalCompletedCount }

  for (const task of tasks) {
    const createdDate = new Date(task.createdAt)
    const createdISO = createdDate.toISOString().slice(0, 10)
    const createdDay = createdDate.toLocaleDateString("en-US", { weekday: "long" })

    // === 1) Count creation in timeline/categoryOverTime/dayOfWeekMap ===
    if (!completionTimeline[createdISO]) {
      completionTimeline[createdISO] = { total: 0, completed: 0 }
    }
    completionTimeline[createdISO].total++

    if (!categoryOverTime[createdISO]) {
      categoryOverTime[createdISO] = {}
    }
    if (!categoryOverTime[createdISO][task.category]) {
      categoryOverTime[createdISO][task.category] = { total: 0, completed: 0 }
    }
    categoryOverTime[createdISO][task.category].total++

    if (!dayOfWeekMap[createdDay]) {
      dayOfWeekMap[createdDay] = { total: 0, completed: 0 }
    }
    dayOfWeekMap[createdDay].total++

    // === 2) Update per-category & per-priority totals ===
    categoryTotals[task.category] = (categoryTotals[task.category] || 0) + 1
    priorityTotals[task.priority] = (priorityTotals[task.priority] || 0) + 1

    // === 3) Process each completed date for this task ===
    for (const date of task.completedDates || []) {
      completedDateStrings.push(date)

      // a) completionTimeline
      if (!completionTimeline[date]) {
        completionTimeline[date] = { total: 0, completed: 0 }
      }
      completionTimeline[date].completed++

      // b) categoryOverTime
      if (!categoryOverTime[date]) {
        categoryOverTime[date] = {}
      }
      if (!categoryOverTime[date][task.category]) {
        categoryOverTime[date][task.category] = { total: 0, completed: 0 }
      }
      categoryOverTime[date][task.category].completed++

      // c) dayOfWeekMap
      const d = new Date(date)
      const weekday = d.toLocaleDateString("en-US", { weekday: "long" })
      if (!dayOfWeekMap[weekday]) {
        dayOfWeekMap[weekday] = { total: 0, completed: 0 }
      }
      dayOfWeekMap[weekday].completed++

      // d) hourStats (based on task.startTime)
      if (task.startTime) {
        const hour = parseInt(task.startTime.split(":")[0], 10)
        hourStats[hour] = (hourStats[hour] || 0) + 1
      }

      // e) For dailyCountMap & dailyCompleteMap (last 7 days)
      dailyCountMap[date] = (dailyCountMap[date] || 0) // we'll fill in “total tasks” later
      dailyCompleteMap[date] = (dailyCompleteMap[date] || 0) + 1
    }

    // === 4) Count total tasks & total completed occurrences ===
    totalTasks++
    totalCompleted += (task.completedDates || []).length

    // === 5) Update per-category & per-priority completions ===
    categoryCompletions[task.category] = (
      categoryCompletions[task.category] || 0
    ) + (task.completedDates || []).length

    priorityCompletions[task.priority] = (
      priorityCompletions[task.priority] || 0
    ) + (task.completedDates || []).length
  }

  // === 6) Calculate longest & current streak (premium only) ===
  let longestStreak = 0
  let currentStreak = 0
  const uniqueDates = [...new Set(completedDateStrings)].sort()
  let prevDate = null

  for (const dateStr of uniqueDates) {
    const curr = new Date(dateStr)
    if (prevDate && curr - prevDate === 86400000) {
      currentStreak++
    } else {
      currentStreak = 1
    }
    longestStreak = Math.max(longestStreak, currentStreak)
    prevDate = curr
  }

  // === 7) Most productive hour (premium only) with tie-breaker for earlier hour ===
  const mostProductiveHour =
    Object.entries(hourStats).sort((a, b) => {
      if (b[1] === a[1]) {
        // If both hours have the same completion count, pick the smaller hour
        return parseInt(a[0], 10) - parseInt(b[0], 10)
      }
      return b[1] - a[1]
    })[0]?.[0] || null

  // === 8) Most productive day of week (premium only) ===
  let mostProductiveDay = null
  {
    let bestRate = 0
    for (const [weekday, { total, completed }] of Object.entries(
      dayOfWeekMap
    )) {
      if (total > 0) {
        const rate = completed / total
        if (rate > bestRate) {
          bestRate = rate
          mostProductiveDay = weekday
        }
      }
    }
  }

  // === 9) Missed/Done ratio (premium only) ===
  const missed = totalTasks - totalCompleted
  const missedDoneRatio =
    totalCompleted + missed === 0
      ? 0
      : (totalCompleted / (totalCompleted + missed)) * 100

  // === 10) Last 7 days trend, and build dailyCountMap for avg calculations ===
  const last7DaysTrend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const weekday = d.toLocaleDateString("en-US", { weekday: "long" })

    // Find tasks that should exist on this day (recurring or created)
    const dailyTasks = tasks.filter((t) => {
      const createdISO = t.createdAt.toISOString().slice(0, 10)
      if (createdISO > iso) return false

      switch (t.recurring) {
        case "daily":
          return true
        case "weekly":
          return t.days?.includes(weekday)
        case "monthly":
          return t.createdAt.getDate() === d.getDate()
        case "none":
        default:
          return createdISO === iso
      }
    })

    const completedCount = dailyTasks.filter((t) =>
      isCompletedOn(t, iso)
    ).length

    // Record daily totals for average calculations
    dailyCountMap[iso] = dailyTasks.length
    dailyCompleteMap[iso] = completedCount

    return { date: iso, total: dailyTasks.length, completed: completedCount }
  }).reverse()

  // === 11) Average tasks per day & average completion rate over last 7 days ===
  const sumTasksLast7 = Object.values(dailyCountMap).reduce(
    (acc, val) => acc + val,
    0
  )
  const sumCompletedLast7 = Object.values(dailyCompleteMap).reduce(
    (acc, val) => acc + val,
    0
  )
  const avgTasksPerDayLast7 = sumTasksLast7 / 7
  const avgCompletionRateLast7 = 7
    ? (sumTasksLast7 === 0
        ? 0
        : (sumCompletedLast7 / sumTasksLast7) * 100
      )
    : 0

  // === 12) Completion Rate by Category ===
  const completionRateByCategory = {}
  for (const [cat, totalCount] of Object.entries(categoryTotals)) {
    const completedCount = categoryCompletions[cat] || 0
    completionRateByCategory[cat] =
      totalCount === 0 ? 0 : (completedCount / totalCount) * 100
  }

  // === 13) Completion Rate by Priority ===
  const completionRateByPriority = {}
  for (const [prio, totalCount] of Object.entries(priorityTotals)) {
    const completedCount = priorityCompletions[prio] || 0
    completionRateByPriority[prio] =
      totalCount === 0 ? 0 : (completedCount / totalCount) * 100
  }

  return {
    last7DaysTrend,
    mostProductiveDay,
    missedDoneRatio,
    mostProductiveHour,
    longestStreak,
    currentStreak,
    completionTimeline,
    categoryOverTime,

    // Newly added premium insights:
    avgTasksPerDayLast7,
    avgCompletionRateLast7,
    completionRateByCategory,
    completionRateByPriority,
  }
}
