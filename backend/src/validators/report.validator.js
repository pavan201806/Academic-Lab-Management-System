const mongoose = require('mongoose');
const AppError = require('../utils/appError');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Validator for report filter query parameters
 */
const validateReportFilters = (req, res, next) => {
  const { studentId, labId, sectionId, experimentId, semester, academicYear } = req.query;

  if (studentId && !isValidObjectId(studentId)) {
    return next(new AppError('Invalid student ID in report filter', 400));
  }

  if (labId && !isValidObjectId(labId)) {
    return next(new AppError('Invalid laboratory ID in report filter', 400));
  }

  if (sectionId && !isValidObjectId(sectionId)) {
    return next(new AppError('Invalid section ID in report filter', 400));
  }

  if (experimentId && !isValidObjectId(experimentId)) {
    return next(new AppError('Invalid experiment ID in report filter', 400));
  }

  if (semester !== undefined && semester !== '') {
    const semNum = Number(semester);
    if (isNaN(semNum) || semNum < 1 || semNum > 8) {
      return next(new AppError('Semester must be an integer between 1 and 8', 400));
    }
  }

  next();
};

module.exports = {
  validateReportFilters
};
