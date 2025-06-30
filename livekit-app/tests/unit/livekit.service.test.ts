import { LiveKitService } from '../../src/services/livekit.service';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { config } from '../../src/config';

// Mock the livekit-server-sdk module
jest.mock('livekit-server-sdk');

describe('LiveKitService', () => {
  let service: LiveKitService;
  let mockRoomServiceClient: jest.Mocked<RoomServiceClient>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instance
    mockRoomServiceClient = {
      createRoom: jest.fn(),
      listRooms: jest.fn(),
      deleteRoom: jest.fn(),
      listParticipants: jest.fn(),
      getParticipant: jest.fn(),
      removeParticipant: jest.fn(),
      mutePublishedTrack: jest.fn(),
      updateParticipant: jest.fn(),
      updateRoomMetadata: jest.fn(),
      sendData: jest.fn(),
    } as any;

    // Mock the constructor
    (RoomServiceClient as jest.MockedClass<typeof RoomServiceClient>).mockImplementation(() => mockRoomServiceClient);

    // Create service instance
    service = new LiveKitService();
  });

  describe('generateToken', () => {
    it('should generate a valid access token', async () => {
      const mockToken = 'mock-jwt-token';
      const mockToJwt = jest.fn().mockResolvedValue(mockToken);
      const mockAddGrant = jest.fn();

      (AccessToken as jest.MockedClass<typeof AccessToken>).mockImplementation(() => ({
        addGrant: mockAddGrant,
        toJwt: mockToJwt,
      } as any));

      const options = {
        identity: 'test-user',
        name: 'Test User',
        roomName: 'test-room',
        metadata: '{"role":"presenter"}',
        permissions: {
          canPublish: true,
          canSubscribe: true,
        },
      };

      const token = await service.generateToken(options);

      expect(token).toBe(mockToken);
      expect(mockAddGrant).toHaveBeenCalledWith({
        roomJoin: true,
        room: 'test-room',
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        canUpdateOwnMetadata: true,
        hidden: false,
        recorder: false,
      });
    });

    it('should use default permissions when not specified', async () => {
      const mockToken = 'mock-jwt-token';
      const mockToJwt = jest.fn().mockResolvedValue(mockToken);
      const mockAddGrant = jest.fn();

      (AccessToken as jest.MockedClass<typeof AccessToken>).mockImplementation(() => ({
        addGrant: mockAddGrant,
        toJwt: mockToJwt,
      } as any));

      const options = {
        identity: 'test-user',
        roomName: 'test-room',
      };

      await service.generateToken(options);

      expect(mockAddGrant).toHaveBeenCalledWith(expect.objectContaining({
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        canUpdateOwnMetadata: true,
        hidden: false,
        recorder: false,
      }));
    });
  });

  describe('createRoom', () => {
    it('should create a room successfully', async () => {
      const mockRoom = { 
        sid: 'room-sid', 
        name: 'test-room',
        emptyTimeout: 300,
        maxParticipants: 50,
      };
      mockRoomServiceClient.createRoom.mockResolvedValue(mockRoom as any);

      const options = {
        name: 'test-room',
        maxParticipants: 10,
        metadata: '{"type":"meeting"}',
      };

      const room = await service.createRoom(options);

      expect(room).toEqual(mockRoom);
      expect(mockRoomServiceClient.createRoom).toHaveBeenCalledWith({
        name: 'test-room',
        emptyTimeout: config.room.defaultEmptyTimeout,
        maxParticipants: 10,
        metadata: '{"type":"meeting"}',
        minPlayoutDelay: undefined,
        maxPlayoutDelay: undefined,
      });
    });

    it('should throw an error when room creation fails', async () => {
      mockRoomServiceClient.createRoom.mockRejectedValue(new Error('Room already exists'));

      await expect(service.createRoom({ name: 'test-room' })).rejects.toThrow('Failed to create room: Room already exists');
    });
  });

  describe('listRooms', () => {
    it('should list all rooms', async () => {
      const mockRooms = [
        { sid: 'room1', name: 'room1' },
        { sid: 'room2', name: 'room2' },
      ];
      mockRoomServiceClient.listRooms.mockResolvedValue(mockRooms as any);

      const rooms = await service.listRooms();

      expect(rooms).toEqual(mockRooms);
      expect(mockRoomServiceClient.listRooms).toHaveBeenCalledWith(undefined);
    });

    it('should list specific rooms by name', async () => {
      const mockRooms = [{ sid: 'room1', name: 'room1' }];
      mockRoomServiceClient.listRooms.mockResolvedValue(mockRooms as any);

      const rooms = await service.listRooms(['room1']);

      expect(rooms).toEqual(mockRooms);
      expect(mockRoomServiceClient.listRooms).toHaveBeenCalledWith(['room1']);
    });
  });

  describe('getRoom', () => {
    it('should get a room by name', async () => {
      const mockRoom = { sid: 'room1', name: 'test-room' };
      mockRoomServiceClient.listRooms.mockResolvedValue([mockRoom] as any);

      const room = await service.getRoom('test-room');

      expect(room).toEqual(mockRoom);
      expect(mockRoomServiceClient.listRooms).toHaveBeenCalledWith(['test-room']);
    });

    it('should return null when room not found', async () => {
      mockRoomServiceClient.listRooms.mockResolvedValue([]);

      const room = await service.getRoom('non-existent');

      expect(room).toBeNull();
    });
  });

  describe('deleteRoom', () => {
    it('should delete a room successfully', async () => {
      mockRoomServiceClient.deleteRoom.mockResolvedValue(undefined);

      await service.deleteRoom('test-room');

      expect(mockRoomServiceClient.deleteRoom).toHaveBeenCalledWith('test-room');
    });

    it('should throw an error when deletion fails', async () => {
      mockRoomServiceClient.deleteRoom.mockRejectedValue(new Error('Room not found'));

      await expect(service.deleteRoom('non-existent')).rejects.toThrow('Failed to delete room: Room not found');
    });
  });

  describe('listParticipants', () => {
    it('should list participants in a room', async () => {
      const mockParticipants = [
        { sid: 'p1', identity: 'user1' },
        { sid: 'p2', identity: 'user2' },
      ];
      mockRoomServiceClient.listParticipants.mockResolvedValue(mockParticipants as any);

      const participants = await service.listParticipants('test-room');

      expect(participants).toEqual(mockParticipants);
      expect(mockRoomServiceClient.listParticipants).toHaveBeenCalledWith('test-room');
    });
  });

  describe('getParticipant', () => {
    it('should get a participant by identity', async () => {
      const mockParticipant = { sid: 'p1', identity: 'user1' };
      mockRoomServiceClient.getParticipant.mockResolvedValue(mockParticipant as any);

      const participant = await service.getParticipant('test-room', 'user1');

      expect(participant).toEqual(mockParticipant);
      expect(mockRoomServiceClient.getParticipant).toHaveBeenCalledWith('test-room', 'user1');
    });

    it('should return null when participant not found', async () => {
      mockRoomServiceClient.getParticipant.mockRejectedValue(new Error('participant not found'));

      const participant = await service.getParticipant('test-room', 'non-existent');

      expect(participant).toBeNull();
    });
  });

  describe('removeParticipant', () => {
    it('should remove a participant successfully', async () => {
      mockRoomServiceClient.removeParticipant.mockResolvedValue(undefined);

      await service.removeParticipant('test-room', 'user1');

      expect(mockRoomServiceClient.removeParticipant).toHaveBeenCalledWith('test-room', 'user1');
    });
  });

  describe('sendData', () => {
    it('should send data to participants', async () => {
      mockRoomServiceClient.sendData.mockResolvedValue(undefined);

      const data = new TextEncoder().encode('test message');
      await service.sendData('test-room', data, 'reliable', ['user1', 'user2']);

      expect(mockRoomServiceClient.sendData).toHaveBeenCalledWith(
        'test-room',
        data,
        expect.anything(), // DataPacket_Kind
        { destinationIdentities: ['user1', 'user2'] }
      );
    });
  });
});