const { TestCase, Experiment, LabAssignment, Section } = require('../models');
const AppError = require('../utils/appError');

class TestCaseService {
  /**
   * Verifies teacher/admin write access to an experiment
   */
  async verifyFacultyWriteAccess(experimentId, user) {
    if (user.role === 'ADMIN_HOD') {
      const exp = await Experiment.findById(experimentId).populate('lab');
      if (!exp || !exp.active) {
        throw new AppError('Experiment not found or deactivated', 404);
      }
      return { experiment: exp, lab: exp.lab };
    }

    if (user.role === 'TEACHER') {
      const exp = await Experiment.findById(experimentId).populate('lab');
      if (!exp || !exp.active) {
        throw new AppError('Experiment not found or deactivated', 404);
      }

      const assignment = await LabAssignment.findOne({
        lab: exp.lab._id,
        teacher: user._id,
        active: true
      });

      if (!assignment) {
        throw new AppError('You do not have an active faculty assignment for this laboratory', 403);
      }

      return { experiment: exp, lab: exp.lab };
    }

    throw new AppError('Access denied: Faculty privileges required', 403);
  }

  /**
   * Get test cases for an experiment with role-based filtering (students never see hidden test cases)
   */
  async getTestCases(experimentId, user) {
    const experiment = await Experiment.findById(experimentId).populate('lab');
    if (!experiment || !experiment.active) {
      throw new AppError('Experiment not found or deactivated', 404);
    }

    // If teacher/admin
    if (user.role === 'ADMIN_HOD' || user.role === 'TEACHER') {
      if (user.role === 'TEACHER') {
        const assignment = await LabAssignment.findOne({
          lab: experiment.lab._id,
          teacher: user._id,
          active: true
        });
        if (!assignment) {
          throw new AppError('You do not have an active faculty assignment for this laboratory', 403);
        }
      }

      const testCases = await TestCase.find({
        experiment: experimentId,
        active: true
      }).sort({ order: 1, createdAt: 1 });

      return testCases;
    }

    // If student
    if (user.role === 'STUDENT') {
      if (!user.section) {
        throw new AppError('You are not enrolled in an academic section', 403);
      }

      const section = await Section.findOne({
        sectionCode: user.section.toUpperCase(),
        active: true
      });

      if (!section) {
        throw new AppError('Your enrolled section is invalid or inactive', 403);
      }

      const assignment = await LabAssignment.findOne({
        lab: experiment.lab._id,
        section: section._id,
        active: true
      });

      if (!assignment) {
        throw new AppError('This experiment is not assigned to your academic section', 403);
      }

      // Return ONLY public / visible test cases for students
      const visibleTestCases = await TestCase.find({
        experiment: experimentId,
        isHidden: false,
        active: true
      })
        .sort({ order: 1, createdAt: 1 })
        .select('order input expectedOutput marks isHidden');

      return visibleTestCases;
    }

    throw new AppError('Unauthorized access', 403);
  }

  /**
   * Create a new test case
   */
  async createTestCase(data, user) {
    const { experimentId, input, expectedOutput, marks, isHidden, order } = data;
    await this.verifyFacultyWriteAccess(experimentId, user);

    let nextOrder = order;
    if (!nextOrder) {
      const count = await TestCase.countDocuments({ experiment: experimentId, active: true });
      nextOrder = count + 1;
    }

    const testCase = await TestCase.create({
      experiment: experimentId,
      input: input || '',
      expectedOutput: expectedOutput.trim(),
      marks: marks !== undefined ? Number(marks) : 1,
      isHidden: isHidden === true,
      order: nextOrder,
      active: true
    });

    return testCase;
  }

  /**
   * Update an existing test case
   */
  async updateTestCase(id, data, user) {
    const testCase = await TestCase.findById(id);
    if (!testCase || !testCase.active) {
      throw new AppError('Test case not found', 404);
    }

    await this.verifyFacultyWriteAccess(testCase.experiment, user);

    if (data.input !== undefined) testCase.input = data.input;
    if (data.expectedOutput !== undefined) testCase.expectedOutput = data.expectedOutput.trim();
    if (data.marks !== undefined) testCase.marks = Number(data.marks);
    if (data.isHidden !== undefined) testCase.isHidden = data.isHidden === true;
    if (data.order !== undefined) testCase.order = Number(data.order);

    await testCase.save();
    return testCase;
  }

  /**
   * Deactivate a test case (soft deletion)
   */
  async deactivateTestCase(id, user) {
    const testCase = await TestCase.findById(id);
    if (!testCase || !testCase.active) {
      throw new AppError('Test case not found', 404);
    }

    await this.verifyFacultyWriteAccess(testCase.experiment, user);

    testCase.active = false;
    await testCase.save();
    return testCase;
  }

  /**
   * Batch reorder test cases for an experiment
   */
  async reorderTestCases(experimentId, orders, user) {
    await this.verifyFacultyWriteAccess(experimentId, user);

    const testCases = await TestCase.find({ experiment: experimentId, active: true });
    const tcMap = new Map(testCases.map((tc) => [tc._id.toString(), tc]));

    for (const item of orders) {
      const tc = tcMap.get(item.testCaseId.toString());
      if (tc) {
        tc.order = Number(item.order);
        await tc.save();
      }
    }

    return await TestCase.find({ experiment: experimentId, active: true }).sort({ order: 1 });
  }
}

module.exports = new TestCaseService();
