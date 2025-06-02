// import "dotenv/config"
// import Task from "../models/task.model.js"
// import { connectDB } from "../lib/db.js"

// const run = async () => {
//   await connectDB()

//   const tasks = await Task.find({
//     recurring: "daily",
//     $or: [{ days: { $exists: false } }, { days: { $size: 0 } }],
//   })

//   console.log(`🔍 Found ${tasks.length} daily tasks to fix`)

//   for (const task of tasks) {
//     // All 7 days of the week
//     const allDays = [
//       "Sunday",
//       "Monday",
//       "Tuesday",
//       "Wednesday",
//       "Thursday",
//       "Friday",
//       "Saturday",
//     ]

//     task.days = allDays
//     await task.save()
//     console.log(`✅ Updated daily task "${task.title}" → days: [All Days]`)
//   }

//   console.log("🎉 All outdated daily tasks updated!")
//   process.exit()
// }

// run().catch((err) => {
//   console.error("❌ Error fixing daily tasks:", err)
//   process.exit(1)
// })


import "dotenv/config"
import Task from "../models/task.model.js"
import { connectDB } from "../lib/db.js"

const formatTime = (date) => {
  const d = new Date(date)
  const hours = String(d.getHours()).padStart(2, "0")
  const minutes = String(d.getMinutes()).padStart(2, "0")
  return `${hours}:${minutes}`
}

const run = async () => {
  await connectDB()

  // Find tasks where startTime or endTime is a Date object
  const tasks = await Task.find({
    $or: [
      { startTime: { $type: "date" } },
      { endTime: { $type: "date" } }
    ]
  })

  console.log(`🛠 Found ${tasks.length} tasks to fix.`)

  for (const task of tasks) {
    const oldStart = task.startTime
    const oldEnd = task.endTime

    task.startTime = formatTime(oldStart)
    task.endTime = formatTime(oldEnd)

    await task.save()
    console.log(`✅ Fixed: ${task.title} → ${task.startTime} → ${task.endTime}`)
  }

  console.log("🎉 All old Date-based start/end times converted to string format.")
  process.exit()
}

run().catch((err) => {
  console.error("❌ Error fixing old task times:", err)
  process.exit(1)
})
