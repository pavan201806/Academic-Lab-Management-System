const mongoose = require('mongoose');
const {
  User,
  LabAssignment,
  Submission,
  Evaluation,
  VivaEvaluation,
  ReevaluationRequest,
  Notification
} = require('../models');
const AppError = require('../utils/appError');

class UserService {
  async getUsers(filter = {}) {
    const query = {};

    if (filter.role) {
      query.role = filter.role;
    }

    if (filter.active !== undefined) {
      query.active = filter.active === 'true' || filter.active === true;
    }

    if (filter.section) {
      query.section = filter.section;
    }

    if (filter.search) {
      const searchRegex = new RegExp(filter.search, 'i');
      query.$or = [{ name: searchRegex }, { rollNumber: searchRegex }];
    }

    return await User.find(query).sort({ rollNumber: 1 });
  }

  async getUserById(id) {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  async createUser({ name, rollNumber, role, temporaryPassword, section }) {
    if (!role || !['TEACHER', 'STUDENT'].includes(role)) {
      throw new AppError('Role must be either TEACHER or STUDENT', 400);
    }

    const normalizedRoll = rollNumber.trim().toUpperCase();

    const existingUser = await User.findOne({ rollNumber: normalizedRoll });
    if (existingUser) {
      throw new AppError(`A user with roll number / username '${normalizedRoll}' already exists`, 409);
    }

    const passwordHash = await User.hashPassword(temporaryPassword);

    const user = await User.create({
      name,
      rollNumber: normalizedRoll,
      passwordHash,
      role,
      mustChangePassword: true,
      section: section || '',
      active: true
    });

    return user;
  }

  async updateUser(id, { name, section, active }) {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (name !== undefined) user.name = name;
    if (section !== undefined) user.section = section;
    if (active !== undefined) user.active = active;

    await user.save();
    return user;
  }

  async resetTemporaryPassword(id, temporaryPassword) {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.passwordHash = await User.hashPassword(temporaryPassword);
    user.mustChangePassword = true;
    await user.save();
    return user;
  }

  async toggleActive(id, active) {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.active = active;
    await user.save();
    return user;
  }

  /**
   * Permanently delete a student and cascade cleanup all student-owned data
   */
  async deleteStudent(id) {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('Student not found', 404);
    }

    if (user.role !== 'STUDENT') {
      throw new AppError('Only student accounts can be permanently deleted through this endpoint', 400);
    }

    const studentId = user._id;

    let session = null;
    let useTransaction = false;

    // Attempt MongoDB transaction if supported in current environment
    try {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      }
    } catch (_) {
      session = null;
      useTransaction = false;
    }

    try {
      const opts = useTransaction && session ? { session } : {};

      // 1. Delete all submissions belonging to the student
      const submissionsRes = await Submission.deleteMany({ student: studentId }, opts);

      // 2. Delete all automated evaluations scored for the student
      const evaluationsRes = await Evaluation.deleteMany({ student: studentId }, opts);

      // 3. Delete all viva evaluations conducted for the student
      const vivaRes = await VivaEvaluation.deleteMany({ student: studentId }, opts);

      // 4. Delete all re-evaluation requests submitted by the student
      const reevalRes = await ReevaluationRequest.deleteMany({ student: studentId }, opts);

      // 5. Clean up notifications targeting the student or read receipts
      await Notification.updateMany(
        { targetStudents: studentId },
        { $pull: { targetStudents: studentId } },
        opts
      );
      await Notification.deleteMany(
        { targetType: 'INDIVIDUAL', targetStudents: { $size: 0 } },
        opts
      );
      await Notification.updateMany(
        { 'readBy.student': studentId },
        { $pull: { readBy: { student: studentId } } },
        opts
      );

      // 6. Delete the student User record itself
      await User.deleteOne({ _id: studentId }, opts);

      if (useTransaction && session) {
        await session.commitTransaction();
      }

      return {
        deletedStudent: {
          _id: user._id,
          name: user.name,
          rollNumber: user.rollNumber,
          section: user.section
        },
        cascadeSummary: {
          submissionsDeleted: submissionsRes.deletedCount || 0,
          evaluationsDeleted: evaluationsRes.deletedCount || 0,
          vivaEvaluationsDeleted: vivaRes.deletedCount || 0,
          reevaluationsDeleted: reevalRes.deletedCount || 0
        }
      };
    } catch (err) {
      if (useTransaction && session) {
        try {
          await session.abortTransaction();
        } catch (_) {}
      }
      throw new AppError(`Student deletion failed: ${err.message}`, 500);
    } finally {
      if (session) {
        try {
          await session.endSession();
        } catch (_) {}
      }
    }
  }

  /**
   * Pre-deletion inspection returning counts of academic records affected by bulk student deletion
   */
  async previewBulkDeleteStudents(studentIds) {
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw new AppError('An array of student IDs is required for preview', 400);
    }

    for (const id of studentIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError(`Invalid student ID format: ${id}`, 400);
      }
    }

    const users = await User.find({ _id: { $in: studentIds } });
    if (users.length === 0) {
      throw new AppError('No matching student accounts found', 404);
    }

    const nonStudents = users.filter((u) => u.role !== 'STUDENT');
    if (nonStudents.length > 0) {
      const names = nonStudents.map((u) => `${u.name} (${u.rollNumber} - ${u.role})`).join(', ');
      throw new AppError(`Target list contains non-student accounts: ${names}. Only student accounts can be deleted.`, 400);
    }

    const validStudentIds = users.map((u) => u._id);

    const submissionsCount = await Submission.countDocuments({
      student: { $in: validStudentIds }
    });

    const evaluationsCount = await Evaluation.countDocuments({
      student: { $in: validStudentIds }
    });

    const vivaCount = await VivaEvaluation.countDocuments({
      student: { $in: validStudentIds }
    });

    const reevalCount = await ReevaluationRequest.countDocuments({
      student: { $in: validStudentIds }
    });

    return {
      selectedCount: validStudentIds.length,
      students: users.map((u) => ({
        _id: u._id,
        name: u.name,
        rollNumber: u.rollNumber,
        section: u.section
      })),
      affectedData: {
        students: validStudentIds.length,
        submissions: submissionsCount,
        evaluations: evaluationsCount,
        vivaEvaluations: vivaCount,
        reevaluationRequests: reevalCount
      }
    };
  }

  /**
   * Permanently delete multiple students and cascade-delete all student-owned data
   * Atomic across all selected students. Preserves shared sections, labs, experiments, test cases, and teachers.
   */
  async bulkDeleteStudents(studentIds) {
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw new AppError('An array of student IDs is required for bulk deletion', 400);
    }

    for (const id of studentIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError(`Invalid student ID format: ${id}`, 400);
      }
    }

    const users = await User.find({ _id: { $in: studentIds } });
    if (users.length === 0) {
      throw new AppError('No matching student accounts found for deletion', 404);
    }

    const nonStudents = users.filter((u) => u.role !== 'STUDENT');
    if (nonStudents.length > 0) {
      const names = nonStudents.map((u) => `${u.name} (${u.rollNumber} - ${u.role})`).join(', ');
      throw new AppError(`Bulk deletion rejected: Target list contains non-student accounts: ${names}. Only student accounts can be deleted.`, 400);
    }

    const validStudentIds = users.map((u) => u._id);

    let session = null;
    let useTransaction = false;

    // Attempt MongoDB transaction if supported in current environment
    try {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      }
    } catch (_) {
      session = null;
      useTransaction = false;
    }

    try {
      const opts = useTransaction && session ? { session } : {};

      // 1. Delete all submissions belonging to selected students
      const submissionsRes = await Submission.deleteMany({ student: { $in: validStudentIds } }, opts);

      // 2. Delete all automated evaluations scored for selected students
      const evaluationsRes = await Evaluation.deleteMany({ student: { $in: validStudentIds } }, opts);

      // 3. Delete all viva evaluations conducted for selected students
      const vivaRes = await VivaEvaluation.deleteMany({ student: { $in: validStudentIds } }, opts);

      // 4. Delete all re-evaluation requests submitted by selected students
      const reevalRes = await ReevaluationRequest.deleteMany({ student: { $in: validStudentIds } }, opts);

      // 5. Clean up notifications targeting the students or read receipts
      await Notification.updateMany(
        { targetStudents: { $in: validStudentIds } },
        { $pull: { targetStudents: { $in: validStudentIds } } },
        opts
      );
      await Notification.deleteMany(
        { targetType: 'INDIVIDUAL', targetStudents: { $size: 0 } },
        opts
      );
      await Notification.updateMany(
        { 'readBy.student': { $in: validStudentIds } },
        { $pull: { readBy: { student: { $in: validStudentIds } } } },
        opts
      );

      // 6. Delete the student User records
      const userRes = await User.deleteMany({ _id: { $in: validStudentIds }, role: 'STUDENT' }, opts);

      if (useTransaction && session) {
        await session.commitTransaction();
      }

      return {
        deletedCount: userRes.deletedCount || validStudentIds.length,
        deletedStudents: users.map((u) => ({
          _id: u._id,
          name: u.name,
          rollNumber: u.rollNumber,
          section: u.section
        })),
        cascadeSummary: {
          studentsDeleted: userRes.deletedCount || validStudentIds.length,
          submissionsDeleted: submissionsRes.deletedCount || 0,
          evaluationsDeleted: evaluationsRes.deletedCount || 0,
          vivaEvaluationsDeleted: vivaRes.deletedCount || 0,
          reevaluationsDeleted: reevalRes.deletedCount || 0
        }
      };
    } catch (err) {
      if (useTransaction && session) {
        try {
          await session.abortTransaction();
        } catch (_) {}
      }
      throw new AppError(`Bulk student deletion failed: ${err.message}`, 500);
    } finally {
      if (session) {
        try {
          await session.endSession();
        } catch (_) {}
      }
    }
  }

  /**
   * Permanently delete a teacher and cleanup teacher-specific assignments
   * Preserves all shared academic resources, experiments, test cases, and student submissions/evaluations.
   */
  async deleteTeacher(id) {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('Teacher not found', 404);
    }

    if (user.role !== 'TEACHER') {
      throw new AppError('Only teacher accounts can be permanently deleted through this operation', 400);
    }

    const teacherId = user._id;

    let session = null;
    let useTransaction = false;

    // Attempt MongoDB transaction if supported in current environment
    try {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      }
    } catch (_) {
      session = null;
      useTransaction = false;
    }

    try {
      const opts = useTransaction && session ? { session } : {};

      // 1. Delete all lab assignment records for this teacher
      const assignmentRes = await LabAssignment.deleteMany({ teacher: teacherId }, opts);

      // 2. Clean up any read receipts for this teacher in notifications
      await Notification.updateMany(
        { 'readBy.student': teacherId },
        { $pull: { readBy: { student: teacherId } } },
        opts
      );

      // 3. Delete the teacher User record
      await User.deleteOne({ _id: teacherId }, opts);

      if (useTransaction && session) {
        await session.commitTransaction();
      }

      return {
        deletedTeacher: {
          _id: user._id,
          name: user.name,
          rollNumber: user.rollNumber,
          role: user.role
        },
        cascadeSummary: {
          assignmentsRemoved: assignmentRes.deletedCount || 0
        }
      };
    } catch (err) {
      if (useTransaction && session) {
        try {
          await session.abortTransaction();
        } catch (_) {}
      }
      throw new AppError(`Teacher deletion failed: ${err.message}`, 500);
    } finally {
      if (session) {
        try {
          await session.endSession();
        } catch (_) {}
      }
    }
  }

  /**
   * Unified user deletion router based on role
   */
  async deleteUser(id) {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.role === 'STUDENT') {
      return await this.deleteStudent(id);
    }
    if (user.role === 'TEACHER') {
      return await this.deleteTeacher(id);
    }

    throw new AppError('Admin/HOD accounts cannot be permanently deleted through this endpoint', 400);
  }
}

module.exports = new UserService();


