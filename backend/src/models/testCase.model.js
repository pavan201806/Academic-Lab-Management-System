const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema(
  {
    experiment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Experiment',
      required: [true, 'Experiment reference is required']
    },
    input: {
      type: String,
      default: '',
      maxlength: [16384, 'Test case input cannot exceed 16KB']
    },
    expectedOutput: {
      type: String,
      required: [true, 'Expected output is required'],
      maxlength: [65536, 'Expected output cannot exceed 64KB']
    },
    marks: {
      type: Number,
      required: [true, 'Marks value is required'],
      min: [0.1, 'Marks must be at least 0.1'],
      max: [100, 'Marks cannot exceed 100 per test case'],
      default: 1
    },
    isHidden: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      required: [true, 'Test case order is required'],
      min: 1,
      default: 1
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

// Indexes for ordered test case lookup
testCaseSchema.index({ experiment: 1, active: 1, order: 1 });
testCaseSchema.index({ experiment: 1, isHidden: 1, active: 1 });

const TestCase = mongoose.model('TestCase', testCaseSchema);

module.exports = TestCase;
