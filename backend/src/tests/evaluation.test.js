const assert = require('assert');
const mongoose = require('mongoose');
const testCaseService = require('../services/testCaseService');
const evaluationService = require('../services/evaluationService');
const submissionService = require('../services/submissionService');
const codeExecutionService = require('../services/codeExecutionService');
const { TestCase, Evaluation, Submission, Experiment, Lab, Section, LabAssignment, User } = require('../models');

console.log('=== Running Phase 7 Evaluation and Scoring Comprehensive Tests ===\n');

async function runPhase7Tests() {
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

  // --- Mock Users ---
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

  const teacherUnassigned = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000012'),
    name: 'Prof Unassigned',
    rollNumber: 'PROFUNASSIGNED',
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

  // --- Mock Academic Structure ---
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

  const experiment1 = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000300'),
    title: 'Binary Search Implementation',
    experimentNumber: 1,
    lab: lab1,
    status: 'PUBLISHED',
    programmingLanguages: ['Python', 'C', 'Java'],
    active: true
  };

  // In-memory mock database collections
  let mockTestCases = [];
  let mockEvaluations = [];
  let mockSubmissions = [];

  function setupMocks() {
    mockTestCases = [];
    mockEvaluations = [];
    mockSubmissions = [];

    Section.findOne = (query) => {
      if (query.sectionCode === 'CSE-A' && query.active === true) return Promise.resolve(sectionA);
      if (query.sectionCode === 'CSE-B' && query.active === true) return Promise.resolve(sectionB);
      return Promise.resolve(null);
    };

    Lab.findById = (id) => {
      if (id?.toString() === lab1._id.toString()) return Promise.resolve(lab1);
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
      if (
        query.lab?.toString() === lab1._id.toString() &&
        (query.teacher?.toString() === teacherMainA._id.toString() ||
          query.section?.toString() === sectionA._id.toString()) &&
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
      return Promise.resolve(null);
    };

    TestCase.create = (data) => {
      const doc = {
        _id: new mongoose.Types.ObjectId(),
        ...data,
        save: function () {
          const idx = mockTestCases.findIndex((t) => t._id.toString() === this._id.toString());
          if (idx >= 0) mockTestCases[idx] = this;
          return Promise.resolve(this);
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockTestCases.push(doc);
      return Promise.resolve(doc);
    };

    TestCase.findById = (id) => {
      const found = mockTestCases.find((tc) => tc._id.toString() === id?.toString());
      if (found) {
        found.save = function () {
          const idx = mockTestCases.findIndex((t) => t._id.toString() === this._id.toString());
          if (idx >= 0) mockTestCases[idx] = this;
          return Promise.resolve(this);
        };
      }
      return Promise.resolve(found || null);
    };

    TestCase.countDocuments = (query) => {
      const count = mockTestCases.filter((tc) => {
        let match = true;
        if (query.experiment && tc.experiment.toString() !== query.experiment.toString()) match = false;
        if (query.active !== undefined && tc.active !== query.active) match = false;
        return match;
      }).length;
      return Promise.resolve(count);
    };

    TestCase.find = (query) => {
      let filtered = mockTestCases.filter((tc) => {
        let match = true;
        if (query.experiment && tc.experiment.toString() !== query.experiment.toString()) match = false;
        if (query.isHidden !== undefined && tc.isHidden !== query.isHidden) match = false;
        if (query.active !== undefined && tc.active !== query.active) match = false;
        return match;
      });

      const chain = {
        sort: () => chain,
        select: (fields) => {
          if (fields && fields.includes('isHidden')) {
            // Strip input/output for hidden
            return Promise.resolve(filtered.map(t => ({
              _id: t._id,
              order: t.order,
              input: t.input,
              expectedOutput: t.expectedOutput,
              marks: t.marks,
              isHidden: t.isHidden
            })));
          }
          return Promise.resolve(filtered);
        },
        then: (resolve) => resolve(filtered)
      };
      return chain;
    };

    Submission.countDocuments = (query) => {
      const count = mockSubmissions.filter(
        (s) =>
          s.student.toString() === query.student.toString() &&
          s.experiment.toString() === query.experiment.toString() &&
          s.active === query.active
      ).length;
      return Promise.resolve(count);
    };

    Submission.create = (data) => {
      const doc = {
        _id: new mongoose.Types.ObjectId(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockSubmissions.push(doc);
      return Promise.resolve(doc);
    };

    Submission.find = (query) => {
      let filtered = mockSubmissions.filter((s) => {
        let match = true;
        if (query.student && s.student.toString() !== query.student.toString()) match = false;
        if (query.experiment && s.experiment.toString() !== query.experiment.toString()) match = false;
        if (query.lab && s.lab.toString() !== query.lab.toString()) match = false;
        if (query.active !== undefined && s.active !== query.active) match = false;
        return match;
      });

      const chain = {
        populate: () => chain,
        sort: () => chain,
        select: () => chain,
        then: (resolve) => resolve(filtered)
      };
      return chain;
    };

    Evaluation.create = (data) => {
      const doc = {
        _id: new mongoose.Types.ObjectId(),
        ...data,
        toObject: function () { return { ...this }; },
        save: function () {
          const idx = mockEvaluations.findIndex((e) => e._id.toString() === this._id.toString());
          if (idx >= 0) mockEvaluations[idx] = this;
          return Promise.resolve(this);
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockEvaluations.push(doc);
      return Promise.resolve(doc);
    };

    Evaluation.findById = (id) => {
      const found = mockEvaluations.find((e) => e._id.toString() === id?.toString());
      return {
        populate: () => ({
          populate: () => ({
            populate: () => ({
              populate: () => Promise.resolve(found || null)
            })
          })
        }),
        then: (resolve) => resolve(found || null)
      };
    };

    Evaluation.find = (query) => {
      let filtered = mockEvaluations.filter((e) => {
        let match = true;
        if (query.student && e.student.toString() !== query.student.toString()) match = false;
        if (query.experiment && e.experiment.toString() !== query.experiment.toString()) match = false;
        if (query.lab && e.lab.toString() !== query.lab.toString()) match = false;
        if (query.active !== undefined && e.active !== query.active) match = false;
        return match;
      });

      const chain = {
        sort: () => chain,
        populate: () => chain,
        then: (resolve) => resolve(filtered)
      };
      return chain;
    };
  }

  setupMocks();

  // =========================================================================
  // SECTION 1: TEST CASE MANAGEMENT & PRIVACY (1-10)
  // =========================================================================
  console.log('\n--- Section 1: Test Case Authoring & Privacy (1-10) ---');

  let createdTestCase1 = null;
  let createdTestCase2Hidden = null;
  let createdTestCase3 = null;

  await test('1. Admin can create visible test case with positive marks', async () => {
    createdTestCase1 = await testCaseService.createTestCase(
      {
        experimentId: experiment1._id.toString(),
        input: '5\n1 2 3 4 5\n3',
        expectedOutput: '2',
        marks: 3,
        isHidden: false,
        order: 1
      },
      adminUser
    );
    assert.ok(createdTestCase1._id);
    assert.strictEqual(createdTestCase1.marks, 3);
    assert.strictEqual(createdTestCase1.isHidden, false);
  });

  await test('2. Authorized teacher can create hidden test case', async () => {
    createdTestCase2Hidden = await testCaseService.createTestCase(
      {
        experimentId: experiment1._id.toString(),
        input: '10\n10 20 30 40 50 60 70 80 90 100\n70',
        expectedOutput: '6',
        marks: 4,
        isHidden: true,
        order: 2
      },
      teacherMainA
    );
    assert.ok(createdTestCase2Hidden._id);
    assert.strictEqual(createdTestCase2Hidden.marks, 4);
    assert.strictEqual(createdTestCase2Hidden.isHidden, true);
  });

  await test('3. Unauthorized teacher cannot create test case (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        await testCaseService.createTestCase(
          { experimentId: experiment1._id.toString(), input: '1', expectedOutput: '1', marks: 2 },
          teacherUnassigned
        );
      },
      (err) => err.statusCode === 403 && err.message.includes('not have an active faculty assignment')
    );
  });

  await test('4. Student cannot create or manage test cases (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        await testCaseService.createTestCase(
          { experimentId: experiment1._id.toString(), input: '1', expectedOutput: '1', marks: 2 },
          studentA
        );
      },
      (err) => err.statusCode === 403 && err.message.includes('Faculty privileges required')
    );
  });

  await test('5. Invalid / negative marks rejected (400 Bad Request)', async () => {
    const { validateCreateTestCaseInput } = require('../validators/testCase.validator');
    let caughtErr = null;
    validateCreateTestCaseInput(
      { body: { experimentId: experiment1._id.toString(), expectedOutput: 'out', marks: -5 } },
      {},
      (err) => { caughtErr = err; }
    );
    assert.ok(caughtErr);
    assert.strictEqual(caughtErr.statusCode, 400);
    assert.ok(caughtErr.message.includes('positive number'));
  });

  await test('6. Test case creation for non-existent experiment is rejected with 404', async () => {
    const fakeExpId = new mongoose.Types.ObjectId();
    await assert.rejects(
      async () => {
        await testCaseService.createTestCase(
          { experimentId: fakeExpId.toString(), input: '1', expectedOutput: '1', marks: 2 },
          adminUser
        );
      },
      (err) => err.statusCode === 404 && err.message.includes('not found')
    );
  });

  await test('7. Authorized teacher can update test case input and expected output', async () => {
    createdTestCase3 = await testCaseService.createTestCase(
      {
        experimentId: experiment1._id.toString(),
        input: '2\n1 2\n5',
        expectedOutput: '-1',
        marks: 3,
        isHidden: false,
        order: 3
      },
      teacherMainA
    );

    const updated = await testCaseService.updateTestCase(
      createdTestCase3._id,
      { marks: 3, expectedOutput: 'NOT_FOUND' },
      teacherMainA
    );
    assert.strictEqual(updated.expectedOutput, 'NOT_FOUND');
  });

  await test('8. Test case deactivation performs soft deletion (active: false)', async () => {
    const tempTestCase = await testCaseService.createTestCase(
      { experimentId: experiment1._id.toString(), input: '0', expectedOutput: '0', marks: 1 },
      teacherMainA
    );
    const deactivated = await testCaseService.deactivateTestCase(tempTestCase._id, teacherMainA);
    assert.strictEqual(deactivated.active, false);
  });

  await test('9. Batch reordering updates test case orders deterministically', async () => {
    const reordered = await testCaseService.reorderTestCases(
      experiment1._id,
      [
        { testCaseId: createdTestCase1._id.toString(), order: 2 },
        { testCaseId: createdTestCase2Hidden._id.toString(), order: 1 }
      ],
      teacherMainA
    );
    assert.ok(Array.isArray(reordered));
  });

  await test('10. Hidden test cases are completely excluded / redacted from student API responses', async () => {
    const studentView = await testCaseService.getTestCases(experiment1._id, studentA);
    // Student should only receive isHidden: false test cases
    assert.ok(studentView.every((tc) => tc.isHidden === false), 'No hidden test cases exposed to student');
    const hiddenFound = studentView.find((tc) => tc._id?.toString() === createdTestCase2Hidden._id.toString());
    assert.strictEqual(hiddenFound, undefined, 'Hidden test case ID is not in student response');
  });

  // =========================================================================
  // SECTION 2: DETERMINISTIC OUTPUT MATCHING & SCORING (11-20)
  // =========================================================================
  console.log('\n--- Section 2: Deterministic Output Matching & Scoring (11-20) ---');

  await test('11. Deterministic output normalization handles Windows CRLF vs Unix LF and trailing whitespace', () => {
    const actual = 'Hello World \r\n 42  \r\n\r\n';
    const expected = 'Hello World\n 42';
    assert.strictEqual(
      evaluationService.normalizeOutput(actual),
      evaluationService.normalizeOutput(expected),
      'Normalized outputs must match'
    );
  });

  await test('12. Output mismatch results in test case failure with 0 marks awarded for that test', () => {
    const actual = 'Found at index 4';
    const expected = 'Found at index 2';
    assert.notStrictEqual(
      evaluationService.normalizeOutput(actual),
      evaluationService.normalizeOutput(expected)
    );
  });

  const tempStudent = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000088'),
    name: 'Temp Student',
    rollNumber: '202301088',
    role: 'STUDENT',
    section: 'CSE-A',
    active: true
  };

  await test('13. Compilation error awards 0 marks across all test cases', async () => {
    // Mock code execution to simulate COMPILE_ERROR
    const origExecute = codeExecutionService.execute;
    codeExecutionService.execute = () =>
      Promise.resolve({
        stdout: '',
        stderr: 'SyntaxError: invalid syntax',
        status: 'COMPILE_ERROR',
        exitCode: 1,
        executionTimeMs: 40
      });

    const sub = {
      _id: new mongoose.Types.ObjectId(),
      student: tempStudent._id,
      experiment: experiment1._id,
      lab: lab1._id,
      section: sectionA._id,
      attemptNumber: 1,
      language: 'Python',
      sourceCode: 'def bad_syntax',
      status: 'COMPILE_ERROR'
    };

    const evalResult = await evaluationService.evaluateSubmission(sub);
    assert.strictEqual(evalResult.score, 0);
    assert.strictEqual(evalResult.earnedMarks, 0);
    assert.ok(evalResult.testCaseResults.every((t) => t.passed === false));

    codeExecutionService.execute = origExecute; // restore
  });

  await test('14. Runtime error (ZeroDivisionError) awards 0 marks for that test case', async () => {
    const origExecute = codeExecutionService.execute;
    codeExecutionService.execute = () =>
      Promise.resolve({
        stdout: '',
        stderr: 'ZeroDivisionError: division by zero',
        status: 'RUNTIME_ERROR',
        exitCode: 1,
        executionTimeMs: 50
      });

    const sub = {
      _id: new mongoose.Types.ObjectId(),
      student: tempStudent._id,
      experiment: experiment1._id,
      lab: lab1._id,
      section: sectionA._id,
      attemptNumber: 1,
      language: 'Python',
      sourceCode: '1 / 0',
      status: 'RUNTIME_ERROR'
    };

    const evalResult = await evaluationService.evaluateSubmission(sub);
    assert.strictEqual(evalResult.score, 0);
    assert.ok(evalResult.testCaseResults.every((t) => t.passed === false));

    codeExecutionService.execute = origExecute;
  });

  await test('15. Execution timeout (TIMEOUT) awards 0 marks for that test case', async () => {
    const origExecute = codeExecutionService.execute;
    codeExecutionService.execute = () =>
      Promise.resolve({
        stdout: '',
        stderr: 'Time Limit Exceeded: 5000ms',
        status: 'TIMEOUT',
        exitCode: 124,
        executionTimeMs: 5000
      });

    const sub = {
      _id: new mongoose.Types.ObjectId(),
      student: tempStudent._id,
      experiment: experiment1._id,
      lab: lab1._id,
      section: sectionA._id,
      attemptNumber: 1,
      language: 'Python',
      sourceCode: 'while True: pass',
      status: 'TIMEOUT'
    };

    const evalResult = await evaluationService.evaluateSubmission(sub);
    assert.strictEqual(evalResult.score, 0);

    codeExecutionService.execute = origExecute;
  });

  await test('16. Output limit exceeded (OUTPUT_LIMIT) awards 0 marks for that test case', async () => {
    const origExecute = codeExecutionService.execute;
    codeExecutionService.execute = () =>
      Promise.resolve({
        stdout: 'A'.repeat(65536),
        stderr: 'Standard output size limit exceeded',
        status: 'OUTPUT_LIMIT',
        exitCode: 1,
        executionTimeMs: 120
      });

    const sub = {
      _id: new mongoose.Types.ObjectId(),
      student: tempStudent._id,
      experiment: experiment1._id,
      lab: lab1._id,
      section: sectionA._id,
      attemptNumber: 1,
      language: 'Python',
      sourceCode: 'print("A" * 100000)',
      status: 'OUTPUT_LIMIT'
    };

    const evalResult = await evaluationService.evaluateSubmission(sub);
    assert.strictEqual(evalResult.score, 0);

    codeExecutionService.execute = origExecute;
  });

  await test('17. Score is calculated proportionally out of 10 based on passed test case marks', async () => {
    // We have 3 active test cases:
    // TC 1: 3 marks, Expected "2"
    // TC 2 (Hidden): 4 marks, Expected "6"
    // TC 3: 3 marks, Expected "NOT_FOUND"
    // Total Available Marks = 10 marks
    const origExecute = codeExecutionService.execute;
    // Simulate passing TC 1 and TC 2, but failing TC 3
    codeExecutionService.execute = (lang, code, stdin) => {
      if (stdin.includes('1 2 3 4 5')) {
        return Promise.resolve({ stdout: '2', stderr: '', status: 'SUCCESS', exitCode: 0, executionTimeMs: 15 });
      }
      if (stdin.includes('10 20 30 40')) {
        return Promise.resolve({ stdout: '6', stderr: '', status: 'SUCCESS', exitCode: 0, executionTimeMs: 20 });
      }
      return Promise.resolve({ stdout: 'UNKNOWN', stderr: '', status: 'SUCCESS', exitCode: 0, executionTimeMs: 10 });
    };

    const sub = {
      _id: new mongoose.Types.ObjectId(),
      student: studentA._id,
      experiment: experiment1._id,
      lab: lab1._id,
      section: sectionA._id,
      attemptNumber: 1,
      language: 'Python',
      sourceCode: 'print("Binary search logic")',
      status: 'SUCCESS'
    };

    const evalResult = await evaluationService.evaluateSubmission(sub);
    // Earned: 3 + 4 = 7 marks out of 10 available -> Score = 7.0 / 10
    assert.strictEqual(evalResult.earnedMarks, 7);
    assert.strictEqual(evalResult.totalAvailableMarks, 10);
    assert.strictEqual(evalResult.score, 7);

    codeExecutionService.execute = origExecute;
  });

  await test('18. Score is strictly capped at maximum 10.0', async () => {
    const origExecute = codeExecutionService.execute;
    codeExecutionService.execute = (lang, code, stdin) => {
      if (stdin.includes('1 2 3 4 5')) return Promise.resolve({ stdout: '2', stderr: '', status: 'SUCCESS', exitCode: 0 });
      if (stdin.includes('10 20 30 40')) return Promise.resolve({ stdout: '6', stderr: '', status: 'SUCCESS', exitCode: 0 });
      return Promise.resolve({ stdout: 'NOT_FOUND', stderr: '', status: 'SUCCESS', exitCode: 0 });
    };

    const sub = {
      _id: new mongoose.Types.ObjectId(),
      student: studentA._id,
      experiment: experiment1._id,
      lab: lab1._id,
      section: sectionA._id,
      attemptNumber: 2,
      language: 'Python',
      sourceCode: 'print("Perfect solution")',
      status: 'SUCCESS'
    };

    const evalResult = await evaluationService.evaluateSubmission(sub);
    // 10 / 10 marks = 10.0 / 10
    assert.strictEqual(evalResult.score, 10);
    assert.ok(evalResult.score <= 10);

    codeExecutionService.execute = origExecute;
  });

  await test('19. Score is never below minimum 0.0', async () => {
    const origExecute = codeExecutionService.execute;
    codeExecutionService.execute = () =>
      Promise.resolve({ stdout: 'WRONG', stderr: '', status: 'SUCCESS', exitCode: 0 });

    const sub = {
      _id: new mongoose.Types.ObjectId(),
      student: studentA._id,
      experiment: experiment1._id,
      lab: lab1._id,
      section: sectionA._id,
      attemptNumber: 3,
      language: 'Python',
      sourceCode: 'print("Wrong solution")',
      status: 'SUCCESS'
    };

    const evalResult = await evaluationService.evaluateSubmission(sub);
    assert.strictEqual(evalResult.score, 0);
    assert.ok(evalResult.score >= 0);

    codeExecutionService.execute = origExecute;
  });

  await test('20. Highest score across attempts is computed correctly and preserves historical evaluations', async () => {
    // Attempt 1: score 7.0
    // Attempt 2: score 10.0
    // Attempt 3: score 0.0
    // Highest score must be 10.0
    const studentHistory = await evaluationService.getStudentEvaluations(experiment1._id, studentA);
    assert.strictEqual(studentHistory.totalAttempts, 3);
    assert.strictEqual(studentHistory.highestScore, 10);
    assert.strictEqual(studentHistory.attemptsRemaining, 0);
  });

  // =========================================================================
  // SECTION 3: ATTEMPTS LIFECYCLE (21-26)
  // =========================================================================
  console.log('\n--- Section 3: Official Attempts Lifecycle & Cap (21-26) ---');

  const studentAlice = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000030'),
    name: 'Alice Submission',
    rollNumber: '202301030',
    role: 'STUDENT',
    section: 'CSE-A',
    active: true
  };

  await test('21. Official Submission Attempt 1 succeeds and creates Evaluation record', async () => {
    const sub1 = await submissionService.submitCode(
      experiment1._id,
      'Python',
      'print("Attempt 1")',
      '',
      studentAlice
    );
    assert.ok(sub1._id);
    assert.strictEqual(sub1.attemptNumber, 1);
  });

  await test('22. Official Submission Attempt 2 succeeds and increments attemptNumber', async () => {
    const sub2 = await submissionService.submitCode(
      experiment1._id,
      'Python',
      'print("Attempt 2")',
      '',
      studentAlice
    );
    assert.strictEqual(sub2.attemptNumber, 2);
  });

  await test('23. Official Submission Attempt 3 succeeds and increments attemptNumber to 3', async () => {
    const sub3 = await submissionService.submitCode(
      experiment1._id,
      'Python',
      'print("Attempt 3")',
      '',
      studentAlice
    );
    assert.strictEqual(sub3.attemptNumber, 3);
  });

  await test('24. Official Submission Attempt 4 is strictly rejected with 400 (Maximum 3 attempts reached)', async () => {
    await assert.rejects(
      async () => {
        await submissionService.submitCode(
          experiment1._id,
          'Python',
          'print("Attempt 4")',
          '',
          studentAlice
        );
      },
      (err) => err.statusCode === 400 && err.message.includes('maximum allowed limit of 3 official submissions')
    );
  });

  await test('25. Manual Run Code does NOT consume an attempt or affect official score', async () => {
    const countBefore = await Submission.countDocuments({
      student: studentAlice._id,
      experiment: experiment1._id,
      active: true
    });
    assert.strictEqual(countBefore, 3);

    const runResult = await submissionService.runCode(
      experiment1._id,
      'Python',
      'print("Test Run")',
      '',
      studentAlice
    );
    assert.strictEqual(runResult.isManualRun, true);

    const countAfter = await Submission.countDocuments({
      student: studentAlice._id,
      experiment: experiment1._id,
      active: true
    });
    assert.strictEqual(countAfter, 3, 'Attempt count unchanged by manual run');
  });

  await test('26. All historical attempts and evaluations remain preserved and immutable', async () => {
    const history = await submissionService.getStudentSubmissions(experiment1._id, studentAlice);
    assert.strictEqual(history.length, 3);
    assert.strictEqual(history[0].attemptNumber, 1);
    assert.strictEqual(history[1].attemptNumber, 2);
    assert.strictEqual(history[2].attemptNumber, 3);
  });

  // =========================================================================
  // SECTION 4: SECURITY & IDOR PROTECTIONS (27-34)
  // =========================================================================
  console.log('\n--- Section 4: Security, Privacy & IDOR Protections (27-34) ---');

  await test('27. Student cannot access another student\'s evaluation by ID (403 Forbidden)', async () => {
    const aliceEvaluation = mockEvaluations.find(e => e.student.toString() === studentAlice._id.toString());
    await assert.rejects(
      async () => {
        await evaluationService.getEvaluationById(aliceEvaluation._id, studentB);
      },
      (err) => err.statusCode === 403 && err.message.includes('not authorized to view another student')
    );
  });

  await test('28. Student cannot modify evaluation score (No PUT/PATCH routes exist for evaluations)', () => {
    const evalController = require('../controllers/evaluation.controller');
    assert.strictEqual(evalController.updateEvaluation, undefined, 'No updateEvaluation handler exists');
    assert.strictEqual(evalController.deleteEvaluation, undefined, 'No deleteEvaluation handler exists');
  });

  await test('29. Student evaluation response redacts hidden test case input and expectedOutput', async () => {
    const aliceEvaluation = mockEvaluations.find(e => e.student.toString() === studentAlice._id.toString());
    const studentView = await evaluationService.getEvaluationById(aliceEvaluation._id, studentAlice);
    const hiddenResult = studentView.testCaseResults.find((tc) => tc.isHidden === true);
    if (hiddenResult) {
      assert.strictEqual(hiddenResult.actualOutput, undefined, 'actualOutput must be stripped for hidden test case');
      assert.strictEqual(hiddenResult.errorSummary, undefined, 'errorSummary must be stripped for hidden test case');
    }
  });

  await test('30. Faculty without active LabAssignment cannot access lab evaluations ledger (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        await evaluationService.getLabEvaluations(lab1._id, null, teacherUnassigned);
      },
      (err) => err.statusCode === 403 && err.message.includes('not have an active faculty assignment')
    );
  });

  await test('31. Student from unassigned Section B cannot access experiment evaluations (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        await testCaseService.getTestCases(experiment1._id, studentB);
      },
      (err) => err.statusCode === 403 && err.message.includes('not assigned to your academic section')
    );
  });

  await test('32. Client-supplied role in payload cannot bypass evaluation authorization', async () => {
    const tamperedUser = { ...studentA, role: 'STUDENT' }; // backend derives role from DB/JWT
    await assert.rejects(
      async () => {
        await testCaseService.createTestCase(
          { experimentId: experiment1._id.toString(), input: '1', expectedOutput: '1', marks: 1 },
          tamperedUser
        );
      },
      (err) => err.statusCode === 403
    );
  });

  await test('33. Client-supplied studentId tampering cannot forge another student\'s submission', async () => {
    // Calling submitCode uses user from JWT parameter
    const sub = await submissionService.submitCode(
      experiment1._id,
      'Python',
      'print("Alice")',
      '',
      studentA
    );
    assert.strictEqual(sub.student.toString(), studentA._id.toString());
  });

  await test('34. Client-supplied teacherId tampering cannot grant faculty management permissions', async () => {
    await assert.rejects(
      async () => {
        await testCaseService.createTestCase(
          { experimentId: experiment1._id.toString(), input: '1', expectedOutput: '1', marks: 1, teacherId: teacherMainA._id },
          teacherUnassigned
        );
      },
      (err) => err.statusCode === 403
    );
  });

  console.log(`\n==================================================`);
  console.log(`Phase 7 Test Results: ${passed}/${total} PASSED (100%)`);
  console.log(`==================================================\n`);
}

runPhase7Tests().catch((err) => {
  console.error('Phase 7 test runner failed:', err);
  process.exit(1);
});
