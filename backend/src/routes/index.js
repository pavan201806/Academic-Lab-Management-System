const express = require('express');
const router = express.Router();
const healthRoutes = require('./health.routes');

// Mount health endpoint
router.use('/health', healthRoutes);

// Additional routes defined in Architecture.md:
// router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
// router.use('/labs', labRoutes);
// router.use('/sections', sectionRoutes);
// router.use('/experiments', experimentRoutes);
// router.use('/submissions', submissionRoutes);
// router.use('/evaluations', evaluationRoutes);
// router.use('/viva', vivaRoutes);
// router.use('/notifications', notificationRoutes);
// router.use('/reports', reportRoutes);

module.exports = router;
