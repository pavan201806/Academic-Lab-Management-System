const express = require('express');
const router = express.Router();
const reevaluationController = require('../controllers/reevaluation.controller');
const { authenticate, authorize, requirePasswordChangeCompleted } = require('../middleware/auth');
const {
  validateObjectIdParam,
  validateCreateReevaluationRequestInput,
  validateProcessReevaluationInput
} = require('../validators');

router.use(authenticate);
router.use(requirePasswordChangeCompleted);

// Student requests a re-evaluation
router.post(
  '/request',
  authorize('STUDENT'),
  validateCreateReevaluationRequestInput,
  reevaluationController.requestReevaluation
);

// Student retrieves their own re-evaluation request for an experiment
router.get(
  '/experiment/:experimentId/my-request',
  authorize('STUDENT'),
  validateObjectIdParam('experimentId'),
  reevaluationController.getStudentRequest
);

// Lab-wide re-evaluation requests list (Teacher / Admin)
router.get(
  '/lab/:labId',
  authorize('ADMIN_HOD', 'TEACHER'),
  validateObjectIdParam('labId'),
  reevaluationController.getLabRequests
);

// Get single re-evaluation request by ID
router.get(
  '/:id',
  authorize('ADMIN_HOD', 'TEACHER', 'STUDENT'),
  validateObjectIdParam('id'),
  reevaluationController.getRequestById
);

// Faculty processes (Approves & re-evaluates or Rejects) a re-evaluation request
router.post(
  '/:id/process',
  authorize('ADMIN_HOD', 'TEACHER'),
  validateObjectIdParam('id'),
  validateProcessReevaluationInput,
  reevaluationController.processRequest
);

module.exports = router;
