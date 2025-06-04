import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
} from "../controllers/note.controller.js";

import {
  updateNoteTags,
  getNotesByTag,
  listNoteTags,
} from "../controllers/tag.controller.js";

const router = express.Router();

// Protect all note routes
router.use(protectRoute);

// --- Note CRUD ---
router.post("/", createNote);
router.get("/", getNotes);
router.get("/:noteId", getNoteById);
router.put("/:noteId", updateNote);
router.delete("/:noteId", deleteNote);

// --- Note Tagging ---
// Update tags on a specific note
// PUT /api/notes/:noteId/tags
router.put("/:noteId/tags", updateNoteTags);

// Get all notes with a given tag
// GET /api/notes/tag/:tagName
router.get("/tag/:tagName", getNotesByTag);

// List all tags for current user’s notes
// GET /api/notes/tags
router.get("/tags", listNoteTags);

export default router;
