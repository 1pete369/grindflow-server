// routes/folder.route.js
import express from "express"
import {
  createFolder,
  getAllFolders,
  getFolderById,
  updateFolder,
  deleteFolder,
} from "../controllers/folder.controller.js"
import { protectRoute } from "../middleware/auth.middleware.js"

const router = express.Router()

// 🔐 all folder ops require auth
router.use(protectRoute)

// POST   /api/folders       → create a new folder
router.post("/", createFolder)

// GET    /api/folders       → list all folders for this user
router.get("/", getAllFolders)

// GET    /api/folders/:id   → get one folder
router.get("/:id", getFolderById)

// PATCH  /api/folders/:id   → rename or recolor
router.patch("/:id", updateFolder)

// DELETE /api/folders/:id   → delete folder (and unassign its tasks)
router.delete("/:id", deleteFolder)

export default router
