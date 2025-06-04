// test-socket.js
import { io } from "socket.io-client"

// 1. Paste your valid JWT here (from login).
const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODNiMjJkNGViYjg2MTZiYTgxNTdjMTkiLCJpYXQiOjE3NDg3MDYwNTYsImV4cCI6MTc0OTMxMDg1Nn0.MGrU39IrHMkbSK24j-pgobfS1tUEc8kIN0lG4LsC8oc"

// 2. Paste a valid roomId you created earlier (either public or private, if you joined).
const ROOM_ID = "683fe8184bdd528c3d593668"

// Create a Socket.IO client, passing the JWT in auth
const socket = io("http://localhost:5001", {
  auth: { token: JWT },
  transports: ["websocket"], // force WebSocket (optional)
})

// Listen for connection
socket.on("connect", () => {
  console.log("✅ Connected! Socket ID:", socket.id)

  // 3. Join the room
  socket.emit("joinRoom", { roomId: ROOM_ID })
  console.log(`→ joinRoom emitted for room ${ROOM_ID}`)

  // 4. After joining, send a test message
  const testText = "Hello from test-socket.js at " + new Date().toISOString()
  socket.emit("sendMessage", {
    roomId: ROOM_ID,
    text: testText,
  })
  console.log(`→ sendMessage emitted: "${testText}"`)
})

// Listen for newMessage broadcasts
socket.on("newMessage", (msg) => {
  console.log("🔔 newMessage event received:", msg)
})

// Handle disconnection
socket.on("disconnect", (reason) => {
  console.log("⚠️ Disconnected:", reason)
})

// Handle errors (e.g., auth failure)
socket.on("error", (err) => {
  console.error("❌ Socket Error:", err)
})
