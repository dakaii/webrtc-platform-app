import { Request, Response, NextFunction } from 'express';

export const logger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  // Log request
  console.log(`[${timestamp}] ${req.method} ${req.url}`);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const completionTime = new Date().toISOString();
    
    console.log(
      `[${completionTime}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`
    );
  });

  next();
};