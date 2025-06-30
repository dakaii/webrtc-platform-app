import express, { Application } from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './middleware/logger.middleware';
import { errorHandler } from './middleware/error.middleware';
import routes from './routes';

export function createApp(): Application {
  const app = express();

  // Middleware
  app.use(cors(config.cors));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(logger);

  // Routes
  app.use('/api', routes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'LiveKit Application',
      version: '1.0.0',
      description: 'Real-time communication application powered by LiveKit',
      endpoints: {
        health: '/api/health',
        auth: {
          generateToken: 'POST /api/auth/token',
          validateToken: 'POST /api/auth/validate',
        },
        rooms: {
          create: 'POST /api/rooms',
          list: 'GET /api/rooms',
          get: 'GET /api/rooms/:roomName',
          update: 'PATCH /api/rooms/:roomName',
          delete: 'DELETE /api/rooms/:roomName',
          listParticipants: 'GET /api/rooms/:roomName/participants',
          getParticipant: 'GET /api/rooms/:roomName/participants/:identity',
          removeParticipant: 'DELETE /api/rooms/:roomName/participants/:identity',
          sendData: 'POST /api/rooms/:roomName/data',
        },
        webhooks: {
          livekit: 'POST /api/webhooks/livekit',
          events: 'GET /api/webhooks/events',
        },
      },
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.url}`,
      statusCode: 404,
      timestamp: new Date().toISOString(),
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}