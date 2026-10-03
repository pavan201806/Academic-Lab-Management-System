const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Section name is required'],
      trim: true,
      maxlength: [100, 'Section name cannot exceed 100 characters']
    },
    sectionCode: {
      type: String,
      required: [true, 'Section code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [30, 'Section code cannot exceed 30 characters']
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
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      maxlength: [100, 'Department cannot exceed 100 characters']
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

// Indexes for common academic queries
sectionSchema.index({ academicYear: 1, semester: 1, department: 1 });
sectionSchema.index({ active: 1 });

const Section = mongoose.model('Section', sectionSchema);

module.exports = Section;
