const mongoose = require('mongoose');

const experimentSchema = new mongoose.Schema(
  {
    lab: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lab',
      required: [true, 'Laboratory reference is required']
    },
    title: {
      type: String,
      required: [true, 'Experiment title is required'],
      trim: true,
      maxlength: [200, 'Experiment title cannot exceed 200 characters']
    },
    experimentNumber: {
      type: Number,
      required: [true, 'Experiment number is required'],
      min: [1, 'Experiment number must be at least 1'],
      max: [12, 'Experiment number cannot exceed 12 (maximum 12 experiments per lab)']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    objective: {
      type: String,
      trim: true,
      default: ''
    },
    instructions: {
      type: String,
      trim: true,
      default: ''
    },
    programmingLanguages: {
      type: [String],
      required: [true, 'At least one programming language must be selected'],
      enum: {
        values: ['C', 'C++', 'Java', 'Python'],
        message: 'Programming language must be one of C, C++, Java, or Python'
      },
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'At least one valid programming language is required'
      },
      default: ['C', 'C++', 'Java', 'Python']
    },
    status: {
      type: String,
      required: [true, 'Experiment status is required'],
      enum: {
        values: ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'CLOSED', 'REOPENED'],
        message: 'Invalid status. Must be DRAFT, SCHEDULED, PUBLISHED, CLOSED, or REOPENED'
      },
      default: 'DRAFT'
    },
    scheduledAt: {
      type: Date,
      default: null
    },
    deadline: {
      type: Date,
      default: null
    },
    reopenedUntil: {
      type: Date,
      default: null
    },
    order: {
      type: Number,
      min: 1,
      max: 12,
      default: 1
    },
    publishedAt: {
      type: Date,
      default: null
    },
    active: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user reference is required']
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound index to ensure uniqueness of active experiment numbers and order within a lab
experimentSchema.index({ lab: 1, experimentNumber: 1, active: 1 });
experimentSchema.index({ lab: 1, order: 1, active: 1 });
experimentSchema.index({ lab: 1, status: 1, active: 1 });

const Experiment = mongoose.model('Experiment', experimentSchema);

module.exports = Experiment;
