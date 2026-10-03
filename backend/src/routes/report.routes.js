const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate, authorize, requirePasswordChangeCompleted } = require('../middleware/auth');
const { validateObjectIdParam, validateReportFilters } = require('../validators');

router.use(authenticate);
router.use(requirePasswordChangeCompleted);

// Student Report
router.get(
  '/student/:studentId',
  authorize('ADMIN_HOD', 'TEACHER', 'STUDENT'),
  validateObjectIdParam('studentId'),
  validateReportFilters,
  reportController.getStudentReport
);

// Section Report
router.get(
  '/section/:sectionId',
  authorize('ADMIN_HOD', 'TEACHER'),
  validateObjectIdParam('sectionId'),
  validateReportFilters,
  reportController.getSectionReport
);

// Lab Report
router.get(
  '/lab/:labId',
  authorize('ADMIN_HOD', 'TEACHER'),
  validateObjectIdParam('labId'),
  validateReportFilters,
  reportController.getLabReport
);

// Experiment Report
router.get(
  '/experiment/:experimentId',
  authorize('ADMIN_HOD', 'TEACHER'),
  validateObjectIdParam('experimentId'),
  validateReportFilters,
  reportController.getExperimentReport
);

// Marks Report (aggregated breakdown)
router.get(
  '/marks',
  authorize('ADMIN_HOD', 'TEACHER', 'STUDENT'),
  validateReportFilters,
  reportController.getMarksReport
);

// Viva Report
router.get(
  '/viva',
  authorize('ADMIN_HOD', 'TEACHER', 'STUDENT'),
  validateReportFilters,
  reportController.getVivaReport
);

// Progress Report
router.get(
  '/progress',
  authorize('ADMIN_HOD', 'TEACHER', 'STUDENT'),
  validateReportFilters,
  reportController.getProgressReport
);

module.exports = router;
