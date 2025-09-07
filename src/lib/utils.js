// Native
import jwt from "jsonwebtoken"

export const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  })
}

// Postman or web
export const sendTokenViaCookie = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  })

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // false in development, true in production
    sameSite: "lax", // changed from "strict" to work better with localhost
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/", // ensure cookie is available on all paths
  })
}
