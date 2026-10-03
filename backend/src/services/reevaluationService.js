const { ReevaluationRequest, VivaEvaluation, Experiment, LabAssignment, Section, User, Lab } = require('../models');
const AppError = require('../utils/appError');
const vivaService = require('./vivaService');

class ReevaluationService {
  /**
   * Student requests a re-evaluation for their completed Viva
   */
  async requestReevaluation({ experimentId, reason }, studentUser) {
    const { experiment, lab, section } = await vivaService.validateStudentExperimentAccess(studentUser, experimentId);

    // Verify student has an existing completed Viva evaluation
    const currentViva = await VivaEvaluation.findOne({
      student: studentUser._id,
      experiment: experimentId,
      isCurrent: true,
      active: true
    });

    if (!currentViva) {
      throw new AppError('Cannot request re-evaluation before an initial Viva has been evaluated', 400);
    }

    // Check if student already has a pending re-evaluation request
    const existingPending = await ReevaluationRequest.findOne({
      student: studentUser._id,
      experiment: experimentId,
      status: 'PENDING',
      active: true
    });

    if (existingPending) {
      throw new AppError('A pending re-evaluation request already exists for this experiment', 400);
    }

    const reevalRequest = await ReevaluationRequest.create({
      student: studentUser._id,
      experiment: experimentId,
      lab: lab._id,
      section: section._id,
      vivaEvaluation: currentViva._id,
      reason: reason.trim(),
      status: 'PENDING',
      requestedAt: new Date(),
      active: true
    });

    return await ReevaluationRequest.findById(reevalRequest._id)
      .populate('student', 'name rollNumber section')
      .populate('experiment', 'title experimentNumber')
      .populate('vivaEvaluation');
  }

  /**
   * Get student's latest re-evaluation request for an experiment
   */
  async getStudentReevaluationRequest(experimentId, studentUser) {
    await vivaService.validateStudentExperimentAccess(studentUser, experimentId);

    return await ReevaluationRequest.findOne({
      student: studentUser._id,
      experiment: experimentId,
      active: true
    })
      .sort({ requestedAt: -1 })
      .populate('reviewedBy', 'name rollNumber')
      .populate('vivaEvaluation')
      .populate('newVivaEvaluation');
  }

  /**
   * Get all re-evaluation requests for a laboratory (Faculty view)
   */
  async getLabReevaluationRequests(labId, experimentId, facultyUser) {
    await vivaService.validateFacultyAccess(facultyUser, labId);

    const query = { lab: labId, active: true };
    if (experimentId) {
      query.experiment = experimentId;
    }

    return await ReevaluationRequest.find(query)
      .sort({ requestedAt: -1 })
      .populate('student', 'name rollNumber section')
      .populate('experiment', 'title experimentNumber')
      .populate('vivaEvaluation')
      .populate('reviewedBy', 'name rollNumber')
      .populate('newVivaEvaluation');
  }

  /**
   * Get single re-evaluation request by ID
   */
  async getReevaluationRequestById(requestId, user) {
    const request = await ReevaluationRequest.findById(requestId)
      .populate('student', 'name rollNumber section')
      .populate('experiment', 'title experimentNumber')
      .populate('lab', 'name code')
      .populate('section', 'name sectionCode')
      .populate('vivaEvaluation')
      .populate('reviewedBy', 'name rollNumber')
      .populate('newVivaEvaluation');

    if (!request || !request.active) {
      throw new AppError('Re-evaluation request not found', 404);
    }

    if (user.role === 'STUDENT') {
      const studentId = (request.student?._id || request.student)?.toString();
      if (studentId !== user._id.toString()) {
        throw new AppError('You are not authorized to view another student\'s re-evaluation request', 403);
      }
    } else {
      const labId = request.lab?._id || request.lab;
      const sectionId = request.section?._id || request.section;
      await vivaService.validateFacultyAccess(user, labId, sectionId);
    }

    return request;
  }

  /**
   * Authorized faculty reviews and processes a re-evaluation request
   */
  async processReevaluationRequest(requestId, { action, reviewRemarks, marks, remarks }, facultyUser) {
    const request = await ReevaluationRequest.findById(requestId)
      .populate('student')
      .populate('experiment')
      .populate('lab')
      .populate('section')
      .populate('vivaEvaluation');

    if (!request || !request.active) {
      throw new AppError('Re-evaluation request not found', 404);
    }

    if (request.status !== 'PENDING') {
      throw new AppError(`Cannot process request that is already ${request.status}`, 400);
    }

    const studentId = request.student?._id || request.student;
    const experimentId = request.experiment?._id || request.experiment;
    const labId = request.lab?._id || request.lab;
    const sectionId = request.section?._id || request.section;

    // Verify faculty assignment for this specific lab & section
    await vivaService.validateFacultyAccess(facultyUser, labId, sectionId);

    if (action === 'REJECT') {
      request.status = 'REJECTED';
      request.reviewedBy = facultyUser._id;
      request.reviewedAt = new Date();
      request.reviewRemarks = reviewRemarks || 'Re-evaluation request declined upon faculty review.';
      await request.save();

      return {
        request: await this.getReevaluationRequestById(request._id, facultyUser),
        newVivaEvaluation: null
      };
    }

    if (action === 'APPROVE') {
      // Find current active viva evaluation to supersede
      const previousViva = await VivaEvaluation.findOne({
        student: studentId,
        experiment: experimentId,
        isCurrent: true,
        active: true
      });

      const nextVersion = previousViva ? previousViva.evaluationVersion + 1 : 2;

      // Mark previous evaluation as not current (preserves historical record)
      if (previousViva) {
        previousViva.isCurrent = false;
        await previousViva.save();
      }

      // Create new immutable re-evaluation record
      const newViva = await VivaEvaluation.create({
        student: studentId,
        experiment: experimentId,
        lab: labId,
        section: sectionId,
        evaluatedBy: facultyUser._id,
        marks: Math.round(Number(marks) * 100) / 100,
        remarks: remarks || `Re-evaluated score upon review.`,
        status: 'RE_EVALUATED',
        evaluationVersion: nextVersion,
        isCurrent: true,
        reevaluationRequest: request._id,
        evaluatedAt: new Date(),
        active: true
      });

      // Update request status to COMPLETED
      request.status = 'COMPLETED';
      request.reviewedBy = facultyUser._id;
      request.reviewedAt = new Date();
      request.reviewRemarks = reviewRemarks || 'Re-evaluation completed successfully.';
      request.newVivaEvaluation = newViva._id;
      await request.save();

      const populatedNewViva = await VivaEvaluation.findById(newViva._id)
        .populate('student', 'name rollNumber section')
        .populate('evaluatedBy', 'name rollNumber')
        .populate('experiment', 'title experimentNumber');

      return {
        request: await this.getReevaluationRequestById(request._id, facultyUser),
        newVivaEvaluation: populatedNewViva
      };
    }

    throw new AppError('Invalid action provided', 400);
  }
}

module.exports = new ReevaluationService();
