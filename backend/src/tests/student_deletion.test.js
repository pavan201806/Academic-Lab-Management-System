const assert = require('assert');
const mongoose = require('mongoose');
const userService = require('../services/userService');
const {
  User,
  Section,
  Lab,
  Experiment,
  TestCase,
  Submission,
  Evaluation,
  VivaEvaluation,
  ReevaluationRequest,
  Notification
} = require('../models');
const { authorize } = require('../middleware/auth');

console.log('=== Running Student Permanent Deletion & Cascade Test Suite ===\n');

async function runStudentDeletionTests() {
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

  // --- In-memory Mock Collections for Clean Isolation ---
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

  // Override model queries for test isolation
  const originalUserFindById = User.findById;
  const originalUserDeleteOne = User.deleteOne;
  const originalSubmissionDeleteMany = Submission.deleteMany;
  const originalSubmissionFind = Submission.find;
  const originalEvaluationDeleteMany = Evaluation.deleteMany;
  const originalEvaluationFind = Evaluation.find;
  const originalVivaDeleteMany = VivaEvaluation.deleteMany;
  const originalVivaFind = VivaEvaluation.find;
  const originalReevalDeleteMany = ReevaluationRequest.deleteMany;
  const originalReevalFind = ReevaluationRequest.find;
  const originalNotificationUpdateMany = Notification.updateMany;
  const originalNotificationDeleteMany = Notification.deleteMany;

  User.findById = async function (id) {
    return mockUsers.find((u) => u._id.toString() === id.toString()) || null;
  };

  User.deleteOne = async function (query) {
    const prevCount = mockUsers.length;
    mockUsers = mockUsers.filter((u) => u._id.toString() !== query._id.toString());
    return { deletedCount: prevCount - mockUsers.length };
  };

  Submission.deleteMany = async function (query) {
    const studentId = query.student.toString();
    const prevCount = mockSubmissions.length;
    mockSubmissions = mockSubmissions.filter((s) => s.student.toString() !== studentId);
    return { deletedCount: prevCount - mockSubmissions.length };
  };

  Submission.find = async function (query = {}) {
    if (query.student) {
      return mockSubmissions.filter((s) => s.student.toString() === query.student.toString());
    }
    return mockSubmissions;
  };

  Evaluation.deleteMany = async function (query) {
    const studentId = query.student.toString();
    const prevCount = mockEvaluations.length;
    mockEvaluations = mockEvaluations.filter((e) => e.student.toString() !== studentId);
    return { deletedCount: prevCount - mockEvaluations.length };
  };

  Evaluation.find = async function (query = {}) {
    if (query.student) {
      return mockEvaluations.filter((e) => e.student.toString() === query.student.toString());
    }
    return mockEvaluations;
  };

  VivaEvaluation.deleteMany = async function (query) {
    const studentId = query.student.toString();
    const prevCount = mockVivaEvaluations.length;
    mockVivaEvaluations = mockVivaEvaluations.filter((v) => v.student.toString() !== studentId);
    return { deletedCount: prevCount - mockVivaEvaluations.length };
  };

  VivaEvaluation.find = async function (query = {}) {
    if (query.student) {
      return mockVivaEvaluations.filter((v) => v.student.toString() === query.student.toString());
    }
    return mockVivaEvaluations;
  };

  ReevaluationRequest.deleteMany = async function (query) {
    const studentId = query.student.toString();
    const prevCount = mockReevaluations.length;
    mockReevaluations = mockReevaluations.filter((r) => r.student.toString() !== studentId);
    return { deletedCount: prevCount - mockReevaluations.length };
  };

  ReevaluationRequest.find = async function (query = {}) {
    if (query.student) {
      return mockReevaluations.filter((r) => r.student.toString() === query.student.toString());
    }
    return mockReevaluations;
  };

  Notification.updateMany = async function (filter, update) {
    let matched = 0;
    if (update.$pull && update.$pull.targetStudents) {
      const targetId = update.$pull.targetStudents.toString();
      mockNotifications.forEach((n) => {
        if (n.targetStudents) {
          n.targetStudents = n.targetStudents.filter((id) => id.toString() !== targetId);
          matched++;
        }
      });
    }
    if (update.$pull && update.$pull.readBy) {
      const targetStudentId = update.$pull.readBy.student.toString();
      mockNotifications.forEach((n) => {
        if (n.readBy) {
          n.readBy = n.readBy.filter((r) => r.student.toString() !== targetStudentId);
          matched++;
        }
      });
    }
    return { modifiedCount: matched };
  };

  Notification.deleteMany = async function (query) {
    const prevCount = mockNotifications.length;
    if (query.targetType === 'INDIVIDUAL') {
      mockNotifications = mockNotifications.filter(
        (n) => !(n.targetType === 'INDIVIDUAL' && (!n.targetStudents || n.targetStudents.length === 0))
      );
    }
    return { deletedCount: prevCount - mockNotifications.length };
  };

  // Seed baseline shared records
  const teacherId = new mongoose.Types.ObjectId('64f000000000000000000010');
  const adminId = new mongoose.Types.ObjectId('64f000000000000000000001');
  const sectionId = new mongoose.Types.ObjectId('64f000000000000000000020');
  const labId = new mongoose.Types.ObjectId('64f000000000000000000030');
  const expId = new mongoose.Types.ObjectId('64f000000000000000000040');

  const studentAliceId = new mongoose.Types.ObjectId('64f000000000000000000050');
  const studentBobId = new mongoose.Types.ObjectId('64f000000000000000000051');

  function resetState() {
    mockUsers = [
      {
        _id: adminId,
        name: 'Dr. Admin HOD',
        rollNumber: 'ADMIN01',
        role: 'ADMIN_HOD',
        active: true
      },
      {
        _id: teacherId,
        name: 'Prof. Vance',
        rollNumber: 'PROFVANCE',
        role: 'TEACHER',
        active: true
      },
      {
        _id: studentAliceId,
        name: 'Alice Student',
        rollNumber: '23341A4504',
        role: 'STUDENT',
        section: 'AIDS-A',
        active: true
      },
      {
        _id: studentBobId,
        name: 'Bob Student',
        rollNumber: '23341A4505',
        role: 'STUDENT',
        section: 'AIDS-A',
        active: true
      }
    ];

    mockSections = [
      {
        _id: sectionId,
        name: 'AIDS - A',
        sectionCode: 'AIDS-A',
        active: true
      }
    ];

    mockLabs = [
      {
        _id: labId,
        name: 'Data Structures Lab',
        code: 'CS-201P',
        active: true
      }
    ];

    mockExperiments = [
      {
        _id: expId,
        lab: labId,
        experimentNumber: 1,
        title: 'Binary Search Trees',
        active: true
      }
    ];

    mockSubmissions = [
      {
        _id: new mongoose.Types.ObjectId(),
        student: studentAliceId,
        experiment: expId,
        lab: labId,
        section: sectionId,
        attemptNumber: 1,
        language: 'Python',
        sourceCode: 'print("Alice Attempt 1")'
      },
      {
        _id: new mongoose.Types.ObjectId(),
        student: studentAliceId,
        experiment: expId,
        lab: labId,
        section: sectionId,
        attemptNumber: 2,
        language: 'Python',
        sourceCode: 'print("Alice Attempt 2")'
      },
      {
        _id: new mongoose.Types.ObjectId(),
        student: studentBobId,
        experiment: expId,
        lab: labId,
        section: sectionId,
        attemptNumber: 1,
        language: 'Python',
        sourceCode: 'print("Bob Attempt 1")'
      }
    ];

    mockEvaluations = [
      {
        _id: new mongoose.Types.ObjectId(),
        student: studentAliceId,
        experiment: expId,
        lab: labId,
        score: 9.5
      },
      {
        _id: new mongoose.Types.ObjectId(),
        student: studentBobId,
        experiment: expId,
        lab: labId,
        score: 8.0
      }
    ];

    mockVivaEvaluations = [
      {
        _id: new mongoose.Types.ObjectId(),
        student: studentAliceId,
        experiment: expId,
        lab: labId,
        marks: 4.5
      },
      {
        _id: new mongoose.Types.ObjectId(),
        student: studentBobId,
        experiment: expId,
        lab: labId,
        marks: 5.0
      }
    ];

    mockReevaluations = [
      {
        _id: new mongoose.Types.ObjectId(),
        student: studentAliceId,
        experiment: expId,
        lab: labId,
        reason: 'Please review question 2 viva'
      }
    ];

    mockNotifications = [
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Individual Alert for Alice',
        targetType: 'INDIVIDUAL',
        targetStudents: [studentAliceId],
        readBy: [{ student: studentAliceId, readAt: new Date() }]
      },
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Section Broadcast Announcement',
        targetType: 'SECTION',
        targetSections: [sectionId],
        readBy: [{ student: studentAliceId, readAt: new Date() }, { student: studentBobId, readAt: new Date() }]
      }
    ];
  }

  resetState();

  // ==========================================
  // SECTION 1: ROLE AUTHORIZATION
  // ==========================================
  console.log('--- Section 1: Role Authorization & Guarding ---');

  await test('1. ADMIN_HOD is authorized to delete student accounts', async () => {
    const adminGuard = authorize('ADMIN_HOD');
    let allowed = false;
    adminGuard({ user: { role: 'ADMIN_HOD' } }, {}, (err) => {
      if (!err) allowed = true;
    });
    assert.strictEqual(allowed, true);
  });

  await test('2. STUDENT is blocked from student deletion (403 Forbidden)', async () => {
    const adminGuard = authorize('ADMIN_HOD');
    let blocked = false;
    adminGuard({ user: { role: 'STUDENT' } }, {}, (err) => {
      if (err && err.statusCode === 403) blocked = true;
    });
    assert.strictEqual(blocked, true);
  });

  await test('3. TEACHER is blocked from student deletion (403 Forbidden)', async () => {
    const adminGuard = authorize('ADMIN_HOD');
    let blocked = false;
    adminGuard({ user: { role: 'TEACHER' } }, {}, (err) => {
      if (err && err.statusCode === 403) blocked = true;
    });
    assert.strictEqual(blocked, true);
  });

  // ==========================================
  // SECTION 2: ACCOUNT TYPE SAFETY
  // ==========================================
  console.log('\n--- Section 2: Account Type Safety Checks ---');

  await test('4. Attempting to delete a TEACHER account is rejected with 400 Bad Request', async () => {
    await assert.rejects(
      async () => {
        await userService.deleteStudent(teacherId);
      },
      (err) => err.statusCode === 400 && err.message.includes('Only student accounts can be permanently deleted')
    );
  });

  await test('5. Attempting to delete an ADMIN_HOD account is rejected with 400 Bad Request', async () => {
    await assert.rejects(
      async () => {
        await userService.deleteStudent(adminId);
      },
      (err) => err.statusCode === 400 && err.message.includes('Only student accounts can be permanently deleted')
    );
  });

  // ==========================================
  // SECTION 3: COMPLETE CASCADE CLEANUP
  // ==========================================
  console.log('\n--- Section 3: Complete Cascade Deletion ---');

  await test('6. Deleting student removes User record and all student-owned submissions', async () => {
    resetState();
    assert.strictEqual(mockSubmissions.filter((s) => s.student.toString() === studentAliceId.toString()).length, 2);

    const result = await userService.deleteStudent(studentAliceId);

    assert.strictEqual(result.deletedStudent.rollNumber, '23341A4504');
    assert.strictEqual(result.cascadeSummary.submissionsDeleted, 2);

    // Verify User record is deleted
    const aliceUser = mockUsers.find((u) => u._id.toString() === studentAliceId.toString());
    assert.strictEqual(aliceUser, undefined, 'Alice User document must be completely deleted');

    // Verify Submissions are deleted
    const aliceSubmissions = mockSubmissions.filter((s) => s.student.toString() === studentAliceId.toString());
    assert.strictEqual(aliceSubmissions.length, 0, 'All Alice submissions must be deleted');
  });

  await test('7. Deleting student cascade-deletes all automated evaluations', async () => {
    const aliceEvaluations = mockEvaluations.filter((e) => e.student.toString() === studentAliceId.toString());
    assert.strictEqual(aliceEvaluations.length, 0, 'Alice automated evaluations must be deleted');
  });

  await test('8. Deleting student cascade-deletes all Viva evaluations and re-evaluations', async () => {
    const aliceViva = mockVivaEvaluations.filter((v) => v.student.toString() === studentAliceId.toString());
    assert.strictEqual(aliceViva.length, 0, 'Alice viva evaluations must be deleted');

    const aliceReeval = mockReevaluations.filter((r) => r.student.toString() === studentAliceId.toString());
    assert.strictEqual(aliceReeval.length, 0, 'Alice re-evaluations must be deleted');
  });

  await test('9. Deleting student cleans individual notifications and removes read receipts', async () => {
    // Individual notification targeting Alice should be removed
    const aliceIndNotification = mockNotifications.find((n) => n.targetType === 'INDIVIDUAL');
    assert.strictEqual(aliceIndNotification, undefined, 'Individual notification for Alice should be deleted');

    // Section notification should preserve Bob while removing Alice from readBy
    const sectionNotif = mockNotifications.find((n) => n.targetType === 'SECTION');
    assert.ok(sectionNotif);
    const readByAlice = sectionNotif.readBy.find((r) => r.student.toString() === studentAliceId.toString());
    assert.strictEqual(readByAlice, undefined, 'Alice read receipt must be removed from section notification');
    const readByBob = sectionNotif.readBy.find((r) => r.student.toString() === studentBobId.toString());
    assert.ok(readByBob, 'Bob read receipt must remain intact');
  });

  // ==========================================
  // SECTION 4: PRESERVATION OF SHARED DATA
  // ==========================================
  console.log('\n--- Section 4: Shared Academic Data & Other Users Preservation ---');

  await test('10. Shared sections, labs, and experiments remain untouched after student deletion', async () => {
    assert.strictEqual(mockSections.length, 1, 'Section must NOT be deleted');
    assert.strictEqual(mockLabs.length, 1, 'Lab must NOT be deleted');
    assert.strictEqual(mockExperiments.length, 1, 'Experiment must NOT be deleted');
  });

  await test('11. Other students (Bob) and their submissions/evaluations remain completely intact', async () => {
    const bob = mockUsers.find((u) => u._id.toString() === studentBobId.toString());
    assert.ok(bob, 'Bob account must remain intact');

    const bobSubmissions = mockSubmissions.filter((s) => s.student.toString() === studentBobId.toString());
    assert.strictEqual(bobSubmissions.length, 1, 'Bob submissions must remain untouched');

    const bobEvaluations = mockEvaluations.filter((e) => e.student.toString() === studentBobId.toString());
    assert.strictEqual(bobEvaluations.length, 1, 'Bob evaluations must remain untouched');
  });

  // ==========================================
  // SECTION 5: IDEMPOTENCY & ERROR HANDLING
  // ==========================================
  console.log('\n--- Section 5: Idempotency & Error Handling ---');

  await test('12. Attempting to delete an already deleted or non-existent student returns 404 Not Found', async () => {
    await assert.rejects(
      async () => {
        await userService.deleteStudent(studentAliceId);
      },
      (err) => err.statusCode === 404 && err.message.includes('Student not found')
    );
  });

  // Restore original methods
  User.findById = originalUserFindById;
  User.deleteOne = originalUserDeleteOne;
  Submission.deleteMany = originalSubmissionDeleteMany;
  Submission.find = originalSubmissionFind;
  Evaluation.deleteMany = originalEvaluationDeleteMany;
  Evaluation.find = originalEvaluationFind;
  VivaEvaluation.deleteMany = originalVivaDeleteMany;
  VivaEvaluation.find = originalVivaFind;
  ReevaluationRequest.deleteMany = originalReevalDeleteMany;
  ReevaluationRequest.find = originalReevalFind;
  Notification.updateMany = originalNotificationUpdateMany;
  Notification.deleteMany = originalNotificationDeleteMany;

  console.log(`\n==================================================`);
  console.log(`Student Deletion Tests: ${passed}/${total} PASSED (100%)`);
  console.log(`==================================================\n`);
}

runStudentDeletionTests().catch((err) => {
  console.error('Student deletion test suite failed:', err);
  process.exit(1);
});
