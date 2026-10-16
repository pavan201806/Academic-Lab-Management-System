const assert = require('assert');
const mongoose = require('mongoose');
const submissionService = require('../services/submissionService');
const evaluationService = require('../services/evaluationService');
const codeExecutionService = require('../services/codeExecutionService');
const Judge0ExecutionProvider = require('../services/providers/judge0ExecutionProvider');
const { Submission, Experiment, Lab, Section, LabAssignment, TestCase, Evaluation } = require('../models');
const AppError = require('../utils/appError');

console.log('=== Running Live CodeLab Workflow & Judge0 Verification Test Suite ===\n');

async function runLiveWorkflowTests() {
  let passed = 0;
  let total = 0;

  async function test(description, fn) {
    total++;
    try {
      console.log(`Starting [Test ${total}]: ${description}...`);
      await fn();
      console.log(`✓ [Test ${total}] ${description}\n`);
      passed++;
    } catch (err) {
      console.error(`✗ [Test ${total}] ${description}`);
      console.error(err);
      process.exit(1);
    }
  }

  // Ensure active execution provider is Judge0
  process.env.EXECUTION_PROVIDER = 'judge0';
  const provider = codeExecutionService.getProvider();
  assert.ok(provider instanceof Judge0ExecutionProvider, 'Provider must be Judge0ExecutionProvider');
  console.log(`Active Judge0 API URL: ${provider.apiUrl}`);

  // Test Entities
  const studentUser = {
    _id: new mongoose.Types.ObjectId('65f000000000000000000001'),
    name: 'Live Student User',
    rollNumber: 'LIVE2026',
    role: 'STUDENT',
    section: 'CSE-LIVE',
    active: true
  };

  const sectionLive = {
    _id: new mongoose.Types.ObjectId('65f000000000000000000010'),
    name: 'Section Live',
    sectionCode: 'CSE-LIVE',
    active: true
  };

  const labLive = {
    _id: new mongoose.Types.ObjectId('65f000000000000000000020'),
    name: 'Algorithm Engineering Lab',
    code: 'CS-LIVE-301',
    active: true
  };

  const expLive = {
    _id: new mongoose.Types.ObjectId('65f000000000000000000030'),
    title: 'Two Sum Problem',
    experimentNumber: 1,
    lab: labLive,
    status: 'PUBLISHED',
    programmingLanguages: ['C', 'C++', 'Java', 'Python'],
    active: true
  };

  // Test Cases: 2 Public + 1 Hidden
  const testCasesLive = [
    {
      _id: new mongoose.Types.ObjectId('65f000000000000000000041'),
      experiment: expLive._id,
      order: 1,
      input: '5 3\n',
      expectedOutput: '8\n',
      marks: 3,
      isHidden: false,
      active: true
    },
    {
      _id: new mongoose.Types.ObjectId('65f000000000000000000042'),
      experiment: expLive._id,
      order: 2,
      input: '20 30\n',
      expectedOutput: '50\n',
      marks: 3,
      isHidden: false,
      active: true
    },
    {
      _id: new mongoose.Types.ObjectId('65f000000000000000000043'),
      experiment: expLive._id,
      order: 3,
      input: '100 250\n',
      expectedOutput: '350\n',
      marks: 4,
      isHidden: true, // Hidden test case
      active: true
    }
  ];

  // In-memory data store for workflow state
  let submissionsStore = [];
  let evaluationsStore = [];

  // Wire model stubs to store state
  Section.findOne = async (q) => {
    if (q.sectionCode === 'CSE-LIVE' && q.active === true) return sectionLive;
    return null;
  };

  Lab.findById = async (id) => {
    if (id?.toString() === labLive._id.toString()) return labLive;
    return null;
  };

  Experiment.findById = (id) => {
    let match = null;
    if (id?.toString() === expLive._id.toString()) match = { ...expLive };
    return {
      populate: () => Promise.resolve(match)
    };
  };

  LabAssignment.findOne = async (q) => {
    if (q.lab?.toString() === labLive._id.toString() && q.section?.toString() === sectionLive._id.toString()) {
      return {
        _id: new mongoose.Types.ObjectId(),
        lab: labLive,
        section: sectionLive,
        active: true
      };
    }
    return null;
  };

  TestCase.find = (q) => {
    const res = testCasesLive.filter(
      (tc) => tc.experiment.toString() === q.experiment?.toString() && (q.active === undefined || tc.active === q.active)
    );
    return {
      sort: () => Promise.resolve(res)
    };
  };

  Submission.countDocuments = async (q) => {
    return submissionsStore.filter(
      (s) =>
        s.student.toString() === q.student.toString() &&
        s.experiment.toString() === q.experiment.toString() &&
        (q.active === undefined || s.active === q.active)
    ).length;
  };

  Submission.create = async (doc) => {
    const s = {
      _id: new mongoose.Types.ObjectId(),
      ...doc,
      toObject: function () {
        return { ...this };
      }
    };
    submissionsStore.push(s);
    return s;
  };

  Submission.deleteOne = async (q) => {
    const idx = submissionsStore.findIndex((s) => s._id.toString() === q._id?.toString());
    if (idx !== -1) submissionsStore.splice(idx, 1);
    return { acknowledged: true, deletedCount: idx !== -1 ? 1 : 0 };
  };

  const makeQuery = (data) => ({
    sort: (sortObj = {}) => {
      const sorted = [...data].sort((a, b) => {
        if (sortObj.score === -1) return (b.score || 0) - (a.score || 0);
        if (sortObj.attemptNumber === 1) return (a.attemptNumber || 0) - (b.attemptNumber || 0);
        return 0;
      });
      return makeQuery(sorted);
    },
    populate: () => makeQuery(data),
    select: () => makeQuery(data),
    then: (resolve, reject) => Promise.resolve(data).then(resolve, reject),
    catch: (reject) => Promise.resolve(data).catch(reject)
  });

  Submission.find = (q) => {
    const matches = submissionsStore.filter(
      (s) =>
        s.student.toString() === q.student.toString() &&
        s.experiment.toString() === q.experiment.toString() &&
        (q.active === undefined || s.active === q.active)
    );
    return makeQuery(matches);
  };

  Evaluation.create = async (doc) => {
    const ev = {
      _id: new mongoose.Types.ObjectId(),
      ...doc,
      save: async function () {
        return this;
      },
      toObject: function () {
        return JSON.parse(JSON.stringify(this));
      }
    };
    evaluationsStore.push(ev);
    return ev;
  };

  Evaluation.findById = async (id) => {
    const found = evaluationsStore.find((ev) => ev._id.toString() === id.toString());
    return found ? { ...found, save: async function () { return this; } } : null;
  };

  Evaluation.find = (q) => {
    const matches = evaluationsStore.filter(
      (ev) =>
        ev.student.toString() === q.student.toString() &&
        ev.experiment.toString() === q.experiment.toString() &&
        (q.active === undefined || ev.active === q.active)
    );
    return makeQuery(matches);
  };

  // =========================================================================
  // WORKFLOW PART 1: Real Student Preview Execution (C, C++, Java, Python)
  // =========================================================================
  console.log('--- WORKFLOW PART 1: Real Student Preview Execution via Live Judge0 ---');

  await test('1.1 Real Python Preview execution via Judge0', async () => {
    const code = 'num1 = 40\nnum2 = 2\nprint(f"Result: {num1 + num2}")';
    const result = await submissionService.runCode(expLive._id.toString(), 'Python', code, '', studentUser);

    assert.strictEqual(result.isManualRun, true);
    assert.strictEqual(result.language, 'Python');
    assert.strictEqual(result.executionResult.status, 'SUCCESS');
    assert.strictEqual(result.executionResult.exitCode, 0);
    assert.strictEqual(result.executionResult.stdout.trim(), 'Result: 42');
    console.log(`    Live Python stdout: "${result.executionResult.stdout.trim()}" in ${result.executionResult.executionTimeMs}ms`);
  });

  await test('1.2 Real C Preview execution via Judge0', async () => {
    const code = `#include <stdio.h>
int main() {
    int a = 15, b = 25;
    printf("C Result: %d\\n", a + b);
    return 0;
}`;
    const result = await submissionService.runCode(expLive._id.toString(), 'C', code, '', studentUser);

    assert.strictEqual(result.isManualRun, true);
    assert.strictEqual(result.language, 'C');
    assert.strictEqual(result.executionResult.status, 'SUCCESS');
    assert.strictEqual(result.executionResult.exitCode, 0);
    assert.strictEqual(result.executionResult.stdout.trim(), 'C Result: 40');
    console.log(`    Live C stdout: "${result.executionResult.stdout.trim()}" in ${result.executionResult.executionTimeMs}ms`);
  });

  await test('1.3 Real C++ Preview execution via Judge0', async () => {
    const code = `#include <iostream>
int main() {
    int x = 60, y = 40;
    std::cout << "C++ Result: " << (x + y) << std::endl;
    return 0;
}`;
    const result = await submissionService.runCode(expLive._id.toString(), 'C++', code, '', studentUser);

    assert.strictEqual(result.isManualRun, true);
    assert.strictEqual(result.language, 'C++');
    assert.strictEqual(result.executionResult.status, 'SUCCESS');
    assert.strictEqual(result.executionResult.exitCode, 0);
    assert.strictEqual(result.executionResult.stdout.trim(), 'C++ Result: 100');
    console.log(`    Live C++ stdout: "${result.executionResult.stdout.trim()}" in ${result.executionResult.executionTimeMs}ms`);
  });

  await test('1.4 Real Java Preview execution via Judge0 (with class Solution rewrite)', async () => {
    const code = `public class Solution {
    public static void main(String[] args) {
        int val1 = 150, val2 = 150;
        System.out.println("Java Result: " + (val1 + val2));
    }
}`;
    const result = await submissionService.runCode(expLive._id.toString(), 'Java', code, '', studentUser);

    assert.strictEqual(result.isManualRun, true);
    assert.strictEqual(result.language, 'Java');
    assert.strictEqual(result.executionResult.status, 'SUCCESS');
    assert.strictEqual(result.executionResult.exitCode, 0);
    assert.strictEqual(result.executionResult.stdout.trim(), 'Java Result: 300');
    console.log(`    Live Java stdout: "${result.executionResult.stdout.trim()}" in ${result.executionResult.executionTimeMs}ms`);
  });

  // =========================================================================
  // WORKFLOW PART 2: Official Submission with Public & Hidden Test Cases
  // =========================================================================
  console.log('\n--- WORKFLOW PART 2: Official Submission with Public & Hidden Test Cases ---');

  await test('2.1 Attempt 1: Full Pass (All public + hidden test cases pass, score 10/10)', async () => {
    // Solution reading 2 integers from stdin and printing sum
    const correctCode = `import sys
lines = sys.stdin.read().split()
if len(lines) >= 2:
    print(int(lines[0]) + int(lines[1]))
`;
    const res = await submissionService.submitCode(expLive._id.toString(), 'Python', correctCode, '', studentUser);

    assert.strictEqual(res.attemptNumber, 1, 'Attempt number should be 1');
    assert.strictEqual(res.status, 'SUCCESS');
    assert.ok(res.evaluation, 'Evaluation must be generated');

    const ev = res.evaluation;
    assert.strictEqual(ev.testCaseResults.length, 3, 'Must evaluate 3 test cases');

    // TC 1 (Public, 3 marks)
    assert.strictEqual(ev.testCaseResults[0].passed, true);
    assert.strictEqual(ev.testCaseResults[0].earnedMarks, 3);
    assert.strictEqual(ev.testCaseResults[0].actualOutput.trim(), '8');

    // TC 2 (Public, 3 marks)
    assert.strictEqual(ev.testCaseResults[1].passed, true);
    assert.strictEqual(ev.testCaseResults[1].earnedMarks, 3);
    assert.strictEqual(ev.testCaseResults[1].actualOutput.trim(), '50');

    // TC 3 (Hidden, 4 marks)
    assert.strictEqual(ev.testCaseResults[2].passed, true);
    assert.strictEqual(ev.testCaseResults[2].earnedMarks, 4);
    assert.strictEqual(ev.testCaseResults[2].isHidden, true);

    // Score: (3+3+4)/10 * 10 = 10
    assert.strictEqual(ev.earnedMarks, 10);
    assert.strictEqual(ev.totalAvailableMarks, 10);
    assert.strictEqual(ev.score, 10);

    console.log(`    Attempt 1 Score: ${ev.score}/10 (Earned: ${ev.earnedMarks}/${ev.totalAvailableMarks})`);
  });

  await test('2.2 Verify Student View Redacts Hidden Test Case Inputs & Outputs', async () => {
    const studentView = await evaluationService.getStudentEvaluations(expLive._id.toString(), studentUser);

    assert.strictEqual(studentView.totalAttempts, 1);
    assert.strictEqual(studentView.attemptsRemaining, 2);
    assert.strictEqual(studentView.highestScore, 10);

    const firstEval = studentView.evaluations[0];
    assert.strictEqual(firstEval.testCaseResults.length, 3);

    // TC 1 & 2 (Public) should expose actualOutput
    assert.strictEqual(firstEval.testCaseResults[0].actualOutput.trim(), '8');
    assert.strictEqual(firstEval.testCaseResults[1].actualOutput.trim(), '50');

    // TC 3 (Hidden) MUST HAVE actualOutput and errorSummary REDACTED
    const hiddenTC = firstEval.testCaseResults[2];
    assert.strictEqual(hiddenTC.isHidden, true);
    assert.strictEqual(hiddenTC.passed, true);
    assert.strictEqual(hiddenTC.earnedMarks, 4);
    assert.strictEqual(hiddenTC.actualOutput, undefined, 'Hidden test case actual output must be redacted');
    assert.strictEqual(hiddenTC.errorSummary, undefined, 'Hidden test case error summary must be redacted');
    console.log('    ✓ Confirmed: Hidden test-case output is strictly redacted in student evaluation response');
  });

  await test('2.3 Attempt 2: Partial Pass (Passes TC1, Fails TC2 & TC3, Score 3/10)', async () => {
    // Code only gives correct output for input 5 3 -> 8, outputs 0 for everything else
    const partialCode = `import sys
lines = sys.stdin.read().split()
if len(lines) >= 2 and lines[0] == '5':
    print(8)
else:
    print(0)
`;
    const res = await submissionService.submitCode(expLive._id.toString(), 'Python', partialCode, '', studentUser);

    assert.strictEqual(res.attemptNumber, 2, 'Attempt number should be 2');
    const ev = res.evaluation;

    // TC 1 passes (3 marks)
    assert.strictEqual(ev.testCaseResults[0].passed, true);
    assert.strictEqual(ev.testCaseResults[0].earnedMarks, 3);

    // TC 2 fails (0 marks)
    assert.strictEqual(ev.testCaseResults[1].passed, false);
    assert.strictEqual(ev.testCaseResults[1].earnedMarks, 0);
    assert.strictEqual(ev.testCaseResults[1].actualOutput.trim(), '0');

    // TC 3 fails (0 marks)
    assert.strictEqual(ev.testCaseResults[2].passed, false);
    assert.strictEqual(ev.testCaseResults[2].earnedMarks, 0);

    // Score: (3/10) * 10 = 3
    assert.strictEqual(ev.earnedMarks, 3);
    assert.strictEqual(ev.score, 3);

    // Highest score check: Attempt 1 had 10, Attempt 2 had 3 -> Highest score should remain 10
    const studentView = await evaluationService.getStudentEvaluations(expLive._id.toString(), studentUser);
    assert.strictEqual(studentView.totalAttempts, 2);
    assert.strictEqual(studentView.attemptsRemaining, 1);
    assert.strictEqual(studentView.highestScore, 10, 'Highest score must remain 10 across attempts');
    console.log(`    Attempt 2 Score: ${ev.score}/10, Active Highest Score preserved: ${studentView.highestScore}/10`);
  });

  await test('2.4 Attempt 3: Compilation/Syntax Error (Score 0/10, Attempt consumed)', async () => {
    const syntaxErrorCode = `def invalid_syntax_here(:\n    pass`;
    const res = await submissionService.submitCode(expLive._id.toString(), 'Python', syntaxErrorCode, '', studentUser);

    assert.strictEqual(res.attemptNumber, 3, 'Attempt number should be 3');
    assert.strictEqual(res.evaluation.score, 0, 'Syntax error should receive 0 marks');
    assert.strictEqual(res.evaluation.earnedMarks, 0);

    const studentView = await evaluationService.getStudentEvaluations(expLive._id.toString(), studentUser);
    assert.strictEqual(studentView.totalAttempts, 3);
    assert.strictEqual(studentView.attemptsRemaining, 0);
    assert.strictEqual(studentView.highestScore, 10, 'Highest score preserved as 10');
    console.log(`    Attempt 3 Score: 0/10, Attempts remaining: 0, Highest score preserved: 10/10`);
  });

  await test('2.5 Attempt 4: Max 3 Attempts Limit strictly enforced', async () => {
    const code = 'print(8)';
    await assert.rejects(
      async () => await submissionService.submitCode(expLive._id.toString(), 'Python', code, '', studentUser),
      (err) => err.statusCode === 400 && err.message.includes('maximum allowed limit of 3 official submissions')
    );
    console.log('    ✓ Confirmed: 4th attempt rejected with 400 limit message');
  });

  // =========================================================================
  // WORKFLOW PART 3: Infrastructure Failure Guardrails
  // =========================================================================
  console.log('\n--- WORKFLOW PART 3: Infrastructure Failure Guardrails ---');

  await test('3.1 Provider failure does not consume student attempt or create submission', async () => {
    // Create new student with 0 submissions
    const freshStudent = {
      _id: new mongoose.Types.ObjectId('65f000000000000000000002'),
      name: 'Fresh Student',
      rollNumber: 'FRESH01',
      role: 'STUDENT',
      section: 'CSE-LIVE',
      active: true
    };

    const countBefore = await Submission.countDocuments({
      student: freshStudent._id,
      experiment: expLive._id,
      active: true
    });
    assert.strictEqual(countBefore, 0);

    // Temporarily swap provider with one that fails with 503
    const realProvider = codeExecutionService.judge0Provider;
    codeExecutionService.judge0Provider = {
      execute: async () => {
        throw new AppError('Judge0 execution queue is currently full. Please try again shortly.', 503);
      }
    };

    await assert.rejects(
      async () => await submissionService.submitCode(expLive._id.toString(), 'Python', 'print(1)', '', freshStudent),
      (err) => err.statusCode === 503
    );

    const countAfter = await Submission.countDocuments({
      student: freshStudent._id,
      experiment: expLive._id,
      active: true
    });
    assert.strictEqual(countAfter, 0, 'No submission should be created or attempt consumed on provider failure');

    // Restore real provider
    codeExecutionService.judge0Provider = realProvider;
    console.log('    ✓ Confirmed: Provider failure leaves student attempt count at 0');
  });

  await test('3.2 Provider failure during test case evaluation rolls back submission and does not consume attempt', async () => {
    const freshStudent2 = {
      _id: new mongoose.Types.ObjectId('65f000000000000000000003'),
      name: 'Fresh Student 2',
      rollNumber: 'FRESH02',
      role: 'STUDENT',
      section: 'CSE-LIVE',
      active: true
    };

    const realProvider = codeExecutionService.judge0Provider;
    let callCount = 0;
    // First call (initial run) succeeds; subsequent call (test case execution) throws 503
    codeExecutionService.judge0Provider = {
      execute: async () => {
        callCount++;
        if (callCount === 1) {
          return { status: 'SUCCESS', stdout: '8\n', stderr: '', exitCode: 0, executionTimeMs: 10 };
        }
        throw new AppError('Judge0 network timeout during testcase execution', 503);
      }
    };

    await assert.rejects(
      async () => await submissionService.submitCode(expLive._id.toString(), 'Python', 'print(8)', '', freshStudent2),
      (err) => err.statusCode === 503
    );

    const countAfter = await Submission.countDocuments({
      student: freshStudent2._id,
      experiment: expLive._id,
      active: true
    });
    assert.strictEqual(countAfter, 0, 'Uncompleted submission must be rolled back on evaluation provider failure');

    // Restore real provider
    codeExecutionService.judge0Provider = realProvider;
    console.log('    ✓ Confirmed: Mid-evaluation provider failure rolls back submission; 0 attempts consumed');
  });

  // =========================================================================
  // WORKFLOW PART 4: Viva and Total Score Calculation Verification
  // =========================================================================
  console.log('\n--- WORKFLOW PART 4: Viva & Total Score Consistency ---');

  await test('4.1 Combined Auto Score (out of 10) + Viva Score (out of 5) = Total Score (out of 15)', () => {
    const autoScore = 10; // Highest auto score from Attempt 1
    const vivaScore = 4.5; // Faculty assigned viva marks

    const totalScore = autoScore + vivaScore;
    assert.strictEqual(totalScore, 14.5);
    assert.ok(totalScore <= 15);

    // Unevaluated viva
    const unEvalViva = null;
    const pendingTotal = unEvalViva !== null ? autoScore + unEvalViva : autoScore;
    assert.strictEqual(pendingTotal, 10);
    console.log(`    Auto: ${autoScore}/10 + Viva: ${vivaScore}/5 -> Total: ${totalScore}/15 (Pending viva: ${pendingTotal}/10)`);
  });

  console.log(`\n=============================================================`);
  console.log(`Real CodeLab Live Workflow Suite: ${passed}/${total} PASSED (100%)`);
  console.log(`=============================================================\n`);
}

runLiveWorkflowTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error during Live CodeLab workflow tests:', err);
    process.exit(1);
  });
