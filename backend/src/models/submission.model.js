const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
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
      max: 10
    },
    language: {
      type: String,
      required: [true, 'Programming language is required'],
      enum: {
        values: ['C', 'C++', 'Java', 'Python'],
        message: 'Language must be C, C++, Java, or Python'
      }
    },
    sourceCode: {
      type: String,
      required: [true, 'Source code is required'],
      maxlength: [65536, 'Source code cannot exceed 64KB']
    },
    stdin: {
      type: String,
      default: '',
      maxlength: [16384, 'Standard input cannot exceed 16KB']
    },
    status: {
      type: String,
      enum: ['SUBMITTED', 'SUCCESS', 'COMPILE_ERROR', 'RUNTIME_ERROR', 'TIMEOUT', 'OUTPUT_LIMIT', 'EXECUTION_ERROR'],
      default: 'SUBMITTED'
    },
    executionOutput: {
      stdout: { type: String, default: '' },
      stderr: { type: String, default: '' },
      executionTimeMs: { type: Number, default: 0 },
      exitCode: { type: Number, default: 0 },
      status: { type: String, default: 'SUBMITTED' }
    },
    submittedAt: {
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

// Compound indexes for fast attempt lookup, student history, and lab submission queries
submissionSchema.index({ student: 1, experiment: 1, attemptNumber: 1 });
submissionSchema.index({ lab: 1, experiment: 1, submittedAt: -1 });
submissionSchema.index({ section: 1, experiment: 1 });

const Submission = mongoose.model('Submission', submissionSchema);

module.exports = Submission;
