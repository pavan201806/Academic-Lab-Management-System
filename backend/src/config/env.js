const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_placeholder',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d'
};

module.exports = config;
