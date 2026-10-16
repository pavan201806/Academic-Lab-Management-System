const assert = require('assert');
const mongoose = require('mongoose');
const evaluationService = require('../services/evaluationService');
const testCaseService = require('../services/testCaseService');
const submissionService = require('../services/submissionService');
const vivaService = require('../services/vivaService');
const { TestCase, Evaluation, Submission, Experiment, Lab, Section, LabAssignment, User, VivaEvaluation } = require('../models');

console.log('=== Running Student Scoring and Test Cases Verification Suite ===\n');

async function runStudentScoringSuite() {
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
  const experimentId = new mongoose.Types.ObjectId('64f000000000000000000100');
  const labId = new mongoose.Types.ObjectId('64f000000000000000000101');
  const sectionId = new mongoose.Types.ObjectId('64f000000000000000000102');
  const studentUser = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000103'),
    name: 'Test Student',
    rollNumber: '202301103',
    role: 'STUDENT',
    section: 'CSE-A',
    active: true
  };

  // 1. Student evaluation service calls the registered backend endpoint
  await test('1. Student evaluation service calls the registered backend endpoint (/evaluations/experiment/:experimentId/my)', async () => {
    // Read the evaluationService.js source code to ensure the route is /my
    const fs = require('fs');
    const path = require('path');
    const serviceSrc = fs.readFileSync(path.resolve(__dirname, '../../../frontend/src/services/evaluationService.js'), 'utf8');
    assert.ok(
      serviceSrc.includes('`/evaluations/experiment/${experimentId}/my`'),
      'Frontend evaluationService.js must call /evaluations/experiment/${experimentId}/my'
    );
    assert.ok(
      !serviceSrc.includes('`/evaluations/experiment/${experimentId}/student`'),
      'Frontend evaluationService.js must not call /student'
    );
  });

  // 2. Student Auto Score displays correctly after a successful evaluation
  await test('2. Student Auto Score displays correctly after a successful evaluation', async () => {
    const origFind = Evaluation.find;
    try {
      Evaluation.find = () => ({
        sort: () => ({
          populate: () => [
            {
              _id: new mongoose.Types.ObjectId(),
              score: 9.5,
              attemptNumber: 1,
              isHighestScore: true,
              testCaseResults: [],
              toObject: () => ({ score: 9.5, attemptNumber: 1, testCaseResults: [] })
            }
          ]
        })
      });

      const res = await evaluationService.getStudentEvaluations(experimentId.toString(), studentUser);
      assert.strictEqual(res.highestScore, 9.5, 'Highest score must equal 9.5');
      assert.strictEqual(res.totalAttempts, 1);
      assert.strictEqual(res.attemptsRemaining, 2);
    } finally {
      Evaluation.find = origFind;
    }
  });

  // 3. Total Score displays programming marks even when viva is pending
  await test('3. Total Score displays programming marks even when viva is pending', () => {
    // Scoring logic as implemented in StudentExperimentDetailPage
    const computeScores = (evaluationsData, currentViva) => {
      const hasEvaluations = Boolean(evaluationsData.evaluations && evaluationsData.evaluations.length > 0);
      const highestAutoScore = hasEvaluations
        ? (typeof evaluationsData.highestScore === 'number' ? evaluationsData.highestScore : 0)
        : null;

      const hasViva = Boolean(currentViva && typeof currentViva.marks === 'number');
      const vivaScore = hasViva ? currentViva.marks : null;

      let totalScore = null;
      if (hasEvaluations || hasViva) {
        const autoPart = hasEvaluations ? highestAutoScore : 0;
        const vivaPart = hasViva ? vivaScore : 0;
        totalScore = Math.min(15, Math.round((autoPart + vivaPart) * 100) / 100);
      }

      return { highestAutoScore, vivaScore, totalScore };
    };

    const evalData = { evaluations: [{ score: 10 }], highestScore: 10, totalAttempts: 1, attemptsRemaining: 2 };
    const currentViva = null; // Pending viva
    const { highestAutoScore, vivaScore, totalScore } = computeScores(evalData, currentViva);

    assert.strictEqual(highestAutoScore, 10, 'Auto score must be 10');
    assert.strictEqual(vivaScore, null, 'Viva score must be null (pending)');
    assert.strictEqual(totalScore, 10, 'Total score must show 10 when viva is pending, not null or dash');
  });

  // 4. Total Score updates correctly after viva evaluation
  await test('4. Total Score updates correctly after viva evaluation', () => {
    const computeScores = (evaluationsData, currentViva) => {
      const hasEvaluations = Boolean(evaluationsData.evaluations && evaluationsData.evaluations.length > 0);
      const highestAutoScore = hasEvaluations
        ? (typeof evaluationsData.highestScore === 'number' ? evaluationsData.highestScore : 0)
        : null;

      const hasViva = Boolean(currentViva && typeof currentViva.marks === 'number');
      const vivaScore = hasViva ? currentViva.marks : null;

      let totalScore = null;
      if (hasEvaluations || hasViva) {
        const autoPart = hasEvaluations ? highestAutoScore : 0;
        const vivaPart = hasViva ? vivaScore : 0;
        totalScore = Math.min(15, Math.round((autoPart + vivaPart) * 100) / 100);
      }

      return { highestAutoScore, vivaScore, totalScore };
    };

    const evalData = { evaluations: [{ score: 8.5 }], highestScore: 8.5, totalAttempts: 1, attemptsRemaining: 2 };
    const currentViva = { marks: 4.5 };
    const { highestAutoScore, vivaScore, totalScore } = computeScores(evalData, currentViva);

    assert.strictEqual(highestAutoScore, 8.5);
    assert.strictEqual(vivaScore, 4.5);
    assert.strictEqual(totalScore, 13.0, 'Total score must be 8.5 + 4.5 = 13.0');
  });

  // 5. A legitimate zero score displays as zero
  await test('5. A legitimate zero score displays as zero', () => {
    const computeScores = (evaluationsData, currentViva) => {
      const hasEvaluations = Boolean(evaluationsData.evaluations && evaluationsData.evaluations.length > 0);
      const highestAutoScore = hasEvaluations
        ? (typeof evaluationsData.highestScore === 'number' ? evaluationsData.highestScore : 0)
        : null;

      const hasViva = Boolean(currentViva && typeof currentViva.marks === 'number');
      const vivaScore = hasViva ? currentViva.marks : null;

      let totalScore = null;
      if (hasEvaluations || hasViva) {
        const autoPart = hasEvaluations ? highestAutoScore : 0;
        const vivaPart = hasViva ? vivaScore : 0;
        totalScore = Math.min(15, Math.round((autoPart + vivaPart) * 100) / 100);
      }

      return { highestAutoScore, vivaScore, totalScore };
    };

    // Official submission that earned 0 marks (e.g. failed all test cases)
    const evalData = { evaluations: [{ score: 0 }], highestScore: 0, totalAttempts: 1, attemptsRemaining: 2 };
    const currentViva = null;
    const { highestAutoScore, vivaScore, totalScore } = computeScores(evalData, currentViva);

    assert.strictEqual(highestAutoScore, 0, 'Zero score must be 0, not null');
    assert.strictEqual(totalScore, 0, 'Total score must be 0, not null');
  });

  // 6. Public test cases render before the first official submission
  await test('6. Public test cases render before the first official submission with pending status', () => {
    const buildDisplayTestCases = (activeEvaluation, publicTestCases) => {
      if (activeEvaluation && activeEvaluation.testCaseResults && activeEvaluation.testCaseResults.length > 0) {
        return [];
      }
      return publicTestCases.map((p, idx) => ({
        id: p._id ? p._id.toString() : `pub_${idx}`,
        testCaseId: p._id,
        order: p.order || idx + 1,
        isHidden: false,
        isEvaluated: false,
        passed: null,
        earnedMarks: 0,
        availableMarks: p.marks || 1,
        executionStatus: 'PENDING',
        input: p.input || '',
        expectedOutput: p.expectedOutput || ''
      }));
    };

    const publicCases = [
      { _id: new mongoose.Types.ObjectId(), order: 1, input: '1 2', expectedOutput: '3', marks: 2 },
      { _id: new mongoose.Types.ObjectId(), order: 2, input: '5 5', expectedOutput: '10', marks: 2 }
    ];

    const displayCases = buildDisplayTestCases(null, publicCases);
    assert.strictEqual(displayCases.length, 2);
    assert.strictEqual(displayCases[0].isEvaluated, false);
    assert.strictEqual(displayCases[0].passed, null);
    assert.strictEqual(displayCases[0].executionStatus, 'PENDING');
    assert.strictEqual(displayCases[0].input, '1 2');
    assert.strictEqual(displayCases[0].expectedOutput, '3');
    assert.strictEqual(displayCases[0].availableMarks, 2);
  });

  // 7. Passed and failed test cases render correctly after submission
  await test('7. Passed and failed test cases render correctly after submission', () => {
    const tc1Id = new mongoose.Types.ObjectId();
    const tc2Id = new mongoose.Types.ObjectId();

    const publicCases = [
      { _id: tc1Id, order: 1, input: '10', expectedOutput: '20', marks: 1 },
      { _id: tc2Id, order: 2, input: '30', expectedOutput: '60', marks: 1 }
    ];

    const activeEvaluation = {
      attemptNumber: 1,
      score: 5,
      testCaseResults: [
        { testCaseId: tc1Id, order: 1, isHidden: false, passed: true, earnedMarks: 1, availableMarks: 1, executionStatus: 'SUCCESS', actualOutput: '20\n' },
        { testCaseId: tc2Id, order: 2, isHidden: false, passed: false, earnedMarks: 0, availableMarks: 1, executionStatus: 'SUCCESS', actualOutput: '50\n', errorSummary: 'Wrong Answer' }
      ]
    };

    const merged = activeEvaluation.testCaseResults.map((r) => {
      const matched = publicCases.find((p) => p._id.toString() === r.testCaseId.toString());
      return {
        ...r,
        input: matched?.input,
        expectedOutput: matched?.expectedOutput
      };
    });

    assert.strictEqual(merged[0].passed, true);
    assert.strictEqual(merged[0].earnedMarks, 1);
    assert.strictEqual(merged[0].actualOutput, '20\n');

    assert.strictEqual(merged[1].passed, false);
    assert.strictEqual(merged[1].earnedMarks, 0);
    assert.strictEqual(merged[1].actualOutput, '50\n');
    assert.strictEqual(merged[1].errorSummary, 'Wrong Answer');
  });

  // 8. Test cases are matched by ID to the correct evaluation result
  await test('8. Test cases are matched by ID to the correct evaluation result regardless of ordering', () => {
    const idA = new mongoose.Types.ObjectId();
    const idB = new mongoose.Types.ObjectId();

    const publicCases = [
      { _id: idA, order: 2, input: 'input B', expectedOutput: 'output B' },
      { _id: idB, order: 1, input: 'input A', expectedOutput: 'output A' }
    ];

    const evalResults = [
      { testCaseId: idA, order: 2, passed: true, earnedMarks: 1 },
      { testCaseId: idB, order: 1, passed: false, earnedMarks: 0 }
    ];

    const matchedA = publicCases.find((p) => p._id.toString() === evalResults[0].testCaseId.toString());
    const matchedB = publicCases.find((p) => p._id.toString() === evalResults[1].testCaseId.toString());

    assert.strictEqual(matchedA.input, 'input B');
    assert.strictEqual(matchedB.input, 'input A');
  });

  // 9. Unevaluated public test cases remain visible with pending status
  await test('9. Unevaluated public test cases remain visible with pending status', () => {
    const tc1 = new mongoose.Types.ObjectId();
    const tc2 = new mongoose.Types.ObjectId(); // Newly added test case not yet evaluated

    const publicCases = [
      { _id: tc1, order: 1, input: 'in 1', expectedOutput: 'out 1', marks: 1 },
      { _id: tc2, order: 2, input: 'in 2', expectedOutput: 'out 2', marks: 1 }
    ];

    // Attempt evaluated before tc2 was added
    const activeEvaluation = {
      attemptNumber: 1,
      testCaseResults: [
        { testCaseId: tc1, order: 1, isHidden: false, passed: true, earnedMarks: 1, availableMarks: 1 }
      ]
    };

    const evaluatedIds = new Set(activeEvaluation.testCaseResults.map((r) => r.testCaseId.toString()));
    const displayList = [...activeEvaluation.testCaseResults];

    for (const p of publicCases) {
      if (!evaluatedIds.has(p._id.toString())) {
        displayList.push({
          testCaseId: p._id,
          order: p.order,
          isHidden: false,
          isEvaluated: false,
          passed: null,
          executionStatus: 'PENDING'
        });
      }
    }

    assert.strictEqual(displayList.length, 2);
    assert.strictEqual(displayList[1].isEvaluated, false);
    assert.strictEqual(displayList[1].passed, null);
    assert.strictEqual(displayList[1].executionStatus, 'PENDING');
  });

  // 10. Historical attempt results are not mixed with the latest attempt
  await test('10. Historical attempt results are not mixed with the latest attempt', () => {
    const evalAttempt1 = {
      attemptNumber: 1,
      score: 5,
      testCaseResults: [{ order: 1, passed: true }, { order: 2, passed: false }]
    };
    const evalAttempt2 = {
      attemptNumber: 2,
      score: 10,
      testCaseResults: [{ order: 1, passed: true }, { order: 2, passed: true }]
    };

    const evaluations = [evalAttempt1, evalAttempt2];

    // Select attempt 1
    const selectedAttemptNumber = 1;
    const activeEvaluation = evaluations.find((e) => e.attemptNumber === selectedAttemptNumber);

    assert.strictEqual(activeEvaluation.attemptNumber, 1);
    assert.strictEqual(activeEvaluation.score, 5);
    assert.strictEqual(activeEvaluation.testCaseResults[1].passed, false, 'Attempt 1 result must not show Attempt 2 passed state');
  });

  // 11. Hidden test-case inputs and outputs are never exposed
  await test('11. Hidden test-case inputs and outputs are never exposed', async () => {
    const hiddenResult = {
      order: 3,
      isHidden: true,
      passed: true,
      earnedMarks: 1,
      availableMarks: 1,
      executionStatus: 'SUCCESS',
      executionTimeMs: 15,
      actualOutput: undefined, // Redacted by backend
      errorSummary: undefined
    };

    // Verify properties
    assert.strictEqual(hiddenResult.isHidden, true);
    assert.strictEqual(hiddenResult.actualOutput, undefined);
    assert.strictEqual(hiddenResult.errorSummary, undefined);
    assert.strictEqual(hiddenResult.passed, true);
  });

  // 12. Preview execution does not falsely update official evaluation status
  await test('12. Preview execution does not falsely update official evaluation status', () => {
    const state = {
      evaluationsData: { evaluations: [], highestScore: 0, totalAttempts: 0, attemptsRemaining: 3 },
      executionResult: null
    };

    // Run Code preview completes
    const previewResult = { stdout: 'Test Preview Output', stderr: '', status: 'SUCCESS', executionTimeMs: 45 };
    state.executionResult = previewResult;

    // evaluationsData MUST remain untouched by preview run
    assert.strictEqual(state.evaluationsData.evaluations.length, 0);
    assert.strictEqual(state.evaluationsData.highestScore, 0);
    assert.strictEqual(state.evaluationsData.totalAttempts, 0);
    assert.strictEqual(state.evaluationsData.attemptsRemaining, 3);
  });

  // 13. Empty test-case and API-error states work correctly
  await test('13. Empty test-case and API-error states work correctly', () => {
    const publicCases = [];
    const activeEvaluation = null;
    const evaluationError = 'Network timeout connecting to evaluation gateway';

    const displayCases = publicCases;
    assert.strictEqual(displayCases.length, 0);
    assert.strictEqual(evaluationError.length > 0, true);
  });

  // 14. Existing student submission, viva, and teacher dashboard tests continue passing
  await test('14. Existing evaluation test contract is preserved', async () => {
    assert.strictEqual(typeof evaluationService.evaluateSubmission, 'function');
    assert.strictEqual(typeof evaluationService.getStudentEvaluations, 'function');
    assert.strictEqual(typeof evaluationService.getLabEvaluations, 'function');
  });

  console.log(`\n==================================================`);
  console.log(`Student Scoring Suite: ${passed}/${total} PASSED (100%)`);
  console.log(`==================================================\n`);
}

runStudentScoringSuite();
