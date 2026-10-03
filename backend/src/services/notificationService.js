const { Notification, LabAssignment, Section, Lab, User } = require('../models');
const AppError = require('../utils/appError');

class NotificationService {
  /**
   * Create a notification with strict academic scope validation
   * @param {object} creatorUser Authenticated user
   * @param {object} data Validated notification payload
   */
  async createNotification(creatorUser, data) {
    if (!creatorUser || !creatorUser.active) {
      throw new AppError('User account is inactive or invalid', 403);
    }

    if (creatorUser.role === 'STUDENT') {
      throw new AppError('Students are not authorized to create or broadcast notifications', 403);
    }

    let targetLabs = data.targetLabs || [];
    let targetSections = data.targetSections || [];
    let targetStudents = data.targetStudents || [];
    let targetType = data.targetType || 'ALL_STUDENTS';

    if (creatorUser.role === 'TEACHER') {
      // Find teacher's active lab assignments
      const assignments = await LabAssignment.find({
        teacher: creatorUser._id,
        active: true
      });

      if (!assignments || assignments.length === 0) {
        throw new AppError('You do not have any active laboratory assignments to broadcast notifications', 403);
      }

      const assignedLabIds = assignments.map((a) => (a.lab?._id || a.lab).toString());
      const assignedSectionIds = assignments.map((a) => (a.section?._id || a.section).toString());

      if (targetType === 'ALL_STUDENTS') {
        // Scope teacher's broadcast to their assigned laboratories
        targetType = 'LAB';
        targetLabs = [...new Set(assignedLabIds)];
      } else if (targetType === 'LAB') {
        for (const labId of targetLabs) {
          if (!assignedLabIds.includes(labId.toString())) {
            throw new AppError('You are not authorized to broadcast notifications to one or more selected laboratories', 403);
          }
        }
      } else if (targetType === 'SECTION') {
        for (const secId of targetSections) {
          if (!assignedSectionIds.includes(secId.toString())) {
            throw new AppError('You are not authorized to broadcast notifications to one or more selected sections', 403);
          }
        }
      } else if (targetType === 'INDIVIDUAL') {
        // Look up sections for assigned section IDs to get section codes
        const assignedSections = await Section.find({
          _id: { $in: assignedSectionIds },
          active: true
        });
        const allowedSectionCodes = assignedSections.map((s) => s.sectionCode.toUpperCase());

        for (const stuId of targetStudents) {
          const student = await User.findById(stuId);
          if (!student || !student.active || student.role !== 'STUDENT') {
            throw new AppError(`Target student not found or invalid: ${stuId}`, 404);
          }
          if (!student.section || !allowedSectionCodes.includes(student.section.toUpperCase())) {
            throw new AppError('You are not authorized to target students outside your assigned lab sections', 403);
          }
        }
      }
    } else if (creatorUser.role === 'ADMIN_HOD') {
      // Validate referenced entities exist
      if (targetType === 'LAB' && targetLabs.length > 0) {
        const count = await Lab.countDocuments({ _id: { $in: targetLabs }, active: true });
        if (count !== targetLabs.length) {
          throw new AppError('One or more target laboratories are invalid or deactivated', 400);
        }
      }
      if (targetType === 'SECTION' && targetSections.length > 0) {
        const count = await Section.countDocuments({ _id: { $in: targetSections }, active: true });
        if (count !== targetSections.length) {
          throw new AppError('One or more target sections are invalid or deactivated', 400);
        }
      }
      if (targetType === 'INDIVIDUAL' && targetStudents.length > 0) {
        const count = await User.countDocuments({ _id: { $in: targetStudents }, role: 'STUDENT', active: true });
        if (count !== targetStudents.length) {
          throw new AppError('One or more target students are invalid or deactivated', 400);
        }
      }
    }

    const notification = new Notification({
      title: data.title,
      message: data.message,
      type: data.type || 'GENERAL',
      createdBy: creatorUser._id,
      targetType,
      targetLabs,
      targetSections,
      targetStudents,
      readBy: [],
      active: true
    });

    await notification.save();

    return await Notification.findById(notification._id)
      .populate('createdBy', 'name rollNumber role')
      .populate('targetLabs', 'name code subject')
      .populate('targetSections', 'name sectionCode');
  }

  /**
   * Get role-aware notification feed
   * @param {object} user Authenticated user
   */
  async getNotifications(user) {
    if (!user || !user.active) {
      throw new AppError('User account is inactive or invalid', 403);
    }

    if (user.role === 'STUDENT') {
      let studentLabIds = [];
      let studentSectionId = null;

      if (user.section) {
        const section = await Section.findOne({
          sectionCode: user.section.toUpperCase(),
          active: true
        });

        if (section) {
          studentSectionId = section._id;
          const assignments = await LabAssignment.find({
            section: section._id,
            active: true
          });
          studentLabIds = assignments.map((a) => a.lab?._id || a.lab);
        }
      }

      const orConditions = [
        { targetType: 'ALL_STUDENTS' },
        { targetStudents: user._id }
      ];

      if (studentSectionId) {
        orConditions.push({ targetSections: studentSectionId });
      }

      if (studentLabIds.length > 0) {
        orConditions.push({ targetLabs: { $in: studentLabIds } });
      }

      const notifications = await Notification.find({
        active: true,
        $or: orConditions
      })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name rollNumber role')
        .populate('targetLabs', 'name code subject')
        .populate('targetSections', 'name sectionCode');

      const formatted = notifications.map((n) => {
        const isRead = n.readBy.some((r) => (r.student?._id || r.student)?.toString() === user._id.toString());
        return {
          ...n.toJSON(),
          isRead
        };
      });

      const unreadCount = formatted.filter((n) => !n.isRead).length;

      return {
        notifications: formatted,
        unreadCount,
        totalCount: formatted.length
      };
    }

    if (user.role === 'TEACHER') {
      const notifications = await Notification.find({
        active: true,
        createdBy: user._id
      })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name rollNumber role')
        .populate('targetLabs', 'name code subject')
        .populate('targetSections', 'name sectionCode')
        .populate('targetStudents', 'name rollNumber section');

      return {
        notifications,
        totalCount: notifications.length
      };
    }

    if (user.role === 'ADMIN_HOD') {
      const notifications = await Notification.find({ active: true })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name rollNumber role')
        .populate('targetLabs', 'name code subject')
        .populate('targetSections', 'name sectionCode')
        .populate('targetStudents', 'name rollNumber section');

      return {
        notifications,
        totalCount: notifications.length
      };
    }

    throw new AppError('Unauthorized access to notifications', 403);
  }

  /**
   * Get single notification by ID with access control
   */
  async getNotificationById(user, notificationId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      active: true
    })
      .populate('createdBy', 'name rollNumber role')
      .populate('targetLabs', 'name code subject')
      .populate('targetSections', 'name sectionCode')
      .populate('targetStudents', 'name rollNumber section');

    if (!notification) {
      throw new AppError('Notification not found or deactivated', 404);
    }

    if (user.role === 'STUDENT') {
      const isTargeted = await this.isNotificationTargetedToStudent(user, notification);
      if (!isTargeted) {
        throw new AppError('You do not have access to view this notification', 403);
      }
      const isRead = notification.readBy.some(
        (r) => (r.student?._id || r.student)?.toString() === user._id.toString()
      );
      return {
        ...notification.toJSON(),
        isRead
      };
    }

    if (user.role === 'TEACHER') {
      if ((notification.createdBy?._id || notification.createdBy)?.toString() !== user._id.toString()) {
        // Verify if teacher is assigned to any of the target labs
        const assignments = await LabAssignment.find({
          teacher: user._id,
          active: true
        });
        const assignedLabIds = assignments.map((a) => (a.lab?._id || a.lab).toString());
        const notificationLabIds = (notification.targetLabs || []).map((l) => (l?._id || l).toString());
        const hasOverlap = notificationLabIds.some((id) => assignedLabIds.includes(id));
        if (!hasOverlap) {
          throw new AppError('You do not have access to view this notification', 403);
        }
      }
    }

    return notification;
  }

  /**
   * Check if a notification targets a specific student
   */
  async isNotificationTargetedToStudent(studentUser, notification) {
    if (notification.targetType === 'ALL_STUDENTS') {
      return true;
    }

    const stuIdStr = studentUser._id.toString();
    const targetedStuIds = (notification.targetStudents || []).map((s) => (s?._id || s).toString());
    if (targetedStuIds.includes(stuIdStr)) {
      return true;
    }

    if (studentUser.section) {
      const section = await Section.findOne({
        sectionCode: studentUser.section.toUpperCase(),
        active: true
      });

      if (section) {
        const secIdStr = section._id.toString();
        const targetedSecIds = (notification.targetSections || []).map((s) => (s?._id || s).toString());
        if (targetedSecIds.includes(secIdStr)) {
          return true;
        }

        const assignments = await LabAssignment.find({
          section: section._id,
          active: true
        });
        const studentLabIds = assignments.map((a) => (a.lab?._id || a.lab).toString());
        const targetedLabIds = (notification.targetLabs || []).map((l) => (l?._id || l).toString());
        if (targetedLabIds.some((id) => studentLabIds.includes(id))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Mark a notification as read by the authenticated student
   */
  async markAsRead(user, notificationId) {
    if (user.role !== 'STUDENT') {
      throw new AppError('Only students can mark notifications as read', 403);
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      active: true
    });

    if (!notification) {
      throw new AppError('Notification not found or deactivated', 404);
    }

    const isTargeted = await this.isNotificationTargetedToStudent(user, notification);
    if (!isTargeted) {
      throw new AppError('You cannot mark an unrelated notification as read', 403);
    }

    const alreadyRead = notification.readBy.some(
      (r) => (r.student?._id || r.student)?.toString() === user._id.toString()
    );

    if (!alreadyRead) {
      notification.readBy.push({
        student: user._id,
        readAt: new Date()
      });
      await notification.save();
    }

    return {
      message: 'Notification marked as read',
      notificationId: notification._id,
      isRead: true
    };
  }

  /**
   * Mark all eligible notifications as read for the authenticated student
   */
  async markAllAsRead(user) {
    if (user.role !== 'STUDENT') {
      throw new AppError('Only students can mark notifications as read', 403);
    }

    const { notifications } = await this.getNotifications(user);
    const unreadNotifications = notifications.filter((n) => !n.isRead);

    const unreadIds = unreadNotifications.map((n) => n._id);

    if (unreadIds.length > 0) {
      await Notification.updateMany(
        { _id: { $in: unreadIds } },
        {
          $addToSet: {
            readBy: {
              student: user._id,
              readAt: new Date()
            }
          }
        }
      );
    }

    return {
      message: 'All notifications marked as read',
      count: unreadIds.length
    };
  }

  /**
   * Delete a notification (Teacher or Admin only, soft-delete)
   */
  async deleteNotification(user, notificationId) {
    if (user.role === 'STUDENT') {
      throw new AppError('Students are strictly forbidden from deleting notifications', 403);
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      active: true
    });

    if (!notification) {
      throw new AppError('Notification not found or already deleted', 404);
    }

    if (user.role === 'TEACHER') {
      const creatorIdStr = (notification.createdBy?._id || notification.createdBy).toString();
      if (creatorIdStr !== user._id.toString()) {
        throw new AppError('You are only authorized to delete notifications that you authored', 403);
      }
    }

    notification.active = false;
    await notification.save();

    return {
      message: 'Notification deleted successfully',
      notificationId: notification._id
    };
  }
}

module.exports = new NotificationService();
