const mongoose = require('mongoose');
const AppError = require('../utils/appError');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Validator for Admin/HOD Dashboard filter query parameters
 */
const validateDashboardFilters = (req, res, next) => {
  const { labId, sectionId, semester, academicYear, department } = req.query;

  if (labId && !isValidObjectId(labId)) {
    return next(new AppError('Invalid laboratory ID in dashboard filter', 400));
  }

  if (sectionId && !isValidObjectId(sectionId)) {
    return next(new AppError('Invalid section ID in dashboard filter', 400));
  }

  if (semester !== undefined && semester !== '') {
    const semNum = Number(semester);
    if (isNaN(semNum) || semNum < 1 || semNum > 8) {
      return next(new AppError('Semester filter must be an integer between 1 and 8', 400));
    }
  }

  if (academicYear && typeof academicYear === 'string' && academicYear.trim().length > 30) {
    return next(new AppError('Academic year filter exceeds maximum character limit', 400));
  }

  if (department && typeof department === 'string' && department.trim().length > 50) {
    return next(new AppError('Department filter exceeds maximum character limit', 400));
  }

  next();
};

module.exports = {
  validateDashboardFilters
};
