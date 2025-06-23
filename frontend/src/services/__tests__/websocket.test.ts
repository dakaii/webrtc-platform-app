import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { webSocketService } from "../websocket";

// Mock WebSocket
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
  onopen: null as ((event: Event) => void) | null,
  onmessage: null as ((event: MessageEvent) => void) | null,
  onclose: null as ((event: CloseEvent) => void) | null,
  onerror: null as ((event: Event) => void) | null,
};

const mockWebSocketConstructor = vi
  .fn()
  .mockImplementation(() => mockWebSocket);

// @ts-ignore
global.WebSocket = mockWebSocketConstructor;

describe("WebSocketService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocket.readyState = WebSocket.OPEN;
  });

  afterEach(() => {
    webSocketService.disconnect();
  });

  describe("Connection Management", () => {
    it("should connect to WebSocket server with correct URL", async () => {
      const token = "test-jwt-token";

      // Setup mock to call onopen immediately
      mockWebSocketConstructor.mockImplementation((url) => {
        expect(url).toBe("ws://localhost:3002");
        setTimeout(() => {
          if (mockWebSocket.onopen) {
            mockWebSocket.onopen({} as Event);
          }
        }, 0);
        return mockWebSocket;
      });

      const connectPromise = webSocketService.connect(token);

      // Simulate receiving authenticated message
      setTimeout(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify({
              type: "authenticated",
              userId: 1,
              username: "test",
            }),
          } as MessageEvent);
        }
      }, 10);

      await connectPromise;

      expect(mockWebSocketConstructor).toHaveBeenCalledWith(
        "ws://localhost:3002"
      );
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "auth", token })
      );
    });

    it("should reject connection on authentication failure", async () => {
      const token = "invalid-token";

      mockWebSocketConstructor.mockImplementation(() => {
        setTimeout(() => {
          if (mockWebSocket.onopen) {
            mockWebSocket.onopen({} as Event);
          }
        }, 0);
        return mockWebSocket;
      });

      const connectPromise = webSocketService.connect(token);

      // Simulate receiving error message
      setTimeout(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify({
              type: "error",
              message: "Authentication failed",
            }),
          } as MessageEvent);
        }
      }, 10);

      await expect(connectPromise).rejects.toThrow(
        "Authentication failed: Authentication failed"
      );
    });

    it("should disconnect and clean up properly", () => {
      webSocketService.disconnect();
      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });

  describe("Message Handling", () => {
    it("should send WebRTC messages correctly", () => {
      const message = {
        type: "join-room" as const,
        roomName: "test-room",
        password: undefined,
      };

      webSocketService.send(message);

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it("should not send messages when disconnected", () => {
      // Create a disconnected mock
      const disconnectedMock = {
        ...mockWebSocket,
        readyState: WebSocket.CLOSED,
      };

      // @ts-ignore - Override the service's WebSocket instance
      webSocketService["ws"] = disconnectedMock;

      const message = {
        type: "join-room" as const,
        roomName: "test-room",
        password: undefined,
      };

      webSocketService.send(message);

      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it("should handle incoming messages and call appropriate handlers", () => {
      const handler = vi.fn();
      webSocketService.on("room-joined", handler);

      // Simulate receiving message
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify({
            type: "room-joined",
            roomName: "test-room",
            userId: 1,
            participants: [],
          }),
        } as MessageEvent);
      }

      expect(handler).toHaveBeenCalledWith({
        type: "room-joined",
        roomName: "test-room",
        userId: 1,
        participants: [],
      });
    });
  });

  describe("Event Handlers", () => {
    it("should add and remove event handlers correctly", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      webSocketService.on("user-joined", handler1);
      webSocketService.on("user-joined", handler2);

      // Simulate message
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify({
            type: "user-joined",
            user: { userId: 2, username: "user2" },
          }),
        } as MessageEvent);
      }

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();

      // Remove one handler
      webSocketService.off("user-joined", handler1);
      vi.clearAllMocks();

      // Simulate another message
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify({
            type: "user-joined",
            user: { userId: 3, username: "user3" },
          }),
        } as MessageEvent);
      }

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe("Connection State", () => {
    it("should report connection state correctly", () => {
      // Test with connected state
      const connectedMock = { ...mockWebSocket, readyState: WebSocket.OPEN };
      // @ts-ignore
      webSocketService["ws"] = connectedMock;
      expect(webSocketService.isConnected).toBe(true);

      // Test with disconnected state
      const disconnectedMock = {
        ...mockWebSocket,
        readyState: WebSocket.CLOSED,
      };
      // @ts-ignore
      webSocketService["ws"] = disconnectedMock;
      expect(webSocketService.isConnected).toBe(false);
    });
  });
});
