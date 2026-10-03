const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submission.controller');
const { authenticate, authorize, requirePasswordChangeCompleted } = require('../middleware/auth');
const {
  validateObjectIdParam,
  validateRunInput,
  validateSubmitInput
} = require('../validators');

router.use(authenticate);
router.use(requirePasswordChangeCompleted);

// Student Code Execution & Official Submission
router.post(
  '/run',
  authorize('STUDENT'),
  validateRunInput,
  submissionController.runCode
);

router.post(
  '/submit',
  authorize('STUDENT'),
  validateSubmitInput,
  submissionController.submitCode
);

// Student's Submissions History for an Experiment
router.get(
  '/experiment/:experimentId',
  authorize('STUDENT'),
  validateObjectIdParam('experimentId'),
  submissionController.getStudentSubmissions
);

// Faculty Submissions Ledger for a Lab
router.get(
  '/lab/:labId',
  authorize('ADMIN_HOD', 'TEACHER'),
  validateObjectIdParam('labId'),
  submissionController.getTeacherSubmissionsForLab
);

// Specific Submission Details
router.get(
  '/:id',
  authorize('ADMIN_HOD', 'TEACHER', 'STUDENT'),
  validateObjectIdParam('id'),
  submissionController.getSubmissionById
);

module.exports = router;
