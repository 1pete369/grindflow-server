import express from "express"
import dotenv from "dotenv"
import cookieParser from "cookie-parser"
import cors from "cors"
import { connectDB } from "./lib/db.js"
import authRoutes from "./routes/auth.route.js"

dotenv.config()

const app = express()

app.use(express.json({ limit: "10mb" }))

app.use(cookieParser())

app.use(cors({
  origin: "http://192.168.175.249:8081", // or Metro bundler's host
  credentials: true
}));


app.get('/',(req,res)=>{
    res.send("Api is running")
})

app.use("/api/auth", authRoutes);


const PORT= process.env.PORT || 5001

app.listen(PORT,async()=>{
    console.log("Server started on port ",PORT)
   await connectDB()
})