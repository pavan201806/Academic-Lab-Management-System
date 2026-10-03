const express = require('express');
const router = express.Router();
const adminDashboardController = require('../controllers/adminDashboard.controller');
const { authenticate, authorize, requirePasswordChangeCompleted } = require('../middleware/auth');
const { validateDashboardFilters } = require('../validators');

router.use(authenticate);
router.use(requirePasswordChangeCompleted);
router.use(authorize('ADMIN_HOD'));

// Full Dashboard Aggregation
router.get('/', validateDashboardFilters, adminDashboardController.getFullDashboard);

// Modular Sub-routes
router.get('/statistics', validateDashboardFilters, adminDashboardController.getStatistics);
router.get('/students', validateDashboardFilters, adminDashboardController.getStudentsOverview);
router.get('/teachers', validateDashboardFilters, adminDashboardController.getTeachersOverview);
router.get('/labs', validateDashboardFilters, adminDashboardController.getLabsOverview);
router.get('/sections', validateDashboardFilters, adminDashboardController.getSectionsOverview);
router.get('/activity', adminDashboardController.getActivityFeed);
router.get('/performance', validateDashboardFilters, adminDashboardController.getPerformanceOverview);

module.exports = router;
