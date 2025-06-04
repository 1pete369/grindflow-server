import mongoose from "mongoose";
import Note from "../models/note.model.js";
import JournalEntry from "../models/journal.model.js";

/**
 * Add or replace tags on a Note.
 * PUT /api/notes/:noteId/tags
 * Body: { tags: ["work", "urgent", ...] }
 */
export const updateNoteTags = async (req, res) => {
  try {
    const userId = req.user._id;
    const { noteId } = req.params;
    const { tags } = req.body;

    // 1. Validate noteId and tags
    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(400).json({ error: "Invalid note ID" });
    }
    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: "Tags must be an array of strings" });
    }

    // 2. Find the note (must belong to user)
    const note = await Note.findOne({ _id: noteId, userId });
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    // 3. Replace tags (trim each, remove duplicates)
    const uniqueTags = [...new Set(tags.map((t) => t.trim()).filter((t) => t.length))];
    note.tags = uniqueTags;
    await note.save();

    return res.status(200).json({ message: "Tags updated", tags: note.tags });
  } catch (err) {
    console.error("updateNoteTags Error:", err);
    return res.status(500).json({ error: "Could not update tags" });
  }
};

/**
 * Fetch all notes for the user that have a given tag.
 * GET /api/notes/tag/:tagName
 */
export const getNotesByTag = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tagName } = req.params;

    if (!tagName || typeof tagName !== "string") {
      return res.status(400).json({ error: "Tag name is required" });
    }

    const notes = await Note.find({
      userId,
      tags: tagName.trim(),
    }).sort({ updatedAt: -1 });

    return res.status(200).json(notes);
  } catch (err) {
    console.error("getNotesByTag Error:", err);
    return res.status(500).json({ error: "Could not fetch notes" });
  }
};

/**
 * List all unique tags the user has across all their notes.
 * GET /api/notes/tags
 */
export const listNoteTags = async (req, res) => {
  try {
    const userId = req.user._id;
    const tags = await Note.distinct("tags", { userId });
    return res.status(200).json(tags);
  } catch (err) {
    console.error("listNoteTags Error:", err);
    return res.status(500).json({ error: "Could not list tags" });
  }
};

/**
 * Add or replace tags on a Journal Entry.
 * PUT /api/journals/:journalId/tags
 * Body: { tags: ["gratitude", "morning", ...] }
 */
export const updateJournalTags = async (req, res) => {
  try {
    const userId = req.user._id;
    const { journalId } = req.params;
    const { tags } = req.body;

    if (!mongoose.Types.ObjectId.isValid(journalId)) {
      return res.status(400).json({ error: "Invalid journal ID" });
    }
    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: "Tags must be an array of strings" });
    }

    const entry = await JournalEntry.findOne({ _id: journalId, userId });
    if (!entry) {
      return res.status(404).json({ error: "Journal entry not found" });
    }

    const uniqueTags = [...new Set(tags.map((t) => t.trim()).filter((t) => t.length))];
    entry.tags = uniqueTags;
    await entry.save();

    return res.status(200).json({ message: "Tags updated", tags: entry.tags });
  } catch (err) {
    console.error("updateJournalTags Error:", err);
    return res.status(500).json({ error: "Could not update tags" });
  }
};

/**
 * Fetch all journal entries for the user that have a given tag.
 * GET /api/journals/tag/:tagName
 */
export const getJournalsByTag = async (req, res) => {
  try {
    const userId = req.user._id;
    const { tagName } = req.params;

    if (!tagName || typeof tagName !== "string") {
      return res.status(400).json({ error: "Tag name is required" });
    }

    const entries = await JournalEntry.find({
      userId,
      tags: tagName.trim(),
    }).sort({ updatedAt: -1 });

    return res.status(200).json(entries);
  } catch (err) {
    console.error("getJournalsByTag Error:", err);
    return res.status(500).json({ error: "Could not fetch journal entries" });
  }
};

/**
 * List all unique tags the user has across all their journal entries.
 * GET /api/journals/tags
 */
export const listJournalTags = async (req, res) => {
  try {
    const userId = req.user._id;
    const tags = await JournalEntry.distinct("tags", { userId });
    return res.status(200).json(tags);
  } catch (err) {
    console.error("listJournalTags Error:", err);
    return res.status(500).json({ error: "Could not list tags" });
  }
};
