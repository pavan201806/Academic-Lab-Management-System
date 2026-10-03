const mongoose = require('mongoose');
const AppError = require('../utils/appError');

const validateCreateTestCaseInput = (req, res, next) => {
  const { experimentId, input, expectedOutput, marks, isHidden, order } = req.body;

  if (!experimentId || !mongoose.Types.ObjectId.isValid(experimentId)) {
    return next(new AppError('A valid experiment ID (experimentId) is required', 400));
  }

  if (expectedOutput === undefined || expectedOutput === null || typeof expectedOutput !== 'string' || !expectedOutput.trim()) {
    return next(new AppError('Expected output is required', 400));
  }

  if (Buffer.byteLength(expectedOutput, 'utf8') > 65536) {
    return next(new AppError('Expected output cannot exceed 64KB', 400));
  }

  if (input !== undefined && input !== null) {
    if (typeof input !== 'string') {
      return next(new AppError('Input must be a string', 400));
    }
    if (Buffer.byteLength(input, 'utf8') > 16384) {
      return next(new AppError('Input cannot exceed 16KB', 400));
    }
  }

  if (marks !== undefined) {
    const numMarks = Number(marks);
    if (isNaN(numMarks) || numMarks <= 0 || numMarks > 100) {
      return next(new AppError('Marks must be a positive number between 0.1 and 100', 400));
    }
  }

  if (order !== undefined) {
    const numOrder = Number(order);
    if (isNaN(numOrder) || numOrder < 1 || !Number.isInteger(numOrder)) {
      return next(new AppError('Order must be a positive integer starting from 1', 400));
    }
  }

  if (isHidden !== undefined && typeof isHidden !== 'boolean') {
    return next(new AppError('isHidden must be a boolean value', 400));
  }

  next();
};

const validateUpdateTestCaseInput = (req, res, next) => {
  const { input, expectedOutput, marks, isHidden, order } = req.body;

  if (expectedOutput !== undefined) {
    if (typeof expectedOutput !== 'string' || !expectedOutput.trim()) {
      return next(new AppError('Expected output cannot be empty', 400));
    }
    if (Buffer.byteLength(expectedOutput, 'utf8') > 65536) {
      return next(new AppError('Expected output cannot exceed 64KB', 400));
    }
  }

  if (input !== undefined && input !== null) {
    if (typeof input !== 'string') {
      return next(new AppError('Input must be a string', 400));
    }
    if (Buffer.byteLength(input, 'utf8') > 16384) {
      return next(new AppError('Input cannot exceed 16KB', 400));
    }
  }

  if (marks !== undefined) {
    const numMarks = Number(marks);
    if (isNaN(numMarks) || numMarks <= 0 || numMarks > 100) {
      return next(new AppError('Marks must be a positive number between 0.1 and 100', 400));
    }
  }

  if (order !== undefined) {
    const numOrder = Number(order);
    if (isNaN(numOrder) || numOrder < 1 || !Number.isInteger(numOrder)) {
      return next(new AppError('Order must be a positive integer starting from 1', 400));
    }
  }

  if (isHidden !== undefined && typeof isHidden !== 'boolean') {
    return next(new AppError('isHidden must be a boolean value', 400));
  }

  next();
};

const validateReorderTestCasesInput = (req, res, next) => {
  const { experimentId, orders } = req.body;

  if (!experimentId || !mongoose.Types.ObjectId.isValid(experimentId)) {
    return next(new AppError('A valid experiment ID (experimentId) is required', 400));
  }

  if (!Array.isArray(orders) || orders.length === 0) {
    return next(new AppError('Orders array must contain at least one test case reordering entry', 400));
  }

  for (const item of orders) {
    if (!item.testCaseId || !mongoose.Types.ObjectId.isValid(item.testCaseId)) {
      return next(new AppError('Every entry in orders array must have a valid testCaseId', 400));
    }
    const numOrder = Number(item.order);
    if (isNaN(numOrder) || numOrder < 1 || !Number.isInteger(numOrder)) {
      return next(new AppError('Every entry in orders array must have a positive integer order', 400));
    }
  }

  next();
};

module.exports = {
  validateCreateTestCaseInput,
  validateUpdateTestCaseInput,
  validateReorderTestCasesInput
};
