const express = require('express');
const router = express.Router();
const sectionController = require('../controllers/section.controller');
const { authenticate, authorize, requirePasswordChangeCompleted } = require('../middleware/auth');
const {
  validateObjectIdParam,
  validateSectionInput,
  validateAssignStudentInput
} = require('../validators');

router.use(authenticate);
router.use(requirePasswordChangeCompleted);

// Read endpoints
router.get('/', authorize('ADMIN_HOD', 'TEACHER', 'STUDENT'), sectionController.getSections);
router.get('/:id', authorize('ADMIN_HOD', 'TEACHER', 'STUDENT'), validateObjectIdParam('id'), sectionController.getSectionById);
router.get('/:sectionCode/students', authorize('ADMIN_HOD', 'TEACHER'), sectionController.getSectionStudents);

// Admin-only write operations
router.post('/', authorize('ADMIN_HOD'), validateSectionInput, sectionController.createSection);
router.put('/:id', authorize('ADMIN_HOD'), validateObjectIdParam('id'), validateSectionInput, sectionController.updateSection);
router.patch('/:id/status', authorize('ADMIN_HOD'), validateObjectIdParam('id'), sectionController.toggleActive);
router.post('/assign-student', authorize('ADMIN_HOD'), validateAssignStudentInput, sectionController.assignStudent);

module.exports = router;

