const assert = require('assert');
const mongoose = require('mongoose');
const labService = require('../services/labService');
const {
  User,
  Section,
  Lab,
  LabAssignment,
  Experiment,
  Submission,
  Evaluation,
  VivaEvaluation
} = require('../models');
const { authorize } = require('../middleware/auth');

console.log('=== Running Teacher Lab -> Student Performance Dashboard Test Suite ===\n');

async function runStudentPerformanceTests() {
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

  // In-memory mock storage
  let mockUsers = [];
  let mockSections = [];
  let mockLabs = [];
  let mockLabAssignments = [];
  let mockExperiments = [];
  let mockSubmissions = [];
  let mockEvaluations = [];
  let mockVivaEvaluations = [];

  // Mongoose query overrides
  Lab.findById = async function (id) {
    return mockLabs.find((l) => l._id.toString() === id.toString()) || null;
  };

  User.findById = async function (id) {
    return mockUsers.find((u) => u._id.toString() === id.toString()) || null;
  };

  User.find = function (query = {}) {
    let results = [...mockUsers];
    if (query.role) {
      results = results.filter((u) => u.role === query.role);
    }
    if (query.section && query.section.$in) {
      const secUpper = query.section.$in.map((s) => s.toUpperCase());
      results = results.filter((u) => u.section && secUpper.includes(u.section.toUpperCase()));
    }
    if (query.active !== undefined) {
      results = results.filter((u) => u.active === query.active);
    }
    if (query.$or) {
      results = results.filter((u) =>
        query.$or.some((condition) => {
          if (condition.name && condition.name.test) {
            return condition.name.test(u.name);
          }
          if (condition.rollNumber && condition.rollNumber.test) {
            return condition.rollNumber.test(u.rollNumber);
          }
          return false;
        })
      );
    }

    return {
      sort: function () {
        results.sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));
        return Promise.resolve(results);
      },
      then: function (resolve) {
        return Promise.resolve(results).then(resolve);
      }
    };
  };

  LabAssignment.find = function (query = {}) {
    let results = [...mockLabAssignments];
    if (query.lab) {
      results = results.filter((a) => a.lab.toString() === query.lab.toString());
    }
    if (query.teacher) {
      results = results.filter((a) => a.teacher.toString() === query.teacher.toString());
    }
    if (query.section) {
      results = results.filter((a) => (a.section?._id || a.section).toString() === query.section.toString());
    }
    if (query.active !== undefined) {
      results = results.filter((a) => a.active === query.active);
    }

    const populated = results.map((a) => {
      const clone = { ...a };
      const secIdStr = clone.section?._id ? clone.section._id.toString() : (clone.section ? clone.section.toString() : '');
      const sec = mockSections.find((s) => s._id.toString() === secIdStr);
      clone.section = sec ? { ...sec } : null;
      return clone;
    });

    return {
      populate: function () {
        return Promise.resolve(populated);
      },
      then: function (resolve) {
        return Promise.resolve(populated).then(resolve);
      }
    };
  };

  Experiment.find = function (query = {}) {
    let results = [...mockExperiments];
    if (query.lab) {
      results = results.filter((e) => e.lab.toString() === query.lab.toString());
    }
    if (query.active !== undefined) {
      results = results.filter((e) => e.active === query.active);
    }
    return {
      sort: function () {
        results.sort((a, b) => (a.order || 0) - (b.order || 0));
        return Promise.resolve(results);
      },
      then: function (resolve) {
        return Promise.resolve(results).then(resolve);
      }
    };
  };

  Submission.find = function (query = {}) {
    let results = [...mockSubmissions];
    if (query.lab) {
      results = results.filter((s) => s.lab.toString() === query.lab.toString());
    }
    if (query.student) {
      if (query.student.$in) {
        const stuStrs = query.student.$in.map((id) => id.toString());
        results = results.filter((s) => stuStrs.includes(s.student.toString()));
      } else {
        results = results.filter((s) => s.student.toString() === query.student.toString());
      }
    }
    if (query.experiment && query.experiment.$in) {
      const expStrs = query.experiment.$in.map((id) => id.toString());
      results = results.filter((s) => expStrs.includes(s.experiment.toString()));
    }
    if (query.active !== undefined) {
      results = results.filter((s) => s.active === query.active);
    }

    return {
      sort: function () {
        results.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
        return Promise.resolve(results);
      },
      then: function (resolve) {
        return Promise.resolve(results).then(resolve);
      }
    };
  };

  Evaluation.find = function (query = {}) {
    let results = [...mockEvaluations];
    if (query.lab) {
      results = results.filter((e) => e.lab.toString() === query.lab.toString());
    }
    if (query.student) {
      if (query.student.$in) {
        const stuStrs = query.student.$in.map((id) => id.toString());
        results = results.filter((e) => stuStrs.includes(e.student.toString()));
      } else {
        results = results.filter((e) => e.student.toString() === query.student.toString());
      }
    }
    if (query.experiment && query.experiment.$in) {
      const expStrs = query.experiment.$in.map((id) => id.toString());
      results = results.filter((e) => expStrs.includes(e.experiment.toString()));
    }
    if (query.active !== undefined) {
      results = results.filter((e) => e.active === query.active);
    }

    return {
      sort: function () {
        results.sort((a, b) => (b.score || 0) - (a.score || 0));
        return Promise.resolve(results);
      },
      then: function (resolve) {
        return Promise.resolve(results).then(resolve);
      }
    };
  };

  VivaEvaluation.find = function (query = {}) {
    let results = [...mockVivaEvaluations];
    if (query.lab) {
      results = results.filter((v) => v.lab.toString() === query.lab.toString());
    }
    if (query.student) {
      if (query.student.$in) {
        const stuStrs = query.student.$in.map((id) => id.toString());
        results = results.filter((v) => stuStrs.includes(v.student.toString()));
      } else {
        results = results.filter((v) => v.student.toString() === query.student.toString());
      }
    }
    if (query.experiment && query.experiment.$in) {
      const expStrs = query.experiment.$in.map((id) => id.toString());
      results = results.filter((v) => expStrs.includes(v.experiment.toString()));
    }
    if (query.active !== undefined) {
      results = results.filter((v) => v.active === query.active);
    }
    return Promise.resolve(results);
  };

  function resetState() {
    mockUsers = [];
    mockSections = [];
    mockLabs = [];
    mockLabAssignments = [];
    mockExperiments = [];
    mockSubmissions = [];
    mockEvaluations = [];
    mockVivaEvaluations = [];
  }

  // ==========================================
  // SECTION 1: AUTHORIZATION & RBAC
  // ==========================================
  console.log('--- Section 1: Authorization & RBAC ---');

  await test('1. Teacher can view students for authorized lab', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const secId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'OS Lab', code: 'CS-201', active: true });
    mockSections.push({ _id: secId, name: 'Section A', sectionCode: 'AIDS-A', active: true });
    mockLabAssignments.push({
      _id: new mongoose.Types.ObjectId(),
      lab: labId,
      teacher: teacherId,
      section: secId,
      active: true
    });

    const teacher = { _id: teacherId, role: 'TEACHER', active: true };
    const res = await labService.getLabStudentsPerformance(labId, teacher);
    assert.ok(res.lab);
    assert.strictEqual(res.lab.code, 'CS-201');
    assert.strictEqual(res.summary.totalStudents, 0);
  });

  await test('2. Teacher cannot view unauthorized lab students (403)', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const teacherA = { _id: new mongoose.Types.ObjectId(), role: 'TEACHER', active: true };
    const teacherB = { _id: new mongoose.Types.ObjectId(), role: 'TEACHER', active: true };
    const secId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'OS Lab', code: 'CS-201', active: true });
    mockSections.push({ _id: secId, name: 'Section A', sectionCode: 'AIDS-A', active: true });
    // Assigned to Teacher B only
    mockLabAssignments.push({
      _id: new mongoose.Types.ObjectId(),
      lab: labId,
      teacher: teacherB._id,
      section: secId,
      active: true
    });

    try {
      await labService.getLabStudentsPerformance(labId, teacherA);
      assert.fail('Should have thrown 403 for unauthorized teacher');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      assert.match(err.message, /active faculty assignment/i);
    }
  });

  await test('3. ADMIN_HOD authorization works for any lab', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    mockLabs.push({ _id: labId, name: 'Data Structures Lab', code: 'CS-101', active: true });

    const admin = { _id: new mongoose.Types.ObjectId(), role: 'ADMIN_HOD', active: true };
    const res = await labService.getLabStudentsPerformance(labId, admin);
    assert.ok(res.lab);
    assert.strictEqual(res.lab.name, 'Data Structures Lab');
  });

  await test('4. Student role is blocked from accessing lab student performance (403)', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    mockLabs.push({ _id: labId, name: 'Data Structures Lab', code: 'CS-101', active: true });

    const student = { _id: new mongoose.Types.ObjectId(), role: 'STUDENT', active: true };
    try {
      await labService.getLabStudentsPerformance(labId, student);
      assert.fail('Should have rejected student with 403');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      assert.match(err.message, /not authorized/i);
    }
  });

  // ==========================================
  // SECTION 2: STUDENT FILTERING & EXCLUSION
  // ==========================================
  console.log('\n--- Section 2: Student Filtering & Section Isolation ---');

  await test('5. Correct students from assigned sections are returned, unrelated sections excluded', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const secAId = new mongoose.Types.ObjectId();
    const secBId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'DBMS Lab', code: 'CS-301', active: true });
    mockSections.push({ _id: secAId, name: 'Section A', sectionCode: 'AIDS-A', active: true });
    mockSections.push({ _id: secBId, name: 'Section B', sectionCode: 'AIDS-B', active: true });

    // Teacher is assigned to Section A only
    mockLabAssignments.push({
      _id: new mongoose.Types.ObjectId(),
      lab: labId,
      teacher: teacherId,
      section: secAId,
      active: true
    });

    const s1 = { _id: new mongoose.Types.ObjectId(), name: 'Alice', rollNumber: '26GR1B07001', role: 'STUDENT', section: 'AIDS-A', active: true };
    const s2 = { _id: new mongoose.Types.ObjectId(), name: 'Bob', rollNumber: '26GR1B07002', role: 'STUDENT', section: 'AIDS-A', active: true };
    const s3 = { _id: new mongoose.Types.ObjectId(), name: 'Charlie', rollNumber: '26GR1B07003', role: 'STUDENT', section: 'AIDS-B', active: true };

    mockUsers.push(s1, s2, s3);

    const teacher = { _id: teacherId, role: 'TEACHER', active: true };
    const res = await labService.getLabStudentsPerformance(labId, teacher);

    assert.strictEqual(res.students.length, 2, 'Should only return 2 students from Section A');
    assert.ok(res.students.some((s) => s.rollNumber === '26GR1B07001'));
    assert.ok(res.students.some((s) => s.rollNumber === '26GR1B07002'));
    assert.ok(!res.students.some((s) => s.rollNumber === '26GR1B07003'), 'Charlie from Section B must NOT be included');
  });

  // ==========================================
  // SECTION 3: METRICS & CALCULATIONS
  // ==========================================
  console.log('\n--- Section 3: Metrics & Calculation Precision ---');

  await test('6. Correct experiment count, completed count, pending count, and completion %', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const secId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'Networks Lab', code: 'CS-401', active: true });
    mockSections.push({ _id: secId, name: 'Section A', sectionCode: 'AIDS-A', active: true });
    mockLabAssignments.push({
      _id: new mongoose.Types.ObjectId(),
      lab: labId,
      teacher: teacherId,
      section: secId,
      active: true
    });

    // 4 experiments
    const exp1 = { _id: new mongoose.Types.ObjectId(), lab: labId, order: 1, experimentNumber: 1, title: 'Socket Prog', active: true };
    const exp2 = { _id: new mongoose.Types.ObjectId(), lab: labId, order: 2, experimentNumber: 2, title: 'TCP Server', active: true };
    const exp3 = { _id: new mongoose.Types.ObjectId(), lab: labId, order: 3, experimentNumber: 3, title: 'HTTP Client', active: true };
    const exp4 = { _id: new mongoose.Types.ObjectId(), lab: labId, order: 4, experimentNumber: 4, title: 'DNS Lookup', active: true };
    mockExperiments.push(exp1, exp2, exp3, exp4);

    const s1 = { _id: new mongoose.Types.ObjectId(), name: 'Dilleswari', rollNumber: '26GR1B07001', role: 'STUDENT', section: 'AIDS-A', active: true };
    mockUsers.push(s1);

    // Dilleswari has completed 3 out of 4 experiments (exp1, exp2, exp3)
    mockSubmissions.push({ _id: new mongoose.Types.ObjectId(), student: s1._id, lab: labId, experiment: exp1._id, status: 'SUCCESS', active: true, submittedAt: new Date('2026-10-01') });
    mockSubmissions.push({ _id: new mongoose.Types.ObjectId(), student: s1._id, lab: labId, experiment: exp2._id, status: 'SUCCESS', active: true, submittedAt: new Date('2026-10-02') });
    mockSubmissions.push({ _id: new mongoose.Types.ObjectId(), student: s1._id, lab: labId, experiment: exp3._id, status: 'SUCCESS', active: true, submittedAt: new Date('2026-10-03') });

    // Evaluations: exp1 score = 9/10 (90%), exp2 score = 8/10 (80%), exp3 score = 10/10 (100%)
    mockEvaluations.push({ _id: new mongoose.Types.ObjectId(), student: s1._id, lab: labId, experiment: exp1._id, score: 9.0, active: true });
    mockEvaluations.push({ _id: new mongoose.Types.ObjectId(), student: s1._id, lab: labId, experiment: exp2._id, score: 8.0, active: true });
    mockEvaluations.push({ _id: new mongoose.Types.ObjectId(), student: s1._id, lab: labId, experiment: exp3._id, score: 10.0, active: true });

    const teacher = { _id: teacherId, role: 'TEACHER', active: true };
    const res = await labService.getLabStudentsPerformance(labId, teacher);

    assert.strictEqual(res.summary.totalStudents, 1);
    const stu = res.students[0];
    assert.strictEqual(stu.totalExperiments, 4);
    assert.strictEqual(stu.completedExperiments, 3);
    assert.strictEqual(stu.pendingExperiments, 1);
    assert.strictEqual(stu.completionPercentage, 75); // (3/4)*100
    assert.strictEqual(stu.averageScore, 90.0); // (90 + 80 + 100) / 3 = 90%
    assert.strictEqual(stu.status, 'Good'); // 75% -> Good
  });

  await test('7. 100% completion yields status Completed and completedAll incremented', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const secId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'Algorithms Lab', code: 'CS-202', active: true });
    mockSections.push({ _id: secId, name: 'Section A', sectionCode: 'AIDS-A', active: true });
    mockLabAssignments.push({
      _id: new mongoose.Types.ObjectId(),
      lab: labId,
      teacher: teacherId,
      section: secId,
      active: true
    });

    const exp1 = { _id: new mongoose.Types.ObjectId(), lab: labId, order: 1, experimentNumber: 1, title: 'Sorting', active: true };
    const exp2 = { _id: new mongoose.Types.ObjectId(), lab: labId, order: 2, experimentNumber: 2, title: 'Searching', active: true };
    mockExperiments.push(exp1, exp2);

    const s1 = { _id: new mongoose.Types.ObjectId(), name: 'Dimple', rollNumber: '26GR1B07002', role: 'STUDENT', section: 'AIDS-A', active: true };
    mockUsers.push(s1);

    mockSubmissions.push({ _id: new mongoose.Types.ObjectId(), student: s1._id, lab: labId, experiment: exp1._id, status: 'SUCCESS', active: true });
    mockSubmissions.push({ _id: new mongoose.Types.ObjectId(), student: s1._id, lab: labId, experiment: exp2._id, status: 'SUCCESS', active: true });

    mockEvaluations.push({ _id: new mongoose.Types.ObjectId(), student: s1._id, lab: labId, experiment: exp1._id, score: 10.0, active: true });
    mockEvaluations.push({ _id: new mongoose.Types.ObjectId(), student: s1._id, lab: labId, experiment: exp2._id, score: 10.0, active: true });

    const teacher = { _id: teacherId, role: 'TEACHER', active: true };
    const res = await labService.getLabStudentsPerformance(labId, teacher);

    assert.strictEqual(res.summary.completedAll, 1);
    assert.strictEqual(res.students[0].status, 'Completed');
    assert.strictEqual(res.students[0].completionPercentage, 100);
    assert.strictEqual(res.students[0].averageScore, 100.0);
  });

  // ==========================================
  // SECTION 4: EDGE CASES & UNUSUAL STATES
  // ==========================================
  console.log('\n--- Section 4: Edge Cases & Empty States ---');

  await test('8. Student with no submissions is marked Not Started with averageScore null', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const secId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'AI Lab', code: 'CS-501', active: true });
    mockSections.push({ _id: secId, name: 'Section A', sectionCode: 'AIDS-A', active: true });
    mockLabAssignments.push({
      _id: new mongoose.Types.ObjectId(),
      lab: labId,
      teacher: teacherId,
      section: secId,
      active: true
    });

    const exp1 = { _id: new mongoose.Types.ObjectId(), lab: labId, order: 1, title: 'BFS', active: true };
    mockExperiments.push(exp1);

    const s1 = { _id: new mongoose.Types.ObjectId(), name: 'Newbie', rollNumber: '26GR1B07099', role: 'STUDENT', section: 'AIDS-A', active: true };
    mockUsers.push(s1);

    const teacher = { _id: teacherId, role: 'TEACHER', active: true };
    const res = await labService.getLabStudentsPerformance(labId, teacher);

    const stu = res.students[0];
    assert.strictEqual(stu.completedExperiments, 0);
    assert.strictEqual(stu.pendingExperiments, 1);
    assert.strictEqual(stu.completionPercentage, 0);
    assert.strictEqual(stu.averageScore, null, 'averageScore must be null when not evaluated');
    assert.strictEqual(stu.status, 'Not Started');
  });

  await test('9. Lab with zero experiments produces 0% completion without NaN or Infinity', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const secId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'Empty Lab', code: 'CS-000', active: true });
    mockSections.push({ _id: secId, name: 'Section A', sectionCode: 'AIDS-A', active: true });
    mockLabAssignments.push({
      _id: new mongoose.Types.ObjectId(),
      lab: labId,
      teacher: teacherId,
      section: secId,
      active: true
    });

    const s1 = { _id: new mongoose.Types.ObjectId(), name: 'Student 1', rollNumber: 'R1', role: 'STUDENT', section: 'AIDS-A', active: true };
    mockUsers.push(s1);

    const teacher = { _id: teacherId, role: 'TEACHER', active: true };
    const res = await labService.getLabStudentsPerformance(labId, teacher);

    assert.strictEqual(res.summary.averageCompletion, 0);
    assert.strictEqual(res.students[0].totalExperiments, 0);
    assert.strictEqual(res.students[0].completionPercentage, 0);
    assert.strictEqual(isNaN(res.students[0].completionPercentage), false);
    assert.strictEqual(isFinite(res.students[0].completionPercentage), true);
  });

  await test('10. Lab with no enrolled students returns empty array and zeroed summary safely', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const secId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'Unenrolled Lab', code: 'CS-999', active: true });
    mockSections.push({ _id: secId, name: 'Section A', sectionCode: 'AIDS-A', active: true });
    mockLabAssignments.push({
      _id: new mongoose.Types.ObjectId(),
      lab: labId,
      teacher: teacherId,
      section: secId,
      active: true
    });

    const teacher = { _id: teacherId, role: 'TEACHER', active: true };
    const res = await labService.getLabStudentsPerformance(labId, teacher);

    assert.strictEqual(res.summary.totalStudents, 0);
    assert.strictEqual(res.students.length, 0);
    assert.strictEqual(res.summary.averageCompletion, 0);
  });

  await test('11. Non-existent lab returns 404 Not Found', async () => {
    resetState();
    const nonExistentLabId = new mongoose.Types.ObjectId();
    const teacher = { _id: new mongoose.Types.ObjectId(), role: 'TEACHER', active: true };

    try {
      await labService.getLabStudentsPerformance(nonExistentLabId, teacher);
      assert.fail('Should have thrown 404');
    } catch (err) {
      assert.strictEqual(err.statusCode, 404);
      assert.match(err.message, /laboratory not found/i);
    }
  });

  // ==========================================
  // SECTION 5: STUDENT DETAILED PERFORMANCE BREAKDOWN
  // ==========================================
  console.log('\n--- Section 5: Student Detailed Performance Endpoint ---');

  await test('12. Detailed student performance endpoint returns experiment-wise breakdown, attempts, and scores', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const secId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'Cloud Computing Lab', code: 'CS-601', active: true });
    mockSections.push({ _id: secId, name: 'Section A', sectionCode: 'AIDS-A', active: true });
    mockLabAssignments.push({
      _id: new mongoose.Types.ObjectId(),
      lab: labId,
      teacher: teacherId,
      section: secId,
      active: true
    });

    const exp1 = { _id: new mongoose.Types.ObjectId(), lab: labId, order: 1, experimentNumber: 1, title: 'AWS Lambda', active: true };
    const exp2 = { _id: new mongoose.Types.ObjectId(), lab: labId, order: 2, experimentNumber: 2, title: 'Docker Containers', active: true };
    mockExperiments.push(exp1, exp2);

    const s1 = { _id: new mongoose.Types.ObjectId(), name: 'Pavan', rollNumber: '26GR1B07005', role: 'STUDENT', section: 'AIDS-A', active: true };
    mockUsers.push(s1);

    // 2 attempts for Exp 1, with highest evaluation 8.5/10 (85%)
    mockSubmissions.push({ _id: new mongoose.Types.ObjectId(), student: s1._id, lab: labId, experiment: exp1._id, attemptNumber: 1, status: 'COMPILE_ERROR', active: true, submittedAt: new Date('2026-10-01') });
    mockSubmissions.push({ _id: new mongoose.Types.ObjectId(), student: s1._id, lab: labId, experiment: exp1._id, attemptNumber: 2, status: 'SUCCESS', active: true, submittedAt: new Date('2026-10-02') });
    mockEvaluations.push({ _id: new mongoose.Types.ObjectId(), student: s1._id, lab: labId, experiment: exp1._id, score: 8.5, isHighestScore: true, active: true });

    const teacher = { _id: teacherId, role: 'TEACHER', active: true };
    const detail = await labService.getStudentLabPerformanceDetail(labId, s1._id, teacher);

    assert.strictEqual(detail.student.name, 'Pavan');
    assert.strictEqual(detail.overall.totalExperiments, 2);
    assert.strictEqual(detail.overall.completedExperiments, 1);
    assert.strictEqual(detail.overall.pendingExperiments, 1);
    assert.strictEqual(detail.overall.completionPercentage, 50);
    assert.strictEqual(detail.overall.averageScore, 85.0);
    assert.strictEqual(detail.overall.totalSubmissions, 2);
    assert.strictEqual(detail.overall.passedSubmissions, 1);
    assert.strictEqual(detail.overall.failedSubmissions, 1);
    assert.ok(detail.overall.lastSubmission);

    // Check experiment-wise breakdown
    assert.strictEqual(detail.experiments.length, 2);
    const exp1Detail = detail.experiments[0];
    assert.strictEqual(exp1Detail.title, 'AWS Lambda');
    assert.strictEqual(exp1Detail.status, 'Completed');
    assert.strictEqual(exp1Detail.score, 85.0);
    assert.strictEqual(exp1Detail.scoreOutOf10, 8.5);
    assert.strictEqual(exp1Detail.attempts, 2);

    const exp2Detail = detail.experiments[1];
    assert.strictEqual(exp2Detail.title, 'Docker Containers');
    assert.strictEqual(exp2Detail.status, 'Pending');
    assert.strictEqual(exp2Detail.score, null);
    assert.strictEqual(exp2Detail.attempts, 0);
  });

  await test('13. Detailed student performance rejects teacher viewing student outside assigned section (403)', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const secAId = new mongoose.Types.ObjectId();
    const secBId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'Cloud Computing Lab', code: 'CS-601', active: true });
    mockSections.push({ _id: secAId, name: 'Section A', sectionCode: 'AIDS-A', active: true });
    mockSections.push({ _id: secBId, name: 'Section B', sectionCode: 'AIDS-B', active: true });

    // Teacher assigned to Section A
    mockLabAssignments.push({
      _id: new mongoose.Types.ObjectId(),
      lab: labId,
      teacher: teacherId,
      section: secAId,
      active: true
    });

    // Student in Section B
    const s2 = { _id: new mongoose.Types.ObjectId(), name: 'Outsider', rollNumber: '26GR1B07088', role: 'STUDENT', section: 'AIDS-B', active: true };
    mockUsers.push(s2);

    const teacher = { _id: teacherId, role: 'TEACHER', active: true };
    try {
      await labService.getStudentLabPerformanceDetail(labId, s2._id, teacher);
      assert.fail('Should have rejected access to student outside section');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      assert.match(err.message, /outside your assigned sections/i);
    }
  });

  // ==========================================
  // SECTION 6: ADVANCED FILTERS & DATA ISOLATION
  // ==========================================
  console.log('\n--- Section 6: Advanced Filters & Cohort Isolation ---');

  await test('14. Search filter filters students by name or roll number correctly', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const secId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'Web Dev Lab', code: 'CS-105', active: true });
    mockSections.push({ _id: secId, name: 'Section A', sectionCode: 'AIDS-A', active: true });
    mockLabAssignments.push({
      _id: new mongoose.Types.ObjectId(),
      lab: labId,
      teacher: teacherId,
      section: secId,
      active: true
    });

    const s1 = { _id: new mongoose.Types.ObjectId(), name: 'Ravi Kumar', rollNumber: '26GR1B07001', role: 'STUDENT', section: 'AIDS-A', active: true };
    const s2 = { _id: new mongoose.Types.ObjectId(), name: 'Sita Devi', rollNumber: '26GR1B07002', role: 'STUDENT', section: 'AIDS-A', active: true };
    mockUsers.push(s1, s2);

    const teacher = { _id: teacherId, role: 'TEACHER', active: true };

    // Search for "Ravi"
    const resRavi = await labService.getLabStudentsPerformance(labId, teacher, { search: 'Ravi' });
    assert.strictEqual(resRavi.students.length, 1);
    assert.strictEqual(resRavi.students[0].name, 'Ravi Kumar');

    // Search for "07002"
    const resRoll = await labService.getLabStudentsPerformance(labId, teacher, { search: '07002' });
    assert.strictEqual(resRoll.students.length, 1);
    assert.strictEqual(resRoll.students[0].rollNumber, '26GR1B07002');
  });

  await test('15. Section filter correctly limits performance view to selected section', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const secAId = new mongoose.Types.ObjectId();
    const secBId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'Embedded Systems Lab', code: 'CS-701', active: true });
    mockSections.push({ _id: secAId, name: 'Section A', sectionCode: 'AIDS-A', active: true });
    mockSections.push({ _id: secBId, name: 'Section B', sectionCode: 'AIDS-B', active: true });

    // Teacher assigned to both Section A and Section B
    mockLabAssignments.push({ _id: new mongoose.Types.ObjectId(), lab: labId, teacher: teacherId, section: secAId, active: true });
    mockLabAssignments.push({ _id: new mongoose.Types.ObjectId(), lab: labId, teacher: teacherId, section: secBId, active: true });

    const s1 = { _id: new mongoose.Types.ObjectId(), name: 'Student A', rollNumber: '26GR1B07001', role: 'STUDENT', section: 'AIDS-A', active: true };
    const s2 = { _id: new mongoose.Types.ObjectId(), name: 'Student B', rollNumber: '26GR1B07002', role: 'STUDENT', section: 'AIDS-B', active: true };
    mockUsers.push(s1, s2);

    const teacher = { _id: teacherId, role: 'TEACHER', active: true };

    // Filter by Section A
    const resSecA = await labService.getLabStudentsPerformance(labId, teacher, { sectionId: secAId });
    assert.strictEqual(resSecA.students.length, 1);
    assert.strictEqual(resSecA.students[0].section, 'AIDS-A');

    // Filter by Section B
    const resSecB = await labService.getLabStudentsPerformance(labId, teacher, { sectionId: secBId });
    assert.strictEqual(resSecB.students.length, 1);
    assert.strictEqual(resSecB.students[0].section, 'AIDS-B');
  });

  await test('16. Active status filter filters active vs inactive students accurately', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const secId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'Security Lab', code: 'CS-801', active: true });
    mockSections.push({ _id: secId, name: 'Section A', sectionCode: 'AIDS-A', active: true });
    mockLabAssignments.push({ _id: new mongoose.Types.ObjectId(), lab: labId, teacher: teacherId, section: secId, active: true });

    const sActive = { _id: new mongoose.Types.ObjectId(), name: 'Active Stu', rollNumber: '26GR1B07001', role: 'STUDENT', section: 'AIDS-A', active: true };
    const sInactive = { _id: new mongoose.Types.ObjectId(), name: 'Inactive Stu', rollNumber: '26GR1B07002', role: 'STUDENT', section: 'AIDS-A', active: false };
    mockUsers.push(sActive, sInactive);

    const teacher = { _id: teacherId, role: 'TEACHER', active: true };

    const resAll = await labService.getLabStudentsPerformance(labId, teacher);
    assert.strictEqual(resAll.summary.totalStudents, 2);
    assert.strictEqual(resAll.summary.activeStudents, 1);

    const resOnlyActive = await labService.getLabStudentsPerformance(labId, teacher, { active: true });
    assert.strictEqual(resOnlyActive.students.length, 1);
    assert.strictEqual(resOnlyActive.students[0].name, 'Active Stu');
  });

  await test('17. Student with submissions awaiting evaluation is handled safely with correct progress', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const secId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'Compiler Lab', code: 'CS-302', active: true });
    mockSections.push({ _id: secId, name: 'Section A', sectionCode: 'AIDS-A', active: true });
    mockLabAssignments.push({ _id: new mongoose.Types.ObjectId(), lab: labId, teacher: teacherId, section: secId, active: true });

    const exp1 = { _id: new mongoose.Types.ObjectId(), lab: labId, order: 1, experimentNumber: 1, title: 'Lexer', active: true };
    mockExperiments.push(exp1);

    const s1 = { _id: new mongoose.Types.ObjectId(), name: 'UnEvaluated Stu', rollNumber: '26GR1B07007', role: 'STUDENT', section: 'AIDS-A', active: true };
    mockUsers.push(s1);

    // Submission exists with SUBMITTED status (not yet evaluated)
    mockSubmissions.push({ _id: new mongoose.Types.ObjectId(), student: s1._id, lab: labId, experiment: exp1._id, status: 'SUBMITTED', active: true, submittedAt: new Date() });

    const teacher = { _id: teacherId, role: 'TEACHER', active: true };
    const res = await labService.getLabStudentsPerformance(labId, teacher);

    assert.strictEqual(res.students.length, 1);
    const stu = res.students[0];
    assert.strictEqual(stu.completedExperiments, 1);
    assert.strictEqual(stu.completionPercentage, 100);
    assert.strictEqual(stu.averageScore, null); // No evaluation score yet

    const detail = await labService.getStudentLabPerformanceDetail(labId, s1._id, teacher);
    assert.strictEqual(detail.experiments[0].status, 'Awaiting Evaluation');
  });

  await test('18. Multi-section lab aggregates summary correctly for ADMIN_HOD', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const secAId = new mongoose.Types.ObjectId();
    const secBId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'Multi-Cohort Lab', code: 'CS-900', active: true });
    mockSections.push({ _id: secAId, name: 'Section A', sectionCode: 'AIDS-A', active: true });
    mockSections.push({ _id: secBId, name: 'Section B', sectionCode: 'AIDS-B', active: true });

    mockLabAssignments.push({ _id: new mongoose.Types.ObjectId(), lab: labId, teacher: new mongoose.Types.ObjectId(), section: secAId, active: true });
    mockLabAssignments.push({ _id: new mongoose.Types.ObjectId(), lab: labId, teacher: new mongoose.Types.ObjectId(), section: secBId, active: true });

    const exp1 = { _id: new mongoose.Types.ObjectId(), lab: labId, order: 1, title: 'Exp 1', active: true };
    mockExperiments.push(exp1);

    const sA = { _id: new mongoose.Types.ObjectId(), name: 'Student A', rollNumber: '26GR1B07001', role: 'STUDENT', section: 'AIDS-A', active: true };
    const sB = { _id: new mongoose.Types.ObjectId(), name: 'Student B', rollNumber: '26GR1B07002', role: 'STUDENT', section: 'AIDS-B', active: true };
    mockUsers.push(sA, sB);

    mockSubmissions.push({ _id: new mongoose.Types.ObjectId(), student: sA._id, lab: labId, experiment: exp1._id, status: 'SUCCESS', active: true });
    mockEvaluations.push({ _id: new mongoose.Types.ObjectId(), student: sA._id, lab: labId, experiment: exp1._id, score: 8.0, active: true });

    const admin = { _id: new mongoose.Types.ObjectId(), role: 'ADMIN_HOD', active: true };
    const res = await labService.getLabStudentsPerformance(labId, admin);

    assert.strictEqual(res.summary.totalStudents, 2);
    assert.strictEqual(res.availableSections.length, 2);
    assert.strictEqual(res.summary.averageCompletion, 50); // 100% and 0% -> 50%
    assert.strictEqual(res.summary.averageScore, 80.0);
  });

  await test('19. Cross-student evaluation and submission isolation is strictly preserved', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const secId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'Data Security Lab', code: 'CS-950', active: true });
    mockSections.push({ _id: secId, name: 'Section A', sectionCode: 'AIDS-A', active: true });
    mockLabAssignments.push({ _id: new mongoose.Types.ObjectId(), lab: labId, teacher: teacherId, section: secId, active: true });

    const exp1 = { _id: new mongoose.Types.ObjectId(), lab: labId, order: 1, experimentNumber: 1, title: 'RSA', active: true };
    mockExperiments.push(exp1);

    const s1 = { _id: new mongoose.Types.ObjectId(), name: 'Student 1', rollNumber: '26GR1B07001', role: 'STUDENT', section: 'AIDS-A', active: true };
    const s2 = { _id: new mongoose.Types.ObjectId(), name: 'Student 2', rollNumber: '26GR1B07002', role: 'STUDENT', section: 'AIDS-A', active: true };
    mockUsers.push(s1, s2);

    mockSubmissions.push({ _id: new mongoose.Types.ObjectId(), student: s1._id, lab: labId, experiment: exp1._id, status: 'SUCCESS', active: true });
    mockEvaluations.push({ _id: new mongoose.Types.ObjectId(), student: s1._id, lab: labId, experiment: exp1._id, score: 10.0, active: true });

    const teacher = { _id: teacherId, role: 'TEACHER', active: true };

    const detailS1 = await labService.getStudentLabPerformanceDetail(labId, s1._id, teacher);
    const detailS2 = await labService.getStudentLabPerformanceDetail(labId, s2._id, teacher);

    assert.strictEqual(detailS1.overall.completedExperiments, 1);
    assert.strictEqual(detailS1.overall.averageScore, 100.0);
    assert.strictEqual(detailS1.overall.totalSubmissions, 1);

    assert.strictEqual(detailS2.overall.completedExperiments, 0);
    assert.strictEqual(detailS2.overall.averageScore, null);
    assert.strictEqual(detailS2.overall.totalSubmissions, 0);
  });

  await test('20. Teacher with no active sections assigned receives 403 Forbidden', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const secId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'AI Lab', code: 'CS-501', active: true });
    mockSections.push({ _id: secId, name: 'Section A', sectionCode: 'AIDS-A', active: false }); // Inactive section
    mockLabAssignments.push({ _id: new mongoose.Types.ObjectId(), lab: labId, teacher: teacherId, section: secId, active: true });

    const teacher = { _id: teacherId, role: 'TEACHER', active: true };
    try {
      await labService.getLabStudentsPerformance(labId, teacher);
      assert.fail('Should have rejected teacher with inactive section assignment');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      assert.match(err.message, /active faculty assignment/i);
    }
  });

  console.log(`\nAll ${passed}/${total} Student Performance Dashboard tests passed successfully! ✨\n`);
}

runStudentPerformanceTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
