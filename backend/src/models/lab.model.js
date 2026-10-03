const mongoose = require('mongoose');

const labSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Laboratory name is required'],
      trim: true,
      maxlength: [150, 'Laboratory name cannot exceed 150 characters']
    },
    code: {
      type: String,
      required: [true, 'Laboratory code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [30, 'Laboratory code cannot exceed 30 characters']
    },
    subject: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      maxlength: [100, 'Subject cannot exceed 100 characters']
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      maxlength: [100, 'Department cannot exceed 100 characters']
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true,
      maxlength: [20, 'Academic year cannot exceed 20 characters']
    },
    semester: {
      type: String,
      required: [true, 'Semester is required'],
      trim: true,
      maxlength: [30, 'Semester cannot exceed 30 characters']
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    active: {
      type: Boolean,
      default: true
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

// Indexes
labSchema.index({ academicYear: 1, semester: 1, department: 1 });
labSchema.index({ active: 1 });

const Lab = mongoose.model('Lab', labSchema);

module.exports = Lab;
