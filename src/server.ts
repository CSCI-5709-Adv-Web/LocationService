import app from "./express-app";
import { logger } from "./utils/logger";
import { startResourceMonitoring } from "./utils/logger/performance";
import os from "os";

// Find an available port
const PORT = process.env.PORT || 5000;

// Log system information on startup
const logSystemInfo = () => {
  const numCPUs = os.cpus().length;
  const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2); // GB
  const freeMemory = (os.freemem() / 1024 / 1024 / 1024).toFixed(2); // GB
  
  logger.info({
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cpus: numCPUs,
      totalMemoryGB: totalMemory,
      freeMemoryGB: freeMemory,
      uptime: os.uptime()
    }
  }, `Starting Location Service with Node ${process.version} on ${os.platform()} (${numCPUs} CPUs, ${totalMemory}GB RAM)`);
};

// Start the server with error handling
const startServer = () => {
  try {
    // Log startup information
    logSystemInfo();
    
    // Start resource monitoring (every minute)
    startResourceMonitoring(60000);
    
    // Create server with proper error handling
    const server = app.listen(PORT, () => {
      logger.info(`Location Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Log level: ${logger.level}`);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use. Please choose a different port.`);
        process.exit(1);
      } else {
        logger.error({ err: error }, `Failed to start server: ${error.message}`);
        process.exit(1);
      }
    });
    
    // Graceful shutdown
    const shutdown = () => {
      logger.info('Shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed successfully');
        process.exit(0);
      });
      
      // Force close after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };
    
    // Listen for termination signals
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    logger.fatal({ err: error }, `Failed to start Location Service: ${error.message}`);
    process.exit(1);
  }
};

// Start the server
startServer();
