const express = require('express');
const router = express.Router();
const labController = require('../controllers/lab.controller');
const { authenticate, authorize, requirePasswordChangeCompleted } = require('../middleware/auth');
const {
  validateObjectIdParam,
  validateLabInput
} = require('../validators');

router.use(authenticate);
router.use(requirePasswordChangeCompleted);

// Role-aware assigned laboratories endpoint (accessible to ADMIN_HOD, TEACHER, STUDENT)
router.get('/assigned', authorize('ADMIN_HOD', 'TEACHER', 'STUDENT'), labController.getAssignedLabs);

// Role-aware laboratory details endpoint (verifies active assignment / cohort enrollment)
router.get('/:id', authorize('ADMIN_HOD', 'TEACHER', 'STUDENT'), validateObjectIdParam('id'), labController.getLabById);
router.get(
  '/:id/section/:sectionId',
  authorize('ADMIN_HOD', 'TEACHER', 'STUDENT'),
  validateObjectIdParam('id'),
  validateObjectIdParam('sectionId'),
  labController.getLabById
);

// Admin-only catalogue and management operations
router.get('/', authorize('ADMIN_HOD'), labController.getLabs);
router.get('/:id/deletion-status', authorize('ADMIN_HOD'), validateObjectIdParam('id'), labController.getLabDeletionStatus);
router.post('/', authorize('ADMIN_HOD'), validateLabInput, labController.createLab);
router.put('/:id', authorize('ADMIN_HOD'), validateObjectIdParam('id'), validateLabInput, labController.updateLab);
router.patch('/:id/status', authorize('ADMIN_HOD'), validateObjectIdParam('id'), labController.toggleActive);
router.delete('/:id', authorize('ADMIN_HOD'), validateObjectIdParam('id'), labController.deleteLab);

module.exports = router;

