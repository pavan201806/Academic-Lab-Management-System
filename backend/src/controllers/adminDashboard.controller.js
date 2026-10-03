const adminDashboardService = require('../services/adminDashboardService');

const getFullDashboard = async (req, res, next) => {
  try {
    const data = await adminDashboardService.getFullDashboard(req.query);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (err) {
    next(err);
  }
};

const getStatistics = async (req, res, next) => {
  try {
    const data = await adminDashboardService.getStatistics(req.query);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (err) {
    next(err);
  }
};

const getStudentsOverview = async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const data = await adminDashboardService.getStudentsOverview(req.query, limit);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (err) {
    next(err);
  }
};

const getTeachersOverview = async (req, res, next) => {
  try {
    const data = await adminDashboardService.getTeachersOverview(req.query);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (err) {
    next(err);
  }
};

const getLabsOverview = async (req, res, next) => {
  try {
    const data = await adminDashboardService.getLabsOverview(req.query);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (err) {
    next(err);
  }
};

const getSectionsOverview = async (req, res, next) => {
  try {
    const data = await adminDashboardService.getSectionsOverview(req.query);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (err) {
    next(err);
  }
};

const getActivityFeed = async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 15;
    const data = await adminDashboardService.getActivityFeed(limit);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (err) {
    next(err);
  }
};

const getPerformanceOverview = async (req, res, next) => {
  try {
    const data = await adminDashboardService.getPerformanceOverview(req.query);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getFullDashboard,
  getStatistics,
  getStudentsOverview,
  getTeachersOverview,
  getLabsOverview,
  getSectionsOverview,
  getActivityFeed,
  getPerformanceOverview
};
