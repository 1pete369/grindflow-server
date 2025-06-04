// src/controllers/snapshot.controller.js
import Task from "../models/task.model.js";
import Habit from "../models/habit.model.js";
import Goal from "../models/goal.model.js";
import Note from "../models/note.model.js";
import Journal from "../models/journal.model.js";

/**
 * GET /api/snapshot
 * Returns a quick snapshot of key metrics for the current user:
 * {
 *   tasks: {
 *     total: Number,
 *     completed: Number,
 *     incomplete: Number,
 *     completedThisWeek: Number
 *   },
 *   habits: {
 *     total: Number,
 *     active: Number,
 *     archived: Number,
 *     habits: [
 *       { _id, title, currentStreak, longestStreak }
 *     ]
 *   },
 *   goals: {
 *     total: Number,
 *     active: Number,
 *     completed: Number,
 *     cancelled: Number
 *   },
 *   notes: {
 *     total: Number
 *   },
 *   journals: {
 *     total: Number
 *   }
 * }
 */
export const getSnapshot = async (req, res) => {
  try {
    // Use req.user._id (string) directly; Mongoose will cast it to ObjectId
    const userId = req.user._id;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ---- Tasks ----
    const totalTasks = await Task.countDocuments({ userId });
    const completedTasks = await Task.countDocuments({ userId, isCompleted: true });
    const incompleteTasks = totalTasks - completedTasks;
    const tasksWithRecentCompletion = await Task.countDocuments({
      userId,
      completedDates: {
        $elemMatch: {
          $gte: sevenDaysAgo.toISOString().split("T")[0]
        }
      }
    });

    // ---- Habits ----
    const totalHabits = await Habit.countDocuments({ userId });
    const activeHabits = await Habit.countDocuments({ userId, isArchived: false });
    const archivedHabits = totalHabits - activeHabits;
    const habitDocs = await Habit.find({ userId, isArchived: false })
      .select("title streak longestStreak")
      .lean();

    // ---- Goals ----
    const totalGoals = await Goal.countDocuments({ userId });
    const activeGoals = await Goal.countDocuments({ userId, status: "active" });
    const completedGoals = await Goal.countDocuments({ userId, status: "completed" });
    const cancelledGoals = await Goal.countDocuments({ userId, status: "cancelled" });

    // ---- Notes ----
    const totalNotes = await Note.countDocuments({ userId });

    // ---- Journals ----
    const totalJournals = await Journal.countDocuments({ userId });

    return res.status(200).json({
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        incomplete: incompleteTasks,
        completedThisWeek: tasksWithRecentCompletion,
      },
      habits: {
        total: totalHabits,
        active: activeHabits,
        archived: archivedHabits,
        habits: habitDocs.map(h => ({
          _id: h._id,
          title: h.title,
          currentStreak: h.streak,
          longestStreak: h.longestStreak,
        })),
      },
      goals: {
        total: totalGoals,
        active: activeGoals,
        completed: completedGoals,
        cancelled: cancelledGoals,
      },
      notes: {
        total: totalNotes,
      },
      journals: {
        total: totalJournals,
      },
    });
  } catch (err) {
    console.error("getSnapshot Error:", err);
    return res.status(500).json({ error: "Could not fetch snapshot" });
  }
};
