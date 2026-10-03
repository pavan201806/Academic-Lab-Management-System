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
const progressService = require('./progressService');
const { generatePdfReport } = require('../utils/pdfGenerator');
const { generateExcelReport } = require('../utils/excelGenerator');
const AppError = require('../utils/appError');

class ReportService {
  /**
   * Helper to verify user's access to a lab
   */
  async validateLabAccess(user, labId) {
    if (!user || !user.active) {
      throw new AppError('User account is inactive or invalid', 403);
    }

    const lab = await Lab.findOne({ _id: labId, active: true });
    if (!lab) {
      throw new AppError('Laboratory not found or deactivated', 404);
    }

    if (user.role === 'ADMIN_HOD') {
      return lab;
    }

    if (user.role === 'TEACHER') {
      const assignment = await LabAssignment.findOne({
        teacher: user._id,
        lab: labId,
        active: true
      });
      if (!assignment) {
        throw new AppError('You do not have authorization to access reports for this laboratory', 403);
      }
      return lab;
    }

    if (user.role === 'STUDENT') {
      throw new AppError('Students are not authorized to access cohort laboratory reports', 403);
    }

    throw new AppError('Unauthorized access to laboratory', 403);
  }

  /**
   * Helper to verify user's access to a section
   */
  async validateSectionAccess(user, sectionId) {
    if (!user || !user.active) {
      throw new AppError('User account is inactive or invalid', 403);
    }

    const section = await Section.findOne({ _id: sectionId, active: true });
    if (!section) {
      throw new AppError('Section not found or deactivated', 404);
    }

    if (user.role === 'ADMIN_HOD') {
      return section;
    }

    if (user.role === 'TEACHER') {
      const assignment = await LabAssignment.findOne({
        teacher: user._id,
        section: sectionId,
        active: true
      });
      if (!assignment) {
        throw new AppError('You do not have authorization to access reports for this section', 403);
      }
      return section;
    }

    if (user.role === 'STUDENT') {
      throw new AppError('Students are not authorized to access section reports', 403);
    }

    throw new AppError('Unauthorized access to section', 403);
  }


  /**
   * 1. Student Academic Performance Report
   */
  async getStudentReport(user, studentId, options = {}) {
    const labId = typeof options === 'string' ? options : options?.labId;

    if (user.role === 'STUDENT') {
      if (studentId.toString() !== user._id.toString()) {
        throw new AppError('Students are strictly forbidden from viewing another student\'s report', 403);
      }
    }

    const student = await User.findOne({ _id: studentId, role: 'STUDENT', active: true });
    if (!student) {
      throw new AppError('Student not found or inactive', 404);
    }

    let labsToReport = [];
    if (labId) {
      const lab = await this.validateLabAccess(user, labId);
      labsToReport = [lab];
    } else {
      if (!student.section) {
        return {
          type: 'STUDENT_REPORT',
          title: 'Student Academic Performance Report',
          subtitle: `Report for ${student.name} (${student.rollNumber})`,
          student: {
            _id: student._id,
            name: student.name,
            rollNumber: student.rollNumber,
            section: 'Unallocated'
          },
          progress: {
            totalExperiments: 0,
            completedExperiments: 0,
            pendingExperiments: 0,
            completionPercentage: 0
          },
          experiments: [],
          metadata: {
            'Student Name': student.name,
            'Roll Number': student.rollNumber,
            Section: 'Unallocated'
          },
          summary: {
            'Total Enrolled Labs': 0,
            'Total Completed Experiments': 0,
            'Average Academic Score': '0.0 / 15'
          },
          tableHeaders: ['Experiment #', 'Title', 'Status', 'Automated (/10)', 'Viva (/5)', 'Total (/15)'],
          tableRows: []
        };
      }

      const section = await Section.findOne({ sectionCode: student.section.toUpperCase(), active: true });
      if (!section) {
        throw new AppError('Student section is inactive', 404);
      }

      if (user.role === 'TEACHER') {
        const teacherSectionAssigned = await LabAssignment.findOne({
          teacher: user._id,
          section: section._id,
          active: true
        });
        if (!teacherSectionAssigned) {
          throw new AppError('You are not authorized to view reports for students in this section', 403);
        }
      }

      const assignments = await LabAssignment.find({ section: section._id, active: true }).populate('lab');
      const seen = new Set();
      for (const a of assignments) {
        if (a.lab && a.lab.active && !seen.has(a.lab._id.toString())) {
          seen.add(a.lab._id.toString());
          labsToReport.push(a.lab);
        }
      }

      if (user.role === 'TEACHER') {
        const teacherAssignments = await LabAssignment.find({ teacher: user._id, active: true });
        const teacherLabIds = teacherAssignments.map((ta) => (ta.lab?._id || ta.lab).toString());
        labsToReport = labsToReport.filter((l) => teacherLabIds.includes(l._id.toString()));
        if (labsToReport.length === 0) {
          throw new AppError('You are not authorized to view reports for this student', 403);
        }
      }
    }

    let totalExperiments = 0;
    let completedExperiments = 0;
    let totalScoreSum = 0;
    const tableRows = [];
    const experimentsList = [];

    for (const lab of labsToReport) {
      const progress = await progressService.computeLabProgressForStudent(student._id, lab._id);
      totalExperiments += progress.totalExperiments;
      completedExperiments += progress.completedExperiments;

      for (const exp of progress.experiments) {
        if (exp.isCompleted) {
          totalScoreSum += exp.totalScore;
        }
        experimentsList.push({
          order: exp.order,
          title: exp.title,
          labCode: lab.code,
          labName: lab.name,
          isCompleted: exp.isCompleted,
          automatedScore: exp.automatedScore,
          vivaScore: exp.vivaScore,
          finalScore: exp.totalScore
        });

        tableRows.push([
          `${lab.code} - Exp ${exp.order}`,
          exp.title,
          exp.isCompleted ? 'COMPLETED' : 'PENDING',
          exp.automatedScore,
          exp.vivaScore,
          exp.totalScore
        ]);
      }
    }

    const avgScore = completedExperiments > 0 ? Number((totalScoreSum / completedExperiments).toFixed(2)) : 0;
    const completionPct = totalExperiments > 0 ? Number(((completedExperiments / totalExperiments) * 100).toFixed(1)) : 0;

    return {
      type: 'STUDENT_REPORT',
      title: 'Student Academic Performance Report',
      subtitle: `Official Laboratory Evaluation Record — ${student.name}`,
      student: {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        section: student.section,
        academicYear: labsToReport[0]?.academicYear || '2024-2025',
        semester: labsToReport[0]?.semester || 1
      },
      progress: {
        totalExperiments,
        completedExperiments,
        pendingExperiments: totalExperiments - completedExperiments,
        completionPercentage: completionPct,
        averageTotalScore: avgScore
      },
      experiments: experimentsList,
      metadata: {
        'Student Name': student.name,
        'Roll Number': student.rollNumber,
        Section: student.section || 'N/A',
        'Academic Year': labsToReport[0]?.academicYear || '2024-2025',
        'Total Labs': labsToReport.length
      },
      summary: {
        'Total Curriculum Experiments': `${totalExperiments} (Max 12/lab)`,
        'Completed Experiments': completedExperiments,
        'Pending Experiments': totalExperiments - completedExperiments,
        'Completion Rate': `${completionPct}%`,
        'Average Score Earned': `${avgScore} / 15`,
        'Cumulative Marks': `${totalScoreSum.toFixed(2)} / ${(totalExperiments * 15)}`
      },
      tableHeaders: ['Unit', 'Experiment Title', 'Status', 'Automated (/10)', 'Viva (/5)', 'Total Score (/15)'],
      tableRows
    };
  }

  /**
   * 2. Section Academic Performance Report
   */
  async getSectionReport(user, sectionId, options = {}) {
    const labId = typeof options === 'string' ? options : options?.labId;
    const section = await this.validateSectionAccess(user, sectionId);

    if (labId) {
      await this.validateLabAccess(user, labId);
    }

    const assignments = await LabAssignment.find({
      section: section._id,
      active: true,
      ...(labId ? { lab: labId } : {})
    }).populate('lab');

    const lab = assignments[0]?.lab || null;

    const students = await User.find({
      role: 'STUDENT',
      section: section.sectionCode.toUpperCase(),
      active: true
    }).sort({ rollNumber: 1 });

    const tableRows = [];
    const studentList = [];
    let totalCompletionPctSum = 0;
    let totalScoreSum = 0;
    let completedCountSum = 0;
    let totalExpsCount = 0;

    for (const student of students) {
      let studentCompleted = 0;
      let studentTotal = 0;
      let studentScoreSum = 0;
      let studentAutoSum = 0;
      let studentVivaSum = 0;

      for (const a of assignments) {
        if (!a.lab || !a.lab.active) continue;
        const p = await progressService.computeLabProgressForStudent(student._id, a.lab._id);
        studentCompleted += p.completedExperiments;
        studentTotal += p.totalExperiments;
        if (p.completedExperiments > 0) {
          studentScoreSum += p.averageTotalScore * p.completedExperiments;
          studentAutoSum += p.averageAutomatedScore * p.completedExperiments;
          studentVivaSum += p.averageVivaScore * p.completedExperiments;
        }
      }

      totalExpsCount = studentTotal;
      completedCountSum += studentCompleted;

      const studentAvgScore = studentCompleted > 0 ? Number((studentScoreSum / studentCompleted).toFixed(2)) : 0;
      const studentAvgAuto = studentCompleted > 0 ? Number((studentAutoSum / studentCompleted).toFixed(2)) : 0;
      const studentAvgViva = studentCompleted > 0 ? Number((studentVivaSum / studentCompleted).toFixed(2)) : 0;
      const studentPct = studentTotal > 0 ? Number(((studentCompleted / studentTotal) * 100).toFixed(1)) : 0;

      totalCompletionPctSum += studentPct;
      if (studentCompleted > 0) {
        totalScoreSum += studentAvgScore;
      }

      studentList.push({
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        section: section.sectionCode,
        completedExperiments: studentCompleted,
        pendingExperiments: studentTotal - studentCompleted,
        completionPercentage: studentPct,
        averageAutomatedScore: studentAvgAuto,
        averageVivaScore: studentAvgViva,
        averageFinalScore: studentAvgScore
      });

      tableRows.push([
        student.rollNumber,
        student.name,
        section.sectionCode,
        studentCompleted,
        studentTotal - studentCompleted,
        `${studentPct}%`,
        studentAvgScore,
        Number((studentAvgScore * studentCompleted).toFixed(2))
      ]);
    }

    const avgCohortPct = students.length > 0 ? Number((totalCompletionPctSum / students.length).toFixed(1)) : 0;
    const avgCohortScore = students.length > 0 ? Number((totalScoreSum / students.length).toFixed(2)) : 0;

    return {
      type: 'SECTION_REPORT',
      title: `Section Performance Report — ${section.name} (${section.sectionCode})`,
      subtitle: lab ? `Laboratory: ${lab.name} (${lab.code})` : 'All Assigned Laboratories',
      section: {
        _id: section._id,
        name: section.name,
        sectionCode: section.sectionCode,
        academicYear: section.academicYear,
        semester: section.semester,
        department: section.department
      },
      students: studentList,
      summary: {
        totalStudents: students.length,
        'Total Students': students.length,
        'Cohort Average Completion': `${avgCohortPct}%`,
        'Average Academic Score': `${avgCohortScore} / 15`,
        'Total Experiments': totalExpsCount
      },
      metadata: {
        Section: `${section.name} (${section.sectionCode})`,
        Department: section.department || 'CSE',
        'Academic Year': section.academicYear || '2024-2025',
        Semester: section.semester || 1,
        'Enrolled Students': students.length
      },
      tableHeaders: [
        'Roll Number',
        'Student Name',
        'Section',
        'Completed',
        'Pending',
        'Progress',
        'Avg Score (/15)',
        'Cumulative Marks'
      ],
      tableRows
    };
  }

  /**
   * 3. Laboratory Performance Report
   */
  async getLabReport(user, labId, options = {}) {
    const sectionId = typeof options === 'string' ? options : options?.sectionId;
    const lab = await this.validateLabAccess(user, labId);

    const cohortData = await progressService.getLabCohortProgress(user, labId, sectionId);
    const studentsProgress = cohortData.studentsProgress || [];
    const tableRows = [];
    const studentsList = [];

    let highestScore = 0;
    let lowestScore = studentsProgress.length > 0 ? 15 : 0;
    const exps = await Experiment.find({ lab: lab._id, active: true });

    for (const sp of studentsProgress) {
      if (sp.completedExperiments > 0) {
        if (sp.averageTotalScore > highestScore) highestScore = sp.averageTotalScore;
        if (sp.averageTotalScore < lowestScore) lowestScore = sp.averageTotalScore;
      }

      studentsList.push({
        _id: sp.student._id,
        name: sp.student.name,
        rollNumber: sp.student.rollNumber,
        section: sp.student.section,
        completedExperiments: sp.completedExperiments,
        pendingExperiments: sp.pendingExperiments,
        completionPercentage: sp.completionPercentage,
        averageAutomatedScore: sp.averageAutomatedScore,
        averageVivaScore: sp.averageVivaScore,
        averageFinalScore: sp.averageTotalScore
      });

      tableRows.push([
        sp.student.rollNumber,
        sp.student.name,
        sp.student.section,
        sp.completedExperiments,
        sp.pendingExperiments,
        `${sp.completionPercentage}%`,
        sp.averageAutomatedScore,
        sp.averageVivaScore,
        sp.averageTotalScore
      ]);
    }

    if (studentsProgress.every((sp) => sp.completedExperiments === 0)) {
      lowestScore = 0;
    }

    return {
      type: 'LAB_REPORT',
      title: `Laboratory Performance Report — ${lab.name} (${lab.code})`,
      subtitle: `Subject: ${lab.subject} &bull; Dept: ${lab.department}`,
      lab: {
        _id: lab._id,
        name: lab.name,
        code: lab.code,
        subject: lab.subject,
        department: lab.department,
        academicYear: lab.academicYear,
        semester: lab.semester
      },
      students: studentsList,
      summary: {
        totalStudents: cohortData.cohortSummary?.totalEnrolledStudents || 0,
        totalExperiments: exps.length,
        'Total Enrolled Students': cohortData.cohortSummary?.totalEnrolledStudents || 0,
        'Average Completion Rate': `${cohortData.cohortSummary?.averageCompletionPercentage || 0}%`,
        'Average Combined Score': `${cohortData.cohortSummary?.averageScore || 0} / 15`,
        'Highest Score': `${highestScore} / 15`,
        'Lowest Score': `${lowestScore} / 15`
      },
      metadata: {
        'Laboratory Name': lab.name,
        'Lab Code': lab.code,
        Subject: lab.subject,
        Department: lab.department,
        'Academic Term': `Semester ${lab.semester} &bull; ${lab.academicYear}`
      },
      tableHeaders: [
        'Roll Number',
        'Student Name',
        'Section',
        'Completed',
        'Pending',
        'Progress %',
        'Auto (/10)',
        'Viva (/5)',
        'Total Score (/15)'
      ],
      tableRows
    };
  }

  /**
   * 4. Experiment Performance Report
   */
  async getExperimentReport(user, experimentId) {
    const experiment = await Experiment.findById(experimentId).populate('lab');
    if (!experiment || !experiment.active) {
      throw new AppError('Experiment not found or deactivated', 404);
    }

    const lab = experiment.lab;
    await this.validateLabAccess(user, lab._id);

    const assignments = await LabAssignment.find({ lab: lab._id, active: true }).populate('section');
    const sections = assignments.map((a) => a.section).filter((s) => s && s.active);
    const sectionCodes = sections.map((s) => s.sectionCode.toUpperCase());

    const students = await User.find({
      role: 'STUDENT',
      active: true,
      section: { $in: sectionCodes }
    }).sort({ rollNumber: 1 });

    const evaluations = await Evaluation.find({
      experiment: experiment._id,
      isHighestScore: true
    });

    const vivaEvaluations = await VivaEvaluation.find({
      experiment: experiment._id,
      isCurrent: true
    }).populate('evaluatedBy', 'name');

    const submissions = await Submission.find({
      experiment: experiment._id,
      active: true
    });

    let completedCount = 0;
    let automatedSum = 0;
    let vivaSum = 0;
    let totalSum = 0;
    let highestScore = 0;
    let lowestScore = 15;

    const tableRows = [];

    for (const student of students) {
      const evalDoc = evaluations.find((e) => (e.student?._id || e.student).toString() === student._id.toString());
      const vivaDoc = vivaEvaluations.find((v) => (v.student?._id || v.student).toString() === student._id.toString());
      const studentSubs = submissions.filter((s) => (s.student?._id || s.student).toString() === student._id.toString());

      const isCompleted = !!(evalDoc || vivaDoc || studentSubs.length > 0);
      const autoScore = evalDoc ? Number(evalDoc.score.toFixed(2)) : 0;
      const vivaScore = vivaDoc ? Number(vivaDoc.marks.toFixed(2)) : 0;
      const finalScore = isCompleted ? Math.min(15, Number((autoScore + vivaScore).toFixed(2))) : 0;

      if (isCompleted) {
        completedCount++;
        automatedSum += autoScore;
        vivaSum += vivaScore;
        totalSum += finalScore;

        if (finalScore > highestScore) highestScore = finalScore;
        if (finalScore < lowestScore) lowestScore = finalScore;
      }

      tableRows.push([
        student.rollNumber,
        student.name,
        student.section || 'N/A',
        isCompleted ? 'COMPLETED' : 'PENDING',
        studentSubs.length,
        autoScore,
        vivaScore,
        finalScore,
        vivaDoc?.evaluatedBy?.name || 'Pending'
      ]);
    }

    if (completedCount === 0) lowestScore = 0;

    const avgAuto = completedCount > 0 ? Number((automatedSum / completedCount).toFixed(2)) : 0;
    const avgViva = completedCount > 0 ? Number((vivaSum / completedCount).toFixed(2)) : 0;
    const avgFinal = completedCount > 0 ? Number((totalSum / completedCount).toFixed(2)) : 0;
    const completionPct = students.length > 0 ? Number(((completedCount / students.length) * 100).toFixed(1)) : 0;

    return {
      type: 'EXPERIMENT_REPORT',
      title: `Experiment Report — Exp ${experiment.order}: ${experiment.title}`,
      subtitle: `Laboratory: ${lab.name} (${lab.code}) &bull; Status: ${experiment.status}`,
      experiment: {
        _id: experiment._id,
        title: experiment.title,
        order: experiment.order,
        status: experiment.status,
        allowedLanguages: experiment.allowedLanguages
      },
      lab: {
        _id: lab._id,
        name: lab.name,
        code: lab.code
      },
      metrics: {
        totalStudents: students.length,
        completed: completedCount,
        notCompleted: students.length - completedCount,
        completionPercentage: completionPct,
        averageAutomatedScore: avgAuto,
        averageVivaScore: avgViva,
        averageFinalScore: avgFinal,
        highestScore,
        lowestScore
      },
      metadata: {
        'Experiment Title': experiment.title,
        'Experiment Number': `Exp ${experiment.order}`,
        Laboratory: `${lab.name} (${lab.code})`,
        'Allowed Languages': experiment.allowedLanguages ? experiment.allowedLanguages.join(', ') : 'All',
        Status: experiment.status
      },
      summary: {
        'Total Eligible Students': students.length,
        'Completed Submissions': completedCount,
        'Completion Rate': `${completionPct}%`,
        'Average Automated Score': `${avgAuto} / 10`,
        'Average Viva Score': `${avgViva} / 5`,
        'Average Final Score': `${avgFinal} / 15`,
        'Highest Score': `${highestScore} / 15`,
        'Lowest Score': `${lowestScore} / 15`
      },
      tableHeaders: [
        'Roll Number',
        'Student Name',
        'Section',
        'Status',
        'Attempts',
        'Auto (/10)',
        'Viva (/5)',
        'Total (/15)',
        'Evaluated By'
      ],
      tableRows
    };
  }

  /**
   * 5. Marks Ledger Report
   */
  async getMarksReport(user, filters = {}) {
    let studentId = filters.studentId;
    if (user.role === 'STUDENT') {
      studentId = user._id;
    }

    // Determine target labs
    let targetLabs = [];
    if (filters.labId) {
      const lab = await this.validateLabAccess(user, filters.labId);
      targetLabs = [lab];
    } else if (user.role === 'TEACHER') {
      const assignments = await LabAssignment.find({ teacher: user._id, active: true }).populate('lab');
      const seen = new Set();
      for (const a of assignments) {
        if (a.lab && a.lab.active && !seen.has(a.lab._id.toString())) {
          seen.add(a.lab._id.toString());
          targetLabs.push(a.lab);
        }
      }
      if (targetLabs.length === 0) {
        throw new AppError('No assigned laboratories found for generating marks report', 404);
      }
    } else {
      targetLabs = await Lab.find({ active: true });
    }

    const labIds = targetLabs.map((l) => l._id);
    const expQuery = { lab: { $in: labIds }, active: true };
    if (filters.experimentId) {
      expQuery._id = filters.experimentId;
    }
    const experiments = await Experiment.find(expQuery).sort({ order: 1 });
    const expIds = experiments.map((e) => e._id);

    const evalQuery = { experiment: { $in: expIds }, isHighestScore: true };
    const vivaQuery = { experiment: { $in: expIds }, isCurrent: true };

    if (studentId) {
      evalQuery.student = studentId;
      vivaQuery.student = studentId;
    }

    const evaluations = await Evaluation.find(evalQuery).populate('student', 'name rollNumber section');
    const vivas = await VivaEvaluation.find(vivaQuery).populate('student', 'name rollNumber section');

    // Aggregate marks rows
    const rows = [];
    const tableRows = [];

    for (const ev of evaluations) {
      const student = ev.student;
      if (!student) continue;

      if (filters.sectionId) {
        const sec = await Section.findById(filters.sectionId);
        if (sec && student.section?.toUpperCase() !== sec.sectionCode?.toUpperCase()) {
          continue;
        }
      }

      const exp = experiments.find((e) => e._id.toString() === (ev.experiment?._id || ev.experiment).toString());
      const viva = vivas.find(
        (v) =>
          (v.student?._id || v.student).toString() === student._id.toString() &&
          (v.experiment?._id || v.experiment).toString() === (exp?._id || '').toString()
      );

      const autoScore = Number((ev.score || 0).toFixed(2));
      const vivaScore = viva ? Number((viva.marks || 0).toFixed(2)) : 0;
      const finalScore = Number((autoScore + vivaScore).toFixed(2));

      rows.push({
        studentId: student._id,
        rollNumber: student.rollNumber,
        studentName: student.name,
        section: student.section,
        experimentId: exp?._id,
        experimentTitle: exp?.title || 'Experiment',
        experimentOrder: exp?.order || 1,
        automatedScore: autoScore,
        vivaScore: vivaScore,
        finalScore: finalScore,
        passed: ev.passed
      });

      tableRows.push([
        student.rollNumber,
        student.name,
        student.section || '-',
        `Exp ${exp?.order}: ${exp?.title || ''}`,
        autoScore,
        vivaScore,
        finalScore,
        ev.passed ? 'PASSED' : 'RETEST'
      ]);
    }

    return {
      type: 'MARKS_REPORT',
      title: 'Academic Laboratory Marks Ledger Report',
      subtitle: `Scoring Standard: Automated (/10) + Viva (/5) = Final (/15)`,
      metadata: {
        'Report Scope': filters.labId ? 'Single Laboratory' : 'Institutional / Cohort',
        'Total Records': rows.length,
        'Scoring Rule': 'Automated Max: 10, Viva Max: 5, Final Max: 15'
      },
      summary: {
        'Total Graded Entries': rows.length,
        'Average Final Score':
          rows.length > 0
            ? `${(rows.reduce((sum, r) => sum + r.finalScore, 0) / rows.length).toFixed(2)} / 15`
            : '0.00 / 15',
        'Max Lab Experiments Limit': '12 per laboratory'
      },
      rows,
      tableHeaders: [
        'Roll Number',
        'Student Name',
        'Section',
        'Experiment',
        'Auto (/10)',
        'Viva (/5)',
        'Final (/15)',
        'Status'
      ],
      tableRows
    };
  }

  /**
   * 6. Viva Specific Report
   */
  async getVivaReport(user, filters = {}) {
    let studentId = filters.studentId;
    if (user.role === 'STUDENT') {
      studentId = user._id;
    }

    let targetLabs = [];
    if (filters.labId) {
      const lab = await this.validateLabAccess(user, filters.labId);
      targetLabs = [lab];
    } else if (user.role === 'TEACHER') {
      const assignments = await LabAssignment.find({ teacher: user._id, active: true }).populate('lab');
      const seen = new Set();
      for (const a of assignments) {
        if (a.lab && a.lab.active && !seen.has(a.lab._id.toString())) {
          seen.add(a.lab._id.toString());
          targetLabs.push(a.lab);
        }
      }
      if (targetLabs.length === 0) {
        throw new AppError('No assigned laboratories found for generating viva report', 404);
      }
    } else {
      targetLabs = await Lab.find({ active: true });
    }

    const labIds = targetLabs.map((l) => l._id);
    const expQuery = { lab: { $in: labIds }, active: true };
    if (filters.experimentId) {
      expQuery._id = filters.experimentId;
    }
    const experiments = await Experiment.find(expQuery);
    const expIds = experiments.map((e) => e._id);

    const vivaQuery = { experiment: { $in: expIds }, isCurrent: true };
    if (studentId) {
      vivaQuery.student = studentId;
    }

    const vivas = await VivaEvaluation.find(vivaQuery)
      .populate('student', 'name rollNumber section')
      .populate('experiment', 'title order')
      .populate('evaluatedBy', 'name')
      .sort({ createdAt: -1 });

    const rows = [];
    const tableRows = [];

    for (const v of vivas) {
      const student = v.student;
      if (!student) continue;

      if (filters.sectionId) {
        const sec = await Section.findById(filters.sectionId);
        if (sec && student.section?.toUpperCase() !== sec.sectionCode?.toUpperCase()) {
          continue;
        }
      }

      rows.push({
        _id: v._id,
        rollNumber: student.rollNumber,
        studentName: student.name,
        section: student.section,
        experiment: `Exp ${v.experiment?.order}: ${v.experiment?.title || ''}`,
        vivaMarks: v.marks,
        remarks: v.remarks || '',
        evaluationVersion: v.version || 1,
        evaluatedBy: v.evaluatedBy?.name || 'Faculty',
        status: v.status,
        evaluatedAt: v.evaluatedAt || v.createdAt
      });

      tableRows.push([
        student.rollNumber,
        student.name,
        student.section || '-',
        `Exp ${v.experiment?.order}: ${v.experiment?.title || ''}`,
        v.marks,
        v.remarks || 'No remarks',
        v.status || 'COMPLETED',
        v.version || 1,
        v.evaluatedBy?.name || 'Faculty',
        new Date(v.evaluatedAt || v.createdAt).toLocaleDateString()
      ]);
    }

    const avgMarks = rows.length > 0 ? (rows.reduce((acc, v) => acc + v.vivaMarks, 0) / rows.length).toFixed(2) : 0;

    return {
      type: 'VIVA_REPORT',
      title: 'Viva Voce Evaluation Report',
      subtitle: 'Authoritative Current Viva Evaluations (Max 5 Marks)',
      metadata: {
        'Report Scope': filters.labId ? 'Laboratory Specific' : 'Institutional / Cohort',
        'Total Records': rows.length,
        'Evaluation Standard': 'Current Authoritative Version /5'
      },
      summary: {
        'Evaluated Records': rows.length,
        'Average Viva Score': `${avgMarks} / 5`,
        'Max Possible Marks': '5.0'
      },
      rows,
      tableHeaders: [
        'Roll Number',
        'Student Name',
        'Section',
        'Experiment',
        'Marks (/5)',
        'Remarks',
        'Status',
        'Version',
        'Evaluator',
        'Date'
      ],
      tableRows
    };
  }

  /**
   * 7. Progress Report
   */
  async getProgressReport(user, filters = {}) {
    if (user.role === 'STUDENT') {
      const overall = await progressService.getStudentOverallProgress(user);
      const rows = (overall.labsProgress || []).map((lp) => ({
        labCode: lp.lab.code,
        labName: lp.lab.name,
        totalExperiments: lp.totalExperiments,
        completed: lp.completedExperiments,
        pending: lp.pendingExperiments,
        completionPercentage: lp.completionPercentage,
        averageAutomatedScore: lp.averageAutomatedScore,
        averageVivaScore: lp.averageVivaScore,
        averageFinalScore: lp.averageTotalScore
      }));

      const tableRows = rows.map((lp) => [
        lp.labCode,
        lp.labName,
        lp.totalExperiments,
        lp.completed,
        lp.pending,
        `${lp.completionPercentage}%`,
        lp.averageAutomatedScore,
        lp.averageVivaScore,
        lp.averageFinalScore
      ]);

      return {
        type: 'PROGRESS_REPORT',
        title: 'Student Curriculum Progress Report',
        subtitle: `Academic Term Progress — ${user.name}`,
        metadata: {
          'Student Name': user.name,
          'Roll Number': user.rollNumber,
          Section: user.section || 'N/A'
        },
        summary: {
          totalLabs: overall.summary.totalEnrolledLabs,
          'Enrolled Labs': overall.summary.totalEnrolledLabs,
          'Completed Experiments': overall.summary.completedExperiments,
          'Pending Experiments': overall.summary.pendingExperiments,
          'Overall Completion Rate': `${overall.summary.overallCompletionPercentage}%`,
          'Average Score Earned': `${overall.summary.averageTotalScore} / 15`
        },
        rows,
        tableHeaders: [
          'Lab Code',
          'Lab Name',
          'Total Exps',
          'Completed',
          'Pending',
          'Progress %',
          'Auto (/10)',
          'Viva (/5)',
          'Total (/15)'
        ],
        tableRows
      };
    }

    if (filters.labId) {
      const labRep = await this.getLabReport(user, filters.labId, filters.sectionId);
      const rows = (labRep.students || []).map((sp) => ({
        rollNumber: sp.rollNumber,
        studentName: sp.name,
        section: sp.section,
        totalExperiments: labRep.summary.totalExperiments,
        completed: sp.completedExperiments,
        pending: sp.pendingExperiments,
        completionPercentage: sp.completionPercentage,
        averageAutomatedScore: sp.averageAutomatedScore,
        averageVivaScore: sp.averageVivaScore,
        averageFinalScore: sp.averageFinalScore
      }));

      return {
        type: 'PROGRESS_REPORT',
        title: `Curriculum Progress Report — ${labRep.lab.name} (${labRep.lab.code})`,
        subtitle: `Subject: ${labRep.lab.subject}`,
        metadata: labRep.metadata,
        summary: {
          totalLabs: 1,
          ...labRep.summary
        },
        rows,
        tableHeaders: labRep.tableHeaders,
        tableRows: labRep.tableRows
      };
    }

    if (filters.sectionId) {
      const secRep = await this.getSectionReport(user, filters.sectionId);
      const rows = (secRep.students || []).map((sp) => ({
        rollNumber: sp.rollNumber,
        studentName: sp.name,
        section: sp.section,
        completed: sp.completedExperiments,
        pending: sp.pendingExperiments,
        completionPercentage: sp.completionPercentage,
        averageFinalScore: sp.averageFinalScore
      }));

      return {
        type: 'PROGRESS_REPORT',
        title: `Section Progress Report — ${secRep.section.name}`,
        subtitle: `Department: ${secRep.section.department}`,
        metadata: secRep.metadata,
        summary: {
          totalLabs: 1,
          ...secRep.summary
        },
        rows,
        tableHeaders: secRep.tableHeaders,
        tableRows: secRep.tableRows
      };
    }

    if (user.role === 'TEACHER') {
      const assignments = await LabAssignment.find({ teacher: user._id, active: true }).populate('lab');
      if (assignments.length > 0) {
        return await this.getProgressReport(user, { labId: assignments[0].lab._id });
      }
    }

    if (user.role === 'ADMIN_HOD') {
      const firstLab = await Lab.findOne({ active: true });
      if (firstLab) {
        return await this.getProgressReport(user, { labId: firstLab._id });
      }
    }

    throw new AppError('Please specify laboratory or section for progress report', 400);
  }

  /**
   * PDF Export Service
   */
  async exportReportPdf(reportData) {
    return await generatePdfReport(reportData);
  }

  /**
   * Excel Export Service
   */
  async exportReportExcel(reportData) {
    return await generateExcelReport(reportData);
  }
}

module.exports = new ReportService();
