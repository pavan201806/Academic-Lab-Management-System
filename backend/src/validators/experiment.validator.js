const mongoose = require('mongoose');
const AppError = require('../utils/appError');

const VALID_LANGUAGES = ['C', 'C++', 'Java', 'Python'];
const VALID_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'CLOSED', 'REOPENED'];

const validateExperimentInput = (req, res, next) => {
  const { title, experimentNumber, programmingLanguages, lab, scheduledAt, deadline, order } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return next(new AppError('Experiment title is required', 400));
  }

  if (title.trim().length > 200) {
    return next(new AppError('Experiment title cannot exceed 200 characters', 400));
  }

  const expNum = parseInt(experimentNumber, 10);
  if (isNaN(expNum) || expNum < 1 || expNum > 12) {
    return next(new AppError('Experiment number must be an integer between 1 and 12', 400));
  }

  if (lab && !mongoose.Types.ObjectId.isValid(lab)) {
    return next(new AppError('Invalid laboratory ID', 400));
  }

  if (!programmingLanguages || !Array.isArray(programmingLanguages) || programmingLanguages.length === 0) {
    return next(new AppError('At least one programming language must be selected (C, C++, Java, or Python)', 400));
  }

  for (const lang of programmingLanguages) {
    if (!VALID_LANGUAGES.includes(lang)) {
      return next(
        new AppError(`Invalid programming language '${lang}'. Allowed languages are: ${VALID_LANGUAGES.join(', ')}`, 400)
      );
    }
  }

  if (order !== undefined) {
    const ordNum = parseInt(order, 10);
    if (isNaN(ordNum) || ordNum < 1 || ordNum > 12) {
      return next(new AppError('Order index must be an integer between 1 and 12', 400));
    }
  }

  if (scheduledAt) {
    const schedDate = new Date(scheduledAt);
    if (isNaN(schedDate.getTime())) {
      return next(new AppError('Invalid scheduled publication date', 400));
    }
  }

  if (deadline) {
    const deadDate = new Date(deadline);
    if (isNaN(deadDate.getTime())) {
      return next(new AppError('Invalid deadline date', 400));
    }

    if (scheduledAt) {
      const schedDate = new Date(scheduledAt);
      if (deadDate < schedDate) {
        return next(new AppError('Deadline cannot be set earlier than the scheduled publication date', 400));
      }
    }
  }

  next();
};

const validateReopenInput = (req, res, next) => {
  const { reopenedUntil } = req.body;

  if (reopenedUntil) {
    const reopenDate = new Date(reopenedUntil);
    if (isNaN(reopenDate.getTime())) {
      return next(new AppError('Invalid reopenedUntil date format', 400));
    }
    if (reopenDate <= new Date()) {
      return next(new AppError('Reopened deadline must be set to a future date and time', 400));
    }
  }

  next();
};

const validateStatusUpdateInput = (req, res, next) => {
  const { status, scheduledAt, deadline, reopenedUntil } = req.body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return next(
      new AppError(`Invalid status '${status}'. Allowed statuses are: ${VALID_STATUSES.join(', ')}`, 400)
    );
  }

  if (status === 'SCHEDULED' && !scheduledAt) {
    return next(new AppError('A scheduled publication date (scheduledAt) is required to schedule an experiment', 400));
  }

  if (scheduledAt) {
    const schedDate = new Date(scheduledAt);
    if (isNaN(schedDate.getTime())) {
      return next(new AppError('Invalid scheduledAt date format', 400));
    }
  }

  if (deadline) {
    const deadDate = new Date(deadline);
    if (isNaN(deadDate.getTime())) {
      return next(new AppError('Invalid deadline date format', 400));
    }
    if (scheduledAt) {
      const schedDate = new Date(scheduledAt);
      if (deadDate < schedDate) {
        return next(new AppError('Deadline cannot be before scheduled publication date', 400));
      }
    }
  }

  if (status === 'REOPENED' && reopenedUntil) {
    const reopenDate = new Date(reopenedUntil);
    if (isNaN(reopenDate.getTime())) {
      return next(new AppError('Invalid reopenedUntil date format', 400));
    }
    if (reopenDate <= new Date()) {
      return next(new AppError('Reopened deadline must be in the future', 400));
    }
  }

  next();
};

const validateOrderUpdateInput = (req, res, next) => {
  const { order } = req.body;
  const ordNum = parseInt(order, 10);
  if (isNaN(ordNum) || ordNum < 1 || ordNum > 12) {
    return next(new AppError('Order index must be an integer between 1 and 12', 400));
  }
  next();
};

module.exports = {
  VALID_LANGUAGES,
  VALID_STATUSES,
  validateExperimentInput,
  validateReopenInput,
  validateStatusUpdateInput,
  validateOrderUpdateInput
};
