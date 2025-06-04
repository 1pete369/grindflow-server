/**
 * createPremiumUser.js
 *
 * Run with:
 *   node createPremiumUser.js
 *
 * This script connects to MongoDB, hashes a password, and creates
 * a new user with subscription.plan = "premium" and subscription.status = "active".
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/user.model.js";

dotenv.config();

// 1. Read connection string from .env
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI is not defined in .env");
  process.exit(1);
}

// 2. Define the new user’s data
const NEW_USER = {
  fullName: "Premium User",
  email: "premium@example.com",
  username: "premium_user",
  password: "PremiumPass123", // plaintext; will be hashed below
  profilePic: "",            // leave blank or add a URL
};

// 3. Main async function
async function run() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✅  Connected to MongoDB");

    // Check if a user with that email already exists
    const existing = await User.findOne({ email: NEW_USER.email });
    if (existing) {
      console.log(`ℹ️  A user with email "${NEW_USER.email}" already exists. Exiting.`);
      process.exit(0);
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(NEW_USER.password, salt);

    // Create the new user object
    const user = new User({
      fullName: NEW_USER.fullName,
      email: NEW_USER.email,
      username: NEW_USER.username,
      password: hashed,
      profilePic: NEW_USER.profilePic,
      // Set subscription to Premium/Active
      subscription: {
        plan: "premium",
        status: "active",
        // Set currentPeriodEnd to 30 days from now (adjust if you want a different date)
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      // The referral fields (if present) will default to null/0
    });

    // Save to DB
    const saved = await user.save();
    console.log("🎉  Created new Premium user:");
    console.log({
      _id: saved._id.toString(),
      fullName: saved.fullName,
      email: saved.email,
      username: saved.username,
      subscription: saved.subscription,
    });
    process.exit(0);
  } catch (err) {
    console.error("❌  Error creating Premium user:", err);
    process.exit(1);
  }
}

run();
