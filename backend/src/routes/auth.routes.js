const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  validateLoginInput,
  validateChangePasswordInput
} = require('../validators');

// Public endpoints
router.post('/login', authLimiter, validateLoginInput, authController.login);
router.post('/logout', authController.logout);

// Protected endpoints
router.post(
  '/change-password',
  authenticate,
  authLimiter,
  validateChangePasswordInput,
  authController.changePassword
);
router.get('/me', authenticate, authController.getMe);

module.exports = router;

