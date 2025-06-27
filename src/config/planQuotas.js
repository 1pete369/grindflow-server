// src/config/planQuotas.js
export const PLAN_QUOTAS = {
  free: {
    tasks:    20,
    habits:    5,
    goals:     3,
  },
  personal: {
    tasks:   100,
    habits:   20,
    goals:    10,
  },
  community: {
    tasks:   500,
    habits:  100,
    goals:    50,
  },
  // premium → unlimited
  premium: {
    tasks:    Infinity,
    habits:   Infinity,
    goals:    Infinity,
  },
}
