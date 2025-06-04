// src/controllers/user.controller.js
import mongoose from "mongoose";
import User from "../models/user.model.js";
/**
 * Search users by username or fullName or email.
 * GET /api/users/search?q=<query>
 */
export const searchUsers = async (req, res) => {
  try {
    const q = req.query.q || "";
    if (!q.trim()) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    // Case-insensitive, partial match on username, fullName, or email
    const regex = new RegExp(q.trim(), "i");
    const users = await User.find({
      $or: [{ username: regex }, { fullName: regex }, { email: regex }],
    })
      .select("username fullName profilePic bio")
      .limit(20);

    return res.status(200).json(users);
  } catch (err) {
    console.error("searchUsers Error:", err);
    return res.status(500).json({ error: "Could not search users" });
  }
};

/**
 * Get a public profile by userId
 * GET /api/users/:userId
 * Returns: username, fullName, profilePic, bio, followerCount, followingCount
 */

export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const user = await User.findById(userId).select(
      "username fullName profilePic bio followers following"
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const profile = {
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      profilePic: user.profilePic,
      bio: user.bio,
      followerCount: user.followers.length,
      followingCount: user.following.length,
    };
    return res.status(200).json(profile);
  } catch (err) {
    console.error("getUserProfile Error:", err);
    return res.status(500).json({ error: "Could not fetch profile" });
  }
};

/**
 * Follow a user
 * POST /api/users/:userId/follow
 * Current user = req.user; target user = userId param
 */
export const followUser = async (req, res) => {
  try {
    const targetId = req.params.userId;
    const me = req.user; // populated by protectRoute
    if (me._id.toString() === targetId) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      return res.status(404).json({ error: "User to follow not found" });
    }

    // Add me._id to targetUser.followers if not already present
    if (!targetUser.followers.includes(me._id)) {
      targetUser.followers.push(me._id);
      await targetUser.save();
    }

    // Add targetId to me.following if not already present
    if (!me.following.includes(targetId)) {
      me.following.push(targetId);
      await me.save();
    }

    return res.status(200).json({ message: "Now following user" });
  } catch (err) {
    console.error("followUser Error:", err);
    return res.status(500).json({ error: "Could not follow user" });
  }
};

/**
 * Unfollow a user
 * POST /api/users/:userId/unfollow
 */
export const unfollowUser = async (req, res) => {
  try {
    const targetId = req.params.userId;
    const me = req.user;

    if (me._id.toString() === targetId) {
      return res.status(400).json({ error: "Cannot unfollow yourself" });
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      return res.status(404).json({ error: "User to unfollow not found" });
    }

    // Remove me._id from targetUser.followers
    if (targetUser.followers.includes(me._id)) {
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== me._id.toString()
      );
      await targetUser.save();
    }

    // Remove targetId from me.following
    if (me.following.includes(targetId)) {
      me.following = me.following.filter((id) => id.toString() !== targetId);
      await me.save();
    }

    return res.status(200).json({ message: "Unfollowed user" });
  } catch (err) {
    console.error("unfollowUser Error:", err);
    return res.status(500).json({ error: "Could not unfollow user" });
  }
};
/**
 * Update a user’s subscription plan and status.
 * PUT /api/users/:userId/subscription
 * Body: { plan: "free" | "personal" | "community" | "premium", status: "free" | "active" | "past_due" | "canceled" }
 *
 * Only the user themselves may call this.
 * If plan === "premium" and status === "active", we'll auto‐set currentPeriodEnd = now + 1 month.
 */
export const updateSubscription = async (req, res) => {
  try {
    const { userId } = req.params;
    const { plan, status } = req.body;
    const me = req.user;

    // 1. Only allow a user to update their own subscription
    if (me._id.toString() !== userId) {
      return res.status(403).json({ error: "Cannot modify another user’s subscription." });
    }

    // 2. Validate plan and status
    const allowedPlans = ["free", "personal", "community", "premium"];
    const allowedStatuses = ["free", "active", "past_due", "canceled"];
    if (!allowedPlans.includes(plan) || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid plan or status." });
    }

    // 3. Build update object
    const updateFields = {
      "subscription.plan": plan,
      "subscription.status": status,
    };

    // 4. If upgrading to Premium and setting status to active, auto‐set one‐month expiry
    if (plan === "premium" && status === "active") {
      const now = new Date();
      // Add 1 month (30 days) to "now"
      const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      updateFields["subscription.currentPeriodEnd"] = oneMonthLater;
    } else {
      // Clear any existing currentPeriodEnd for non‐premium or inactive
      updateFields["subscription.currentPeriodEnd"] = null;
    }

    // 5. Save
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, select: "subscription" }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.status(200).json({ subscription: updatedUser.subscription });
  } catch (err) {
    console.error("updateSubscription Error:", err);
    return res.status(500).json({ error: "Could not update subscription." });
  }
};
