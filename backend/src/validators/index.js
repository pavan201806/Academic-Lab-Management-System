const ALPHANUMERIC_REGEX = /^[A-Za-z0-9]+$/;

const isValidRollNumber = (value) => {
  return typeof value === 'string' && ALPHANUMERIC_REGEX.test(value.trim());
};

const authValidators = require('./auth.validator');
const academicValidators = require('./academic.validator');
const experimentValidators = require('./experiment.validator');
const submissionValidators = require('./submission.validator');

module.exports = {
  ALPHANUMERIC_REGEX,
  isValidRollNumber,
  ...authValidators,
  ...academicValidators,
  ...experimentValidators,
  ...submissionValidators
};

