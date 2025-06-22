const WebSocket = require("ws");
const jwt = require("jsonwebtoken");

const WS_URL = "ws://localhost:3002";
const JWT_SECRET = "dev-super-secret-jwt-key-change-in-production";

// Create a test token
const token = jwt.sign({ sub: 3, username: "testuser" }, JWT_SECRET, {
  expiresIn: "1h",
});

console.log("Test Token:", token);

const ws = new WebSocket(WS_URL);

ws.on("open", () => {
  console.log("Connected to WebSocket");

  const authMessage = { type: "auth", token: token };

  console.log("Sending auth message:", JSON.stringify(authMessage));
  ws.send(JSON.stringify(authMessage));
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

// Close after 5 seconds
setTimeout(() => {
  ws.close();
}, 5000);
