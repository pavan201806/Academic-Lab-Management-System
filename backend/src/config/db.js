const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

// Disable command buffering globally so queries fail fast instead of hanging on timeouts when disconnected
mongoose.set('bufferCommands', false);

let listenersAttached = false;

const attachConnectionListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('connected', () => {
    logger.info(`[Database] MongoDB connection established: ${mongoose.connection.host}`);
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`[Database] MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('[Database] MongoDB connection disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('[Database] MongoDB connection re-established');
  });
};

const connectDB = async (retries = 3, delayMs = 2000) => {
  if (!config.mongoUri) {
    logger.warn('[Database] MONGODB_URI is not defined in environment variables. Database connection skipped.');
    return { connected: false, message: 'MONGODB_URI not configured' };
  }

  attachConnectionListeners();

  if (mongoose.connection.readyState === 1) {
    return { connected: true, host: mongoose.connection.host };
  }

  const connectionOptions = {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 0,
    retryWrites: true,
    retryReads: true
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(config.mongoUri, connectionOptions);
      logger.info(`[Database] MongoDB connected successfully: ${conn.connection.host}`);
      return { connected: true, host: conn.connection.host };
    } catch (error) {
      logger.error(`[Database] MongoDB connection attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt < retries) {
        logger.info(`[Database] Retrying MongoDB connection in ${delayMs / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        return { connected: false, error: error.message };
      }
    }
  }
};

module.exports = connectDB;

