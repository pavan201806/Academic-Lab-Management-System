const mongoose = require('mongoose');
const AppError = require('../utils/appError');

const VALID_LANGUAGES = ['C', 'C++', 'Java', 'Python'];

const validateRunInput = (req, res, next) => {
  const { experimentId, language, sourceCode, stdin } = req.body;

  if (!experimentId || !mongoose.Types.ObjectId.isValid(experimentId)) {
    return next(new AppError('A valid experiment ID (experimentId) is required', 400));
  }

  if (!language || !VALID_LANGUAGES.includes(language)) {
    return next(
      new AppError(`Invalid language '${language}'. Allowed languages are: ${VALID_LANGUAGES.join(', ')}`, 400)
    );
  }

  if (!sourceCode || typeof sourceCode !== 'string' || !sourceCode.trim()) {
    return next(new AppError('Source code is required', 400));
  }

  if (Buffer.byteLength(sourceCode, 'utf8') > 65536) {
    return next(new AppError('Source code cannot exceed 64KB', 400));
  }

  if (stdin && Buffer.byteLength(stdin, 'utf8') > 16384) {
    return next(new AppError('Standard input cannot exceed 16KB', 400));
  }

  next();
};

const validateSubmitInput = (req, res, next) => {
  const { experimentId, language, sourceCode, stdin } = req.body;

  if (!experimentId || !mongoose.Types.ObjectId.isValid(experimentId)) {
    return next(new AppError('A valid experiment ID (experimentId) is required', 400));
  }

  if (!language || !VALID_LANGUAGES.includes(language)) {
    return next(
      new AppError(`Invalid language '${language}'. Allowed languages are: ${VALID_LANGUAGES.join(', ')}`, 400)
    );
  }

  if (!sourceCode || typeof sourceCode !== 'string' || !sourceCode.trim()) {
    return next(new AppError('Source code is required', 400));
  }

  if (Buffer.byteLength(sourceCode, 'utf8') > 65536) {
    return next(new AppError('Source code cannot exceed 64KB', 400));
  }

  if (stdin && Buffer.byteLength(stdin, 'utf8') > 16384) {
    return next(new AppError('Standard input cannot exceed 16KB', 400));
  }

  next();
};

module.exports = {
  validateRunInput,
  validateSubmitInput
};
