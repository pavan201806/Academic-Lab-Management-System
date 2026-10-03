const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/evaluation.controller');
const { authenticate, authorize, requirePasswordChangeCompleted } = require('../middleware/auth');
const { validateObjectIdParam } = require('../validators');

router.use(authenticate);
router.use(requirePasswordChangeCompleted);

// Student evaluations & highest score for an experiment
router.get(
  '/experiment/:experimentId/my',
  authorize('STUDENT'),
  validateObjectIdParam('experimentId'),
  evaluationController.getStudentEvaluations
);

// Lab evaluation ledger (Faculty / Admin view)
router.get(
  '/lab/:labId',
  authorize('ADMIN_HOD', 'TEACHER'),
  validateObjectIdParam('labId'),
  evaluationController.getLabEvaluations
);

// Specific evaluation detail
router.get(
  '/:id',
  authorize('ADMIN_HOD', 'TEACHER', 'STUDENT'),
  validateObjectIdParam('id'),
  evaluationController.getEvaluationById
);

module.exports = router;
