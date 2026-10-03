const ALPHANUMERIC_REGEX = /^[A-Za-z0-9]+$/;

const isValidRollNumber = (value) => {
  return typeof value === 'string' && ALPHANUMERIC_REGEX.test(value.trim());
};

const authValidators = require('./auth.validator');
const academicValidators = require('./academic.validator');
const experimentValidators = require('./experiment.validator');
const submissionValidators = require('./submission.validator');
const testCaseValidators = require('./testCase.validator');
const vivaValidators = require('./viva.validator');
const notificationValidators = require('./notification.validator');

module.exports = {
  ALPHANUMERIC_REGEX,
  isValidRollNumber,
  ...authValidators,
  ...academicValidators,
  ...experimentValidators,
  ...submissionValidators,
  ...testCaseValidators,
  ...vivaValidators,
  ...notificationValidators
};

