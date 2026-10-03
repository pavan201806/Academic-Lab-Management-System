const {
  User,
  Section,
  Lab,
  LabAssignment,
  Experiment,
  Submission,
  Evaluation,
  VivaEvaluation,
  ReevaluationRequest,
  Notification
} = require('../models');

class AdminDashboardService {
  /**
   * Helper to build filter query objects based on global filters
   */
  _buildScopeFilters(filters = {}) {
    const labQuery = {};
    const sectionQuery = {};
    const userQuery = {};
    const expQuery = {};

    if (filters.academicYear) {
      labQuery.academicYear = filters.academicYear;
      sectionQuery.academicYear = filters.academicYear;
    }

    if (filters.semester) {
      labQuery.semester = Number(filters.semester);
      sectionQuery.semester = Number(filters.semester);
    }

    if (filters.department) {
      labQuery.department = filters.department;
      sectionQuery.department = filters.department;
    }

    if (filters.labId) {
      labQuery._id = filters.labId;
      expQuery.lab = filters.labId;
    }

    if (filters.sectionId) {
      sectionQuery._id = filters.sectionId;
    }

    return { labQuery, sectionQuery, userQuery, expQuery };
  }

  /**
   * 1. Overall System Statistics
   */
  async getStatistics(filters = {}) {
    const { labQuery, sectionQuery, expQuery } = this._buildScopeFilters(filters);

    const [
      totalStudents,
      activeStudents,
      inactiveStudents,
      totalTeachers,
      activeTeachers,
      inactiveTeachers,
      totalLabs,
      activeLabs,
      inactiveLabs,
      totalSections,
      activeSections,
      inactiveSections,
      totalExperiments,
      publishedExperiments,
      closedExperiments,
      draftExperiments,
      totalSubmissions,
      totalEvaluations,
      totalVivas,
      pendingReevaluations
    ] = await Promise.all([
      User.countDocuments({ role: 'STUDENT' }),
      User.countDocuments({ role: 'STUDENT', active: true }),
      User.countDocuments({ role: 'STUDENT', active: false }),
      User.countDocuments({ role: 'TEACHER' }),
      User.countDocuments({ role: 'TEACHER', active: true }),
      User.countDocuments({ role: 'TEACHER', active: false }),
      Lab.countDocuments(labQuery),
      Lab.countDocuments({ ...labQuery, active: true }),
      Lab.countDocuments({ ...labQuery, active: false }),
      Section.countDocuments(sectionQuery),
      Section.countDocuments({ ...sectionQuery, active: true }),
      Section.countDocuments({ ...sectionQuery, active: false }),
      Experiment.countDocuments(expQuery),
      Experiment.countDocuments({ ...expQuery, status: 'PUBLISHED', active: true }),
      Experiment.countDocuments({ ...expQuery, status: 'CLOSED', active: true }),
      Experiment.countDocuments({ ...expQuery, status: 'DRAFT', active: true }),
      Submission.countDocuments({ active: true }),
      Evaluation.countDocuments({ isHighestScore: true }),
      VivaEvaluation.countDocuments({ isCurrent: true }),
      ReevaluationRequest.countDocuments({ status: 'PENDING' })
    ]);

    return {
      students: {
        total: totalStudents,
        active: activeStudents,
        inactive: inactiveStudents
      },
      teachers: {
        total: totalTeachers,
        active: activeTeachers,
        inactive: inactiveTeachers
      },
      labs: {
        total: totalLabs,
        active: activeLabs,
        inactive: inactiveLabs
      },
      sections: {
        total: totalSections,
        active: activeSections,
        inactive: inactiveSections
      },
      experiments: {
        total: totalExperiments,
        published: publishedExperiments,
        closed: closedExperiments,
        draft: draftExperiments
      },
      evaluations: {
        submissions: totalSubmissions,
        automatedEvaluations: totalEvaluations,
        vivaEvaluations: totalVivas,
        pendingReevaluations
      }
    };
  }

  /**
   * 2. Student Overview
   */
  async getStudentsOverview(filters = {}, limit = 50) {
    const studentQuery = { role: 'STUDENT' };
    if (filters.sectionCode) {
      studentQuery.section = filters.sectionCode.toUpperCase();
    }

    const students = await User.find(studentQuery)
      .sort({ rollNumber: 1 })
      .limit(limit);

    const studentIds = students.map((s) => s._id);

    const evaluations = await Evaluation.find({
      student: { $in: studentIds },
      isHighestScore: true
    });

    const vivas = await VivaEvaluation.find({
      student: { $in: studentIds },
      isCurrent: true
    });

    return students.map((student) => {
      const studentEvals = evaluations.filter(
        (e) => (e.student?._id || e.student).toString() === student._id.toString()
      );
      const studentVivas = vivas.filter(
        (v) => (v.student?._id || v.student).toString() === student._id.toString()
      );

      const completedCount = studentEvals.length;
      let autoSum = 0;
      for (const ev of studentEvals) {
        autoSum += ev.score || 0;
      }
      let vivaSum = 0;
      for (const v of studentVivas) {
        vivaSum += v.marks || 0;
      }

      const avgFinal = completedCount > 0 ? Number(((autoSum + vivaSum) / completedCount).toFixed(2)) : 0;

      return {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        section: student.section || 'Unallocated',
        academicYear: student.academicYear || '2024-2025',
        semester: student.semester || 1,
        active: student.active,
        completedExperiments: completedCount,
        averageFinalScore: avgFinal,
        status: student.active ? 'ACTIVE' : 'INACTIVE'
      };
    });
  }

  /**
   * 3. Teacher Overview
   */
  async getTeachersOverview(filters = {}) {
    const teachers = await User.find({ role: 'TEACHER' }).sort({ name: 1 });
    const assignments = await LabAssignment.find({ active: true })
      .populate('lab', 'name code active')
      .populate('section', 'name sectionCode active');

    return teachers.map((teacher) => {
      const teacherAssignments = assignments.filter(
        (a) => (a.teacher?._id || a.teacher).toString() === teacher._id.toString()
      );

      const assignedLabsMap = new Map();
      const assignedSectionsMap = new Map();
      const rolesSet = new Set();

      for (const a of teacherAssignments) {
        if (a.lab) {
          assignedLabsMap.set(a.lab._id.toString(), `${a.lab.code} (${a.lab.name})`);
        }
        if (a.section) {
          assignedSectionsMap.set(a.section._id.toString(), a.section.sectionCode);
        }
        if (a.role) {
          rolesSet.add(a.role);
        }
      }

      return {
        _id: teacher._id,
        name: teacher.name,
        rollNumber: teacher.rollNumber,
        active: teacher.active,
        assignedLabsCount: assignedLabsMap.size,
        assignedLabs: Array.from(assignedLabsMap.values()),
        assignedSectionsCount: assignedSectionsMap.size,
        assignedSections: Array.from(assignedSectionsMap.values()),
        assignmentRoles: Array.from(rolesSet),
        status: teacher.active ? 'ACTIVE' : 'INACTIVE'
      };
    });
  }

  /**
   * 4. Laboratory Overview
   */
  async getLabsOverview(filters = {}) {
    const { labQuery } = this._buildScopeFilters(filters);
    const labs = await Lab.find(labQuery).sort({ code: 1 });
    const labIds = labs.map((l) => l._id);

    const [assignments, experiments] = await Promise.all([
      LabAssignment.find({ lab: { $in: labIds }, active: true })
        .populate('teacher', 'name rollNumber')
        .populate('section', 'name sectionCode'),
      Experiment.find({ lab: { $in: labIds }, active: true })
    ]);

    return labs.map((lab) => {
      const labAssignments = assignments.filter(
        (a) => (a.lab?._id || a.lab).toString() === lab._id.toString()
      );
      const labExps = experiments.filter(
        (e) => (e.lab?._id || e.lab).toString() === lab._id.toString()
      );

      const sectionCodes = new Set();
      const teacherNames = new Set();

      for (const a of labAssignments) {
        if (a.section?.sectionCode) sectionCodes.add(a.section.sectionCode);
        if (a.teacher?.name) teacherNames.add(a.teacher.name);
      }

      const publishedCount = labExps.filter((e) => e.status === 'PUBLISHED').length;

      return {
        _id: lab._id,
        name: lab.name,
        code: lab.code,
        subject: lab.subject,
        department: lab.department,
        academicYear: lab.academicYear,
        semester: lab.semester,
        active: lab.active,
        totalExperiments: labExps.length,
        publishedExperiments: publishedCount,
        assignedSectionsCount: sectionCodes.size,
        assignedSections: Array.from(sectionCodes),
        assignedTeachersCount: teacherNames.size,
        assignedTeachers: Array.from(teacherNames),
        status: lab.active ? 'ACTIVE' : 'INACTIVE'
      };
    });
  }

  /**
   * 5. Section Overview
   */
  async getSectionsOverview(filters = {}) {
    const { sectionQuery } = this._buildScopeFilters(filters);
    const sections = await Section.find(sectionQuery).sort({ sectionCode: 1 });
    const sectionIds = sections.map((s) => s._id);

    const [students, assignments] = await Promise.all([
      User.find({ role: 'STUDENT', active: true }),
      LabAssignment.find({ section: { $in: sectionIds }, active: true })
        .populate('lab', 'name code')
        .populate('teacher', 'name')
    ]);

    return sections.map((section) => {
      const sectionStudents = students.filter(
        (st) => st.section?.toUpperCase() === section.sectionCode.toUpperCase()
      );

      const sectionAssignments = assignments.filter(
        (a) => (a.section?._id || a.section).toString() === section._id.toString()
      );

      const labCodes = new Set();
      const teacherNames = new Set();

      for (const a of sectionAssignments) {
        if (a.lab?.code) labCodes.add(a.lab.code);
        if (a.teacher?.name) teacherNames.add(a.teacher.name);
      }

      return {
        _id: section._id,
        name: section.name,
        sectionCode: section.sectionCode,
        academicYear: section.academicYear,
        semester: section.semester,
        department: section.department,
        active: section.active,
        studentCount: sectionStudents.length,
        assignedLabsCount: labCodes.size,
        assignedLabs: Array.from(labCodes),
        assignedTeachersCount: teacherNames.size,
        assignedTeachers: Array.from(teacherNames),
        status: section.active ? 'ACTIVE' : 'INACTIVE'
      };
    });
  }

  /**
   * 6. Real Timestamped Administrative Activity Feed
   */
  async getActivityFeed(limit = 15) {
    const [recentSubmissions, recentEvals, recentVivas, recentReevals, recentNotifs] = await Promise.all([
      Submission.find({ active: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('student', 'name rollNumber')
        .populate('experiment', 'title order'),
      Evaluation.find({ isHighestScore: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('student', 'name rollNumber')
        .populate('experiment', 'title order'),
      VivaEvaluation.find({ isCurrent: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('student', 'name rollNumber')
        .populate('experiment', 'title order')
        .populate('evaluatedBy', 'name'),
      ReevaluationRequest.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('student', 'name rollNumber')
        .populate('experiment', 'title order'),
      Notification.find({ active: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('createdBy', 'name')
    ]);

    const events = [];

    for (const sub of recentSubmissions) {
      if (sub.student && sub.experiment) {
        events.push({
          id: `sub_${sub._id}`,
          type: 'SUBMISSION',
          badge: 'STUDENT CODE SUBMISSION',
          badgeColor: 'badge-info',
          title: `${sub.student.name} (${sub.student.rollNumber}) submitted code for Exp ${sub.experiment.order}: ${sub.experiment.title}`,
          details: `Language: ${sub.language} &bull; Attempt #${sub.attemptNumber || 1} &bull; Status: ${sub.status}`,
          timestamp: sub.createdAt
        });
      }
    }

    for (const ev of recentEvals) {
      if (ev.student && ev.experiment) {
        events.push({
          id: `eval_${ev._id}`,
          type: 'EVALUATION',
          badge: 'AUTOMATED EVALUATION',
          badgeColor: ev.passed ? 'badge-success' : 'badge-warning',
          title: `Automated grading for ${ev.student.name} — Exp ${ev.experiment.order}: ${ev.experiment.title}`,
          details: `Score: ${ev.score} / 10 &bull; Status: ${ev.passed ? 'PASSED' : 'RETEST'}`,
          timestamp: ev.createdAt
        });
      }
    }

    for (const v of recentVivas) {
      if (v.student && v.experiment) {
        events.push({
          id: `viva_${v._id}`,
          type: 'VIVA',
          badge: 'VIVA VOCE EVALUATED',
          badgeColor: 'badge-primary',
          title: `Viva conducted for ${v.student.name} by Prof. ${v.evaluatedBy?.name || 'Faculty'}`,
          details: `Marks: ${v.marks} / 5 &bull; Exp ${v.experiment.order} &bull; Version: ${v.version || 1}`,
          timestamp: v.evaluatedAt || v.createdAt
        });
      }
    }

    for (const re of recentReevals) {
      if (re.student && re.experiment) {
        events.push({
          id: `reeval_${re._id}`,
          type: 'REEVALUATION',
          badge: 'RE-EVALUATION REQUEST',
          badgeColor: re.status === 'PENDING' ? 'badge-warning' : 'badge-info',
          title: `Re-evaluation ${re.status} for ${re.student.name} (Exp ${re.experiment.order})`,
          details: `Current Status: ${re.status} &bull; Reason: ${re.studentReason ? re.studentReason.slice(0, 50) : 'None'}`,
          timestamp: re.createdAt
        });
      }
    }

    for (const n of recentNotifs) {
      events.push({
        id: `notif_${n._id}`,
        type: 'NOTIFICATION',
        badge: 'ACADEMIC ANNOUNCEMENT',
        badgeColor: 'badge-secondary',
        title: `Notice published: "${n.title}"`,
        details: `Type: ${n.type} &bull; Broadcast by: ${n.createdBy?.name || 'Admin'} &bull; Scope: ${n.targetType}`,
        timestamp: n.createdAt
      });
    }

    // Sort descending by timestamp and slice top `limit`
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return events.slice(0, limit);
  }

  /**
   * 7. Performance Overview
   */
  async getPerformanceOverview(filters = {}) {
    const evaluations = await Evaluation.find({ isHighestScore: true });
    const vivas = await VivaEvaluation.find({ isCurrent: true });
    const experiments = await Experiment.find({ active: true, status: 'PUBLISHED' });
    const students = await User.find({ role: 'STUDENT', active: true });

    let autoSum = 0;
    for (const ev of evaluations) {
      autoSum += ev.score || 0;
    }
    const avgAuto = evaluations.length > 0 ? Number((autoSum / evaluations.length).toFixed(2)) : 0;

    let vivaSum = 0;
    for (const v of vivas) {
      vivaSum += v.marks || 0;
    }
    const avgViva = vivas.length > 0 ? Number((vivaSum / vivas.length).toFixed(2)) : 0;

    const avgFinal = Number((avgAuto + avgViva).toFixed(2));

    const totalPossibleUnits = students.length * Math.min(12, experiments.length);
    const completedUnits = evaluations.length;
    const completionRate =
      totalPossibleUnits > 0 ? Number(((completedUnits / totalPossibleUnits) * 100).toFixed(1)) : 0;

    return {
      averageAutomatedScore: avgAuto,
      averageVivaScore: avgViva,
      averageFinalScore: avgFinal,
      overallCompletionPercentage: completionRate,
      totalGradedUnits: completedUnits,
      scoringStandard: 'Automated (/10) + Viva (/5) = Final (/15)',
      maxLabExperiments: 12
    };
  }

  /**
   * Complete Unified Dashboard Data Payload
   */
  async getFullDashboard(filters = {}) {
    const [
      statistics,
      students,
      teachers,
      labs,
      sections,
      activity,
      performance
    ] = await Promise.all([
      this.getStatistics(filters),
      this.getStudentsOverview(filters, 10),
      this.getTeachersOverview(filters),
      this.getLabsOverview(filters),
      this.getSectionsOverview(filters),
      this.getActivityFeed(15),
      this.getPerformanceOverview(filters)
    ]);

    return {
      statistics,
      students,
      teachers,
      labs,
      sections,
      activity,
      performance
    };
  }
}

module.exports = new AdminDashboardService();
