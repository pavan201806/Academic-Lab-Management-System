const ALPHANUMERIC_REGEX = /^[A-Za-z0-9]+$/;

const isValidRollNumber = (value) => {
  return typeof value === 'string' && ALPHANUMERIC_REGEX.test(value.trim());
};

const authValidators = require('./auth.validator');
const academicValidators = require('./academic.validator');

module.exports = {
  ALPHANUMERIC_REGEX,
  isValidRollNumber,
  ...authValidators,
  ...academicValidators
};
