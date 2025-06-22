const WebSocket = require("ws");
const jwt = require("jsonwebtoken");

const WS_URL = "ws://localhost:3002";
const JWT_SECRET = "dev-super-secret-jwt-key-change-in-production";

// Create a test token
const token = jwt.sign({ sub: 3, username: "testuser" }, JWT_SECRET, {
  expiresIn: "1h",
});

console.log("Test Token:", token);

// Connect with token in URL
const ws = new WebSocket(`${WS_URL}?token=${token}`);

ws.on("open", () => {
  console.log("Connected to WebSocket with URL token");

  // Try joining a room
  const joinMessage = {
    type: "join-room",
    roomName: "test-room",
    password: null,
  };

  console.log("Sending join room message:", JSON.stringify(joinMessage));
  ws.send(JSON.stringify(joinMessage));
});

ws.on("message", (data) => {
  console.log("Received:", data.toString());
});

ws.on("error", (error) => {
  console.error("WebSocket error:", error);
});

ws.on("close", (code, reason) => {
  console.log("Connection closed:", code, reason.toString());
});

// Close after 10 seconds
setTimeout(() => {
  ws.close();
}, 10000);
