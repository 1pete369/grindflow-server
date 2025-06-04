// src/routes/referral.route.js
import express from "express"
import { protectRoute } from "../middleware/auth.middleware.js"
import { getMyReferralInfo } from "../controllers/referral.controller.js"

const router = express.Router()

// Only logged‐in users can see their own referral code/count
router.get("/me", protectRoute, getMyReferralInfo)

export default router
