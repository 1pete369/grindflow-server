// src/routes/snapshot.route.js
import express from "express"
import { protectRoute } from "../middleware/auth.middleware.js"
import { getSnapshot } from "../controllers/snapshot.controller.js"

const router = express.Router()

// Protect the snapshot endpoint
router.get("/", protectRoute, getSnapshot)

export default router
