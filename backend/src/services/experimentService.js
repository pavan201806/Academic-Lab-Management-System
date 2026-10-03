const { Experiment, Lab, LabAssignment, Section, User } = require('../models');
const pdfExtractionService = require('./pdfExtractionService');
const AppError = require('../utils/appError');

class ExperimentService {
  /**
   * Centralized access-control check ensuring strict lab and section authorization
   * @param {string} labId - Target Laboratory ObjectId
   * @param {object} user - Authenticated User from JWT
   * @param {'READ'|'WRITE'} requiredPermission - Operation permission level
   */
  async checkLabAccess(labId, user, requiredPermission = 'READ') {
    if (!user || !user.active) {
      throw new AppError('User account is inactive or invalid', 403);
    }

    const lab = await Lab.findById(labId);
    if (!lab) {
      throw new AppError('Laboratory not found', 404);
    }

    // ADMIN_HOD has universal academic oversight
    if (user.role === 'ADMIN_HOD') {
      return lab;
    }

    // Students CANNOT perform write or modification actions
    if (user.role === 'STUDENT') {
      if (requiredPermission === 'WRITE') {
        throw new AppError('Students are not authorized to author or modify laboratory experiments', 403);
      }

      // Check student section enrollment and active lab assignment
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

      if (!lab.active) {
        throw new AppError('This laboratory is deactivated', 403);
      }

      const assignment = await LabAssignment.findOne({
        lab: lab._id,
        section: section._id,
        active: true
      });

      if (!assignment) {
        throw new AppError('This laboratory is not assigned to your academic section', 403);
      }

      return lab;
    }

    // TEACHER access validation
    if (user.role === 'TEACHER') {
      if (!lab.active && requiredPermission === 'WRITE') {
        throw new AppError('Cannot modify experiments in a deactivated laboratory', 403);
      }

      const teacherAssignments = await LabAssignment.find({
        lab: lab._id,
        teacher: user._id,
        active: true
      });

      if (teacherAssignments.length === 0) {
        throw new AppError('You do not have an active faculty assignment for this laboratory', 403);
      }

      return lab;
    }

    throw new AppError('Unauthorized role access', 403);
  }

  /**
   * Retrieve experiments for a lab with role-aware visibility filters
   */
  async getExperiments(labId, user, filter = {}) {
    await this.checkLabAccess(labId, user, 'READ');

    const query = { lab: labId, active: true };

    // Students can ONLY view published, closed, or reopened experiments (never DRAFT or SCHEDULED)
    if (user.role === 'STUDENT') {
      query.status = { $in: ['PUBLISHED', 'CLOSED', 'REOPENED'] };
    } else if (filter.status) {
      query.status = filter.status;
    }

    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [{ title: regex }, { objective: regex }, { description: regex }];
    }

    const experiments = await Experiment.find(query)
      .populate('createdBy', 'name rollNumber role')
      .sort({ order: 1, experimentNumber: 1 });

    return experiments;
  }

  /**
   * Retrieve a single experiment by ID with strict access control
   */
  async getExperimentById(experimentId, user) {
    const experiment = await Experiment.findById(experimentId).populate('lab', 'name code subject department academicYear semester active');
    if (!experiment) {
      throw new AppError('Experiment not found', 404);
    }

    await this.checkLabAccess(experiment.lab._id, user, 'READ');

    // Students cannot view draft or scheduled experiments
    if (user.role === 'STUDENT') {
      if (!['PUBLISHED', 'CLOSED', 'REOPENED'].includes(experiment.status)) {
        throw new AppError('This experiment is not currently accessible to students', 403);
      }
      if (!experiment.active) {
        throw new AppError('This experiment is deactivated', 403);
      }
    }

    return experiment;
  }

  /**
   * Manual creation of an experiment
   */
  async createExperiment(data, user) {
    await this.checkLabAccess(data.lab, user, 'WRITE');

    const expNum = parseInt(data.experimentNumber, 10);
    if (isNaN(expNum) || expNum < 1 || expNum > 12) {
      throw new AppError('Experiment number must be an integer between 1 and 12', 400);
    }

    // Check maximum 12 experiments per lab limit
    const existingCount = await Experiment.countDocuments({
      lab: data.lab,
      active: true
    });

    if (existingCount >= 12) {
      throw new AppError('This laboratory already contains the maximum limit of 12 experiments', 400);
    }

    // Check duplicate experimentNumber in the same lab
    const duplicateNumber = await Experiment.findOne({
      lab: data.lab,
      experimentNumber: expNum,
      active: true
    });

    if (duplicateNumber) {
      throw new AppError(`Experiment number ${expNum} already exists in this laboratory`, 409);
    }

    // Validate programming languages
    if (data.programmingLanguages) {
      if (!Array.isArray(data.programmingLanguages) || data.programmingLanguages.length === 0) {
        throw new AppError('At least one programming language must be selected', 400);
      }
      const allowedLangs = ['C', 'C++', 'Java', 'Python'];
      for (const lang of data.programmingLanguages) {
        if (!allowedLangs.includes(lang)) {
          throw new AppError(`Invalid programming language '${lang}'. Allowed languages: ${allowedLangs.join(', ')}`, 400);
        }
      }
    }

    const orderNum = data.order ? parseInt(data.order, 10) : expNum;

    const experiment = await Experiment.create({
      lab: data.lab,
      title: data.title.trim(),
      experimentNumber: expNum,
      description: data.description ? data.description.trim() : '',
      objective: data.objective ? data.objective.trim() : '',
      instructions: data.instructions ? data.instructions.trim() : '',
      programmingLanguages: data.programmingLanguages || ['C', 'C++', 'Java', 'Python'],
      status: data.status || 'DRAFT',
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      deadline: data.deadline ? new Date(data.deadline) : null,
      order: orderNum,
      publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
      createdBy: user._id
    });

    return experiment;
  }

  /**
   * Edit experiment metadata and instructions
   */
  async updateExperiment(experimentId, data, user) {
    const experiment = await Experiment.findById(experimentId);
    if (!experiment) {
      throw new AppError('Experiment not found', 404);
    }

    await this.checkLabAccess(experiment.lab, user, 'WRITE');

    // Check experiment number uniqueness if changed
    if (data.experimentNumber !== undefined) {
      const newExpNum = parseInt(data.experimentNumber, 10);
      if (newExpNum !== experiment.experimentNumber) {
        if (newExpNum < 1 || newExpNum > 12) {
          throw new AppError('Experiment number must be between 1 and 12', 400);
        }

        const duplicate = await Experiment.findOne({
          lab: experiment.lab,
          experimentNumber: newExpNum,
          active: true,
          _id: { $ne: experimentId }
        });

        if (duplicate) {
          throw new AppError(`Experiment number ${newExpNum} already exists in this laboratory`, 409);
        }
        experiment.experimentNumber = newExpNum;
      }
    }

    if (data.programmingLanguages !== undefined) {
      if (!Array.isArray(data.programmingLanguages) || data.programmingLanguages.length === 0) {
        throw new AppError('At least one programming language must be selected', 400);
      }
      const allowedLangs = ['C', 'C++', 'Java', 'Python'];
      for (const lang of data.programmingLanguages) {
        if (!allowedLangs.includes(lang)) {
          throw new AppError(`Invalid programming language '${lang}'. Allowed languages: ${allowedLangs.join(', ')}`, 400);
        }
      }
      experiment.programmingLanguages = data.programmingLanguages;
    }

    if (data.title) experiment.title = data.title.trim();
    if (data.description !== undefined) experiment.description = data.description.trim();
    if (data.objective !== undefined) experiment.objective = data.objective.trim();
    if (data.instructions !== undefined) experiment.instructions = data.instructions.trim();
    if (data.programmingLanguages && Array.isArray(data.programmingLanguages)) {
      experiment.programmingLanguages = data.programmingLanguages;
    }
    if (data.order !== undefined) experiment.order = parseInt(data.order, 10);
    if (data.scheduledAt !== undefined) {
      experiment.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
    }
    if (data.deadline !== undefined) {
      experiment.deadline = data.deadline ? new Date(data.deadline) : null;
    }

    await experiment.save();
    return experiment;
  }

  /**
   * Publish an experiment
   */
  async publishExperiment(experimentId, user) {
    const experiment = await Experiment.findById(experimentId);
    if (!experiment) {
      throw new AppError('Experiment not found', 404);
    }

    await this.checkLabAccess(experiment.lab, user, 'WRITE');

    if (!experiment.title || !experiment.programmingLanguages || experiment.programmingLanguages.length === 0) {
      throw new AppError('Experiment requires a valid title and programming language to be published', 400);
    }

    experiment.status = 'PUBLISHED';
    experiment.publishedAt = new Date();
    await experiment.save();
    return experiment;
  }

  /**
   * Schedule an experiment for publication
   */
  async scheduleExperiment(experimentId, scheduledAt, deadline, user) {
    const experiment = await Experiment.findById(experimentId);
    if (!experiment) {
      throw new AppError('Experiment not found', 404);
    }

    await this.checkLabAccess(experiment.lab, user, 'WRITE');

    if (!scheduledAt) {
      throw new AppError('Scheduled publication date is required', 400);
    }

    const schedDate = new Date(scheduledAt);
    if (isNaN(schedDate.getTime())) {
      throw new AppError('Invalid scheduled date format', 400);
    }

    if (deadline) {
      const deadDate = new Date(deadline);
      if (isNaN(deadDate.getTime())) {
        throw new AppError('Invalid deadline date format', 400);
      }
      if (deadDate < schedDate) {
        throw new AppError('Deadline cannot be before scheduled publication date', 400);
      }
      experiment.deadline = deadDate;
    }

    experiment.status = 'SCHEDULED';
    experiment.scheduledAt = schedDate;
    await experiment.save();
    return experiment;
  }

  /**
   * Reopen a closed or expired experiment
   */
  async reopenExperiment(experimentId, reopenedUntil, user) {
    const experiment = await Experiment.findById(experimentId);
    if (!experiment) {
      throw new AppError('Experiment not found', 404);
    }

    await this.checkLabAccess(experiment.lab, user, 'WRITE');

    if (reopenedUntil) {
      const reopenDate = new Date(reopenedUntil);
      if (isNaN(reopenDate.getTime())) {
        throw new AppError('Invalid reopenedUntil date format', 400);
      }
      if (reopenDate <= new Date()) {
        throw new AppError('Reopened deadline must be set to a future date and time', 400);
      }
      experiment.reopenedUntil = reopenDate;
    }

    experiment.status = 'REOPENED';
    await experiment.save();
    return experiment;
  }

  /**
   * Close an experiment
   */
  async closeExperiment(experimentId, user) {
    const experiment = await Experiment.findById(experimentId);
    if (!experiment) {
      throw new AppError('Experiment not found', 404);
    }

    await this.checkLabAccess(experiment.lab, user, 'WRITE');

    experiment.status = 'CLOSED';
    await experiment.save();
    return experiment;
  }

  /**
   * Reorder experiments in bulk within a lab
   */
  async reorderExperiments(labId, orders, user) {
    await this.checkLabAccess(labId, user, 'WRITE');

    if (!Array.isArray(orders) || orders.length === 0) {
      throw new AppError('An array of experiment order mappings is required', 400);
    }

    const orderIndices = new Set();
    for (const item of orders) {
      const ord = parseInt(item.order, 10);
      if (isNaN(ord) || ord < 1 || ord > 12) {
        throw new AppError('Order index must be an integer between 1 and 12', 400);
      }
      if (orderIndices.has(ord)) {
        throw new AppError(`Duplicate order index ${ord} in reorder payload`, 400);
      }
      orderIndices.add(ord);
    }

    for (const item of orders) {
      if (item.experimentId && item.order !== undefined) {
        await Experiment.findOneAndUpdate(
          { _id: item.experimentId, lab: labId, active: true },
          { order: parseInt(item.order, 10) }
        );
      }
    }

    return await this.getExperiments(labId, user);
  }

  /**
   * Soft deactivation preserving document and history
   */
  async toggleActive(experimentId, active, user) {
    const experiment = await Experiment.findById(experimentId);
    if (!experiment) {
      throw new AppError('Experiment not found', 404);
    }

    await this.checkLabAccess(experiment.lab, user, 'WRITE');

    experiment.active = active;
    await experiment.save();
    return experiment;
  }

  /**
   * Extract experiments from uploaded PDF buffer without persisting
   * @param {string} labId
   * @param {Buffer} fileBuffer
   * @param {string} fileName
   * @param {number} fileSize
   * @param {object} user
   * @returns {Promise<object>}
   */
  async extractExperimentsFromPdf(labId, fileBuffer, fileName, fileSize, user) {
    const lab = await this.checkLabAccess(labId, user, 'WRITE');

    if (!fileBuffer) {
      throw new AppError('No PDF file provided for extraction', 400);
    }

    const { text, numPages } = await pdfExtractionService.extractTextFromPdf(fileBuffer);
    const extractedExperiments = pdfExtractionService.parseExperimentsFromText(text);

    // Get current active experiment count in lab
    const currentActiveCount = await Experiment.countDocuments({
      lab: labId,
      active: true
    });

    const existingExperiments = await Experiment.find({
      lab: labId,
      active: true
    }).select('experimentNumber title');

    return {
      fileName: fileName || 'uploaded_manual.pdf',
      fileSize: fileSize || fileBuffer.length,
      numPages,
      totalExtracted: extractedExperiments.length,
      currentActiveCount,
      remainingCapacity: Math.max(0, 12 - currentActiveCount),
      existingExperiments,
      experiments: extractedExperiments
    };
  }

  /**
   * Batch confirm and persist reviewed experiments from PDF extraction
   * @param {string} labId
   * @param {Array<object>} experimentsData
   * @param {object} user
   * @returns {Promise<Array<object>>}
   */
  async confirmExtractedExperiments(labId, experimentsData, user) {
    const lab = await this.checkLabAccess(labId, user, 'WRITE');

    if (!Array.isArray(experimentsData) || experimentsData.length === 0) {
      throw new AppError('No experiments provided for confirmation', 400);
    }

    if (experimentsData.length > 12) {
      throw new AppError('Cannot create more than 12 experiments', 400);
    }

    // Check active experiment count limit
    const currentActiveCount = await Experiment.countDocuments({
      lab: labId,
      active: true
    });

    if (currentActiveCount + experimentsData.length > 12) {
      throw new AppError(
        `Adding ${experimentsData.length} experiments would exceed the laboratory maximum limit of 12 (Current active: ${currentActiveCount})`,
        400
      );
    }

    // Check duplicate numbers inside incoming batch
    const incomingNumbers = new Set();
    for (const item of experimentsData) {
      const num = parseInt(item.experimentNumber, 10);
      if (isNaN(num) || num < 1 || num > 12) {
        throw new AppError(`Invalid experiment number ${item.experimentNumber}. Must be between 1 and 12`, 400);
      }
      if (incomingNumbers.has(num)) {
        throw new AppError(`Duplicate experiment number ${num} found in confirmation list`, 400);
      }
      incomingNumbers.add(num);
    }

    // Check against existing active experiment numbers in DB
    const existingActiveExperiments = await Experiment.find({
      lab: labId,
      active: true,
      experimentNumber: { $in: Array.from(incomingNumbers) }
    });

    if (existingActiveExperiments.length > 0) {
      const conflicting = existingActiveExperiments.map((e) => e.experimentNumber).join(', ');
      throw new AppError(
        `Experiment number(s) ${conflicting} already exist in this laboratory. Please edit the numbers before confirming.`,
        409
      );
    }

    // Pre-validate all experiment items before creation
    const docsToCreate = experimentsData.map((item) => {
      const expNum = parseInt(item.experimentNumber, 10);
      const orderNum = item.order ? parseInt(item.order, 10) : expNum;

      return {
        lab: labId,
        title: item.title.trim(),
        experimentNumber: expNum,
        description: item.description ? item.description.trim() : '',
        objective: item.objective ? item.objective.trim() : '',
        instructions: item.instructions ? item.instructions.trim() : '',
        programmingLanguages:
          item.programmingLanguages && Array.isArray(item.programmingLanguages) && item.programmingLanguages.length > 0
            ? item.programmingLanguages
            : ['C', 'C++', 'Java', 'Python'],
        status: 'DRAFT',
        order: orderNum,
        active: true,
        createdBy: user._id
      };
    });

    // Create all experiment documents
    const createdDocs = await Experiment.insertMany(docsToCreate);

    return createdDocs;
  }
}

module.exports = new ExperimentService();
