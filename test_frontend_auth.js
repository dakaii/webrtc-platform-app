const WebSocket = require("ws");
const jwt = require("jsonwebtoken");

const WS_URL = "ws://localhost:3002";
const JWT_SECRET = "dev-super-secret-jwt-key-change-in-production";

// Create a test token for a real user
const token = jwt.sign({ sub: 3, username: "testuser" }, JWT_SECRET, {
  expiresIn: "1h",
});

console.log("Test Token:", token);

const ws = new WebSocket(WS_URL);

ws.on("open", () => {
  console.log("WebSocket connected, sending auth message");

  // Send authentication as first message (like frontend does)
  const authMessage = {
    type: "auth",
    token: token,
  };

  console.log("Sending auth message:", JSON.stringify(authMessage));
  ws.send(JSON.stringify(authMessage));
});

ws.on("message", (data) => {
  const message = JSON.parse(data.toString());
  console.log("Received:", message);

  if (message.type === "authenticated") {
    console.log("✅ Authentication successful!");

    // Try joining a room after authentication
    setTimeout(() => {
      const joinMessage = {
        type: "join-room",
        roomName: "test-room",
        password: null,
      };

      console.log("Sending join room message:", JSON.stringify(joinMessage));
      ws.send(JSON.stringify(joinMessage));
    }, 1000);
  } else if (message.type === "room-joined") {
    console.log("✅ Successfully joined room!");
  }
});

ws.on("error", (error) => {
  console.error("WebSocket error:", error);
});

ws.on("close", (code, reason) => {
  console.log("Connection closed:", code, reason.toString());
});

// Close after 10 seconds
setTimeout(() => {
  console.log("Closing connection...");
  ws.close();
}, 10000);
