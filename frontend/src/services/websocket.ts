import type { SignalingMessage, WebRTCMessage } from "@/types";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3002";

export type WebSocketEventHandler = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private maxReconnectAttempts = 5;
  private reconnectAttempts = 0;
  private reconnectDelay = 1000;
  private eventHandlers: Map<string, WebSocketEventHandler[]> = new Map();

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Connect without token in URL - we'll send it as first message
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
          console.log("WebSocket connected, sending auth message");

          // Send authentication as first message
          const authMessage = {
            type: "auth",
            token: token,
          };

          this.ws!.send(JSON.stringify(authMessage));

          // Wait for authentication confirmation before resolving
          const authHandler = (message: any) => {
            if (message.type === "authenticated") {
              console.log("Authentication successful:", message);
              this.reconnectAttempts = 0;
              // Clean up auth handlers
              this.off("authenticated", authHandler);
              this.off("error", authHandler);
              resolve();
            } else if (message.type === "error") {
              console.error("Authentication failed:", message);
              // Clean up auth handlers
              this.off("authenticated", authHandler);
              this.off("error", authHandler);
              reject(new Error(`Authentication failed: ${message.message}`));
            }
          };

          // Temporarily listen for auth response
          this.on("authenticated", authHandler);
          this.on("error", authHandler);
        };

        this.ws.onmessage = (event) => {
          try {
            const message: SignalingMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };

        this.ws.onclose = (event) => {
          console.log("WebSocket disconnected:", event.code, event.reason);
          this.handleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts = 0;
  }

  send(message: WebRTCMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not connected");
    }
  }

  on(event: string, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: WebSocketEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private handleMessage(message: SignalingMessage): void {
    const handlers = this.eventHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error(
            `Error in WebSocket handler for ${message.type}:`,
            error
          );
        }
      });
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay =
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`
      );

      this.reconnectTimer = window.setTimeout(() => {
        const token = localStorage.getItem("auth_token");
        if (token) {
          this.connect(token).catch((error) => {
            console.error("Reconnection failed:", error);
          });
        }
      }, delay);
    } else {
      console.error("Max reconnection attempts reached");
    }
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const webSocketService = new WebSocketService();
