import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createJournal,
  getJournals,
  getJournalById,
  updateJournal,
  deleteJournal,
} from "../controllers/journal.controller.js";

import {
  updateJournalTags,
  getJournalsByTag,
  listJournalTags,
} from "../controllers/tag.controller.js";

const router = express.Router();

// Protect all journal routes
router.use(protectRoute);

// --- Journal CRUD ---
router.post("/", createJournal);
router.get("/", getJournals);
router.get("/:journalId", getJournalById);
router.put("/:journalId", updateJournal);
router.delete("/:journalId", deleteJournal);

// --- Journal Tagging ---
// Update tags on a specific journal entry
// PUT /api/journals/:journalId/tags
router.put("/:journalId/tags", updateJournalTags);

// Get all journal entries with a given tag
// GET /api/journals/tag/:tagName
router.get("/tag/:tagName", getJournalsByTag);

// List all tags for current user’s journal entries
// GET /api/journals/tags
router.get("/tags", listJournalTags);

export default router;
