/**
 * Validation Schemas & Helpers Registry
 *
 * Core rule from PRD.md / Rules.md:
 * - Alphanumeric Roll numbers / Usernames: ^[A-Za-z0-9]+$ (No spaces, no special characters)
 */

const ALPHANUMERIC_REGEX = /^[A-Za-z0-9]+$/;

const isValidRollNumber = (value) => {
  return typeof value === 'string' && ALPHANUMERIC_REGEX.test(value);
};

module.exports = {
  ALPHANUMERIC_REGEX,
  isValidRollNumber
};
