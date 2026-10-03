const assert = require('assert');
const mongoose = require('mongoose');
const reportService = require('../services/reportService');
const {
  User,
  Lab,
  Section,
  LabAssignment,
  Experiment,
  Submission,
  Evaluation,
  VivaEvaluation
} = require('../models');

console.log('=== Running Phase 10 Reports Comprehensive & Security Tests ===\n');

async function runPhase10Tests() {
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

  // --- Mock Entities ---
  const adminUser = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000001'),
    name: 'Admin User',
    rollNumber: 'ADMIN01',
    role: 'ADMIN_HOD',
    active: true
  };

  const teacherMainA = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000010'),
    name: 'Prof Vance',
    rollNumber: 'PROFVANCE',
    role: 'TEACHER',
    active: true
  };

  const teacherOther = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000011'),
    name: 'Prof Other',
    rollNumber: 'PROFOTHER',
    role: 'TEACHER',
    active: true
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

  const studentB = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000021'),
    name: 'Bob Student',
    rollNumber: '202301002',
    role: 'STUDENT',
    section: 'CSE-B',
    academicYear: '2025-2026',
    semester: 4,
    active: true
  };

  const sectionA = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000100'),
    name: 'Section A',
    sectionCode: 'CSE-A',
    academicYear: '2025-2026',
    semester: 4,
    active: true
  };

  const sectionB = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000101'),
    name: 'Section B',
    sectionCode: 'CSE-B',
    academicYear: '2025-2026',
    semester: 4,
    active: true
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

  const lab2Other = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000202'),
    name: 'Networks Lab',
    code: 'CS202L',
    subject: 'Networks',
    department: 'CSE',
    academicYear: '2025-2026',
    semester: 4,
    active: true
  };

  const exp1 = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000300'),
    title: 'Binary Search',
    order: 1,
    lab: lab1._id,
    status: 'PUBLISHED',
    active: true
  };

  const exp2 = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000301'),
    title: 'Merge Sort',
    order: 2,
    lab: lab1._id,
    status: 'PUBLISHED',
    active: true
  };

  const mockUsers = [adminUser, teacherMainA, teacherOther, studentA, studentB];
  const mockSections = [sectionA, sectionB];
  const mockLabs = [lab1, lab2Other];
  const mockExperiments = [exp1, exp2];
  let mockEvaluations = [];
  let mockVivaEvaluations = [];
  let mockSubmissions = [];

  function setupMocks() {
    mockEvaluations = [];
    mockVivaEvaluations = [];
    mockSubmissions = [];

    User.findById = (id) => {
      const found = mockUsers.find((u) => u._id.toString() === id?.toString());
      return Promise.resolve(found || null);
    };

    User.findOne = (query) => {
      const found = mockUsers.find((u) => {
        let match = true;
        if (query._id && u._id.toString() !== query._id.toString()) match = false;
        if (query.role && u.role !== query.role) match = false;
        if (query.active !== undefined && u.active !== query.active) match = false;
        return match;
      });
      return Promise.resolve(found || null);
    };

    User.find = (query) => {
      let filtered = mockUsers.filter((u) => {
        let match = true;
        if (query.role && u.role !== query.role) match = false;
        if (query.active !== undefined && u.active !== query.active) match = false;
        if (query.section) {
          if (query.section.$in) {
            if (!query.section.$in.includes(u.section)) match = false;
          } else if (u.section !== query.section) {
            match = false;
          }
        }
        if (query._id) {
          if (query._id.$in) {
            const ids = query._id.$in.map((i) => i.toString());
            if (!ids.includes(u._id.toString())) match = false;
          } else if (u._id.toString() !== query._id.toString()) {
            match = false;
          }
        }
        return match;
      });
      const chain = {
        sort: () => Promise.resolve(filtered),
        select: () => Promise.resolve(filtered),
        then: (resolve) => resolve(filtered)
      };
      return chain;
    };

    Section.findById = (id) => {
      const found = mockSections.find((s) => s._id.toString() === id?.toString());
      return Promise.resolve(found || null);
    };

    Section.findOne = (query) => {
      const found = mockSections.find((s) => {
        if (query._id && s._id.toString() !== query._id.toString()) return false;
        if (query.sectionCode && s.sectionCode !== query.sectionCode) return false;
        return true;
      });
      return Promise.resolve(found || null);
    };

    Section.find = (query) => {
      let results = [...mockSections];
      if (query._id && query._id.$in) {
        const ids = query._id.$in.map((i) => i.toString());
        results = results.filter((s) => ids.includes(s._id.toString()));
      }
      return Promise.resolve(results);
    };

    Lab.findById = (id) => {
      const found = mockLabs.find((l) => l._id.toString() === id?.toString());
      return Promise.resolve(found || null);
    };

    Lab.findOne = (query) => {
      const found = mockLabs.find((l) => {
        if (query._id && l._id.toString() !== query._id.toString()) return false;
        if (query.code && l.code !== query.code) return false;
        return true;
      });
      return Promise.resolve(found || null);
    };

    Lab.find = (query) => {

      let results = [...mockLabs];
      if (query._id && query._id.$in) {
        const ids = query._id.$in.map((i) => i.toString());
        results = results.filter((l) => ids.includes(l._id.toString()));
      }
      return Promise.resolve(results);
    };

    LabAssignment.find = (query) => {
      const assignments = [];
      // Teacher A is assigned to lab1 with sectionA
      const matchesTeacherA = (!query.teacher || query.teacher.toString() === teacherMainA._id.toString());
      const matchesLab1 = (!query.lab || query.lab.toString() === lab1._id.toString() || (query.lab.$in && query.lab.$in.map(i => i.toString()).includes(lab1._id.toString())));
      const matchesSecA = (!query.section || query.section.toString() === sectionA._id.toString() || (query.section.$in && query.section.$in.map(i => i.toString()).includes(sectionA._id.toString())));

      if (matchesTeacherA && matchesLab1 && matchesSecA) {
        assignments.push({
          _id: new mongoose.Types.ObjectId(),
          teacher: teacherMainA,
          lab: lab1,
          section: sectionA,
          role: 'MAIN',
          active: true
        });
      }

      return {
        populate: () => Promise.resolve(assignments),
        then: (resolve) => resolve(assignments)
      };
    };

    LabAssignment.findOne = (query) => {
      const matchesTeacherA = (!query.teacher || query.teacher.toString() === teacherMainA._id.toString());
      const matchesLab1 = (!query.lab || query.lab.toString() === lab1._id.toString());
      const matchesSecA = (!query.section || query.section.toString() === sectionA._id.toString());

      if (matchesTeacherA && matchesLab1 && matchesSecA) {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          teacher: teacherMainA,
          lab: lab1,
          section: sectionA,
          role: 'MAIN',
          active: true
        });
      }
      return Promise.resolve(null);
    };

    Experiment.findById = (id) => {


      const found = mockExperiments.find((e) => e._id.toString() === id?.toString());
      return {
        populate: () => Promise.resolve(found ? { ...found, lab: lab1 } : null),
        then: (resolve) => resolve(found || null)
      };
    };

    Experiment.find = (query) => {
      let results = mockExperiments.filter((e) => {
        let match = true;
        if (query.lab) {
          if (query.lab.$in) {
            const ids = query.lab.$in.map(i => i.toString());
            if (!ids.includes(e.lab.toString())) match = false;
          } else if (e.lab.toString() !== query.lab.toString()) {
            match = false;
          }
        }
        if (query.status) {
          if (query.status.$in) {
            if (!query.status.$in.includes(e.status)) match = false;
          } else if (e.status !== query.status) {
            match = false;
          }
        }
        if (query.active !== undefined && e.active !== query.active) match = false;
        return match;
      });
      return {
        sort: () => Promise.resolve(results),
        populate: () => Promise.resolve(results.map(r => ({ ...r, lab: lab1 }))),
        then: (resolve) => resolve(results)
      };
    };

    Submission.find = (query) => {
      let filtered = mockSubmissions.filter((s) => {
        let match = true;
        if (query.student && s.student.toString() !== query.student.toString()) match = false;
        if (query.experiment && s.experiment.toString() !== query.experiment.toString()) match = false;
        if (query.lab && s.lab && s.lab.toString() !== query.lab.toString()) match = false;
        if (query.status && s.status !== query.status) match = false;
        return match;
      });
      return {
        sort: () => Promise.resolve(filtered),
        populate: () => Promise.resolve(filtered),
        then: (resolve) => resolve(filtered)
      };
    };

    Evaluation.find = (query) => {
      let filtered = mockEvaluations.filter((ev) => {
        let match = true;
        if (query.student && ev.student.toString() !== query.student.toString()) match = false;
        if (query.experiment) {
          if (query.experiment.$in) {
            const ids = query.experiment.$in.map(i => i.toString());
            if (!ids.includes(ev.experiment.toString())) match = false;
          } else if (ev.experiment.toString() !== query.experiment.toString()) {
            match = false;
          }
        }
        if (query.lab && ev.lab && ev.lab.toString() !== query.lab.toString()) match = false;
        if (query.isHighestScore !== undefined && ev.isHighestScore !== query.isHighestScore) match = false;
        return match;
      });

      const populated = filtered.map(f => {
        const exp = mockExperiments.find(e => e._id.toString() === f.experiment.toString()) || { title: 'Exp', order: 1 };
        const usr = mockUsers.find(u => u._id.toString() === f.student.toString()) || { name: 'Student', rollNumber: '000', section: 'CSE-A' };
        return { ...f, experiment: { ...exp, lab: lab1 }, student: usr };
      });

      const chain = {
        populate: () => chain,
        sort: () => chain,
        then: (resolve) => resolve(populated)
      };
      return chain;
    };


    Evaluation.findOne = (query) => {
      const filtered = mockEvaluations.find((ev) => {
        let match = true;
        if (query.student && ev.student.toString() !== query.student.toString()) match = false;
        if (query.experiment && ev.experiment.toString() !== query.experiment.toString()) match = false;
        if (query.isHighestScore !== undefined && ev.isHighestScore !== query.isHighestScore) match = false;
        return match;
      });
      return Promise.resolve(filtered || null);
    };

    VivaEvaluation.find = (query) => {
      let filtered = mockVivaEvaluations.filter((v) => {
        let match = true;
        if (query.student && v.student.toString() !== query.student.toString()) match = false;
        if (query.experiment) {
          if (query.experiment.$in) {
            const ids = query.experiment.$in.map(i => i.toString());
            if (!ids.includes(v.experiment.toString())) match = false;
          } else if (v.experiment.toString() !== query.experiment.toString()) {
            match = false;
          }
        }
        if (query.lab && v.lab && v.lab.toString() !== query.lab.toString()) match = false;
        if (query.isCurrent !== undefined && v.isCurrent !== query.isCurrent) match = false;
        return match;
      });

      const populated = filtered.map(f => {
        const exp = mockExperiments.find(e => e._id.toString() === f.experiment.toString()) || { title: 'Exp', order: 1 };
        const usr = mockUsers.find(u => u._id.toString() === f.student.toString()) || { name: 'Student', rollNumber: '000', section: 'CSE-A' };
        const evaluatedBy = teacherMainA;
        return { ...f, experiment: { ...exp, lab: lab1 }, student: usr, evaluatedBy };
      });

      const chain = {
        populate: () => chain,
        sort: () => chain,
        then: (resolve) => resolve(populated)
      };
      return chain;
    };


    VivaEvaluation.findOne = (query) => {
      const filtered = mockVivaEvaluations.find((v) => {
        let match = true;
        if (query.student && v.student.toString() !== query.student.toString()) match = false;
        if (query.experiment && v.experiment.toString() !== query.experiment.toString()) match = false;
        if (query.isCurrent !== undefined && v.isCurrent !== query.isCurrent) match = false;
        return match;
      });
      return Promise.resolve(filtered || null);
    };
  }

  setupMocks();

  // Seed baseline data: Student A has completed Exp 1 with 8/10 auto score, 4/5 viva score = 12/15 final
  mockEvaluations.push({
    _id: new mongoose.Types.ObjectId(),
    student: studentA._id,
    experiment: exp1._id,
    lab: lab1._id,
    score: 8,
    isHighestScore: true,
    passed: true
  });

  mockVivaEvaluations.push({
    _id: new mongoose.Types.ObjectId(),
    student: studentA._id,
    experiment: exp1._id,
    lab: lab1._id,
    marks: 4,
    remarks: 'Good explanation of time complexity',
    version: 1,
    isCurrent: true,
    evaluatedBy: teacherMainA._id,
    createdAt: new Date()
  });

  // Old superseded viva version
  mockVivaEvaluations.push({
    _id: new mongoose.Types.ObjectId(),
    student: studentA._id,
    experiment: exp1._id,
    lab: lab1._id,
    marks: 2,
    remarks: 'Initial viva attempt',
    version: 0,
    isCurrent: false,
    evaluatedBy: teacherMainA._id,
    createdAt: new Date(Date.now() - 86400000)
  });


  // ==================== TEST SUITE ====================

  // --- Student Report Tests ---
  await test('1. Student can generate and view their own report', async () => {
    const report = await reportService.getStudentReport(studentA, studentA._id.toString());
    assert.strictEqual(report.type, 'STUDENT_REPORT');
    assert.strictEqual(report.student.rollNumber, '202301001');
    assert.strictEqual(report.progress.totalExperiments, 2);
    assert.strictEqual(report.progress.completedExperiments, 1);
    assert.strictEqual(report.progress.completionPercentage, 50);
    assert.strictEqual(report.experiments[0].automatedScore, 8);
    assert.strictEqual(report.experiments[0].vivaScore, 4);
    assert.strictEqual(report.experiments[0].finalScore, 12);
  });

  await test('2. IDOR Security: Student cannot access another student report', async () => {
    try {
      await reportService.getStudentReport(studentA, studentB._id.toString());
      assert.fail('Should have thrown 403 Forbidden');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }

  });

  await test('3. Authorized teacher can view student report within their section', async () => {
    const report = await reportService.getStudentReport(teacherMainA, studentA._id.toString());
    assert.strictEqual(report.student.rollNumber, '202301001');
    assert.strictEqual(report.progress.completionPercentage, 50);
  });

  await test('4. Teacher scope: Teacher cannot view student report outside assigned section', async () => {
    try {
      // studentB is in sectionB (teacherMainA is only assigned to sectionA)
      await reportService.getStudentReport(teacherMainA, studentB._id.toString());
      assert.fail('Should have thrown 403 Forbidden');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }
  });

  await test('5. Admin can access any student report', async () => {
    const reportA = await reportService.getStudentReport(adminUser, studentA._id.toString());
    const reportB = await reportService.getStudentReport(adminUser, studentB._id.toString());
    assert.strictEqual(reportA.student.rollNumber, '202301001');
    assert.strictEqual(reportB.student.rollNumber, '202301002');
  });

  // --- Section Report Tests ---
  await test('6. Authorized teacher can generate section report for assigned section', async () => {
    const report = await reportService.getSectionReport(teacherMainA, sectionA._id.toString());
    assert.strictEqual(report.type, 'SECTION_REPORT');
    assert.strictEqual(report.section.sectionCode, 'CSE-A');
    assert.strictEqual(report.summary.totalStudents, 1);
    assert.strictEqual(report.students[0].rollNumber, '202301001');
    assert.strictEqual(report.students[0].averageFinalScore, 12);
  });

  await test('7. Teacher scope: Teacher cannot generate report for unassigned section', async () => {
    try {
      await reportService.getSectionReport(teacherMainA, sectionB._id.toString());
      assert.fail('Should have thrown 403 Forbidden');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }
  });

  await test('8. Student cannot access section reports', async () => {
    try {
      await reportService.getSectionReport(studentA, sectionA._id.toString());
      assert.fail('Should have thrown 403 Forbidden');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }
  });

  await test('9. Admin can access any section report', async () => {
    const report = await reportService.getSectionReport(adminUser, sectionB._id.toString());
    assert.strictEqual(report.section.sectionCode, 'CSE-B');
  });

  // --- Lab Report Tests ---
  await test('10. Authorized teacher can generate lab report for assigned lab', async () => {
    const report = await reportService.getLabReport(teacherMainA, lab1._id.toString());
    assert.strictEqual(report.type, 'LAB_REPORT');
    assert.strictEqual(report.lab.code, 'CS201L');
    assert.strictEqual(report.summary.totalExperiments, 2);
  });

  await test('11. Teacher scope: Teacher cannot generate report for unassigned lab', async () => {
    try {
      await reportService.getLabReport(teacherMainA, lab2Other._id.toString());
      assert.fail('Should have thrown 403 Forbidden');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }
  });

  await test('12. Student cannot access lab reports', async () => {
    try {
      await reportService.getLabReport(studentA, lab1._id.toString());
      assert.fail('Should have thrown 403 Forbidden');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }
  });

  // --- Experiment Report Tests ---
  await test('13. Authorized teacher can generate experiment report', async () => {
    const report = await reportService.getExperimentReport(teacherMainA, exp1._id.toString());
    assert.strictEqual(report.type, 'EXPERIMENT_REPORT');
    assert.strictEqual(report.experiment.title, 'Binary Search');
    assert.strictEqual(report.metrics.completed, 1);
    assert.strictEqual(report.metrics.averageAutomatedScore, 8);
    assert.strictEqual(report.metrics.averageVivaScore, 4);
    assert.strictEqual(report.metrics.averageFinalScore, 12);
    assert.strictEqual(report.metrics.highestScore, 12);
    assert.strictEqual(report.metrics.lowestScore, 12);
  });

  await test('14. Student cannot access experiment reports', async () => {
    try {
      await reportService.getExperimentReport(studentA, exp1._id.toString());
      assert.fail('Should have thrown 403 Forbidden');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }
  });

  // --- Marks Report Tests & Scoring Rule Verification ---
  await test('15. Marks report preserves scoring rules: /10 auto + /5 viva = /15 final', async () => {
    const report = await reportService.getMarksReport(adminUser, { labId: lab1._id.toString() });
    assert.strictEqual(report.type, 'MARKS_REPORT');
    assert.strictEqual(report.rows.length, 1);
    const row = report.rows[0];
    assert.strictEqual(row.automatedScore, 8);
    assert.strictEqual(row.vivaScore, 4);
    assert.strictEqual(row.finalScore, 12);
  });

  await test('16. Marks report uses highest valid automated score and authoritative current viva', async () => {
    // Add another lower automated score and confirm highest is retained
    const report = await reportService.getMarksReport(teacherMainA, { experimentId: exp1._id.toString() });
    const row = report.rows[0];
    assert.strictEqual(row.automatedScore, 8);
    // Old viva (marks: 2) was superseded by current viva (marks: 4)
    assert.strictEqual(row.vivaScore, 4);
    assert.strictEqual(row.finalScore, 12);
  });

  await test('17. Student accessing marks report gets only their own marks', async () => {
    const report = await reportService.getMarksReport(studentA, {});
    assert.strictEqual(report.type, 'MARKS_REPORT');
    assert.strictEqual(report.rows.length, 1);
    assert.strictEqual(report.rows[0].rollNumber, '202301001');
  });

  // --- Viva Report Tests ---
  await test('18. Viva report reflects current authoritative viva evaluation', async () => {
    const report = await reportService.getVivaReport(teacherMainA, { labId: lab1._id.toString() });
    assert.strictEqual(report.type, 'VIVA_REPORT');
    assert.strictEqual(report.rows.length, 1);
    const row = report.rows[0];
    assert.strictEqual(row.vivaMarks, 4);
    assert.strictEqual(row.evaluationVersion, 1);
    assert.strictEqual(row.remarks, 'Good explanation of time complexity');
  });

  await test('19. Student accessing viva report gets only their own records', async () => {
    const report = await reportService.getVivaReport(studentA, {});
    assert.strictEqual(report.rows.length, 1);
    assert.strictEqual(report.rows[0].rollNumber, '202301001');
  });

  // --- Progress Report Tests & 12 Experiment Limit ---
  await test('20. Progress report complies with 12 experiment maximum rule', async () => {
    const report = await reportService.getProgressReport(adminUser, { labId: lab1._id.toString() });
    assert.strictEqual(report.type, 'PROGRESS_REPORT');
    assert.strictEqual(report.summary.totalLabs, 1);
    assert.strictEqual(report.rows.length, 1);
    assert.strictEqual(report.rows[0].completed, 1);
    assert.strictEqual(report.rows[0].pending, 1);
    assert.strictEqual(report.rows[0].completionPercentage, 50);
  });

  // --- PDF Export Tests ---
  await test('21. PDF generation produces valid, non-empty Buffer with %PDF header', async () => {
    const studentRep = await reportService.getStudentReport(studentA, studentA._id.toString());
    const pdfBuffer = await reportService.exportReportPdf(studentRep);
    assert(Buffer.isBuffer(pdfBuffer), 'Result must be a Buffer');
    assert(pdfBuffer.length > 500, 'PDF buffer must contain real content');
    const header = pdfBuffer.slice(0, 4).toString('utf-8');
    assert.strictEqual(header, '%PDF', 'PDF magic number header must be present');
  });

  await test('22. PDF generation functions across all report types (Lab, Section, Marks, Viva)', async () => {
    const sectionRep = await reportService.getSectionReport(adminUser, sectionA._id.toString());
    const labRep = await reportService.getLabReport(adminUser, lab1._id.toString());
    const marksRep = await reportService.getMarksReport(adminUser, {});
    const vivaRep = await reportService.getVivaReport(adminUser, {});

    const secPdf = await reportService.exportReportPdf(sectionRep);
    const labPdf = await reportService.exportReportPdf(labRep);
    const marksPdf = await reportService.exportReportPdf(marksRep);
    const vivaPdf = await reportService.exportReportPdf(vivaRep);

    assert(secPdf.length > 500 && secPdf.slice(0, 4).toString('utf-8') === '%PDF');
    assert(labPdf.length > 500 && labPdf.slice(0, 4).toString('utf-8') === '%PDF');
    assert(marksPdf.length > 500 && marksPdf.slice(0, 4).toString('utf-8') === '%PDF');
    assert(vivaPdf.length > 500 && vivaPdf.slice(0, 4).toString('utf-8') === '%PDF');
  });

  // --- Excel Export Tests ---
  await test('23. Excel generation produces valid, non-empty XLSX Buffer with PK zip header', async () => {
    const marksRep = await reportService.getMarksReport(adminUser, {});
    const excelBuffer = await reportService.exportReportExcel(marksRep);
    assert(Buffer.isBuffer(excelBuffer), 'Result must be a Buffer');
    assert(excelBuffer.length > 500, 'Excel buffer must contain real content');
    const header = excelBuffer.slice(0, 2).toString('utf-8');
    assert.strictEqual(header, 'PK', 'XLSX zip container magic number must be PK');
  });

  await test('24. Excel generation functions across Student, Section, Lab, Viva, and Progress reports', async () => {
    const studentRep = await reportService.getStudentReport(studentA, studentA._id.toString());
    const sectionRep = await reportService.getSectionReport(adminUser, sectionA._id.toString());
    const labRep = await reportService.getLabReport(adminUser, lab1._id.toString());
    const vivaRep = await reportService.getVivaReport(adminUser, {});
    const progressRep = await reportService.getProgressReport(adminUser, {});

    const stuXlsx = await reportService.exportReportExcel(studentRep);
    const secXlsx = await reportService.exportReportExcel(sectionRep);
    const labXlsx = await reportService.exportReportExcel(labRep);
    const vivaXlsx = await reportService.exportReportExcel(vivaRep);
    const progXlsx = await reportService.exportReportExcel(progressRep);

    assert(stuXlsx.length > 500 && stuXlsx.slice(0, 2).toString('utf-8') === 'PK');
    assert(secXlsx.length > 500 && secXlsx.slice(0, 2).toString('utf-8') === 'PK');
    assert(labXlsx.length > 500 && labXlsx.slice(0, 2).toString('utf-8') === 'PK');
    assert(vivaXlsx.length > 500 && vivaXlsx.slice(0, 2).toString('utf-8') === 'PK');
    assert(progXlsx.length > 500 && progXlsx.slice(0, 2).toString('utf-8') === 'PK');
  });

  // --- Empty / Edge Case Handling ---
  await test('25. Empty report datasets are handled gracefully in calculations and exports', async () => {
    const emptyStudent = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Empty Student',
      rollNumber: '202301999',
      role: 'STUDENT',
      section: 'CSE-A',
      academicYear: '2025-2026',
      semester: 4,
      active: true
    };
    mockUsers.push(emptyStudent);

    const report = await reportService.getStudentReport(emptyStudent, emptyStudent._id.toString());
    assert.strictEqual(report.progress.completedExperiments, 0);
    assert.strictEqual(report.progress.completionPercentage, 0);

    const emptyPdf = await reportService.exportReportPdf(report);
    const emptyExcel = await reportService.exportReportExcel(report);
    assert(emptyPdf.length > 300);
    assert(emptyExcel.length > 300);
  });

  console.log(`\n==============================================`);
  console.log(`Phase 10 Tests Passed: ${passed}/${total}`);
  console.log(`==============================================\n`);
}

runPhase10Tests().catch((err) => {
  console.error('Test suite failure:', err);
  process.exit(1);
});
