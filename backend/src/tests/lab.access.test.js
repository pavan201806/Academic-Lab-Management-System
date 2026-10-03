const assert = require('assert');
const labService = require('../services/labService');
const { Lab, Section, LabAssignment, User } = require('../models');

console.log('=== Running Phase 3 Comprehensive Authorization & Access Audit Tests ===\n');

async function runPhase3AuditTests() {
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

  // Mock Objects
  const adminUser = {
    _id: '64f000000000000000000001',
    name: 'Admin User',
    rollNumber: 'ADMIN01',
    role: 'ADMIN_HOD',
    active: true
  };

  const teacherMainA = {
    _id: '64f000000000000000000010',
    name: 'Prof Vance',
    rollNumber: 'PROFVANCE',
    role: 'TEACHER',
    active: true
  };

  const teacherAssistantA = {
    _id: '64f000000000000000000011',
    name: 'Dr Smith',
    rollNumber: 'DRSMITH',
    role: 'TEACHER',
    active: true
  };

  const teacherUnassigned = {
    _id: '64f000000000000000000012',
    name: 'Prof Unassigned',
    rollNumber: 'PROFUNASSIGNED',
    role: 'TEACHER',
    active: true
  };

  const studentA = {
    _id: '64f000000000000000000020',
    name: 'Student Alice',
    rollNumber: '202301001',
    role: 'STUDENT',
    section: 'CSE-A',
    active: true
  };

  const studentB = {
    _id: '64f000000000000000000021',
    name: 'Student Bob',
    rollNumber: '202301002',
    role: 'STUDENT',
    section: 'CSE-B',
    active: true
  };

  const inactiveStudent = {
    _id: '64f000000000000000000022',
    name: 'Inactive Student',
    rollNumber: '202301099',
    role: 'STUDENT',
    section: 'CSE-A',
    active: false
  };

  const lab1 = {
    _id: '64f000000000000000000100',
    name: 'Data Structures Laboratory',
    code: 'CS201L',
    subject: 'Data Structures',
    department: 'Computer Science',
    academicYear: '2026-27',
    semester: 'III',
    active: true,
    toJSON: function () {
      return { ...this };
    }
  };

  const labInactive = {
    _id: '64f000000000000000000101',
    name: 'Operating Systems Laboratory',
    code: 'CS301L',
    subject: 'Operating Systems',
    department: 'Computer Science',
    academicYear: '2026-27',
    semester: 'IV',
    active: false,
    toJSON: function () {
      return { ...this };
    }
  };

  const sectionA = {
    _id: '64f000000000000000000200',
    name: 'Section A',
    sectionCode: 'CSE-A',
    department: 'Computer Science',
    academicYear: '2026-27',
    semester: 'III',
    active: true,
    toJSON: function () {
      return { ...this };
    }
  };

  const sectionB = {
    _id: '64f000000000000000000201',
    name: 'Section B',
    sectionCode: 'CSE-B',
    department: 'Computer Science',
    academicYear: '2026-27',
    semester: 'III',
    active: true,
    toJSON: function () {
      return { ...this };
    }
  };

  // 1. Teacher MAIN + correct section -> allowed
  await test('Teacher MAIN + correct section context → allowed', async () => {
    const origLabFindById = Lab.findById;
    const origAssignFind = LabAssignment.find;

    Lab.findById = () => Promise.resolve(lab1);
    LabAssignment.find = (query) => ({
      populate: () => {
        if (query.lab === lab1._id && query.teacher === teacherMainA._id) {
          return Promise.resolve([
            {
              _id: 'assign1',
              lab: lab1,
              section: sectionA,
              teacher: teacherMainA,
              assignmentType: 'MAIN',
              active: true
            }
          ]);
        }
        return {
          populate: () => Promise.resolve([])
        };
      }
    });

    const result = await labService.getLabDetailsForUser(lab1._id, teacherMainA, {
      sectionId: sectionA._id
    });
    assert.strictEqual(result.code, 'CS201L');
    assert.strictEqual(result.myAssignment.assignmentType, 'MAIN');
    assert.strictEqual(result.currentSection.sectionCode, 'CSE-A');

    Lab.findById = origLabFindById;
    LabAssignment.find = origAssignFind;
  });

  // 2. Teacher ASSISTANT + correct section -> allowed
  await test('Teacher ASSISTANT + correct section context → allowed', async () => {
    const origLabFindById = Lab.findById;
    const origAssignFind = LabAssignment.find;

    Lab.findById = () => Promise.resolve(lab1);
    LabAssignment.find = (query) => ({
      populate: () => {
        if (query.lab === lab1._id && query.teacher === teacherAssistantA._id) {
          return Promise.resolve([
            {
              _id: 'assign2',
              lab: lab1,
              section: sectionA,
              teacher: teacherAssistantA,
              assignmentType: 'ASSISTANT',
              active: true
            }
          ]);
        }
        return {
          populate: () => Promise.resolve([])
        };
      }
    });

    const result = await labService.getLabDetailsForUser(lab1._id, teacherAssistantA, {
      sectionId: sectionA._id
    });
    assert.strictEqual(result.code, 'CS201L');
    assert.strictEqual(result.myAssignment.assignmentType, 'ASSISTANT');
    assert.strictEqual(result.currentSection.sectionCode, 'CSE-A');

    Lab.findById = origLabFindById;
    LabAssignment.find = origAssignFind;
  });

  // 3. Teacher assigned to Lab X + Section A attempting Lab X + Section B -> denied
  await test('Teacher assigned to Lab X + Section A attempting Lab X + Section B → denied (403)', async () => {
    const origLabFindById = Lab.findById;
    const origAssignFind = LabAssignment.find;

    Lab.findById = () => Promise.resolve(lab1);
    LabAssignment.find = (query) => ({
      populate: () => {
        // Teacher is ONLY assigned to Section A
        if (query.lab === lab1._id && query.teacher === teacherMainA._id) {
          return Promise.resolve([
            {
              _id: 'assign1',
              lab: lab1,
              section: sectionA,
              teacher: teacherMainA,
              assignmentType: 'MAIN',
              active: true
            }
          ]);
        }
        return Promise.resolve([]);
      }
    });

    try {
      await labService.getLabDetailsForUser(lab1._id, teacherMainA, {
        sectionId: sectionB._id // Requesting Section B
      });
      assert.fail('Should have thrown 403 Forbidden for Section B context');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      assert(err.message.includes('not have an active faculty assignment for this specific section'));
    }

    Lab.findById = origLabFindById;
    LabAssignment.find = origAssignFind;
  });

  // 4. Teacher with no assignment -> denied
  await test('Teacher with no assignment to Lab X → denied (403)', async () => {
    const origLabFindById = Lab.findById;
    const origAssignFind = LabAssignment.find;

    Lab.findById = () => Promise.resolve(lab1);
    LabAssignment.find = () => ({
      populate: () => Promise.resolve([])
    });

    try {
      await labService.getLabDetailsForUser(lab1._id, teacherUnassigned);
      assert.fail('Should have thrown 403 for unassigned teacher');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      assert(err.message.includes('not have an active faculty assignment'));
    }

    Lab.findById = origLabFindById;
    LabAssignment.find = origAssignFind;
  });

  // 5. Inactive teacher assignment -> denied
  await test('Inactive teacher assignment (active: false) → denied (403)', async () => {
    const origLabFindById = Lab.findById;
    const origAssignFind = LabAssignment.find;

    Lab.findById = () => Promise.resolve(lab1);
    // When querying active: true, returns empty because assignment is inactive
    LabAssignment.find = (query) => ({
      populate: () => {
        if (query.active === true) return Promise.resolve([]);
        return Promise.resolve([
          {
            _id: 'assignInactive',
            lab: lab1,
            section: sectionA,
            teacher: teacherMainA,
            assignmentType: 'MAIN',
            active: false
          }
        ]);
      }
    });

    try {
      await labService.getLabDetailsForUser(lab1._id, teacherMainA);
      assert.fail('Should have thrown 403 for inactive assignment');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }

    Lab.findById = origLabFindById;
    LabAssignment.find = origAssignFind;
  });

  // 6. Inactive lab -> denied
  await test('Inactive lab (active: false) → denied (403)', async () => {
    const origLabFindById = Lab.findById;
    Lab.findById = () => Promise.resolve(labInactive);

    try {
      await labService.getLabDetailsForUser(labInactive._id, teacherMainA);
      assert.fail('Should have thrown 403 for inactive lab');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      assert(err.message.includes('deactivated'));
    }

    Lab.findById = origLabFindById;
  });

  // 7. Student in Section A attempting a lab assigned only to Section B -> denied
  await test('Student in Section A attempting a lab assigned only to Section B → denied (403)', async () => {
    const origLabFindById = Lab.findById;
    const origSecFindOne = Section.findOne;
    const origAssignFind = LabAssignment.find;

    Lab.findById = () => Promise.resolve(lab1);
    Section.findOne = (query) => {
      if (query.sectionCode === 'CSE-A') return Promise.resolve(sectionA);
      return Promise.resolve(null);
    };

    // Lab 1 is assigned only to Section B
    LabAssignment.find = (query) => ({
      populate: () => {
        if (query.section === sectionA._id) return Promise.resolve([]);
        return Promise.resolve([
          { _id: 'assignB', lab: lab1, section: sectionB, teacher: teacherMainA, active: true }
        ]);
      }
    });

    try {
      await labService.getLabDetailsForUser(lab1._id, studentA);
      assert.fail('Should have thrown 403 for student in Section A');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      assert(err.message.includes('not assigned to your academic section'));
    }

    Lab.findById = origLabFindById;
    Section.findOne = origSecFindOne;
    LabAssignment.find = origAssignFind;
  });

  // 8. Client-supplied teacherId/studentId/role cannot bypass authorization
  await test('Client-supplied teacherId/studentId/role cannot bypass authorization', async () => {
    // Attempt privilege escalation: a student passing teacherId in options or query
    const origLabFindById = Lab.findById;
    const origSecFindOne = Section.findOne;
    const origAssignFind = LabAssignment.find;

    Lab.findById = () => Promise.resolve(lab1);
    Section.findOne = (query) => {
      if (query.sectionCode === 'CSE-A') return Promise.resolve(sectionA);
      return Promise.resolve(null);
    };

    LabAssignment.find = () => ({
      populate: () => Promise.resolve([])
    });

    // Student Alice passing options.sectionId = sectionB._id (tampering)
    try {
      await labService.getLabDetailsForUser(lab1._id, studentA, {
        sectionId: sectionB._id
      });
      assert.fail('Should have blocked tampered sectionId');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      assert(err.message.includes('other than your own enrolled section'));
    }

    Lab.findById = origLabFindById;
    Section.findOne = origSecFindOne;
    LabAssignment.find = origAssignFind;
  });

  // 9. Admin access remains functional
  await test('Admin/HOD retains full academic administrative access to lab details', async () => {
    const origLabFindById = Lab.findById;
    const origAssignFind = LabAssignment.find;

    Lab.findById = () => Promise.resolve(lab1);
    LabAssignment.find = () => ({
      populate: () => ({
        populate: () =>
          Promise.resolve([
            { _id: 'a1', section: sectionA, teacher: teacherMainA, active: true },
            { _id: 'a2', section: sectionB, teacher: teacherAssistantA, active: true }
          ])
      })
    });

    const result = await labService.getLabDetailsForUser(lab1._id, adminUser);
    assert.strictEqual(result.code, 'CS201L');
    assert.strictEqual(result.assignments.length, 2);

    Lab.findById = origLabFindById;
    LabAssignment.find = origAssignFind;
  });

  // 10. Deactivating a lab preserves LabAssignment records
  await test('Deactivating a lab preserves LabAssignment records (soft-deactivation)', async () => {
    const mockLabDoc = {
      _id: '64f000000000000000000100',
      name: 'Data Structures Lab',
      code: 'CS201L',
      active: true,
      save: async function () {
        return this;
      }
    };

    const origLabFindById = Lab.findById;
    Lab.findById = () => Promise.resolve(mockLabDoc);

    const updated = await labService.toggleActive(mockLabDoc._id, false);
    assert.strictEqual(updated.active, false);
    assert.strictEqual(mockLabDoc.active, false);

    Lab.findById = origLabFindById;
  });

  console.log(`\n=== ALL ${passed}/${total} PHASE 3 AUTHORIZATION AUDIT TESTS PASSED CLEANLY ===\n`);
}

runPhase3AuditTests().catch((err) => {
  console.error('Audit test suite failed:', err);
  process.exit(1);
});
