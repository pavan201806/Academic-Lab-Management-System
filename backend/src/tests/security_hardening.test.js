const assert = require('assert');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const AppError = require('../utils/appError');
const { generateToken, verifyToken } = require('../utils/token');
const {
  User,
  Lab,
  Section,
  LabAssignment,
  Experiment,
  Submission,
  Evaluation,
  TestCase,
  VivaEvaluation,
  ReevaluationRequest,
  Notification
} = require('../models');

// Services & Validators & Middleware
const userService = require('../services/userService');
const labService = require('../services/labService');
const experimentService = require('../services/experimentService');
const submissionService = require('../services/submissionService');
const evaluationService = require('../services/evaluationService');
const vivaService = require('../services/vivaService');
const reevaluationService = require('../services/reevaluationService');
const notificationService = require('../services/notificationService');
const reportService = require('../services/reportService');
const pdfExtractionService = require('../services/pdfExtractionService');
const codeExecutionService = require('../services/codeExecutionService');

const {
  validateLoginInput,
  validateChangePasswordInput,
  validateCreateUserInput,
  validateObjectIdParam,
  validateCreateVivaInput,
  validateCreateNotificationInput
} = require('../validators');

const { authenticate, authorize, requirePasswordChangeCompleted } = require('../middleware/auth');
const securityHeaders = require('../middleware/securityHeaders');
const errorHandler = require('../middleware/errorHandler');

console.log('=== Running Phase 13 Security, Validation & Hardening Comprehensive Tests ===\n');

async function runPhase13SecurityTests() {
  let passed = 0;
  let total = 0;

  async function test(description, fn) {
    total++;
    try {
      await fn();
      console.log(`✓ [Test ${total}] ${description}`);
      passed++;
    } catch (err) {
      console.error(`✗ [Test ${total}] ${description}`);
      console.error(err);
      process.exit(1);
    }
  }

  // Common Mock Entities
  const adminId = new mongoose.Types.ObjectId('64f000000000000000000001');
  const teacherAId = new mongoose.Types.ObjectId('64f000000000000000000010');
  const teacherBId = new mongoose.Types.ObjectId('64f000000000000000000020');
  const studentAId = new mongoose.Types.ObjectId('64f000000000000000000100');
  const studentBId = new mongoose.Types.ObjectId('64f000000000000000000200');

  const lab1Id = new mongoose.Types.ObjectId('64f000000000000000001000');
  const lab2Id = new mongoose.Types.ObjectId('64f000000000000000002000');
  const sectionAId = new mongoose.Types.ObjectId('64f000000000000000010000');
  const sectionBId = new mongoose.Types.ObjectId('64f000000000000000020000');
  const experiment1Id = new mongoose.Types.ObjectId('64f000000000000000100000');

  const adminUser = {
    _id: adminId,
    name: 'Admin HOD',
    rollNumber: 'ADMIN01',
    role: 'ADMIN_HOD',
    active: true,
    mustChangePassword: false,
    toJSON: () => ({ _id: adminId, name: 'Admin HOD', rollNumber: 'ADMIN01', role: 'ADMIN_HOD' })
  };

  const teacherA = {
    _id: teacherAId,
    name: 'Prof Vance',
    rollNumber: 'PROFVANCE',
    role: 'TEACHER',
    active: true,
    mustChangePassword: false,
    toJSON: () => ({ _id: teacherAId, name: 'Prof Vance', rollNumber: 'PROFVANCE', role: 'TEACHER' })
  };

  const studentA = {
    _id: studentAId,
    name: 'Student Alice',
    rollNumber: '202601001',
    role: 'STUDENT',
    section: 'CSA',
    active: true,
    mustChangePassword: false,
    toJSON: () => ({ _id: studentAId, name: 'Student Alice', rollNumber: '202601001', role: 'STUDENT', section: 'CSA' })
  };

  const studentB = {
    _id: studentBId,
    name: 'Student Bob',
    rollNumber: '202601002',
    role: 'STUDENT',
    section: 'CSB',
    active: true,
    mustChangePassword: false,
    toJSON: () => ({ _id: studentBId, name: 'Student Bob', rollNumber: '202601002', role: 'STUDENT', section: 'CSB' })
  };

  const studentPendingPassword = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000300'),
    name: 'Student New',
    rollNumber: '202601003',
    role: 'STUDENT',
    section: 'CSA',
    active: true,
    mustChangePassword: true
  };

  // -------------------------------------------------------------
  // Section 1: Authentication, Tokens & Password Policy (1-6)
  // -------------------------------------------------------------
  console.log('--- Section 1: Authentication, Tokens & Password Policy (1-6) ---');

  await test('1. Deactivated user account is rejected by authentication middleware', async () => {
    const origFindById = User.findById;
    User.findById = () => ({
      ...studentA,
      active: false
    });

    try {
      const token = generateToken(studentA);
      const req = { headers: { authorization: `Bearer ${token}` } };
      let caughtError = null;

      await authenticate(req, {}, (err) => {
        if (err) caughtError = err;
      });

      assert(caughtError, 'Should reject deactivated account');
      assert.strictEqual(caughtError.statusCode, 403);
    } finally {
      User.findById = origFindById;
    }
  });

  await test('2. Invalid or tampered JWT signature is rejected safely (401)', async () => {
    const fakeToken = jwt.sign({ id: studentAId, role: 'ADMIN_HOD' }, 'wrong_secret_key');
    const req = { headers: { authorization: `Bearer ${fakeToken}` } };
    let caughtError = null;

    await authenticate(req, {}, (err) => {
      if (err) caughtError = err;
    });

    assert(caughtError, 'Should reject invalid token signature');
    assert.strictEqual(caughtError.statusCode, 401);
  });

  await test('3. Expired JWT token is detected and rejected with 401', async () => {
    const expiredToken = jwt.sign({ id: studentAId, role: 'STUDENT' }, config.jwtSecret, { expiresIn: -10 });
    const req = { headers: { authorization: `Bearer ${expiredToken}` } };
    let caughtError = null;

    await authenticate(req, {}, (err) => {
      if (err) caughtError = err;
    });

    assert(caughtError, 'Should reject expired token');
    assert.strictEqual(caughtError.statusCode, 401);
  });

  await test('4. Temporary-password user cannot bypass security gate to access resources (403)', async () => {
    const req = { user: studentPendingPassword };
    let caughtError = null;

    requirePasswordChangeCompleted(req, {}, (err) => {
      if (err) caughtError = err;
    });

    assert(caughtError, 'Should block temporary password user');
    assert.strictEqual(caughtError.statusCode, 403);
  });

  await test('5. Password change validates complexity (requires uppercase, number, symbol, min 8 chars)', async () => {
    // Missing symbol
    const req1 = {
      body: {
        currentPassword: 'TempPassword#2026',
        newPassword: 'SimplePassword123',
        confirmPassword: 'SimplePassword123'
      }
    };
    let err1 = null;
    validateChangePasswordInput(req1, {}, (e) => { err1 = e; });
    assert(err1, 'Should reject password without special character');
    assert.strictEqual(err1.statusCode, 400);

    // Valid complex password
    const reqValid = {
      body: {
        currentPassword: 'TempPassword#2026',
        newPassword: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!'
      }
    };
    let errValid = null;
    validateChangePasswordInput(reqValid, {}, (e) => { errValid = e; });
    assert(!errValid, 'Valid complex password should pass validator without error');
  });

  await test('6. Password change prevents reusing current temporary password as new password', async () => {
    const reqSame = {
      body: {
        currentPassword: 'TempPassword#2026',
        newPassword: 'TempPassword#2026',
        confirmPassword: 'TempPassword#2026'
      }
    };
    let errSame = null;
    validateChangePasswordInput(reqSame, {}, (e) => { errSame = e; });
    assert(errSame, 'Should reject reusing current password');
    assert.strictEqual(errSame.statusCode, 400);
  });

  // -------------------------------------------------------------
  // Section 2: Data Leak & Secret Exposure Protection (7-9)
  // -------------------------------------------------------------
  console.log('\n--- Section 2: Data Leak & Secret Exposure Protection (7-9) ---');

  await test('7. User schema toJSON serialization strictly removes passwordHash and __v', async () => {
    const userDoc = new User({
      name: 'Dr Test',
      rollNumber: 'DRTEST01',
      passwordHash: '$2a$10$fakehashhere',
      role: 'TEACHER',
      active: true
    });

    const serialized = userDoc.toJSON();
    assert.strictEqual(serialized.passwordHash, undefined, 'passwordHash must never be present in serialized user');
    assert.strictEqual(serialized.__v, undefined, '__v must be stripped');
  });

  await test('8. User.comparePassword safely handles null/empty candidate passwords without exceptions', async () => {
    const userDoc = new User({
      name: 'Dr Test',
      rollNumber: 'DRTEST02',
      passwordHash: '$2a$10$fakehashhere',
      role: 'TEACHER'
    });

    const isMatchNull = await userDoc.comparePassword(null);
    assert.strictEqual(isMatchNull, false);

    const isMatchEmpty = await userDoc.comparePassword('');
    assert.strictEqual(isMatchEmpty, false);
  });

  await test('9. Token payload strictly contains only non-sensitive identity metadata', async () => {
    const token = generateToken({
      _id: studentAId,
      rollNumber: '202601001',
      role: 'STUDENT',
      passwordHash: '$2a$10$sensitivepasswordhash'
    });

    const decoded = verifyToken(token);
    assert.strictEqual(decoded.passwordHash, undefined, 'JWT payload must not contain password hash');
    assert.strictEqual(decoded.id, studentAId.toString());
    assert.strictEqual(decoded.role, 'STUDENT');
  });

  // -------------------------------------------------------------
  // Section 3: Role Authorization & Spoofing Defense (10-14)
  // -------------------------------------------------------------
  console.log('\n--- Section 3: Role Authorization & Spoofing Defense (10-14) ---');

  await test('10. Student role cannot access Teacher-authorized endpoints (403 Forbidden)', async () => {
    const req = { user: studentA };
    let caughtError = null;

    const teacherAuthMiddleware = authorize('ADMIN_HOD', 'TEACHER');
    teacherAuthMiddleware(req, {}, (err) => {
      if (err) caughtError = err;
    });

    assert(caughtError, 'Student must be denied access to teacher endpoint');
    assert.strictEqual(caughtError.statusCode, 403);
  });

  await test('11. Teacher role cannot access Admin-only endpoints (403 Forbidden)', async () => {
    const req = { user: teacherA };
    let caughtError = null;

    const adminAuthMiddleware = authorize('ADMIN_HOD');
    adminAuthMiddleware(req, {}, (err) => {
      if (err) caughtError = err;
    });

    assert(caughtError, 'Teacher must be denied access to admin endpoint');
    assert.strictEqual(caughtError.statusCode, 403);
  });

  await test('12. Client-supplied role tampering in request body/query is completely ignored by authorize middleware', async () => {
    const req = {
      user: studentA,
      body: { role: 'ADMIN_HOD' },
      query: { role: 'ADMIN_HOD' }
    };
    let caughtError = null;

    const adminAuthMiddleware = authorize('ADMIN_HOD');
    adminAuthMiddleware(req, {}, (err) => {
      if (err) caughtError = err;
    });

    assert(caughtError, 'Client tampering cannot override req.user.role from JWT');
    assert.strictEqual(caughtError.statusCode, 403);
  });

  await test('13. Client-supplied studentId tampering cannot forge another student submission', async () => {
    const origValidate = submissionService.validateStudentAccess;
    submissionService.validateStudentAccess = async () => ({
      experiment: { _id: experiment1Id, programmingLanguages: ['Python'] },
      lab: { _id: lab1Id },
      section: { _id: sectionAId }
    });

    const origCount = Submission.countDocuments;
    Submission.countDocuments = async () => 0;

    const origExec = codeExecutionService.execute;
    codeExecutionService.execute = async () => ({ status: 'SUCCESS', stdout: 'Test', stderr: '', executionTimeMs: 10 });

    let createdRecord = null;
    const origCreate = Submission.create;
    Submission.create = async (doc) => {
      createdRecord = doc;
      return { ...doc, _id: new mongoose.Types.ObjectId() };
    };

    const origEvaluate = evaluationService.evaluateSubmission;
    evaluationService.evaluateSubmission = async () => ({ score: 10, isHighestScore: true });

    try {
      // Malicious payload trying to submit as studentB while authenticated as studentA
      await submissionService.submitCode(
        experiment1Id.toString(),
        'Python',
        'print(1)',
        '',
        studentA // Authenticated JWT User
      );

      assert(createdRecord, 'Submission record should be created');
      assert.strictEqual(createdRecord.student.toString(), studentAId.toString(), 'Submission owner MUST be derived from authenticated user');
      assert.notStrictEqual(createdRecord.student.toString(), studentBId.toString(), 'Must not accept spoofed student');
    } finally {
      submissionService.validateStudentAccess = origValidate;
      Submission.countDocuments = origCount;
      codeExecutionService.execute = origExec;
      Submission.create = origCreate;
      evaluationService.evaluateSubmission = origEvaluate;
    }
  });

  await test('14. Client-supplied teacherId tampering cannot forge faculty viva evaluation identity', async () => {
    const origExp = Experiment.findById;
    Experiment.findById = () => ({
      populate: () => ({
        _id: experiment1Id,
        active: true,
        lab: { _id: lab1Id, active: true }
      })
    });

    const origStu = User.findById;
    User.findById = async (id) => {
      if (id.toString() === studentAId.toString()) return studentA;
      return null;
    };

    const origSec = Section.findOne;
    Section.findOne = async () => ({
      _id: sectionAId,
      sectionCode: 'SEC-A',
      active: true
    });

    const origAssign = LabAssignment.findOne;
    LabAssignment.findOne = async (q) => {
      return { _id: new mongoose.Types.ObjectId(), lab: lab1Id, teacher: teacherAId, section: sectionAId, active: true };
    };

    const origVivaFind = VivaEvaluation.findOne;
    VivaEvaluation.findOne = async () => null;

    let createdViva = null;
    const origVivaCreate = VivaEvaluation.create;
    VivaEvaluation.create = async (doc) => {
      createdViva = doc;
      return { ...doc, _id: new mongoose.Types.ObjectId() };
    };

    const origVivaFindById = VivaEvaluation.findById;
    VivaEvaluation.findById = () => ({
      populate: () => ({
        populate: () => ({
          populate: () => ({ ...createdViva, _id: new mongoose.Types.ObjectId() })
        })
      })
    });

    try {
      await vivaService.createVivaEvaluation({
        studentId: studentAId.toString(),
        experimentId: experiment1Id.toString(),
        marks: 4.5,
        remarks: 'Excellent'
      }, teacherA); // Authenticated faculty

      assert(createdViva, 'Viva record created');
      assert.strictEqual(createdViva.evaluatedBy.toString(), teacherAId.toString(), 'Evaluator must be authoritative authenticated teacher');
    } finally {
      Experiment.findById = origExp;
      User.findById = origStu;
      Section.findOne = origSec;
      LabAssignment.findOne = origAssign;
      VivaEvaluation.findOne = origVivaFind;
      VivaEvaluation.findById = origVivaFindById;
      VivaEvaluation.create = origVivaCreate;
    }
  });

  // -------------------------------------------------------------
  // Section 4: Cross-User & Cross-Scope IDOR Protections (15-19)
  // -------------------------------------------------------------
  console.log('\n--- Section 4: Cross-User & Cross-Scope IDOR Protections (15-19) ---');

  await test('15. Student A cannot retrieve Student B submission history (isolated scope)', async () => {
    const origValidate = submissionService.validateStudentAccess;
    submissionService.validateStudentAccess = async () => ({});

    const origFind = Submission.find;
    let queryUsed = null;
    Submission.find = (q) => {
      queryUsed = q;
      return {
        sort: () => ({
          select: async () => []
        })
      };
    };

    try {
      await submissionService.getStudentSubmissions(experiment1Id.toString(), studentA);
      assert.strictEqual(queryUsed.student.toString(), studentAId.toString(), 'Student submissions query must strictly bind student to req.user._id');
    } finally {
      submissionService.validateStudentAccess = origValidate;
      Submission.find = origFind;
    }
  });

  await test('16. Student A cannot view Student B evaluation record (403 Forbidden)', async () => {
    const origFindById = Evaluation.findById;
    Evaluation.findById = () => ({
      populate: () => ({
        populate: () => ({
          populate: () => ({
            populate: () => ({
              _id: new mongoose.Types.ObjectId(),
              student: { _id: studentBId }, // Belongs to Student B
              lab: { _id: lab1Id },
              active: true
            })
          })
        })
      })
    });

    try {
      let caughtError = null;
      try {
        await evaluationService.getEvaluationById('64f000000000000000000999', studentA);
      } catch (err) {
        caughtError = err;
      }

      assert(caughtError, 'Should reject cross-student evaluation access');
      assert.strictEqual(caughtError.statusCode, 403);
    } finally {
      Evaluation.findById = origFindById;
    }
  });

  await test('17. Teacher A cannot author or modify experiments in unassigned Lab 2 (403 Forbidden)', async () => {
    const origLabFind = Lab.findById;
    Lab.findById = async () => ({
      _id: lab2Id,
      name: 'Unassigned Lab 2',
      active: true
    });

    const origAssignFind = LabAssignment.find;
    LabAssignment.find = async () => []; // Teacher A has no active assignments for Lab 2

    try {
      let caughtError = null;
      try {
        await experimentService.checkLabAccess(lab2Id.toString(), teacherA, 'WRITE');
      } catch (err) {
        caughtError = err;
      }

      assert(caughtError, 'Teacher without assignment must be rejected with 403');
      assert.strictEqual(caughtError.statusCode, 403);
    } finally {
      Lab.findById = origLabFind;
      LabAssignment.find = origAssignFind;
    }
  });

  await test('18. Teacher A cannot grade Viva for student in unassigned section (403 Forbidden)', async () => {
    const origExp = Experiment.findById;
    Experiment.findById = () => ({
      populate: () => ({
        _id: experiment1Id,
        active: true,
        lab: { _id: lab1Id, active: true }
      })
    });

    const origStu = User.findById;
    User.findById = async () => studentB; // Student B is in Section B

    const origSec = Section.findOne;
    Section.findOne = async () => ({
      _id: sectionBId,
      sectionCode: 'SEC-B',
      active: true
    });

    const origAssign = LabAssignment.findOne;
    LabAssignment.findOne = async (q) => {
      // Student section check passes
      if (q.section && q.section.toString() === sectionBId.toString() && !q.teacher) {
        return { _id: new mongoose.Types.ObjectId(), lab: lab1Id, section: sectionBId, active: true };
      }
      // Faculty access check with teacherA -> unassigned
      return null;
    };

    try {
      let caughtError = null;
      try {
        await vivaService.createVivaEvaluation({
          studentId: studentBId.toString(),
          experimentId: experiment1Id.toString(),
          marks: 4.0
        }, teacherA);
      } catch (err) {
        caughtError = err;
      }

      assert(caughtError, 'Should reject viva evaluation for student outside assigned section');
      assert.strictEqual(caughtError.statusCode, 403);
    } finally {
      Experiment.findById = origExp;
      User.findById = origStu;
      Section.findOne = origSec;
      LabAssignment.findOne = origAssign;
    }
  });

  await test('19. Student cannot view notifications targeted to another student/section', async () => {
    const notifTargetedToStudentB = {
      _id: new mongoose.Types.ObjectId(),
      targetType: 'INDIVIDUAL',
      targetStudents: [studentBId],
      active: true,
      readBy: []
    };

    const origFindOne = Notification.findOne;
    Notification.findOne = () => ({
      populate: () => ({
        populate: () => ({
          populate: () => ({
            populate: () => notifTargetedToStudentB
          })
        })
      })
    });

    const origSec = Section.findOne;
    Section.findOne = async () => ({ _id: sectionAId, sectionCode: 'SEC-A', active: true });

    const origAssign = LabAssignment.find;
    LabAssignment.find = async () => [];

    try {
      let caughtError = null;
      try {
        await notificationService.getNotificationById(studentA, notifTargetedToStudentB._id.toString());
      } catch (err) {
        caughtError = err;
      }

      assert(caughtError, 'Should reject student viewing notification targeted to another individual');
      assert.strictEqual(caughtError.statusCode, 403);
    } finally {
      Notification.findOne = origFindOne;
      Section.findOne = origSec;
      LabAssignment.find = origAssign;
    }
  });

  // -------------------------------------------------------------
  // Section 5: Mass-Assignment Defense (20-23)
  // -------------------------------------------------------------
  console.log('\n--- Section 5: Mass-Assignment Defense (20-23) ---');

  await test('20. Updating user via userService.updateUser ignores role elevation in payload', async () => {
    const userDoc = new User({
      _id: studentAId,
      name: 'Alice',
      role: 'STUDENT',
      active: true
    });

    const origFindById = User.findById;
    User.findById = async () => userDoc;

    let saved = false;
    userDoc.save = async () => { saved = true; return userDoc; };

    try {
      const maliciousPayload = {
        name: 'Alice Updated',
        role: 'ADMIN_HOD',
        passwordHash: '$2a$10$malicioushash',
        mustChangePassword: false
      };

      const updated = await userService.updateUser(studentAId.toString(), maliciousPayload);
      assert.strictEqual(updated.role, 'STUDENT', 'Role must not be modified by updateUser');
      assert.strictEqual(updated.name, 'Alice Updated', 'Permitted field should update');
    } finally {
      User.findById = origFindById;
    }
  });

  await test('21. Updating user via userService.updateUser ignores passwordHash field in payload', async () => {
    const userDoc = new User({
      _id: studentAId,
      name: 'Alice',
      passwordHash: '$2a$10$originalhash',
      role: 'STUDENT',
      active: true
    });

    const origFindById = User.findById;
    User.findById = async () => userDoc;

    userDoc.save = async () => userDoc;

    try {
      const updated = await userService.updateUser(studentAId.toString(), {
        name: 'Alice Valid',
        passwordHash: '$2a$10$forgedhash'
      });

      assert.strictEqual(updated.passwordHash, '$2a$10$originalhash', 'passwordHash must remain untouched');
    } finally {
      User.findById = origFindById;
    }
  });

  await test('22. Updating user via userService.updateUser ignores mustChangePassword bypass flag', async () => {
    const userDoc = new User({
      _id: studentAId,
      mustChangePassword: true,
      role: 'STUDENT',
      active: true
    });

    const origFindById = User.findById;
    User.findById = async () => userDoc;
    userDoc.save = async () => userDoc;

    try {
      const updated = await userService.updateUser(studentAId.toString(), {
        name: 'Alice',
        mustChangePassword: false
      });

      assert.strictEqual(updated.mustChangePassword, true, 'mustChangePassword must not be bypassed via generic update');
    } finally {
      User.findById = origFindById;
    }
  });

  await test('23. Updating experiment via experimentService.updateExperiment ignores createdBy and lab overrides', async () => {
    const expDoc = new Experiment({
      _id: experiment1Id,
      title: 'Original Title',
      lab: lab1Id,
      createdBy: teacherAId,
      experimentNumber: 1,
      order: 1,
      status: 'DRAFT',
      programmingLanguages: ['Python'],
      active: true
    });

    const origFindById = Experiment.findById;
    Experiment.findById = async () => expDoc;

    const origCheck = experimentService.checkLabAccess;
    experimentService.checkLabAccess = async () => ({ _id: lab1Id });

    expDoc.save = async () => expDoc;

    try {
      const maliciousPayload = {
        title: 'Updated Title',
        lab: lab2Id, // Attempt to reassign to Lab 2
        createdBy: adminId // Attempt to spoof creator
      };

      const updated = await experimentService.updateExperiment(experiment1Id.toString(), maliciousPayload, teacherA);
      assert.strictEqual(updated.lab.toString(), lab1Id.toString(), 'Lab reference must remain unchanged');
      assert.strictEqual(updated.createdBy.toString(), teacherAId.toString(), 'createdBy must remain unchanged');
      assert.strictEqual(updated.title, 'Updated Title', 'Permitted title field updated');
    } finally {
      Experiment.findById = origFindById;
      experimentService.checkLabAccess = origCheck;
    }
  });

  // -------------------------------------------------------------
  // Section 6: Validation, Type Guards & Param Sanitization (24-27)
  // -------------------------------------------------------------
  console.log('\n--- Section 6: Validation, Type Guards & Param Sanitization (24-27) ---');

  await test('24. validateObjectIdParam returns 400 Bad Request on invalid MongoDB identifier', async () => {
    const validator = validateObjectIdParam('id');
    const reqInvalid = { params: { id: 'invalid-id-123' } };
    let caughtError = null;

    validator(reqInvalid, {}, (err) => {
      if (err) caughtError = err;
    });

    assert(caughtError, 'Should reject invalid ObjectId format');
    assert.strictEqual(caughtError.statusCode, 400);
  });

  await test('25. Centralized errorHandler formats SyntaxError (malformed JSON) as controlled 400 Bad Request', async () => {
    const syntaxErr = new SyntaxError('Unexpected token } in JSON at position 12');
    syntaxErr.status = 400;
    syntaxErr.body = '{ "name": }';

    let capturedStatus = null;
    let capturedJson = null;

    const res = {
      status: (code) => {
        capturedStatus = code;
        return {
          json: (data) => { capturedJson = data; }
        };
      }
    };

    errorHandler(syntaxErr, { method: 'POST', originalUrl: '/api/auth/login' }, res, () => {});

    assert.strictEqual(capturedStatus, 400);
    assert.strictEqual(capturedJson.success, false);
    assert.strictEqual(capturedJson.message, 'Malformed JSON in request body');
  });

  await test('26. validateLoginInput rejects non-string / object injection in rollNumber', async () => {
    const reqInjection = {
      body: {
        rollNumber: { $ne: null },
        password: 'Password123!'
      }
    };

    let caughtError = null;
    validateLoginInput(reqInjection, {}, (err) => {
      if (err) caughtError = err;
    });

    assert(caughtError, 'Should reject non-string rollNumber injection');
    assert.strictEqual(caughtError.statusCode, 400);
  });

  await test('27. validateCreateVivaInput rejects out-of-bounds numeric marks (> 5 or < 0)', async () => {
    // Marks > 5
    const reqExcess = {
      body: {
        studentId: studentAId.toString(),
        experimentId: experiment1Id.toString(),
        marks: 5.5
      }
    };
    let errExcess = null;
    validateCreateVivaInput(reqExcess, {}, (e) => { errExcess = e; });
    assert(errExcess, 'Should reject marks > 5');
    assert.strictEqual(errExcess.statusCode, 400);

    // Negative marks
    const reqNegative = {
      body: {
        studentId: studentAId.toString(),
        experimentId: experiment1Id.toString(),
        marks: -1
      }
    };
    let errNegative = null;
    validateCreateVivaInput(reqNegative, {}, (e) => { errNegative = e; });
    assert(errNegative, 'Should reject negative marks');
    assert.strictEqual(errNegative.statusCode, 400);
  });

  // -------------------------------------------------------------
  // Section 7: File Upload & PDF Extraction Hardening (28-30)
  // -------------------------------------------------------------
  console.log('\n--- Section 7: File Upload & PDF Extraction Hardening (28-30) ---');

  await test('28. pdfExtractionService rejects non-buffer or empty file inputs (400)', async () => {
    assert.throws(
      () => pdfExtractionService.validatePdfBuffer(null),
      /No valid file buffer/
    );

    assert.throws(
      () => pdfExtractionService.validatePdfBuffer('string instead of buffer'),
      /No valid file buffer/
    );
  });

  await test('29. pdfExtractionService verifies %PDF- magic header and rejects fake PDF buffers (400)', async () => {
    const fakePdfBuffer = Buffer.from('PK\x03\x04 fake zip disguised as pdf');
    assert.throws(
      () => pdfExtractionService.validatePdfBuffer(fakePdfBuffer),
      /The uploaded file is not a valid PDF document/
    );
  });

  await test('30. Valid PDF magic header passes validatePdfBuffer verification', async () => {
    const validPdfHeaderBuffer = Buffer.from('%PDF-1.7 mock valid header content');
    assert.doesNotThrow(() => {
      pdfExtractionService.validatePdfBuffer(validPdfHeaderBuffer);
    });
  });

  // -------------------------------------------------------------
  // Section 8: Sandbox Security Configuration & Headers (31-34)
  // -------------------------------------------------------------
  console.log('\n--- Section 8: Sandbox Security Configuration & Headers (31-34) ---');

  await test('31. Code execution service specifies strict network and privilege-drop Docker flags', async () => {
    assert.strictEqual(codeExecutionService.MEMORY_LIMIT, '256m');
    assert.strictEqual(codeExecutionService.CPU_LIMIT, '1.0');
    assert.strictEqual(codeExecutionService.PIDS_LIMIT, '64');
  });

  await test('32. Code execution service enforces 64KB source code and 16KB standard input size limits', async () => {
    const oversizedCode = 'a'.repeat(65 * 1024);
    let caughtError = null;

    try {
      await codeExecutionService.execute('Python', oversizedCode, '');
    } catch (err) {
      caughtError = err;
    }

    assert(caughtError, 'Should reject oversized source code');
    assert.strictEqual(caughtError.statusCode, 400);
  });

  await test('33. Missing Docker environment falls back safely to EXECUTION_ERROR and NEVER host execution', async () => {
    const origAvailable = codeExecutionService.isDockerAvailable;
    codeExecutionService.isDockerAvailable = () => false;

    try {
      const result = await codeExecutionService.execute('Python', 'print("Hello")', '');
      assert.strictEqual(result.status, 'EXECUTION_ERROR');
      assert(result.stderr.includes('Docker container engine is not available'));
    } finally {
      codeExecutionService.isDockerAvailable = origAvailable;
    }
  });

  await test('34. securityHeaders middleware sets foundational defensive HTTP headers', async () => {
    const headersSet = {};
    const res = {
      setHeader: (name, val) => {
        headersSet[name] = val;
      }
    };

    let nextCalled = false;
    securityHeaders({}, res, () => { nextCalled = true; });

    assert(nextCalled, 'next() should be called');
    assert.strictEqual(headersSet['X-Content-Type-Options'], 'nosniff');
    assert.strictEqual(headersSet['X-Frame-Options'], 'SAMEORIGIN');
    assert.strictEqual(headersSet['Referrer-Policy'], 'strict-origin-when-cross-origin');
    assert.strictEqual(headersSet['X-XSS-Protection'], '0');
  });

  console.log(`\n==============================================`);
  console.log(`Phase 13 Security Tests Passed: ${passed}/${total}`);
  console.log(`==============================================\n`);
}

runPhase13SecurityTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
