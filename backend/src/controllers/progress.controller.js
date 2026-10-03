const progressService = require('../services/progressService');

const getStudentOverallProgress = async (req, res, next) => {
  try {
    const result = await progressService.getStudentOverallProgress(req.user);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getStudentLabProgress = async (req, res, next) => {
  try {
    const { labId } = req.params;
    const result = await progressService.getStudentLabProgress(req.user, labId);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getLabCohortProgress = async (req, res, next) => {
  try {
    const { labId } = req.params;
    const { sectionId } = req.query;
    const result = await progressService.getLabCohortProgress(req.user, labId, sectionId);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getStudentProgressForTeacher = async (req, res, next) => {
  try {
    const { labId, studentId } = req.params;
    const result = await progressService.getStudentProgressForTeacher(req.user, labId, studentId);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStudentOverallProgress,
  getStudentLabProgress,
  getLabCohortProgress,
  getStudentProgressForTeacher
};
