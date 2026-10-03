const { Submission, Experiment, Lab, Section, LabAssignment, User } = require('../models');
const codeExecutionService = require('./codeExecutionService');
const AppError = require('../utils/appError');

class SubmissionService {
  /**
   * Validates that an authenticated student is authorized to access the experiment
   * @param {string} experimentId
   * @param {object} user
   * @returns {Promise<{experiment: object, lab: object, section: object}>}
   */
  async validateStudentAccess(experimentId, user) {
    if (!user || !user.active) {
      throw new AppError('User account is inactive or invalid', 403);
    }

    if (user.role !== 'STUDENT') {
      throw new AppError('Only students are authorized to run or submit code exercises', 403);
    }

    if (!user.section) {
      throw new AppError('You are not currently enrolled in any academic section', 403);
    }

    const section = await Section.findOne({
      sectionCode: user.section.toUpperCase(),
      active: true
    });

    if (!section) {
      throw new AppError('Your enrolled section is inactive or does not exist', 403);
    }

    const experiment = await Experiment.findById(experimentId).populate('lab');
    if (!experiment || !experiment.active) {
      throw new AppError('Experiment not found or deactivated', 404);
    }

    const lab = experiment.lab;
    if (!lab || !lab.active) {
      throw new AppError('The laboratory containing this experiment is deactivated', 403);
    }

    // Check student section cohort assignment to this lab
    const assignment = await LabAssignment.findOne({
      lab: lab._id,
      section: section._id,
      active: true
    });

    if (!assignment) {
      throw new AppError('This laboratory experiment is not assigned to your academic section', 403);
    }

    // Check experiment status lifecycle for students
    if (!['PUBLISHED', 'REOPENED'].includes(experiment.status)) {
      if (experiment.status === 'CLOSED') {
        throw new AppError('This experiment is closed and not currently accepting submissions', 403);
      }
      throw new AppError('This experiment is not currently published or available for submissions', 403);
    }

    return { experiment, lab, section };
  }

  /**
   * Manual Run: Executes student code safely without consuming an attempt or writing to MongoDB
   * @param {string} experimentId
   * @param {string} language
   * @param {string} sourceCode
   * @param {string} stdin
   * @param {object} user
   * @returns {Promise<object>}
   */
  async runCode(experimentId, language, sourceCode, stdin = '', user) {
    const { experiment } = await this.validateStudentAccess(experimentId, user);

    // Validate that language is allowed by this experiment
    if (!experiment.programmingLanguages.includes(language)) {
      throw new AppError(
        `Language '${language}' is not permitted for this experiment. Allowed: ${experiment.programmingLanguages.join(', ')}`,
        400
      );
    }

    const executionResult = await codeExecutionService.execute(language, sourceCode, stdin);

    return {
      experimentId,
      language,
      isManualRun: true,
      executionResult
    };
  }

  /**
   * Official Submit: Executes student code and records an immutable Submission document
   * @param {string} experimentId
   * @param {string} language
   * @param {string} sourceCode
   * @param {string} stdin
   * @param {object} user
   * @returns {Promise<object>}
   */
  async submitCode(experimentId, language, sourceCode, stdin = '', user) {
    const { experiment, lab, section } = await this.validateStudentAccess(experimentId, user);

    // Validate language
    if (!experiment.programmingLanguages.includes(language)) {
      throw new AppError(
        `Language '${language}' is not permitted for this experiment. Allowed: ${experiment.programmingLanguages.join(', ')}`,
        400
      );
    }

    // Check attempt limit (Max 3 attempts per experiment)
    const existingAttemptsCount = await Submission.countDocuments({
      student: user._id,
      experiment: experiment._id,
      active: true
    });

    if (existingAttemptsCount >= 3) {
      throw new AppError(
        'You have reached the maximum allowed limit of 3 official submissions for this experiment',
        400
      );
    }

    const attemptNumber = existingAttemptsCount + 1;

    // Execute code to record submission execution output
    const executionResult = await codeExecutionService.execute(language, sourceCode, stdin);

    const submission = await Submission.create({
      student: user._id,
      experiment: experiment._id,
      lab: lab._id,
      section: section._id,
      attemptNumber,
      language,
      sourceCode,
      stdin,
      status: executionResult.status === 'SUCCESS' ? 'SUCCESS' : executionResult.status,
      executionOutput: executionResult,
      submittedAt: new Date(),
      active: true
    });

    return submission;
  }

  /**
   * Get student's submission history for a specific experiment
   * @param {string} experimentId
   * @param {object} user
   * @returns {Promise<Array<object>>}
   */
  async getStudentSubmissions(experimentId, user) {
    await this.validateStudentAccess(experimentId, user);

    const submissions = await Submission.find({
      student: user._id,
      experiment: experimentId,
      active: true
    })
      .sort({ attemptNumber: 1, submittedAt: 1 })
      .select('attemptNumber language status executionOutput submittedAt createdAt');

    return submissions;
  }

  /**
   * Get a single submission by ID with strict access control
   * @param {string} submissionId
   * @param {object} user
   * @returns {Promise<object>}
   */
  async getSubmissionById(submissionId, user) {
    const submission = await Submission.findById(submissionId)
      .populate('student', 'name rollNumber section')
      .populate('experiment', 'title experimentNumber programmingLanguages')
      .populate('lab', 'name code');

    if (!submission || !submission.active) {
      throw new AppError('Submission not found', 404);
    }

    if (user.role === 'ADMIN_HOD') {
      return submission;
    }

    if (user.role === 'STUDENT') {
      if (submission.student._id.toString() !== user._id.toString()) {
        throw new AppError('You are not authorized to access another student\'s submission', 403);
      }
      return submission;
    }

    if (user.role === 'TEACHER') {
      const assignment = await LabAssignment.findOne({
        lab: submission.lab._id,
        teacher: user._id,
        active: true
      });

      if (!assignment) {
        throw new AppError('You do not have an active faculty assignment for this laboratory', 403);
      }
      return submission;
    }

    throw new AppError('Unauthorized access', 403);
  }

  /**
   * Retrieve submissions ledger for a lab (Teacher/Admin view)
   * @param {string} labId
   * @param {string} experimentId - Optional filter
   * @param {object} user
   * @returns {Promise<Array<object>>}
   */
  async getTeacherSubmissionsForLab(labId, experimentId, user) {
    if (user.role !== 'ADMIN_HOD' && user.role !== 'TEACHER') {
      throw new AppError('Only faculty and administrators can access the submissions ledger', 403);
    }

    const lab = await Lab.findById(labId);
    if (!lab) {
      throw new AppError('Laboratory not found', 404);
    }

    if (user.role === 'TEACHER') {
      const assignment = await LabAssignment.findOne({
        lab: lab._id,
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

    const submissions = await Submission.find(query)
      .populate('student', 'name rollNumber section')
      .populate('experiment', 'title experimentNumber')
      .populate('section', 'name sectionCode')
      .sort({ submittedAt: -1 });

    return submissions;
  }
}

module.exports = new SubmissionService();
