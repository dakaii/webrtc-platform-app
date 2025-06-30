import { createApp } from './app';
import { config, validateConfig } from './config';

async function startServer() {
  try {
    // Validate configuration
    validateConfig();

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(config.server.port, () => {
      console.log(`
🚀 LiveKit Application Started Successfully!
===========================================
Environment: ${config.server.nodeEnv}
Port: ${config.server.port}
LiveKit Host: ${config.livekit.host}
===========================================
API Documentation: http://localhost:${config.server.port}
Health Check: http://localhost:${config.server.port}/api/health
===========================================
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
      console.log('\n🛑 Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    // Handle unhandled errors
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();