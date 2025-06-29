import { Request, Response, NextFunction } from 'express';
import {
  validateRoomName,
  validateIdentity,
  validateTokenRequest,
} from '../../src/middleware/validation.middleware';
import { AppError } from '../../src/middleware/error.middleware';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      params: {},
      body: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('validateRoomName', () => {
    it('should call next() with valid room name in params', () => {
      mockRequest.params = { roomName: 'valid-room-123' };

      validateRoomName(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() with valid room name in body', () => {
      mockRequest.body = { roomName: 'valid_room' };

      validateRoomName(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return error when room name is missing', () => {
      validateRoomName(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Room name is required',
          statusCode: 400,
        })
      );
    });

    it('should return error when room name contains invalid characters', () => {
      mockRequest.params = { roomName: 'room with spaces!' };

      validateRoomName(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Room name can only contain letters, numbers, hyphens, and underscores',
          statusCode: 400,
        })
      );
    });

    it('should return error when room name is too short', () => {
      mockRequest.params = { roomName: 'ab' };

      validateRoomName(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Room name must be between 3 and 64 characters',
          statusCode: 400,
        })
      );
    });

    it('should return error when room name is too long', () => {
      mockRequest.params = { roomName: 'a'.repeat(65) };

      validateRoomName(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Room name must be between 3 and 64 characters',
          statusCode: 400,
        })
      );
    });
  });

  describe('validateIdentity', () => {
    it('should call next() with valid identity in params', () => {
      mockRequest.params = { identity: 'user123' };

      validateIdentity(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() with valid identity in body', () => {
      mockRequest.body = { identity: 'user@example.com' };

      validateIdentity(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return error when identity is missing', () => {
      validateIdentity(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Identity is required',
          statusCode: 400,
        })
      );
    });

    it('should return error when identity is empty', () => {
      mockRequest.params = { identity: '' };

      validateIdentity(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Identity is required',
          statusCode: 400,
        })
      );
    });

    it('should return error when identity is too long', () => {
      mockRequest.params = { identity: 'a'.repeat(65) };

      validateIdentity(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Identity must be between 1 and 64 characters',
          statusCode: 400,
        })
      );
    });
  });

  describe('validateTokenRequest', () => {
    it('should call next() with valid token request', () => {
      mockRequest.body = {
        identity: 'user123',
        roomName: 'valid-room',
      };

      validateTokenRequest(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return error when identity is missing', () => {
      mockRequest.body = {
        roomName: 'valid-room',
      };

      validateTokenRequest(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Identity is required',
          statusCode: 400,
        })
      );
    });

    it('should return error when room name is missing', () => {
      mockRequest.body = {
        identity: 'user123',
      };

      validateTokenRequest(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Room name is required',
          statusCode: 400,
        })
      );
    });

    it('should return error when identity is too long', () => {
      mockRequest.body = {
        identity: 'a'.repeat(65),
        roomName: 'valid-room',
      };

      validateTokenRequest(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Identity must be between 1 and 64 characters',
          statusCode: 400,
        })
      );
    });

    it('should return error when room name contains invalid characters', () => {
      mockRequest.body = {
        identity: 'user123',
        roomName: 'room@invalid!',
      };

      validateTokenRequest(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Room name can only contain letters, numbers, hyphens, and underscores',
          statusCode: 400,
        })
      );
    });

    it('should return error when room name is too short', () => {
      mockRequest.body = {
        identity: 'user123',
        roomName: 'ab',
      };

      validateTokenRequest(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Room name must be between 3 and 64 characters',
          statusCode: 400,
        })
      );
    });

    it('should accept all valid characters in room name', () => {
      const validRoomNames = [
        'abc123',
        'room-name',
        'room_name',
        'RoomName123',
        'test-room_123',
        '123-room',
      ];

      validRoomNames.forEach((roomName) => {
        mockRequest.body = {
          identity: 'user123',
          roomName,
        };

        mockNext = jest.fn();

        validateTokenRequest(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalledWith();
      });
    });
  });
});