// src/config/planQuotas.js
export const PLAN_QUOTAS = {
  free: {
    tasks: 20,
    habits: 5,
    goals: 3,
    folders: 3, // new: limit on folders for free plan
  },
  personal: {
    tasks: 100,
    habits: 20,
    goals: 10,
    folders: 20, // new: limit on folders for personal plan
  },
  community: {
    tasks: 500,
    habits: 100,
    goals: 50,
    folders: 50, // new: limit on folders for community plan
  },
  // premium → unlimited
  premium: {
    tasks: Infinity,
    habits: Infinity,
    goals: Infinity,
    folders: Infinity, // new: unlimited folders for premium plan
  },
}
