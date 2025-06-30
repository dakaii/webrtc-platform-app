import { Request } from 'express';
import { ParticipantInfo } from 'livekit-server-sdk';

// Custom Request type with user context
export interface AuthenticatedRequest extends Request {
  user?: {
    identity: string;
    name?: string;
    metadata?: string;
  };
}

// Room creation options
export interface CreateRoomOptions {
  name: string;
  emptyTimeout?: number;
  maxParticipants?: number;
  metadata?: string;
  egressEnabled?: boolean;
  minPlayoutDelay?: number;
  maxPlayoutDelay?: number;
}

// Token generation options
export interface TokenOptions {
  identity: string;
  name?: string;
  roomName: string;
  metadata?: string;
  permissions?: {
    canPublish?: boolean;
    canSubscribe?: boolean;
    canPublishData?: boolean;
    canUpdateOwnMetadata?: boolean;
    hidden?: boolean;
    recorder?: boolean;
  };
  validFor?: string;
}

// Room info response
export interface RoomInfoResponse {
  sid: string;
  name: string;
  emptyTimeout: number;
  maxParticipants: number;
  creationTime: number;
  turnPassword: string;
  enabledCodecs: Array<{ mime: string; fmtpLine: string }>;
  metadata: string;
  numParticipants: number;
  numPublishers: number;
  activeRecording: boolean;
}

// Participant info response
export interface ParticipantInfoResponse extends ParticipantInfo {
  connectionQuality: string;
}

// Webhook event types
export interface WebhookEvent {
  event: string;
  room?: RoomInfoResponse;
  participant?: ParticipantInfoResponse;
  track?: {
    sid: string;
    type: string;
    source: string;
    muted: boolean;
  };
  egressInfo?: {
    egressId: string;
    roomId: string;
    roomName: string;
    status: string;
  };
  timestamp: number;
}

// Error response
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}