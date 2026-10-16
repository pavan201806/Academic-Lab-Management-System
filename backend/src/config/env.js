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
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Code Execution Engine Selection ('judge0' | 'docker')
  executionProvider: (process.env.EXECUTION_PROVIDER || 'judge0').toLowerCase(),
  runnerDockerImage: process.env.RUNNER_DOCKER_IMAGE || 'academic-lab-runner:latest',

  // Judge0 Provider Configuration
  judge0: {
    apiUrl: (process.env.JUDGE0_API_URL || 'https://ce.judge0.com').replace(/\/+$/, ''),
    authToken: process.env.JUDGE0_AUTH_TOKEN || '',
    rapidApiKey: process.env.JUDGE0_RAPIDAPI_KEY || '',
    rapidApiHost: process.env.JUDGE0_RAPIDAPI_HOST || '',
    timeoutMs: parseInt(process.env.JUDGE0_TIMEOUT_MS, 10) || 15000,
    pollIntervalMs: parseInt(process.env.JUDGE0_POLL_INTERVAL_MS, 10) || 350,
    languageOverrides: {
      C: process.env.JUDGE0_LANG_C ? parseInt(process.env.JUDGE0_LANG_C, 10) : undefined,
      'C++': process.env.JUDGE0_LANG_CPP ? parseInt(process.env.JUDGE0_LANG_CPP, 10) : undefined,
      Java: process.env.JUDGE0_LANG_JAVA ? parseInt(process.env.JUDGE0_LANG_JAVA, 10) : undefined,
      Python: process.env.JUDGE0_LANG_PYTHON ? parseInt(process.env.JUDGE0_LANG_PYTHON, 10) : undefined
    }
  }
};

module.exports = config;
