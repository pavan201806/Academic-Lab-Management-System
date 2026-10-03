const express = require('express');
const router = express.Router();
const testCaseController = require('../controllers/testCase.controller');
const { authenticate, authorize, requirePasswordChangeCompleted } = require('../middleware/auth');
const {
  validateObjectIdParam,
  validateCreateTestCaseInput,
  validateUpdateTestCaseInput,
  validateReorderTestCasesInput
} = require('../validators');

router.use(authenticate);
router.use(requirePasswordChangeCompleted);

// Read test cases for experiment (Students receive only public test cases; Teachers/Admins receive all)
router.get(
  '/experiment/:experimentId',
  authorize('ADMIN_HOD', 'TEACHER', 'STUDENT'),
  validateObjectIdParam('experimentId'),
  testCaseController.getTestCases
);

// Manage test cases (Faculty and Admins only)
router.post(
  '/',
  authorize('ADMIN_HOD', 'TEACHER'),
  validateCreateTestCaseInput,
  testCaseController.createTestCase
);

router.put(
  '/reorder/batch',
  authorize('ADMIN_HOD', 'TEACHER'),
  validateReorderTestCasesInput,
  testCaseController.reorderTestCases
);

router.put(
  '/:id',
  authorize('ADMIN_HOD', 'TEACHER'),
  validateObjectIdParam('id'),
  validateUpdateTestCaseInput,
  testCaseController.updateTestCase
);

router.patch(
  '/:id/status',
  authorize('ADMIN_HOD', 'TEACHER'),
  validateObjectIdParam('id'),
  testCaseController.deactivateTestCase
);

module.exports = router;
