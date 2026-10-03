const assert = require('assert');
const mongoose = require('mongoose');
const adminDashboardService = require('../services/adminDashboardService');
const {
  User,
  Lab,
  Section,
  LabAssignment,
  Experiment,
  Submission,
  Evaluation,
  VivaEvaluation,
  ReevaluationRequest,
  Notification
} = require('../models');
const { validateDashboardFilters } = require('../validators/adminDashboard.validator');

console.log('=== Running Phase 11 Admin/HOD Dashboard Comprehensive & Security Tests ===\n');

async function runPhase11Tests() {
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

  // Mock Entities
  const adminUser = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000001'),
    name: 'Dr. Head of Department',
    rollNumber: 'ADMIN01',
    role: 'ADMIN_HOD',
    active: true
  };

  const teacherA = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000010'),
    name: 'Prof Vance',
    rollNumber: 'PROFVANCE',
    role: 'TEACHER',
    active: true
  };

  const teacherInactive = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000019'),
    name: 'Prof Retired',
    rollNumber: 'PROFRETIRED',
    role: 'TEACHER',
    active: false
  };

  const studentA = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000020'),
    name: 'Alice Student',
    rollNumber: '202301001',
    role: 'STUDENT',
    section: 'CSE-A',
    academicYear: '2025-2026',
    semester: 4,
    active: true
  };

  const studentInactive = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000029'),
    name: 'Inactive Student',
    rollNumber: '202301099',
    role: 'STUDENT',
    section: 'CSE-A',
    academicYear: '2025-2026',
    semester: 4,
    active: false
  };

  const sectionA = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000100'),
    name: 'Section A',
    sectionCode: 'CSE-A',
    department: 'CSE',
    academicYear: '2025-2026',
    semester: 4,
    active: true
  };

  const sectionInactive = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000109'),
    name: 'Archived Section',
    sectionCode: 'CSE-OLD',
    department: 'CSE',
    academicYear: '2023-2024',
    semester: 4,
    active: false
  };

  const lab1 = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000200'),
    name: 'Data Structures Lab',
    code: 'CS201L',
    subject: 'Data Structures',
    department: 'CSE',
    academicYear: '2025-2026',
    semester: 4,
    active: true
  };

  const labInactive = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000209'),
    name: 'Legacy Lab',
    code: 'CS999L',
    subject: 'Legacy Tech',
    department: 'CSE',
    academicYear: '2022-2023',
    semester: 4,
    active: false
  };

  const exp1 = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000300'),
    title: 'Binary Search Trees',
    order: 1,
    lab: lab1._id,
    status: 'PUBLISHED',
    active: true
  };

  const expClosed = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000301'),
    title: 'AVL Trees',
    order: 2,
    lab: lab1._id,
    status: 'CLOSED',
    active: true
  };

  const mockUsers = [adminUser, teacherA, teacherInactive, studentA, studentInactive];
  const mockSections = [sectionA, sectionInactive];
  const mockLabs = [lab1, labInactive];
  const mockExperiments = [exp1, expClosed];
  const mockAssignments = [
    {
      _id: new mongoose.Types.ObjectId(),
      teacher: teacherA,
      lab: lab1,
      section: sectionA,
      role: 'MAIN',
      active: true
    }
  ];
  let mockEvaluations = [];
  let mockVivaEvaluations = [];
  let mockSubmissions = [];
  let mockReevaluations = [];
  let mockNotifications = [];

  function setupMocks() {
    mockEvaluations = [
      {
        _id: new mongoose.Types.ObjectId(),
        student: studentA,
        experiment: exp1,
        lab: lab1._id,
        score: 9.0,
        isHighestScore: true,
        passed: true,
        createdAt: new Date()
      }
    ];

    mockVivaEvaluations = [
      {
        _id: new mongoose.Types.ObjectId(),
        student: studentA,
        experiment: exp1,
        lab: lab1._id,
        marks: 4.5,
        version: 1,
        isCurrent: true,
        evaluatedBy: teacherA,
        createdAt: new Date(),
        evaluatedAt: new Date()
      }
    ];

    mockSubmissions = [
      {
        _id: new mongoose.Types.ObjectId(),
        student: studentA,
        experiment: exp1,
        lab: lab1._id,
        language: 'Python',
        attemptNumber: 1,
        status: 'SUBMITTED',
        active: true,
        createdAt: new Date()
      }
    ];

    mockReevaluations = [
      {
        _id: new mongoose.Types.ObjectId(),
        student: studentA,
        experiment: exp1,
        status: 'PENDING',
        studentReason: 'Double check test case 3',
        createdAt: new Date()
      }
    ];

    mockNotifications = [
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Mid-term Lab Assessments Announced',
        type: 'GENERAL',
        targetType: 'ALL_STUDENTS',
        createdBy: adminUser,
        active: true,
        createdAt: new Date()
      }
    ];

    User.countDocuments = (query = {}) => {
      let count = 0;
      for (const u of mockUsers) {
        let match = true;
        if (query.role && u.role !== query.role) match = false;
        if (query.active !== undefined && u.active !== query.active) match = false;
        if (match) count++;
      }
      return Promise.resolve(count);
    };

    User.find = (query = {}) => {
      let filtered = mockUsers.filter((u) => {
        let match = true;
        if (query.role && u.role !== query.role) match = false;
        if (query.active !== undefined && u.active !== query.active) match = false;
        if (query.section && u.section !== query.section) match = false;
        return match;
      });
      const chain = {
        sort: () => chain,
        limit: () => chain,
        then: (resolve) => resolve(filtered)
      };
      return chain;
    };

    Lab.countDocuments = (query = {}) => {
      let count = 0;
      for (const l of mockLabs) {
        let match = true;
        if (query.active !== undefined && l.active !== query.active) match = false;
        if (query.academicYear && l.academicYear !== query.academicYear) match = false;
        if (query.semester && l.semester !== query.semester) match = false;
        if (query.department && l.department !== query.department) match = false;
        if (match) count++;
      }
      return Promise.resolve(count);
    };

    Lab.find = (query = {}) => {
      let filtered = mockLabs.filter((l) => {
        let match = true;
        if (query.active !== undefined && l.active !== query.active) match = false;
        if (query.academicYear && l.academicYear !== query.academicYear) match = false;
        if (query.semester && l.semester !== query.semester) match = false;
        if (query.department && l.department !== query.department) match = false;
        return match;
      });
      const chain = {
        sort: () => chain,
        then: (resolve) => resolve(filtered)
      };
      return chain;
    };

    Section.countDocuments = (query = {}) => {
      let count = 0;
      for (const s of mockSections) {
        let match = true;
        if (query.active !== undefined && s.active !== query.active) match = false;
        if (query.academicYear && s.academicYear !== query.academicYear) match = false;
        if (query.semester && s.semester !== query.semester) match = false;
        if (query.department && s.department !== query.department) match = false;
        if (match) count++;
      }
      return Promise.resolve(count);
    };

    Section.find = (query = {}) => {
      let filtered = mockSections.filter((s) => {
        let match = true;
        if (query.active !== undefined && s.active !== query.active) match = false;
        if (query.academicYear && s.academicYear !== query.academicYear) match = false;
        if (query.semester && s.semester !== query.semester) match = false;
        if (query.department && s.department !== query.department) match = false;
        return match;
      });
      const chain = {
        sort: () => chain,
        then: (resolve) => resolve(filtered)
      };
      return chain;
    };

    Experiment.countDocuments = (query = {}) => {
      let count = 0;
      for (const e of mockExperiments) {
        let match = true;
        if (query.active !== undefined && e.active !== query.active) match = false;
        if (query.status && e.status !== query.status) match = false;
        if (query.lab && e.lab.toString() !== query.lab.toString()) match = false;
        if (match) count++;
      }
      return Promise.resolve(count);
    };

    Experiment.find = (query = {}) => {
      let filtered = mockExperiments.filter((e) => {
        let match = true;
        if (query.active !== undefined && e.active !== query.active) match = false;
        if (query.status && e.status !== query.status) match = false;
        if (query.lab) {
          if (query.lab.$in) {
            const ids = query.lab.$in.map(i => i.toString());
            if (!ids.includes(e.lab.toString())) match = false;
          } else if (e.lab.toString() !== query.lab.toString()) {
            match = false;
          }
        }
        return match;
      });
      const chain = {
        sort: () => chain,
        then: (resolve) => resolve(filtered)
      };
      return chain;
    };

    LabAssignment.find = (query = {}) => {
      let filtered = mockAssignments.filter((a) => {
        let match = true;
        if (query.active !== undefined && a.active !== query.active) match = false;
        return match;
      });
      const chain = {
        populate: () => chain,
        then: (resolve) => resolve(filtered)
      };
      return chain;
    };

    Submission.countDocuments = () => Promise.resolve(mockSubmissions.length);
    Submission.find = () => {
      const chain = {
        sort: () => chain,
        limit: () => chain,
        populate: () => chain,
        then: (resolve) => resolve(mockSubmissions)
      };
      return chain;
    };

    Evaluation.countDocuments = (query = {}) => Promise.resolve(mockEvaluations.length);
    Evaluation.find = () => {
      const chain = {
        sort: () => chain,
        limit: () => chain,
        populate: () => chain,
        then: (resolve) => resolve(mockEvaluations)
      };
      return chain;
    };

    VivaEvaluation.countDocuments = (query = {}) => Promise.resolve(mockVivaEvaluations.length);
    VivaEvaluation.find = () => {
      const chain = {
        sort: () => chain,
        limit: () => chain,
        populate: () => chain,
        then: (resolve) => resolve(mockVivaEvaluations)
      };
      return chain;
    };

    ReevaluationRequest.countDocuments = (query = {}) => {
      if (query.status === 'PENDING') return Promise.resolve(mockReevaluations.filter(r => r.status === 'PENDING').length);
      return Promise.resolve(mockReevaluations.length);
    };
    ReevaluationRequest.find = () => {
      const chain = {
        sort: () => chain,
        limit: () => chain,
        populate: () => chain,
        then: (resolve) => resolve(mockReevaluations)
      };
      return chain;
    };

    Notification.find = () => {
      const chain = {
        sort: () => chain,
        limit: () => chain,
        populate: () => chain,
        then: (resolve) => resolve(mockNotifications)
      };
      return chain;
    };
  }

  setupMocks();

  // ==================== TEST SUITE ====================

  // --- 1. Overall Aggregate Statistics ---
  await test('1. Admin can retrieve overall system statistics', async () => {
    const stats = await adminDashboardService.getStatistics();
    assert.strictEqual(stats.students.total, 2);
    assert.strictEqual(stats.students.active, 1);
    assert.strictEqual(stats.students.inactive, 1);
    assert.strictEqual(stats.teachers.total, 2);
    assert.strictEqual(stats.teachers.active, 1);
    assert.strictEqual(stats.teachers.inactive, 1);
    assert.strictEqual(stats.labs.total, 2);
    assert.strictEqual(stats.labs.active, 1);
    assert.strictEqual(stats.labs.inactive, 1);
    assert.strictEqual(stats.sections.total, 2);
    assert.strictEqual(stats.sections.active, 1);
    assert.strictEqual(stats.sections.inactive, 1);
    assert.strictEqual(stats.experiments.total, 2);
    assert.strictEqual(stats.experiments.published, 1);
    assert.strictEqual(stats.experiments.closed, 1);
  });

  // --- 2. Student Overview ---
  await test('2. Admin can retrieve student overview with progress and scores', async () => {
    const students = await adminDashboardService.getStudentsOverview();
    assert(Array.isArray(students));
    assert.strictEqual(students.length, 2);
    const s1 = students.find(s => s.rollNumber === '202301001');
    assert(s1, 'Alice Student must be present');
    assert.strictEqual(s1.completedExperiments, 1);
    assert.strictEqual(s1.averageFinalScore, 13.5); // 9.0 auto + 4.5 viva
    assert.strictEqual(s1.status, 'ACTIVE');
  });

  // --- 3. Teacher Overview ---
  await test('3. Admin can retrieve teacher deployment overview with lab assignments', async () => {
    const teachers = await adminDashboardService.getTeachersOverview();
    assert(Array.isArray(teachers));
    assert.strictEqual(teachers.length, 2);
    const t1 = teachers.find(t => t.rollNumber === 'PROFVANCE');
    assert(t1);
    assert.strictEqual(t1.assignedLabsCount, 1);
    assert.strictEqual(t1.assignedSectionsCount, 1);
    assert(t1.assignmentRoles.includes('MAIN'));
    assert.strictEqual(t1.status, 'ACTIVE');
  });

  // --- 4. Laboratory Overview ---
  await test('4. Admin can retrieve laboratory overview with section and teacher links', async () => {
    const labs = await adminDashboardService.getLabsOverview();
    assert(Array.isArray(labs));
    assert.strictEqual(labs.length, 2);
    const l1 = labs.find(l => l.code === 'CS201L');
    assert(l1);
    assert.strictEqual(l1.totalExperiments, 2);
    assert.strictEqual(l1.publishedExperiments, 1);
    assert.strictEqual(l1.assignedSectionsCount, 1);
    assert.strictEqual(l1.assignedTeachersCount, 1);
    assert.strictEqual(l1.status, 'ACTIVE');
  });

  // --- 5. Section Overview ---
  await test('5. Admin can retrieve section overview with student counts and lab linkages', async () => {
    const sections = await adminDashboardService.getSectionsOverview();
    assert(Array.isArray(sections));
    assert.strictEqual(sections.length, 2);
    const sec1 = sections.find(s => s.sectionCode === 'CSE-A');
    assert(sec1);
    assert.strictEqual(sec1.studentCount, 1);
    assert.strictEqual(sec1.assignedLabsCount, 1);
    assert.strictEqual(sec1.assignedTeachersCount, 1);
    assert.strictEqual(sec1.status, 'ACTIVE');
  });

  // --- 6. Activity Feed ---
  await test('6. Admin can retrieve live timestamped activity feed', async () => {
    const activities = await adminDashboardService.getActivityFeed(10);
    assert(Array.isArray(activities));
    assert(activities.length > 0);
    const eventTypes = activities.map(a => a.type);
    assert(eventTypes.includes('SUBMISSION'));
    assert(eventTypes.includes('EVALUATION'));
    assert(eventTypes.includes('VIVA'));
    assert(eventTypes.includes('REEVALUATION'));
    assert(eventTypes.includes('NOTIFICATION'));
  });

  // --- 7. Performance Overview & Scoring Rule ---
  await test('7. Performance overview respects /10 auto + /5 viva = /15 final scoring standard', async () => {
    const perf = await adminDashboardService.getPerformanceOverview();
    assert.strictEqual(perf.averageAutomatedScore, 9.0);
    assert.strictEqual(perf.averageVivaScore, 4.5);
    assert.strictEqual(perf.averageFinalScore, 13.5);
    assert.strictEqual(perf.totalGradedUnits, 1);
  });

  // --- 8. Full Dashboard Combined Payload ---
  await test('8. Admin can retrieve full unified dashboard payload', async () => {
    const full = await adminDashboardService.getFullDashboard();
    assert(full.statistics, 'Statistics must be included');
    assert(full.students, 'Students overview must be included');
    assert(full.teachers, 'Teachers overview must be included');
    assert(full.labs, 'Labs overview must be included');
    assert(full.sections, 'Sections overview must be included');
    assert(full.activity, 'Activity feed must be included');
    assert(full.performance, 'Performance overview must be included');
  });

  // --- 9. Filter Validation ---
  await test('9. Dashboard filter validator accepts valid academic filters', async () => {
    const req = {
      query: {
        academicYear: '2025-2026',
        semester: '4',
        department: 'CSE',
        labId: lab1._id.toString(),
        sectionId: sectionA._id.toString()
      }
    };
    let calledNext = false;
    validateDashboardFilters(req, {}, (err) => {
      assert(!err, 'Valid filters must not throw error');
      calledNext = true;
    });
    assert(calledNext);
  });

  await test('10. Dashboard filter validator rejects invalid semester', async () => {
    const req = { query: { semester: '9' } };
    validateDashboardFilters(req, {}, (err) => {
      assert(err, 'Semester > 8 must throw error');
      assert.strictEqual(err.statusCode, 400);
    });
  });

  await test('11. Dashboard filter validator rejects invalid ObjectId', async () => {
    const req = { query: { labId: 'invalid-id' } };
    validateDashboardFilters(req, {}, (err) => {
      assert(err, 'Invalid ObjectId must throw error');
      assert.strictEqual(err.statusCode, 400);
    });
  });

  // --- 10. Inactive & Historical Data Preservation ---
  await test('12. Inactive entities and historical records are preserved and accurately reported', async () => {
    const stats = await adminDashboardService.getStatistics();
    assert.strictEqual(stats.students.inactive, 1);
    assert.strictEqual(stats.teachers.inactive, 1);
    assert.strictEqual(stats.labs.inactive, 1);
    assert.strictEqual(stats.sections.inactive, 1);
  });

  console.log(`\n==============================================`);
  console.log(`Phase 11 Tests Passed: ${passed}/${total}`);
  console.log(`==============================================\n`);
}

runPhase11Tests().catch((err) => {
  console.error('Test suite failure:', err);
  process.exit(1);
});
