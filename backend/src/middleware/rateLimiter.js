const AppError = require('../utils/appError');

/**
 * In-memory sliding window rate limiter
 */
class MemoryRateLimiter {
  constructor(windowMs = 60 * 1000, maxRequests = 100, message = 'Too many requests, please try again later.') {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.message = message;
    this.requests = new Map();
  }

  middleware() {
    return (req, res, next) => {
      // In test mode, allow tests to run without artificial throttling unless explicitly simulated
      if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
        return next();
      }

      const key = req.ip || req.connection?.remoteAddress || 'client';
      const now = Date.now();
      const clientRecord = this.requests.get(key) || { count: 0, resetTime: now + this.windowMs };

      if (now > clientRecord.resetTime) {
        clientRecord.count = 1;
        clientRecord.resetTime = now + this.windowMs;
      } else {
        clientRecord.count += 1;
      }

      this.requests.set(key, clientRecord);

      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - clientRecord.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(clientRecord.resetTime / 1000));

      if (clientRecord.count > this.maxRequests) {
        return next(new AppError(this.message, 429));
      }

      next();
    };
  }

  reset() {
    this.requests.clear();
  }
}

const authLimiter = new MemoryRateLimiter(
  15 * 60 * 1000,
  100,
  'Too many login attempts. Please try again after 15 minutes.'
).middleware();

const codeExecutionLimiter = new MemoryRateLimiter(
  60 * 1000,
  60,
  'Code execution rate limit exceeded. Please wait a moment before running or submitting again.'
).middleware();

const uploadLimiter = new MemoryRateLimiter(
  60 * 1000,
  30,
  'Upload rate limit exceeded. Please wait a moment before uploading another PDF file.'
).middleware();

module.exports = {
  MemoryRateLimiter,
  authLimiter,
  codeExecutionLimiter,
  uploadLimiter
};
