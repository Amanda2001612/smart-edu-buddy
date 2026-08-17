/**
 * Application Entry Point
 * Initializes and starts the Express server
 */

const app = require('./src/app');
const { config, validateConfig } = require('./src/config/config');
const Logger = require('./src/utils/logger');

const logger = new Logger('Server');

// Validate configuration
try {
  validateConfig();
} catch (error) {
  logger.error('Configuration Validation Error', error.message);
  process.exit(1);
}

// Start server
const server = app.listen(config.app.port, config.app.host, () => {
  logger.info(
    `${config.app.name} is running on port ${config.app.port}`,
    { host: config.app.host, env: config.app.env }
  );
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at Promise', { reason, promise: promise.toString() });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = server;