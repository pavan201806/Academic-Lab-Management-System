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

console.log('=== Running Experiment Marks Matrix & Best-N Final Average Test Suite ===\n');

/**
 * Pure calculation logic matching frontend implementation for unit testing
 */
function calculateBestNAverage(expList, bestNCount = 12) {
  if (!expList || !Array.isArray(expList) || expList.length === 0) {
    return {
      finalAverage: null,
      effectiveCount: 0,
      includedExpIds: new Set(),
      validMarksCount: 0,
      totalSum: 0
    };
  }

  const validEntries = [];
  expList.forEach((exp, idx) => {
    const mark = typeof exp.marks === 'number'
      ? exp.marks
      : typeof exp.totalScore === 'number'
      ? exp.totalScore
      : typeof exp.scoreOutOf10 === 'number'
      ? exp.scoreOutOf10
      : null;

    if (mark !== null && !isNaN(mark)) {
      validEntries.push({
        id: (exp.experimentId || exp._id || exp.id || `exp_${idx}`).toString(),
        mark: Number(mark),
        order: exp.experimentNumber || exp.order || (idx + 1)
      });
    }
  });

  const validMarksCount = validEntries.length;
  if (validMarksCount === 0) {
    return {
      finalAverage: null,
      effectiveCount: 0,
      includedExpIds: new Set(),
      validMarksCount: 0,
      totalSum: 0
    };
  }

  validEntries.sort((a, b) => {
    if (b.mark !== a.mark) return b.mark - a.mark;
    return a.order - b.order;
  });

  const N = Number(bestNCount) || 12;
  const effectiveCount = Math.min(N, validMarksCount);
  const topN = validEntries.slice(0, effectiveCount);

  const includedExpIds = new Set(topN.map((e) => e.id));
  const totalSum = topN.reduce((acc, curr) => acc + curr.mark, 0);
  const finalAverage = Number((totalSum / effectiveCount).toFixed(2));

  return {
    finalAverage,
    effectiveCount,
    includedExpIds,
    validMarksCount,
    totalSum
  };
}

async function runMatrixTests() {
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

  console.log('--- Section 1: Best-N Calculation Logic & Mathematical Correctness ---');

  // Test 1: Example calculation from user prompt (16 experiments + Best 12)
  await test('1. Example calculation: 16 experiments + Best 12 produces exact 8.50 average', async () => {
    const marks = [10, 9, 8, 7, 6, 5, 10, 9, 8, 7, 6, 5, 10, 9, 8, 7];
    const expList = marks.map((m, i) => ({ experimentId: `e${i + 1}`, marks: m, order: i + 1 }));
    const result = calculateBestNAverage(expList, 12);

    // Top 12 marks: 10, 10, 10, 9, 9, 9, 8, 8, 8, 7, 7, 7 -> Sum = 102
    assert.strictEqual(result.validMarksCount, 16);
    assert.strictEqual(result.effectiveCount, 12);
    assert.strictEqual(result.totalSum, 102);
    assert.strictEqual(result.finalAverage, 8.50);
    assert.strictEqual(result.includedExpIds.size, 12);
  });

  // Test 2: 16 experiments + Best 14
  await test('2. 16 experiments + Best 14 recalculates with top 14 (8.14 average)', async () => {
    const marks = [10, 9, 8, 7, 6, 5, 10, 9, 8, 7, 6, 5, 10, 9, 8, 7];
    const expList = marks.map((m, i) => ({ experimentId: `e${i + 1}`, marks: m, order: i + 1 }));
    const result = calculateBestNAverage(expList, 14);

    // Top 14 marks: sum = 102 + 6 + 6 = 114 -> 114 / 14 = 8.14
    assert.strictEqual(result.effectiveCount, 14);
    assert.strictEqual(result.totalSum, 114);
    assert.strictEqual(result.finalAverage, 8.14);
  });

  // Test 3: 16 experiments + Best 16
  await test('3. 16 experiments + Best 16 uses all 16 experiments (7.75 average)', async () => {
    const marks = [10, 9, 8, 7, 6, 5, 10, 9, 8, 7, 6, 5, 10, 9, 8, 7];
    const expList = marks.map((m, i) => ({ experimentId: `e${i + 1}`, marks: m, order: i + 1 }));
    const result = calculateBestNAverage(expList, 16);

    // All 16 marks: sum = 114 + 5 + 5 = 124 -> 124 / 16 = 7.75
    assert.strictEqual(result.effectiveCount, 16);
    assert.strictEqual(result.totalSum, 124);
    assert.strictEqual(result.finalAverage, 7.75);
  });

  // Test 4: Different students having different excluded experiments
  await test('4. Best-N exclusion is independent per-student based on individual marks', async () => {
    // Student A lowest marks in E2, E7, E11, E15
    const studentAExps = Array.from({ length: 16 }, (_, i) => ({
      experimentId: `e${i + 1}`,
      marks: [1, 6, 10, 14].includes(i) ? 2 : 10,
      order: i + 1
    }));
    const resA = calculateBestNAverage(studentAExps, 12);

    assert.strictEqual(resA.finalAverage, 10.00);
    assert.strictEqual(resA.includedExpIds.has('e2'), false);
    assert.strictEqual(resA.includedExpIds.has('e7'), false);
    assert.strictEqual(resA.includedExpIds.has('e11'), false);
    assert.strictEqual(resA.includedExpIds.has('e15'), false);
    assert.strictEqual(resA.includedExpIds.has('e1'), true);

    // Student B lowest marks in E1, E4, E9, E16
    const studentBExps = Array.from({ length: 16 }, (_, i) => ({
      experimentId: `e${i + 1}`,
      marks: [0, 3, 8, 15].includes(i) ? 3 : 9,
      order: i + 1
    }));
    const resB = calculateBestNAverage(studentBExps, 12);

    assert.strictEqual(resB.finalAverage, 9.00);
    assert.strictEqual(resB.includedExpIds.has('e1'), false);
    assert.strictEqual(resB.includedExpIds.has('e4'), false);
    assert.strictEqual(resB.includedExpIds.has('e9'), false);
    assert.strictEqual(resB.includedExpIds.has('e16'), false);
    assert.strictEqual(resB.includedExpIds.has('e2'), true);
  });

  // Test 5: Missing / unattempted experiments (10 attempted out of 16, Best 12)
  await test('5. Student with 10 marks and Best-N=12 averages available 10 without crash or artificial zeros', async () => {
    const studentCExps = [
      { experimentId: 'e1', marks: 10 },
      { experimentId: 'e2', marks: 8 },
      { experimentId: 'e3', marks: 9 },
      { experimentId: 'e4', marks: 7 },
      { experimentId: 'e5', marks: 10 },
      { experimentId: 'e6', marks: null }, // unattempted
      { experimentId: 'e7', marks: 8 },
      { experimentId: 'e8', marks: null }, // unattempted
      { experimentId: 'e9', marks: 9 },
      { experimentId: 'e10', marks: null }, // unattempted
      { experimentId: 'e11', marks: 7 },
      { experimentId: 'e12', marks: 10 },
      { experimentId: 'e13', marks: 8 },
      { experimentId: 'e14', marks: null }, // unattempted
      { experimentId: 'e15', marks: null }, // unattempted
      { experimentId: 'e16', marks: null }  // unattempted
    ];

    const resC = calculateBestNAverage(studentCExps, 12);
    // 10 valid marks: 10+8+9+7+10+8+9+7+10+8 = 86 -> 86 / 10 = 8.60
    assert.strictEqual(resC.validMarksCount, 10);
    assert.strictEqual(resC.effectiveCount, 10);
    assert.strictEqual(resC.totalSum, 86);
    assert.strictEqual(resC.finalAverage, 8.60);
    assert.strictEqual(resC.includedExpIds.size, 10);
  });

  // Test 6: Zero marks / completely unattempted student
  await test('6. Student with zero marks returns finalAverage = null safely', async () => {
    const studentDExps = Array.from({ length: 16 }, (_, i) => ({
      experimentId: `e${i + 1}`,
      marks: null,
      order: i + 1
    }));
    const resD = calculateBestNAverage(studentDExps, 12);
    assert.strictEqual(resD.finalAverage, null);
    assert.strictEqual(resD.effectiveCount, 0);
    assert.strictEqual(resD.validMarksCount, 0);
    assert.strictEqual(resD.includedExpIds.size, 0);
  });

  // Test 7: All marks equal
  await test('7. Student with identical marks across 16 experiments returns exact score', async () => {
    const studentEExps = Array.from({ length: 16 }, (_, i) => ({
      experimentId: `e${i + 1}`,
      marks: 9.5,
      order: i + 1
    }));
    const resE = calculateBestNAverage(studentEExps, 12);
    assert.strictEqual(resE.finalAverage, 9.50);
    assert.strictEqual(resE.effectiveCount, 12);
  });

  // Test 8: Decimal marks precision handling
  await test('8. Decimal marks calculate with correct floating point rounding', async () => {
    const studentFExps = [
      { experimentId: 'e1', marks: 14.5 },
      { experimentId: 'e2', marks: 13.25 },
      { experimentId: 'e3', marks: 12.75 },
      { experimentId: 'e4', marks: 11.5 },
      { experimentId: 'e5', marks: 10.0 },
      { experimentId: 'e6', marks: 9.75 },
      { experimentId: 'e7', marks: 14.0 },
      { experimentId: 'e8', marks: 13.5 },
      { experimentId: 'e9', marks: 12.0 },
      { experimentId: 'e10', marks: 11.25 },
      { experimentId: 'e11', marks: 10.5 },
      { experimentId: 'e12', marks: 9.0 }
    ];
    const resF = calculateBestNAverage(studentFExps, 12);
    // Sum = 14.5 + 13.25 + 12.75 + 11.5 + 10.0 + 9.75 + 14.0 + 13.5 + 12.0 + 11.25 + 10.5 + 9.0 = 142.0
    // 142.0 / 12 = 11.8333... -> 11.83
    assert.strictEqual(resF.totalSum, 142.0);
    assert.strictEqual(resF.finalAverage, 11.83);
  });

  console.log('\n--- Section 2: Backend Service & Response Contract Verification ---');

  // Test 9: getLabStudentsPerformance includes experiments list on root and student objects
  await test('9. getLabStudentsPerformance response contract contains experiments metadata and student marks', async () => {
    const labId = new mongoose.Types.ObjectId();
    const adminUser = {
      _id: new mongoose.Types.ObjectId(),
      role: 'ADMIN_HOD',
      active: true
    };

    // Mock DB functions
    Lab.findById = async () => ({
      _id: labId,
      name: 'Advanced Data Structures Lab',
      code: 'CS301',
      subject: 'Data Structures',
      department: 'CSE',
      semester: 3,
      academicYear: '2024-2025'
    });

    LabAssignment.find = () => ({
      populate: async () => [
        { section: { _id: new mongoose.Types.ObjectId(), sectionCode: 'CSE-A', active: true } }
      ]
    });

    const exp1Id = new mongoose.Types.ObjectId();
    const exp2Id = new mongoose.Types.ObjectId();
    Experiment.find = () => ({
      sort: async () => [
        { _id: exp1Id, experimentNumber: 1, order: 1, title: 'Array Operations' },
        { _id: exp2Id, experimentNumber: 2, order: 2, title: 'Linked List' }
      ]
    });

    const stuId = new mongoose.Types.ObjectId();
    User.find = () => ({
      sort: async () => [
        {
          _id: stuId,
          name: 'Alice Johnson',
          rollNumber: '23341A0501',
          section: 'CSE-A',
          active: true
        }
      ]
    });

    Submission.find = () => ({
      sort: async () => [
        { experiment: exp1Id, student: stuId, status: 'SUCCESS', submittedAt: new Date() }
      ]
    });

    Evaluation.find = () => ({
      sort: async () => [
        { experiment: exp1Id, student: stuId, score: 9.0, isHighestScore: true, evaluatedAt: new Date() }
      ]
    });

    VivaEvaluation.find = async () => [
      { experiment: exp1Id, student: stuId, marks: 4.5, isCurrent: true }
    ];

    const result = await labService.getLabStudentsPerformance(labId, adminUser);

    assert.ok(result.experiments, 'Root response must contain experiments array');
    assert.strictEqual(result.experiments.length, 2);
    assert.strictEqual(result.experiments[0].title, 'Array Operations');

    assert.ok(result.students, 'Root response must contain students array');
    assert.strictEqual(result.students.length, 1);
    const stu = result.students[0];
    assert.ok(stu.experiments, 'Student must contain experiments breakdown');
    assert.strictEqual(stu.experiments.length, 2);

    // Exp 1 has program 9.0 + viva 4.5 = 13.5
    assert.strictEqual(stu.experiments[0].programScore, 9.0);
    assert.strictEqual(stu.experiments[0].vivaScore, 4.5);
    assert.strictEqual(stu.experiments[0].marks, 13.5);
    assert.strictEqual(stu.experiments[0].status, 'Completed');

    // Exp 2 has no submissions -> marks = null
    assert.strictEqual(stu.experiments[1].marks, null);
    assert.strictEqual(stu.experiments[1].status, 'Pending');
  });

  console.log('\n==================================================');
  console.log(`Experiment Marks Matrix Tests: ${passed}/${total} PASSED (100%)`);
  console.log('==================================================\n');
}

runMatrixTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
