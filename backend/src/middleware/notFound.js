const AppError = require('../utils/appError');

const notFound = (req, res, next) => {
  next(new AppError(`Endpoint not found: ${req.method} ${req.originalUrl}`, 404));
};

module.exports = notFound;
