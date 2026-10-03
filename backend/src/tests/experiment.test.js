const assert = require('assert');
const experimentService = require('../services/experimentService');
const { Experiment, Lab, Section, LabAssignment, User } = require('../models');

console.log('=== Running Phase 4 Experiment Management & Authoring Tests ===\n');

async function runPhase4Tests() {
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

  const lab2 = {
    _id: '64f000000000000000000102',
    name: 'Algorithms Laboratory',
    code: 'CS202L',
    subject: 'Algorithms',
    department: 'Computer Science',
    academicYear: '2026-27',
    semester: 'III',
    active: true,
    toJSON: function () {
      return { ...this };
    }
  };

  const sectionA = {
    _id: '64f000000000000000000200',
    name: 'Section A',
    sectionCode: 'CSE-A',
    active: true,
    toJSON: function () {
      return { ...this };
    }
  };

  // Helper to mock lab finding and teacher assignments
  function setupLabAssignmentMocks() {
    Lab.findById = (id) => {
      if (id?.toString() === lab1._id.toString()) return Promise.resolve(lab1);
      if (id?.toString() === lab2._id.toString()) return Promise.resolve(lab2);
      return Promise.resolve(null);
    };

    LabAssignment.find = (query) => {
      // Teacher Vance & Dr Smith assigned to Lab 1
      if (query.lab === lab1._id && (query.teacher === teacherMainA._id || query.teacher === teacherAssistantA._id)) {
        return Promise.resolve([
          { _id: 'asg1', lab: lab1, section: sectionA, teacher: teacherMainA, active: true }
        ]);
      }
      return Promise.resolve([]);
    };

    LabAssignment.findOne = (query) => {
      if (query.lab === lab1._id && query.section === sectionA._id && query.active === true) {
        return Promise.resolve({ _id: 'asg1', lab: lab1, section: sectionA, active: true });
      }
      return Promise.resolve(null);
    };

    Section.findOne = (query) => {
      if (query.sectionCode === 'CSE-A') return Promise.resolve(sectionA);
      return Promise.resolve(null);
    };
  }

  setupLabAssignmentMocks();

  // 1. Admin can create experiment
  await test('Admin can create experiment', async () => {
    Experiment.countDocuments = () => Promise.resolve(0);
    Experiment.findOne = () => Promise.resolve(null);
    Experiment.create = (doc) => Promise.resolve({ _id: 'exp1', ...doc });

    const result = await experimentService.createExperiment(
      {
        lab: lab1._id,
        title: 'Binary Search Trees',
        experimentNumber: 1,
        programmingLanguages: ['C', 'C++']
      },
      adminUser
    );
    assert.strictEqual(result.title, 'Binary Search Trees');
    assert.strictEqual(result.experimentNumber, 1);
  });

  // 2. Authorized MAIN teacher can create
  await test('Authorized MAIN teacher can create experiment', async () => {
    Experiment.countDocuments = () => Promise.resolve(0);
    Experiment.findOne = () => Promise.resolve(null);
    Experiment.create = (doc) => Promise.resolve({ _id: 'exp2', ...doc });

    const result = await experimentService.createExperiment(
      {
        lab: lab1._id,
        title: 'Stack Operations',
        experimentNumber: 2,
        programmingLanguages: ['Python']
      },
      teacherMainA
    );
    assert.strictEqual(result.title, 'Stack Operations');
    assert.strictEqual(result.status, 'DRAFT');
  });

  // 3. Authorized ASSISTANT teacher can create
  await test('Authorized ASSISTANT teacher can create experiment', async () => {
    Experiment.countDocuments = () => Promise.resolve(0);
    Experiment.findOne = () => Promise.resolve(null);
    Experiment.create = (doc) => Promise.resolve({ _id: 'exp3', ...doc });

    const result = await experimentService.createExperiment(
      {
        lab: lab1._id,
        title: 'Queue Operations',
        experimentNumber: 3,
        programmingLanguages: ['Java']
      },
      teacherAssistantA
    );
    assert.strictEqual(result.title, 'Queue Operations');
  });

  // 4. Unauthorized teacher cannot create
  await test('Unauthorized teacher cannot create experiment (403)', async () => {
    try {
      await experimentService.createExperiment(
        {
          lab: lab1._id,
          title: 'Unauthorized Exp',
          experimentNumber: 4,
          programmingLanguages: ['C']
        },
        teacherUnassigned
      );
      assert.fail('Should have failed for unassigned teacher');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      assert(err.message.includes('not have an active faculty assignment'));
    }
  });

  // 5. Student cannot create
  await test('Student cannot create experiment (403)', async () => {
    try {
      await experimentService.createExperiment(
        {
          lab: lab1._id,
          title: 'Student Created Exp',
          experimentNumber: 5,
          programmingLanguages: ['C']
        },
        studentA
      );
      assert.fail('Should have failed for student');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      assert(err.message.includes('Students are not authorized'));
    }
  });

  // 6. Duplicate experiment number rejected
  await test('Duplicate experiment number rejected (409)', async () => {
    Experiment.countDocuments = () => Promise.resolve(1);
    Experiment.findOne = (query) => {
      if (query.experimentNumber === 1) return Promise.resolve({ _id: 'existing1', experimentNumber: 1 });
      return Promise.resolve(null);
    };

    try {
      await experimentService.createExperiment(
        {
          lab: lab1._id,
          title: 'Duplicate Exp',
          experimentNumber: 1,
          programmingLanguages: ['C']
        },
        teacherMainA
      );
      assert.fail('Should have rejected duplicate number');
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
      assert(err.message.includes('already exists'));
    }
  });

  // 7. Experiment number above 12 rejected
  await test('Experiment number above 12 rejected (400)', async () => {
    try {
      await experimentService.createExperiment(
        {
          lab: lab1._id,
          title: 'Over 12 Exp',
          experimentNumber: 13,
          programmingLanguages: ['C']
        },
        teacherMainA
      );
      assert.fail('Should have rejected number > 12');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  // 8. Maximum 12 experiments per lab enforced
  await test('Maximum 12 experiments per lab limit enforced (400)', async () => {
    Experiment.countDocuments = () => Promise.resolve(12); // Already 12 active
    Experiment.findOne = () => Promise.resolve(null);

    try {
      await experimentService.createExperiment(
        {
          lab: lab1._id,
          title: '13th Exp',
          experimentNumber: 12,
          programmingLanguages: ['C']
        },
        teacherMainA
      );
      assert.fail('Should have rejected when count is 12');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert(err.message.includes('maximum limit of 12 experiments'));
    }
  });

  // 9. Authorized teacher can edit experiment
  await test('Authorized teacher can edit experiment', async () => {
    const mockExp = {
      _id: 'exp1',
      lab: lab1._id,
      title: 'Original Title',
      experimentNumber: 1,
      programmingLanguages: ['C'],
      save: async function () {
        return this;
      }
    };
    Experiment.findById = () => Promise.resolve(mockExp);
    Experiment.findOne = () => Promise.resolve(null);

    const updated = await experimentService.updateExperiment(
      'exp1',
      { title: 'Updated Title', programmingLanguages: ['C', 'Python'] },
      teacherMainA
    );
    assert.strictEqual(updated.title, 'Updated Title');
    assert.deepStrictEqual(updated.programmingLanguages, ['C', 'Python']);
  });

  // 10. Unauthorized teacher cannot edit experiment
  await test('Unauthorized teacher cannot edit experiment (403)', async () => {
    const mockExp = {
      _id: 'exp1',
      lab: lab1._id,
      title: 'Original Title'
    };
    Experiment.findById = () => Promise.resolve(mockExp);

    try {
      await experimentService.updateExperiment(
        'exp1',
        { title: 'Hacked Title' },
        teacherUnassigned
      );
      assert.fail('Should have failed for unassigned teacher');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }
  });

  // 11. Student cannot edit experiment
  await test('Student cannot edit experiment (403)', async () => {
    const mockExp = {
      _id: 'exp1',
      lab: lab1._id,
      title: 'Original Title'
    };
    Experiment.findById = () => Promise.resolve(mockExp);

    try {
      await experimentService.updateExperiment(
        'exp1',
        { title: 'Student Edited Title' },
        studentA
      );
      assert.fail('Should have failed for student');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }
  });

  // 12. Cross-lab IDOR attempt rejected
  await test('Cross-lab IDOR attempt rejected (403)', async () => {
    // Experiment belongs to Lab 2 (Algorithms Lab)
    // Teacher Vance is only assigned to Lab 1
    const mockExpLab2 = {
      _id: 'expLab2',
      lab: lab2._id,
      title: 'Graph Traversal'
    };
    Experiment.findById = () => Promise.resolve(mockExpLab2);

    try {
      await experimentService.updateExperiment('expLab2', { title: 'Cross Lab Edit' }, teacherMainA);
      assert.fail('Should have failed cross-lab edit');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }
  });

  // 13. Draft can be published when valid
  await test('Draft experiment can be published by authorized teacher', async () => {
    const mockExp = {
      _id: 'exp1',
      lab: lab1._id,
      title: 'Valid Experiment',
      programmingLanguages: ['C++'],
      status: 'DRAFT',
      save: async function () {
        return this;
      }
    };
    Experiment.findById = () => Promise.resolve(mockExp);

    const published = await experimentService.publishExperiment('exp1', teacherMainA);
    assert.strictEqual(published.status, 'PUBLISHED');
    assert(published.publishedAt instanceof Date);
  });

  // 14. Unauthorized teacher / student cannot publish
  await test('Student cannot publish experiment (403)', async () => {
    const mockExp = {
      _id: 'exp1',
      lab: lab1._id,
      title: 'Valid Experiment',
      programmingLanguages: ['C++'],
      status: 'DRAFT'
    };
    Experiment.findById = () => Promise.resolve(mockExp);

    try {
      await experimentService.publishExperiment('exp1', studentA);
      assert.fail('Student should not publish');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }
  });

  // 15. Scheduling experiment with valid dates works
  await test('Scheduling experiment sets status SCHEDULED and stores dates', async () => {
    const mockExp = {
      _id: 'exp1',
      lab: lab1._id,
      status: 'DRAFT',
      save: async function () {
        return this;
      }
    };
    Experiment.findById = () => Promise.resolve(mockExp);

    const futureDate = new Date(Date.now() + 86400000 * 2);
    const deadlineDate = new Date(Date.now() + 86400000 * 7);

    const scheduled = await experimentService.scheduleExperiment(
      'exp1',
      futureDate,
      deadlineDate,
      teacherMainA
    );
    assert.strictEqual(scheduled.status, 'SCHEDULED');
    assert.strictEqual(scheduled.scheduledAt.getTime(), futureDate.getTime());
    assert.strictEqual(scheduled.deadline.getTime(), deadlineDate.getTime());
  });

  // 16. Deadline before schedule is rejected
  await test('Deadline before scheduled date is rejected (400)', async () => {
    const mockExp = {
      _id: 'exp1',
      lab: lab1._id,
      status: 'DRAFT'
    };
    Experiment.findById = () => Promise.resolve(mockExp);

    const futureDate = new Date(Date.now() + 86400000 * 5);
    const earlyDeadline = new Date(Date.now() + 86400000 * 2);

    try {
      await experimentService.scheduleExperiment(
        'exp1',
        futureDate,
        earlyDeadline,
        teacherMainA
      );
      assert.fail('Should have rejected deadline < scheduledAt');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert(err.message.includes('Deadline cannot be before'));
    }
  });

  // 17. Authorized teacher can reopen closed experiment
  await test('Authorized teacher can reopen closed experiment', async () => {
    const mockExp = {
      _id: 'exp1',
      lab: lab1._id,
      status: 'CLOSED',
      save: async function () {
        return this;
      }
    };
    Experiment.findById = () => Promise.resolve(mockExp);

    const reopenUntil = new Date(Date.now() + 86400000 * 3);
    const reopened = await experimentService.reopenExperiment('exp1', reopenUntil, teacherMainA);
    assert.strictEqual(reopened.status, 'REOPENED');
    assert.strictEqual(reopened.reopenedUntil.getTime(), reopenUntil.getTime());
  });

  // 18. Student cannot reopen experiment
  await test('Student cannot reopen experiment (403)', async () => {
    const mockExp = {
      _id: 'exp1',
      lab: lab1._id,
      status: 'CLOSED'
    };
    Experiment.findById = () => Promise.resolve(mockExp);

    try {
      await experimentService.reopenExperiment('exp1', null, studentA);
      assert.fail('Student should not reopen');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }
  });

  // 19. Students can only see published experiments (not drafts)
  await test('Students only receive published/reopened experiments in list', async () => {
    const mockList = [
      { _id: 'e1', title: 'Exp 1', status: 'PUBLISHED', order: 1 },
      { _id: 'e2', title: 'Exp 2', status: 'DRAFT', order: 2 },
      { _id: 'e3', title: 'Exp 3', status: 'REOPENED', order: 3 }
    ];

    Experiment.find = (query) => {
      let filtered = mockList;
      if (query.status && query.status.$in) {
        filtered = filtered.filter((e) => query.status.$in.includes(e.status));
      }
      return {
        populate: () => ({
          sort: () => Promise.resolve(filtered)
        })
      };
    };

    const studentVisible = await experimentService.getExperiments(lab1._id, studentA);
    assert.strictEqual(studentVisible.length, 2);
    assert(studentVisible.every((e) => e.status === 'PUBLISHED' || e.status === 'REOPENED'));
  });

  // 20. Soft deactivation preserves experiment record
  await test('Deactivating an experiment updates active: false without deleting document', async () => {
    const mockExp = {
      _id: 'exp1',
      lab: lab1._id,
      active: true,
      save: async function () {
        return this;
      }
    };
    Experiment.findById = () => Promise.resolve(mockExp);

    const deactivated = await experimentService.toggleActive('exp1', false, teacherMainA);
    assert.strictEqual(deactivated.active, false);
    assert.strictEqual(mockExp.active, false);
  });

  // === AUDIT SPECIFIC TESTS (Items 1 - 10) ===

  // Audit 1: Client-supplied role cannot bypass experiment authorization
  await test('[Audit 1] Client-supplied role in payload cannot bypass experiment authorization', async () => {
    // Attempting to pass role: 'ADMIN_HOD' in request payload while authenticated as student
    const spoofedPayload = {
      lab: lab1._id,
      title: 'Privilege Escalation Attempt',
      experimentNumber: 6,
      role: 'ADMIN_HOD', // Attacker trying to spoof role
      programmingLanguages: ['Python']
    };

    try {
      await experimentService.createExperiment(spoofedPayload, studentA); // Service uses authenticated user studentA
      assert.fail('Should have rejected student attempt despite role field in payload');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }
  });

  // Audit 2: Client-supplied teacherId cannot bypass authorization
  await test('[Audit 2] Client-supplied teacherId in payload cannot bypass authorization', async () => {
    const spoofedPayload = {
      lab: lab1._id,
      title: 'Teacher IDOR Spoof',
      experimentNumber: 6,
      teacherId: teacherMainA._id, // Attacker trying to claim assigned teacher's ID
      programmingLanguages: ['Python']
    };

    try {
      await experimentService.createExperiment(spoofedPayload, teacherUnassigned);
      assert.fail('Should have rejected unassigned teacher despite teacherId field');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }
  });

  // Audit 3: Client-supplied userId cannot bypass authorization
  await test('[Audit 3] Client-supplied userId in payload cannot bypass authorization', async () => {
    const spoofedPayload = {
      lab: lab1._id,
      title: 'User IDOR Spoof',
      experimentNumber: 6,
      userId: adminUser._id, // Attacker trying to claim admin user ID
      programmingLanguages: ['Python']
    };

    try {
      await experimentService.createExperiment(spoofedPayload, teacherUnassigned);
      assert.fail('Should have rejected unauthorized user despite userId in payload');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }
  });

  // Audit 4: Invalid programming language is rejected
  await test('[Audit 4] Invalid programming language is rejected (400)', async () => {
    Experiment.countDocuments = () => Promise.resolve(0);
    Experiment.findOne = () => Promise.resolve(null);
    try {
      await experimentService.createExperiment(
        {
          lab: lab1._id,
          title: 'Invalid Lang Exp',
          experimentNumber: 7,
          programmingLanguages: ['Ruby', 'Rust', 'JavaScript']
        },
        teacherMainA
      );
      assert.fail('Should have rejected invalid programming languages');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert(err.message.includes('Invalid programming language'));
    }
  });

  // Audit 5: Invalid/duplicate experiment ordering is rejected
  await test('[Audit 5] Invalid / duplicate experiment ordering is rejected (400)', async () => {
    try {
      await experimentService.reorderExperiments(
        lab1._id,
        [
          { experimentId: 'exp1', order: 1 },
          { experimentId: 'exp2', order: 1 } // Duplicate order 1
        ],
        teacherMainA
      );
      assert.fail('Should have rejected duplicate order in reordering batch');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert(err.message.includes('Duplicate order index'));
    }
  });

  // Audit 6: Teacher with inactive LabAssignment cannot manage experiments
  await test('[Audit 6] Teacher with inactive LabAssignment (active: false) cannot manage experiments (403)', async () => {
    // Override LabAssignment to return inactive assignment only
    LabAssignment.find = () => Promise.resolve([]); // No active assignments

    try {
      await experimentService.createExperiment(
        {
          lab: lab1._id,
          title: 'Inactive Teacher Exp',
          experimentNumber: 8,
          programmingLanguages: ['C']
        },
        teacherMainA
      );
      assert.fail('Should have rejected teacher with inactive assignment');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    } finally {
      setupLabAssignmentMocks(); // Restore mocks
    }
  });

  // Audit 7: Student direct URL access to an experiment from another section is rejected
  await test('[Audit 7] Student direct URL access to experiment from another section is rejected (403)', async () => {
    // Experiment belongs to Lab 2 (Algorithms Lab, which is assigned only to Section B, not Student Alice's Section A)
    const mockExpLab2 = {
      _id: 'expLab2',
      lab: lab2,
      status: 'PUBLISHED',
      active: true
    };
    Experiment.findById = () => ({
      populate: () => Promise.resolve(mockExpLab2)
    });

    try {
      await experimentService.getExperimentById('expLab2', studentA);
      assert.fail('Student should be forbidden from accessing another section lab experiment');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      assert(err.message.includes('not assigned to your academic section'));
    }
  });

  // Audit 8: Invalid / past reopenedUntil is rejected
  await test('[Audit 8] Invalid / past reopenedUntil is rejected (400)', async () => {
    const mockExp = {
      _id: 'exp1',
      lab: lab1._id,
      status: 'CLOSED'
    };
    Experiment.findById = () => Promise.resolve(mockExp);

    const pastDate = new Date(Date.now() - 86400000 * 2); // 2 days in the past
    try {
      await experimentService.reopenExperiment('exp1', pastDate, teacherMainA);
      assert.fail('Should have rejected past reopenedUntil');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert(err.message.includes('must be set to a future date'));
    }
  });

  // Audit 9: Unauthorized teacher cannot reorder, publish, schedule, reopen, or close an experiment
  await test('[Audit 9] Unauthorized teacher cannot reorder, publish, schedule, reopen, or close (403)', async () => {
    const mockExp = {
      _id: 'exp1',
      lab: lab1._id,
      title: 'Exp 1',
      programmingLanguages: ['C'],
      status: 'DRAFT'
    };
    Experiment.findById = () => Promise.resolve(mockExp);

    // Reorder
    try {
      await experimentService.reorderExperiments(lab1._id, [{ experimentId: 'exp1', order: 1 }], teacherUnassigned);
      assert.fail('Should have blocked unauthorized reorder');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }

    // Publish
    try {
      await experimentService.publishExperiment('exp1', teacherUnassigned);
      assert.fail('Should have blocked unauthorized publish');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }

    // Schedule
    try {
      await experimentService.scheduleExperiment('exp1', new Date(Date.now() + 86400000), null, teacherUnassigned);
      assert.fail('Should have blocked unauthorized schedule');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }

    // Reopen
    try {
      await experimentService.reopenExperiment('exp1', new Date(Date.now() + 86400000), teacherUnassigned);
      assert.fail('Should have blocked unauthorized reopen');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }

    // Close
    try {
      await experimentService.closeExperiment('exp1', teacherUnassigned);
      assert.fail('Should have blocked unauthorized close');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }
  });

  // Audit 10: Verify the 12-experiment maximum behaves correctly with active/inactive experiments
  await test('[Audit 10] 12-experiment maximum correctly considers active: true only', async () => {
    // Case A: 12 total experiments, but 1 is deactivated (count of active: true is 11) -> Creation allowed
    Experiment.countDocuments = (query) => {
      assert.strictEqual(query.active, true);
      return Promise.resolve(11); // 11 active experiments
    };
    Experiment.findOne = () => Promise.resolve(null);
    Experiment.create = (doc) => Promise.resolve({ _id: 'exp12', ...doc });

    const result = await experimentService.createExperiment(
      {
        lab: lab1._id,
        title: '12th Active Experiment',
        experimentNumber: 12,
        programmingLanguages: ['Java']
      },
      teacherMainA
    );
    assert.strictEqual(result.experimentNumber, 12);

    // Case B: 12 active experiments -> Creation blocked
    Experiment.countDocuments = () => Promise.resolve(12);
    try {
      await experimentService.createExperiment(
        {
          lab: lab1._id,
          title: '13th Active Experiment Attempt',
          experimentNumber: 12,
          programmingLanguages: ['Java']
        },
        teacherMainA
      );
      assert.fail('Should have blocked creation when 12 active experiments exist');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert(err.message.includes('maximum limit of 12 experiments'));
    }
  });

  console.log(`\n=== ALL ${passed}/${total} PHASE 4 EXPERIMENT UNIT & RBAC TESTS PASSED CLEANLY ===\n`);
}

runPhase4Tests().catch((err) => {
  console.error('Phase 4 test execution failed:', err);
  process.exit(1);
});
