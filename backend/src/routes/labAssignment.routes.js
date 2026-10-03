const express = require('express');
const router = express.Router();
const labAssignmentController = require('../controllers/labAssignment.controller');
const { authenticate, authorize, requirePasswordChangeCompleted } = require('../middleware/auth');
const {
  validateObjectIdParam,
  validateLabAssignmentInput
} = require('../validators');

router.use(authenticate);
router.use(requirePasswordChangeCompleted);

// Read endpoints
router.get('/', authorize('ADMIN_HOD', 'TEACHER'), labAssignmentController.getAssignments);
router.get('/:id', authorize('ADMIN_HOD', 'TEACHER'), validateObjectIdParam('id'), labAssignmentController.getAssignmentById);
router.get('/lab/:labId', authorize('ADMIN_HOD', 'TEACHER'), validateObjectIdParam('labId'), labAssignmentController.getLabAssignments);
router.get('/teacher/:teacherId', authorize('ADMIN_HOD', 'TEACHER'), validateObjectIdParam('teacherId'), labAssignmentController.getTeacherAssignments);

// Admin-only write operations
router.post('/', authorize('ADMIN_HOD'), validateLabAssignmentInput, labAssignmentController.createAssignment);
router.patch('/:id/status', authorize('ADMIN_HOD'), validateObjectIdParam('id'), labAssignmentController.toggleActive);

module.exports = router;
