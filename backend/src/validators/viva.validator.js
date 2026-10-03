const mongoose = require('mongoose');
const AppError = require('../utils/appError');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Validator for creating a Viva evaluation
 */
const validateCreateVivaInput = (req, res, next) => {
  const { studentId, experimentId, marks, remarks } = req.body;

  if (!studentId || !isValidObjectId(studentId)) {
    return next(new AppError('Valid student ID is required', 400));
  }

  if (!experimentId || !isValidObjectId(experimentId)) {
    return next(new AppError('Valid experiment ID is required', 400));
  }

  if (marks === undefined || marks === null || marks === '') {
    return next(new AppError('Viva marks are required', 400));
  }

  const numMarks = Number(marks);
  if (isNaN(numMarks)) {
    return next(new AppError('Viva marks must be a valid number', 400));
  }

  if (numMarks < 0 || numMarks > 5) {
    return next(new AppError('Viva marks must be between 0 and 5', 400));
  }

  if (remarks && typeof remarks !== 'string') {
    return next(new AppError('Remarks must be a string', 400));
  }

  if (remarks && remarks.length > 1000) {
    return next(new AppError('Remarks cannot exceed 1000 characters', 400));
  }

  req.body.marks = Math.round(numMarks * 100) / 100;
  req.body.remarks = remarks ? remarks.trim() : '';

  next();
};

/**
 * Validator for student submitting a re-evaluation request
 */
const validateCreateReevaluationRequestInput = (req, res, next) => {
  const { experimentId, reason } = req.body;

  if (!experimentId || !isValidObjectId(experimentId)) {
    return next(new AppError('Valid experiment ID is required', 400));
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    return next(new AppError('A valid reason of at least 5 characters is required', 400));
  }

  if (reason.trim().length > 1000) {
    return next(new AppError('Reason cannot exceed 1000 characters', 400));
  }

  req.body.reason = reason.trim();
  next();
};

/**
 * Validator for teacher processing a re-evaluation request
 */
const validateProcessReevaluationInput = (req, res, next) => {
  const { action, reviewRemarks, marks, remarks } = req.body;

  if (!action || !['APPROVE', 'REJECT'].includes(action)) {
    return next(new AppError('Action must be either APPROVE or REJECT', 400));
  }

  if (reviewRemarks && typeof reviewRemarks !== 'string') {
    return next(new AppError('Review remarks must be a string', 400));
  }

  if (reviewRemarks && reviewRemarks.length > 1000) {
    return next(new AppError('Review remarks cannot exceed 1000 characters', 400));
  }

  if (action === 'APPROVE') {
    if (marks === undefined || marks === null || marks === '') {
      return next(new AppError('New viva marks are required when approving re-evaluation', 400));
    }

    const numMarks = Number(marks);
    if (isNaN(numMarks)) {
      return next(new AppError('Viva marks must be a valid number', 400));
    }

    if (numMarks < 0 || numMarks > 5) {
      return next(new AppError('Viva marks must be between 0 and 5', 400));
    }

    if (remarks && typeof remarks !== 'string') {
      return next(new AppError('Remarks must be a string', 400));
    }

    if (remarks && remarks.length > 1000) {
      return next(new AppError('Remarks cannot exceed 1000 characters', 400));
    }

    req.body.marks = Math.round(numMarks * 100) / 100;
    req.body.remarks = remarks ? remarks.trim() : '';
  }

  req.body.reviewRemarks = reviewRemarks ? reviewRemarks.trim() : '';
  next();
};

module.exports = {
  validateCreateVivaInput,
  validateCreateReevaluationRequestInput,
  validateProcessReevaluationInput
};
