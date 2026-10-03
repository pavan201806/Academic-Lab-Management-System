const mongoose = require('mongoose');

const reevaluationRequestSchema = new mongoose.Schema(
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
    vivaEvaluation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VivaEvaluation',
      required: [true, 'Original viva evaluation reference is required']
    },
    reason: {
      type: String,
      required: [true, 'Reason for re-evaluation request is required'],
      trim: true,
      minlength: [5, 'Reason must be at least 5 characters long'],
      maxlength: [1000, 'Reason cannot exceed 1000 characters']
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'],
      default: 'PENDING'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    reviewRemarks: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review remarks cannot exceed 1000 characters'],
      default: ''
    },
    newVivaEvaluation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VivaEvaluation',
      default: null
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

// Indexes
reevaluationRequestSchema.index({ student: 1, experiment: 1, status: 1 });
reevaluationRequestSchema.index({ lab: 1, experiment: 1, status: 1 });
reevaluationRequestSchema.index({ vivaEvaluation: 1 });

const ReevaluationRequest = mongoose.model('ReevaluationRequest', reevaluationRequestSchema);

module.exports = ReevaluationRequest;
