// src/controllers/search.controller.js
import Task from "../models/task.model.js";
import Note from "../models/note.model.js";
import Goal from "../models/goal.model.js";
import Journal from "../models/journal.model.js";
import Habit from "../models/habit.model.js";

/**
 * Unified search across Tasks, Notes, Journals, Goals, and Habits.
 * GET /api/search?q=<keyword>
 *
 * Requires authentication (protectRoute).
 *
 * Responds with JSON:
 * {
 *   tasks:    [ ... ],
 *   notes:    [ ... ],
 *   journals: [ ... ],
 *   goals:    [ ... ],
 *   habits:   [ ... ]
 * }
 */
export const unifiedSearch = async (req, res) => {
  try {
    const userId = req.user._id;
    const q = req.query.q || "";

    if (!q.trim()) {
      return res.status(400).json({ error: "Query parameter 'q' is required." });
    }

    // Case-insensitive regex
    const regex = new RegExp(q.trim(), "i");

    // 1. Search Tasks by title or description
    const tasks = await Task.find({
      userId,
      $or: [
        { title: { $regex: regex } },
        { description: { $regex: regex } }
      ],
    }).select("title description startTime endTime category icon recurring priority isCompleted");

    // 2. Search Notes by title or content
    const notes = await Note.find({
      userId,
      $or: [
        { title: { $regex: regex } },
        { content: { $regex: regex } }
      ],
    }).select("title content tags");

    // 3. Search Journals by title or body
    const journals = await Journal.find({
      userId,
      $or: [
        { title: { $regex: regex } },
        { body: { $regex: regex } }
      ],
    }).select("title body tags");

    // 4. Search Goals by title or description
    const goals = await Goal.find({
      userId,
      $or: [
        { title: { $regex: regex } },
        { description: { $regex: regex } }
      ],
    }).select("title description status targetDate progress");

    // 5. Search Habits by title or description
    const habits = await Habit.find({
      userId,
      $or: [
        { title: { $regex: regex } },
        { description: { $regex: regex } }
      ],
    }).select("title description frequency days");

    return res.status(200).json({
      tasks,
      notes,
      journals,
      goals,
      habits,
    });
  } catch (err) {
    console.error("unifiedSearch Error:", err);
    return res.status(500).json({ error: "Could not perform search" });
  }
};
