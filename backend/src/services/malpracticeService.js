const mongoose = require('mongoose');
const {
  MalpracticeEvent,
  Experiment,
  Lab,
  User,
  Section,
  LabAssignment,
  DEFAULT_SEVERITY_MAP,
  SEVERITY_LEVELS
} = require('../models');
const AppError = require('../utils/appError');

// Base Event Weights for Explainable Risk Scoring (0 - 100)
const EVENT_WEIGHTS = {
  // Low Concern: blocked actions in editor
  COPY_ATTEMPT: 4,
  CUT_ATTEMPT: 4,
  CONTEXT_MENU_ATTEMPT: 3,

  // Moderate Concern: tab switching and lost window focus
  TAB_SWITCH: 10,
  WINDOW_BLUR: 8,

  // High Concern: external code insertion attempts & fullscreen evasion
  PASTE_ATTEMPT: 15,
  DRAG_DROP_ATTEMPT: 14,
  FULLSCREEN_EXIT: 12,

  // Critical Concern: proctoring bypass (future hardware flags)
  CAMERA_DISABLED: 30,
  FACE_NOT_DETECTED: 25,
  MULTIPLE_FACES_DETECTED: 35
};

// Event Caps per category to enforce diminishing returns and prevent counter skewing
const EVENT_CAPS = {
  COPY_ATTEMPT: 16,
  CUT_ATTEMPT: 16,
  CONTEXT_MENU_ATTEMPT: 12,
  TAB_SWITCH: 40,
  WINDOW_BLUR: 32,
  PASTE_ATTEMPT: 45,
  DRAG_DROP_ATTEMPT: 42,
  FULLSCREEN_EXIT: 36,
  CAMERA_DISABLED: 60,
  FACE_NOT_DETECTED: 50,
  MULTIPLE_FACES_DETECTED: 70
};

/**
 * Calculates deterministic, explainable Student Risk Score (0 - 100)
 */
const calculateStudentRiskScore = (byType = {}, bySeverity = {}) => {
  let weightedSum = 0;
  for (const [type, count] of Object.entries(byType)) {
    if (count > 0) {
      const weight = EVENT_WEIGHTS[type] || 5;
      const cap = EVENT_CAPS[type] || 40;
      const contribution = Math.min(cap, count * weight);
      weightedSum += contribution;
    }
  }

  // High severity incidents guarantee elevated minimum baseline
  if ((bySeverity.HIGH || 0) > 0) {
    weightedSum = Math.max(weightedSum, 40 + (bySeverity.HIGH - 1) * 20);
  }

  return Math.min(100, Math.round(weightedSum));
};

/**
 * Derives qualitative Risk Level from numerical risk score
 */
const getRiskLevel = (riskScore) => {
  if (riskScore >= 70) return 'HIGH';
  if (riskScore >= 30) return 'MEDIUM';
  if (riskScore > 0) return 'LOW';
  return 'NONE';
};

/**
 * Categorizes a student's review status based on malpractice telemetry
 * - NORMAL: 0 events (Score 0)
 * - ATTENTION: 1-2 low/moderate events (Score 1-29)
 * - REVIEW_REQUIRED: >= 3 events or repeated tab switches / paste attempts (Score 30-69)
 * - CRITICAL: Any HIGH severity events or extensive violations (Score >= 70)
 */
const determineMalpracticeStatus = (metrics) => {
  const { totalEvents = 0, bySeverity = {}, byType = {}, riskScore } = metrics;
  if (!totalEvents || totalEvents === 0) {
    return 'NORMAL';
  }

  const calculatedRisk = typeof riskScore === 'number' ? riskScore : calculateStudentRiskScore(byType, bySeverity);

  if ((bySeverity.HIGH || 0) > 0 || totalEvents >= 8 || calculatedRisk >= 70) {
    return 'CRITICAL';
  }
  if (
    totalEvents >= 3 ||
    (byType.TAB_SWITCH || 0) >= 2 ||
    (byType.PASTE_ATTEMPT || 0) >= 2 ||
    (byType.FULLSCREEN_EXIT || 0) >= 2 ||
    calculatedRisk >= 30
  ) {
    return 'REVIEW_REQUIRED';
  }
  return 'ATTENTION';
};

/**
 * Calculates Experiment Integrity Health Score (0 - 100%)
 */
const calculateExperimentHealth = ({ totalStudents = 0, cleanStudents = 0, studentRiskScores = [] }) => {
  if (totalStudents === 0) {
    return { score: 100, status: 'EXCELLENT', cleanPercentage: 100 };
  }

  const cleanPercentage = Math.round((cleanStudents / totalStudents) * 100);
  const avgRisk =
    studentRiskScores.length > 0
      ? studentRiskScores.reduce((sum, val) => sum + val, 0) / totalStudents
      : 0;

  const healthScore = Math.max(0, Math.min(100, Math.round(100 - avgRisk)));

  let healthStatus = 'EXCELLENT';
  if (healthScore < 50) {
    healthStatus = 'CRITICAL';
  } else if (healthScore < 75) {
    healthStatus = 'REVIEW_REQUIRED';
  } else if (healthScore < 90) {
    healthStatus = 'ATTENTION';
  } else {
    healthStatus = 'GOOD';
  }

  return {
    score: healthScore,
    status: healthStatus,
    cleanPercentage
  };
};

// In-memory sliding window for server-side rate limiting / telemetry flood suppression
const serverFloodMap = new Map();
const SERVER_FLOOD_COOLDOWN_MS = 600; // 600ms cooldown per student + eventType + experiment

class MalpracticeService {
  /**
   * Records a malpractice event for the authenticated student
   * Server strictly enforces student identity, timestamp, and flood protection
   */
  async recordEvent(user, eventData) {
    if (!user || !user._id) {
      throw new AppError('Authentication required to record malpractice events', 401);
    }

    const experiment = await Experiment.findById(eventData.experimentId);
    if (!experiment) {
      throw new AppError('Referenced experiment does not exist', 404);
    }

    const labId = eventData.labId || experiment.lab;
    const severity =
      eventData.severity && SEVERITY_LEVELS.includes(eventData.severity)
        ? eventData.severity
        : DEFAULT_SEVERITY_MAP[eventData.eventType] || 'LOW';

    // Server-side sliding-window rate limit to protect MongoDB against flooding
    const rateLimitKey = `${user._id}_${eventData.eventType}_${experiment._id}`;
    const lastTimestamp = serverFloodMap.get(rateLimitKey) || 0;
    const now = Date.now();

    if (now - lastTimestamp < SERVER_FLOOD_COOLDOWN_MS) {
      return {
        _id: new mongoose.Types.ObjectId(),
        student: user._id,
        experiment: experiment._id,
        lab: labId,
        eventType: eventData.eventType,
        severity,
        timestamp: new Date(),
        throttled: true
      };
    }

    serverFloodMap.set(rateLimitKey, now);

    // Store server-controlled record
    const event = await MalpracticeEvent.create({
      student: user._id,
      experiment: experiment._id,
      lab: labId,
      submission: eventData.submissionId || null,
      eventType: eventData.eventType,
      severity,
      timestamp: new Date(),
      details: eventData.details && typeof eventData.details === 'object' ? eventData.details : {},
      active: true
    });

    return event;
  }

  /**
   * Retrieves malpractice events with RBAC isolation and flexible filtering:
   * - STUDENT can only access their own events
   * - TEACHER / ADMIN_HOD can access events across experiments/students/labs
   */
  async getEvents({ user, query = {} }) {
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const filter = { active: true };

    if (user.role === 'STUDENT') {
      filter.student = user._id;
      if (query.studentId && query.studentId.toString() !== user._id.toString()) {
        throw new AppError('Forbidden: Students cannot access malpractice records of other students', 403);
      }
      if (query.experimentId) {
        filter.experiment = query.experimentId;
      }
    } else {
      if (query.studentId) {
        filter.student = query.studentId;
      }
      if (query.experimentId) {
        filter.experiment = query.experimentId;
      }
      if (query.labId) {
        filter.lab = query.labId;
      }
      if (query.eventType) {
        filter.eventType = query.eventType;
      }
      if (query.severity) {
        filter.severity = query.severity;
      }
      if (query.startDate || query.endDate) {
        filter.timestamp = {};
        if (query.startDate) {
          filter.timestamp.$gte = new Date(query.startDate);
        }
        if (query.endDate) {
          filter.timestamp.$lte = new Date(query.endDate);
        }
      }
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      MalpracticeEvent.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('student', 'name rollNumber section')
        .populate('experiment', 'title experimentNumber')
        .populate('lab', 'name code'),
      MalpracticeEvent.countDocuments(filter)
    ]);

    return {
      events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    };
  }

  /**
   * Aggregates event summary counts for an experiment and student/lab session
   */
  async getEventSummary({ user, experimentId, studentId, labId }) {
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    const match = { active: true };

    if (user.role === 'STUDENT') {
      match.student = new mongoose.Types.ObjectId(user._id);
    } else if (studentId) {
      match.student = new mongoose.Types.ObjectId(studentId);
    }

    if (experimentId) {
      match.experiment = new mongoose.Types.ObjectId(experimentId);
    }

    if (labId) {
      match.lab = new mongoose.Types.ObjectId(labId);
    }

    const [typeAgg, severityAgg, total] = await Promise.all([
      MalpracticeEvent.aggregate([
        { $match: match },
        { $group: { _id: '$eventType', count: { $sum: 1 } } }
      ]),
      MalpracticeEvent.aggregate([
        { $match: match },
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]),
      MalpracticeEvent.countDocuments(match)
    ]);

    const byType = {};
    typeAgg.forEach((item) => {
      byType[item._id] = item.count;
    });

    const bySeverity = {};
    severityAgg.forEach((item) => {
      bySeverity[item._id] = item.count;
    });

    const riskScore = calculateStudentRiskScore(byType, bySeverity);
    const riskLevel = getRiskLevel(riskScore);
    const status = determineMalpracticeStatus({ totalEvents: total, bySeverity, byType, riskScore });

    return {
      totalEvents: total,
      byType,
      bySeverity,
      riskScore,
      riskLevel,
      status
    };
  }

  /**
   * Comprehensive laboratory & experiment-level malpractice telemetry for Teachers & Admins
   * Provides experiment health overview cards, event breakdowns, student risk scores, and experiment comparison matrix
   */
  async getLabMalpracticeOverview({ user, labId, sectionId, experimentId }) {
    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    if (user.role === 'STUDENT') {
      throw new AppError('Forbidden: Students cannot access teacher malpractice dashboard', 403);
    }

    const lab = await Lab.findById(labId);
    if (!lab) {
      throw new AppError('Laboratory not found', 404);
    }

    // Role Guard: If Teacher, verify active assignment
    if (user.role === 'TEACHER') {
      const assignmentFilter = { lab: labId, teacher: user._id, active: true };
      if (sectionId) {
        assignmentFilter.section = sectionId;
      }
      const hasAssignment = await LabAssignment.findOne(assignmentFilter);
      if (!hasAssignment) {
        throw new AppError('Forbidden: You are not assigned to this laboratory cohort', 403);
      }
    }

    // Fetch all active experiments for this lab to enable cross-experiment comparison
    const labExperiments = await Experiment.find({ lab: labId, active: true }).sort({
      experimentNumber: 1
    });

    let selectedExperimentDoc = null;
    if (experimentId) {
      selectedExperimentDoc = labExperiments.find(
        (exp) => exp._id.toString() === experimentId.toString()
      ) || (await Experiment.findById(experimentId));
    }

    // Determine relevant sections
    let targetSectionIds = [];
    if (sectionId) {
      targetSectionIds = [new mongoose.Types.ObjectId(sectionId)];
    } else if (user.role === 'TEACHER') {
      const assignments = await LabAssignment.find({ lab: labId, teacher: user._id, active: true });
      targetSectionIds = assignments.map((a) => a.section);
    } else {
      const assignments = await LabAssignment.find({ lab: labId, active: true });
      targetSectionIds = assignments.map((a) => a.section);
    }

    // Fetch section details to get section codes
    const sectionDocs = await Section.find({ _id: { $in: targetSectionIds } });
    const sectionCodes = sectionDocs.map((s) => s.sectionCode);

    // Fetch enrolled students for this cohort
    const studentQuery = { role: 'STUDENT', active: true };
    if (sectionCodes.length > 0) {
      studentQuery.section = { $in: sectionCodes };
    }
    const students = await User.find(studentQuery).sort({ rollNumber: 1 });

    // Fetch all malpractice events for this lab (and optionally experiment)
    const eventMatch = { lab: new mongoose.Types.ObjectId(labId), active: true };
    if (experimentId) {
      eventMatch.experiment = new mongoose.Types.ObjectId(experimentId);
    }

    // Aggregate telemetry breakdown
    const [eventsByStudent, typeAgg, severityAgg, totalLabEvents, eventsByExperiment] = await Promise.all([
      MalpracticeEvent.aggregate([
        { $match: eventMatch },
        {
          $group: {
            _id: '$student',
            total: { $sum: 1 },
            events: {
              $push: {
                _id: '$_id',
                eventType: '$eventType',
                severity: '$severity',
                timestamp: '$timestamp',
                experiment: '$experiment'
              }
            }
          }
        }
      ]),
      MalpracticeEvent.aggregate([
        { $match: eventMatch },
        { $group: { _id: '$eventType', count: { $sum: 1 } } }
      ]),
      MalpracticeEvent.aggregate([
        { $match: eventMatch },
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]),
      MalpracticeEvent.countDocuments(eventMatch),
      // Cross-experiment incident aggregation for experiment comparison table
      MalpracticeEvent.aggregate([
        { $match: { lab: new mongoose.Types.ObjectId(labId), active: true } },
        {
          $group: {
            _id: { experiment: '$experiment', student: '$student' },
            eventCount: { $sum: 1 },
            hasHighSeverity: {
              $max: { $cond: [{ $eq: ['$severity', 'HIGH'] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    const eventsByStudentMap = new Map();
    eventsByStudent.forEach((agg) => {
      const byType = {};
      const bySeverity = {};
      let latestEvent = null;

      agg.events.forEach((e) => {
        byType[e.eventType] = (byType[e.eventType] || 0) + 1;
        bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
        if (!latestEvent || new Date(e.timestamp) > new Date(latestEvent.timestamp)) {
          latestEvent = e;
        }
      });

      const riskScore = calculateStudentRiskScore(byType, bySeverity);
      const riskLevel = getRiskLevel(riskScore);

      eventsByStudentMap.set(agg._id.toString(), {
        total: agg.total,
        byType,
        bySeverity,
        riskScore,
        riskLevel,
        latestEvent
      });
    });

    // Build per-student summaries with risk scores and statuses
    let cleanStudentsCount = 0;
    let attentionStudentsCount = 0;
    let reviewRequiredCount = 0;
    let criticalStudentsCount = 0;
    let studentsWithEventsCount = 0;
    const studentRiskScores = [];

    const studentSummaries = students.map((stu) => {
      const studentIdStr = stu._id.toString();
      const telemetry = eventsByStudentMap.get(studentIdStr) || {
        total: 0,
        byType: {},
        bySeverity: {},
        riskScore: 0,
        riskLevel: 'NONE',
        latestEvent: null
      };

      const riskScore = telemetry.riskScore || 0;
      const riskLevel = telemetry.riskLevel || 'NONE';
      studentRiskScores.push(riskScore);

      if (telemetry.total > 0) {
        studentsWithEventsCount++;
      }

      const status = determineMalpracticeStatus({
        totalEvents: telemetry.total,
        bySeverity: telemetry.bySeverity,
        byType: telemetry.byType,
        riskScore
      });

      if (status === 'CRITICAL') {
        criticalStudentsCount++;
      } else if (status === 'REVIEW_REQUIRED') {
        reviewRequiredCount++;
      } else if (status === 'ATTENTION') {
        attentionStudentsCount++;
      } else {
        cleanStudentsCount++;
      }

      return {
        studentId: stu._id,
        name: stu.name,
        rollNumber: stu.rollNumber,
        section: stu.section,
        totalEvents: telemetry.total,
        byType: telemetry.byType,
        bySeverity: telemetry.bySeverity,
        riskScore,
        riskLevel,
        latestEventTimestamp: telemetry.latestEvent?.timestamp || null,
        latestEvent: telemetry.latestEvent || null,
        status
      };
    });

    const labByType = {};
    typeAgg.forEach((item) => {
      labByType[item._id] = item.count;
    });

    const labBySeverity = {};
    severityAgg.forEach((item) => {
      labBySeverity[item._id] = item.count;
    });

    // Experiment Health Metrics
    const experimentHealth = calculateExperimentHealth({
      totalStudents: students.length,
      cleanStudents: cleanStudentsCount,
      studentRiskScores
    });

    // Normalized metrics
    const totalStudents = students.length || 1;
    const incidentsPer10Students = Math.round((totalLabEvents / totalStudents) * 10 * 10) / 10;
    const studentsAffectedPercentage = Math.round((studentsWithEventsCount / totalStudents) * 100);

    // Build Experiment Comparison Matrix across all experiments in the lab
    const experimentComparisonMap = new Map();
    eventsByExperiment.forEach((item) => {
      const expIdStr = item._id.experiment?.toString();
      if (!expIdStr) return;
      const current = experimentComparisonMap.get(expIdStr) || {
        totalIncidents: 0,
        flaggedStudentsSet: new Set(),
        studentsWithEventsSet: new Set()
      };
      current.totalIncidents += item.eventCount;
      current.studentsWithEventsSet.add(item._id.student?.toString());
      if (item.eventCount >= 3 || item.hasHighSeverity) {
        current.flaggedStudentsSet.add(item._id.student?.toString());
      }
      experimentComparisonMap.set(expIdStr, current);
    });

    const experimentComparison = labExperiments.map((exp) => {
      const expIdStr = exp._id.toString();
      const expStats = experimentComparisonMap.get(expIdStr) || {
        totalIncidents: 0,
        flaggedStudentsSet: new Set(),
        studentsWithEventsSet: new Set()
      };
      const expTotalIncidents = expStats.totalIncidents;
      const expStudentsWithEvents = expStats.studentsWithEventsSet.size;
      const expFlaggedCount = expStats.flaggedStudentsSet.size;
      const expCleanCount = Math.max(0, students.length - expStudentsWithEvents);
      const expCleanPct = students.length > 0 ? Math.round((expCleanCount / students.length) * 100) : 100;
      const expIncidentsPer10 = students.length > 0 ? Math.round((expTotalIncidents / students.length) * 10 * 10) / 10 : 0;

      let expHealthStatus = 'EXCELLENT';
      if (expCleanPct < 50 || expFlaggedCount >= 5) expHealthStatus = 'CRITICAL';
      else if (expCleanPct < 75 || expFlaggedCount >= 3) expHealthStatus = 'REVIEW_REQUIRED';
      else if (expCleanPct < 90 || expFlaggedCount >= 1) expHealthStatus = 'ATTENTION';
      else expHealthStatus = 'GOOD';

      return {
        experimentId: exp._id,
        experimentNumber: exp.experimentNumber,
        title: exp.title,
        totalStudents: students.length,
        cleanStudentsCount: expCleanCount,
        cleanPercentage: expCleanPct,
        studentsWithEvents: expStudentsWithEvents,
        flaggedStudentsCount: expFlaggedCount,
        totalIncidents: expTotalIncidents,
        incidentsPer10Students: expIncidentsPer10,
        healthStatus: expHealthStatus
      };
    });

    return {
      lab: {
        _id: lab._id,
        name: lab.name,
        code: lab.code,
        department: lab.department,
        semester: lab.semester
      },
      experiment: selectedExperimentDoc
        ? {
            _id: selectedExperimentDoc._id,
            title: selectedExperimentDoc.title,
            experimentNumber: selectedExperimentDoc.experimentNumber,
            status: selectedExperimentDoc.status
          }
        : null,
      health: experimentHealth,
      summary: {
        studentsMonitored: students.length,
        cleanStudents: cleanStudentsCount,
        studentsWithEvents: studentsWithEventsCount,
        studentsAttention: attentionStudentsCount,
        studentsRequiringReview: reviewRequiredCount,
        studentsCritical: criticalStudentsCount,
        flaggedStudentsTotal: attentionStudentsCount + reviewRequiredCount + criticalStudentsCount,
        totalEvents: totalLabEvents,
        highSeverityEvents: labBySeverity.HIGH || 0,
        byType: labByType,
        bySeverity: labBySeverity,
        incidentsPer10Students,
        studentsAffectedPercentage
      },
      students: studentSummaries,
      experimentsList: labExperiments.map((e) => ({
        _id: e._id,
        experimentNumber: e.experimentNumber,
        title: e.title
      })),
      experimentComparison
    };
  }
}

module.exports = new MalpracticeService();
