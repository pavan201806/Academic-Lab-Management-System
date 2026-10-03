const { User } = require('../models');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const { generateToken } = require('../utils/token');
const { successResponse } = require('../utils/apiResponse');

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res, next) => {
  const { rollNumber, password } = req.body;

  // Find user and explicitly select passwordHash for verification
  const user = await User.findOne({ rollNumber }).select('+passwordHash');

  if (!user) {
    return next(new AppError('Invalid roll number/username or password', 401));
  }

  if (!user.active) {
    return next(new AppError('Your account has been deactivated. Please contact your department.', 403));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new AppError('Invalid roll number/username or password', 401));
  }

  const token = generateToken(user);

  const safeUser = user.toJSON();

  return successResponse(
    res,
    {
      token,
      user: safeUser
    },
    'Login successful'
  );
});

/**
 * @desc    Change temporary or existing password
 * @route   POST /api/auth/change-password
 * @access  Private (Authenticated)
 */
const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new AppError('The current password entered is incorrect', 400));
  }

  // Hash the new password and clear the temporary password requirement
  user.passwordHash = await User.hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();

  // Generate fresh token with updated profile
  const token = generateToken(user);
  const safeUser = user.toJSON();

  return successResponse(
    res,
    {
      token,
      user: safeUser
    },
    'Password changed successfully. You may now access the laboratory platform.'
  );
});

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private (Authenticated)
 */
const getMe = asyncHandler(async (req, res) => {
  return successResponse(res, { user: req.user.toJSON() }, 'Profile retrieved successfully');
});

/**
 * @desc    Stateless logout acknowledgement
 * @route   POST /api/auth/logout
 * @access  Public / Authenticated
 */
const logout = asyncHandler(async (req, res) => {
  return successResponse(res, null, 'Logged out successfully');
});

module.exports = {
  login,
  changePassword,
  getMe,
  logout
};
