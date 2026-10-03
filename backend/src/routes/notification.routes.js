const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate, authorize, requirePasswordChangeCompleted } = require('../middleware/auth');
const { validateObjectIdParam, validateCreateNotificationInput } = require('../validators');

router.use(authenticate);
router.use(requirePasswordChangeCompleted);

// Create notification (Teacher or Admin)
router.post(
  '/',
  authorize('ADMIN_HOD', 'TEACHER'),
  validateCreateNotificationInput,
  notificationController.createNotification
);

// Get role-aware notifications feed (Student, Teacher, Admin)
router.get(
  '/',
  authorize('ADMIN_HOD', 'TEACHER', 'STUDENT'),
  notificationController.getNotifications
);

// Mark all targeted notifications as read (Student only)
router.patch(
  '/read-all',
  authorize('STUDENT'),
  notificationController.markAllAsRead
);

// Mark single notification as read (Student only)
router.patch(
  '/:id/read',
  authorize('STUDENT'),
  validateObjectIdParam('id'),
  notificationController.markAsRead
);

// Get single notification by ID
router.get(
  '/:id',
  authorize('ADMIN_HOD', 'TEACHER', 'STUDENT'),
  validateObjectIdParam('id'),
  notificationController.getNotificationById
);

// Delete notification (Teacher or Admin only, students receive 403)
router.delete(
  '/:id',
  authorize('ADMIN_HOD', 'TEACHER'),
  validateObjectIdParam('id'),
  notificationController.deleteNotification
);

module.exports = router;
