const mongoose = require('mongoose');
const config = require('./env');

const connectDB = async () => {
  if (!config.mongoUri) {
    console.warn('[Database] MONGODB_URI is not defined in environment variables. Database connection skipped.');
    return { connected: false, message: 'MONGODB_URI not configured' };
  }

  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[Database] MongoDB connected: ${conn.connection.host}`);
    return { connected: true, host: conn.connection.host };
  } catch (error) {
    console.error(`[Database] MongoDB connection error: ${error.message}`);
    return { connected: false, error: error.message };
  }
};

module.exports = connectDB;
