import { Router, Request, Response, NextFunction } from 'express';
import { livekitService } from '../services/livekit.service';
import { validateRoomName, validateIdentity } from '../middleware/validation.middleware';
import { AppError } from '../middleware/error.middleware';
import { ApiResponse, CreateRoomOptions } from '../types';

const router = Router();

/**
 * Create a new room
 * POST /api/rooms
 */
router.post('/', validateRoomName, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roomOptions: CreateRoomOptions = {
      name: req.body.roomName,
      emptyTimeout: req.body.emptyTimeout,
      maxParticipants: req.body.maxParticipants,
      metadata: req.body.metadata,
      egressEnabled: req.body.egressEnabled,
      minPlayoutDelay: req.body.minPlayoutDelay,
      maxPlayoutDelay: req.body.maxPlayoutDelay,
    };

    const room = await livekitService.createRoom(roomOptions);

    const response: ApiResponse = {
      success: true,
      data: room,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    next(new AppError(
      error instanceof Error ? error.message : 'Failed to create room',
      500
    ));
  }
});

/**
 * List all rooms
 * GET /api/rooms
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const names = req.query.names ? (req.query.names as string).split(',') : undefined;
    const rooms = await livekitService.listRooms(names);

    const response: ApiResponse = {
      success: true,
      data: rooms,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(new AppError(
      error instanceof Error ? error.message : 'Failed to list rooms',
      500
    ));
  }
});

/**
 * Get room information
 * GET /api/rooms/:roomName
 */
router.get('/:roomName', validateRoomName, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const room = await livekitService.getRoom(req.params.roomName);

    if (!room) {
      return next(new AppError('Room not found', 404));
    }

    const response: ApiResponse = {
      success: true,
      data: room,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(new AppError(
      error instanceof Error ? error.message : 'Failed to get room',
      500
    ));
  }
});

/**
 * Update room metadata
 * PATCH /api/rooms/:roomName
 */
router.patch('/:roomName', validateRoomName, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { metadata } = req.body;

    if (!metadata) {
      return next(new AppError('Metadata is required', 400));
    }

    const room = await livekitService.updateRoomMetadata(req.params.roomName, metadata);

    const response: ApiResponse = {
      success: true,
      data: room,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(new AppError(
      error instanceof Error ? error.message : 'Failed to update room',
      500
    ));
  }
});

/**
 * Delete a room
 * DELETE /api/rooms/:roomName
 */
router.delete('/:roomName', validateRoomName, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await livekitService.deleteRoom(req.params.roomName);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Room deleted successfully' },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(new AppError(
      error instanceof Error ? error.message : 'Failed to delete room',
      500
    ));
  }
});

/**
 * List participants in a room
 * GET /api/rooms/:roomName/participants
 */
router.get('/:roomName/participants', validateRoomName, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const participants = await livekitService.listParticipants(req.params.roomName);

    const response: ApiResponse = {
      success: true,
      data: participants,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(new AppError(
      error instanceof Error ? error.message : 'Failed to list participants',
      500
    ));
  }
});

/**
 * Get participant information
 * GET /api/rooms/:roomName/participants/:identity
 */
router.get(
  '/:roomName/participants/:identity',
  validateRoomName,
  validateIdentity,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const participant = await livekitService.getParticipant(
        req.params.roomName,
        req.params.identity
      );

      if (!participant) {
        return next(new AppError('Participant not found', 404));
      }

      const response: ApiResponse = {
        success: true,
        data: participant,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      next(new AppError(
        error instanceof Error ? error.message : 'Failed to get participant',
        500
      ));
    }
  }
);

/**
 * Remove participant from room
 * DELETE /api/rooms/:roomName/participants/:identity
 */
router.delete(
  '/:roomName/participants/:identity',
  validateRoomName,
  validateIdentity,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await livekitService.removeParticipant(req.params.roomName, req.params.identity);

      const response: ApiResponse = {
        success: true,
        data: { message: 'Participant removed successfully' },
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      next(new AppError(
        error instanceof Error ? error.message : 'Failed to remove participant',
        500
      ));
    }
  }
);

/**
 * Send data to participants
 * POST /api/rooms/:roomName/data
 */
router.post('/:roomName/data', validateRoomName, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, kind = 'reliable', destinationIdentities } = req.body;

    if (!data) {
      return next(new AppError('Data is required', 400));
    }

    // Convert data to Uint8Array
    const uint8Data = new TextEncoder().encode(JSON.stringify(data));

    await livekitService.sendData(
      req.params.roomName,
      uint8Data,
      kind,
      destinationIdentities
    );

    const response: ApiResponse = {
      success: true,
      data: { message: 'Data sent successfully' },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(new AppError(
      error instanceof Error ? error.message : 'Failed to send data',
      500
    ));
  }
});

export default router;