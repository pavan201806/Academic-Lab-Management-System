const { Evaluation, Submission, TestCase, Experiment, LabAssignment, Section, User } = require('../models');
const codeExecutionService = require('./codeExecutionService');
const AppError = require('../utils/appError');

class EvaluationService {
  /**
   * Normalizes stdout string for deterministic output comparison:
   * - Converts Windows CRLF (\r\n) to LF (\n)
   * - Trims trailing whitespace from each line
   * - Trims overall trailing whitespace/newlines
   */
  normalizeOutput(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .trim();
  }

  /**
   * Evaluates an official submission against all active test cases for the experiment.
   * @param {object} submission - The newly created or retrieved Submission document
   * @returns {Promise<object>} Evaluation document
   */
  async evaluateSubmission(submission) {
    const experimentId = submission.experiment._id || submission.experiment;
    const testCases = await TestCase.find({
      experiment: experimentId,
      active: true
    }).sort({ order: 1 });

    const testCaseResults = [];
    let earnedMarks = 0;
    let totalAvailableMarks = 0;

    if (testCases.length === 0) {
      // Fallback if experiment has no specific test cases configured yet
      const passed = submission.status === 'SUCCESS';
      const score = passed ? 10 : 0;

      const evaluation = await Evaluation.create({
        submission: submission._id,
        experiment: experimentId,
        student: submission.student._id || submission.student,
        lab: submission.lab._id || submission.lab,
        section: submission.section._id || submission.section,
        attemptNumber: submission.attemptNumber,
        testCaseResults: [],
        earnedMarks: score,
        totalAvailableMarks: 10,
        score,
        isHighestScore: true,
        evaluatedAt: new Date(),
        active: true
      });

      await this.updateHighestScore(submission.student, experimentId);
      return evaluation;
    }

    for (const tc of testCases) {
      totalAvailableMarks += tc.marks;

      // Execute code against this test case using existing Phase 6 Docker sandbox
      const execResult = await codeExecutionService.execute(
        submission.language,
        submission.sourceCode,
        tc.input || ''
      );

      let passed = false;
      let errorSummary = '';

      if (execResult.status === 'SUCCESS') {
        const normalizedActual = this.normalizeOutput(execResult.stdout);
        const normalizedExpected = this.normalizeOutput(tc.expectedOutput);

        if (normalizedActual === normalizedExpected) {
          passed = true;
          earnedMarks += tc.marks;
        } else {
          passed = false;
          errorSummary = 'Wrong Answer (Output Mismatch)';
        }
      } else {
        passed = false;
        errorSummary = execResult.stderr || `Execution failed with status: ${execResult.status}`;
      }

      testCaseResults.push({
        testCaseId: tc._id,
        order: tc.order,
        isHidden: tc.isHidden === true,
        passed,
        earnedMarks: passed ? tc.marks : 0,
        availableMarks: tc.marks,
        executionStatus: execResult.status,
        executionTimeMs: execResult.executionTimeMs || 0,
        actualOutput: execResult.stdout || '',
        errorSummary
      });
    }

    // Proportionally normalize score to scale out of 10
    let finalScore = 0;
    if (totalAvailableMarks > 0) {
      finalScore = Math.round((earnedMarks / totalAvailableMarks) * 10 * 100) / 100;
    }
    finalScore = Math.max(0, Math.min(10, finalScore));

    const evaluation = await Evaluation.create({
      submission: submission._id,
      experiment: experimentId,
      student: submission.student._id || submission.student,
      lab: submission.lab._id || submission.lab,
      section: submission.section._id || submission.section,
      attemptNumber: submission.attemptNumber,
      testCaseResults,
      earnedMarks,
      totalAvailableMarks,
      score: finalScore,
      isHighestScore: false,
      evaluatedAt: new Date(),
      active: true
    });

    // Update highest score across all official attempts for this student & experiment
    await this.updateHighestScore(submission.student._id || submission.student, experimentId);

    return await Evaluation.findById(evaluation._id);
  }

  /**
   * Recalculates and marks the highest score evaluation across official attempts
   */
  async updateHighestScore(studentId, experimentId) {
    const evaluations = await Evaluation.find({
      student: studentId,
      experiment: experimentId,
      active: true
    }).sort({ score: -1, attemptNumber: 1 });

    if (evaluations.length === 0) return;

    const highestScore = evaluations[0].score;

    for (const ev of evaluations) {
      const shouldBeHighest = ev.score === highestScore;
      if (ev.isHighestScore !== shouldBeHighest) {
        ev.isHighestScore = shouldBeHighest;
        await ev.save();
      }
    }
  }

  /**
   * Get student's evaluations for an experiment (with hidden test case inputs/outputs redacted)
   */
  async getStudentEvaluations(experimentId, user) {
    const evaluations = await Evaluation.find({
      student: user._id,
      experiment: experimentId,
      active: true
    })
      .sort({ attemptNumber: 1 })
      .populate('submission', 'language submittedAt status');

    // Redact hidden test case details for students
    const sanitized = evaluations.map((ev) => {
      const obj = ev.toObject();
      obj.testCaseResults = obj.testCaseResults.map((tc) => {
        if (tc.isHidden) {
          return {
            order: tc.order,
            isHidden: true,
            passed: tc.passed,
            earnedMarks: tc.earnedMarks,
            availableMarks: tc.availableMarks,
            executionStatus: tc.executionStatus,
            executionTimeMs: tc.executionTimeMs
            // actualOutput and errorSummary are omitted for hidden test cases
          };
        }
        return tc;
      });
      return obj;
    });

    const highestScore = evaluations.reduce((max, ev) => Math.max(max, ev.score), 0);

    return {
      evaluations: sanitized,
      highestScore,
      totalAttempts: evaluations.length,
      attemptsRemaining: Math.max(0, 3 - evaluations.length)
    };
  }

  /**
   * Get a single evaluation by ID with role-based redaction
   */
  async getEvaluationById(evaluationId, user) {
    const evaluation = await Evaluation.findById(evaluationId)
      .populate('student', 'name rollNumber section')
      .populate('experiment', 'title experimentNumber')
      .populate('lab', 'name code')
      .populate('submission');

    if (!evaluation || !evaluation.active) {
      throw new AppError('Evaluation record not found', 404);
    }

    if (user.role === 'ADMIN_HOD') {
      return evaluation;
    }

    if (user.role === 'TEACHER') {
      const assignment = await LabAssignment.findOne({
        lab: evaluation.lab._id,
        teacher: user._id,
        active: true
      });
      if (!assignment) {
        throw new AppError('You do not have an active faculty assignment for this laboratory', 403);
      }
      return evaluation;
    }

    if (user.role === 'STUDENT') {
      if (evaluation.student._id.toString() !== user._id.toString()) {
        throw new AppError('You are not authorized to view another student\'s evaluation', 403);
      }

      const obj = evaluation.toObject();
      obj.testCaseResults = obj.testCaseResults.map((tc) => {
        if (tc.isHidden) {
          return {
            order: tc.order,
            isHidden: true,
            passed: tc.passed,
            earnedMarks: tc.earnedMarks,
            availableMarks: tc.availableMarks,
            executionStatus: tc.executionStatus,
            executionTimeMs: tc.executionTimeMs
          };
        }
        return tc;
      });
      return obj;
    }

    throw new AppError('Unauthorized access', 403);
  }

  /**
   * Get all evaluations for a laboratory (Teacher/Admin ledger view)
   */
  async getLabEvaluations(labId, experimentId, user) {
    if (user.role !== 'ADMIN_HOD' && user.role !== 'TEACHER') {
      throw new AppError('Only faculty and administrators can access evaluation ledgers', 403);
    }

    if (user.role === 'TEACHER') {
      const assignment = await LabAssignment.findOne({
        lab: labId,
        teacher: user._id,
        active: true
      });
      if (!assignment) {
        throw new AppError('You do not have an active faculty assignment for this laboratory', 403);
      }
    }

    const query = { lab: labId, active: true };
    if (experimentId) {
      query.experiment = experimentId;
    }

    const evaluations = await Evaluation.find(query)
      .populate('student', 'name rollNumber section')
      .populate('experiment', 'title experimentNumber')
      .populate('submission', 'language submittedAt status')
      .sort({ evaluatedAt: -1 });

    return evaluations;
  }
}

module.exports = new EvaluationService();
