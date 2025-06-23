import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { useWebRTC } from "../useWebRTC";

// Mock WebSocket service
vi.mock("../../services/websocket", () => ({
  webSocketService: {
    on: vi.fn(),
    off: vi.fn(),
    send: vi.fn(),
  },
}));

// Mock MediaDevices
const mockGetUserMedia = vi.fn();
Object.defineProperty(global.navigator, "mediaDevices", {
  writable: true,
  value: { getUserMedia: mockGetUserMedia },
});

// Mock RTCPeerConnection
const mockRTCPeerConnection = {
  setLocalDescription: vi.fn(),
  setRemoteDescription: vi.fn(),
  createOffer: vi.fn(),
  createAnswer: vi.fn(),
  addIceCandidate: vi.fn(),
  addTrack: vi.fn(),
  close: vi.fn(),
  signalingState: "stable",
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

Object.defineProperty(global, "RTCPeerConnection", {
  writable: true,
  value: vi.fn(() => mockRTCPeerConnection),
});

describe("useWebRTC", () => {
  let localVideoRef: any;

  beforeEach(() => {
    vi.clearAllMocks();
    localVideoRef = ref({ srcObject: null });
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ kind: "video" }, { kind: "audio" }],
    });
  });

  describe("Initialization", () => {
    it("should initialize with empty state", () => {
      const { remoteParticipants, isMuted, isVideoOff } =
        useWebRTC(localVideoRef);

      expect(remoteParticipants.value).toEqual([]);
      expect(isMuted.value).toBe(false);
      expect(isVideoOff.value).toBe(false);
    });

    it("should start local stream successfully", async () => {
      const { startLocalStream, localStream } = useWebRTC(localVideoRef);

      await startLocalStream();

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: true,
        audio: true,
      });
      expect(localStream.value).toBeTruthy();
    });
  });

  describe("Room Management", () => {
    it("should join room and setup WebSocket listeners", () => {
      const { joinRoom } = useWebRTC(localVideoRef);
      const { webSocketService } = require("../../services/websocket");

      joinRoom("test-room-123");

      expect(webSocketService.on).toHaveBeenCalledWith(
        "offer",
        expect.any(Function)
      );
      expect(webSocketService.send).toHaveBeenCalledWith({
        type: "join-room",
        roomName: "test-room-123",
        password: undefined,
      });
    });

    it("should leave room and cleanup connections", () => {
      const { joinRoom, leaveRoom } = useWebRTC(localVideoRef);
      const { webSocketService } = require("../../services/websocket");

      joinRoom("test-room-123");
      leaveRoom();

      expect(webSocketService.send).toHaveBeenCalledWith({
        type: "leave-room",
        roomName: "test-room-123",
      });
    });
  });

  describe("Peer Management", () => {
    it("should add and remove remote participants", () => {
      const {
        addRemoteParticipant,
        removeRemoteParticipant,
        remoteParticipants,
      } = useWebRTC(localVideoRef);

      addRemoteParticipant({ id: "user-123", username: "Test User" });
      expect(remoteParticipants.value).toHaveLength(1);

      removeRemoteParticipant("user-123");
      expect(remoteParticipants.value).toHaveLength(0);
    });
  });

  describe("Media Controls", () => {
    it("should toggle mute correctly", () => {
      const { toggleMute, isMuted } = useWebRTC(localVideoRef);

      expect(isMuted.value).toBe(false);
      toggleMute();
      expect(isMuted.value).toBe(true);
    });

    it("should toggle video correctly", () => {
      const { toggleVideo, isVideoOff } = useWebRTC(localVideoRef);

      expect(isVideoOff.value).toBe(false);
      toggleVideo();
      expect(isVideoOff.value).toBe(true);
    });
  });
});
