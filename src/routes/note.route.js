import express from "express"
import {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
} from "../controllers/note.controller.js"
import { protectRoute } from "../middleware/auth.middleware.js"

const router = express.Router()

router.use(protectRoute)

router.post("/", createNote)
router.get("/", getNotes)
router.get("/:noteId", getNoteById)
router.put("/:noteId", updateNote)
router.delete("/:noteId", deleteNote)

export default router
