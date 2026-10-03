const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progress.controller');
const { authenticate, authorize, requirePasswordChangeCompleted } = require('../middleware/auth');
const { validateObjectIdParam } = require('../validators');

router.use(authenticate);
router.use(requirePasswordChangeCompleted);

// Student retrieves overall progress across all assigned laboratories
router.get(
  '/student',
  authorize('STUDENT'),
  progressController.getStudentOverallProgress
);

// Student retrieves detailed progress for a specific enrolled laboratory
router.get(
  '/student/lab/:labId',
  authorize('STUDENT'),
  validateObjectIdParam('labId'),
  progressController.getStudentLabProgress
);

// Faculty & Admin retrieves cohort progress for a laboratory
router.get(
  '/lab/:labId',
  authorize('ADMIN_HOD', 'TEACHER'),
  validateObjectIdParam('labId'),
  progressController.getLabCohortProgress
);

// Faculty & Admin retrieves detailed progress for a specific student in a laboratory
router.get(
  '/lab/:labId/student/:studentId',
  authorize('ADMIN_HOD', 'TEACHER'),
  validateObjectIdParam('labId'),
  validateObjectIdParam('studentId'),
  progressController.getStudentProgressForTeacher
);

module.exports = router;
