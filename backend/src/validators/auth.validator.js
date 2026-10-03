const AppError = require('../utils/appError');

const ALPHANUMERIC_REGEX = /^[A-Za-z0-9]+$/;
const PASSWORD_POLICY_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_~`\-+=\[\]\\;/]).{8,}$/;

const validateLoginInput = (req, res, next) => {
  const { rollNumber, password } = req.body;

  if (!rollNumber || typeof rollNumber !== 'string' || !rollNumber.trim()) {
    return next(new AppError('Roll number / username is required', 400));
  }

  const cleanRoll = rollNumber.trim();
  if (!ALPHANUMERIC_REGEX.test(cleanRoll)) {
    return next(
      new AppError(
        'Roll number / username must contain only alphanumeric characters without spaces or symbols',
        400
      )
    );
  }

  if (!password || typeof password !== 'string') {
    return next(new AppError('Password is required', 400));
  }

  req.body.rollNumber = cleanRoll.toUpperCase();
  next();
};

const validateChangePasswordInput = (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || typeof currentPassword !== 'string') {
    return next(new AppError('Current password is required', 400));
  }

  if (!newPassword || typeof newPassword !== 'string') {
    return next(new AppError('New password is required', 400));
  }

  if (!confirmPassword || typeof confirmPassword !== 'string') {
    return next(new AppError('Password confirmation is required', 400));
  }

  if (newPassword !== confirmPassword) {
    return next(new AppError('New password and confirmation password do not match', 400));
  }

  if (newPassword === currentPassword) {
    return next(new AppError('New password cannot be the same as the current password', 400));
  }

  if (!PASSWORD_POLICY_REGEX.test(newPassword)) {
    return next(
      new AppError(
        'Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 number, and 1 special symbol',
        400
      )
    );
  }

  next();
};

module.exports = {
  ALPHANUMERIC_REGEX,
  PASSWORD_POLICY_REGEX,
  validateLoginInput,
  validateChangePasswordInput
};
