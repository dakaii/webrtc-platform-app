import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

export const validateRoomName = (req: Request, res: Response, next: NextFunction): void => {
  const roomName = req.params.roomName || req.body.roomName;
  
  if (!roomName) {
    return next(new AppError('Room name is required', 400));
  }

  // Room name validation rules
  const roomNameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!roomNameRegex.test(roomName)) {
    return next(new AppError('Room name can only contain letters, numbers, hyphens, and underscores', 400));
  }

  if (roomName.length < 3 || roomName.length > 64) {
    return next(new AppError('Room name must be between 3 and 64 characters', 400));
  }

  next();
};

export const validateIdentity = (req: Request, res: Response, next: NextFunction): void => {
  const identity = req.params.identity || req.body.identity;
  
  if (!identity) {
    return next(new AppError('Identity is required', 400));
  }

  if (identity.length < 1 || identity.length > 64) {
    return next(new AppError('Identity must be between 1 and 64 characters', 400));
  }

  next();
};

export const validateTokenRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { identity, roomName } = req.body;

  if (!identity) {
    return next(new AppError('Identity is required', 400));
  }

  if (!roomName) {
    return next(new AppError('Room name is required', 400));
  }

  // Validate identity
  if (identity.length < 1 || identity.length > 64) {
    return next(new AppError('Identity must be between 1 and 64 characters', 400));
  }

  // Validate room name
  const roomNameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!roomNameRegex.test(roomName)) {
    return next(new AppError('Room name can only contain letters, numbers, hyphens, and underscores', 400));
  }

  if (roomName.length < 3 || roomName.length > 64) {
    return next(new AppError('Room name must be between 3 and 64 characters', 400));
  }

  next();
};