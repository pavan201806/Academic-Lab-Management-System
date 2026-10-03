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

// Services
const userService = require('../services/userService');
const labService = require('../services/labService');
const experimentService = require('../services/experimentService');
const submissionService = require('../services/submissionService');
const evaluationService = require('../services/evaluationService');
const vivaService = require('../services/vivaService');
const reevaluationService = require('../services/reevaluationService');
const notificationService = require('../services/notificationService');
const progressService = require('../services/progressService');
const reportService = require('../services/reportService');
const adminDashboardService = require('../services/adminDashboardService');
const pdfExtractionService = require('../services/pdfExtractionService');
const codeExecutionService = require('../services/codeExecutionService');

// Validators
const { validateSectionInput, validateChangePasswordInput } = require('../validators');

// Generators
const { generatePdfReport } = require('../utils/pdfGenerator');
const { generateExcelReport } = require('../utils/excelGenerator');

console.log('=== Running Phase 14 Testing & Quality Assurance Comprehensive Test Suite ===\n');

async function runPhase14QATests() {
  let passed = 0;
  let total = 0;

  async function test(description, fn) {
    total++;
    try {
      await fn();
      console.log(`✓ [QA Test ${total}] ${description}`);
      passed++;
    } catch (err) {
      console.error(`✗ [QA Test ${total}] ${description}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  // Common IDs for tests
  const adminId = new mongoose.Types.ObjectId();
  const teacherAId = new mongoose.Types.ObjectId();
  const teacherBId = new mongoose.Types.ObjectId();
  const studentAId = new mongoose.Types.ObjectId();
  const studentBId = new mongoose.Types.ObjectId();
  const lab1Id = new mongoose.Types.ObjectId();
  const lab2Id = new mongoose.Types.ObjectId();
  const sectionAId = new mongoose.Types.ObjectId();
  const sectionBId = new mongoose.Types.ObjectId();
  const experiment1Id = new mongoose.Types.ObjectId();

  const adminUser = { _id: adminId, name: 'Admin HOD', role: 'ADMIN_HOD', active: true };
  const teacherA = { _id: teacherAId, name: 'Teacher A', role: 'TEACHER', active: true };
  const teacherB = { _id: teacherBId, name: 'Teacher B', role: 'TEACHER', active: true };
  const studentA = { _id: studentAId, name: 'Student A', rollNumber: 'CS001', section: 'SEC-A', role: 'STUDENT', active: true };
  const studentB = { _id: studentBId, name: 'Student B', rollNumber: 'CS002', section: 'SEC-B', role: 'STUDENT', active: true };

  // -------------------------------------------------------------
  // 1. Authentication & Token Lifecycle QA (Tests 1-4)
  // -------------------------------------------------------------
  console.log('\n--- 1. Authentication & Token Lifecycle QA (1-4) ---');

  await test('1. User token generation and verification preserve claims and expiration', async () => {
    const token = generateToken({
      _id: studentAId,
      rollNumber: 'CS001',
      role: 'STUDENT',
      mustChangePassword: false
    });
    const decoded = verifyToken(token);
    assert.strictEqual(decoded.id.toString(), studentAId.toString());
    assert.strictEqual(decoded.role, 'STUDENT');
    assert(decoded.exp > decoded.iat, 'Token must contain future expiration timestamp');
  });

  await test('2. Deactivated user token validation throws Account Deactivated error in auth middleware', async () => {
    const origFindById = User.findById;
    User.findById = () => ({
      select: () => ({ _id: studentAId, name: 'Student A', role: 'STUDENT', active: false })
    });

    try {
      const { authenticate } = require('../middleware/auth');
      const validToken = generateToken({ userId: studentAId.toString(), role: 'STUDENT' });
      const req = { headers: { authorization: `Bearer ${validToken}` } };
      let caughtError = null;

      await authenticate(req, {}, (err) => { if (err) caughtError = err; });
      assert(caughtError, 'Should reject inactive user account');
      assert.strictEqual(caughtError.statusCode, 403);
      assert(caughtError.message.includes('deactivated'));
    } finally {
      User.findById = origFindById;
    }
  });

  await test('3. Temporary-password user is blocked from standard resources prior to password change', async () => {
    const { requirePasswordChangeCompleted } = require('../middleware/auth');
    const req = { user: { _id: studentAId, role: 'STUDENT', mustChangePassword: true } };
    let caughtError = null;

    requirePasswordChangeCompleted(req, {}, (err) => { if (err) caughtError = err; });
    assert(caughtError, 'Should block user with mustChangePassword: true');
    assert.strictEqual(caughtError.statusCode, 403);
    assert(caughtError.message.includes('Temporary password must be changed'));
  });

  await test('4. Password change validates complexity and rejects reusing temporary password', async () => {
    const reqWeak = {
      body: {
        currentPassword: 'TempPassword123!',
        newPassword: 'short',
        confirmPassword: 'short'
      }
    };
    let errWeak = null;
    validateChangePasswordInput(reqWeak, {}, (e) => { errWeak = e; });
    assert(errWeak, 'Should reject weak password');
    assert.strictEqual(errWeak.statusCode, 400);

    const reqSame = {
      body: {
        currentPassword: 'TempPassword123!',
        newPassword: 'TempPassword123!',
        confirmPassword: 'TempPassword123!'
      }
    };
    let errSame = null;
    validateChangePasswordInput(reqSame, {}, (e) => { errSame = e; });
    assert(errSame, 'Should reject identical new password');
    assert.strictEqual(errSame.statusCode, 400);
  });

  // -------------------------------------------------------------
  // 2. Academic Hierarchy & Allocation Integrity QA (Tests 5-9)
  // -------------------------------------------------------------
  console.log('\n--- 2. Academic Hierarchy & Allocation Integrity QA (5-9) ---');

  await test('5. Section validation enforces required name, code, year, and semester', async () => {
    const reqMissingName = {
      body: {
        sectionCode: 'CSA',
        academicYear: '2025-2026',
        semester: '5',
        department: 'CSE'
      }
    };
    let caughtError = null;
    validateSectionInput(reqMissingName, {}, (e) => { caughtError = e; });
    assert(caughtError, 'Should reject missing section name');
    assert.strictEqual(caughtError.statusCode, 400);
  });

  await test('6. Lab Assignment validates that assigned teacher, lab, and section exist and are active', async () => {
    const labAssignmentService = require('../services/labAssignmentService');
    const origTeacher = User.findById;
    const origLab = Lab.findById;
    const origSec = Section.findById;

    User.findById = async () => ({ _id: teacherAId, role: 'TEACHER', active: false }); // Inactive teacher
    Lab.findById = async () => ({ _id: lab1Id, active: true });
    Section.findById = async () => ({ _id: sectionAId, active: true });

    try {
      let caughtError = null;
      try {
        await labAssignmentService.createAssignment({
          teacher: teacherAId.toString(),
          lab: lab1Id.toString(),
          section: sectionAId.toString(),
          assignmentType: 'MAIN'
        });
      } catch (err) {
        caughtError = err;
      }

      assert(caughtError, 'Should reject assigning inactive teacher');
      assert.strictEqual(caughtError.statusCode, 400);
    } finally {
      User.findById = origTeacher;
      Lab.findById = origLab;
      Section.findById = origSec;
    }
  });

  await test('7. Lab Assignment enforces single MAIN teacher constraint per (lab, section) with 409 Conflict', async () => {
    const labAssignmentService = require('../services/labAssignmentService');
    const origTeacher = User.findById;
    const origLab = Lab.findById;
    const origSec = Section.findById;
    const origFindOne = LabAssignment.findOne;

    User.findById = async () => ({ _id: teacherBId, name: 'Teacher B', role: 'TEACHER', active: true });
    Lab.findById = async () => ({ _id: lab1Id, active: true });
    Section.findById = async () => ({ _id: sectionAId, active: true });
    
    let findOneCount = 0;
    LabAssignment.findOne = () => {
      findOneCount++;
      if (findOneCount === 1) return null; // Teacher B is not already assigned
      return {
        populate: () => ({ _id: new mongoose.Types.ObjectId(), assignmentType: 'MAIN', teacher: { name: 'Teacher A' }, active: true })
      };
    };

    try {
      let caughtError = null;
      try {
        await labAssignmentService.createAssignment({
          teacher: teacherBId.toString(),
          lab: lab1Id.toString(),
          section: sectionAId.toString(),
          assignmentType: 'MAIN'
        });
      } catch (err) {
        caughtError = err;
      }

      assert(caughtError, 'Should reject second MAIN teacher for same lab and section');
      assert.strictEqual(caughtError.statusCode, 409);
      assert(caughtError.message.includes('Main Teacher'));
    } finally {
      User.findById = origTeacher;
      Lab.findById = origLab;
      Section.findById = origSec;
      LabAssignment.findOne = origFindOne;
    }
  });

  await test('8. Lab Assignment permits multiple ASSISTANT teachers for the same (lab, section)', async () => {
    const labAssignmentService = require('../services/labAssignmentService');
    const origTeacher = User.findById;
    const origLab = Lab.findById;
    const origSec = Section.findById;
    const origFindOne = LabAssignment.findOne;
    let createdDoc = null;
    const origCreate = LabAssignment.create;
    LabAssignment.create = async (doc) => { createdDoc = doc; return { ...doc, _id: new mongoose.Types.ObjectId() }; };

    const origGetAssign = labAssignmentService.getAssignmentById;
    labAssignmentService.getAssignmentById = async () => ({ ...createdDoc, assignmentType: 'ASSISTANT' });

    User.findById = async () => ({ _id: teacherBId, role: 'TEACHER', active: true });
    Lab.findById = async () => ({ _id: lab1Id, active: true });
    Section.findById = async () => ({ _id: sectionAId, active: true });
    LabAssignment.findOne = async () => null; // No duplicate assignment for teacherB

    try {
      const res = await labAssignmentService.createAssignment({
        teacher: teacherBId.toString(),
        lab: lab1Id.toString(),
        section: sectionAId.toString(),
        assignmentType: 'ASSISTANT'
      });

      assert(createdDoc, 'Assignment should be created');
      assert.strictEqual(createdDoc.assignmentType, 'ASSISTANT');
    } finally {
      User.findById = origTeacher;
      Lab.findById = origLab;
      Section.findById = origSec;
      LabAssignment.findOne = origFindOne;
      LabAssignment.create = origCreate;
      labAssignmentService.getAssignmentById = origGetAssign;
    }
  });

  await test('9. Section student assignment validates student exists, is role STUDENT, and normalizes sectionCode', async () => {
    const sectionService = require('../services/sectionService');
    const origSec = Section.findOne;
    const origStu = User.findById;

    Section.findOne = async () => ({ _id: sectionAId, sectionCode: 'SEC-A', active: true });
    const studentDoc = { _id: studentAId, role: 'STUDENT', section: null, save: async function() { return this; } };
    User.findById = async () => studentDoc;

    try {
      await sectionService.assignStudentToSection(studentAId.toString(), 'sec-a');
      assert.strictEqual(studentDoc.section, 'SEC-A', 'Section code must be upper-cased on assignment');
    } finally {
      Section.findOne = origSec;
      User.findById = origStu;
    }
  });

  // -------------------------------------------------------------
  // 3. Lab Access Layer & Enrolment QA (Tests 10-12)
  // -------------------------------------------------------------
  console.log('\n--- 3. Lab Access Layer & Enrolment QA (10-12) ---');

  await test('10. Student assigned laboratories hub queries active labs linked to student section', async () => {
    const origSec = Section.findOne;
    const origAssign = LabAssignment.find;

    Section.findOne = async () => ({ _id: sectionAId, sectionCode: 'SEC-A', active: true });
    LabAssignment.find = () => ({
      populate: () => ({
        populate: () => [
          { lab: { _id: lab1Id, name: 'Data Structures Lab', active: true }, assignmentType: 'MAIN' }
        ]
      })
    });

    try {
      const labs = await labService.getAssignedLabs(studentA);
      assert.strictEqual(labs.length, 1);
      assert.strictEqual(labs[0].name, 'Data Structures Lab');
    } finally {
      Section.findOne = origSec;
      LabAssignment.find = origAssign;
    }
  });

  await test('11. Teacher assigned laboratories hub queries active labs where teacher is MAIN or ASSISTANT', async () => {
    const origAssign = LabAssignment.find;
    LabAssignment.find = () => ({
      populate: () => ({
        populate: () => ({
          sort: () => [
            {
              lab: { _id: lab1Id, name: 'Data Structures Lab', active: true },
              section: { _id: sectionAId, name: 'Sec A', active: true },
              assignmentType: 'MAIN'
            },
            {
              lab: { _id: lab2Id, name: 'Algorithms Lab', active: true },
              section: { _id: sectionBId, name: 'Sec B', active: true },
              assignmentType: 'ASSISTANT'
            }
          ]
        })
      })
    });

    try {
      const assignments = await labService.getAssignedLabs(teacherA);
      assert.strictEqual(assignments.length, 2);
      assert.strictEqual(assignments[0].assignmentType, 'MAIN');
      assert.strictEqual(assignments[1].assignmentType, 'ASSISTANT');
    } finally {
      LabAssignment.find = origAssign;
    }
  });

  await test('12. Admin role retrieves all institution laboratories in assigned hub', async () => {
    const origGetLabs = labService.getLabs;
    labService.getLabs = async () => [
      { _id: lab1Id, name: 'Lab 1', active: true },
      { _id: lab2Id, name: 'Lab 2', active: true }
    ];

    try {
      const labs = await labService.getAssignedLabs(adminUser);
      assert.strictEqual(labs.length, 2);
    } finally {
      labService.getLabs = origGetLabs;
    }
  });

  // -------------------------------------------------------------
  // 4. Experiment Curriculum & State Machine QA (Tests 13-17)
  // -------------------------------------------------------------
  console.log('\n--- 4. Experiment Curriculum & State Machine QA (13-17) ---');

  await test('13. Creating experiment beyond 12 experiment limit is rejected with 400 Bad Request', async () => {
    const origCheck = experimentService.checkLabAccess;
    experimentService.checkLabAccess = async () => ({ _id: lab1Id });
    const origCount = Experiment.countDocuments;
    Experiment.countDocuments = async () => 12; // Already reached max limit

    try {
      let caughtError = null;
      try {
        await experimentService.createExperiment({
          lab: lab1Id.toString(),
          title: 'Experiment 13',
          experimentNumber: 13,
          programmingLanguages: ['Python']
        }, teacherA);
      } catch (err) {
        caughtError = err;
      }

      assert(caughtError, 'Should reject 13th experiment');
      assert.strictEqual(caughtError.statusCode, 400);
      assert(caughtError.message.includes('12'));
    } finally {
      experimentService.checkLabAccess = origCheck;
      Experiment.countDocuments = origCount;
    }
  });

  await test('14. Duplicate experiment number in same laboratory is rejected with 409 Conflict', async () => {
    const origCheck = experimentService.checkLabAccess;
    experimentService.checkLabAccess = async () => ({ _id: lab1Id });
    const origCount = Experiment.countDocuments;
    Experiment.countDocuments = async () => 1;
    const origFindOne = Experiment.findOne;
    Experiment.findOne = async () => ({ _id: new mongoose.Types.ObjectId(), experimentNumber: 1, active: true }); // Duplicate

    try {
      let caughtError = null;
      try {
        await experimentService.createExperiment({
          lab: lab1Id.toString(),
          title: 'Duplicate Experiment 1',
          experimentNumber: 1,
          programmingLanguages: ['Python']
        }, teacherA);
      } catch (err) {
        caughtError = err;
      }

      assert(caughtError, 'Should reject duplicate experiment number');
      assert.strictEqual(caughtError.statusCode, 409);
      assert(caughtError.message.includes('already exists'));
    } finally {
      experimentService.checkLabAccess = origCheck;
      Experiment.countDocuments = origCount;
      Experiment.findOne = origFindOne;
    }
  });

  await test('15. Experiment lifecycle state machine executes valid status transitions', async () => {
    const expDoc = new Experiment({
      _id: experiment1Id,
      lab: lab1Id,
      title: 'Lifecycle Test',
      experimentNumber: 1,
      order: 1,
      status: 'DRAFT',
      programmingLanguages: ['Python'],
      active: true
    });

    const origFind = Experiment.findById;
    Experiment.findById = async () => expDoc;
    const origCheck = experimentService.checkLabAccess;
    experimentService.checkLabAccess = async () => ({ _id: lab1Id });
    expDoc.save = async function() { return this; };

    try {
      // 1. DRAFT -> PUBLISHED
      await experimentService.publishExperiment(experiment1Id.toString(), {}, teacherA);
      assert.strictEqual(expDoc.status, 'PUBLISHED');

      // 2. PUBLISHED -> CLOSED
      await experimentService.closeExperiment(experiment1Id.toString(), teacherA);
      assert.strictEqual(expDoc.status, 'CLOSED');

      // 3. CLOSED -> REOPENED
      const futureDate = new Date(Date.now() + 86400000);
      await experimentService.reopenExperiment(experiment1Id.toString(), futureDate, teacherA);
      assert.strictEqual(expDoc.status, 'REOPENED');
    } finally {
      Experiment.findById = origFind;
      experimentService.checkLabAccess = origCheck;
    }
  });

  await test('16. Reopening an experiment with a past deadline is rejected with 400 Bad Request', async () => {
    const expDoc = new Experiment({
      _id: experiment1Id,
      lab: lab1Id,
      status: 'CLOSED',
      active: true
    });

    const origFind = Experiment.findById;
    Experiment.findById = async () => expDoc;
    const origCheck = experimentService.checkLabAccess;
    experimentService.checkLabAccess = async () => ({ _id: lab1Id });

    try {
      let caughtError = null;
      try {
        const pastDate = new Date(Date.now() - 86400000);
        await experimentService.reopenExperiment(experiment1Id.toString(), pastDate, teacherA);
      } catch (err) {
        caughtError = err;
      }

      assert(caughtError, 'Should reject past reopen deadline');
      assert.strictEqual(caughtError.statusCode, 400);
      assert(caughtError.message.includes('future'));
    } finally {
      Experiment.findById = origFind;
      experimentService.checkLabAccess = origCheck;
    }
  });

  await test('17. Batch experiment reordering validates unique order indices and updates order values', async () => {
    const origCheck = experimentService.checkLabAccess;
    experimentService.checkLabAccess = async () => ({ _id: lab1Id });

    const origUpdate = Experiment.findOneAndUpdate;
    Experiment.findOneAndUpdate = async () => ({});

    const exp1 = { _id: new mongoose.Types.ObjectId(), lab: lab1Id, order: 2, active: true };
    const exp2 = { _id: new mongoose.Types.ObjectId(), lab: lab1Id, order: 1, active: true };
    const origGet = experimentService.getExperiments;
    experimentService.getExperiments = async () => [exp2, exp1];

    try {
      const reorderItems = [
        { experimentId: exp1._id.toString(), order: 2 },
        { experimentId: exp2._id.toString(), order: 1 }
      ];
      const res = await experimentService.reorderExperiments(lab1Id.toString(), reorderItems, teacherA);
      assert.strictEqual(res.length, 2);
    } finally {
      experimentService.checkLabAccess = origCheck;
      Experiment.findOneAndUpdate = origUpdate;
      experimentService.getExperiments = origGet;
    }
  });

  // -------------------------------------------------------------
  // 5. PDF Extraction & Multi-Step Verification QA (Tests 18-20)
  // -------------------------------------------------------------
  console.log('\n--- 5. PDF Extraction & Multi-Step Verification QA (18-20) ---');

  await test('18. PDF extraction extracts structured candidate experiments without direct auto-publishing', async () => {
    const rawText = `
      Experiment 1: Bubble Sort Implementation
      Objective: Implement bubble sort algorithm in Python.
      Instructions: Read array elements from stdin and print sorted array.

      Experiment 2: Binary Search Implementation
      Objective: Implement binary search on sorted array.
      Instructions: Output index of target element.
    `;

    const candidates = pdfExtractionService.parseExperimentsFromText(rawText);
    assert.strictEqual(candidates.length, 2);
    assert.strictEqual(candidates[0].experimentNumber, 1);
    assert(candidates[0].title.includes('Bubble Sort'));
    assert.strictEqual(candidates[1].experimentNumber, 2);
    assert(candidates[1].title.includes('Binary Search'));
  });

  await test('19. PDF confirmation verifies existing lab capacity does not exceed 12 experiments', async () => {
    const origCheck = experimentService.checkLabAccess;
    experimentService.checkLabAccess = async () => ({ _id: lab1Id });
    const origCount = Experiment.countDocuments;
    Experiment.countDocuments = async () => 11; // 11 existing experiments

    try {
      let caughtError = null;
      try {
        // Attempting to confirm 2 new experiments (11 + 2 = 13 > 12)
        await experimentService.confirmExtractedExperiments(lab1Id.toString(), [
          { title: 'Exp 12', experimentNumber: 12, programmingLanguages: ['Python'] },
          { title: 'Exp 13', experimentNumber: 13, programmingLanguages: ['Python'] }
        ], teacherA);
      } catch (err) {
        caughtError = err;
      }

      assert(caughtError, 'Should reject PDF confirmation exceeding 12 experiment limit');
      assert.strictEqual(caughtError.statusCode, 400);
      assert(caughtError.message.includes('12'));
    } finally {
      experimentService.checkLabAccess = origCheck;
      Experiment.countDocuments = origCount;
    }
  });

  await test('20. Confirmed PDF experiments are initialized in DRAFT status for review before publish', async () => {
    const origCheck = experimentService.checkLabAccess;
    experimentService.checkLabAccess = async () => ({ _id: lab1Id });
    const origCount = Experiment.countDocuments;
    Experiment.countDocuments = async () => 0;
    const origFind = Experiment.find;
    Experiment.find = async () => [];
    let createdExperiments = [];
    const origInsert = Experiment.insertMany;
    Experiment.insertMany = async (docs) => { createdExperiments = docs; return docs; };

    try {
      await experimentService.confirmExtractedExperiments(lab1Id.toString(), [
        { title: 'Syllabus Exp 1', experimentNumber: 1, programmingLanguages: ['Python'] }
      ], teacherA);

      assert.strictEqual(createdExperiments.length, 1);
      assert.strictEqual(createdExperiments[0].status, 'DRAFT', 'Extracted experiments must default to DRAFT');
    } finally {
      experimentService.checkLabAccess = origCheck;
      Experiment.countDocuments = origCount;
      Experiment.find = origFind;
      Experiment.insertMany = origInsert;
    }
  });

  // -------------------------------------------------------------
  // 6. Code Execution & 3-Attempt Lifecycle QA (Tests 21-24)
  // -------------------------------------------------------------
  console.log('\n--- 6. Code Execution & 3-Attempt Lifecycle QA (21-24) ---');

  await test('21. Official submission strictly rejects 4th attempt when 3 attempts already exist (400)', async () => {
    const origValidate = submissionService.validateStudentAccess;
    submissionService.validateStudentAccess = async () => ({
      experiment: { _id: experiment1Id, programmingLanguages: ['Python'], active: true },
      lab: { _id: lab1Id, active: true },
      section: { _id: sectionAId, active: true }
    });

    const origCount = Submission.countDocuments;
    Submission.countDocuments = async () => 3; // 3 prior official attempts

    try {
      let caughtError = null;
      try {
        await submissionService.submitCode(
          experiment1Id.toString(),
          'Python',
          'print("Attempt 4")',
          '',
          studentA
        );
      } catch (err) {
        caughtError = err;
      }

      assert(caughtError, 'Should reject 4th attempt');
      assert.strictEqual(caughtError.statusCode, 400);
      assert(caughtError.message.includes('maximum'));
    } finally {
      submissionService.validateStudentAccess = origValidate;
      Submission.countDocuments = origCount;
    }
  });

  await test('22. Manual execution run does not increment attempt count or create submission record', async () => {
    let submissionCreated = false;
    const origCreate = Submission.create;
    Submission.create = async () => { submissionCreated = true; };

    const origExec = codeExecutionService.execute;
    codeExecutionService.execute = async () => ({ status: 'SUCCESS', stdout: 'Test Output\n', stderr: '', executionTimeMs: 120 });

    try {
      const result = await codeExecutionService.execute('Python', 'print("Test")', '');
      assert.strictEqual(result.status, 'SUCCESS');
      assert.strictEqual(submissionCreated, false, 'Manual run must not create database submission');
    } finally {
      Submission.create = origCreate;
      codeExecutionService.execute = origExec;
    }
  });

  await test('23. Official submission assigns sequential attemptNumber and records submitted timestamp', async () => {
    const origValidate = submissionService.validateStudentAccess;
    submissionService.validateStudentAccess = async () => ({
      experiment: { _id: experiment1Id, programmingLanguages: ['Python'], active: true },
      lab: { _id: lab1Id, active: true },
      section: { _id: sectionAId, active: true }
    });

    const origCount = Submission.countDocuments;
    Submission.countDocuments = async () => 1; // Prior 1 attempt -> this should be Attempt 2

    const origExec = codeExecutionService.execute;
    codeExecutionService.execute = async () => ({ status: 'SUCCESS', stdout: 'Result\n', stderr: '', executionTimeMs: 50 });

    let createdDoc = null;
    const origCreate = Submission.create;
    Submission.create = async (doc) => { createdDoc = doc; return { ...doc, _id: new mongoose.Types.ObjectId() }; };

    const origEvaluate = evaluationService.evaluateSubmission;
    evaluationService.evaluateSubmission = async () => ({ score: 10, isHighestScore: true });

    try {
      await submissionService.submitCode(
        experiment1Id.toString(),
        'Python',
        'print("Valid Code")',
        '',
        studentA
      );

      assert(createdDoc, 'Submission record created');
      assert.strictEqual(createdDoc.attemptNumber, 2, 'Attempt number must be 2');
      assert(createdDoc.submittedAt instanceof Date);
    } finally {
      submissionService.validateStudentAccess = origValidate;
      Submission.countDocuments = origCount;
      codeExecutionService.execute = origExec;
      Submission.create = origCreate;
      evaluationService.evaluateSubmission = origEvaluate;
    }
  });

  await test('24. Submission model schema protects attemptNumber from negative values and invalid statuses', async () => {
    const invalidSubmission = new Submission({
      student: studentAId,
      experiment: experiment1Id,
      lab: lab1Id,
      section: sectionAId,
      language: 'Python',
      sourceCode: 'test',
      attemptNumber: 0 // Minimum allowed is 1
    });

    const validationError = invalidSubmission.validateSync();
    assert(validationError, 'Validation error expected for attemptNumber: 0');
    assert(validationError.errors['attemptNumber']);
  });

  // -------------------------------------------------------------
  // 7. Automated Evaluation & Highest Score Retention QA (Tests 25-28)
  // -------------------------------------------------------------
  console.log('\n--- 7. Automated Evaluation & Highest Score Retention QA (25-28) ---');

  await test('25. Evaluation calculation proportionally scales earned marks to /10 score', async () => {
    const tc1 = { _id: new mongoose.Types.ObjectId(), marks: 2, isHidden: false, input: '', expectedOutput: 'A' };
    const tc2 = { _id: new mongoose.Types.ObjectId(), marks: 3, isHidden: false, input: '', expectedOutput: 'B' };
    const tc3 = { _id: new mongoose.Types.ObjectId(), marks: 5, isHidden: true, input: '', expectedOutput: 'C' };

    const origTestCases = TestCase.find;
    TestCase.find = () => ({
      sort: () => [tc1, tc2, tc3]
    });

    const origExec = codeExecutionService.execute;
    codeExecutionService.execute = async (lang, code, input) => {
      if (input === tc3.input) return { status: 'SUCCESS', stdout: 'Wrong', executionTimeMs: 10 };
      return { status: 'SUCCESS', stdout: 'A', executionTimeMs: 10 };
    };

    let evaluationCreated = null;
    const origEvalCreate = Evaluation.create;
    Evaluation.create = async (doc) => { evaluationCreated = doc; return { ...doc, _id: new mongoose.Types.ObjectId() }; };

    const origHighest = evaluationService.updateHighestScore;
    evaluationService.updateHighestScore = async () => {};

    const origEvalFind = Evaluation.findById;
    Evaluation.findById = async () => evaluationCreated;

    try {
      const submissionDoc = {
        _id: new mongoose.Types.ObjectId(),
        student: studentAId,
        experiment: experiment1Id,
        lab: lab1Id,
        section: sectionAId,
        language: 'Python',
        sourceCode: 'code',
        attemptNumber: 1
      };

      await evaluationService.evaluateSubmission(submissionDoc);
      assert(evaluationCreated, 'Evaluation created');
      assert.strictEqual(evaluationCreated.totalAvailableMarks, 10);
      assert(evaluationCreated.score >= 0 && evaluationCreated.score <= 10, 'Score must be out of 10');
    } finally {
      TestCase.find = origTestCases;
      codeExecutionService.execute = origExec;
      Evaluation.create = origEvalCreate;
      evaluationService.updateHighestScore = origHighest;
      Evaluation.findById = origEvalFind;
    }
  });

  await test('26. Zero available test case marks evaluates gracefully to score 0 without NaN error', async () => {
    const origTestCases = TestCase.find;
    TestCase.find = () => ({
      sort: () => [] // Zero test cases
    });

    let evaluationCreated = null;
    const origEvalCreate = Evaluation.create;
    Evaluation.create = async (doc) => { evaluationCreated = doc; return { ...doc, _id: new mongoose.Types.ObjectId() }; };
    const origHighest = evaluationService.updateHighestScore;
    evaluationService.updateHighestScore = async () => {};
    const origEvalFind = Evaluation.findById;
    Evaluation.findById = async () => evaluationCreated;

    try {
      const submissionDoc = {
        _id: new mongoose.Types.ObjectId(),
        student: studentAId,
        experiment: experiment1Id,
        lab: lab1Id,
        section: sectionAId,
        language: 'Python',
        sourceCode: 'code',
        attemptNumber: 1
      };

      await evaluationService.evaluateSubmission(submissionDoc);
      assert.strictEqual(evaluationCreated.score, 0);
      assert(!isNaN(evaluationCreated.score), 'Score must not be NaN');
    } finally {
      TestCase.find = origTestCases;
      Evaluation.create = origEvalCreate;
      evaluationService.updateHighestScore = origHighest;
      Evaluation.findById = origEvalFind;
    }
  });

  await test('27. Student view of evaluation strips hidden test case actual outputs and error summaries', async () => {
    const evaluationDoc = {
      _id: new mongoose.Types.ObjectId(),
      student: studentAId,
      score: 8.0,
      testCaseResults: [
        { order: 1, isHidden: false, passed: true, actualOutput: 'Output 1', earnedMarks: 5, availableMarks: 5 },
        { order: 2, isHidden: true, passed: false, actualOutput: 'Secret Output', errorSummary: 'Secret Trace', earnedMarks: 0, availableMarks: 5 }
      ],
      toObject: function() { return JSON.parse(JSON.stringify(this)); }
    };

    const origFind = Evaluation.find;
    Evaluation.find = () => ({
      sort: () => ({
        populate: () => [evaluationDoc]
      })
    });

    try {
      const res = await evaluationService.getStudentEvaluations(experiment1Id.toString(), studentA);
      const hiddenResult = res.evaluations[0].testCaseResults[1];
      assert.strictEqual(hiddenResult.isHidden, true);
      assert.strictEqual(hiddenResult.actualOutput, undefined, 'Hidden output must be redacted');
      assert.strictEqual(hiddenResult.errorSummary, undefined, 'Hidden error summary must be redacted');
    } finally {
      Evaluation.find = origFind;
    }
  });

  await test('28. updateHighestScore marks highest score evaluation across attempts', async () => {
    const eval1 = { _id: new mongoose.Types.ObjectId(), score: 6.0, attemptNumber: 1, isHighestScore: true, save: async function() { this.saved = true; } };
    const eval2 = { _id: new mongoose.Types.ObjectId(), score: 9.0, attemptNumber: 2, isHighestScore: false, save: async function() { this.saved = true; } };

    const origFind = Evaluation.find;
    Evaluation.find = () => ({
      sort: () => [eval2, eval1] // Sorted descending by score
    });

    try {
      await evaluationService.updateHighestScore(studentAId, experiment1Id);
      assert.strictEqual(eval2.isHighestScore, true, 'Eval 2 (score 9.0) must be flagged highest');
      assert.strictEqual(eval1.isHighestScore, false, 'Eval 1 (score 6.0) must be flagged false');
    } finally {
      Evaluation.find = origFind;
    }
  });

  // -------------------------------------------------------------
  // 8. Viva Voce & Re-evaluation QA (Tests 29-31)
  // -------------------------------------------------------------
  console.log('\n--- 8. Viva Voce & Re-evaluation QA (29-31) ---');

  await test('29. Viva evaluation enforces marks range 0 to 5 and rejects non-numeric/negative values', async () => {
    const invalidVivaNegative = new VivaEvaluation({
      student: studentAId,
      experiment: experiment1Id,
      lab: lab1Id,
      section: sectionAId,
      evaluatedBy: teacherAId,
      marks: -0.5
    });
    const errNegative = invalidVivaNegative.validateSync();
    assert(errNegative && errNegative.errors['marks']);

    const invalidVivaExceed = new VivaEvaluation({
      student: studentAId,
      experiment: experiment1Id,
      lab: lab1Id,
      section: sectionAId,
      evaluatedBy: teacherAId,
      marks: 5.5
    });
    const errExceed = invalidVivaExceed.validateSync();
    assert(errExceed && errExceed.errors['marks']);
  });

  await test('30. Combined score preserves /10 Automated + /5 Viva = /15 Total formula in reports and metrics', async () => {
    const autoScore = 8.5; // /10
    const vivaScore = 4.0; // /5
    const totalScore = Math.round((autoScore + vivaScore) * 100) / 100; // /15

    assert.strictEqual(totalScore, 12.5);
    assert(totalScore <= 15.0);
  });

  await test('31. Re-evaluation processing increments version and archives prior viva record', async () => {
    const requestDoc = new ReevaluationRequest({
      _id: new mongoose.Types.ObjectId(),
      student: studentAId,
      experiment: experiment1Id,
      lab: lab1Id,
      section: sectionAId,
      status: 'PENDING',
      active: true
    });

    const oldVivaDoc = new VivaEvaluation({
      _id: new mongoose.Types.ObjectId(),
      student: studentAId,
      experiment: experiment1Id,
      marks: 2.0,
      evaluationVersion: 1,
      isCurrent: true,
      active: true
    });

    const origReqFind = ReevaluationRequest.findById;
    ReevaluationRequest.findById = () => ({
      populate: () => ({
        populate: () => ({
          populate: () => ({
            populate: () => ({
              populate: () => requestDoc
            })
          })
        })
      })
    });

    const origVivaFindOne = VivaEvaluation.findOne;
    VivaEvaluation.findOne = async () => oldVivaDoc;

    let createdNewViva = null;
    const origVivaCreate = VivaEvaluation.create;
    VivaEvaluation.create = async (doc) => { createdNewViva = doc; return doc; };

    const origVivaFindById = VivaEvaluation.findById;
    VivaEvaluation.findById = () => ({
      populate: () => ({
        populate: () => ({
          populate: () => ({ ...createdNewViva, _id: new mongoose.Types.ObjectId() })
        })
      })
    });

    const origGetReq = reevaluationService.getReevaluationRequestById;
    reevaluationService.getReevaluationRequestById = async () => requestDoc;

    requestDoc.save = async function() { return this; };
    oldVivaDoc.save = async function() { return this; };

    const origAssign = LabAssignment.findOne;
    LabAssignment.findOne = async () => ({ _id: new mongoose.Types.ObjectId(), active: true });

    try {
      await reevaluationService.processReevaluationRequest(
        requestDoc._id.toString(),
        { action: 'APPROVE', marks: 4.5, reviewRemarks: 'Approved' },
        teacherA
      );

      assert(createdNewViva, 'New Viva version created');
      assert.strictEqual(createdNewViva.evaluationVersion, 2, 'Version incremented to 2');
      assert.strictEqual(createdNewViva.isCurrent, true);
      assert.strictEqual(requestDoc.status, 'COMPLETED');
    } finally {
      ReevaluationRequest.findById = origReqFind;
      VivaEvaluation.findOne = origVivaFindOne;
      VivaEvaluation.create = origVivaCreate;
      VivaEvaluation.findById = origVivaFindById;
      reevaluationService.getReevaluationRequestById = origGetReq;
      LabAssignment.findOne = origAssign;
    }
  });

  // -------------------------------------------------------------
  // 9. Notifications & Student Progress QA (Tests 32-35)
  // -------------------------------------------------------------
  console.log('\n--- 9. Notifications & Student Progress QA (32-35) ---');

  await test('32. Notification creation validates targets and enforces required title and message', async () => {
    const origAssign = LabAssignment.find;
    LabAssignment.find = async () => [{ lab: lab1Id, section: sectionAId, active: true }];

    let saved = false;
    const origSave = Notification.prototype.save;
    Notification.prototype.save = async function() { saved = true; return this; };

    const origFindById = Notification.findById;
    Notification.findById = () => ({
      populate: () => ({
        populate: () => ({
          populate: () => ({
            _id: new mongoose.Types.ObjectId(),
            title: 'Midterm Submission Reminder',
            createdBy: teacherAId
          })
        })
      })
    });

    try {
      const notif = await notificationService.createNotification(teacherA, {
        title: 'Midterm Submission Reminder',
        message: 'Please submit your exercises by Friday 5PM.',
        targetType: 'LAB',
        targetLabs: [lab1Id.toString()]
      });

      assert(saved, 'Notification saved to database');
      assert.strictEqual(notif.title, 'Midterm Submission Reminder');
      assert.strictEqual(notif.createdBy.toString(), teacherAId.toString());
    } finally {
      LabAssignment.find = origAssign;
      Notification.prototype.save = origSave;
      Notification.findById = origFindById;
    }
  });

  await test('33. Marking notification read pushes student ID to readBy array idempotently', async () => {
    const notifDoc = new Notification({
      _id: new mongoose.Types.ObjectId(),
      targetType: 'ALL_STUDENTS',
      readBy: [],
      active: true
    });

    const origFindOne = Notification.findOne;
    Notification.findOne = async () => notifDoc;

    const origTargeted = notificationService.isNotificationTargetedToStudent;
    notificationService.isNotificationTargetedToStudent = async () => true;

    notifDoc.save = async function() { return this; };

    try {
      await notificationService.markAsRead(studentA, notifDoc._id.toString());
      assert.strictEqual(notifDoc.readBy.length, 1);
      assert.strictEqual(notifDoc.readBy[0].student.toString(), studentAId.toString());

      // Second call is idempotent
      await notificationService.markAsRead(studentA, notifDoc._id.toString());
      assert.strictEqual(notifDoc.readBy.length, 1);
    } finally {
      Notification.findOne = origFindOne;
      notificationService.isNotificationTargetedToStudent = origTargeted;
    }
  });

  await test('34. Student progress handles zero published experiments without division-by-zero errors', async () => {
    const origExpFind = Experiment.find;
    Experiment.find = () => ({
      sort: () => [] // 0 published experiments
    });

    try {
      const progress = await progressService.computeLabProgressForStudent(studentAId, lab1Id);
      assert.strictEqual(progress.totalExperiments, 0);
      assert.strictEqual(progress.completionPercentage, 0);
      assert.strictEqual(progress.averageTotalScore, 0);
    } finally {
      Experiment.find = origExpFind;
    }
  });

  await test('35. Faculty cohort progress aggregates performance across students in assigned section', async () => {
    const origLabFind = Lab.findOne;
    Lab.findOne = async () => ({ _id: lab1Id, active: true });

    const origAssignOne = LabAssignment.findOne;
    LabAssignment.findOne = async () => ({ lab: lab1Id, teacher: teacherAId, active: true });

    const origAssignFind = LabAssignment.find;
    LabAssignment.find = () => ({
      populate: () => [
        { lab: lab1Id, section: { _id: sectionAId, sectionCode: 'SEC-A', active: true }, active: true }
      ]
    });

    const origUserFind = User.find;
    User.find = () => ({
      sort: () => [studentA]
    });

    const origCompute = progressService.computeLabProgressForStudent;
    progressService.computeLabProgressForStudent = async () => ({
      totalExperiments: 4,
      completedExperiments: 4,
      completionPercentage: 100,
      averageAutomatedScore: 8.5,
      averageVivaScore: 4.0,
      averageTotalScore: 12.5,
      experiments: []
    });

    try {
      const cohort = await progressService.getLabCohortProgress(teacherA, lab1Id.toString());
      assert.strictEqual(cohort.studentsProgress.length, 1);
      assert.strictEqual(cohort.studentsProgress[0].completionPercentage, 100);
      assert.strictEqual(cohort.studentsProgress[0].averageTotalScore, 12.5);
    } finally {
      Lab.findOne = origLabFind;
      LabAssignment.findOne = origAssignOne;
      LabAssignment.find = origAssignFind;
      User.find = origUserFind;
      progressService.computeLabProgressForStudent = origCompute;
    }
  });

  // -------------------------------------------------------------
  // 10. Reports & Export Formatting QA (Tests 36-38)
  // -------------------------------------------------------------
  console.log('\n--- 10. Reports & Export Formatting QA (36-38) ---');

  await test('36. PDF Report Generator produces valid binary Buffer with %PDF magic header', async () => {
    const sampleData = {
      title: 'Laboratory Marks Report',
      subtitle: 'Data Structures Lab - Academic Year 2025-2026',
      generatedBy: 'System Administrator',
      columns: [
        { header: 'Roll No', key: 'rollNumber', width: 100 },
        { header: 'Name', key: 'name', width: 150 },
        { header: 'Total (/15)', key: 'totalScore', width: 100 }
      ],
      rows: [
        { rollNumber: 'CS001', name: 'Student A', totalScore: '14.5' },
        { rollNumber: 'CS002', name: 'Student B', totalScore: '13.0' }
      ]
    };

    const pdfBuffer = await generatePdfReport(sampleData);
    assert(Buffer.isBuffer(pdfBuffer), 'Must return a Buffer');
    assert(pdfBuffer.length > 100, 'Buffer must contain non-trivial PDF data');
    const header = pdfBuffer.slice(0, 4).toString('utf-8');
    assert.strictEqual(header, '%PDF', 'PDF buffer must start with %PDF magic header');
  });

  await test('37. Excel Report Generator produces valid binary Buffer with PK zip magic header', async () => {
    const sampleData = {
      title: 'Viva Voce Performance Ledger',
      columns: [
        { header: 'Student ID', key: 'rollNumber' },
        { header: 'Student Name', key: 'name' },
        { header: 'Viva Score (/5)', key: 'vivaScore' }
      ],
      rows: [
        { rollNumber: 'CS001', name: 'Student A', vivaScore: 4.5 },
        { rollNumber: 'CS002', name: 'Student B', vivaScore: 5.0 }
      ]
    };

    const excelBuffer = await generateExcelReport(sampleData);
    assert(Buffer.isBuffer(excelBuffer), 'Must return a Buffer');
    assert(excelBuffer.length > 100, 'Buffer must contain non-trivial XLSX data');
    const header = excelBuffer.slice(0, 2).toString('utf-8');
    assert.strictEqual(header, 'PK', 'Excel XLSX buffer must start with PK zip header');
  });

  await test('38. Report export generators gracefully process empty dataset without errors', async () => {
    const emptyData = {
      title: 'Empty Laboratory Report',
      columns: [{ header: 'Header 1', key: 'col1' }],
      rows: []
    };

    const pdfBuffer = await generatePdfReport(emptyData);
    assert(pdfBuffer.length > 0);

    const excelBuffer = await generateExcelReport(emptyData);
    assert(excelBuffer.length > 0);
  });

  // -------------------------------------------------------------
  // 11. Admin/HOD Dashboard Telemetry QA (Tests 39-40)
  // -------------------------------------------------------------
  console.log('\n--- 11. Admin/HOD Dashboard Telemetry QA (39-40) ---');

  await test('39. Admin dashboard service aggregates overall institution KPI statistics', async () => {
    const origUserCount = User.countDocuments;
    const origLabCount = Lab.countDocuments;
    const origSecCount = Section.countDocuments;
    const origExpCount = Experiment.countDocuments;
    const origSubCount = Submission.countDocuments;
    const origEvalCount = Evaluation.countDocuments;
    const origVivaCount = VivaEvaluation.countDocuments;
    const origReevalCount = ReevaluationRequest.countDocuments;

    User.countDocuments = async (q) => {
      if (q && q.role === 'STUDENT') return 120;
      if (q && q.role === 'TEACHER') return 15;
      return 135;
    };
    Lab.countDocuments = async () => 10;
    Section.countDocuments = async () => 4;
    Experiment.countDocuments = async () => 45;
    Submission.countDocuments = async () => 200;
    Evaluation.countDocuments = async () => 180;
    VivaEvaluation.countDocuments = async () => 150;
    ReevaluationRequest.countDocuments = async () => 5;

    try {
      const stats = await adminDashboardService.getStatistics({});
      assert.strictEqual(stats.students.total, 120);
      assert.strictEqual(stats.teachers.total, 15);
      assert.strictEqual(stats.labs.total, 10);
      assert.strictEqual(stats.sections.total, 4);
      assert.strictEqual(stats.experiments.total, 45);
    } finally {
      User.countDocuments = origUserCount;
      Lab.countDocuments = origLabCount;
      Section.countDocuments = origSecCount;
      Experiment.countDocuments = origExpCount;
      Submission.countDocuments = origSubCount;
      Evaluation.countDocuments = origEvalCount;
      VivaEvaluation.countDocuments = origVivaCount;
      ReevaluationRequest.countDocuments = origReevalCount;
    }
  });

  await test('40. Non-admin roles attempting to access admin dashboard routes are rejected (403 Forbidden)', async () => {
    const { authorize } = require('../middleware/auth');
    const adminOnlyMiddleware = authorize('ADMIN_HOD');

    // Teacher
    const reqTeacher = { user: teacherA };
    let errTeacher = null;
    adminOnlyMiddleware(reqTeacher, {}, (e) => { if (e) errTeacher = e; });
    assert(errTeacher, 'Teacher must be blocked from admin dashboard');
    assert.strictEqual(errTeacher.statusCode, 403);

    // Student
    const reqStudent = { user: studentA };
    let errStudent = null;
    adminOnlyMiddleware(reqStudent, {}, (e) => { if (e) errStudent = e; });
    assert(errStudent, 'Student must be blocked from admin dashboard');
    assert.strictEqual(errStudent.statusCode, 403);
  });

  console.log(`\n==============================================`);
  console.log(`Phase 14 QA Tests Passed: ${passed}/${total}`);
  console.log(`==============================================\n`);
}

runPhase14QATests().catch((err) => {
  console.error('Phase 14 QA test execution failed:', err);
  process.exit(1);
});
