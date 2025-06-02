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

// // 7. Get Analytics
// working good basic
// export const getTaskAnalytics = async (req, res) => {
//   const userId = req.user._id

//   try {
//     const tasks = await Task.find({ userId })

//     const today = new Date()
//     // today.setDate(today.getDate() + 6)
//     const todayISO = today.toISOString().slice(0, 10)
//     const todayDay = today.toLocaleDateString("en-US", { weekday: "long" })
//     const todayDate = today.getDate()

//     let todayTasks = 0
//     let todayCompleted = 0

//     let totalTasks = 0
//     let totalCompleted = 0

//     let categoryCount = {}
//     let priorityCount = {}

//     for (const task of tasks) {
//       const isToday = (() => {
//         switch (task.recurring) {
//           case "daily":
//             return true

//           case "weekly":
//             return task.days?.includes(todayDay)

//           case "monthly":
//             return task.createdAt.getDate() === todayDate

//           case "none":
//           default:
//             const createdDateISO = task.createdAt.toISOString().slice(0, 10)
//             return createdDateISO === todayISO
//         }
//       })()

//       totalTasks += 1
//       if (task.isCompleted) totalCompleted += 1

//       if (isToday) {
//         todayTasks += 1
//         if (task.isCompleted) todayCompleted += 1
//       }

//       // Category distribution
//       categoryCount[task.category] = (categoryCount[task.category] || 0) + 1
//       // Priority distribution
//       priorityCount[task.priority] = (priorityCount[task.priority] || 0) + 1
//     }

//     const analytics = {
//       todayTasks,
//       todayCompleted,
//       todayCompletionRate: todayTasks ? (todayCompleted / todayTasks) * 100 : 0,

//       totalTasks,
//       totalCompleted,
//       totalCompletionRate: totalTasks ? (totalCompleted / totalTasks) * 100 : 0,

//       categoryDistribution: categoryCount,
//       priorityDistribution: priorityCount,
//     }

//     res.status(200).json(analytics)
//   } catch (err) {
//     console.error("Analytics Error:", err)
//     res.status(500).json({ message: "Failed to load task analytics" })
//   }
// }

export const getTaskAnalytics = async (req, res) => {
  const userId = req.user._id
  const userPlan = req.user.plan || "premium"

  try {
    const tasks = await Task.find({ userId })

    const today = new Date()
    const todayISO = today.toISOString().slice(0, 10)
    const todayDay = today.toLocaleDateString("en-US", { weekday: "long" })
    const todayDate = today.getDate()

    const categoryCount = {}
    const priorityCount = {}
    const hourStats = {}
    const dayOfWeekMap = {}
    const completionTimeline = {}
    const categoryOverTime = {}
    const habitStats = {}

    let todayTasks = 0
    let todayCompleted = 0
    let totalTasks = 0
    let totalCompleted = 0

    const completedDateStrings = []

    // Helper
    const isCompletedOn = (task, isoDate) =>
      task.completedDates?.includes(isoDate) ||
      (task.recurring === "none" &&
        task.createdAt.toISOString().slice(0, 10) === isoDate &&
        task.isCompleted)

    for (const task of tasks) {
      const createdDate = new Date(task.createdAt)
      const createdISO = createdDate.toISOString().slice(0, 10)
      const createdDay = createdDate.toLocaleDateString("en-US", { weekday: "long" })

      const isToday = (() => {
        switch (task.recurring) {
          case "daily": return true
          case "weekly": return task.days?.includes(todayDay)
          case "monthly": return task.createdAt.getDate() === todayDate
          case "none":
          default:
            return createdISO === todayISO
        }
      })()

      const completedToday = isCompletedOn(task, todayISO)

      totalTasks++
      if (isCompletedOn(task, createdISO)) totalCompleted++

      if (isToday) {
        todayTasks++
        if (completedToday) todayCompleted++
      }

      // Distributions
      categoryCount[task.category] = (categoryCount[task.category] || 0) + 1
      priorityCount[task.priority] = (priorityCount[task.priority] || 0) + 1

      // Completion Dates
      for (const date of task.completedDates || []) {
        completedDateStrings.push(date)

        // Completion Timeline
        if (!completionTimeline[date])
          completionTimeline[date] = { total: 0, completed: 0 }
        completionTimeline[date].completed++

        // Category Over Time
        if (!categoryOverTime[date])
          categoryOverTime[date] = {}
        if (!categoryOverTime[date][task.category])
          categoryOverTime[date][task.category] = { total: 0, completed: 0 }
        categoryOverTime[date][task.category].completed++

        // Productive Day
        const d = new Date(date)
        const weekday = d.toLocaleDateString("en-US", { weekday: "long" })
        if (!dayOfWeekMap[weekday])
          dayOfWeekMap[weekday] = { total: 0, completed: 0 }
        dayOfWeekMap[weekday].completed++

        // Productive Hour
        if (task.startTime) {
          const hour = parseInt(task.startTime.split(":")[0])
          hourStats[hour] = (hourStats[hour] || 0) + 1
        }
      }

      // Creation timeline
      if (!completionTimeline[createdISO])
        completionTimeline[createdISO] = { total: 0, completed: 0 }
      completionTimeline[createdISO].total++

      // Category creation
      if (!categoryOverTime[createdISO])
        categoryOverTime[createdISO] = {}
      if (!categoryOverTime[createdISO][task.category])
        categoryOverTime[createdISO][task.category] = { total: 0, completed: 0 }
      categoryOverTime[createdISO][task.category].total++

      // Productive Day: task created
      if (!dayOfWeekMap[createdDay])
        dayOfWeekMap[createdDay] = { total: 0, completed: 0 }
      dayOfWeekMap[createdDay].total++

      // Habits
      if (task.habitId) {
        if (!habitStats[task.habitId])
          habitStats[task.habitId] = { total: 0, completed: 0 }

        habitStats[task.habitId].total++
        if (task.completedDates?.length)
          habitStats[task.habitId].completed += task.completedDates.length
      }
    }

    const todayCompletionRate = todayTasks ? (todayCompleted / todayTasks) * 100 : 0
    const totalCompletionRate = totalTasks ? (totalCompleted / totalTasks) * 100 : 0

    let mostProductiveDay = null
    if (userPlan !== "free") {
      mostProductiveDay = Object.entries(dayOfWeekMap).reduce(
        (best, [day, val]) => {
          const rate = val.completed / val.total
          return rate > best.rate ? { day, rate } : best
        }, { day: null, rate: 0 }
      ).day
    }

    const missed = totalTasks - totalCompleted
    const missedDoneRatio = totalCompleted + missed === 0 ? 0 : (totalCompleted / (totalCompleted + missed)) * 100

    const last7DaysTrend = userPlan !== "free"
      ? Array.from({ length: 7 }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const iso = d.toISOString().slice(0, 10)
          const weekday = d.toLocaleDateString("en-US", { weekday: "long" })

          const dailyTasks = tasks.filter(t => {
            const createdISO = t.createdAt.toISOString().slice(0, 10)
            if (createdISO > iso) return false

            return (
              createdISO === iso ||
              t.recurring === "daily" ||
              (t.recurring === "weekly" && t.days?.includes(weekday)) ||
              (t.recurring === "monthly" && t.createdAt.getDate() === d.getDate())
            )
          })

          const completed = dailyTasks.filter(t => isCompletedOn(t, iso)).length

          return { date: iso, total: dailyTasks.length, completed }
        }).reverse()
      : []

    let longestStreak = 0, currentStreak = 0
    if (userPlan === "premium") {
      const sortedDates = [...new Set(completedDateStrings)].sort()
      let prev = null
      for (const dateStr of sortedDates) {
        const curr = new Date(dateStr)
        if (prev && curr - prev === 86400000) {
          currentStreak++
        } else {
          currentStreak = 1
        }
        longestStreak = Math.max(longestStreak, currentStreak)
        prev = curr
      }
    }

    const mostProductiveHour = userPlan === "premium"
      ? Object.entries(hourStats).sort((a, b) => b[1] - a[1])[0]?.[0]
      : null

    const mostEffectiveHabit = userPlan === "premium"
      ? Object.entries(habitStats).sort((a, b) => {
          const aRate = a[1].completed / a[1].total
          const bRate = b[1].completed / b[1].total
          return bRate - aRate
        })?.[0]
      : null

    res.status(200).json({
      todayTasks,
      todayCompleted,
      todayCompletionRate,
      totalTasks,
      totalCompleted,
      totalCompletionRate,
      categoryDistribution: categoryCount,
      priorityDistribution: priorityCount,

      ...(userPlan !== "free" && {
        last7DaysTrend,
        mostProductiveDay,
        missedDoneRatio,
      }),

      ...(userPlan === "premium" && {
        mostProductiveHour,
        longestStreak,
        currentStreak,
        completionTimeline,
        categoryOverTime,
        mostEffectiveHabit,
      }),
    })
  } catch (err) {
    console.error("❌ Analytics Error:", err)
    res.status(500).json({ message: "Failed to load task analytics" })
  }
}
