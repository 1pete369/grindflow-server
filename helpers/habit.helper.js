import dayjs from "dayjs"

/**
 * Calculates the current streak (ending at the most recent date)
 * and the longest streak in the full history.
 *
 * @param {string[]} completedDates - array of "YYYY-MM-DD" strings
 * @param {"daily"|"weekly"} frequency
 * @param {string[]} validDays - e.g. ["Sunday","Friday"] for weekly habits
 * @returns {{streak: number, longestStreak: number}}
 */
export const calculateStreaks = (completedDates, frequency, validDays = []) => {
  if (!completedDates.length) return { streak: 0, longestStreak: 0 }

  // 1) Convert each "YYYY-MM-DD" to a dayjs instance and sort ascending
  const dates = completedDates
    .map(dateStr => dayjs(dateStr))
    .sort((a, b) => a.unix() - b.unix())

  // 2) First pass: find longest streak in full history
  let longest = 1
  let currentSegment = 1

  for (let i = 1; i < dates.length; i++) {
    const prev = dates[i - 1]
    const curr = dates[i]

    // expected difference: either 1 day or 1 week
    const expected = frequency === "daily"
      ? prev.add(1, "day")
      : prev.add(1, "week")

    const isValidWeekly = frequency === "weekly"
      ? validDays.includes(prev.format("dddd")) && validDays.includes(curr.format("dddd"))
      : true

    if (curr.isSame(expected, "day") && isValidWeekly) {
      currentSegment += 1
    } else {
      longest = Math.max(longest, currentSegment)
      currentSegment = 1
    }
  }
  longest = Math.max(longest, currentSegment)

  // 3) Second pass (backwards): compute current streak ending at most‐recent date
  let streak = 1
  for (let i = dates.length - 1; i > 0; i--) {
    const prev = dates[i - 1]
    const curr = dates[i]

    const expected = frequency === "daily"
      ? curr.subtract(1, "day")
      : curr.subtract(1, "week")

    const isValidWeekly = frequency === "weekly"
      ? validDays.includes(prev.format("dddd")) && validDays.includes(curr.format("dddd"))
      : true

    if (prev.isSame(expected, "day") && isValidWeekly) {
      streak += 1
    } else {
      break
    }
  }

  return { streak, longestStreak: longest }
}
