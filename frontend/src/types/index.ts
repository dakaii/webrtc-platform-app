export interface User {
  id: number;
  username: string;
  email: string;
  createdAt: string;
}

export interface Room {
  id: number;
  name: string;
  description?: string;
  isPrivate: boolean;
  maxParticipants: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  participantCount: number;
  participants?: User[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface CreateRoomData {
  name: string;
  description?: string;
  isPrivate: boolean;
  password?: string;
  maxParticipants: number;
}

export interface JoinRoomData {
  password?: string;
}

// Client message types that match Rust ClientMessage enum
export interface WebRTCMessage {
  type:
    | "auth"
    | "join-room"
    | "leave-room"
    | "offer"
    | "answer"
    | "ice-candidate";
  token?: string; // for auth
  roomName?: string;
  password?: string;
  targetUserId?: number;
  sdp?: string;
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

// Server message types that match Rust ServerMessage enum
export interface ServerMessage {
  type:
    | "room-joined"
    | "room-left"
    | "user-joined"
    | "user-left"
    | "offer"
    | "answer"
    | "ice-candidate"
    | "error"
    | "authenticated";
  roomName?: string;
  userId?: number;
  participants?: Participant[];
  user?: Participant;
  fromUserId?: number;
  sdp?: string;
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  message?: string;
  code?: number;
  username?: string;
}

export interface Participant {
  userId: number;
  username: string;
}

// Legacy SignalingMessage interface - remove this when refactoring is complete
export interface SignalingMessage {
  type: string;
  data: any;
}
