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

// Read endpoints
router.get('/', authorize('ADMIN_HOD', 'TEACHER', 'STUDENT'), labController.getLabs);
router.get('/:id', authorize('ADMIN_HOD', 'TEACHER', 'STUDENT'), validateObjectIdParam('id'), labController.getLabById);

// Admin-only write operations
router.post('/', authorize('ADMIN_HOD'), validateLabInput, labController.createLab);
router.put('/:id', authorize('ADMIN_HOD'), validateObjectIdParam('id'), validateLabInput, labController.updateLab);
router.patch('/:id/status', authorize('ADMIN_HOD'), validateObjectIdParam('id'), labController.toggleActive);

module.exports = router;
