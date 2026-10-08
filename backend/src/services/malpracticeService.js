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

/**
 * Categorizes a student's review status based on malpractice telemetry
 * - NORMAL: 0 events
 * - ATTENTION: 1-2 events (low/moderate infractions)
 * - REVIEW_REQUIRED: >= 3 events or repeated tab switches / paste attempts
 * - CRITICAL: Any HIGH severity events or extensive violations (>= 8)
 */
const determineMalpracticeStatus = (metrics) => {
  const { totalEvents = 0, bySeverity = {}, byType = {} } = metrics;
  if (!totalEvents || totalEvents === 0) {
    return 'NORMAL';
  }
  if ((bySeverity.HIGH || 0) > 0 || totalEvents >= 8) {
    return 'CRITICAL';
  }
  if (
    totalEvents >= 3 ||
    (byType.TAB_SWITCH || 0) >= 2 ||
    (byType.PASTE_ATTEMPT || 0) >= 2 ||
    (byType.FULLSCREEN_EXIT || 0) >= 2
  ) {
    return 'REVIEW_REQUIRED';
  }
  return 'ATTENTION';
};

class MalpracticeService {
  /**
   * Records a malpractice event for the authenticated student
   * Server strictly enforces student identity and server-side timestamp
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

    return {
      totalEvents: total,
      byType,
      bySeverity,
      status: determineMalpracticeStatus({ totalEvents: total, bySeverity, byType })
    };
  }

  /**
   * Comprehensive laboratory-level malpractice telemetry for Teachers & Admins
   * Provides lab overview cards, event breakdown, and per-student integrity statuses
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

    // Aggregate lab-wide breakdown
    const [eventsByStudent, typeAgg, severityAgg, totalLabEvents] = await Promise.all([
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
      MalpracticeEvent.countDocuments(eventMatch)
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

      eventsByStudentMap.set(agg._id.toString(), {
        total: agg.total,
        byType,
        bySeverity,
        latestEvent
      });
    });

    // Build per-student summaries
    let reviewRequiredCount = 0;
    let studentsWithEventsCount = 0;

    const studentSummaries = students.map((stu) => {
      const studentIdStr = stu._id.toString();
      const telemetry = eventsByStudentMap.get(studentIdStr) || {
        total: 0,
        byType: {},
        bySeverity: {},
        latestEvent: null
      };

      if (telemetry.total > 0) {
        studentsWithEventsCount++;
      }

      const status = determineMalpracticeStatus({
        totalEvents: telemetry.total,
        bySeverity: telemetry.bySeverity,
        byType: telemetry.byType
      });

      if (status === 'REVIEW_REQUIRED' || status === 'CRITICAL') {
        reviewRequiredCount++;
      }

      return {
        studentId: stu._id,
        name: stu.name,
        rollNumber: stu.rollNumber,
        section: stu.section,
        totalEvents: telemetry.total,
        byType: telemetry.byType,
        bySeverity: telemetry.bySeverity,
        latestEventTimestamp: telemetry.latestEvent?.timestamp || null,
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

    return {
      lab: {
        _id: lab._id,
        name: lab.name,
        code: lab.code,
        department: lab.department,
        semester: lab.semester
      },
      summary: {
        studentsMonitored: students.length,
        studentsWithEvents: studentsWithEventsCount,
        studentsRequiringReview: reviewRequiredCount,
        totalEvents: totalLabEvents,
        byType: labByType,
        bySeverity: labBySeverity
      },
      students: studentSummaries
    };
  }
}

module.exports = new MalpracticeService();
