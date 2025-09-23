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
    // In production when client and server are on different domains, cookies must be
    // Secure and SameSite=None to be sent with cross-site requests.
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/", // ensure cookie is available on all paths
  })
}
