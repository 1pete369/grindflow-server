// src/models/User.model.js
import mongoose from "mongoose"

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      required: true,
    },
    username: {
      type: String,
      unique: true,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },

    // Profile fields (bio, followers) if you already have them
    bio: {
      type: String,
      default: "",
      trim: true,
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    subscription: {
      plan: {
        type: String,
        enum: ["free", "personal", "community", "premium"],
        default: "free",
      },
      status: {
        type: String,
        enum: ["free", "active", "past_due", "canceled"],
        default: "free",
      },
      currentPeriodEnd: { type: Date, default: null },
    },
    // ========================
    // Referral fields:
    referralCode: {
      type: String,
      unique: true,
      index: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    referralCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
)

const User = mongoose.models.User || mongoose.model("User", userSchema)
export default User
