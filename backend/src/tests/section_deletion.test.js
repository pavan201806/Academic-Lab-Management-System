const assert = require('assert');
const mongoose = require('mongoose');
const sectionService = require('../services/sectionService');
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

console.log('=== Running Section Permanent Deletion & Dependency Protection Test Suite ===\n');

async function runSectionDeletionTests() {
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
  const originalSectionFindById = Section.findById;
  const originalSectionDeleteOne = Section.deleteOne;
  const originalSectionFind = Section.find;
  const originalUserCountDocuments = User.countDocuments;
  const originalUserFind = User.find;
  const originalLabAssignmentDeleteMany = LabAssignment.deleteMany;
  const originalLabAssignmentFind = LabAssignment.find;
  const originalNotificationUpdateMany = Notification.updateMany;

  Section.findById = async function (id) {
    return mockSections.find((s) => s._id.toString() === id.toString()) || null;
  };

  Section.deleteOne = async function (query) {
    const prevCount = mockSections.length;
    mockSections = mockSections.filter((s) => s._id.toString() !== query._id.toString());
    return { deletedCount: prevCount - mockSections.length };
  };

  User.countDocuments = function (query = {}) {
    let count = 0;
    if (query.section) {
      let regex;
      if (query.section.$regex) {
        regex = query.section.$regex;
      } else if (typeof query.section === 'string') {
        regex = new RegExp(`^${query.section}$`, 'i');
      }
      count = mockUsers.filter((u) => {
        const matchesSection = regex ? regex.test(u.section) : u.section === query.section;
        const matchesRole = query.role ? u.role === query.role : true;
        return matchesSection && matchesRole;
      }).length;
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

  LabAssignment.deleteMany = function (query) {
    const secId = query.section ? query.section.toString() : null;
    const prevCount = mockLabAssignments.length;
    if (secId) {
      mockLabAssignments = mockLabAssignments.filter((a) => a.section.toString() !== secId);
    }
    const result = { deletedCount: prevCount - mockLabAssignments.length };
    return {
      session: function () {
        return Promise.resolve(result);
      },
      then: function (resolve) {
        return Promise.resolve(result).then(resolve);
      }
    };
  };

  LabAssignment.find = async function (query = {}) {
    if (query.section) {
      return mockLabAssignments.filter((a) => a.section.toString() === query.section.toString());
    }
    return mockLabAssignments;
  };

  Notification.updateMany = function (filter, update) {
    if (update.$pull && update.$pull.targetSections) {
      const secId = update.$pull.targetSections.toString();
      mockNotifications.forEach((n) => {
        if (n.targetSections && Array.isArray(n.targetSections)) {
          n.targetSections = n.targetSections.filter((s) => s.toString() !== secId);
        }
      });
    }
    const result = { modifiedCount: mockNotifications.length };
    return {
      session: function () {
        return Promise.resolve(result);
      },
      then: function (resolve) {
        return Promise.resolve(result).then(resolve);
      }
    };
  };

  // Helper to reset and populate mock database
  const populatedSectionId1 = new mongoose.Types.ObjectId(); // Section AIDS-A (has students)
  const emptySectionId2 = new mongoose.Types.ObjectId(); // Section AIDS-B (0 students)
  const anotherSectionId3 = new mongoose.Types.ObjectId(); // Section CSE-A (has students)

  const teacherId1 = new mongoose.Types.ObjectId();
  const labId1 = new mongoose.Types.ObjectId();
  const studentId1 = new mongoose.Types.ObjectId();

  function resetDatabase() {
    mockSections = [
      {
        _id: populatedSectionId1,
        name: 'AI & Data Science Section A',
        sectionCode: 'AIDS-A',
        department: 'Artificial Intelligence & Data Science',
        academicYear: '2026-2027',
        semester: 'Semester 1',
        active: true,
        toJSON: function () {
          return { ...this };
        }
      },
      {
        _id: emptySectionId2,
        name: 'AI & Data Science Section B',
        sectionCode: 'AIDS-B',
        department: 'Artificial Intelligence & Data Science',
        academicYear: '2026-2027',
        semester: 'Semester 1',
        active: true,
        toJSON: function () {
          return { ...this };
        }
      },
      {
        _id: anotherSectionId3,
        name: 'Computer Science Section A',
        sectionCode: 'CSE-A',
        department: 'Computer Science & Engineering',
        academicYear: '2026-2027',
        semester: 'Semester 1',
        active: true,
        toJSON: function () {
          return { ...this };
        }
      }
    ];

    mockUsers = [
      {
        _id: studentId1,
        name: 'Alice Student',
        rollNumber: '26GR1B07001',
        role: 'STUDENT',
        section: 'AIDS-A',
        active: true
      },
      {
        _id: teacherId1,
        name: 'Prof. John Smith',
        rollNumber: 'TCH001',
        role: 'TEACHER',
        active: true
      }
    ];

    mockLabs = [
      {
        _id: labId1,
        name: 'Data Structures Laboratory',
        code: 'CS201L',
        department: 'Computer Science & Engineering',
        active: true
      }
    ];

    mockLabAssignments = [
      {
        _id: new mongoose.Types.ObjectId(),
        lab: labId1,
        section: emptySectionId2,
        teacher: teacherId1,
        assignmentType: 'MAIN',
        active: true
      },
      {
        _id: new mongoose.Types.ObjectId(),
        lab: labId1,
        section: populatedSectionId1,
        teacher: teacherId1,
        assignmentType: 'MAIN',
        active: true
      }
    ];

    mockExperiments = [
      {
        _id: new mongoose.Types.ObjectId(),
        lab: labId1,
        title: 'Binary Search Tree Implementation',
        experimentNumber: 1,
        status: 'PUBLISHED'
      }
    ];

    mockSubmissions = [
      {
        _id: new mongoose.Types.ObjectId(),
        student: studentId1,
        experiment: mockExperiments[0]._id,
        lab: labId1,
        section: populatedSectionId1,
        attemptNumber: 1
      }
    ];

    mockEvaluations = [
      {
        _id: new mongoose.Types.ObjectId(),
        submission: mockSubmissions[0]._id,
        student: studentId1,
        experiment: mockExperiments[0]._id,
        lab: labId1,
        score: 9.5
      }
    ];

    mockNotifications = [
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Section B Schedule',
        targetType: 'SECTION',
        targetSections: [emptySectionId2, populatedSectionId1],
        active: true
      }
    ];
  }

  // ==========================================
  // SECTION 1: ROLE AUTHORIZATION & GUARDING
  // ==========================================
  console.log('--- Section 1: Role Authorization & Guarding ---');

  await test('1. ADMIN_HOD is authorized to delete sections', async () => {
    const authMiddleware = authorize('ADMIN_HOD');
    let nextCalled = false;
    const req = { user: { role: 'ADMIN_HOD' } };
    const res = {};
    authMiddleware(req, res, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true, 'ADMIN_HOD must be authorized to delete sections');
  });

  await test('2. STUDENT role is blocked from section deletion (403 Forbidden)', async () => {
    const authMiddleware = authorize('ADMIN_HOD');
    let errorReceived = null;
    const req = { user: { role: 'STUDENT' } };
    const res = {};
    authMiddleware(req, res, (err) => {
      errorReceived = err;
    });
    assert.ok(errorReceived, 'STUDENT role must be blocked');
    assert.strictEqual(errorReceived.statusCode, 403, 'Expected 403 Forbidden');
  });

  await test('3. TEACHER role is blocked from section deletion (403 Forbidden)', async () => {
    const authMiddleware = authorize('ADMIN_HOD');
    let errorReceived = null;
    const req = { user: { role: 'TEACHER' } };
    const res = {};
    authMiddleware(req, res, (err) => {
      errorReceived = err;
    });
    assert.ok(errorReceived, 'TEACHER role must be blocked');
    assert.strictEqual(errorReceived.statusCode, 403, 'Expected 403 Forbidden');
  });

  // ==========================================
  // SECTION 2: STUDENT PROTECTION (CRITICAL SAFETY RULE)
  // ==========================================
  console.log('\n--- Section 2: Student Protection (Critical Safety Rule) ---');

  await test('4. Attempting to delete a section with assigned students is strictly BLOCKED (400 Bad Request)', async () => {
    resetDatabase();

    let threw = false;
    try {
      await sectionService.deleteSection(populatedSectionId1.toString());
    } catch (err) {
      threw = true;
      assert.strictEqual(err.statusCode, 400, 'Expected 400 Bad Request for section with assigned students');
      assert.ok(
        err.message.includes('currently assigned') || err.message.includes('student'),
        'Error message must indicate students are currently assigned'
      );
    }
    assert.strictEqual(threw, true, 'Deletion must throw an error when students are assigned');

    // Verify section still exists in database
    const sec = mockSections.find((s) => s._id.toString() === populatedSectionId1.toString());
    assert.ok(sec, 'Section with students must NOT be deleted');

    // Verify student records are completely untouched
    const student = mockUsers.find((u) => u._id.toString() === studentId1.toString());
    assert.ok(student, 'Student account must remain untouched');
    assert.strictEqual(student.section, 'AIDS-A', 'Student section assignment must NOT be detached');
  });

  await test('5. Inactive students assigned to section also BLOCK deletion', async () => {
    resetDatabase();
    // Mark the student inactive
    mockUsers[0].active = false;

    let threw = false;
    try {
      await sectionService.deleteSection(populatedSectionId1.toString());
    } catch (err) {
      threw = true;
      assert.strictEqual(err.statusCode, 400, 'Expected 400 Bad Request when inactive students exist');
    }
    assert.strictEqual(threw, true, 'Deletion must throw error even for inactive assigned students');
  });

  // ==========================================
  // SECTION 3: EMPTY SECTION SAFE CASCADE DELETION
  // ==========================================
  console.log('\n--- Section 3: Empty Section Safe Cascade Deletion ---');

  await test('6. Section with 0 students is permanently deleted', async () => {
    resetDatabase();

    const result = await sectionService.deleteSection(emptySectionId2.toString());
    assert.ok(result.success, 'Result must indicate success');

    // Verify Section document was removed
    const foundSec = mockSections.find((s) => s._id.toString() === emptySectionId2.toString());
    assert.strictEqual(foundSec, undefined, 'Section document must be removed from mockSections');
  });

  await test('7. Section-specific LabAssignment records are deleted when section is deleted', async () => {
    resetDatabase();

    // Verify assignment for Section B existed prior to deletion
    const beforeCount = mockLabAssignments.filter((a) => a.section.toString() === emptySectionId2.toString()).length;
    assert.strictEqual(beforeCount, 1, 'Pre-condition: 1 assignment existed for Section B');

    await sectionService.deleteSection(emptySectionId2.toString());

    // Verify assignment for Section B was removed
    const afterCount = mockLabAssignments.filter((a) => a.section.toString() === emptySectionId2.toString()).length;
    assert.strictEqual(afterCount, 0, 'Section B lab assignment must be removed');

    // Verify assignments for other sections remain intact
    const otherAssignments = mockLabAssignments.filter((a) => a.section.toString() === populatedSectionId1.toString());
    assert.strictEqual(otherAssignments.length, 1, 'Assignments for Section A must remain untouched');
  });

  await test('8. Notification targetSections reference is pulled cleanly', async () => {
    resetDatabase();

    await sectionService.deleteSection(emptySectionId2.toString());

    const notif = mockNotifications[0];
    const hasDeletedSec = notif.targetSections.some((s) => s.toString() === emptySectionId2.toString());
    assert.strictEqual(hasDeletedSec, false, 'Deleted section ID must be pulled from targetSections');

    const hasOtherSec = notif.targetSections.some((s) => s.toString() === populatedSectionId1.toString());
    assert.strictEqual(hasOtherSec, true, 'Other section IDs must remain in targetSections');
  });

  // ==========================================
  // SECTION 4: PRESERVATION OF SHARED ACADEMIC DATA
  // ==========================================
  console.log('\n--- Section 4: Preservation of Shared Academic Data & Academic History ---');

  await test('9. Teachers, Labs, Experiments, and Submissions are NOT deleted when section is deleted', async () => {
    resetDatabase();

    await sectionService.deleteSection(emptySectionId2.toString());

    // Verify Teachers remain
    assert.strictEqual(mockUsers.filter((u) => u.role === 'TEACHER').length, 1, 'Teacher account must remain intact');

    // Verify Labs remain
    assert.strictEqual(mockLabs.length, 1, 'Lab entity must remain intact');

    // Verify Experiments remain
    assert.strictEqual(mockExperiments.length, 1, 'Experiment curriculum must remain intact');

    // Verify Submissions and Evaluations remain
    assert.strictEqual(mockSubmissions.length, 1, 'Submissions must remain intact');
    assert.strictEqual(mockEvaluations.length, 1, 'Evaluations must remain intact');
  });

  await test('10. Other sections and their student enrollments remain intact', async () => {
    resetDatabase();

    await sectionService.deleteSection(emptySectionId2.toString());

    const remainingSections = mockSections.map((s) => s.sectionCode);
    assert.deepStrictEqual(remainingSections, ['AIDS-A', 'CSE-A'], 'Other sections must remain intact');

    const studentAlice = mockUsers.find((u) => u.rollNumber === '26GR1B07001');
    assert.ok(studentAlice, 'Alice must remain intact');
    assert.strictEqual(studentAlice.section, 'AIDS-A', 'Alice section must remain AIDS-A');
  });

  // ==========================================
  // SECTION 5: IDEMPOTENCY & ERROR HANDLING
  // ==========================================
  console.log('\n--- Section 5: Idempotency & Error Handling ---');

  await test('11. Deleting non-existent or already deleted section returns 404 Not Found', async () => {
    resetDatabase();

    const fakeId = new mongoose.Types.ObjectId();
    let threw = false;
    try {
      await sectionService.deleteSection(fakeId.toString());
    } catch (err) {
      threw = true;
      assert.strictEqual(err.statusCode, 404, 'Expected 404 Not Found');
    }
    assert.strictEqual(threw, true, 'Non-existent section must throw 404');
  });

  await test('12. Repeat deletion of the same section returns 404 without crashing', async () => {
    resetDatabase();

    // First deletion succeeds
    await sectionService.deleteSection(emptySectionId2.toString());

    // Second deletion throws 404
    let secondThrew = false;
    try {
      await sectionService.deleteSection(emptySectionId2.toString());
    } catch (err) {
      secondThrew = true;
      assert.strictEqual(err.statusCode, 404, 'Expected 404 on repeat deletion');
    }
    assert.strictEqual(secondThrew, true, 'Repeat deletion must return 404');
  });

  console.log('\n==================================================');
  console.log(`Section Deletion Tests: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('==================================================\n');

  // Restore original methods
  Section.findById = originalSectionFindById;
  Section.deleteOne = originalSectionDeleteOne;
  Section.find = originalSectionFind;
  User.countDocuments = originalUserCountDocuments;
  User.find = originalUserFind;
  LabAssignment.deleteMany = originalLabAssignmentDeleteMany;
  LabAssignment.find = originalLabAssignmentFind;
  Notification.updateMany = originalNotificationUpdateMany;
}

runSectionDeletionTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
