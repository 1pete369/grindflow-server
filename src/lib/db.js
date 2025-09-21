import mongoose from "mongoose"

export const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI
    if (!uri) {
      throw new Error("MONGODB_URI is not set")
    }
    const conn = await mongoose.connect(uri)
    console.log("Connected to database", conn.connection.host)
  } catch (error) {
    console.log("Error connecting to database", error)
    throw error
  }
}
