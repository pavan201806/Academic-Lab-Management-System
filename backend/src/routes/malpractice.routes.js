const express = require('express');
const router = express.Router();
const malpracticeController = require('../controllers/malpractice.controller');
const { authenticate, requirePasswordChangeCompleted } = require('../middleware/auth');
const {
  validateRecordEventInput,
  validateGetEventsQuery
} = require('../validators/malpractice.validator');

// All malpractice routes require active authentication & completed password change
router.use(authenticate);
router.use(requirePasswordChangeCompleted);

// Record a new malpractice event (server uses authenticated student identity)
router.post('/events', validateRecordEventInput, malpracticeController.recordEvent);

// Query events (scoped to student for STUDENT role, filterable for TEACHER / ADMIN_HOD)
router.get('/events', validateGetEventsQuery, malpracticeController.getEvents);

// Summary statistics for malpractice occurrences
router.get('/summary', malpracticeController.getEventSummary);

module.exports = router;
