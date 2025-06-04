// test-socket2.js
import { io } from "socket.io-client";

// 1. Paste your valid JWT here (from login).
//    You can use the same JWT as client 1, or a different user’s JWT if you want to test two distinct users.
const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODNiMjJkNGViYjg2MTZiYTgxNTdjMTkiLCJpYXQiOjE3NDg3MDYwNTYsImV4cCI6MTc0OTMxMDg1Nn0.MGrU39IrHMkbSK24j-pgobfS1tUEc8kIN0lG4LsC8oc";

// 2. Paste the same roomId (or another valid one) that client 1 used.
const ROOM_ID = "683fe8184bdd528c3d593668";

// Create a Socket.IO client, passing the JWT in auth
const socket = io("http://localhost:5001", {
  auth: { token: JWT },
  transports: ["websocket"], // force WebSocket (optional)
});

// Listen for connection
socket.on("connect", () => {
  console.log("✅ Client 2 connected! Socket ID:", socket.id);

  // 3. Join the same room
  socket.emit("joinRoom", { roomId: ROOM_ID });
  console.log(`→ Client 2 joinRoom emitted for room ${ROOM_ID}`);

  // 4. After joining, send a different test message
  const testText = "Hello from client 2 at " + new Date().toISOString();
  socket.emit("sendMessage", {
    roomId: ROOM_ID,
    text: testText,
  });
  console.log(`→ Client 2 sendMessage emitted: "${testText}"`);
});

// Listen for newMessage broadcasts
socket.on("newMessage", (msg) => {
  console.log("🔔 Client 2 newMessage event received:", msg);
});

// Handle disconnection
socket.on("disconnect", (reason) => {
  console.log("⚠️ Client 2 disconnected:", reason);
});

// Handle errors (e.g., auth failure)
socket.on("error", (err) => {
  console.error("❌ Client 2 Socket Error:", err);
});
 