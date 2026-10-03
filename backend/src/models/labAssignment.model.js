const mongoose = require('mongoose');

const labAssignmentSchema = new mongoose.Schema(
  {
    lab: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lab',
      required: [true, 'Lab reference is required']
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section reference is required']
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher reference is required']
    },
    assignmentType: {
      type: String,
      required: [true, 'Assignment type is required'],
      enum: {
        values: ['MAIN', 'ASSISTANT'],
        message: 'Assignment type must be either MAIN or ASSISTANT'
      }
    },
    active: {
      type: Boolean,
      default: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
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

// Compound indexes for rapid lookups and assignment management
labAssignmentSchema.index({ lab: 1, section: 1, active: 1 });
labAssignmentSchema.index({ teacher: 1, active: 1 });
labAssignmentSchema.index({ lab: 1, teacher: 1, active: 1 });

const LabAssignment = mongoose.model('LabAssignment', labAssignmentSchema);

module.exports = LabAssignment;
