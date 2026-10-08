const { VivaEvaluation, Experiment, LabAssignment, Section, User, Lab, Submission, Evaluation, ReevaluationRequest } = require('../models');
const AppError = require('../utils/appError');

class VivaService {
  /**
   * Validates teacher/faculty assignment for a lab and section
   */
  async validateFacultyAccess(user, labId, sectionId = null) {
    if (user.role === 'ADMIN_HOD') {
      return true;
    }

    if (user.role !== 'TEACHER') {
      throw new AppError('Faculty privileges required', 403);
    }

    const query = {
      teacher: user._id,
      lab: labId,
      active: true
    };

    if (sectionId) {
      query.section = sectionId;
    }

    const assignment = await LabAssignment.findOne(query);
    if (!assignment) {
      throw new AppError('You do not have an active faculty assignment for this laboratory/section', 403);
    }

    return true;
  }

  /**
   * Validates student access to experiment and returns student section
   */
  async validateStudentExperimentAccess(student, experimentId) {
    if (student.role !== 'STUDENT') {
      throw new AppError('Student role required', 403);
    }

    if (!student.active) {
      throw new AppError('Student account is inactive', 403);
    }

    if (!student.section) {
      throw new AppError('Student is not assigned to an academic section', 403);
    }

    const section = await Section.findOne({ sectionCode: student.section, active: true });
    if (!section) {
      throw new AppError(`Academic section ${student.section} not found or inactive`, 403);
    }

    const experiment = await Experiment.findById(experimentId).populate('lab');
    if (!experiment || !experiment.active) {
      throw new AppError('Experiment not found or deactivated', 404);
    }

    const lab = experiment.lab;
    if (!lab || !lab.active) {
      throw new AppError('Laboratory not found or deactivated', 403);
    }

    const assignment = await LabAssignment.findOne({
      lab: lab._id,
      section: section._id,
      active: true
    });

    if (!assignment) {
      throw new AppError(`Experiment is not assigned to your section (${student.section})`, 403);
    }

    return { experiment, lab, section };
  }

  /**
   * Retrieves list of eligible students for an experiment and their current viva status
   */
  async getEligibleStudentsForViva(experimentId, facultyUser) {
    const experiment = await Experiment.findById(experimentId).populate('lab');
    if (!experiment || !experiment.active) {
      throw new AppError('Experiment not found or deactivated', 404);
    }

    const labId = experiment.lab._id || experiment.lab;

    // Determine authorized sections for this teacher
    let assignmentQuery = { lab: labId, active: true };
    if (facultyUser.role === 'TEACHER') {
      assignmentQuery.teacher = facultyUser._id;
    }

    const assignments = await LabAssignment.find(assignmentQuery).populate('section');
    if (assignments.length === 0 && facultyUser.role !== 'ADMIN_HOD') {
      throw new AppError('You do not have an active faculty assignment for this laboratory', 403);
    }

    const sectionCodes = assignments.map((a) => a.section?.sectionCode).filter(Boolean);

    // Fetch all active students in these sections
    const students = await User.find({
      role: 'STUDENT',
      section: { $in: sectionCodes },
      active: true
    }).select('name rollNumber section email');

    // Fetch current viva evaluations for this experiment
    const vivaEvaluations = await VivaEvaluation.find({
      experiment: experimentId,
      isCurrent: true,
      active: true
    }).populate('evaluatedBy', 'name rollNumber');

    // Fetch submissions count & highest score for each student
    const studentIds = students.map((s) => s._id);
    const evaluations = await Evaluation.find({
      experiment: experimentId,
      student: { $in: studentIds },
      active: true
    });

    return students.map((stu) => {
      const stuViva = vivaEvaluations.find((v) => v.student.toString() === stu._id.toString());
      const stuEvals = evaluations.filter((e) => e.student.toString() === stu._id.toString());
      const highestScore = stuEvals.length > 0 ? Math.max(...stuEvals.map((e) => e.score)) : 0;

      return {
        student: stu,
        viva: stuViva || null,
        hasEvaluatedViva: !!stuViva,
        submissionsCount: stuEvals.length,
        highestAutomatedScore: highestScore
      };
    });
  }

  /**
   * Creates an initial Viva evaluation for a student and experiment
   */
  async createVivaEvaluation({ studentId, experimentId, marks, remarks }, facultyUser) {
    const student = await User.findById(studentId);
    if (!student || student.role !== 'STUDENT' || !student.active) {
      throw new AppError('Valid active student is required', 404);
    }

    const { experiment, lab, section } = await this.validateStudentExperimentAccess(student, experimentId);

    // Verify faculty assignment for this lab and section
    await this.validateFacultyAccess(facultyUser, lab._id, section._id);

    // Check if student already has an active current Viva evaluation
    const existingCurrentViva = await VivaEvaluation.findOne({
      student: studentId,
      experiment: experimentId,
      isCurrent: true,
      active: true
    });

    if (existingCurrentViva) {
      throw new AppError(
        'Student already has an active Viva evaluation. Use the re-evaluation workflow to modify marks.',
        400
      );
    }

    const vivaEvaluation = await VivaEvaluation.create({
      student: studentId,
      experiment: experimentId,
      lab: lab._id,
      section: section._id,
      evaluatedBy: facultyUser._id,
      marks: Math.round(Number(marks) * 100) / 100,
      remarks: remarks || '',
      status: 'EVALUATED',
      evaluationVersion: 1,
      isCurrent: true,
      evaluatedAt: new Date(),
      active: true
    });

    return await VivaEvaluation.findById(vivaEvaluation._id)
      .populate('student', 'name rollNumber section')
      .populate('evaluatedBy', 'name rollNumber')
      .populate('experiment', 'title experimentNumber');
  }

  /**
   * Directly sets or updates a student's Viva evaluation score & remarks
   * Updates the existing current record if present, or creates a new one
   */
  async updateVivaEvaluation({ studentId, experimentId, marks, remarks }, facultyUser) {
    const student = await User.findById(studentId);
    if (!student || student.role !== 'STUDENT' || !student.active) {
      throw new AppError('Valid active student is required', 404);
    }

    const { experiment, lab, section } = await this.validateStudentExperimentAccess(student, experimentId);
    await this.validateFacultyAccess(facultyUser, lab._id, section._id);

    const existingCurrentViva = await VivaEvaluation.findOne({
      student: studentId,
      experiment: experimentId,
      isCurrent: true,
      active: true
    });

    if (existingCurrentViva) {
      existingCurrentViva.marks = Math.round(Number(marks) * 100) / 100;
      if (remarks !== undefined) {
        existingCurrentViva.remarks = remarks ? remarks.trim() : '';
      }
      existingCurrentViva.evaluatedBy = facultyUser._id;
      existingCurrentViva.evaluatedAt = new Date();
      await existingCurrentViva.save();

      return await VivaEvaluation.findById(existingCurrentViva._id)
        .populate('student', 'name rollNumber section')
        .populate('evaluatedBy', 'name rollNumber')
        .populate('experiment', 'title experimentNumber');
    }

    const vivaEvaluation = await VivaEvaluation.create({
      student: studentId,
      experiment: experimentId,
      lab: lab._id,
      section: section._id,
      evaluatedBy: facultyUser._id,
      marks: Math.round(Number(marks) * 100) / 100,
      remarks: remarks ? remarks.trim() : '',
      status: 'EVALUATED',
      evaluationVersion: 1,
      isCurrent: true,
      evaluatedAt: new Date(),
      active: true
    });

    return await VivaEvaluation.findById(vivaEvaluation._id)
      .populate('student', 'name rollNumber section')
      .populate('evaluatedBy', 'name rollNumber')
      .populate('experiment', 'title experimentNumber');
  }

  /**
   * Get student's current viva evaluation, version history, and pending re-evaluation request
   */
  async getStudentViva(experimentId, studentUser) {
    const { experiment } = await this.validateStudentExperimentAccess(studentUser, experimentId);

    const history = await VivaEvaluation.find({
      student: studentUser._id,
      experiment: experimentId,
      active: true
    })
      .sort({ evaluationVersion: 1 })
      .populate('evaluatedBy', 'name rollNumber');

    const currentViva = history.find((v) => v.isCurrent) || null;

    const pendingRequest = await ReevaluationRequest.findOne({
      student: studentUser._id,
      experiment: experimentId,
      active: true
    })
      .sort({ createdAt: -1 })
      .populate('reviewedBy', 'name rollNumber');

    return {
      experiment: {
        _id: experiment._id,
        title: experiment.title,
        experimentNumber: experiment.experimentNumber
      },
      currentViva,
      history,
      reevaluationRequest: pendingRequest
    };
  }

  /**
   * Get a specific student's viva details for authorized faculty
   */
  async getStudentVivaForFaculty(studentId, experimentId, facultyUser) {
    const student = await User.findById(studentId);
    if (!student || student.role !== 'STUDENT') {
      throw new AppError('Student not found', 404);
    }

    const { experiment, lab, section } = await this.validateStudentExperimentAccess(student, experimentId);
    await this.validateFacultyAccess(facultyUser, lab._id, section._id);

    const history = await VivaEvaluation.find({
      student: studentId,
      experiment: experimentId,
      active: true
    })
      .sort({ evaluationVersion: 1 })
      .populate('evaluatedBy', 'name rollNumber');

    const currentViva = history.find((v) => v.isCurrent) || null;

    const reevaluationRequest = await ReevaluationRequest.findOne({
      student: studentId,
      experiment: experimentId,
      active: true
    })
      .sort({ createdAt: -1 })
      .populate('reviewedBy', 'name rollNumber');

    return {
      student: {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        section: student.section
      },
      experiment: {
        _id: experiment._id,
        title: experiment.title,
        experimentNumber: experiment.experimentNumber
      },
      currentViva,
      history,
      reevaluationRequest
    };
  }

  /**
   * Get all current viva evaluations for a lab (Teacher/Admin ledger view)
   */
  async getLabVivaEvaluations(labId, experimentId, facultyUser) {
    await this.validateFacultyAccess(facultyUser, labId);

    const query = { lab: labId, isCurrent: true, active: true };
    if (experimentId) {
      query.experiment = experimentId;
    }

    return await VivaEvaluation.find(query)
      .sort({ evaluatedAt: -1 })
      .populate('student', 'name rollNumber section')
      .populate('evaluatedBy', 'name rollNumber')
      .populate('experiment', 'title experimentNumber')
      .populate('section', 'name sectionCode');
  }

  /**
   * Get single viva evaluation by ID
   */
  async getVivaById(vivaId, user) {
    const viva = await VivaEvaluation.findById(vivaId)
      .populate('student', 'name rollNumber section')
      .populate('evaluatedBy', 'name rollNumber')
      .populate('experiment', 'title experimentNumber')
      .populate('section', 'name sectionCode')
      .populate('lab', 'name code');

    if (!viva || !viva.active) {
      throw new AppError('Viva evaluation not found', 404);
    }

    if (user.role === 'STUDENT') {
      const studentId = (viva.student?._id || viva.student)?.toString();
      if (studentId !== user._id.toString()) {
        throw new AppError('You are not authorized to view another student\'s viva evaluation', 403);
      }
    } else {
      const labId = viva.lab?._id || viva.lab;
      const sectionId = viva.section?._id || viva.section;
      await this.validateFacultyAccess(user, labId, sectionId);
    }

    return viva;
  }
}

module.exports = new VivaService();
