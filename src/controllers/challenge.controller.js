// src/controllers/challenge.controller.js
import mongoose from "mongoose";
import Challenge from "../models/challenge.model.js";

/**
 * Create a new Challenge (Premium‐only).
 * Automatically adds the creator as a participant.
 * POST /api/challenges
 * Body: { title, description, startDate, endDate }
 */
export const createChallenge = async (req, res) => {
  try {
    const me = req.user;

    // 1. Only premium & active subscriptions can create
    if (
      me.subscription.plan !== "premium" ||
      me.subscription.status !== "active"
    ) {
      return res
        .status(403)
        .json({ error: "Only Premium users may create new challenges." });
    }

    const { title, description, startDate, endDate } = req.body;
    if (!title || !startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "Title, startDate, and endDate are required." });
    }

    // 2. Validate date ordering
    if (new Date(startDate) >= new Date(endDate)) {
      return res
        .status(400)
        .json({ error: "startDate must be before endDate." });
    }

    // 3. Create challenge, including the creator as first participant
    const newChallenge = await Challenge.create({
      title: title.trim(),
      description: description || "",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      creator: me._id,
      participants: [
        { userId: me._id, completedCount: 0, lastCheckInDate: null }
      ],
    });

    return res.status(201).json(newChallenge);
  } catch (err) {
    console.error("createChallenge Error:", err);
    return res.status(500).json({ error: "Could not create challenge" });
  }
};

/**
 * Get all active challenges (those whose endDate >= today).
 * GET /api/challenges
 */
export const getAllChallenges = async (req, res) => {
  try {
    const today = new Date();
    const challenges = await Challenge.find({ endDate: { $gte: today } })
      .sort({ startDate: 1 })
      .lean();
    return res.status(200).json(challenges);
  } catch (err) {
    console.error("getAllChallenges Error:", err);
    return res.status(500).json({ error: "Could not fetch challenges" });
  }
};

/**
 * Get one challenge by ID (public).
 * GET /api/challenges/:challengeId
 */
export const getChallengeById = async (req, res) => {
  try {
    const { challengeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(challengeId)) {
      return res.status(400).json({ error: "Invalid challenge ID" });
    }

    const challenge = await Challenge.findById(challengeId).populate({
      path: "participants.userId",
      select: "username fullName profilePic",
    });

    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    return res.status(200).json(challenge);
  } catch (err) {
    console.error("getChallengeById Error:", err);
    return res.status(500).json({ error: "Could not fetch challenge" });
  }
};

/**
 * Join a challenge (limit free users to 2 active).
 * POST /api/challenges/:challengeId/join
 */
export const joinChallenge = async (req, res) => {
  try {
    const me = req.user;
    const { challengeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(challengeId)) {
      return res.status(400).json({ error: "Invalid challenge ID" });
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    // 1. Check if user already a participant
    const already = challenge.participants.some(
      (p) => p.userId.toString() === me._id.toString()
    );
    if (already) {
      return res
        .status(400)
        .json({ error: "You have already joined this challenge." });
    }

    // 2. If not premium, enforce limit: can join at most 2 active challenges
    if (me.subscription.plan === "free" || me.subscription.status !== "active") {
      const today = new Date();

      // Count active challenges where this user is a participant and endDate >= today
      const activeCount = await Challenge.countDocuments({
        "participants.userId": me._id,
        endDate: { $gte: today },
      });

      if (activeCount >= 2) {
        return res.status(403).json({
          error:
            "Free users can join at most 2 active challenges. Upgrade to Premium to join more.",
        });
      }
    }

    // 3. Add participant
    challenge.participants.push({ userId: me._id, completedCount: 0, lastCheckInDate: null });
    await challenge.save();

    return res.status(200).json({ message: "Joined challenge" });
  } catch (err) {
    console.error("joinChallenge Error:", err);
    return res.status(500).json({ error: "Could not join challenge" });
  }
};

/**
 * Leave a challenge.
 * POST /api/challenges/:challengeId/leave
 */
export const leaveChallenge = async (req, res) => {
  try {
    const me = req.user;
    const { challengeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(challengeId)) {
      return res.status(400).json({ error: "Invalid challenge ID" });
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    // Find participant index
    const idx = challenge.participants.findIndex(
      (p) => p.userId.toString() === me._id.toString()
    );
    if (idx < 0) {
      return res
        .status(400)
        .json({ error: "You are not a participant of this challenge." });
    }

    // Remove that participant
    challenge.participants.splice(idx, 1);
    await challenge.save();

    return res.status(200).json({ message: "Left challenge" });
  } catch (err) {
    console.error("leaveChallenge Error:", err);
    return res.status(500).json({ error: "Could not leave challenge" });
  }
};

/**
 * Check in for today (only once per day, within date range).
 * POST /api/challenges/:challengeId/checkin
 */
export const checkInChallenge = async (req, res) => {
  try {
    const me = req.user;
    const { challengeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(challengeId)) {
      return res.status(400).json({ error: "Invalid challenge ID" });
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    // 1. Find this user's participant record
    const participant = challenge.participants.find(
      (p) => p.userId.toString() === me._id.toString()
    );
    if (!participant) {
      return res
        .status(403)
        .json({ error: "You must join this challenge before checking in." });
    }

    const today = new Date();
    const lastCheck = participant.lastCheckInDate;

    // 2. Prevent more than one check-in per calendar day
    if (lastCheck) {
      const sameDay =
        lastCheck.getFullYear() === today.getFullYear() &&
        lastCheck.getMonth() === today.getMonth() &&
        lastCheck.getDate() === today.getDate();
      if (sameDay) {
        return res
          .status(400)
          .json({ error: "You have already checked in today." });
      }
    }

    // 3. Ensure today is within [startDate, endDate]
    if (today < challenge.startDate || today > challenge.endDate) {
      return res.status(400).json({
        error: "You can only check in between the challenge start and end dates.",
      });
    }

    // 4. Perform the check‐in
    participant.completedCount += 1;
    participant.lastCheckInDate = today;
    await challenge.save();

    return res.status(200).json({
      message: "Check-in successful",
      completedCount: participant.completedCount,
    });
  } catch (err) {
    console.error("checkInChallenge Error:", err);
    return res.status(500).json({ error: "Could not check in" });
  }
};

/**
 * Get the leaderboard for a challenge.
 * GET /api/challenges/:challengeId/leaderboard
 */
export const getChallengeLeaderboard = async (req, res) => {
  try {
    const { challengeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(challengeId)) {
      return res.status(400).json({ error: "Invalid challenge ID" });
    }

    const challenge = await Challenge.findById(challengeId).populate({
      path: "participants.userId",
      select: "username fullName profilePic",
    });

    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    // Sort participants by completedCount desc, then joinDate asc
    const sorted = challenge.participants
      .map((p) => ({
        user: p.userId,
        completedCount: p.completedCount,
        joinDate: p.joinDate,
        lastCheckInDate: p.lastCheckInDate,
      }))
      .sort((a, b) => {
        if (b.completedCount !== a.completedCount) {
          return b.completedCount - a.completedCount;
        }
        return a.joinDate - b.joinDate;
      });

    return res.status(200).json({ leaderboard: sorted });
  } catch (err) {
    console.error("getChallengeLeaderboard Error:", err);
    return res.status(500).json({ error: "Could not fetch leaderboard" });
  }
};
