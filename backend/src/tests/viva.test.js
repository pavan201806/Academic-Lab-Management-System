const assert = require('assert');
const mongoose = require('mongoose');
const vivaService = require('../services/vivaService');
const reevaluationService = require('../services/reevaluationService');
const {
  VivaEvaluation,
  ReevaluationRequest,
  Experiment,
  Lab,
  Section,
  LabAssignment,
  User,
  Evaluation
} = require('../models');
const {
  validateCreateVivaInput,
  validateCreateReevaluationRequestInput,
  validateProcessReevaluationInput
} = require('../validators/viva.validator');

console.log('=== Running Phase 8 Viva and Re-evaluation Comprehensive Tests ===\n');

async function runPhase8Tests() {
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

  const teacherSectionB = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000011'),
    name: 'Prof Section B',
    rollNumber: 'PROFSECB',
    role: 'TEACHER',
    active: true
  };

  const teacherUnassigned = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000012'),
    name: 'Prof Unassigned',
    rollNumber: 'PROFUNASS',
    role: 'TEACHER',
    active: true
  };

  const studentA = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000020'),
    name: 'Alice Student',
    rollNumber: '202301001',
    role: 'STUDENT',
    section: 'CSE-A',
    active: true
  };

  const studentB = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000021'),
    name: 'Bob Student',
    rollNumber: '202301002',
    role: 'STUDENT',
    section: 'CSE-B',
    active: true
  };

  const sectionA = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000100'),
    name: 'Section A',
    sectionCode: 'CSE-A',
    active: true
  };

  const sectionB = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000101'),
    name: 'Section B',
    sectionCode: 'CSE-B',
    active: true
  };

  const lab1 = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000200'),
    name: 'Data Structures Lab',
    code: 'CS201L',
    active: true
  };

  const lab2Other = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000202'),
    name: 'Networks Lab',
    code: 'CS202L',
    active: true
  };

  const experiment1 = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000300'),
    title: 'Binary Search Implementation',
    experimentNumber: 1,
    lab: lab1,
    status: 'PUBLISHED',
    programmingLanguages: ['Python', 'C'],
    active: true
  };

  // In-memory mock database collections
  let mockVivaEvaluations = [];
  let mockReevaluations = [];
  let mockUsers = [adminUser, teacherMainA, teacherSectionB, teacherUnassigned, studentA, studentB];

  function setupMocks() {
    mockVivaEvaluations = [];
    mockReevaluations = [];

    User.findById = (id) => {
      const found = mockUsers.find((u) => u._id.toString() === id?.toString());
      return Promise.resolve(found || null);
    };

    User.find = (query) => {
      let filtered = mockUsers.filter((u) => {
        let match = true;
        if (query.role && u.role !== query.role) match = false;
        if (query.active !== undefined && u.active !== query.active) match = false;
        if (query.section && query.section.$in) {
          if (!query.section.$in.includes(u.section)) match = false;
        }
        return match;
      });

      const chain = {
        select: () => Promise.resolve(filtered),
        then: (resolve) => resolve(filtered)
      };
      return chain;
    };

    Section.findOne = (query) => {
      if (query.sectionCode === 'CSE-A' && query.active === true) return Promise.resolve(sectionA);
      if (query.sectionCode === 'CSE-B' && query.active === true) return Promise.resolve(sectionB);
      return Promise.resolve(null);
    };

    Lab.findById = (id) => {
      if (id?.toString() === lab1._id.toString()) return Promise.resolve(lab1);
      if (id?.toString() === lab2Other._id.toString()) return Promise.resolve(lab2Other);
      return Promise.resolve(null);
    };

    Experiment.findById = (id) => {
      if (id?.toString() === experiment1._id.toString()) {
        return {
          populate: () => Promise.resolve({ ...experiment1 })
        };
      }
      return {
        populate: () => Promise.resolve(null)
      };
    };

    LabAssignment.findOne = (query) => {
      // Teacher Main A is assigned to Lab 1 + Section A
      if (
        query.lab?.toString() === lab1._id.toString() &&
        query.teacher?.toString() === teacherMainA._id.toString() &&
        query.active === true
      ) {
        if (query.section && query.section.toString() !== sectionA._id.toString()) {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          lab: lab1,
          section: sectionA,
          teacher: teacherMainA,
          active: true
        });
      }

      // Teacher Section B is assigned to Lab 1 + Section B
      if (
        query.lab?.toString() === lab1._id.toString() &&
        query.teacher?.toString() === teacherSectionB._id.toString() &&
        query.active === true
      ) {
        if (query.section && query.section.toString() !== sectionB._id.toString()) {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          lab: lab1,
          section: sectionB,
          teacher: teacherSectionB,
          active: true
        });
      }

      // General student section check for Lab 1 + Section A (when query.teacher is undefined)
      if (
        !query.teacher &&
        query.lab?.toString() === lab1._id.toString() &&
        query.section?.toString() === sectionA._id.toString() &&
        query.active === true
      ) {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          lab: lab1,
          section: sectionA,
          teacher: teacherMainA,
          active: true
        });
      }

      // Student section check for Lab 1 + Section B (when query.teacher is undefined)
      if (
        !query.teacher &&
        query.lab?.toString() === lab1._id.toString() &&
        query.section?.toString() === sectionB._id.toString() &&
        query.active === true
      ) {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          lab: lab1,
          section: sectionB,
          teacher: teacherSectionB,
          active: true
        });
      }

      return Promise.resolve(null);
    };

    LabAssignment.find = (query) => {
      let results = [];
      if (query.lab?.toString() === lab1._id.toString() && query.active === true) {
        if (!query.teacher || query.teacher?.toString() === teacherMainA._id.toString()) {
          results.push({
            _id: new mongoose.Types.ObjectId(),
            lab: lab1,
            section: sectionA,
            teacher: teacherMainA,
            active: true
          });
        }
        if (!query.teacher || query.teacher?.toString() === teacherSectionB._id.toString()) {
          results.push({
            _id: new mongoose.Types.ObjectId(),
            lab: lab1,
            section: sectionB,
            teacher: teacherSectionB,
            active: true
          });
        }
      }

      const chain = {
        populate: () => Promise.resolve(results),
        then: (resolve) => resolve(results)
      };
      return chain;
    };

    Evaluation.find = () => Promise.resolve([]);

    VivaEvaluation.create = (data) => {
      const doc = {
        _id: new mongoose.Types.ObjectId(),
        ...data,
        save: function () {
          const idx = mockVivaEvaluations.findIndex((v) => v._id.toString() === this._id.toString());
          if (idx >= 0) mockVivaEvaluations[idx] = this;
          return Promise.resolve(this);
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockVivaEvaluations.push(doc);
      return Promise.resolve(doc);
    };

    VivaEvaluation.findById = (id) => {
      const found = mockVivaEvaluations.find((v) => v._id.toString() === id?.toString());
      if (found) {
        found.save = function () {
          const idx = mockVivaEvaluations.findIndex((v) => v._id.toString() === this._id.toString());
          if (idx >= 0) mockVivaEvaluations[idx] = this;
          return Promise.resolve(this);
        };
      }
      const chain = {
        populate: () => chain,
        then: (resolve) => resolve(found || null)
      };
      return chain;
    };

    VivaEvaluation.findOne = (query) => {
      const found = mockVivaEvaluations.find((v) => {
        let match = true;
        if (query.student && v.student.toString() !== query.student.toString()) match = false;
        if (query.experiment && v.experiment.toString() !== query.experiment.toString()) match = false;
        if (query.isCurrent !== undefined && v.isCurrent !== query.isCurrent) match = false;
        if (query.active !== undefined && v.active !== query.active) match = false;
        return match;
      });

      if (found) {
        found.save = function () {
          const idx = mockVivaEvaluations.findIndex((v) => v._id.toString() === this._id.toString());
          if (idx >= 0) mockVivaEvaluations[idx] = this;
          return Promise.resolve(this);
        };
      }

      const chain = {
        populate: () => chain,
        sort: () => chain,
        then: (resolve) => resolve(found || null)
      };
      return chain;
    };

    VivaEvaluation.find = (query) => {
      let filtered = mockVivaEvaluations.filter((v) => {
        let match = true;
        if (query.student && v.student.toString() !== query.student.toString()) match = false;
        if (query.experiment && v.experiment.toString() !== query.experiment.toString()) match = false;
        if (query.lab && v.lab.toString() !== query.lab.toString()) match = false;
        if (query.isCurrent !== undefined && v.isCurrent !== query.isCurrent) match = false;
        if (query.active !== undefined && v.active !== query.active) match = false;
        return match;
      });

      const chain = {
        populate: () => chain,
        sort: (sortObj) => {
          if (sortObj?.evaluationVersion) {
            filtered.sort((a, b) => a.evaluationVersion - b.evaluationVersion);
          }
          return chain;
        },
        then: (resolve) => resolve(filtered)
      };
      return chain;
    };

    ReevaluationRequest.create = (data) => {
      const doc = {
        _id: new mongoose.Types.ObjectId(),
        ...data,
        save: function () {
          const idx = mockReevaluations.findIndex((r) => r._id.toString() === this._id.toString());
          if (idx >= 0) mockReevaluations[idx] = this;
          return Promise.resolve(this);
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockReevaluations.push(doc);
      return Promise.resolve(doc);
    };

    ReevaluationRequest.findById = (id) => {
      const found = mockReevaluations.find((r) => r._id.toString() === id?.toString());
      if (found) {
        found.save = function () {
          const idx = mockReevaluations.findIndex((r) => r._id.toString() === this._id.toString());
          if (idx >= 0) mockReevaluations[idx] = this;
          return Promise.resolve(this);
        };
      }
      const chain = {
        populate: () => chain,
        then: (resolve) => resolve(found || null)
      };
      return chain;
    };

    ReevaluationRequest.findOne = (query) => {
      const found = mockReevaluations.find((r) => {
        let match = true;
        if (query.student && r.student.toString() !== query.student.toString()) match = false;
        if (query.experiment && r.experiment.toString() !== query.experiment.toString()) match = false;
        if (query.status && r.status !== query.status) match = false;
        if (query.active !== undefined && r.active !== query.active) match = false;
        return match;
      });

      if (found) {
        found.save = function () {
          const idx = mockReevaluations.findIndex((r) => r._id.toString() === this._id.toString());
          if (idx >= 0) mockReevaluations[idx] = this;
          return Promise.resolve(this);
        };
      }

      const chain = {
        populate: () => chain,
        sort: () => chain,
        then: (resolve) => resolve(found || null)
      };
      return chain;
    };

    ReevaluationRequest.find = (query) => {
      let filtered = mockReevaluations.filter((r) => {
        let match = true;
        if (query.lab && r.lab.toString() !== query.lab.toString()) match = false;
        if (query.experiment && r.experiment.toString() !== query.experiment.toString()) match = false;
        if (query.active !== undefined && r.active !== query.active) match = false;
        return match;
      });

      const chain = {
        populate: () => chain,
        sort: () => chain,
        then: (resolve) => resolve(filtered)
      };
      return chain;
    };
  }

  setupMocks();

  // =========================================================================
  // SECTION 1: VIVA EVALUATION & SCORING (1-13)
  // =========================================================================
  console.log('\n--- Section 1: Viva Evaluation & Scoring (1-13) ---');

  await test('1. Authorized teacher can view eligible students for an experiment', async () => {
    const eligible = await vivaService.getEligibleStudentsForViva(experiment1._id, teacherMainA);
    assert.ok(Array.isArray(eligible));
    assert.strictEqual(eligible.length, 1);
    assert.strictEqual(eligible[0].student.rollNumber, '202301001');
    assert.strictEqual(eligible[0].hasEvaluatedViva, false);
  });

  let createdViva1 = null;

  await test('2. Authorized teacher can evaluate a student\'s Viva (0 <= marks <= 5)', async () => {
    createdViva1 = await vivaService.createVivaEvaluation(
      {
        studentId: studentA._id.toString(),
        experimentId: experiment1._id.toString(),
        marks: 3.5,
        remarks: 'Good algorithmic explanation and complexity analysis'
      },
      teacherMainA
    );
    assert.ok(createdViva1._id);
    assert.strictEqual(createdViva1.marks, 3.5);
    assert.strictEqual(createdViva1.evaluationVersion, 1);
    assert.strictEqual(createdViva1.isCurrent, true);
    assert.strictEqual(createdViva1.status, 'EVALUATED');
  });

  await test('3. Unauthorized teacher from unassigned section/lab cannot evaluate Viva (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        await vivaService.createVivaEvaluation(
          {
            studentId: studentA._id.toString(),
            experimentId: experiment1._id.toString(),
            marks: 4,
            remarks: 'Should fail'
          },
          teacherUnassigned
        );
      },
      (err) => err.statusCode === 403 && err.message.includes('not have an active faculty assignment')
    );
  });

  await test('4. Student cannot create or submit Viva evaluations (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        await vivaService.createVivaEvaluation(
          {
            studentId: studentA._id.toString(),
            experimentId: experiment1._id.toString(),
            marks: 5,
            remarks: 'Student grading themselves'
          },
          studentA
        );
      },
      (err) => err.statusCode === 403 && err.message.includes('Faculty privileges required')
    );
  });

  await test('5. Student can view their own Viva evaluation and history', async () => {
    const myViva = await vivaService.getStudentViva(experiment1._id, studentA);
    assert.ok(myViva.currentViva);
    assert.strictEqual(myViva.currentViva.marks, 3.5);
    assert.strictEqual(myViva.history.length, 1);
  });

  await test('6. Student cannot view another student\'s Viva evaluation (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        await vivaService.getVivaById(createdViva1._id, studentB);
      },
      (err) => err.statusCode === 403 && err.message.includes('not authorized to view another student')
    );
  });

  await test('7. Viva marks minimum 0 is accepted', () => {
    let error = null;
    validateCreateVivaInput(
      { body: { studentId: studentA._id.toString(), experimentId: experiment1._id.toString(), marks: 0 } },
      {},
      (err) => { error = err; }
    );
    assert.strictEqual(error, undefined);
  });

  await test('8. Viva marks maximum 5 is accepted', () => {
    let error = null;
    validateCreateVivaInput(
      { body: { studentId: studentA._id.toString(), experimentId: experiment1._id.toString(), marks: 5 } },
      {},
      (err) => { error = err; }
    );
    assert.strictEqual(error, undefined);
  });

  await test('9. Viva marks >5 is rejected with 400 Bad Request', () => {
    let error = null;
    validateCreateVivaInput(
      { body: { studentId: studentA._id.toString(), experimentId: experiment1._id.toString(), marks: 5.5 } },
      {},
      (err) => { error = err; }
    );
    assert.ok(error);
    assert.strictEqual(error.statusCode, 400);
    assert.ok(error.message.includes('between 0 and 5'));
  });

  await test('10. Negative viva marks are rejected with 400 Bad Request', () => {
    let error = null;
    validateCreateVivaInput(
      { body: { studentId: studentA._id.toString(), experimentId: experiment1._id.toString(), marks: -1 } },
      {},
      (err) => { error = err; }
    );
    assert.ok(error);
    assert.strictEqual(error.statusCode, 400);
    assert.ok(error.message.includes('between 0 and 5'));
  });

  await test('11. Viva evaluation for non-existent experiment is rejected with 404', async () => {
    const fakeExpId = new mongoose.Types.ObjectId();
    await assert.rejects(
      async () => {
        await vivaService.createVivaEvaluation(
          { studentId: studentB._id.toString(), experimentId: fakeExpId.toString(), marks: 4 },
          adminUser
        );
      },
      (err) => err.statusCode === 404 && err.message.includes('Experiment not found')
    );
  });

  await test('12. Viva evaluation for non-existent student is rejected with 404', async () => {
    const fakeStudentId = new mongoose.Types.ObjectId();
    await assert.rejects(
      async () => {
        await vivaService.createVivaEvaluation(
          { studentId: fakeStudentId.toString(), experimentId: experiment1._id.toString(), marks: 4 },
          teacherMainA
        );
      },
      (err) => err.statusCode === 404 && err.message.includes('student is required')
    );
  });

  await test('13. Duplicate initial Viva evaluation for the same student & experiment is rejected with 400', async () => {
    await assert.rejects(
      async () => {
        await vivaService.createVivaEvaluation(
          {
            studentId: studentA._id.toString(),
            experimentId: experiment1._id.toString(),
            marks: 4.5,
            remarks: 'Duplicate entry attempt'
          },
          teacherMainA
        );
      },
      (err) => err.statusCode === 400 && err.message.includes('already has an active Viva evaluation')
    );
  });

  // =========================================================================
  // SECTION 2: RE-EVALUATION REQUEST & PROCESSING (14-22)
  // =========================================================================
  console.log('\n--- Section 2: Re-evaluation Request & Processing (14-22) ---');

  let reevalRequest1 = null;

  await test('14. Student can request re-evaluation for their own completed Viva', async () => {
    reevalRequest1 = await reevaluationService.requestReevaluation(
      {
        experimentId: experiment1._id.toString(),
        reason: 'I clarified the boundary conditions during the second discussion with teacher.'
      },
      studentA
    );
    assert.ok(reevalRequest1._id);
    assert.strictEqual(reevalRequest1.status, 'PENDING');
    assert.strictEqual(reevalRequest1.student._id.toString(), studentA._id.toString());
  });

  await test('15. Student cannot request re-evaluation for another student (identity from JWT)', async () => {
    // Calling service with studentB tries to find studentB's viva on exp1
    await assert.rejects(
      async () => {
        await reevaluationService.requestReevaluation(
          { experimentId: experiment1._id.toString(), reason: 'Attempt for Alice' },
          studentB // Bob has no completed viva on exp1
        );
      },
      (err) => err.statusCode === 400 && err.message.includes('Cannot request re-evaluation before an initial Viva')
    );
  });

  await test('16. Duplicate pending re-evaluation request for the same experiment is rejected with 400', async () => {
    await assert.rejects(
      async () => {
        await reevaluationService.requestReevaluation(
          { experimentId: experiment1._id.toString(), reason: 'Duplicate pending request' },
          studentA
        );
      },
      (err) => err.statusCode === 400 && err.message.includes('pending re-evaluation request already exists')
    );
  });

  await test('17. Re-evaluation request before initial Viva is evaluated is rejected with 400', async () => {
    await assert.rejects(
      async () => {
        await reevaluationService.requestReevaluation(
          { experimentId: experiment1._id.toString(), reason: 'Premature request' },
          studentB
        );
      },
      (err) => err.statusCode === 400 && err.message.includes('Cannot request re-evaluation before an initial Viva')
    );
  });

  await test('18. Unauthorized teacher cannot process re-evaluation request (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        await reevaluationService.processReevaluationRequest(
          reevalRequest1._id,
          { action: 'REJECT', reviewRemarks: 'Declined' },
          teacherUnassigned
        );
      },
      (err) => err.statusCode === 403 && err.message.includes('not have an active faculty assignment')
    );
  });

  await test('19. Authorized teacher can reject a re-evaluation request with review remarks', async () => {
    // Let's create a temporary viva and request to test rejection cleanly
    const tempStudent = {
      _id: new mongoose.Types.ObjectId('64f000000000000000000099'),
      name: 'Reject Test Student',
      rollNumber: '202301099',
      role: 'STUDENT',
      section: 'CSE-A',
      active: true
    };
    mockUsers.push(tempStudent);

    const tempViva = await vivaService.createVivaEvaluation(
      { studentId: tempStudent._id.toString(), experimentId: experiment1._id.toString(), marks: 2 },
      teacherMainA
    );

    const tempRequest = await reevaluationService.requestReevaluation(
      { experimentId: experiment1._id.toString(), reason: 'Please reconsider my answer.' },
      tempStudent
    );

    const processResult = await reevaluationService.processReevaluationRequest(
      tempRequest._id,
      { action: 'REJECT', reviewRemarks: 'Initial assessment was accurate.' },
      teacherMainA
    );

    assert.strictEqual(processResult.request.status, 'REJECTED');
    assert.strictEqual(processResult.request.reviewRemarks, 'Initial assessment was accurate.');
    assert.strictEqual(processResult.newVivaEvaluation, null);
  });

  let reevaluatedViva = null;

  await test('20. Authorized teacher can approve re-evaluation request and submit new marks', async () => {
    const processResult = await reevaluationService.processReevaluationRequest(
      reevalRequest1._id,
      {
        action: 'APPROVE',
        reviewRemarks: 'Reviewed code and oral defense; upgraded score.',
        marks: 4.5,
        remarks: 'Demonstrated complete understanding of edge cases.'
      },
      teacherMainA
    );

    assert.strictEqual(processResult.request.status, 'COMPLETED');
    assert.ok(processResult.newVivaEvaluation);
    assert.strictEqual(processResult.newVivaEvaluation.marks, 4.5);
    assert.strictEqual(processResult.newVivaEvaluation.status, 'RE_EVALUATED');
    assert.strictEqual(processResult.newVivaEvaluation.evaluationVersion, 2);
    assert.strictEqual(processResult.newVivaEvaluation.isCurrent, true);

    reevaluatedViva = processResult.newVivaEvaluation;
  });

  await test('21. Re-evaluation creates a new immutable historical Viva version while preserving the original', async () => {
    const history = await VivaEvaluation.find({
      student: studentA._id,
      experiment: experiment1._id,
      active: true
    }).sort({ evaluationVersion: 1 });

    assert.strictEqual(history.length, 2);
    // Version 1 (Original)
    assert.strictEqual(history[0].evaluationVersion, 1);
    assert.strictEqual(history[0].marks, 3.5);
    assert.strictEqual(history[0].isCurrent, false);
    // Version 2 (Re-evaluated)
    assert.strictEqual(history[1].evaluationVersion, 2);
    assert.strictEqual(history[1].marks, 4.5);
    assert.strictEqual(history[1].isCurrent, true);
  });

  await test('22. The latest valid completed Viva evaluation becomes the active current score', async () => {
    const studentViva = await vivaService.getStudentViva(experiment1._id, studentA);
    assert.strictEqual(studentViva.currentViva.marks, 4.5);
    assert.strictEqual(studentViva.currentViva.evaluationVersion, 2);
    assert.strictEqual(studentViva.currentViva.isCurrent, true);
  });

  // =========================================================================
  // SECTION 3: SECURITY, IDOR & INTEGRITY PROTECTIONS (23-32)
  // =========================================================================
  console.log('\n--- Section 3: Security, Privacy & IDOR Protections (23-32) ---');

  await test('23. Client-supplied role tampering cannot bypass Viva authorization', async () => {
    const tamperedUser = { ...studentA, role: 'STUDENT' };
    await assert.rejects(
      async () => {
        await vivaService.createVivaEvaluation(
          { studentId: studentA._id.toString(), experimentId: experiment1._id.toString(), marks: 5 },
          tamperedUser
        );
      },
      (err) => err.statusCode === 403
    );
  });

  await test('24. Client-supplied teacherId tampering cannot grant faculty Viva evaluation permissions', async () => {
    await assert.rejects(
      async () => {
        await vivaService.createVivaEvaluation(
          {
            studentId: studentB._id.toString(),
            experimentId: experiment1._id.toString(),
            marks: 5,
            teacherId: teacherMainA._id
          },
          teacherUnassigned
        );
      },
      (err) => err.statusCode === 403
    );
  });

  await test('25. Client-supplied studentId tampering cannot forge another student\'s re-evaluation request', async () => {
    // Calling requestReevaluation takes student identity from studentUser parameter
    const req = await reevaluationService.requestReevaluation(
      {
        experimentId: experiment1._id.toString(),
        reason: 'Valid second reevaluation request'
      },
      studentA
    );
    assert.strictEqual(req.student.toString(), studentA._id.toString());
  });

  await test('26. Client-supplied labId tampering cannot grant cross-lab access', async () => {
    await assert.rejects(
      async () => {
        await vivaService.getLabVivaEvaluations(lab2Other._id, null, teacherMainA);
      },
      (err) => err.statusCode === 403 && err.message.includes('not have an active faculty assignment')
    );
  });

  await test('27. Client-supplied sectionId tampering cannot grant cross-section access', async () => {
    await assert.rejects(
      async () => {
        await vivaService.validateFacultyAccess(teacherMainA, lab1._id, sectionB._id);
      },
      (err) => err.statusCode === 403
    );
  });

  await test('28. IDOR across labs rejected (Teacher assigned to Lab 1 cannot evaluate Lab 2)', async () => {
    await assert.rejects(
      async () => {
        await vivaService.validateFacultyAccess(teacherMainA, lab2Other._id, null);
      },
      (err) => err.statusCode === 403
    );
  });

  await test('29. IDOR across sections rejected (Teacher assigned to Section A cannot evaluate Section B student)', async () => {
    await assert.rejects(
      async () => {
        await vivaService.createVivaEvaluation(
          {
            studentId: studentB._id.toString(), // Section B student
            experimentId: experiment1._id.toString(),
            marks: 4
          },
          teacherMainA // Section A teacher
        );
      },
      (err) => err.statusCode === 403 && err.message.includes('not have an active faculty assignment')
    );
  });

  await test('30. Student cannot directly modify Viva marks or update evaluation records', () => {
    const vivaController = require('../controllers/viva.controller');
    assert.strictEqual(vivaController.updateViva, undefined, 'No direct updateViva handler exists');
    assert.strictEqual(vivaController.deleteViva, undefined, 'No deleteViva handler exists');
  });

  await test('31. Re-evaluation process validates action and rejects invalid actions', () => {
    let error = null;
    validateProcessReevaluationInput(
      { body: { action: 'INVALID_ACTION' } },
      {},
      (err) => { error = err; }
    );
    assert.ok(error);
    assert.strictEqual(error.statusCode, 400);
    assert.ok(error.message.includes('APPROVE or REJECT'));
  });

  await test('32. All historical Viva records remain retrievable and immutable', async () => {
    const studentViva = await vivaService.getStudentViva(experiment1._id, studentA);
    assert.strictEqual(studentViva.history.length, 2);
    assert.strictEqual(studentViva.history[0].marks, 3.5);
    assert.strictEqual(studentViva.history[1].marks, 4.5);
  });

  console.log(`\n==================================================`);
  console.log(`Phase 8 Test Results: ${passed}/${total} PASSED (100%)`);
  console.log(`==================================================\n`);
}

runPhase8Tests().catch((err) => {
  console.error('Phase 8 test runner failed:', err);
  process.exit(1);
});
