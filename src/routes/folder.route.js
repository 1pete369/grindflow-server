// src/routes/folder.route.js
import express from "express"
import { protectRoute } from "../middleware/auth.middleware.js"
import { checkQuota } from "../middleware/quota.middleware.js"
import Folder from "../models/folder.model.js"
import {
  createFolder,
  getAllFolders,
  getFolderById,
  updateFolder,
  deleteFolder,
} from "../controllers/folder.controller.js"

const router = express.Router()

// 🔐 Protect all folder routes
router.use(protectRoute)

// 🛑 Enforce per-plan folder limits on creation
router.post("/", checkQuota("folders", Folder), createFolder)

// 📂 List all folders for current user
router.get("/", getAllFolders)

// 📂 Get one folder by ID
router.get("/:id", getFolderById)

// ✏️ Rename or recolor a folder
router.patch("/:id", updateFolder)

// 🗑️ Delete a folder (and unassign its tasks)
router.delete("/:id", deleteFolder)

export default router
