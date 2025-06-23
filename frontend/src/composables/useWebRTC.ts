import { ref, onUnmounted, type Ref } from "vue";
import { webSocketService } from "@/services/websocket";
import type { ServerMessage } from "@/types";

interface RemoteParticipant {
  id: string;
  username: string;
  stream?: MediaStream;
}

export function useWebRTC(localVideo: Ref<HTMLVideoElement | undefined>) {
  const localStream = ref<MediaStream | null>(null);
  const remoteParticipants = ref<RemoteParticipant[]>([]);
  const currentRoomId = ref<string | null>(null);
  const isMuted = ref(false);
  const isVideoOff = ref(false);

  const peerConnections = new Map<string, RTCPeerConnection>();

  const startLocalStream = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStream.value = stream;

      if (localVideo.value) {
        localVideo.value.srcObject = stream;
      }

      console.log("Local stream started");
    } catch (error) {
      console.error("Error accessing media devices:", error);
      throw error;
    }
  };

  const stopLocalStream = (): void => {
    if (localStream.value) {
      localStream.value.getTracks().forEach((track) => track.stop());
      localStream.value = null;
    }

    // Clean up all peer connections
    peerConnections.forEach((pc) => pc.close());
    peerConnections.clear();
    remoteParticipants.value = [];

    console.log("Local stream stopped");
  };

  const toggleMute = (): void => {
    if (localStream.value) {
      const audioTrack = localStream.value.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        isMuted.value = !audioTrack.enabled;
      }
    }
  };

  const toggleVideo = (): void => {
    if (localStream.value) {
      const videoTrack = localStream.value.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        isVideoOff.value = !videoTrack.enabled;
      }
    }
  };

  const createPeerConnection = (participantId: string): RTCPeerConnection => {
    console.log("Creating peer connection for participant:", participantId);

    const config: RTCConfiguration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };

    const pc = new RTCPeerConnection(config);

    // Add local stream tracks
    if (localStream.value) {
      localStream.value.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.value!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log("Received remote track from", participantId);
      const [remoteStream] = event.streams;

      // Update the participant with the stream
      const participantIndex = remoteParticipants.value.findIndex(
        (p) => p.id === participantId
      );

      if (participantIndex !== -1) {
        remoteParticipants.value[participantIndex].stream = remoteStream;

        // Find and update the video element
        setTimeout(() => {
          const videoElement = document.querySelector(
            `[data-participant-id="${participantId}"]`
          ) as HTMLVideoElement;
          if (videoElement) {
            videoElement.srcObject = remoteStream;
          }
        }, 100);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && currentRoomId.value) {
        console.log("Sending ICE candidate to", participantId);
        webSocketService.send({
          type: "ice-candidate",
          roomName: currentRoomId.value,
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid || null,
          sdpMLineIndex: event.candidate.sdpMLineIndex ?? null,
          targetUserId: parseInt(participantId),
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(
        `Peer connection with ${participantId} state:`,
        pc.connectionState
      );
    };

    peerConnections.set(participantId, pc);
    return pc;
  };

  const handleSignalingMessage = async (
    message: ServerMessage
  ): Promise<void> => {
    console.log(
      "Handling signaling message:",
      message.type,
      "from:",
      message.fromUserId
    );

    if (!message.fromUserId) return;

    const participantId = message.fromUserId.toString();
    let pc = peerConnections.get(participantId);
    if (!pc) {
      pc = createPeerConnection(participantId);
    }

    try {
      switch (message.type) {
        case "offer":
          console.log(
            "Received offer from",
            participantId,
            "PC state:",
            pc.signalingState
          );
          if (message.sdp) {
            // Only handle offer if we're in the right state
            if (
              pc.signalingState === "stable" ||
              pc.signalingState === "have-remote-offer"
            ) {
              await pc.setRemoteDescription(
                new RTCSessionDescription({ type: "offer", sdp: message.sdp })
              );
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              // Send answer back
              if (currentRoomId.value) {
                console.log("Sending answer to", participantId);
                webSocketService.send({
                  type: "answer",
                  roomName: currentRoomId.value,
                  targetUserId: parseInt(participantId),
                  sdp: answer.sdp,
                });
              }
            } else {
              console.log(
                "Ignoring offer due to signaling state:",
                pc.signalingState
              );
            }
          }
          break;

        case "answer":
          console.log(
            "Received answer from",
            participantId,
            "PC state:",
            pc.signalingState
          );
          if (message.sdp) {
            // Only handle answer if we're expecting one
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(
                new RTCSessionDescription({ type: "answer", sdp: message.sdp })
              );
              console.log(
                "Answer set successfully, PC state:",
                pc.signalingState
              );
            } else {
              console.log(
                "Ignoring answer due to signaling state:",
                pc.signalingState
              );
            }
          }
          break;

        case "ice-candidate":
          console.log("Received ICE candidate from", participantId);
          if (message.candidate && pc.remoteDescription) {
            await pc.addIceCandidate(
              new RTCIceCandidate({
                candidate: message.candidate,
                sdpMid: message.sdpMid || undefined,
                sdpMLineIndex: message.sdpMLineIndex || undefined,
              })
            );
          } else if (!pc.remoteDescription) {
            console.log("Queueing ICE candidate - no remote description yet");
          }
          break;
      }
    } catch (error) {
      console.error("Error handling signaling message:", error);
    }
  };

  const createOfferForParticipant = async (
    participantId: string
  ): Promise<void> => {
    console.log("Creating offer for participant:", participantId);
    let pc = peerConnections.get(participantId);

    if (!pc) {
      pc = createPeerConnection(participantId);
    }

    // Only create offer if we're in stable state
    if (pc.signalingState !== "stable") {
      console.log(
        "Skipping offer creation - PC not in stable state:",
        pc.signalingState
      );
      return;
    }

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("Created and set local offer, PC state:", pc.signalingState);

      // Send offer via WebSocket
      if (currentRoomId.value) {
        webSocketService.send({
          type: "offer",
          roomName: currentRoomId.value,
          targetUserId: parseInt(participantId),
          sdp: offer.sdp,
        });
      }
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };

  const addRemoteParticipant = (participant: RemoteParticipant): void => {
    console.log("Adding remote participant:", participant);
    const existingIndex = remoteParticipants.value.findIndex(
      (p) => p.id === participant.id
    );

    if (existingIndex === -1) {
      remoteParticipants.value.push(participant);

      // Add a small random delay to prevent race conditions when both users join simultaneously
      const delay = Math.random() * 200;

      setTimeout(() => {
        createOfferForParticipant(participant.id);
      }, delay);
    }
  };

  const removeRemoteParticipant = (participantId: string): void => {
    console.log("Removing remote participant:", participantId);
    const index = remoteParticipants.value.findIndex(
      (p) => p.id === participantId
    );
    if (index !== -1) {
      remoteParticipants.value.splice(index, 1);
    }

    const pc = peerConnections.get(participantId);
    if (pc) {
      pc.close();
      peerConnections.delete(participantId);
    }
  };

  const joinRoom = (roomId: string): void => {
    currentRoomId.value = roomId;

    // Setup WebSocket event listeners
    webSocketService.on("offer", handleSignalingMessage);
    webSocketService.on("answer", handleSignalingMessage);
    webSocketService.on("ice-candidate", handleSignalingMessage);

    // Send join room message
    console.log("Sending join-room message for room:", roomId);
    webSocketService.send({
      type: "join-room",
      roomName: roomId,
      password: undefined,
    });
  };

  const leaveRoom = (): void => {
    if (currentRoomId.value) {
      webSocketService.send({
        type: "leave-room",
        roomName: currentRoomId.value,
      });
    }

    // Cleanup
    stopLocalStream();
    currentRoomId.value = null;

    // Remove event listeners
    webSocketService.off("offer", handleSignalingMessage);
    webSocketService.off("answer", handleSignalingMessage);
    webSocketService.off("ice-candidate", handleSignalingMessage);
  };

  return {
    localStream,
    remoteParticipants,
    isMuted,
    isVideoOff,
    startLocalStream,
    stopLocalStream,
    toggleMute,
    toggleVideo,
    addRemoteParticipant,
    removeRemoteParticipant,
    joinRoom,
    leaveRoom,
  };
}
