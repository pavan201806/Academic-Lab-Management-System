const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters']
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: ['GENERAL', 'EXPERIMENT', 'DEADLINE', 'LAB', 'ANNOUNCEMENT'],
        message: 'Type must be GENERAL, EXPERIMENT, DEADLINE, LAB, or ANNOUNCEMENT'
      },
      default: 'GENERAL'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required']
    },
    targetType: {
      type: String,
      required: [true, 'Target type is required'],
      enum: {
        values: ['ALL_STUDENTS', 'LAB', 'SECTION', 'INDIVIDUAL'],
        message: 'Target type must be ALL_STUDENTS, LAB, SECTION, or INDIVIDUAL'
      },
      default: 'ALL_STUDENTS'
    },
    targetStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    targetSections: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section'
      }
    ],
    targetLabs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lab'
      }
    ],
    readBy: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        readAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
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

// Compound indexes for high performance querying & role-scoped filtering
notificationSchema.index({ createdBy: 1, active: 1 });
notificationSchema.index({ targetLabs: 1, active: 1 });
notificationSchema.index({ targetSections: 1, active: 1 });
notificationSchema.index({ targetStudents: 1, active: 1 });
notificationSchema.index({ targetType: 1, active: 1, createdAt: -1 });
notificationSchema.index({ active: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
