// src/controllers/referral.controller.js

import User from "../models/user.model.js"

/**
 * GET /api/referrals/me
 * Returns the logged‐in user’s `referralCode` and `referralCount`.
 */
export const getMyReferralInfo = async (req, res) => {
  try {
    const me = req.user; // from protectRoute
    return res.status(200).json({
      referralCode: me.referralCode,
      referralCount: me.referralCount,
      referredBy: me.referredBy, // optional: show who referred them
    });
  } catch (err) {
    console.error("getMyReferralInfo Error:", err);
    return res.status(500).json({ error: "Could not fetch referral info" });
  }
};
