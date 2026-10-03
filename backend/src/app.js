const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const apiRoutes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const securityHeaders = require('./middleware/securityHeaders');

const app = express();

// Disable X-Powered-By header to prevent technology disclosure
app.disable('x-powered-by');

// Apply security headers
app.use(securityHeaders);

// Enable CORS with configured origin
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      // In development, allow localhost variations
      if (config.env === 'development') {
        return callback(null, true);
      }
      if (origin === config.clientUrl) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount API routes under /api
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Academic Lab Management System API',
    version: '1.0.0',
    documentation: '/api/health',
    status: 'online'
  });
});

// 404 Handler
app.use(notFound);

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
