import bcrypt from "bcryptjs"
import { generateToken } from "../lib/utils.js"
import User from "../models/user.model.js"

export const signup = async (req, res) => {
  console.log("Hit signup")
  //   getting data
  const { fullName, email, password , username} = req.body
  try {
    //ground check for all data
    if (!fullName || !email || !password || !username)
      return res.status(400).json({ message: "All fields are required" })

    // password check
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" })
    }

    // user check
    const user = await User.findOne({ email })

    if (user) return res.status(400).json({ message: "User already exists" })

    // performs hashing
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // creating new user
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      username
    })

    if (newUser) {
      // generate token
      const token = generateToken(newUser._id)

      await newUser.save()

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        username: newUser.username,
        email: newUser.email,
        profilePic: newUser.profilePic,
        token, // ✅ send it to frontend
      })
    } else {
      return res.status(400).json({ message: "Invalid user data" })
    }
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
      return res.status(400).json({ message: "Inavalid credentials" })
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password)
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Inavalid credentials" })
    }

    const token = generateToken(user._id)

    res.status(201).json({
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic,
      token, // ✅ send it to frontend
    })

  } catch (error) {
    console.log("Error at login controller", error.message)
    return res.status(500).json({ message: "Internal server error" })
  }
}

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 })
    return res.status(200).json({ message: "Logged out successfully" })
  } catch (error) {
    console.log("Error at logout controller", error.message)
    return res.status(500).json({ message: "Internal server error" })
  }
}

// export const updateProfile = async (req, res) => {
//   try {
//     const { media } = req.body
//     const userId = req.user._id

//     if (!media) {
//       return res.status(400).json({ message: "Profile pic is required" })
//     }

//     const updatedUser = await User.findByIdAndUpdate(
//       userId,
//       {
//         profilePic: media
//       },
//       { new: true }
//     )

//     return res.status(200).json(updatedUser)
//   } catch (error) {
//     console.log("Error at update profile controller", error.message)
//     return res.status(500).json({ message: "Internal server error" })
//   }
// }

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
