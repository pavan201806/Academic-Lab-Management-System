const app = require('./app');
const config = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  // Start Express server
  const server = app.listen(config.port, () => {
    logger.info(`Server running in [${config.env}] mode on port ${config.port}`);
    logger.info(`Health check available at http://localhost:${config.port}/api/health`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Promise Rejection:', err.message);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err.message);
  });

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Shutting down server gracefully...');
    server.close(() => {
      logger.info('Server process terminated.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer();
