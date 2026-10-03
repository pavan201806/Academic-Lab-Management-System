const express = require('express');
const router = express.Router();
const experimentController = require('../controllers/experiment.controller');
const { authenticate, authorize, requirePasswordChangeCompleted } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const {
  validateObjectIdParam,
  validateExperimentInput,
  validateReopenInput,
  validateStatusUpdateInput,
  validateOrderUpdateInput,
  validateConfirmPdfInput
} = require('../validators');

router.use(authenticate);
router.use(requirePasswordChangeCompleted);

// Read endpoints (accessible to ADMIN_HOD, TEACHER, and STUDENT)
router.get('/', authorize('ADMIN_HOD', 'TEACHER', 'STUDENT'), experimentController.getExperiments);
router.get('/:id', authorize('ADMIN_HOD', 'TEACHER', 'STUDENT'), validateObjectIdParam('id'), experimentController.getExperimentById);

// Authoring & Lifecycle Operations (strictly ADMIN_HOD and TEACHER only)
router.post('/', authorize('ADMIN_HOD', 'TEACHER'), validateExperimentInput, experimentController.createExperiment);
router.put('/:id', authorize('ADMIN_HOD', 'TEACHER'), validateObjectIdParam('id'), validateExperimentInput, experimentController.updateExperiment);
router.post('/:id/publish', authorize('ADMIN_HOD', 'TEACHER'), validateObjectIdParam('id'), experimentController.publishExperiment);
router.post('/:id/schedule', authorize('ADMIN_HOD', 'TEACHER'), validateObjectIdParam('id'), experimentController.scheduleExperiment);
router.post('/:id/reopen', authorize('ADMIN_HOD', 'TEACHER'), validateObjectIdParam('id'), validateReopenInput, experimentController.reopenExperiment);
router.post('/:id/close', authorize('ADMIN_HOD', 'TEACHER'), validateObjectIdParam('id'), experimentController.closeExperiment);
router.put('/reorder/batch', authorize('ADMIN_HOD', 'TEACHER'), experimentController.reorderExperiments);
router.patch('/:id/status', authorize('ADMIN_HOD', 'TEACHER'), validateObjectIdParam('id'), experimentController.toggleActive);

// Phase 5 PDF Extraction & Confirmation Operations
router.post(
  '/extract-pdf',
  authorize('ADMIN_HOD', 'TEACHER'),
  upload.single('pdf'),
  handleUploadError,
  experimentController.extractPdfExperiments
);

router.post(
  '/confirm-pdf',
  authorize('ADMIN_HOD', 'TEACHER'),
  validateConfirmPdfInput,
  experimentController.confirmPdfExperiments
);

module.exports = router;
