// src/routes/challenge.route.js
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createChallenge,
  getAllChallenges,
  getChallengeById,
  joinChallenge,
  leaveChallenge,
  checkInChallenge,
  getChallengeLeaderboard,
} from "../controllers/challenge.controller.js";

const router = express.Router();

// Public: list all active challenges
// GET /api/challenges
router.get("/", getAllChallenges);

// Public: get one challenge by ID
// GET /api/challenges/:challengeId
router.get("/:challengeId", getChallengeById);

// Everything below requires authentication
router.use(protectRoute);

// Create a challenge (Premium only)
// POST /api/challenges
router.post("/", createChallenge);

// Join a challenge (free users limited to 2 active)
// POST /api/challenges/:challengeId/join
router.post("/:challengeId/join", joinChallenge);

// Leave a challenge
// POST /api/challenges/:challengeId/leave
router.post("/:challengeId/leave", leaveChallenge);

// Check‐in for today
// POST /api/challenges/:challengeId/checkin
router.post("/:challengeId/checkin", checkInChallenge);

// Fetch leaderboard
// GET /api/challenges/:challengeId/leaderboard
router.get("/:challengeId/leaderboard", getChallengeLeaderboard);

export default router;
