import {
  AccessToken,
  RoomServiceClient,
  Room,
  ParticipantInfo,
  VideoGrant,
  TrackInfo,
  DataPacket_Kind,
} from 'livekit-server-sdk';
import { config } from '../config';
import { CreateRoomOptions, TokenOptions } from '../types';

export class LiveKitService {
  private roomService: RoomServiceClient;

  constructor() {
    this.roomService = new RoomServiceClient(
      config.livekit.host,
      config.livekit.apiKey,
      config.livekit.apiSecret
    );
  }

  /**
   * Generate an access token for a participant
   */
  async generateToken(options: TokenOptions): Promise<string> {
    const at = new AccessToken(
      config.livekit.apiKey,
      config.livekit.apiSecret,
      {
        identity: options.identity,
        name: options.name,
        metadata: options.metadata,
        ttl: options.validFor || '6h',
      }
    );

    const grant: VideoGrant = {
      roomJoin: true,
      room: options.roomName,
      canPublish: options.permissions?.canPublish ?? true,
      canSubscribe: options.permissions?.canSubscribe ?? true,
      canPublishData: options.permissions?.canPublishData ?? true,
      canUpdateOwnMetadata: options.permissions?.canUpdateOwnMetadata ?? true,
      hidden: options.permissions?.hidden ?? false,
      recorder: options.permissions?.recorder ?? false,
    };

    at.addGrant(grant);
    return await at.toJwt();
  }

  /**
   * Create a new room
   */
  async createRoom(options: CreateRoomOptions): Promise<Room> {
    try {
      return await this.roomService.createRoom({
        name: options.name,
        emptyTimeout: options.emptyTimeout || config.room.defaultEmptyTimeout,
        maxParticipants: options.maxParticipants || config.room.defaultMaxParticipants,
        metadata: options.metadata,
        // Note: Egress configuration is typically done through LiveKit's egress service
        // not directly in room creation
        minPlayoutDelay: options.minPlayoutDelay,
        maxPlayoutDelay: options.maxPlayoutDelay,
      });
    } catch (error) {
      throw new Error(`Failed to create room: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all active rooms
   */
  async listRooms(names?: string[]): Promise<Room[]> {
    try {
      return await this.roomService.listRooms(names);
    } catch (error) {
      throw new Error(`Failed to list rooms: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get room information
   */
  async getRoom(roomName: string): Promise<Room | null> {
    try {
      const rooms = await this.roomService.listRooms([roomName]);
      return rooms.length > 0 ? rooms[0] : null;
    } catch (error) {
      throw new Error(`Failed to get room: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a room
   */
  async deleteRoom(roomName: string): Promise<void> {
    try {
      await this.roomService.deleteRoom(roomName);
    } catch (error) {
      throw new Error(`Failed to delete room: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List participants in a room
   */
  async listParticipants(roomName: string): Promise<ParticipantInfo[]> {
    try {
      return await this.roomService.listParticipants(roomName);
    } catch (error) {
      throw new Error(`Failed to list participants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get participant information
   */
  async getParticipant(roomName: string, identity: string): Promise<ParticipantInfo | null> {
    try {
      return await this.roomService.getParticipant(roomName, identity);
    } catch (error) {
      // If participant not found, return null instead of throwing
      if (error instanceof Error && error.message.includes('not found')) {
        return null;
      }
      throw new Error(`Failed to get participant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove a participant from a room
   */
  async removeParticipant(roomName: string, identity: string): Promise<void> {
    try {
      await this.roomService.removeParticipant(roomName, identity);
    } catch (error) {
      throw new Error(`Failed to remove participant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mute/unmute a participant's published tracks
   */
  async mutePublishedTrack(
    roomName: string,
    identity: string,
    trackSid: string,
    muted: boolean
  ): Promise<TrackInfo> {
    try {
      return await this.roomService.mutePublishedTrack(roomName, identity, trackSid, muted);
    } catch (error) {
      throw new Error(`Failed to mute track: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update participant metadata
   */
  async updateParticipant(
    roomName: string,
    identity: string,
    metadata?: string,
    permission?: any
  ): Promise<ParticipantInfo> {
    try {
      return await this.roomService.updateParticipant(roomName, identity, metadata, permission);
    } catch (error) {
      throw new Error(`Failed to update participant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update room metadata
   */
  async updateRoomMetadata(roomName: string, metadata: string): Promise<Room> {
    try {
      return await this.roomService.updateRoomMetadata(roomName, metadata);
    } catch (error) {
      throw new Error(`Failed to update room metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send data to participants in a room
   */
  async sendData(
    roomName: string,
    data: Uint8Array,
    kind: 'reliable' | 'lossy',
    destinationIdentities?: string[]
  ): Promise<void> {
    try {
      const dataKind = kind === 'reliable' ? DataPacket_Kind.RELIABLE : DataPacket_Kind.LOSSY;
      await this.roomService.sendData(roomName, data, dataKind, { destinationIdentities });
    } catch (error) {
      throw new Error(`Failed to send data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export a singleton instance
export const livekitService = new LiveKitService();