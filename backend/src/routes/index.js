const express = require('express');
const router = express.Router();
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const sectionRoutes = require('./section.routes');
const labRoutes = require('./lab.routes');
const labAssignmentRoutes = require('./labAssignment.routes');
const experimentRoutes = require('./experiment.routes');
const submissionRoutes = require('./submission.routes');
const testCaseRoutes = require('./testCase.routes');
const evaluationRoutes = require('./evaluation.routes');
const vivaRoutes = require('./viva.routes');
const reevaluationRoutes = require('./reevaluation.routes');
const notificationRoutes = require('./notification.routes');
const progressRoutes = require('./progress.routes');

// Mount routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/sections', sectionRoutes);
router.use('/labs', labRoutes);
router.use('/lab-assignments', labAssignmentRoutes);
router.use('/experiments', experimentRoutes);
router.use('/submissions', submissionRoutes);
router.use('/test-cases', testCaseRoutes);
router.use('/evaluations', evaluationRoutes);
router.use('/viva', vivaRoutes);
router.use('/reevaluations', reevaluationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/progress', progressRoutes);

module.exports = router;
