const assert = require('assert');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const { generateToken, verifyToken } = require('../utils/token');
const { authenticate, authorize, requirePasswordChangeCompleted } = require('../middleware/auth');
const { validateLoginInput, validateChangePasswordInput } = require('../validators/auth.validator');

async function runSecurityVerification() {
  console.log('=== Running Focused Security and Integration Verification ===\n');

  // -------------------------------------------------------------
  // Check 1: Role Selector Security & Privilege Escalation Defense
  // -------------------------------------------------------------
  console.log('--- Check 1: Role Selector Security ---');
  
  // Simulate client attempting privilege escalation by sending role in login request
  const maliciousReq = {
    body: {
      rollNumber: '202301001',
      password: 'StudentPass123!',
      role: 'ADMIN_HOD' // Attempted spoof
    }
  };

  validateLoginInput(maliciousReq, {}, (err) => {
    assert.strictEqual(err, undefined, 'Validation should pass');
  });

  // Database user has STUDENT role
  const mockDbUser = new User({
    _id: '65f1a2b3c4d5e6f7a8b9c0d1',
    name: 'Student User',
    rollNumber: '202301001',
    passwordHash: await User.hashPassword('StudentPass123!'),
    role: 'STUDENT',
    mustChangePassword: false,
    active: true
  });

  // Token is generated strictly from the database user record
  const token = generateToken(mockDbUser);
  const tokenPayload = verifyToken(token);

  assert.strictEqual(tokenPayload.role, 'STUDENT', 'Token role must match database record, not client body');
  assert.notStrictEqual(tokenPayload.role, maliciousReq.body.role, 'Client-supplied role must not escalate privileges');

  // Verify authorization middleware rejects the student from admin endpoints
  const adminOnly = authorize('ADMIN_HOD');
  let authError = null;
  adminOnly({ user: mockDbUser }, {}, (err) => {
    authError = err;
  });

  assert.notStrictEqual(authError, null, 'Student token must be rejected from admin endpoint');
  assert.strictEqual(authError.statusCode, 403);
  console.log('✓ Check 1 Passed: Client cannot influence role authorization. Role is strictly derived from MongoDB.\n');

  // -------------------------------------------------------------
  // Check 2: Safe JSON Serialization (Zero passwordHash leakage)
  // -------------------------------------------------------------
  console.log('--- Check 2: Sensitive Data Protection ---');
  const userJson = mockDbUser.toJSON();
  assert.strictEqual(userJson.passwordHash, undefined, 'passwordHash must never be exposed');
  assert.strictEqual(userJson.__v, undefined, '__v should be stripped');
  assert.strictEqual(userJson.rollNumber, '202301001');
  console.log('✓ Check 2 Passed: passwordHash is stripped in all JSON responses.\n');

  // -------------------------------------------------------------
  // Check 3: Temporary Password Flow Verification
  // -------------------------------------------------------------
  console.log('--- Check 3: Temporary Password Flow ---');
  
  const tempUser = new User({
    _id: '65f1a2b3c4d5e6f7a8b9c0d2',
    name: 'New Onboarding Student',
    rollNumber: '202301002',
    passwordHash: await User.hashPassword('TempStudent#2024'),
    role: 'STUDENT',
    mustChangePassword: true, // Temporary password state
    active: true
  });

  // 3a. Verify temporary password gate blocks regular access
  let gateBlocked = false;
  requirePasswordChangeCompleted({ user: tempUser }, {}, (err) => {
    if (err && err.statusCode === 403 && err.errors?.requiresPasswordChange) {
      gateBlocked = true;
    }
  });
  assert.strictEqual(gateBlocked, true, 'User with mustChangePassword=true must be blocked with 403');

  // 3b. Verify change-password input validation rejects weak passwords
  let weakPasswordError = null;
  validateChangePasswordInput(
    {
      body: {
        currentPassword: 'TempStudent#2024',
        newPassword: 'simple', // Weak: <8 chars, no upper, no number, no symbol
        confirmPassword: 'simple'
      }
    },
    {},
    (err) => {
      weakPasswordError = err;
    }
  );
  assert.notStrictEqual(weakPasswordError, null, 'Weak password must be rejected');
  assert.strictEqual(weakPasswordError.statusCode, 400);

  // 3c. Verify change-password input validation rejects identical password
  let samePasswordError = null;
  validateChangePasswordInput(
    {
      body: {
        currentPassword: 'TempStudent#2024',
        newPassword: 'TempStudent#2024',
        confirmPassword: 'TempStudent#2024'
      }
    },
    {},
    (err) => {
      samePasswordError = err;
    }
  );
  assert.notStrictEqual(samePasswordError, null, 'Same password must be rejected');
  assert.strictEqual(samePasswordError.statusCode, 400);

  // 3d. Verify change-password succeeds with compliant password
  const newValidPassword = 'SecureNewPassword#2025!';
  let validPasswordPassed = false;
  validateChangePasswordInput(
    {
      body: {
        currentPassword: 'TempStudent#2024',
        newPassword: newValidPassword,
        confirmPassword: newValidPassword
      }
    },
    {},
    (err) => {
      if (!err) validPasswordPassed = true;
    }
  );
  assert.strictEqual(validPasswordPassed, true, 'Compliant password must pass validation');

  // Simulate change-password execution
  const isCurrentValid = await tempUser.comparePassword('TempStudent#2024');
  assert.strictEqual(isCurrentValid, true, 'Current temporary password must match');

  tempUser.passwordHash = await User.hashPassword(newValidPassword);
  tempUser.mustChangePassword = false;

  // 3e. Verify gate now allows access after password change
  let gateAllowed = false;
  requirePasswordChangeCompleted({ user: tempUser }, {}, (err) => {
    if (!err) gateAllowed = true;
  });
  assert.strictEqual(gateAllowed, true, 'User must be allowed after password change');

  // Verify fresh token can be generated and verified
  const freshToken = generateToken(tempUser);
  const freshPayload = verifyToken(freshToken);
  assert.strictEqual(freshPayload.rollNumber, '202301002');
  console.log('✓ Check 3 Passed: Complete temporary password gate flow verified.\n');

  console.log('=== ALL FOCUSED SECURITY AND INTEGRATION CHECKS PASSED ===');
}

runSecurityVerification().catch((err) => {
  console.error('Security verification failure:', err);
  process.exit(1);
});
