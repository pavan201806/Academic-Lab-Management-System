const mongoose = require('mongoose');
const config = require('../config/env');
const { successResponse } = require('../utils/apiResponse');

const getHealthStatus = (req, res) => {
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const dbState = mongoose.connection.readyState;
  const dbStatus = dbStatusMap[dbState] || 'unknown';
  const isConnected = dbState === 1;

  const healthData = {
    service: 'Academic Lab Management System API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStatus,
      connected: isConnected
    }
  };

  return successResponse(res, healthData, 'API is running normally');
};

module.exports = {
  getHealthStatus
};
