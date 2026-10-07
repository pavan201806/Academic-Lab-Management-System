const mongoose = require('mongoose');
const {
  Lab,
  LabAssignment,
  Section,
  User,
  Experiment,
  TestCase,
  Submission,
  Evaluation,
  VivaEvaluation,
  ReevaluationRequest,
  Notification
} = require('../models');
const AppError = require('../utils/appError');

class LabService {
  /**
   * Admin-level query to retrieve all labs with query filtering
   */
  async getLabs(filter = {}) {
    const query = {};

    if (filter.active !== undefined) {
      query.active = filter.active === 'true' || filter.active === true;
    }

    if (filter.academicYear) {
      query.academicYear = filter.academicYear;
    }

    if (filter.semester) {
      query.semester = filter.semester;
    }

    if (filter.department) {
      query.department = filter.department;
    }

    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [{ name: regex }, { code: regex }, { subject: regex }, { department: regex }];
    }

    const labs = await Lab.find(query).sort({ code: 1 });

    // Attach assignment metadata for each lab
    const labsWithAssignments = await Promise.all(
      labs.map(async (lab) => {
        const assignments = await LabAssignment.find({ lab: lab._id, active: true })
          .populate('section', 'name sectionCode academicYear semester department')
          .populate('teacher', 'name rollNumber');

        const labObj = lab.toJSON();
        labObj.assignments = assignments;
        labObj.assignedSectionsCount = new Set(assignments.map((a) => a.section?._id?.toString())).size;
        labObj.assignedTeachersCount = new Set(assignments.map((a) => a.teacher?._id?.toString())).size;
        return labObj;
      })
    );

    return labsWithAssignments;
  }

  /**
   * Role-aware lab assignment retrieval
   * - ADMIN_HOD: returns all labs with assignments
   * - TEACHER: returns active labs assigned to the authenticated teacher (MAIN & ASSISTANT)
   * - STUDENT: returns active labs assigned to the student's active section
   */
  async getAssignedLabs(user) {
    if (!user || !user.active) {
      throw new AppError('User account is inactive or invalid', 403);
    }

    if (user.role === 'ADMIN_HOD') {
      return await this.getLabs({ active: true });
    }

    if (user.role === 'TEACHER') {
      // Find all active assignments for this teacher
      const assignments = await LabAssignment.find({
        teacher: user._id,
        active: true
      })
        .populate('lab')
        .populate('section')
        .sort({ createdAt: -1 });

      // Filter to only include assignments where both lab and section are active
      const validAssignments = assignments.filter(
        (a) => a.lab && a.lab.active && a.section && a.section.active
      );

      // Return formatted teacher lab cards with assignment metadata
      return validAssignments.map((assignment) => {
        const lab = assignment.lab;
        const section = assignment.section;
        return {
          _id: lab._id,
          labId: lab._id,
          name: lab.name,
          code: lab.code,
          subject: lab.subject,
          department: lab.department,
          academicYear: lab.academicYear,
          semester: lab.semester,
          description: lab.description,
          active: lab.active,
          assignmentId: assignment._id,
          assignmentType: assignment.assignmentType, // MAIN or ASSISTANT
          assignedAt: assignment.assignedAt,
          section: {
            _id: section._id,
            name: section.name,
            sectionCode: section.sectionCode,
            academicYear: section.academicYear,
            semester: section.semester,
            department: section.department
          }
        };
      });
    }

    if (user.role === 'STUDENT') {
      if (!user.section) {
        return [];
      }

      // Look up student's active section
      const section = await Section.findOne({
        sectionCode: user.section.toUpperCase(),
        active: true
      });

      if (!section) {
        return [];
      }

      // Find all active lab assignments for this student's section
      const assignments = await LabAssignment.find({
        section: section._id,
        active: true
      })
        .populate('lab')
        .populate('teacher', 'name rollNumber');

      // Filter for active labs and group assignments by lab
      const activeAssignments = assignments.filter((a) => a.lab && a.lab.active);

      const labMap = new Map();

      for (const a of activeAssignments) {
        const labIdStr = a.lab._id.toString();
        if (!labMap.has(labIdStr)) {
          labMap.set(labIdStr, {
            _id: a.lab._id,
            labId: a.lab._id,
            name: a.lab.name,
            code: a.lab.code,
            subject: a.lab.subject,
            department: a.lab.department,
            academicYear: a.lab.academicYear,
            semester: a.lab.semester,
            description: a.lab.description,
            active: a.lab.active,
            section: {
              _id: section._id,
              name: section.name,
              sectionCode: section.sectionCode,
              academicYear: section.academicYear,
              semester: section.semester,
              department: section.department
            },
            teachers: []
          });
        }

        if (a.teacher) {
          labMap.get(labIdStr).teachers.push({
            _id: a.teacher._id,
            name: a.teacher.name,
            rollNumber: a.teacher.rollNumber,
            assignmentType: a.assignmentType
          });
        }
      }

      return Array.from(labMap.values());
    }

    throw new AppError('Unauthorized role access', 403);
  }

  /**
   * Role-aware lab details retrieval enforcing strict IDOR protection & section-specific authorization
   * @param {string} id - Lab ID
   * @param {object} user - Authenticated User object from JWT
   * @param {object} [options] - Optional section context ({ sectionId, sectionCode })
   */
  async getLabDetailsForUser(id, user, options = {}) {
    if (!user || !user.active) {
      throw new AppError('User account is inactive or invalid', 403);
    }

    const lab = await Lab.findById(id);
    if (!lab) {
      throw new AppError('Laboratory not found', 404);
    }

    // ADMIN_HOD has administrative access to any lab
    if (user.role === 'ADMIN_HOD') {
      const assignmentQuery = { lab: lab._id, active: true };
      if (options.sectionId) {
        assignmentQuery.section = options.sectionId;
      }

      const assignments = await LabAssignment.find(assignmentQuery)
        .populate('section', 'name sectionCode academicYear semester department active')
        .populate('teacher', 'name rollNumber role active');

      const labObj = lab.toJSON();
      labObj.assignments = assignments;
      return labObj;
    }

    // Inactive labs cannot be accessed by teachers or students
    if (!lab.active) {
      throw new AppError('This laboratory is deactivated and unavailable for access', 403);
    }

    // TEACHER access validation
    if (user.role === 'TEACHER') {
      // Find all active assignments for this teacher in this lab
      const teacherAssignments = await LabAssignment.find({
        lab: lab._id,
        teacher: user._id,
        active: true
      }).populate('section');

      const activeTeacherAssignments = teacherAssignments.filter(
        (a) => a.section && a.section.active
      );

      if (activeTeacherAssignments.length === 0) {
        throw new AppError('You do not have an active faculty assignment for this laboratory', 403);
      }

      // If a specific section context was requested (by sectionId or sectionCode),
      // verify the teacher has an active assignment for that specific section.
      if (options.sectionId || options.sectionCode) {
        const matchingAssignment = activeTeacherAssignments.find((a) => {
          if (options.sectionId && a.section._id.toString() === options.sectionId.toString()) {
            return true;
          }
          if (options.sectionCode && a.section.sectionCode?.toUpperCase() === options.sectionCode.toUpperCase()) {
            return true;
          }
          return false;
        });

        if (!matchingAssignment) {
          throw new AppError(
            'You do not have an active faculty assignment for this specific section in this laboratory',
            403
          );
        }

        // Fetch cohort assignments for this specific section
        const sectionCohortAssignments = await LabAssignment.find({
          lab: lab._id,
          section: matchingAssignment.section._id,
          active: true
        })
          .populate('section', 'name sectionCode academicYear semester department')
          .populate('teacher', 'name rollNumber role');

        const labObj = lab.toJSON();
        labObj.currentSection = matchingAssignment.section;
        labObj.myAssignment = {
          assignmentId: matchingAssignment._id,
          assignmentType: matchingAssignment.assignmentType,
          section: matchingAssignment.section
        };
        labObj.cohortAssignments = sectionCohortAssignments;
        labObj.assignedSections = activeTeacherAssignments.map((a) => a.section);
        return labObj;
      }

      // If no section context specified, return all sections the teacher is assigned to for this lab
      const sectionIds = activeTeacherAssignments.map((a) => a.section._id);

      const allCohortAssignments = await LabAssignment.find({
        lab: lab._id,
        section: { $in: sectionIds },
        active: true
      })
        .populate('section', 'name sectionCode academicYear semester department')
        .populate('teacher', 'name rollNumber role');

      const labObj = lab.toJSON();
      labObj.myAssignments = activeTeacherAssignments.map((a) => ({
        assignmentId: a._id,
        assignmentType: a.assignmentType,
        section: a.section
      }));
      labObj.cohortAssignments = allCohortAssignments;
      labObj.assignedSections = activeTeacherAssignments.map((a) => a.section);
      return labObj;
    }

    // STUDENT access validation
    if (user.role === 'STUDENT') {
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

      // If student requested a different section context, reject it (cannot access another section's lab)
      if (options.sectionId && options.sectionId.toString() !== section._id.toString()) {
        throw new AppError('You cannot access laboratory details for a section other than your own enrolled section', 403);
      }
      if (options.sectionCode && options.sectionCode.toUpperCase() !== section.sectionCode.toUpperCase()) {
        throw new AppError('You cannot access laboratory details for a section other than your own enrolled section', 403);
      }

      const sectionAssignments = await LabAssignment.find({
        lab: lab._id,
        section: section._id,
        active: true
      }).populate('teacher', 'name rollNumber');

      if (sectionAssignments.length === 0) {
        throw new AppError('This laboratory is not assigned to your academic section', 403);
      }

      const labObj = lab.toJSON();
      labObj.enrolledSection = {
        _id: section._id,
        name: section.name,
        sectionCode: section.sectionCode,
        academicYear: section.academicYear,
        semester: section.semester,
        department: section.department
      };
      labObj.instructors = sectionAssignments.map((a) => ({
        _id: a.teacher?._id,
        name: a.teacher?.name,
        rollNumber: a.teacher?.rollNumber,
        assignmentType: a.assignmentType
      }));

      return labObj;
    }

    throw new AppError('Unauthorized access', 403);
  }

  async getLabById(id) {
    const lab = await Lab.findById(id);
    if (!lab) {
      throw new AppError('Laboratory not found', 404);
    }

    const assignments = await LabAssignment.find({ lab: lab._id, active: true })
      .populate('section', 'name sectionCode academicYear semester department')
      .populate('teacher', 'name rollNumber role');

    const labObj = lab.toJSON();
    labObj.assignments = assignments;
    return labObj;
  }

  async createLab(data) {
    const normalizedCode = data.code.trim().toUpperCase();

    const existingLab = await Lab.findOne({ code: normalizedCode });
    if (existingLab) {
      throw new AppError(`Laboratory with code '${normalizedCode}' already exists`, 409);
    }

    const lab = await Lab.create({
      ...data,
      code: normalizedCode
    });

    return lab;
  }

  async updateLab(id, data) {
    const lab = await Lab.findById(id);
    if (!lab) {
      throw new AppError('Laboratory not found', 404);
    }

    if (data.code && data.code.toUpperCase() !== lab.code) {
      const normalizedCode = data.code.trim().toUpperCase();
      const duplicate = await Lab.findOne({ code: normalizedCode });
      if (duplicate && duplicate._id.toString() !== id) {
        throw new AppError(`Laboratory with code '${normalizedCode}' already exists`, 409);
      }
      lab.code = normalizedCode;
    }

    if (data.name) lab.name = data.name;
    if (data.subject) lab.subject = data.subject;
    if (data.department) lab.department = data.department;
    if (data.academicYear) lab.academicYear = data.academicYear;
    if (data.semester) lab.semester = data.semester;
    if (data.description !== undefined) lab.description = data.description;
    if (data.active !== undefined) lab.active = data.active;

    await lab.save();
    return lab;
  }

  async toggleActive(id, active) {
    const lab = await Lab.findById(id);
    if (!lab) {
      throw new AppError('Laboratory not found', 404);
    }

    lab.active = active;
    await lab.save();
    return lab;
  }

  /**
   * Pre-deletion inspection determining whether a laboratory can be safely deleted
   * or if permanent deletion is blocked due to existing student academic history.
   */
  async getLabDeletionStatus(id) {
    const lab = await Lab.findById(id);
    if (!lab) {
      throw new AppError('Laboratory not found', 404);
    }

    // 1. Find all experiments for this lab
    const experiments = await Experiment.find({ lab: lab._id });
    const experimentIds = experiments.map((e) => e._id);

    // 2. Count test cases belonging to these experiments
    const testCasesCount = await TestCase.countDocuments({
      experiment: { $in: experimentIds }
    });

    // 3. Count teacher assignments for this lab
    const assignmentsCount = await LabAssignment.countDocuments({ lab: lab._id });

    // 4. Count student academic records (submissions, evaluations, viva, re-evaluation)
    const submissionsCount = await Submission.countDocuments({
      $or: [{ lab: lab._id }, { experiment: { $in: experimentIds } }]
    });

    const evaluationsCount = await Evaluation.countDocuments({
      $or: [{ lab: lab._id }, { experiment: { $in: experimentIds } }]
    });

    const vivaEvaluationsCount = await VivaEvaluation.countDocuments({
      $or: [{ lab: lab._id }, { experiment: { $in: experimentIds } }]
    });

    const reevaluationRequestsCount = await ReevaluationRequest.countDocuments({
      $or: [{ lab: lab._id }, { experiment: { $in: experimentIds } }]
    });

    const hasAcademicHistory =
      submissionsCount > 0 ||
      evaluationsCount > 0 ||
      vivaEvaluationsCount > 0 ||
      reevaluationRequestsCount > 0;

    return {
      labId: lab._id,
      name: lab.name,
      code: lab.code,
      active: lab.active,
      canDelete: !hasAcademicHistory,
      hasAcademicHistory,
      reason: hasAcademicHistory ? 'ACADEMIC_HISTORY_EXISTS' : 'SAFE_TO_DELETE',
      experiments: experiments.length,
      experimentsCount: experiments.length,
      testCases: testCasesCount,
      testCasesCount: testCasesCount,
      assignments: assignmentsCount,
      assignmentsCount: assignmentsCount,
      submissions: submissionsCount,
      submissionsCount: submissionsCount,
      evaluations: evaluationsCount,
      evaluationsCount: evaluationsCount,
      vivaEvaluations: vivaEvaluationsCount,
      vivaEvaluationsCount: vivaEvaluationsCount,
      reevaluationRequests: reevaluationRequestsCount,
      reevaluationRequestsCount: reevaluationRequestsCount
    };
  }

  /**
   * Safe permanent laboratory deletion with academic history protection
   */
  async deleteLab(id) {
    const lab = await Lab.findById(id);
    if (!lab) {
      throw new AppError('Laboratory not found', 404);
    }

    const status = await this.getLabDeletionStatus(id);

    // CRITICAL SAFETY RULE: Never delete a lab that contains student academic history
    if (status.hasAcademicHistory) {
      const err = new AppError(
        `This laboratory cannot be permanently deleted because academic history exists (${status.submissions} Submissions, ${status.evaluations} Evaluations, ${status.vivaEvaluations} Viva Evaluations, ${status.reevaluationRequests} Re-evaluation Requests). Please archive/deactivate it instead.`,
        400
      );
      err.dependencies = {
        experiments: status.experiments,
        submissions: status.submissions,
        evaluations: status.evaluations,
        vivaEvaluations: status.vivaEvaluations,
        reevaluationRequests: status.reevaluationRequests
      };
      throw err;
    }

    let session = null;
    let useTransaction = false;

    // Attempt MongoDB transaction if supported in current environment
    try {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      }
    } catch (_) {
      session = null;
      useTransaction = false;
    }

    try {
      const opts = useTransaction && session ? { session } : {};

      // 1. Find all experiments for this lab
      const experiments = await Experiment.find({ lab: lab._id });
      const experimentIds = experiments.map((e) => e._id);

      // 2. Cascade delete lab-owned test cases
      if (experimentIds.length > 0) {
        await TestCase.deleteMany({ experiment: { $in: experimentIds } }, opts);
      }

      // 3. Cascade delete lab-owned experiments
      await Experiment.deleteMany({ lab: lab._id }, opts);

      // 4. Cascade delete lab assignments
      await LabAssignment.deleteMany({ lab: lab._id }, opts);

      // 5. Clean up notification targeting references
      if (Notification) {
        await Notification.updateMany(
          { targetLabs: lab._id },
          { $pull: { targetLabs: lab._id } },
          opts
        );
      }

      // 6. Delete the Lab document itself
      await Lab.deleteOne({ _id: lab._id }, opts);

      if (useTransaction && session) {
        await session.commitTransaction();
      }

      return {
        success: true,
        message: `Laboratory '${lab.name}' (${lab.code}) and lab-specific configuration have been permanently deleted. Shared academic resources and student records were preserved.`,
        deletedLab: {
          _id: lab._id,
          name: lab.name,
          code: lab.code
        },
        cascadeSummary: {
          experimentsRemoved: experiments.length,
          testCasesRemoved: status.testCases,
          assignmentsRemoved: status.assignments
        }
      };
    } catch (err) {
      if (useTransaction && session) {
        try {
          await session.abortTransaction();
        } catch (_) {}
      }
      throw err;
    } finally {
      if (session) {
        try {
          await session.endSession();
        } catch (_) {}
      }
    }
  }
  /**
   * Retrieves student performance and cohort summary for a specific laboratory
   * Enforces strict faculty assignment IDOR verification and supports section filtering
   * Uses batch database queries to prevent N+1 performance issues
   */
  async getLabStudentsPerformance(labId, user, options = {}) {
    if (!user || !user.active) {
      throw new AppError('User account is inactive or invalid', 403);
    }

    if (user.role === 'STUDENT') {
      throw new AppError('Students are not authorized to access laboratory student performance', 403);
    }

    const lab = await Lab.findById(labId);
    if (!lab) {
      throw new AppError('Laboratory not found', 404);
    }

    let authorizedSections = [];

    if (user.role === 'TEACHER') {
      const teacherAssignments = await LabAssignment.find({
        lab: lab._id,
        teacher: user._id,
        active: true
      }).populate('section');

      const activeTeacherAssignments = teacherAssignments.filter(
        (a) => a.section && a.section.active
      );

      if (activeTeacherAssignments.length === 0) {
        throw new AppError('You do not have an active faculty assignment for this laboratory', 403);
      }

      authorizedSections = activeTeacherAssignments.map((a) => a.section);

      // Section filtering if specified
      if (options.sectionId || options.section) {
        const matchingSection = authorizedSections.find((s) => {
          if (options.sectionId && s._id.toString() === options.sectionId.toString()) return true;
          if (options.section && s.sectionCode?.toUpperCase() === options.section.toUpperCase()) return true;
          return false;
        });

        if (!matchingSection) {
          throw new AppError(
            'You do not have an active faculty assignment for this section in this laboratory',
            403
          );
        }

        authorizedSections = [matchingSection];
      }
    } else if (user.role === 'ADMIN_HOD') {
      const assignmentQuery = { lab: lab._id, active: true };
      if (options.sectionId) {
        assignmentQuery.section = options.sectionId;
      }

      const assignments = await LabAssignment.find(assignmentQuery).populate('section');
      let sections = assignments.map((a) => a.section).filter((s) => s && s.active);

      if (options.section) {
        sections = sections.filter(
          (s) => s.sectionCode?.toUpperCase() === options.section.toUpperCase()
        );
      }

      // Deduplicate sections
      const seenSecIds = new Set();
      authorizedSections = sections.filter((s) => {
        const idStr = s._id.toString();
        if (seenSecIds.has(idStr)) return false;
        seenSecIds.add(idStr);
        return true;
      });
    }

    const sectionCodes = [...new Set(authorizedSections.map((s) => s.sectionCode?.toUpperCase()).filter(Boolean))];

    // Fetch active experiments for this lab
    const experiments = await Experiment.find({ lab: lab._id, active: true }).sort({
      experimentNumber: 1,
      order: 1
    });
    const totalExperiments = experiments.length;
    const expIds = experiments.map((e) => e._id);

    // If no sections assigned to lab, return empty performance structure
    if (sectionCodes.length === 0) {
      return {
        lab: {
          _id: lab._id,
          id: lab._id,
          name: lab.name,
          code: lab.code,
          subject: lab.subject,
          department: lab.department,
          semester: lab.semester,
          academicYear: lab.academicYear
        },
        availableSections: [],
        summary: {
          totalStudents: 0,
          activeStudents: 0,
          completedAll: 0,
          averageCompletion: 0,
          averageScore: null,
          pendingSubmissions: 0
        },
        students: []
      };
    }

    // Fetch students belonging to authorized section codes
    const studentQuery = {
      role: 'STUDENT',
      section: { $in: sectionCodes }
    };

    if (options.active !== undefined) {
      studentQuery.active = options.active === 'true' || options.active === true;
    }

    if (options.search) {
      const regex = new RegExp(options.search, 'i');
      studentQuery.$or = [{ name: regex }, { rollNumber: regex }];
    }

    const students = await User.find(studentQuery).sort({ rollNumber: 1 });
    const studentIds = students.map((s) => s._id);

    if (students.length === 0) {
      return {
        lab: {
          _id: lab._id,
          id: lab._id,
          name: lab.name,
          code: lab.code,
          subject: lab.subject,
          department: lab.department,
          semester: lab.semester,
          academicYear: lab.academicYear
        },
        availableSections: authorizedSections.map((s) => ({
          _id: s._id,
          name: s.name,
          sectionCode: s.sectionCode
        })),
        summary: {
          totalStudents: 0,
          activeStudents: 0,
          completedAll: 0,
          averageCompletion: 0,
          averageScore: null,
          pendingSubmissions: 0
        },
        students: []
      };
    }

    // Batch query all submissions, evaluations, and vivas for these students in this lab
    const submissions = expIds.length > 0
      ? await Submission.find({
          lab: lab._id,
          student: { $in: studentIds },
          active: true
        }).sort({ submittedAt: -1 })
      : [];

    const evaluations = expIds.length > 0
      ? await Evaluation.find({
          lab: lab._id,
          student: { $in: studentIds },
          active: true
        }).sort({ score: -1, evaluatedAt: -1 })
      : [];

    const vivas = expIds.length > 0
      ? await VivaEvaluation.find({
          lab: lab._id,
          student: { $in: studentIds },
          active: true
        })
      : [];

    // Map lookups: studentId -> experimentId -> items
    const subsMap = new Map();
    for (const sub of submissions) {
      const stuId = sub.student.toString();
      const expId = sub.experiment.toString();
      if (!subsMap.has(stuId)) subsMap.set(stuId, new Map());
      const stuSubs = subsMap.get(stuId);
      if (!stuSubs.has(expId)) stuSubs.set(expId, []);
      stuSubs.get(expId).push(sub);
    }

    const evalsMap = new Map();
    for (const ev of evaluations) {
      const stuId = ev.student.toString();
      const expId = ev.experiment.toString();
      if (!evalsMap.has(stuId)) evalsMap.set(stuId, new Map());
      const stuEvals = evalsMap.get(stuId);
      if (!stuEvals.has(expId)) stuEvals.set(expId, []);
      stuEvals.get(expId).push(ev);
    }

    const vivasMap = new Map();
    for (const v of vivas) {
      const stuId = v.student.toString();
      const expId = v.experiment.toString();
      if (!vivasMap.has(stuId)) vivasMap.set(stuId, new Map());
      const stuVivas = vivasMap.get(stuId);
      if (!stuVivas.has(expId)) stuVivas.set(expId, []);
      stuVivas.get(expId).push(v);
    }

    let totalCompletionPercentageSum = 0;
    let totalCohortScoreSum = 0;
    let studentsWithScoresCount = 0;
    let totalPendingSubmissions = 0;
    let completedAllCount = 0;

    const studentResults = students.map((student) => {
      const stuIdStr = student._id.toString();
      const studentSubsByExp = subsMap.get(stuIdStr) || new Map();
      const studentEvalsByExp = evalsMap.get(stuIdStr) || new Map();
      const studentVivasByExp = vivasMap.get(stuIdStr) || new Map();

      let completedCount = 0;
      let studentScoreSum = 0;
      let studentEvaluatedCount = 0;
      let totalStudentSubsCount = 0;

      for (const exp of experiments) {
        const expIdStr = exp._id.toString();
        const expSubs = studentSubsByExp.get(expIdStr) || [];
        const expEvals = studentEvalsByExp.get(expIdStr) || [];
        const expVivas = studentVivasByExp.get(expIdStr) || [];

        totalStudentSubsCount += expSubs.length;

        const hasPassedSub = expSubs.some((s) => s.status === 'SUCCESS');
        const hasEval = expEvals.length > 0;
        const hasViva = expVivas.length > 0;
        const hasAttempt = expSubs.length > 0;

        // An experiment is completed if student has passed submission, evaluation, viva, or attempts
        const isCompleted = hasPassedSub || hasEval || hasViva || hasAttempt;

        if (isCompleted) {
          completedCount++;
        }

        if (hasEval) {
          // Highest evaluation score (normalized to percentage out of 100)
          const highestEval = expEvals[0];
          const scoreOutOf10 = typeof highestEval.score === 'number' ? highestEval.score : 0;
          const scorePercent = Number((scoreOutOf10 * 10).toFixed(1));
          studentScoreSum += scorePercent;
          studentEvaluatedCount++;
        }
      }

      const pendingCount = totalExperiments - completedCount;
      totalPendingSubmissions += pendingCount;

      const completionPct =
        totalExperiments > 0 ? Number(((completedCount / totalExperiments) * 100).toFixed(1)) : 0;
      totalCompletionPercentageSum += completionPct;

      if (totalExperiments > 0 && completedCount === totalExperiments) {
        completedAllCount++;
      }

      const averageScore =
        studentEvaluatedCount > 0
          ? Number((studentScoreSum / studentEvaluatedCount).toFixed(1))
          : null;

      if (averageScore !== null) {
        totalCohortScoreSum += averageScore;
        studentsWithScoresCount++;
      }

      // Determine status
      let status = 'Needs Attention';
      if (totalExperiments === 0) {
        status = 'Not Started';
      } else if (completedCount === totalExperiments) {
        status = 'Completed';
      } else if (completionPct >= 75) {
        status = 'Good';
      } else if (completionPct >= 50) {
        status = 'Average';
      } else if (totalStudentSubsCount === 0) {
        status = 'Not Started';
      } else {
        status = 'Needs Attention';
      }

      return {
        studentId: student._id,
        _id: student._id,
        rollNumber: student.rollNumber,
        name: student.name,
        section: student.section,
        active: student.active,
        totalExperiments,
        completedExperiments: completedCount,
        pendingExperiments: pendingCount,
        completionPercentage: completionPct,
        averageScore,
        status
      };
    });

    const averageCompletion =
      students.length > 0
        ? Number((totalCompletionPercentageSum / students.length).toFixed(1))
        : 0;

    const averageCohortScore =
      studentsWithScoresCount > 0
        ? Number((totalCohortScoreSum / studentsWithScoresCount).toFixed(1))
        : null;

    return {
      lab: {
        _id: lab._id,
        id: lab._id,
        name: lab.name,
        code: lab.code,
        subject: lab.subject,
        department: lab.department,
        semester: lab.semester,
        academicYear: lab.academicYear
      },
      availableSections: authorizedSections.map((s) => ({
        _id: s._id,
        name: s.name,
        sectionCode: s.sectionCode
      })),
      summary: {
        totalStudents: students.length,
        activeStudents: students.filter((s) => s.active).length,
        completedAll: completedAllCount,
        averageCompletion,
        averageScore: averageCohortScore,
        pendingSubmissions: totalPendingSubmissions
      },
      students: studentResults
    };
  }

  /**
   * Retrieves detailed experiment-wise student performance breakdown for a single student in a lab
   */
  async getStudentLabPerformanceDetail(labId, studentId, user) {
    if (!user || !user.active) {
      throw new AppError('User account is inactive or invalid', 403);
    }

    if (user.role === 'STUDENT') {
      throw new AppError('Students are not authorized to access detailed performance view via faculty routes', 403);
    }

    const lab = await Lab.findById(labId);
    if (!lab) {
      throw new AppError('Laboratory not found', 404);
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'STUDENT') {
      throw new AppError('Student not found or invalid account type', 404);
    }

    if (user.role === 'TEACHER') {
      const teacherAssignments = await LabAssignment.find({
        lab: lab._id,
        teacher: user._id,
        active: true
      }).populate('section');

      const activeTeacherAssignments = teacherAssignments.filter(
        (a) => a.section && a.section.active
      );

      if (activeTeacherAssignments.length === 0) {
        throw new AppError('You do not have an active faculty assignment for this laboratory', 403);
      }

      const assignedSectionCodes = activeTeacherAssignments.map((a) =>
        a.section?.sectionCode?.toUpperCase()
      );

      if (!student.section || !assignedSectionCodes.includes(student.section.toUpperCase())) {
        throw new AppError('You are not authorized to view performance for students outside your assigned sections', 403);
      }
    }

    const experiments = await Experiment.find({ lab: lab._id, active: true }).sort({
      experimentNumber: 1,
      order: 1
    });
    const totalExperiments = experiments.length;
    const expIds = experiments.map((e) => e._id);

    const submissions = expIds.length > 0
      ? await Submission.find({
          lab: lab._id,
          student: student._id,
          active: true
        }).sort({ submittedAt: -1 })
      : [];

    const evaluations = expIds.length > 0
      ? await Evaluation.find({
          lab: lab._id,
          student: student._id,
          active: true
        }).sort({ score: -1, evaluatedAt: -1 })
      : [];

    const vivas = expIds.length > 0
      ? await VivaEvaluation.find({
          lab: lab._id,
          student: student._id,
          active: true
        })
      : [];

    let completedCount = 0;
    let scoresList = [];
    let passedSubmissionsCount = 0;
    let failedSubmissionsCount = 0;
    let latestSubmissionDate = null;

    if (submissions.length > 0) {
      latestSubmissionDate = submissions[0].submittedAt;
      for (const s of submissions) {
        if (s.status === 'SUCCESS') passedSubmissionsCount++;
        else failedSubmissionsCount++;
      }
    }

    const experimentsBreakdown = experiments.map((exp) => {
      const expIdStr = exp._id.toString();
      const expSubs = submissions.filter((s) => s.experiment.toString() === expIdStr);
      const expEvals = evaluations.filter((e) => e.experiment.toString() === expIdStr);
      const expVivas = vivas.filter((v) => v.experiment.toString() === expIdStr);

      const hasPassedSub = expSubs.some((s) => s.status === 'SUCCESS');
      const hasEval = expEvals.length > 0;
      const hasViva = expVivas.length > 0;
      const hasAttempt = expSubs.length > 0;

      const isCompleted = hasPassedSub || hasEval || hasViva || hasAttempt;
      if (isCompleted) completedCount++;

      let expScorePercent = null;
      if (hasEval) {
        const scoreOutOf10 = typeof expEvals[0].score === 'number' ? expEvals[0].score : 0;
        expScorePercent = Number((scoreOutOf10 * 10).toFixed(1));
        scoresList.push(expScorePercent);
      }

      let expStatus = 'Pending';
      if (isCompleted && hasEval) {
        expStatus = 'Completed';
      } else if (hasPassedSub) {
        expStatus = 'Completed';
      } else if (hasAttempt) {
        expStatus = hasEval ? 'Completed' : 'Awaiting Evaluation';
      } else {
        expStatus = 'Pending';
      }

      const lastExpSub = expSubs.length > 0 ? expSubs[0].submittedAt : null;

      return {
        experimentId: exp._id,
        experimentNumber: exp.experimentNumber || exp.order,
        title: exp.title,
        status: expStatus,
        score: expScorePercent,
        scoreOutOf10: expEvals.length > 0 ? expEvals[0].score : null,
        attempts: expSubs.length,
        lastSubmission: lastExpSub
      };
    });

    const completionPct =
      totalExperiments > 0 ? Number(((completedCount / totalExperiments) * 100).toFixed(1)) : 0;

    const avgScore =
      scoresList.length > 0
        ? Number((scoresList.reduce((a, b) => a + b, 0) / scoresList.length).toFixed(1))
        : null;

    const highestScore = scoresList.length > 0 ? Math.max(...scoresList) : null;
    const lowestScore = scoresList.length > 0 ? Math.min(...scoresList) : null;

    return {
      student: {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        section: student.section,
        active: student.active
      },
      lab: {
        _id: lab._id,
        name: lab.name,
        code: lab.code,
        subject: lab.subject,
        department: lab.department,
        semester: lab.semester,
        academicYear: lab.academicYear
      },
      overall: {
        totalExperiments,
        completedExperiments: completedCount,
        pendingExperiments: totalExperiments - completedCount,
        completionPercentage: completionPct,
        averageScore: avgScore,
        highestScore,
        lowestScore,
        totalSubmissions: submissions.length,
        passedSubmissions: passedSubmissionsCount,
        failedSubmissions: failedSubmissionsCount,
        lastSubmission: latestSubmissionDate
      },
      experiments: experimentsBreakdown
    };
  }
}

module.exports = new LabService();

