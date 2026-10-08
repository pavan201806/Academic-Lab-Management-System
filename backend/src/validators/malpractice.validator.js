const mongoose = require('mongoose');
const AppError = require('../utils/appError');
const { EVENT_TYPES, SEVERITY_LEVELS } = require('../models/malpracticeEvent.model');

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
  const { experimentId, studentId, labId, sectionId, eventType, severity, startDate, endDate } = req.query;

  if (experimentId && !mongoose.Types.ObjectId.isValid(experimentId)) {
    return next(new AppError('experimentId must be a valid ObjectId', 400));
  }

  if (studentId && !mongoose.Types.ObjectId.isValid(studentId)) {
    return next(new AppError('studentId must be a valid ObjectId', 400));
  }

  if (labId && !mongoose.Types.ObjectId.isValid(labId)) {
    return next(new AppError('labId must be a valid ObjectId', 400));
  }

  if (sectionId && !mongoose.Types.ObjectId.isValid(sectionId)) {
    return next(new AppError('sectionId must be a valid ObjectId', 400));
  }

  if (eventType && !EVENT_TYPES.includes(eventType)) {
    return next(
      new AppError(
        `Invalid eventType filter '${eventType}'. Allowed types are: ${EVENT_TYPES.join(', ')}`,
        400
      )
    );
  }

  if (severity && !SEVERITY_LEVELS.includes(severity)) {
    return next(
      new AppError(
        `Invalid severity filter '${severity}'. Allowed levels are: ${SEVERITY_LEVELS.join(', ')}`,
        400
      )
    );
  }

  if (startDate && isNaN(Date.parse(startDate))) {
    return next(new AppError('startDate must be a valid ISO date string', 400));
  }

  if (endDate && isNaN(Date.parse(endDate))) {
    return next(new AppError('endDate must be a valid ISO date string', 400));
  }

  next();
};

const validateGetLabOverview = (req, res, next) => {
  const { labId } = req.params;
  const { sectionId, experimentId } = req.query;

  if (!labId || !mongoose.Types.ObjectId.isValid(labId)) {
    return next(new AppError('A valid laboratory ID (labId) is required in route params', 400));
  }

  if (sectionId && !mongoose.Types.ObjectId.isValid(sectionId)) {
    return next(new AppError('sectionId must be a valid ObjectId', 400));
  }

  if (experimentId && !mongoose.Types.ObjectId.isValid(experimentId)) {
    return next(new AppError('experimentId must be a valid ObjectId', 400));
  }

  next();
};

module.exports = {
  validateRecordEventInput,
  validateGetEventsQuery,
  validateGetLabOverview
};
