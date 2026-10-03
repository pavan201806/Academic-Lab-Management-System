const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize, requirePasswordChangeCompleted } = require('../middleware/auth');
const {
  validateObjectIdParam,
  validateCreateUserInput
} = require('../validators');

// All user management routes require authentication, completed password change, and ADMIN_HOD role
router.use(authenticate);
router.use(requirePasswordChangeCompleted);

// Read-only user queries (Admin / Teachers for directory purposes)
router.get('/', authorize('ADMIN_HOD', 'TEACHER'), userController.getUsers);
router.get('/:id', authorize('ADMIN_HOD', 'TEACHER'), validateObjectIdParam('id'), userController.getUserById);

// Admin-only write operations
router.post('/teachers', authorize('ADMIN_HOD'), validateCreateUserInput, userController.createTeacher);
router.post('/students', authorize('ADMIN_HOD'), validateCreateUserInput, userController.createStudent);
router.put('/:id', authorize('ADMIN_HOD'), validateObjectIdParam('id'), userController.updateUser);
router.patch('/:id/reset-password', authorize('ADMIN_HOD'), validateObjectIdParam('id'), userController.resetPassword);
router.patch('/:id/status', authorize('ADMIN_HOD'), validateObjectIdParam('id'), userController.toggleActive);

module.exports = router;
