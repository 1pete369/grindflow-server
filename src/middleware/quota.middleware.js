// src/middleware/quota.middleware.js
import { PLAN_QUOTAS } from '../config/planQuotas.js'

/**
 * resourceKey: one of "tasks" | "habits" | "goals"
 * model: Mongoose model for that resource
 */
export const checkQuota = (resourceKey, model) => {
  return async (req, res, next) => {
    const plan = req.user.subscription?.plan || 'free'
    const quota = PLAN_QUOTAS[plan]?.[resourceKey] ?? 0

    // count how many already exist
    const count = await model.countDocuments({ userId: req.user._id })

    if (count >= quota) {
      return res.status(403).json({
        error: `Quota exceeded: ${plan} plan allows only ${quota} ${resourceKey}.`,
      })
    }
    next()
  }
}
