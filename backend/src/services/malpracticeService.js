const mongoose = require('mongoose');
const { MalpracticeEvent, Experiment, Lab, User, DEFAULT_SEVERITY_MAP, SEVERITY_LEVELS } = require('../models');
const AppError = require('../utils/appError');

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
   * Retrieves malpractice events with RBAC isolation:
   * - STUDENT can only access their own events
   * - TEACHER / ADMIN_HOD can access events across experiments/students
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
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
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
      bySeverity
    };
  }
}

module.exports = new MalpracticeService();
