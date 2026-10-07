const assert = require('assert');
const mongoose = require('mongoose');
const userService = require('../services/userService');
const {
  User,
  Section,
  Lab,
  LabAssignment,
  Experiment,
  TestCase,
  Submission,
  Evaluation,
  VivaEvaluation,
  ReevaluationRequest,
  Notification
} = require('../models');
const { authorize } = require('../middleware/auth');

console.log('=== Running Bulk Student Deletion & Cascade Cleanup Test Suite ===\n');

async function runBulkStudentDeletionTests() {
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✓ [Test ${total}] ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ [Test ${total}] ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  // In-memory Mock Collections
  let mockUsers = [];
  let mockSections = [];
  let mockLabs = [];
  let mockExperiments = [];
  let mockTestCases = [];
  let mockSubmissions = [];
  let mockEvaluations = [];
  let mockVivaEvaluations = [];
  let mockReevaluations = [];
  let mockNotifications = [];

  // Mongoose Overrides
  User.find = function (query = {}) {
    let result = [...mockUsers];
    if (query._id && query._id.$in) {
      const idStrs = query._id.$in.map((id) => id.toString());
      result = result.filter((u) => idStrs.includes(u._id.toString()));
    }
    if (query.role) {
      result = result.filter((u) => u.role === query.role);
    }
    return {
      session: function () {
        return Promise.resolve(result);
      },
      then: function (resolve) {
        return Promise.resolve(result).then(resolve);
      }
    };
  };

  User.deleteMany = function (query = {}) {
    let prev = mockUsers.length;
    if (query._id && query._id.$in) {
      const idStrs = query._id.$in.map((id) => id.toString());
      mockUsers = mockUsers.filter((u) => !idStrs.includes(u._id.toString()));
    }
    const res = { deletedCount: prev - mockUsers.length };
    return {
      session: function () {
        return Promise.resolve(res);
      },
      then: function (resolve) {
        return Promise.resolve(res).then(resolve);
      }
    };
  };

  Submission.countDocuments = function (query = {}) {
    let count = 0;
    if (query.student && query.student.$in) {
      const idStrs = query.student.$in.map((id) => id.toString());
      count = mockSubmissions.filter((s) => idStrs.includes(s.student.toString())).length;
    }
    return {
      session: function () {
        return Promise.resolve(count);
      },
      then: function (resolve) {
        return Promise.resolve(count).then(resolve);
      }
    };
  };

  Submission.deleteMany = function (query = {}) {
    let prev = mockSubmissions.length;
    if (query.student && query.student.$in) {
      const idStrs = query.student.$in.map((id) => id.toString());
      mockSubmissions = mockSubmissions.filter((s) => !idStrs.includes(s.student.toString()));
    }
    const res = { deletedCount: prev - mockSubmissions.length };
    return {
      session: function () {
        return Promise.resolve(res);
      },
      then: function (resolve) {
        return Promise.resolve(res).then(resolve);
      }
    };
  };

  Evaluation.countDocuments = function (query = {}) {
    let count = 0;
    if (query.student && query.student.$in) {
      const idStrs = query.student.$in.map((id) => id.toString());
      count = mockEvaluations.filter((e) => idStrs.includes(e.student.toString())).length;
    }
    return {
      session: function () {
        return Promise.resolve(count);
      },
      then: function (resolve) {
        return Promise.resolve(count).then(resolve);
      }
    };
  };

  Evaluation.deleteMany = function (query = {}) {
    let prev = mockEvaluations.length;
    if (query.student && query.student.$in) {
      const idStrs = query.student.$in.map((id) => id.toString());
      mockEvaluations = mockEvaluations.filter((e) => !idStrs.includes(e.student.toString()));
    }
    const res = { deletedCount: prev - mockEvaluations.length };
    return {
      session: function () {
        return Promise.resolve(res);
      },
      then: function (resolve) {
        return Promise.resolve(res).then(resolve);
      }
    };
  };

  VivaEvaluation.countDocuments = function (query = {}) {
    let count = 0;
    if (query.student && query.student.$in) {
      const idStrs = query.student.$in.map((id) => id.toString());
      count = mockVivaEvaluations.filter((v) => idStrs.includes(v.student.toString())).length;
    }
    return {
      session: function () {
        return Promise.resolve(count);
      },
      then: function (resolve) {
        return Promise.resolve(count).then(resolve);
      }
    };
  };

  VivaEvaluation.deleteMany = function (query = {}) {
    let prev = mockVivaEvaluations.length;
    if (query.student && query.student.$in) {
      const idStrs = query.student.$in.map((id) => id.toString());
      mockVivaEvaluations = mockVivaEvaluations.filter((v) => !idStrs.includes(v.student.toString()));
    }
    const res = { deletedCount: prev - mockVivaEvaluations.length };
    return {
      session: function () {
        return Promise.resolve(res);
      },
      then: function (resolve) {
        return Promise.resolve(res).then(resolve);
      }
    };
  };

  ReevaluationRequest.countDocuments = function (query = {}) {
    let count = 0;
    if (query.student && query.student.$in) {
      const idStrs = query.student.$in.map((id) => id.toString());
      count = mockReevaluations.filter((r) => idStrs.includes(r.student.toString())).length;
    }
    return {
      session: function () {
        return Promise.resolve(count);
      },
      then: function (resolve) {
        return Promise.resolve(count).then(resolve);
      }
    };
  };

  ReevaluationRequest.deleteMany = function (query = {}) {
    let prev = mockReevaluations.length;
    if (query.student && query.student.$in) {
      const idStrs = query.student.$in.map((id) => id.toString());
      mockReevaluations = mockReevaluations.filter((r) => !idStrs.includes(r.student.toString()));
    }
    const res = { deletedCount: prev - mockReevaluations.length };
    return {
      session: function () {
        return Promise.resolve(res);
      },
      then: function (resolve) {
        return Promise.resolve(res).then(resolve);
      }
    };
  };

  Notification.updateMany = function (query = {}, update = {}) {
    if (query.targetStudents && query.targetStudents.$in && update.$pull && update.$pull.targetStudents) {
      const pullIds = update.$pull.targetStudents.$in.map((id) => id.toString());
      mockNotifications.forEach((n) => {
        if (n.targetStudents) {
          n.targetStudents = n.targetStudents.filter((id) => !pullIds.includes(id.toString()));
        }
      });
    }
    if (query['readBy.student'] && query['readBy.student'].$in && update.$pull && update.$pull.readBy) {
      const pullIds = update.$pull.readBy.student.$in.map((id) => id.toString());
      mockNotifications.forEach((n) => {
        if (n.readBy) {
          n.readBy = n.readBy.filter((rb) => !pullIds.includes(rb.student.toString()));
        }
      });
    }
    return {
      session: function () {
        return Promise.resolve({ modifiedCount: 1 });
      },
      then: function (resolve) {
        return Promise.resolve({ modifiedCount: 1 }).then(resolve);
      }
    };
  };

  Notification.deleteMany = function (query = {}) {
    let prev = mockNotifications.length;
    if (query.targetType === 'INDIVIDUAL' && query.targetStudents && query.targetStudents.$size === 0) {
      mockNotifications = mockNotifications.filter(
        (n) => !(n.targetType === 'INDIVIDUAL' && (!n.targetStudents || n.targetStudents.length === 0))
      );
    }
    const res = { deletedCount: prev - mockNotifications.length };
    return {
      session: function () {
        return Promise.resolve(res);
      },
      then: function (resolve) {
        return Promise.resolve(res).then(resolve);
      }
    };
  };

  function resetState() {
    mockUsers = [];
    mockSections = [];
    mockLabs = [];
    mockExperiments = [];
    mockTestCases = [];
    mockSubmissions = [];
    mockEvaluations = [];
    mockVivaEvaluations = [];
    mockReevaluations = [];
    mockNotifications = [];
  }

  // ==========================================
  // SECTION 1: ROLE AUTHORIZATION & GUARDING
  // ==========================================
  console.log('--- Section 1: Role Authorization & Guarding ---');

  await test('1. ADMIN_HOD is authorized to access bulk deletion routes', async () => {
    const middleware = authorize('ADMIN_HOD');
    let calledNext = false;
    const req = { user: { role: 'ADMIN_HOD' } };
    const res = {};
    middleware(req, res, () => {
      calledNext = true;
    });
    assert.strictEqual(calledNext, true, 'ADMIN_HOD must be authorized');
  });

  await test('2. STUDENT role is blocked from bulk deletion (403 Forbidden)', async () => {
    const middleware = authorize('ADMIN_HOD');
    let errorReceived = null;
    const req = { user: { role: 'STUDENT' } };
    const res = {};
    middleware(req, res, (err) => {
      errorReceived = err;
    });
    assert.ok(errorReceived, 'STUDENT role must be blocked');
    assert.strictEqual(errorReceived.statusCode, 403);
  });

  await test('3. TEACHER role is blocked from bulk deletion (403 Forbidden)', async () => {
    const middleware = authorize('ADMIN_HOD');
    let errorReceived = null;
    const req = { user: { role: 'TEACHER' } };
    const res = {};
    middleware(req, res, (err) => {
      errorReceived = err;
    });
    assert.ok(errorReceived, 'TEACHER role must be blocked');
    assert.strictEqual(errorReceived.statusCode, 403);
  });

  await test('4. Unauthenticated request is rejected with 401 Unauthorized', async () => {
    const middleware = authorize('ADMIN_HOD');
    let errorReceived = null;
    const req = {};
    const res = {};
    middleware(req, res, (err) => {
      errorReceived = err;
    });
    assert.ok(errorReceived, 'Unauthenticated request must be rejected');
    assert.strictEqual(errorReceived.statusCode, 401);
  });

  // ==========================================
  // SECTION 2: INPUT VALIDATION & ACCOUNT TYPE GUARDS
  // ==========================================
  console.log('\n--- Section 2: Input Validation & Account Type Guards ---');

  await test('5. Empty studentIds array is rejected with 400 Bad Request', async () => {
    resetState();
    try {
      await userService.bulkDeleteStudents([]);
      assert.fail('Should have rejected empty array');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.match(err.message, /array of student IDs is required/i);
    }
  });

  await test('6. Invalid ObjectId format is rejected with 400 Bad Request', async () => {
    resetState();
    try {
      await userService.bulkDeleteStudents(['not-an-id-123', 'invalid-id-456']);
      assert.fail('Should have rejected invalid ObjectId');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.match(err.message, /invalid student ID format/i);
    }
  });

  await test('7. Attempting to bulk delete TEACHER or ADMIN_HOD accounts is strictly rejected with 400', async () => {
    resetState();
    const studentId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();

    mockUsers.push({ _id: studentId, name: 'Alice Student', rollNumber: '26GR1B07001', role: 'STUDENT' });
    mockUsers.push({ _id: teacherId, name: 'Prof. John', rollNumber: 'TCH001', role: 'TEACHER' });
    mockUsers.push({ _id: adminId, name: 'Admin User', rollNumber: 'ADM001', role: 'ADMIN_HOD' });

    try {
      await userService.bulkDeleteStudents([studentId, teacherId, adminId]);
      assert.fail('Should have rejected deletion of non-student accounts');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.match(err.message, /non-student accounts/i);
    }

    // Verify nothing was deleted
    assert.strictEqual(mockUsers.length, 3);
  });

  // ==========================================
  // SECTION 3: PREVIEW DEPENDENCY INSPECTION
  // ==========================================
  console.log('\n--- Section 3: Preview Dependency Inspection ---');

  await test('8. Preview calculates accurate affected record counts across selected students', async () => {
    resetState();
    const s1 = new mongoose.Types.ObjectId();
    const s2 = new mongoose.Types.ObjectId();
    const s3 = new mongoose.Types.ObjectId();

    mockUsers.push({ _id: s1, name: 'Student 1', rollNumber: 'ROLL01', role: 'STUDENT', section: 'AIDS-A' });
    mockUsers.push({ _id: s2, name: 'Student 2', rollNumber: 'ROLL02', role: 'STUDENT', section: 'AIDS-A' });
    mockUsers.push({ _id: s3, name: 'Student 3', rollNumber: 'ROLL03', role: 'STUDENT', section: 'AIDS-B' });

    // Submissions: s1 has 2, s2 has 1, s3 has 5
    mockSubmissions.push({ _id: new mongoose.Types.ObjectId(), student: s1 });
    mockSubmissions.push({ _id: new mongoose.Types.ObjectId(), student: s1 });
    mockSubmissions.push({ _id: new mongoose.Types.ObjectId(), student: s2 });
    mockSubmissions.push({ _id: new mongoose.Types.ObjectId(), student: s3 });

    // Evaluations: s1 has 2, s2 has 1
    mockEvaluations.push({ _id: new mongoose.Types.ObjectId(), student: s1, score: 10 });
    mockEvaluations.push({ _id: new mongoose.Types.ObjectId(), student: s1, score: 9 });
    mockEvaluations.push({ _id: new mongoose.Types.ObjectId(), student: s2, score: 8 });

    // Viva: s1 has 1
    mockVivaEvaluations.push({ _id: new mongoose.Types.ObjectId(), student: s1, score: 5 });

    // Reevaluation: s2 has 1
    mockReevaluations.push({ _id: new mongoose.Types.ObjectId(), student: s2, status: 'PENDING' });

    const preview = await userService.previewBulkDeleteStudents([s1, s2]);
    assert.strictEqual(preview.selectedCount, 2);
    assert.strictEqual(preview.affectedData.students, 2);
    assert.strictEqual(preview.affectedData.submissions, 3, 'Should count 3 submissions for s1 & s2');
    assert.strictEqual(preview.affectedData.evaluations, 3, 'Should count 3 evaluations for s1 & s2');
    assert.strictEqual(preview.affectedData.vivaEvaluations, 1, 'Should count 1 viva evaluation');
    assert.strictEqual(preview.affectedData.reevaluationRequests, 1, 'Should count 1 re-evaluation request');
  });

  // ==========================================
  // SECTION 4: COMPLETE CASCADE DELETION & ISOLATION
  // ==========================================
  console.log('\n--- Section 4: Complete Cascade Deletion & Isolation ---');

  await test('9. Bulk delete permanently removes selected students and cascades to all student-owned data', async () => {
    resetState();
    const s1 = new mongoose.Types.ObjectId();
    const s2 = new mongoose.Types.ObjectId();
    const s3 = new mongoose.Types.ObjectId(); // Unselected student
    const teacherId = new mongoose.Types.ObjectId();
    const sectionId = new mongoose.Types.ObjectId();
    const labId = new mongoose.Types.ObjectId();
    const expId = new mongoose.Types.ObjectId();

    mockUsers.push({ _id: s1, name: 'Alice', rollNumber: '26GR1B07001', role: 'STUDENT', section: 'AIDS-A' });
    mockUsers.push({ _id: s2, name: 'Bob', rollNumber: '26GR1B07002', role: 'STUDENT', section: 'AIDS-A' });
    mockUsers.push({ _id: s3, name: 'Charlie', rollNumber: '26GR1B07003', role: 'STUDENT', section: 'AIDS-A' });
    mockUsers.push({ _id: teacherId, name: 'Prof. Lin', rollNumber: 'TCH01', role: 'TEACHER' });

    mockSections.push({ _id: sectionId, name: 'Section A', sectionCode: 'AIDS-A' });
    mockLabs.push({ _id: labId, name: 'OS Lab', code: 'CS-201P' });
    mockExperiments.push({ _id: expId, lab: labId, title: 'Process Sync' });
    mockTestCases.push({ _id: new mongoose.Types.ObjectId(), experiment: expId, name: 'TC1' });

    // Submissions
    mockSubmissions.push({ _id: new mongoose.Types.ObjectId(), student: s1, lab: labId, experiment: expId });
    mockSubmissions.push({ _id: new mongoose.Types.ObjectId(), student: s2, lab: labId, experiment: expId });
    const subC = new mongoose.Types.ObjectId();
    mockSubmissions.push({ _id: subC, student: s3, lab: labId, experiment: expId });

    // Evaluations
    mockEvaluations.push({ _id: new mongoose.Types.ObjectId(), student: s1, score: 9.5 });
    mockEvaluations.push({ _id: new mongoose.Types.ObjectId(), student: s2, score: 8.0 });
    mockEvaluations.push({ _id: new mongoose.Types.ObjectId(), student: s3, score: 10.0 });

    // Viva
    mockVivaEvaluations.push({ _id: new mongoose.Types.ObjectId(), student: s1, score: 5 });
    mockVivaEvaluations.push({ _id: new mongoose.Types.ObjectId(), student: s3, score: 4 });

    // Reevaluations
    mockReevaluations.push({ _id: new mongoose.Types.ObjectId(), student: s2, reason: 'Check TC 2' });

    // Notifications
    mockNotifications.push({ _id: new mongoose.Types.ObjectId(), targetType: 'INDIVIDUAL', targetStudents: [s1] });
    mockNotifications.push({ _id: new mongoose.Types.ObjectId(), targetType: 'ALL_STUDENTS', readBy: [{ student: s1 }, { student: s3 }] });

    // Execute bulk delete on [s1, s2]
    const result = await userService.bulkDeleteStudents([s1, s2]);
    assert.strictEqual(result.deletedCount, 2);
    assert.strictEqual(result.cascadeSummary.studentsDeleted, 2);
    assert.strictEqual(result.cascadeSummary.submissionsDeleted, 2);
    assert.strictEqual(result.cascadeSummary.evaluationsDeleted, 2);
    assert.strictEqual(result.cascadeSummary.vivaEvaluationsDeleted, 1);
    assert.strictEqual(result.cascadeSummary.reevaluationsDeleted, 1);

    // Verify Users: s1, s2 deleted; Charlie and Prof. Lin preserved
    assert.strictEqual(mockUsers.length, 2);
    assert.ok(mockUsers.some((u) => u._id.toString() === s3.toString()), 'Charlie must be preserved');
    assert.ok(mockUsers.some((u) => u._id.toString() === teacherId.toString()), 'Teacher must be preserved');

    // Verify Submissions: s1, s2 submissions deleted; Charlie submission preserved
    assert.strictEqual(mockSubmissions.length, 1);
    assert.strictEqual(mockSubmissions[0].student.toString(), s3.toString());

    // Verify Evaluations: s1, s2 evaluations deleted; Charlie evaluation preserved
    assert.strictEqual(mockEvaluations.length, 1);
    assert.strictEqual(mockEvaluations[0].student.toString(), s3.toString());

    // Verify Viva: s1 viva deleted; Charlie viva preserved
    assert.strictEqual(mockVivaEvaluations.length, 1);
    assert.strictEqual(mockVivaEvaluations[0].student.toString(), s3.toString());

    // Verify Reevaluations: s2 reevaluation deleted
    assert.strictEqual(mockReevaluations.length, 0);

    // Verify Notifications: s1 individual notification removed, s1 read receipt removed while s3 preserved
    assert.strictEqual(mockNotifications.length, 1);
    assert.strictEqual(mockNotifications[0].readBy.length, 1);
    assert.strictEqual(mockNotifications[0].readBy[0].student.toString(), s3.toString());

    // Verify Shared Academic Data: Sections, Labs, Experiments, Test Cases untouched
    assert.strictEqual(mockSections.length, 1);
    assert.strictEqual(mockLabs.length, 1);
    assert.strictEqual(mockExperiments.length, 1);
    assert.strictEqual(mockTestCases.length, 1);
  });

  // ==========================================
  // SECTION 5: REPEAT DELETION (IDEMPOTENCY / 404)
  // ==========================================
  console.log('\n--- Section 5: Repeat Deletion (Idempotency) ---');

  await test('10. Repeat bulk deletion of already deleted student IDs returns 404 without crashing', async () => {
    resetState();
    const s1 = new mongoose.Types.ObjectId();
    const s2 = new mongoose.Types.ObjectId();
    mockUsers.push({ _id: s1, name: 'Student 1', rollNumber: 'R1', role: 'STUDENT' });
    mockUsers.push({ _id: s2, name: 'Student 2', rollNumber: 'R2', role: 'STUDENT' });

    await userService.bulkDeleteStudents([s1, s2]);
    assert.strictEqual(mockUsers.length, 0);

    try {
      await userService.bulkDeleteStudents([s1, s2]);
      assert.fail('Second bulk delete should throw 404');
    } catch (err) {
      assert.strictEqual(err.statusCode, 404);
      assert.match(err.message, /No matching student accounts found/i);
    }
  });

  console.log(`\nAll ${passed}/${total} Bulk Student Deletion tests passed successfully! ✨\n`);
}

runBulkStudentDeletionTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
