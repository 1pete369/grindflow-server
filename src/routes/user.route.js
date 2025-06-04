import express from "express";
import {
  searchUsers,
  getUserProfile,
  followUser,
  unfollowUser,
  updateSubscription,    // ← ensure this is imported
} from "../controllers/user.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public: search and profile
router.get("/search", searchUsers);
router.get("/:userId", getUserProfile);

// Protect all below
router.use(protectRoute);

router.post("/:userId/follow", followUser);
router.post("/:userId/unfollow", unfollowUser);

// Update subscription (only the user themselves)
router.put("/:userId/subscription", updateSubscription);

export default router;
