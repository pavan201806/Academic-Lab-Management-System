const mongoose = require('mongoose');

const EVENT_TYPES = [
  'COPY_ATTEMPT',
  'PASTE_ATTEMPT',
  'CUT_ATTEMPT',
  'CONTEXT_MENU_ATTEMPT',
  'DRAG_DROP_ATTEMPT',
  // Extensible for future phases:
  'TAB_SWITCH',
  'WINDOW_BLUR',
  'FULLSCREEN_EXIT',
  'CAMERA_DISABLED',
  'FACE_NOT_DETECTED',
  'MULTIPLE_FACES_DETECTED'
];

const SEVERITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];

const DEFAULT_SEVERITY_MAP = {
  COPY_ATTEMPT: 'LOW',
  CUT_ATTEMPT: 'LOW',
  PASTE_ATTEMPT: 'MEDIUM',
  CONTEXT_MENU_ATTEMPT: 'LOW',
  DRAG_DROP_ATTEMPT: 'MEDIUM',
  TAB_SWITCH: 'MEDIUM',
  WINDOW_BLUR: 'LOW',
  FULLSCREEN_EXIT: 'MEDIUM',
  CAMERA_DISABLED: 'HIGH',
  FACE_NOT_DETECTED: 'HIGH',
  MULTIPLE_FACES_DETECTED: 'HIGH'
};

const malpracticeEventSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required']
    },
    experiment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Experiment',
      required: [true, 'Experiment reference is required']
    },
    lab: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lab'
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section'
    },
    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission'
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      enum: {
        values: EVENT_TYPES,
        message: 'Invalid malpractice event type'
      }
    },
    severity: {
      type: String,
      enum: {
        values: SEVERITY_LEVELS,
        message: 'Severity must be LOW, MEDIUM, or HIGH'
      },
      default: function () {
        return DEFAULT_SEVERITY_MAP[this.eventType] || 'LOW';
      }
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for fast reporting and retrieval
malpracticeEventSchema.index({ student: 1, experiment: 1, timestamp: -1 });
malpracticeEventSchema.index({ lab: 1, experiment: 1, timestamp: -1 });
malpracticeEventSchema.index({ student: 1, eventType: 1 });
malpracticeEventSchema.index({ experiment: 1, eventType: 1 });
malpracticeEventSchema.index({ timestamp: -1 });

const MalpracticeEvent = mongoose.model('MalpracticeEvent', malpracticeEventSchema);

module.exports = {
  MalpracticeEvent,
  EVENT_TYPES,
  SEVERITY_LEVELS,
  DEFAULT_SEVERITY_MAP
};
