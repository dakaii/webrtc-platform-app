import { ref } from "vue";
import type { Ref } from "vue";

interface RemoteParticipant {
  id: string;
  username: string;
  stream?: MediaStream;
}

export function useWebRTC(localVideo: Ref<HTMLVideoElement | undefined>) {
  const localStream = ref<MediaStream | null>(null);
  const remoteParticipants = ref<RemoteParticipant[]>([]);
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
    } catch (error) {
      console.error("Failed to start local stream:", error);
      throw error;
    }
  };

  const stopLocalStream = (): void => {
    if (localStream.value) {
      localStream.value.getTracks().forEach((track) => {
        track.stop();
      });
      localStream.value = null;
    }

    if (localVideo.value) {
      localVideo.value.srcObject = null;
    }

    // Close all peer connections
    peerConnections.forEach((pc) => pc.close());
    peerConnections.clear();
    remoteParticipants.value = [];
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
      const [remoteStream] = event.streams;
      const participant = remoteParticipants.value.find(
        (p) => p.id === participantId
      );
      if (participant) {
        participant.stream = remoteStream;
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate via WebSocket
        // This would be implemented with the WebSocket service
        console.log("ICE candidate:", event.candidate);
      }
    };

    peerConnections.set(participantId, pc);
    return pc;
  };

  const handleSignalingData = async (data: any): Promise<void> => {
    const { type, payload, from } = data;

    let pc = peerConnections.get(from);
    if (!pc) {
      pc = createPeerConnection(from);
    }

    switch (type) {
      case "offer":
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        // Send answer back via WebSocket
        console.log("Created answer:", answer);
        break;

      case "answer":
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
        break;

      case "ice-candidate":
        await pc.addIceCandidate(new RTCIceCandidate(payload));
        break;
    }
  };

  const createOffer = async (participantId: string): Promise<void> => {
    const pc = createPeerConnection(participantId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Send offer via WebSocket
    console.log("Created offer:", offer);
  };

  const addRemoteParticipant = (participant: RemoteParticipant): void => {
    remoteParticipants.value.push(participant);
  };

  const removeRemoteParticipant = (participantId: string): void => {
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

  return {
    localStream,
    remoteParticipants,
    isMuted,
    isVideoOff,
    startLocalStream,
    stopLocalStream,
    toggleMute,
    toggleVideo,
    handleSignalingData,
    createOffer,
    addRemoteParticipant,
    removeRemoteParticipant,
  };
}
