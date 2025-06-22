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

export interface WebRTCMessage {
  type: "offer" | "answer" | "ice_candidate" | "join_room" | "leave_room";
  room_name: string;
  target_user_id?: number;
  sdp?: string;
  candidate?: string;
  sdp_mid?: string;
  sdp_mline_index?: number;
  password?: string;
}

export interface SignalingMessage {
  type: string;
  data: any;
}
