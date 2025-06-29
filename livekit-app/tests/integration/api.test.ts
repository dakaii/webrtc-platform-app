import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../src/app';
import { livekitService } from '../../src/services/livekit.service';

// Mock the LiveKit service
jest.mock('../../src/services/livekit.service', () => ({
  livekitService: {
    generateToken: jest.fn(),
    createRoom: jest.fn(),
    listRooms: jest.fn(),
    getRoom: jest.fn(),
    deleteRoom: jest.fn(),
    updateRoomMetadata: jest.fn(),
    listParticipants: jest.fn(),
    getParticipant: jest.fn(),
    removeParticipant: jest.fn(),
    sendData: jest.fn(),
  },
}));

describe('API Integration Tests', () => {
  let app: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'LiveKit Application');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Auth Endpoints', () => {
    describe('POST /api/auth/token', () => {
      it('should generate a token successfully', async () => {
        const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
        (livekitService.generateToken as jest.Mock).mockResolvedValue(mockToken);

        const response = await request(app)
          .post('/api/auth/token')
          .send({
            identity: 'test-user',
            roomName: 'test-room',
            name: 'Test User',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('token', mockToken);
      });

      it('should return 400 when identity is missing', async () => {
        const response = await request(app)
          .post('/api/auth/token')
          .send({
            roomName: 'test-room',
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.message).toContain('Identity is required');
      });

      it('should return 400 when room name is invalid', async () => {
        const response = await request(app)
          .post('/api/auth/token')
          .send({
            identity: 'test-user',
            roomName: 'test room!', // Invalid characters
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.message).toContain('Room name can only contain');
      });
    });

    describe('POST /api/auth/validate', () => {
      it('should validate a token', async () => {
        const response = await request(app)
          .post('/api/auth/validate')
          .send({
            token: 'some-jwt-token',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('valid', true);
      });

      it('should return 400 when token is missing', async () => {
        const response = await request(app)
          .post('/api/auth/validate')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.message).toContain('Token is required');
      });
    });
  });

  describe('Room Endpoints', () => {
    describe('POST /api/rooms', () => {
      it('should create a room successfully', async () => {
        const mockRoom = {
          sid: 'RM_abc123',
          name: 'test-room',
          emptyTimeout: 300,
          maxParticipants: 50,
        };
        (livekitService.createRoom as jest.Mock).mockResolvedValue(mockRoom);

        const response = await request(app)
          .post('/api/rooms')
          .send({
            roomName: 'test-room',
            maxParticipants: 10,
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toEqual(mockRoom);
      });

      it('should return 400 when room name is missing', async () => {
        const response = await request(app)
          .post('/api/rooms')
          .send({
            maxParticipants: 10,
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Room name is required');
      });
    });

    describe('GET /api/rooms', () => {
      it('should list all rooms', async () => {
        const mockRooms = [
          { sid: 'RM_abc123', name: 'room1' },
          { sid: 'RM_def456', name: 'room2' },
        ];
        (livekitService.listRooms as jest.Mock).mockResolvedValue(mockRooms);

        const response = await request(app).get('/api/rooms');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toEqual(mockRooms);
      });

      it('should filter rooms by names', async () => {
        const mockRooms = [{ sid: 'RM_abc123', name: 'room1' }];
        (livekitService.listRooms as jest.Mock).mockResolvedValue(mockRooms);

        const response = await request(app).get('/api/rooms?names=room1,room2');

        expect(response.status).toBe(200);
        expect(livekitService.listRooms).toHaveBeenCalledWith(['room1', 'room2']);
      });
    });

    describe('GET /api/rooms/:roomName', () => {
      it('should get a room by name', async () => {
        const mockRoom = { sid: 'RM_abc123', name: 'test-room' };
        (livekitService.getRoom as jest.Mock).mockResolvedValue(mockRoom);

        const response = await request(app).get('/api/rooms/test-room');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toEqual(mockRoom);
      });

      it('should return 404 when room not found', async () => {
        (livekitService.getRoom as jest.Mock).mockResolvedValue(null);

        const response = await request(app).get('/api/rooms/non-existent');

        expect(response.status).toBe(404);
        expect(response.body.message).toContain('Room not found');
      });
    });

    describe('DELETE /api/rooms/:roomName', () => {
      it('should delete a room successfully', async () => {
        (livekitService.deleteRoom as jest.Mock).mockResolvedValue(undefined);

        const response = await request(app).delete('/api/rooms/test-room');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.message).toContain('Room deleted successfully');
      });
    });

    describe('PATCH /api/rooms/:roomName', () => {
      it('should update room metadata', async () => {
        const mockRoom = { 
          sid: 'RM_abc123', 
          name: 'test-room',
          metadata: '{"updated":true}',
        };
        (livekitService.updateRoomMetadata as jest.Mock).mockResolvedValue(mockRoom);

        const response = await request(app)
          .patch('/api/rooms/test-room')
          .send({
            metadata: '{"updated":true}',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toEqual(mockRoom);
      });

      it('should return 400 when metadata is missing', async () => {
        const response = await request(app)
          .patch('/api/rooms/test-room')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Metadata is required');
      });
    });
  });

  describe('Participant Endpoints', () => {
    describe('GET /api/rooms/:roomName/participants', () => {
      it('should list participants in a room', async () => {
        const mockParticipants = [
          { sid: 'PA_abc123', identity: 'user1' },
          { sid: 'PA_def456', identity: 'user2' },
        ];
        (livekitService.listParticipants as jest.Mock).mockResolvedValue(mockParticipants);

        const response = await request(app).get('/api/rooms/test-room/participants');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toEqual(mockParticipants);
      });
    });

    describe('GET /api/rooms/:roomName/participants/:identity', () => {
      it('should get a participant by identity', async () => {
        const mockParticipant = { sid: 'PA_abc123', identity: 'user1' };
        (livekitService.getParticipant as jest.Mock).mockResolvedValue(mockParticipant);

        const response = await request(app).get('/api/rooms/test-room/participants/user1');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toEqual(mockParticipant);
      });

      it('should return 404 when participant not found', async () => {
        (livekitService.getParticipant as jest.Mock).mockResolvedValue(null);

        const response = await request(app).get('/api/rooms/test-room/participants/non-existent');

        expect(response.status).toBe(404);
        expect(response.body.message).toContain('Participant not found');
      });
    });

    describe('DELETE /api/rooms/:roomName/participants/:identity', () => {
      it('should remove a participant successfully', async () => {
        (livekitService.removeParticipant as jest.Mock).mockResolvedValue(undefined);

        const response = await request(app).delete('/api/rooms/test-room/participants/user1');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.message).toContain('Participant removed successfully');
      });
    });
  });

  describe('Data Endpoints', () => {
    describe('POST /api/rooms/:roomName/data', () => {
      it('should send data to participants', async () => {
        (livekitService.sendData as jest.Mock).mockResolvedValue(undefined);

        const response = await request(app)
          .post('/api/rooms/test-room/data')
          .send({
            data: { message: 'Hello, world!' },
            kind: 'reliable',
            destinationIdentities: ['user1', 'user2'],
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.message).toContain('Data sent successfully');
      });

      it('should return 400 when data is missing', async () => {
        const response = await request(app)
          .post('/api/rooms/test-room/data')
          .send({
            kind: 'reliable',
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Data is required');
      });
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body.message).toContain('Cannot GET /api/unknown-route');
    });
  });
});