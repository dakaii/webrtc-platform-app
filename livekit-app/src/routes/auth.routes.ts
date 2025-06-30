import { Router, Request, Response, NextFunction } from 'express';
import { livekitService } from '../services/livekit.service';
import { validateTokenRequest } from '../middleware/validation.middleware';
import { AppError } from '../middleware/error.middleware';
import { ApiResponse, TokenOptions } from '../types';

const router = Router();

/**
 * Generate access token for a participant
 * POST /api/auth/token
 */
router.post('/token', validateTokenRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenOptions: TokenOptions = {
      identity: req.body.identity,
      name: req.body.name,
      roomName: req.body.roomName,
      metadata: req.body.metadata,
      permissions: req.body.permissions,
      validFor: req.body.validFor,
    };

    const token = await livekitService.generateToken(tokenOptions);

    const response: ApiResponse = {
      success: true,
      data: { token },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(new AppError(
      error instanceof Error ? error.message : 'Failed to generate token',
      500
    ));
  }
});

/**
 * Validate access token
 * POST /api/auth/validate
 */
router.post('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;

    if (!token) {
      return next(new AppError('Token is required', 400));
    }

    // Note: In a real application, you would validate the token here
    // For now, we'll just return success
    const response: ApiResponse = {
      success: true,
      data: { valid: true },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(new AppError(
      error instanceof Error ? error.message : 'Failed to validate token',
      500
    ));
  }
});

export default router;