const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const {
  validateLoginInput,
  validateChangePasswordInput
} = require('../validators');

// Public endpoints
router.post('/login', validateLoginInput, authController.login);
router.post('/logout', authController.logout);

// Protected endpoints
router.post(
  '/change-password',
  authenticate,
  validateChangePasswordInput,
  authController.changePassword
);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
