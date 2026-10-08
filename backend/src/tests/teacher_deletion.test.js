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
  Notification,
  MalpracticeEvent
} = require('../models');
const { authorize } = require('../middleware/auth');

console.log('=== Running Teacher Permanent Deletion & Safe Cascade Test Suite ===\n');

async function runTeacherDeletionTests() {
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

  // --- In-memory Mock Collections for Test Isolation ---
  let mockUsers = [];
  let mockSections = [];
  let mockLabs = [];
  let mockLabAssignments = [];
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
  const originalLabAssignmentDeleteMany = LabAssignment.deleteMany;
  const originalLabAssignmentFind = LabAssignment.find;
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

  LabAssignment.deleteMany = async function (query) {
    const teacherId = query.teacher.toString();
    const prevCount = mockLabAssignments.length;
    mockLabAssignments = mockLabAssignments.filter((a) => a.teacher.toString() !== teacherId);
    return { deletedCount: prevCount - mockLabAssignments.length };
  };

  LabAssignment.find = async function (query = {}) {
    if (query.teacher) {
      return mockLabAssignments.filter((a) => a.teacher.toString() === query.teacher.toString());
    }
    return mockLabAssignments;
  };

  Submission.deleteMany = async function (query) {
    const studentId = query.student.toString();
    const prevCount = mockSubmissions.length;
    mockSubmissions = mockSubmissions.filter((s) => s.student.toString() !== studentId);
    return { deletedCount: prevCount - mockSubmissions.length };
  };

  Submission.find = async function (query = {}) {
    return mockSubmissions;
  };

  Evaluation.deleteMany = async function (query) {
    const studentId = query.student.toString();
    const prevCount = mockEvaluations.length;
    mockEvaluations = mockEvaluations.filter((e) => e.student.toString() !== studentId);
    return { deletedCount: prevCount - mockEvaluations.length };
  };

  Evaluation.find = async function (query = {}) {
    return mockEvaluations;
  };

  VivaEvaluation.deleteMany = async function (query) {
    const studentId = query.student.toString();
    const prevCount = mockVivaEvaluations.length;
    mockVivaEvaluations = mockVivaEvaluations.filter((v) => v.student.toString() !== studentId);
    return { deletedCount: prevCount - mockVivaEvaluations.length };
  };

  VivaEvaluation.find = async function (query = {}) {
    return mockVivaEvaluations;
  };

  ReevaluationRequest.deleteMany = async function (query) {
    const studentId = query.student.toString();
    const prevCount = mockReevaluations.length;
    mockReevaluations = mockReevaluations.filter((r) => r.student.toString() !== studentId);
    return { deletedCount: prevCount - mockReevaluations.length };
  };

  ReevaluationRequest.find = async function (query = {}) {
    return mockReevaluations;
  };

  Notification.updateMany = async function (filter, update) {
    let matched = 0;
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

  MalpracticeEvent.deleteMany = async function (query) {
    return { deletedCount: 0 };
  };

  // Seed baseline entities
  const adminId = new mongoose.Types.ObjectId('64f000000000000000000001');
  const teacherVanceId = new mongoose.Types.ObjectId('64f000000000000000000010');
  const teacherSmithId = new mongoose.Types.ObjectId('64f000000000000000000011');
  const studentAliceId = new mongoose.Types.ObjectId('64f000000000000000000020');

  const sectionId = new mongoose.Types.ObjectId('64f000000000000000000030');
  const labId = new mongoose.Types.ObjectId('64f000000000000000000040');
  const expId = new mongoose.Types.ObjectId('64f000000000000000000050');

  function resetState() {
    mockUsers = [
      {
        _id: adminId,
        name: 'Dr. Arthur Vance (HOD)',
        rollNumber: 'ADMIN01',
        role: 'ADMIN_HOD',
        active: true
      },
      {
        _id: teacherVanceId,
        name: 'Prof. Arthur Vance',
        rollNumber: 'PROFVANCE',
        role: 'TEACHER',
        active: true
      },
      {
        _id: teacherSmithId,
        name: 'Prof. John Smith',
        rollNumber: 'PROFSMITH',
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

    mockLabAssignments = [
      {
        _id: new mongoose.Types.ObjectId(),
        lab: labId,
        section: sectionId,
        teacher: teacherVanceId,
        assignmentType: 'MAIN',
        active: true
      },
      {
        _id: new mongoose.Types.ObjectId(),
        lab: labId,
        section: sectionId,
        teacher: teacherSmithId,
        assignmentType: 'ASSISTANT',
        active: true
      }
    ];

    mockExperiments = [
      {
        _id: expId,
        lab: labId,
        experimentNumber: 1,
        title: 'Binary Search Trees',
        createdBy: teacherVanceId,
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
        sourceCode: 'print("Hello BST")'
      }
    ];

    mockEvaluations = [
      {
        _id: new mongoose.Types.ObjectId(),
        student: studentAliceId,
        experiment: expId,
        lab: labId,
        score: 9.5
      }
    ];

    mockVivaEvaluations = [
      {
        _id: new mongoose.Types.ObjectId(),
        student: studentAliceId,
        experiment: expId,
        lab: labId,
        evaluatedBy: teacherVanceId,
        marks: 5.0,
        remarks: 'Excellent understanding'
      }
    ];

    mockReevaluations = [
      {
        _id: new mongoose.Types.ObjectId(),
        student: studentAliceId,
        experiment: expId,
        lab: labId,
        reviewedBy: teacherVanceId,
        status: 'COMPLETED'
      }
    ];

    mockNotifications = [
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Midterm Lab Exam Announcement',
        createdBy: teacherVanceId,
        targetType: 'SECTION',
        targetSections: [sectionId],
        readBy: [
          { student: teacherVanceId, readAt: new Date() },
          { student: studentAliceId, readAt: new Date() }
        ]
      }
    ];
  }

  resetState();

  // ==========================================
  // SECTION 1: ROLE AUTHORIZATION
  // ==========================================
  console.log('--- Section 1: Role Authorization & Guarding ---');

  await test('1. ADMIN_HOD is authorized to permanently delete teacher accounts', async () => {
    const adminGuard = authorize('ADMIN_HOD');
    let allowed = false;
    adminGuard({ user: { role: 'ADMIN_HOD' } }, {}, (err) => {
      if (!err) allowed = true;
    });
    assert.strictEqual(allowed, true);
  });

  await test('2. STUDENT role is blocked from teacher deletion (403 Forbidden)', async () => {
    const adminGuard = authorize('ADMIN_HOD');
    let blocked = false;
    adminGuard({ user: { role: 'STUDENT' } }, {}, (err) => {
      if (err && err.statusCode === 403) blocked = true;
    });
    assert.strictEqual(blocked, true);
  });

  await test('3. TEACHER role cannot delete another teacher (403 Forbidden)', async () => {
    const adminGuard = authorize('ADMIN_HOD');
    let blocked = false;
    adminGuard({ user: { role: 'TEACHER' } }, {}, (err) => {
      if (err && err.statusCode === 403) blocked = true;
    });
    assert.strictEqual(blocked, true);
  });

  // ==========================================
  // SECTION 2: ACCOUNT TYPE SAFETY CHECKS
  // ==========================================
  console.log('\n--- Section 2: Account Type Safety Checks ---');

  await test('4. Attempting to delete a STUDENT through deleteTeacher is rejected with 400 Bad Request', async () => {
    await assert.rejects(
      async () => {
        await userService.deleteTeacher(studentAliceId);
      },
      (err) => err.statusCode === 400 && err.message.includes('Only teacher accounts can be permanently deleted')
    );
  });

  await test('5. Attempting to delete an ADMIN_HOD through deleteTeacher is rejected with 400 Bad Request', async () => {
    await assert.rejects(
      async () => {
        await userService.deleteTeacher(adminId);
      },
      (err) => err.statusCode === 400 && err.message.includes('Only teacher accounts can be permanently deleted')
    );
  });

  // ==========================================
  // SECTION 3: SAFE CASCADE CLEANUP
  // ==========================================
  console.log('\n--- Section 3: Safe Cascade Cleanup ---');

  await test('6. Deleting teacher removes User record and teacher lab assignments', async () => {
    resetState();
    assert.strictEqual(mockLabAssignments.length, 2);

    const result = await userService.deleteTeacher(teacherVanceId);

    assert.strictEqual(result.deletedTeacher.rollNumber, 'PROFVANCE');
    assert.strictEqual(result.cascadeSummary.assignmentsRemoved, 1);

    // Verify User record is deleted
    const vance = mockUsers.find((u) => u._id.toString() === teacherVanceId.toString());
    assert.strictEqual(vance, undefined, 'Teacher User document must be completely deleted');

    // Verify Vance lab assignment is deleted
    const vanceAssignments = mockLabAssignments.filter((a) => a.teacher.toString() === teacherVanceId.toString());
    assert.strictEqual(vanceAssignments.length, 0, 'Teacher lab assignments must be deleted');
  });

  await test('7. Other teachers (Prof. Smith) and their lab assignments remain intact', async () => {
    const smith = mockUsers.find((u) => u._id.toString() === teacherSmithId.toString());
    assert.ok(smith, 'Prof. Smith must remain in User collection');

    const smithAssignments = mockLabAssignments.filter((a) => a.teacher.toString() === teacherSmithId.toString());
    assert.strictEqual(smithAssignments.length, 1, 'Prof. Smith assignment must remain intact');
  });

  // ==========================================
  // SECTION 4: PRESERVATION OF SHARED ACADEMIC DATA
  // ==========================================
  console.log('\n--- Section 4: Preservation of Shared Academic Data & Student Records ---');

  await test('8. Labs, Sections, and Experiments are NOT deleted when teacher is deleted', async () => {
    assert.strictEqual(mockLabs.length, 1, 'Lab must remain intact');
    assert.strictEqual(mockSections.length, 1, 'Section must remain intact');
    assert.strictEqual(mockExperiments.length, 1, 'Experiment must remain intact');
  });

  await test('9. Student submissions, automated evaluations, and viva scores remain intact', async () => {
    assert.strictEqual(mockSubmissions.length, 1, 'Student submissions must NOT be deleted');
    assert.strictEqual(mockEvaluations.length, 1, 'Student evaluations must NOT be deleted');
    assert.strictEqual(mockVivaEvaluations.length, 1, 'Student viva evaluations must NOT be deleted');
    assert.strictEqual(mockReevaluations.length, 1, 'Student re-evaluation requests must NOT be deleted');
  });

  await test('10. Broadcast notifications remain intact for students', async () => {
    assert.strictEqual(mockNotifications.length, 1, 'Broadcast notification must NOT be deleted');
    const notif = mockNotifications[0];
    const aliceRead = notif.readBy.find((r) => r.student.toString() === studentAliceId.toString());
    assert.ok(aliceRead, 'Student Alice read receipt must remain intact');
  });

  // ==========================================
  // SECTION 5: IDEMPOTENCY & NOT FOUND
  // ==========================================
  console.log('\n--- Section 5: Idempotency & Error Handling ---');

  await test('11. Deleting non-existent or already deleted teacher returns 404 Not Found', async () => {
    await assert.rejects(
      async () => {
        await userService.deleteTeacher(teacherVanceId);
      },
      (err) => err.statusCode === 404 && err.message.includes('Teacher not found')
    );
  });

  await test('12. Unified deleteUser dispatches correctly based on role', async () => {
    resetState();
    // Student deletion via deleteUser
    const studentRes = await userService.deleteUser(studentAliceId);
    assert.strictEqual(studentRes.deletedStudent.rollNumber, '23341A4504');

    // Teacher deletion via deleteUser
    const teacherRes = await userService.deleteUser(teacherSmithId);
    assert.strictEqual(teacherRes.deletedTeacher.rollNumber, 'PROFSMITH');

    // Admin deletion blocked via deleteUser
    await assert.rejects(
      async () => {
        await userService.deleteUser(adminId);
      },
      (err) => err.statusCode === 400 && err.message.includes('Admin/HOD accounts cannot be permanently deleted')
    );
  });

  // Restore original methods
  User.findById = originalUserFindById;
  User.deleteOne = originalUserDeleteOne;
  LabAssignment.deleteMany = originalLabAssignmentDeleteMany;
  LabAssignment.find = originalLabAssignmentFind;
  Submission.find = originalSubmissionFind;
  Evaluation.find = originalEvaluationFind;
  VivaEvaluation.find = originalVivaFind;
  ReevaluationRequest.find = originalReevalFind;
  Notification.updateMany = originalNotificationUpdateMany;

  console.log(`\n==================================================`);
  console.log(`Teacher Deletion Tests: ${passed}/${total} PASSED (100%)`);
  console.log(`==================================================\n`);
}

runTeacherDeletionTests().catch((err) => {
  console.error('Teacher deletion test suite failed:', err);
  process.exit(1);
});
