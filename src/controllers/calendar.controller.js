// src/controllers/calendar.controller.js
import Task from "../models/task.model.js";
import Habit from "../models/habit.model.js";
import Reminder from "../models/reminder.model.js";

/**
 * GET /api/calendar?year=<YYYY>&month=<MM>
 * Returns events for tasks (completedDates), habits, and reminders for the specified month.
 * Only Premium users can access.
 *
 * Response format:
 * {
 *   tasks: [
 *     { date: "2025-06-15", title: "Task Title", icon: "📝", type: "task" },
 *     ...
 *   ],
 *   habits: [
 *     { date: "2025-06-01", title: "Habit Title", icon: "🏃", type: "habit" },
 *     ...
 *   ],
 *   reminders: [
 *     { date: "2025-06-03", time: "14:00", title: "Reminder Title", type: "reminder" },
 *     ...
 *   ]
 * }
 */
export const getCalendar = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Check Premium access
    const { plan, status } = req.user.subscription || {};
    if (plan !== "premium" || status !== "active") {
      return res
        .status(403)
        .json({ error: "Calendar view is available to Premium users only." });
    }

    // 2. Parse year & month
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10); // 1-12

    if (
      isNaN(year) ||
      isNaN(month) ||
      month < 1 ||
      month > 12 ||
      year < 1970 ||
      year > 3000
    ) {
      return res
        .status(400)
        .json({ error: "Invalid year or month. Use ?year=YYYY&month=MM." });
    }

    // Helper: zero-pad month/day
    const pad = (n) => (n < 10 ? "0" + n : "" + n);

    const yearStr = String(year);
    const monthStr = pad(month);

    // Build date strings for matching completedDates (format "YYYY-MM-DD")
    const prefix = `${yearStr}-${monthStr}-`;

    // 3. Fetch Tasks: tasks that have completedDates in this month
    const tasks = [];
    const taskDocs = await Task.find({ userId }).select("title icon completedDates");

    taskDocs.forEach((task) => {
      (task.completedDates || []).forEach((dateStr) => {
        if (dateStr.startsWith(prefix)) {
          tasks.push({
            date: dateStr,
            title: task.title,
            icon: task.icon,
            type: "task",
          });
        }
      });
    });

    // 4. Fetch Habits: generate occurrences for each active habit
    const habits = [];
    const habitDocs = await Habit.find({ userId, isArchived: false }).select(
      "title icon frequency days startDate"
    );

    // Determine first and last day of month
    const firstOfMonth = new Date(year, month - 1, 1);
    const lastOfMonth = new Date(year, month, 0); // day 0 of next month

    habitDocs.forEach((habit) => {
      // If habit.startDate is after lastOfMonth, skip
      if (new Date(habit.startDate) > lastOfMonth) return;

      // Build a set of weekdays for quick lookup
      // habit.days contains strings like "Monday", "Tuesday", etc.
      const dayNamesSet = new Set(habit.days || []);

      // Iterate each date in the month
      for (
        let d = new Date(firstOfMonth);
        d <= lastOfMonth;
        d.setDate(d.getDate() + 1)
      ) {
        // Ensure d >= habit.startDate
        if (d < new Date(habit.startDate)) continue;

        // Get weekday name of d
        const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
        if (dayNamesSet.has(weekday)) {
          const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
            d.getDate()
          )}`;
          habits.push({
            date: dateStr,
            title: habit.title,
            icon: habit.icon,
            type: "habit",
          });
        }
      }
    });

    // 5. Fetch Reminders: those with remindAt in this month
    const reminders = [];
    const startOfMonth = new Date(`${yearStr}-${monthStr}-01T00:00:00.000Z`);
    const endOfMonth = new Date(`${yearStr}-${monthStr}-${pad(lastOfMonth.getDate())}T23:59:59.999Z`);

    const reminderDocs = await Reminder.find({
      userId,
      remindAt: { $gte: startOfMonth, $lte: endOfMonth },
    }).select("title remindAt");

    reminderDocs.forEach((rem) => {
      const d = new Date(rem.remindAt);
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      reminders.push({
        date: dateStr,
        time: timeStr,
        title: rem.title,
        type: "reminder",
      });
    });

    return res.status(200).json({ tasks, habits, reminders });
  } catch (err) {
    console.error("getCalendar Error:", err);
    return res.status(500).json({ error: "Could not fetch calendar data" });
  }
};
