const mongoose = require('mongoose');

const vivaEvaluationSchema = new mongoose.Schema(
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
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Evaluator teacher reference is required']
    },
    marks: {
      type: Number,
      required: [true, 'Viva marks are required'],
      min: [0, 'Viva marks cannot be negative'],
      max: [5, 'Viva marks cannot exceed 5']
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [1000, 'Remarks cannot exceed 1000 characters'],
      default: ''
    },
    status: {
      type: String,
      enum: ['EVALUATED', 'RE_EVALUATED'],
      default: 'EVALUATED'
    },
    evaluationVersion: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    isCurrent: {
      type: Boolean,
      default: true
    },
    reevaluationRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReevaluationRequest',
      default: null
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

// Indexes
vivaEvaluationSchema.index({ student: 1, experiment: 1, isCurrent: 1 });
vivaEvaluationSchema.index({ student: 1, experiment: 1, evaluationVersion: -1 });
vivaEvaluationSchema.index({ experiment: 1, section: 1 });
vivaEvaluationSchema.index({ lab: 1, experiment: 1, evaluatedAt: -1 });
vivaEvaluationSchema.index({ evaluatedBy: 1 });

const VivaEvaluation = mongoose.model('VivaEvaluation', vivaEvaluationSchema);

module.exports = VivaEvaluation;
