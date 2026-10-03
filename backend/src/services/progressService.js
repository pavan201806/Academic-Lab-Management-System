const { Experiment, Submission, Evaluation, VivaEvaluation, Lab, Section, LabAssignment, User } = require('../models');
const AppError = require('../utils/appError');

class ProgressService {
  /**
   * Helper to compute progress metrics for a single student in a single lab
   */
  async computeLabProgressForStudent(studentId, labId) {
    const experiments = await Experiment.find({
      lab: labId,
      active: true,
      status: { $in: ['PUBLISHED', 'REOPENED', 'CLOSED'] }
    }).sort({ order: 1, createdAt: 1 });

    const totalExperiments = experiments.length;
    if (totalExperiments === 0) {
      return {
        totalExperiments: 0,
        completedExperiments: 0,
        pendingExperiments: 0,
        completionPercentage: 0,
        averageAutomatedScore: 0,
        averageVivaScore: 0,
        averageTotalScore: 0,
        experiments: []
      };
    }

    const expIds = experiments.map((e) => e._id);

    // Fetch highest automated evaluations from Phase 7
    const evaluations = await Evaluation.find({
      student: studentId,
      lab: labId,
      isHighestScore: true
    });

    // Fetch active/current viva evaluations from Phase 8
    const vivaEvaluations = await VivaEvaluation.find({
      student: studentId,
      lab: labId,
      isCurrent: true
    });

    // Fetch official submissions count for attempt counting
    const submissions = await Submission.find({
      student: studentId,
      lab: labId,
      active: true
    });

    let completedCount = 0;
    let totalAutomatedScoreSum = 0;
    let totalVivaScoreSum = 0;
    let totalCombinedScoreSum = 0;

    const experimentsProgress = experiments.map((exp) => {
      const expIdStr = exp._id.toString();
      const evalDoc = evaluations.find((e) => (e.experiment?._id || e.experiment).toString() === expIdStr);
      const vivaDoc = vivaEvaluations.find((v) => (v.experiment?._id || v.experiment).toString() === expIdStr);
      const studentSubs = submissions.filter((s) => (s.experiment?._id || s.experiment).toString() === expIdStr);

      const hasAttempted = studentSubs.length > 0;
      const isCompleted = !!(evalDoc || vivaDoc || hasAttempted);

      const automatedScore = evalDoc ? Number(evalDoc.score.toFixed(2)) : 0;
      const vivaScore = vivaDoc ? Number(vivaDoc.marks.toFixed(2)) : 0;
      const totalScore = isCompleted ? Math.min(15, Number((automatedScore + vivaScore).toFixed(2))) : 0;

      if (isCompleted) {
        completedCount++;
        totalAutomatedScoreSum += automatedScore;
        totalVivaScoreSum += vivaScore;
        totalCombinedScoreSum += totalScore;
      }

      return {
        experimentId: exp._id,
        title: exp.title,
        order: exp.order,
        status: exp.status,
        allowedLanguages: exp.allowedLanguages,
        isCompleted,
        attemptsCount: studentSubs.length,
        automatedScore, // /10
        vivaScore, // /5
        totalScore, // /15
        vivaStatus: vivaDoc ? vivaDoc.status : 'PENDING'
      };
    });

    const completionPercentage =
      totalExperiments > 0 ? Number(((completedCount / totalExperiments) * 100).toFixed(1)) : 0;

    const averageAutomatedScore =
      completedCount > 0 ? Number((totalAutomatedScoreSum / completedCount).toFixed(2)) : 0;

    const averageVivaScore =
      completedCount > 0 ? Number((totalVivaScoreSum / completedCount).toFixed(2)) : 0;

    const averageTotalScore =
      completedCount > 0 ? Number((totalCombinedScoreSum / completedCount).toFixed(2)) : 0;

    return {
      totalExperiments,
      completedExperiments: completedCount,
      pendingExperiments: totalExperiments - completedCount,
      completionPercentage,
      averageAutomatedScore,
      averageVivaScore,
      averageTotalScore,
      experiments: experimentsProgress
    };
  }

  /**
   * Get student's overall progress across all assigned laboratories
   * @param {object} studentUser Authenticated student user
   */
  async getStudentOverallProgress(studentUser) {
    if (!studentUser || studentUser.role !== 'STUDENT') {
      throw new AppError('Only students can access student overall progress', 403);
    }

    if (!studentUser.section) {
      return {
        summary: {
          totalEnrolledLabs: 0,
          totalExperiments: 0,
          completedExperiments: 0,
          pendingExperiments: 0,
          overallCompletionPercentage: 0,
          averageTotalScore: 0
        },
        labsProgress: []
      };
    }

    const section = await Section.findOne({
      sectionCode: studentUser.section.toUpperCase(),
      active: true
    });

    if (!section) {
      return {
        summary: {
          totalEnrolledLabs: 0,
          totalExperiments: 0,
          completedExperiments: 0,
          pendingExperiments: 0,
          overallCompletionPercentage: 0,
          averageTotalScore: 0
        },
        labsProgress: []
      };
    }

    const assignments = await LabAssignment.find({
      section: section._id,
      active: true
    }).populate('lab');

    const labs = [];
    const seenLabIds = new Set();
    for (const a of assignments) {
      const lab = a.lab;
      if (lab && lab.active && !seenLabIds.has(lab._id.toString())) {
        seenLabIds.add(lab._id.toString());
        labs.push(lab);
      }
    }

    let totalExperimentsSum = 0;
    let completedExperimentsSum = 0;
    let totalScoreSum = 0;
    let totalCompletedWithScore = 0;

    const labsProgress = [];

    for (const lab of labs) {
      const progress = await this.computeLabProgressForStudent(studentUser._id, lab._id);
      totalExperimentsSum += progress.totalExperiments;
      completedExperimentsSum += progress.completedExperiments;
      if (progress.completedExperiments > 0) {
        totalScoreSum += progress.averageTotalScore * progress.completedExperiments;
        totalCompletedWithScore += progress.completedExperiments;
      }

      labsProgress.push({
        lab: {
          _id: lab._id,
          name: lab.name,
          code: lab.code,
          subject: lab.subject,
          department: lab.department
        },
        ...progress
      });
    }

    const overallCompletionPercentage =
      totalExperimentsSum > 0
        ? Number(((completedExperimentsSum / totalExperimentsSum) * 100).toFixed(1))
        : 0;

    const averageTotalScore =
      totalCompletedWithScore > 0
        ? Number((totalScoreSum / totalCompletedWithScore).toFixed(2))
        : 0;

    return {
      summary: {
        totalEnrolledLabs: labs.length,
        totalExperiments: totalExperimentsSum,
        completedExperiments: completedExperimentsSum,
        pendingExperiments: totalExperimentsSum - completedExperimentsSum,
        overallCompletionPercentage,
        averageTotalScore
      },
      labsProgress
    };
  }

  /**
   * Get student's detailed progress for a single lab
   */
  async getStudentLabProgress(studentUser, labId) {
    if (!studentUser || studentUser.role !== 'STUDENT') {
      throw new AppError('Only students can access student lab progress', 403);
    }

    const lab = await Lab.findOne({ _id: labId, active: true });
    if (!lab) {
      throw new AppError('Laboratory not found or deactivated', 404);
    }

    if (!studentUser.section) {
      throw new AppError('You are not assigned to any section for this laboratory', 403);
    }

    const section = await Section.findOne({
      sectionCode: studentUser.section.toUpperCase(),
      active: true
    });

    if (!section) {
      throw new AppError('Your section is inactive or does not exist', 403);
    }

    const assignment = await LabAssignment.findOne({
      lab: labId,
      section: section._id,
      active: true
    });

    if (!assignment) {
      throw new AppError('This laboratory is not assigned to your academic section', 403);
    }

    const progress = await this.computeLabProgressForStudent(studentUser._id, labId);

    return {
      lab: {
        _id: lab._id,
        name: lab.name,
        code: lab.code,
        subject: lab.subject,
        department: lab.department
      },
      ...progress
    };
  }

  /**
   * Get laboratory cohort student progress for teachers and admin
   */
  async getLabCohortProgress(user, labId, sectionId = null) {
    if (!user || !user.active) {
      throw new AppError('User account is inactive or invalid', 403);
    }

    const lab = await Lab.findOne({ _id: labId, active: true });
    if (!lab) {
      throw new AppError('Laboratory not found or deactivated', 404);
    }

    if (user.role === 'TEACHER') {
      const assignment = await LabAssignment.findOne({
        teacher: user._id,
        lab: labId,
        active: true
      });
      if (!assignment) {
        throw new AppError('You do not have an active assignment to access this laboratory cohort progress', 403);
      }
    } else if (user.role !== 'ADMIN_HOD') {
      throw new AppError('Unauthorized access to laboratory cohort progress', 403);
    }

    // Find assigned sections for this lab
    const sectionQuery = { lab: labId, active: true };
    if (sectionId) {
      sectionQuery.section = sectionId;
    }

    const assignments = await LabAssignment.find(sectionQuery).populate('section');
    const sections = assignments
      .map((a) => a.section)
      .filter((s) => s && s.active);

    const sectionCodes = sections.map((s) => s.sectionCode.toUpperCase());

    const students = await User.find({
      role: 'STUDENT',
      active: true,
      section: { $in: sectionCodes }
    }).sort({ rollNumber: 1 });

    const studentsProgress = [];
    let totalCompletionPercentageSum = 0;
    let totalScoreSum = 0;
    let studentsWithCompletedCount = 0;

    for (const student of students) {
      const p = await this.computeLabProgressForStudent(student._id, labId);
      totalCompletionPercentageSum += p.completionPercentage;
      if (p.completedExperiments > 0) {
        totalScoreSum += p.averageTotalScore;
        studentsWithCompletedCount++;
      }

      studentsProgress.push({
        student: {
          _id: student._id,
          name: student.name,
          rollNumber: student.rollNumber,
          section: student.section
        },
        totalExperiments: p.totalExperiments,
        completedExperiments: p.completedExperiments,
        pendingExperiments: p.pendingExperiments,
        completionPercentage: p.completionPercentage,
        averageAutomatedScore: p.averageAutomatedScore,
        averageVivaScore: p.averageVivaScore,
        averageTotalScore: p.averageTotalScore
      });
    }

    const averageCompletionPercentage =
      students.length > 0 ? Number((totalCompletionPercentageSum / students.length).toFixed(1)) : 0;

    const averageScore =
      studentsWithCompletedCount > 0
        ? Number((totalScoreSum / studentsWithCompletedCount).toFixed(2))
        : 0;

    return {
      lab: {
        _id: lab._id,
        name: lab.name,
        code: lab.code,
        subject: lab.subject,
        department: lab.department
      },
      totalStudents: students.length,
      studentsProgress,
      cohortSummary: {
        totalEnrolledStudents: students.length,
        averageCompletionPercentage,
        averageScore
      }
    };
  }

  /**
   * Get single student detailed progress for a teacher/admin
   */
  async getStudentProgressForTeacher(user, labId, studentId) {
    if (!user || !user.active) {
      throw new AppError('User account is inactive or invalid', 403);
    }

    const lab = await Lab.findOne({ _id: labId, active: true });
    if (!lab) {
      throw new AppError('Laboratory not found or deactivated', 404);
    }

    if (user.role === 'TEACHER') {
      const assignment = await LabAssignment.findOne({
        teacher: user._id,
        lab: labId,
        active: true
      });
      if (!assignment) {
        throw new AppError('You do not have an active assignment to access this laboratory', 403);
      }
    } else if (user.role !== 'ADMIN_HOD') {
      throw new AppError('Unauthorized access to student progress', 403);
    }

    const student = await User.findOne({ _id: studentId, role: 'STUDENT', active: true });
    if (!student) {
      throw new AppError('Student not found or deactivated', 404);
    }

    const progress = await this.computeLabProgressForStudent(student._id, labId);

    return {
      student: {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        section: student.section
      },
      lab: {
        _id: lab._id,
        name: lab.name,
        code: lab.code,
        subject: lab.subject,
        department: lab.department
      },
      ...progress
    };
  }
}

module.exports = new ProgressService();
