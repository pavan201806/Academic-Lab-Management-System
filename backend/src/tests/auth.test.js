const assert = require('assert');
const mongoose = require('mongoose');
const User = require('../models/user.model');
const { generateToken, verifyToken } = require('../utils/token');
const { authenticate, authorize, requirePasswordChangeCompleted } = require('../middleware/auth');
const { ALPHANUMERIC_REGEX } = require('../validators');

async function runUnitTests() {
  console.log('--- Running Authentication & User Unit Tests ---');

  // 1. Alphanumeric validation
  console.log('1. Testing Alphanumeric Roll Number Regex...');
  assert.strictEqual(ALPHANUMERIC_REGEX.test('23341A4504'), true, 'Valid roll number should pass');
  assert.strictEqual(ALPHANUMERIC_REGEX.test('504'), true, 'Short numeric roll number should pass');
  assert.strictEqual(ALPHANUMERIC_REGEX.test('23A1B07'), true, 'Alphanumeric roll number should pass');
  assert.strictEqual(ALPHANUMERIC_REGEX.test('CSE24A001'), true, 'Branch code roll number should pass');
  assert.strictEqual(ALPHANUMERIC_REGEX.test('23 341A4504'), false, 'Spaces must be rejected');
  assert.strictEqual(ALPHANUMERIC_REGEX.test('23-341A4504'), false, 'Hyphens must be rejected');
  assert.strictEqual(ALPHANUMERIC_REGEX.test('23@341A4504'), false, 'Special chars must be rejected');
  console.log('✓ Alphanumeric regex validation passed.');

  // 2. Password Hashing and Comparison
  console.log('2. Testing Password Hashing & Comparison...');
  const plain = 'TempPass#2024!';
  const hash = await User.hashPassword(plain);
  assert.notStrictEqual(hash, plain, 'Password must be hashed');
  assert.strictEqual(hash.startsWith('$2'), true, 'Hash must be a valid bcrypt hash');

  const mockUser = new User({
    name: 'Test Student',
    rollNumber: '202301001',
    passwordHash: hash,
    role: 'STUDENT',
    mustChangePassword: true,
    active: true
  });

  const correctMatch = await mockUser.comparePassword('TempPass#2024!');
  assert.strictEqual(correctMatch, true, 'Valid password should match hash');

  const wrongMatch = await mockUser.comparePassword('WrongPassword123!');
  assert.strictEqual(wrongMatch, false, 'Invalid password should not match');
  console.log('✓ Password hashing and verification passed.');

  // 3. User JSON Transformation (passwordHash must never be exposed)
  console.log('3. Testing Safe JSON Serialization...');
  const jsonUser = mockUser.toJSON();
  assert.strictEqual(jsonUser.passwordHash, undefined, 'passwordHash must be omitted in JSON serialization');
  assert.strictEqual(jsonUser.rollNumber, '202301001');
  assert.strictEqual(jsonUser.mustChangePassword, true);
  console.log('✓ Safe JSON serialization passed.');

  // 4. JWT Token Generation & Verification
  console.log('4. Testing JWT Token Operations...');
  const token = generateToken(mockUser);
  assert.strictEqual(typeof token, 'string');
  assert.strictEqual(token.split('.').length, 3, 'JWT should have 3 segments');

  const decoded = verifyToken(token);
  assert.strictEqual(decoded.rollNumber, '202301001');
  assert.strictEqual(decoded.role, 'STUDENT');
  console.log('✓ JWT token generation and verification passed.');

  // 5. Reusable Role Authorization Middleware
  console.log('5. Testing Authorization Middleware...');
  const teacherAuthorize = authorize('TEACHER', 'ADMIN_HOD');

  let passed = false;
  let rejectedError = null;

  // Student trying to access teacher route
  teacherAuthorize(
    { user: { role: 'STUDENT' } },
    {},
    (err) => {
      if (err) rejectedError = err;
      else passed = true;
    }
  );
  assert.strictEqual(passed, false);
  assert.strictEqual(rejectedError.statusCode, 403);
  assert.strictEqual(rejectedError.message.includes('Forbidden'), true);

  // Teacher accessing teacher route
  passed = false;
  rejectedError = null;
  teacherAuthorize(
    { user: { role: 'TEACHER' } },
    {},
    (err) => {
      if (err) rejectedError = err;
      else passed = true;
    }
  );
  assert.strictEqual(passed, true, 'Teacher should be allowed');
  assert.strictEqual(rejectedError, null);
  console.log('✓ Reusable Role authorization middleware passed.');

  // 6. Temporary Password Gate Middleware
  console.log('6. Testing Temporary Password Enforcement Middleware...');
  let gateBlocked = false;
  requirePasswordChangeCompleted(
    { user: { mustChangePassword: true } },
    {},
    (err) => {
      if (err && err.statusCode === 403) gateBlocked = true;
    }
  );
  assert.strictEqual(gateBlocked, true, 'User with mustChangePassword=true must be blocked');

  let gateAllowed = false;
  requirePasswordChangeCompleted(
    { user: { mustChangePassword: false } },
    {},
    (err) => {
      if (!err) gateAllowed = true;
    }
  );
  assert.strictEqual(gateAllowed, true, 'User with mustChangePassword=false must be allowed');
  console.log('✓ Temporary Password gate middleware passed.');

  console.log('--- ALL AUTHENTICATION UNIT TESTS PASSED SUCCESSFULLY ---');
}

runUnitTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
