import mongoose from "mongoose"

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    targetDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    linkedHabits: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Habit",
        },
      ],
      default: [],
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    category: {
      type: String,
      default: "General",
    },
    missedDays: {
      type: Number,
      default: 0,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
)

const dayMap = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

function getExpectedDates(habit, goalStart, goalEnd) {
  const expectedDates = []
  const customDays = habit.days?.map((d) => dayMap[d]) || []
  const cursor = new Date(
    goalStart > habit.startDate ? goalStart : habit.startDate
  )

  while (cursor <= goalEnd) {
    const day = cursor.getDay()
    if (
      habit.frequency === "daily" ||
      (habit.frequency === "weekly" && customDays.includes(day))
    ) {
      expectedDates.push(cursor.toISOString().split("T")[0])
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return expectedDates
}


goalSchema.statics.calculateProgress = async function (goalId, timeZone = "UTC") {
  const Goal = this
  const goal = await Goal.findById(goalId).populate("linkedHabits")
  if (!goal) return 0

  const localNow = new Date(new Date().toLocaleString("en-US", { timeZone }))
  const todayStr = localNow.toISOString().split("T")[0]
  const goalStart = new Date(goal.createdAt)
  const goalEnd = new Date(goal.targetDate)

  let totalExpected = 0
  let totalCompleted = 0
  const dateMap = {}

  for (const habit of goal.linkedHabits) {
    const expectedDates = getExpectedDates(habit, goalStart, goalEnd)

    const completedStrs = habit.completedDates.map((d) =>
      new Date(new Date(d).toLocaleString("en-US", { timeZone }))
        .toISOString()
        .split("T")[0]
    )

    expectedDates.forEach((date) => {
      if (!dateMap[date]) {
        dateMap[date] = { expected: 0, completed: 0 }
      }
      dateMap[date].expected += 1
      if (completedStrs.includes(date)) {
        dateMap[date].completed += 1
      }
    })

    const completedInRange = expectedDates.filter((date) => completedStrs.includes(date))
    totalExpected += expectedDates.length
    totalCompleted += completedInRange.length
  }

  // ✅ PROGRESS based on total expected in full goal window
  goal.progress =
    totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0

  // ✅ STREAK + MISSEDDAYS ONLY FOR PAST DAYS
  const sortedDates = Object.keys(dateMap).sort()
  let currentStreak = 0
  let longestStreak = 0
  let missedDays = 0

  for (const date of sortedDates) {
    const isPastDay = date < todayStr
    const { expected, completed } = dateMap[date]

    if (expected > 0) {
      if (expected === completed) {
        if (isPastDay || date === todayStr) {
          currentStreak += 1
          longestStreak = Math.max(currentStreak, longestStreak)
        }
      } else {
        if (isPastDay) {
          missedDays += 1
          currentStreak = 0
        }
        // today incomplete? just wait, don't break streak
      }
    }
  }

  goal.currentStreak = currentStreak
  goal.longestStreak = longestStreak
  goal.missedDays = missedDays

  await goal.save()
  return goal.progress
}


const Goal = mongoose.model("Goal", goalSchema)
export default Goal
