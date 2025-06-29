import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // LiveKit Configuration
  livekit: {
    apiKey: process.env.LIVEKIT_API_KEY || 'devkey',
    apiSecret: process.env.LIVEKIT_API_SECRET || 'secret',
    host: process.env.LIVEKIT_HOST || 'ws://localhost:7880',
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },

  // JWT Configuration
  jwt: {
    issuer: process.env.JWT_ISSUER || 'livekit-app',
  },

  // Room Configuration
  room: {
    defaultEgressEnabled: process.env.DEFAULT_ROOM_EGRESS_ENABLED === 'true',
    defaultMaxParticipants: parseInt(process.env.DEFAULT_ROOM_MAX_PARTICIPANTS || '50', 10),
    defaultEmptyTimeout: parseInt(process.env.DEFAULT_ROOM_EMPTY_TIMEOUT || '300', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validate required configuration
export function validateConfig(): void {
  const requiredEnvVars = ['LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'];
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0 && config.server.nodeEnv === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}