const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/token');
const { User } = require('../models');

/**
 * Authentication middleware: verifies JWT and attaches active user
 */
const authenticate = asyncHandler(async (req, res, next) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Authentication token is missing. Please log in.', 401));
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Authentication session has expired. Please log in again.', 401));
    }
    return next(new AppError('Invalid authentication token. Please log in again.', 401));
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    return next(new AppError('The user associated with this token no longer exists.', 401));
  }

  if (!user.active) {
    return next(new AppError('This user account has been deactivated. Please contact your department.', 403));
  }

  req.user = user;
  next();
});

/**
 * Enforces that temporary password must be changed before accessing application resources
 */
const requirePasswordChangeCompleted = (req, res, next) => {
  if (req.user && req.user.mustChangePassword) {
    return next(
      new AppError(
        'Temporary password must be changed before accessing laboratory portal resources.',
        403,
        { requiresPasswordChange: true }
      )
    );
  }
  next();
};

/**
 * Reusable role-based authorization middleware
 * @param  {...string} roles Allowed roles (e.g. 'ADMIN_HOD', 'TEACHER', 'STUDENT')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Role '${req.user.role}' is not authorized to access this resource.`,
          403
        )
      );
    }

    next();
  };
};

module.exports = {
  authenticate,
  requirePasswordChangeCompleted,
  authorize
};
