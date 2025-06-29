import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  const errorResponse: ErrorResponse = {
    error: err.name || 'Error',
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  };

  // Log error for debugging
  console.error(`[${new Date().toISOString()}] Error:`, {
    url: req.url,
    method: req.method,
    statusCode,
    message,
    stack: err.stack,
  });

  res.status(statusCode).json(errorResponse);
};