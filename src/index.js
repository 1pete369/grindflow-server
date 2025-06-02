import express from "express"
import dotenv from "dotenv"
import cookieParser from "cookie-parser"
import cors from "cors"
import { connectDB } from "./lib/db.js"
import authRoutes from "./routes/auth.route.js"
import taskRoutes from "./routes/task.route.js"
import goalRoutes from "./routes/goal.route.js"
import habitRoutes from "./routes/habit.route.js"

dotenv.config()

const app = express()

app.use(express.json({ limit: "10mb" }))

app.use(cookieParser())

app.use(
  cors({
    origin: "http://192.168.175.249:8081", // or Metro bundler's host
    credentials: true,
  })
)

app.get("/", (req, res) => {
  res.send("Api is running")
})

app.use("/api/auth", authRoutes)
app.use("/api/task", taskRoutes)
app.use("/api/goal", goalRoutes)
app.use("/api/habit", habitRoutes)

const PORT = process.env.PORT || 5001

app.listen(PORT, async () => {
  console.log("Server started on port ", PORT)
  await connectDB()
})
