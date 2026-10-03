const express = require('express');
const router = express.Router();
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');

// Mount health and auth routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Additional routes defined in Architecture.md:
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
