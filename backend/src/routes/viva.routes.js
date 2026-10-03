const express = require('express');
const router = express.Router();
const vivaController = require('../controllers/viva.controller');
const { authenticate, authorize, requirePasswordChangeCompleted } = require('../middleware/auth');
const { validateObjectIdParam, validateCreateVivaInput } = require('../validators');

router.use(authenticate);
router.use(requirePasswordChangeCompleted);

// List eligible students for viva evaluation in an experiment (Teacher / Admin)
router.get(
  '/experiment/:experimentId/students',
  authorize('ADMIN_HOD', 'TEACHER'),
  validateObjectIdParam('experimentId'),
  vivaController.getEligibleStudents
);

// Submit initial viva evaluation (Teacher / Admin)
router.post(
  '/',
  authorize('ADMIN_HOD', 'TEACHER'),
  validateCreateVivaInput,
  vivaController.createViva
);

// Student gets their own viva details & history
router.get(
  '/experiment/:experimentId/my-viva',
  authorize('STUDENT'),
  validateObjectIdParam('experimentId'),
  vivaController.getStudentViva
);

// Faculty gets specific student's viva history for an experiment
router.get(
  '/student/:studentId/experiment/:experimentId',
  authorize('ADMIN_HOD', 'TEACHER'),
  validateObjectIdParam('studentId'),
  validateObjectIdParam('experimentId'),
  vivaController.getStudentVivaForFaculty
);

// Lab-wide viva evaluations ledger (Teacher / Admin)
router.get(
  '/lab/:labId',
  authorize('ADMIN_HOD', 'TEACHER'),
  validateObjectIdParam('labId'),
  vivaController.getLabVivaEvaluations
);

// Get single viva evaluation record
router.get(
  '/:id',
  authorize('ADMIN_HOD', 'TEACHER', 'STUDENT'),
  validateObjectIdParam('id'),
  vivaController.getVivaById
);

module.exports = router;
