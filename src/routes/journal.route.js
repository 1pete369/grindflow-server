import express from "express"
import {
  createJournal,
  getJournals,
  getJournalById,
  updateJournal,
  deleteJournal,
} from "../controllers/journal.controller.js"
import { protectRoute } from "../middleware/auth.middleware.js"

const router = express.Router()

router.use(protectRoute) // protect all routes below

router.post("/", createJournal)
router.get("/", getJournals)
router.get("/:journalId", getJournalById)
router.put("/:journalId", updateJournal)
router.delete("/:journalId", deleteJournal)

export default router
