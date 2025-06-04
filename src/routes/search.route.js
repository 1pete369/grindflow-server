// src/routes/search.route.js
import express from "express";
import { unifiedSearch } from "../controllers/search.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Protect the search route
router.get("/", protectRoute,unifiedSearch );

export default router;
