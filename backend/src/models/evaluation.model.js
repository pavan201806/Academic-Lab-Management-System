const mongoose = require('mongoose');

const testCaseResultSchema = new mongoose.Schema(
  {
    testCaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestCase'
    },
    order: {
      type: Number,
      required: true
    },
    isHidden: {
      type: Boolean,
      default: false
    },
    passed: {
      type: Boolean,
      required: true
    },
    earnedMarks: {
      type: Number,
      default: 0
    },
    availableMarks: {
      type: Number,
      default: 0
    },
    executionStatus: {
      type: String,
      default: 'SUCCESS'
    },
    executionTimeMs: {
      type: Number,
      default: 0
    },
    actualOutput: {
      type: String,
      default: ''
    },
    errorSummary: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema(
  {
    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: [true, 'Submission reference is required'],
      unique: true
    },
    experiment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Experiment',
      required: [true, 'Experiment reference is required']
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required']
    },
    lab: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lab',
      required: [true, 'Laboratory reference is required']
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section reference is required']
    },
    attemptNumber: {
      type: Number,
      required: [true, 'Attempt number is required'],
      min: 1,
      max: 3
    },
    testCaseResults: [testCaseResultSchema],
    earnedMarks: {
      type: Number,
      default: 0
    },
    totalAvailableMarks: {
      type: Number,
      default: 0
    },
    score: {
      type: Number,
      required: true,
      min: [0, 'Score cannot be negative'],
      max: [10, 'Automated score cannot exceed 10'],
      default: 0
    },
    isHighestScore: {
      type: Boolean,
      default: false
    },
    evaluatedAt: {
      type: Date,
      default: Date.now
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

// Compound indexes for fast lookups
evaluationSchema.index({ student: 1, experiment: 1, attemptNumber: 1 });
evaluationSchema.index({ student: 1, experiment: 1, isHighestScore: 1 });
evaluationSchema.index({ lab: 1, experiment: 1, evaluatedAt: -1 });

const Evaluation = mongoose.model('Evaluation', evaluationSchema);

module.exports = Evaluation;
