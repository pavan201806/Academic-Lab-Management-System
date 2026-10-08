const mongoose = require('mongoose');
const AppError = require('../utils/appError');
const { EVENT_TYPES } = require('../models/malpracticeEvent.model');

const validateRecordEventInput = (req, res, next) => {
  const { experimentId, eventType, labId, submissionId, details } = req.body;

  if (!experimentId || !mongoose.Types.ObjectId.isValid(experimentId)) {
    return next(new AppError('A valid experiment ID (experimentId) is required', 400));
  }

  if (!eventType || typeof eventType !== 'string' || !EVENT_TYPES.includes(eventType)) {
    return next(
      new AppError(
        `Invalid event type '${eventType}'. Allowed types are: ${EVENT_TYPES.join(', ')}`,
        400
      )
    );
  }

  if (labId && !mongoose.Types.ObjectId.isValid(labId)) {
    return next(new AppError('labId must be a valid ObjectId', 400));
  }

  if (submissionId && !mongoose.Types.ObjectId.isValid(submissionId)) {
    return next(new AppError('submissionId must be a valid ObjectId', 400));
  }

  if (details !== undefined && details !== null && typeof details !== 'object') {
    return next(new AppError('details must be an object', 400));
  }

  next();
};

const validateGetEventsQuery = (req, res, next) => {
  const { experimentId, studentId, labId, eventType } = req.query;

  if (experimentId && !mongoose.Types.ObjectId.isValid(experimentId)) {
    return next(new AppError('experimentId must be a valid ObjectId', 400));
  }

  if (studentId && !mongoose.Types.ObjectId.isValid(studentId)) {
    return next(new AppError('studentId must be a valid ObjectId', 400));
  }

  if (labId && !mongoose.Types.ObjectId.isValid(labId)) {
    return next(new AppError('labId must be a valid ObjectId', 400));
  }

  if (eventType && !EVENT_TYPES.includes(eventType)) {
    return next(
      new AppError(
        `Invalid eventType filter '${eventType}'. Allowed types are: ${EVENT_TYPES.join(', ')}`,
        400
      )
    );
  }

  next();
};

module.exports = {
  validateRecordEventInput,
  validateGetEventsQuery
};
