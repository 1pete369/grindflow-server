import bcrypt from "bcryptjs"
import { sendTokenViaCookie } from "../lib/utils.js"
import User from "../models/user.model.js"
import crypto from "crypto"
import { generateToken } from "../lib/utils.js"

/**
 * Helper: generate a random alphanumeric referral code (8 chars)
 */
const generateReferralCode = () => {
  return crypto.randomBytes(4).toString("hex") // e.g. "9f4b6c2a"
}

export const signup = async (req, res) => {
  console.log("Hit signup")
  const { fullName, email, password, username, referralCode } = req.body

  try {
    // 1. Basic field check
    if (!fullName || !email || !password || !username) {
      // if (!fullName || !email || !password || !username) {
      return res.status(400).json({ message: "All fields are required" })
    }

    // 2. Password length check
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" })
    }

    // 3. Email/username uniqueness
    const existingEmail = await User.findOne({ email })
    if (existingEmail) {
      return res.status(400).json({ message: "Email already in use" })
    }
    const existingUsername = await User.findOne({ username })
    if (existingUsername) {
      return res.status(400).json({ message: "Username already taken" })
    }

    // 4. Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // 5. Generate a unique referral code for this new user
    let newReferralCode = generateReferralCode()
    // Ensure uniqueness in DB (unlikely collision but guard)
    while (await User.findOne({ referralCode: newReferralCode })) {
      newReferralCode = generateReferralCode()
    }

    // 6. Build newUser object
    const newUser = new User({
      fullName,
      email,
      username,
      password: hashedPassword,
      referralCode: newReferralCode,
    })

    // 7. If an incoming referralCode was provided, link them
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode.trim() })
      if (referrer) {
        newUser.referredBy = referrer._id
        referrer.referralCount += 1
        await referrer.save()
      }
      // If invalid code, ignore silently (or optionally send warning)
    }

    // 8. Save new user
    await newUser.save()

    // 9. Send JWT in cookie and user info
    sendTokenViaCookie(res, newUser._id);
    
    // return user info (no token since it's in cookie)
    return res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      username: newUser.username,
      email: newUser.email,
      profilePic: newUser.profilePic,
      referralCode: newUser.referralCode,
      referralCount: newUser.referralCount,
    })
  } catch (error) {
    console.log("Error in signup controller", error.message)
    return res.status(500).json({ message: "Internal server error" })
  }
}

export const login = async (req, res) => {
  console.log("Hit login")
  const { email, password } = req.body
  try {
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password)
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Send JWT in cookie and user info
    sendTokenViaCookie(res, user._id);
    
    // return user info (no token since it's in cookie)
    return res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic,
      referralCode: user.referralCode,
      referralCount: user.referralCount,
    })
    
  } catch (error) {
    console.log("Error at login controller", error.message)
    return res.status(500).json({ message: "Internal server error" })
  }
}

export const logout = (req, res) => {
  try {
    res.cookie("token", "", {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    })
    return res.status(200).json({ message: "Logged out successfully" })
  } catch (error) {
    console.log("Error at logout controller", error.message)
    return res.status(500).json({ message: "Internal server error" })
  }
}

export const updateProfile = async (req, res) => {
  try {
    const { media } = req.body
    const userId = req.user._id

    if (!media) {
      return res.status(400).json({ message: "Profile pic is required" })
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        profilePic: media,
      },
      { new: true }
    )

    return res.status(200).json(updatedUser)
  } catch (error) {
    console.log("Error at update profile controller", error.message)
    return res.status(500).json({ message: "Internal server error" })
  }
}

export const checkAuth = (req, res) => {
  try {
    console.log("Hit check")
    return res.status(200).json(req.user)
  } catch (error) {
    console.log("Error at checkAuth controller", error.message)
    return res.status(500).json({ message: "Internal server error" })
  }
}

export const checkUsernameAvailability = async (req, res) => {
  try {
    const { username } = req.query
    const exists = await User.exists({ username })

    return res.json({ available: !exists }) // true = available
  } catch (err) {
    return res.status(500).json({ message: "Server error" })
  }
}
