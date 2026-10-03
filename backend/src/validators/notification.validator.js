const mongoose = require('mongoose');
const AppError = require('../utils/appError');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const ALLOWED_TYPES = ['GENERAL', 'EXPERIMENT', 'DEADLINE', 'LAB', 'ANNOUNCEMENT'];
const ALLOWED_TARGET_TYPES = ['ALL_STUDENTS', 'LAB', 'SECTION', 'INDIVIDUAL'];

/**
 * Validator for creating a notification
 */
const validateCreateNotificationInput = (req, res, next) => {
  const { title, message, type, targetType, targetStudents, targetSections, targetLabs } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return next(new AppError('Notification title is required', 400));
  }

  if (title.trim().length > 200) {
    return next(new AppError('Notification title cannot exceed 200 characters', 400));
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return next(new AppError('Notification message is required', 400));
  }

  if (message.trim().length > 2000) {
    return next(new AppError('Notification message cannot exceed 2000 characters', 400));
  }

  if (type && !ALLOWED_TYPES.includes(type)) {
    return next(new AppError(`Invalid notification type. Allowed types: ${ALLOWED_TYPES.join(', ')}`, 400));
  }

  if (targetType && !ALLOWED_TARGET_TYPES.includes(targetType)) {
    return next(new AppError(`Invalid target type. Allowed target types: ${ALLOWED_TARGET_TYPES.join(', ')}`, 400));
  }

  const selectedTargetType = targetType || 'ALL_STUDENTS';

  if (selectedTargetType === 'LAB') {
    if (!targetLabs || !Array.isArray(targetLabs) || targetLabs.length === 0) {
      return next(new AppError('At least one valid laboratory must be specified when targetType is LAB', 400));
    }
    for (const labId of targetLabs) {
      if (!isValidObjectId(labId)) {
        return next(new AppError(`Invalid laboratory ID: ${labId}`, 400));
      }
    }
  }

  if (selectedTargetType === 'SECTION') {
    if (!targetSections || !Array.isArray(targetSections) || targetSections.length === 0) {
      return next(new AppError('At least one valid section must be specified when targetType is SECTION', 400));
    }
    for (const secId of targetSections) {
      if (!isValidObjectId(secId)) {
        return next(new AppError(`Invalid section ID: ${secId}`, 400));
      }
    }
  }

  if (selectedTargetType === 'INDIVIDUAL') {
    if (!targetStudents || !Array.isArray(targetStudents) || targetStudents.length === 0) {
      return next(new AppError('At least one valid student must be specified when targetType is INDIVIDUAL', 400));
    }
    for (const stuId of targetStudents) {
      if (!isValidObjectId(stuId)) {
        return next(new AppError(`Invalid student ID: ${stuId}`, 400));
      }
    }
  }

  req.body.title = title.trim();
  req.body.message = message.trim();
  req.body.type = type || 'GENERAL';
  req.body.targetType = selectedTargetType;

  next();
};

module.exports = {
  validateCreateNotificationInput
};
