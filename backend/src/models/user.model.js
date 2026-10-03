const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ALPHANUMERIC_REGEX } = require('../validators/auth.validator');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    rollNumber: {
      type: String,
      required: [true, 'Roll number / username is required'],
      unique: true,
      trim: true,
      uppercase: true, // Normalized uppercase for consistent querying
      match: [ALPHANUMERIC_REGEX, 'Roll number / username must contain only alphanumeric characters without spaces or symbols']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Never return passwordHash in standard queries
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ['ADMIN_HOD', 'TEACHER', 'STUDENT'],
        message: 'Role must be either ADMIN_HOD, TEACHER, or STUDENT'
      }
    },
    mustChangePassword: {
      type: Boolean,
      default: true
    },
    section: {
      type: String,
      trim: true,
      default: ''
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
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Method to verify password against stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword || !this.passwordHash) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Static helper to hash passwords with standard cost factor
userSchema.statics.hashPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainPassword, salt);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
