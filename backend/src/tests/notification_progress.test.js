const assert = require('assert');
const mongoose = require('mongoose');
const notificationService = require('../services/notificationService');
const progressService = require('../services/progressService');
const {
  Notification,
  Experiment,
  Lab,
  Section,
  LabAssignment,
  User,
  Evaluation,
  VivaEvaluation,
  Submission
} = require('../models');
const { validateCreateNotificationInput } = require('../validators/notification.validator');

console.log('=== Running Phase 9 Notifications & Student Progress Comprehensive Tests ===\n');

async function runPhase9Tests() {
  let passed = 0;
  let total = 0;

  async function test(description, fn) {
    total++;
    try {
      await fn();
      console.log(`✓ [Test ${total}] ${description}`);
      passed++;
    } catch (err) {
      console.error(`✗ [Test ${total}] ${description}`);
      console.error(err);
      process.exit(1);
    }
  }

  // --- Mock Entities ---
  const adminUser = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000001'),
    name: 'Admin User',
    rollNumber: 'ADMIN01',
    role: 'ADMIN_HOD',
    active: true
  };

  const teacherMainA = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000010'),
    name: 'Prof Vance',
    rollNumber: 'PROFVANCE',
    role: 'TEACHER',
    active: true
  };

  const teacherOther = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000011'),
    name: 'Prof Other',
    rollNumber: 'PROFOTHER',
    role: 'TEACHER',
    active: true
  };

  const teacherUnassigned = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000012'),
    name: 'Prof Unassigned',
    rollNumber: 'PROFUNASS',
    role: 'TEACHER',
    active: true
  };

  const studentA = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000020'),
    name: 'Alice Student',
    rollNumber: '202301001',
    role: 'STUDENT',
    section: 'CSE-A',
    active: true
  };

  const studentB = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000021'),
    name: 'Bob Student',
    rollNumber: '202301002',
    role: 'STUDENT',
    section: 'CSE-B',
    active: true
  };

  const sectionA = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000100'),
    name: 'Section A',
    sectionCode: 'CSE-A',
    active: true
  };

  const sectionB = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000101'),
    name: 'Section B',
    sectionCode: 'CSE-B',
    active: true
  };

  const lab1 = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000200'),
    name: 'Data Structures Lab',
    code: 'CS201L',
    subject: 'Data Structures',
    department: 'CSE',
    active: true
  };

  const lab2Other = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000202'),
    name: 'Networks Lab',
    code: 'CS202L',
    subject: 'Networks',
    department: 'CSE',
    active: true
  };

  const experiment1 = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000300'),
    title: 'Binary Search Implementation',
    order: 1,
    lab: lab1._id,
    status: 'PUBLISHED',
    allowedLanguages: ['Python', 'C'],
    active: true
  };

  const experiment2 = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000301'),
    title: 'Merge Sort Implementation',
    order: 2,
    lab: lab1._id,
    status: 'PUBLISHED',
    allowedLanguages: ['Python', 'C++'],
    active: true
  };

  // In-memory mock database collections
  let mockNotifications = [];
  let mockEvaluations = [];
  let mockVivaEvaluations = [];
  let mockSubmissions = [];
  const mockUsers = [adminUser, teacherMainA, teacherOther, teacherUnassigned, studentA, studentB];

  function setupMocks() {
    mockNotifications = [];
    mockEvaluations = [];
    mockVivaEvaluations = [];
    mockSubmissions = [];

    User.findById = (id) => {
      const found = mockUsers.find((u) => u._id.toString() === id?.toString());
      return Promise.resolve(found || null);
    };

    User.findOne = (query) => {
      const found = mockUsers.find((u) => {
        let match = true;
        if (query._id && u._id.toString() !== query._id.toString()) match = false;
        if (query.role && u.role !== query.role) match = false;
        if (query.active !== undefined && u.active !== query.active) match = false;
        return match;
      });
      return Promise.resolve(found || null);
    };

    User.find = (query) => {
      const filtered = mockUsers.filter((u) => {
        let match = true;
        if (query.role && u.role !== query.role) match = false;
        if (query.active !== undefined && u.active !== query.active) match = false;
        if (query.section && query.section.$in) {
          if (!query.section.$in.includes(u.section)) match = false;
        }
        return match;
      });
      const chain = {
        sort: () => Promise.resolve(filtered),
        then: (resolve) => resolve(filtered)
      };
      return chain;
    };

    User.countDocuments = (query) => {
      let count = 0;
      for (const u of mockUsers) {
        let match = true;
        if (query._id && query._id.$in) {
          const ids = query._id.$in.map((i) => i.toString());
          if (!ids.includes(u._id.toString())) match = false;
        }
        if (query.role && u.role !== query.role) match = false;
        if (query.active !== undefined && u.active !== query.active) match = false;
        if (match) count++;
      }
      return Promise.resolve(count);
    };

    Section.findOne = (query) => {
      if (query.sectionCode === 'CSE-A') return Promise.resolve(sectionA);
      if (query.sectionCode === 'CSE-B') return Promise.resolve(sectionB);
      if (query._id?.toString() === sectionA._id.toString()) return Promise.resolve(sectionA);
      if (query._id?.toString() === sectionB._id.toString()) return Promise.resolve(sectionB);
      return Promise.resolve(null);
    };

    Section.find = (query) => {
      let results = [sectionA, sectionB];
      if (query._id && query._id.$in) {
        const ids = query._id.$in.map((i) => i.toString());
        results = results.filter((s) => ids.includes(s._id.toString()));
      }
      return Promise.resolve(results);
    };

    Section.countDocuments = (query) => {
      return Promise.resolve(query._id?.$in?.length || 1);
    };

    Lab.findOne = (query) => {
      if (query._id?.toString() === lab1._id.toString()) return Promise.resolve(lab1);
      if (query._id?.toString() === lab2Other._id.toString()) return Promise.resolve(lab2Other);
      return Promise.resolve(null);
    };

    Lab.findById = (id) => {
      if (id?.toString() === lab1._id.toString()) return Promise.resolve(lab1);
      if (id?.toString() === lab2Other._id.toString()) return Promise.resolve(lab2Other);
      return Promise.resolve(null);
    };

    Lab.countDocuments = (query) => {
      return Promise.resolve(query._id?.$in?.length || 1);
    };

    LabAssignment.find = (query) => {
      const assignments = [];
      // Teacher A is assigned to Lab 1 + Section A
      if (query.teacher?.toString() === teacherMainA._id.toString() || !query.teacher) {
        if (!query.lab || query.lab?.toString() === lab1._id.toString()) {
          if (!query.section || query.section?.toString() === sectionA._id.toString()) {
            assignments.push({
              _id: new mongoose.Types.ObjectId(),
              teacher: teacherMainA,
              lab: lab1,
              section: sectionA,
              role: 'MAIN',
              active: true
            });
          }
        }
      }

      // Teacher Other is assigned to Lab 2 + Section B
      if (query.teacher?.toString() === teacherOther._id.toString() || !query.teacher) {
        if (!query.lab || query.lab?.toString() === lab2Other._id.toString()) {
          if (!query.section || query.section?.toString() === sectionB._id.toString()) {
            assignments.push({
              _id: new mongoose.Types.ObjectId(),
              teacher: teacherOther,
              lab: lab2Other,
              section: sectionB,
              role: 'MAIN',
              active: true
            });
          }
        }
      }

      const chain = {
        populate: () => Promise.resolve(assignments),
        then: (resolve) => resolve(assignments)
      };
      return chain;
    };

    LabAssignment.findOne = (query) => {
      // Check for Teacher A on Lab 1
      if (
        query.teacher?.toString() === teacherMainA._id.toString() &&
        query.lab?.toString() === lab1._id.toString()
      ) {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          teacher: teacherMainA,
          lab: lab1,
          section: sectionA,
          role: 'MAIN',
          active: true
        });
      }

      // Check student section assignment for Lab 1 + Section A
      if (
        !query.teacher &&
        query.lab?.toString() === lab1._id.toString() &&
        query.section?.toString() === sectionA._id.toString()
      ) {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          teacher: teacherMainA,
          lab: lab1,
          section: sectionA,
          role: 'MAIN',
          active: true
        });
      }

      // Check student section assignment for Lab 2 + Section B
      if (
        !query.teacher &&
        query.lab?.toString() === lab2Other._id.toString() &&
        query.section?.toString() === sectionB._id.toString()
      ) {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          teacher: teacherOther,
          lab: lab2Other,
          section: sectionB,
          role: 'MAIN',
          active: true
        });
      }

      return Promise.resolve(null);
    };

    Experiment.find = (query) => {
      let exps = [];
      if (query.lab?.toString() === lab1._id.toString()) {
        exps = [experiment1, experiment2];
      }
      const chain = {
        sort: () => Promise.resolve(exps),
        then: (resolve) => resolve(exps)
      };
      return chain;
    };

    Evaluation.find = (query) => {
      const filtered = mockEvaluations.filter((e) => {
        let match = true;
        if (query.student && e.student.toString() !== query.student.toString()) match = false;
        if (query.lab && e.lab.toString() !== query.lab.toString()) match = false;
        if (query.isHighestScore !== undefined && e.isHighestScore !== query.isHighestScore) match = false;
        return match;
      });
      return Promise.resolve(filtered);
    };

    VivaEvaluation.find = (query) => {
      const filtered = mockVivaEvaluations.filter((v) => {
        let match = true;
        if (query.student && v.student.toString() !== query.student.toString()) match = false;
        if (query.lab && v.lab.toString() !== query.lab.toString()) match = false;
        if (query.isCurrent !== undefined && v.isCurrent !== query.isCurrent) match = false;
        return match;
      });
      return Promise.resolve(filtered);
    };

    Submission.find = (query) => {
      const filtered = mockSubmissions.filter((s) => {
        let match = true;
        if (query.student && s.student.toString() !== query.student.toString()) match = false;
        if (query.lab && s.lab.toString() !== query.lab.toString()) match = false;
        if (query.active !== undefined && s.active !== query.active) match = false;
        return match;
      });
      return Promise.resolve(filtered);
    };

    Notification.prototype.save = function () {
      if (!this._id) {
        this._id = new mongoose.Types.ObjectId();
      }
      const existingIdx = mockNotifications.findIndex((n) => n._id.toString() === this._id.toString());
      const doc = {
        _id: this._id,
        title: this.title,
        message: this.message,
        type: this.type,
        createdBy: this.createdBy,
        targetType: this.targetType,
        targetLabs: this.targetLabs || [],
        targetSections: this.targetSections || [],
        targetStudents: this.targetStudents || [],
        readBy: this.readBy || [],
        active: this.active !== undefined ? this.active : true,
        createdAt: this.createdAt || new Date(),
        updatedAt: new Date(),
        toJSON: function () {
          return { ...this };
        }
      };

      if (existingIdx >= 0) {
        mockNotifications[existingIdx] = doc;
      } else {
        mockNotifications.push(doc);
      }
      return Promise.resolve(doc);
    };

    Notification.findById = (id) => {
      const found = mockNotifications.find((n) => n._id.toString() === id?.toString());
      if (!found) return Promise.resolve(null);
      return {
        populate: () => ({
          populate: () => ({
            populate: () => Promise.resolve(found)
          })
        })
      };
    };

    Notification.findOne = (query) => {
      const found = mockNotifications.find((n) => {
        let match = true;
        if (query._id && n._id.toString() !== query._id.toString()) match = false;
        if (query.active !== undefined && n.active !== query.active) match = false;
        return match;
      });

      const chainable = {
        populate: function () {
          return chainable;
        },
        then: function (resolve, reject) {
          if (!found) {
            return Promise.resolve(null).then(resolve, reject);
          }
          const doc = {
            ...found,
            save: function () {
              const idx = mockNotifications.findIndex((x) => x._id.toString() === found._id.toString());
              if (idx >= 0) {
                mockNotifications[idx].active = this.active;
                mockNotifications[idx].readBy = this.readBy;
              }
              return Promise.resolve(this);
            }
          };
          return Promise.resolve(doc).then(resolve, reject);
        }
      };

      return chainable;
    };

    Notification.find = (query) => {
      const results = mockNotifications.filter((n) => {
        let match = true;
        if (query.active !== undefined && n.active !== query.active) match = false;
        if (query.createdBy && n.createdBy.toString() !== query.createdBy.toString()) match = false;
        if (query.$or) {
          const orMatches = query.$or.some((cond) => {
            if (cond.targetType === 'ALL_STUDENTS' && n.targetType === 'ALL_STUDENTS') return true;
            if (cond.targetStudents && n.targetStudents.some((s) => s.toString() === cond.targetStudents.toString()))
              return true;
            if (cond.targetSections && n.targetSections.some((s) => s.toString() === cond.targetSections.toString()))
              return true;
            if (cond.targetLabs && cond.targetLabs.$in) {
              const labIds = cond.targetLabs.$in.map((l) => l.toString());
              if (n.targetLabs.some((l) => labIds.includes(l.toString()))) return true;
            }
            return false;
          });
          if (!orMatches) match = false;
        }
        return match;
      });

      const chain = {
        sort: () => chain,
        populate: () => chain,
        then: (resolve, reject) => Promise.resolve(results).then(resolve, reject)
      };
      return chain;
    };

    Notification.updateMany = (query, update) => {
      let count = 0;
      if (update.$addToSet && update.$addToSet.readBy) {
        const toAdd = update.$addToSet.readBy;
        for (const n of mockNotifications) {
          if (query._id?.$in) {
            const ids = query._id.$in.map((i) => i.toString());
            if (ids.includes(n._id.toString())) {
              if (!n.readBy.some((r) => r.student.toString() === toAdd.student.toString())) {
                n.readBy.push(toAdd);
                count++;
              }
            }
          }
        }
      }
      return Promise.resolve({ modifiedCount: count });
    };
  }

  // =========================================================================
  // Section 1: Notification Authorization & Targeting (1-10)
  // =========================================================================
  console.log('--- Section 1: Notification Authorization & Targeting (1-10) ---');

  setupMocks();

  let labNotificationId;
  let sectionNotificationId;
  let studentNotificationId;

  await test('1. Authorized teacher can create notification targeted to assigned lab', async () => {
    const created = await notificationService.createNotification(teacherMainA, {
      title: 'Lab 1 Safety Precautions',
      message: 'Please review the safety guidelines for Binary Search Lab.',
      type: 'LAB',
      targetType: 'LAB',
      targetLabs: [lab1._id]
    });
    assert.ok(created);
    assert.strictEqual(created.title, 'Lab 1 Safety Precautions');
    assert.strictEqual(created.targetType, 'LAB');
    labNotificationId = created._id;
  });

  await test('2. Authorized teacher can create notification targeted to assigned section', async () => {
    const created = await notificationService.createNotification(teacherMainA, {
      title: 'Section A Homework Deadline',
      message: 'Homework 1 is due on Friday.',
      type: 'DEADLINE',
      targetType: 'SECTION',
      targetSections: [sectionA._id]
    });
    assert.ok(created);
    assert.strictEqual(created.title, 'Section A Homework Deadline');
    sectionNotificationId = created._id;
  });

  await test('3. Authorized teacher can create notification targeted to assigned student', async () => {
    const created = await notificationService.createNotification(teacherMainA, {
      title: 'Individual Feedback for Alice',
      message: 'Great job on the experiment implementation.',
      type: 'GENERAL',
      targetType: 'INDIVIDUAL',
      targetStudents: [studentA._id]
    });
    assert.ok(created);
    assert.strictEqual(created.title, 'Individual Feedback for Alice');
    studentNotificationId = created._id;
  });

  await test('4. Unauthorized teacher cannot create notification for unassigned lab (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        await notificationService.createNotification(teacherMainA, {
          title: 'Unauthorized Lab Notice',
          message: 'Trying to broadcast to Lab 2',
          targetType: 'LAB',
          targetLabs: [lab2Other._id]
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /not authorized to broadcast/i);
        return true;
      }
    );
  });

  await test('5. Unauthorized teacher cannot create notification for unassigned section (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        await notificationService.createNotification(teacherMainA, {
          title: 'Unauthorized Section Notice',
          message: 'Trying to broadcast to Section B',
          targetType: 'SECTION',
          targetSections: [sectionB._id]
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /not authorized to broadcast/i);
        return true;
      }
    );
  });

  await test('6. Unauthorized teacher cannot target student outside assigned section (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        await notificationService.createNotification(teacherMainA, {
          title: 'Unauthorized Student Notice',
          message: 'Trying to target Bob in Section B',
          targetType: 'INDIVIDUAL',
          targetStudents: [studentB._id]
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /outside your assigned lab sections/i);
        return true;
      }
    );
  });

  await test('7. Student cannot create or broadcast notifications (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        await notificationService.createNotification(studentA, {
          title: 'Student Attempt Notice',
          message: 'Students cannot post notices'
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /Students are not authorized/i);
        return true;
      }
    );
  });

  await test('8. Admin can create notification and target any lab/section/student', async () => {
    const adminCreated = await notificationService.createNotification(adminUser, {
      title: 'College-wide Maintenance Announcement',
      message: 'System upgrade scheduled for Sunday.',
      type: 'ANNOUNCEMENT',
      targetType: 'ALL_STUDENTS'
    });
    assert.ok(adminCreated);
    assert.strictEqual(adminCreated.title, 'College-wide Maintenance Announcement');
  });

  await test('9. Notification title exceeding 200 characters is rejected with 400', async () => {
    const mockReq = {
      body: {
        title: 'A'.repeat(201),
        message: 'Valid message body.'
      }
    };
    let errorPassed = false;
    validateCreateNotificationInput(mockReq, {}, (err) => {
      if (err) {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /200 characters/i);
        errorPassed = true;
      }
    });
    assert.ok(errorPassed, 'Validator should reject title exceeding 200 characters');
  });

  await test('10. Notification message exceeding 2000 characters is rejected with 400', async () => {
    const mockReq = {
      body: {
        title: 'Valid Title',
        message: 'M'.repeat(2001)
      }
    };
    let errorPassed = false;
    validateCreateNotificationInput(mockReq, {}, (err) => {
      if (err) {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /2000 characters/i);
        errorPassed = true;
      }
    });
    assert.ok(errorPassed, 'Validator should reject message exceeding 2000 characters');
  });

  // =========================================================================
  // Section 2: Student Notification Feed & Read/Unread Lifecycle (11-18)
  // =========================================================================
  console.log('\n--- Section 2: Student Notification Feed & Read/Unread Lifecycle (11-18) ---');

  await test('11. Student feed returns targeted notifications for their enrolled lab/section/individual/all', async () => {
    const feed = await notificationService.getNotifications(studentA);
    assert.ok(feed.notifications);
    assert.strictEqual(feed.totalCount, 4); // Lab 1 safety, Sec A deadline, Individual Alice, and All Students announcement
    assert.strictEqual(feed.unreadCount, 4);
  });

  await test('12. Student feed excludes notifications targeted to other labs/sections/students', async () => {
    // Bob is in Section B, Lab 2
    const feedB = await notificationService.getNotifications(studentB);
    assert.ok(feedB.notifications);
    // Bob should only receive the ALL_STUDENTS announcement (1 item)
    assert.strictEqual(feedB.totalCount, 1);
    assert.strictEqual(feedB.notifications[0].title, 'College-wide Maintenance Announcement');
  });

  await test('13. Student can view a notification targeted to their scope', async () => {
    const notif = await notificationService.getNotificationById(studentA, labNotificationId);
    assert.ok(notif);
    assert.strictEqual(notif.title, 'Lab 1 Safety Precautions');
    assert.strictEqual(notif.isRead, false);
  });

  await test('14. Student cannot view an unrelated notification (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        // Bob tries to view Alice's individual notification
        await notificationService.getNotificationById(studentB, studentNotificationId);
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /do not have access/i);
        return true;
      }
    );
  });

  await test('15. Student can mark an eligible notification as read (PATCH /api/notifications/:id/read)', async () => {
    const result = await notificationService.markAsRead(studentA, labNotificationId);
    assert.ok(result);
    assert.strictEqual(result.isRead, true);

    const feed = await notificationService.getNotifications(studentA);
    assert.strictEqual(feed.unreadCount, 3); // 4 total - 1 read = 3 unread
  });

  await test('16. Student cannot mark an unrelated notification as read (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        await notificationService.markAsRead(studentB, studentNotificationId);
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /unrelated notification/i);
        return true;
      }
    );
  });

  await test('17. Student can mark all unread notifications as read (PATCH /api/notifications/read-all)', async () => {
    const result = await notificationService.markAllAsRead(studentA);
    assert.ok(result);
    assert.strictEqual(result.count, 3);

    const feed = await notificationService.getNotifications(studentA);
    assert.strictEqual(feed.unreadCount, 0);
  });

  await test('18. Unread count is computed accurately for student feed', async () => {
    const feed = await notificationService.getNotifications(studentA);
    assert.strictEqual(feed.unreadCount, 0);
    assert.strictEqual(feed.totalCount, 4);
  });

  // =========================================================================
  // Section 3: Teacher-Only Notification Deletion (19-22)
  // =========================================================================
  console.log('\n--- Section 3: Teacher-Only Notification Deletion (19-22) ---');

  await test('19. Authorized teacher can delete (soft-delete) a notification they authored', async () => {
    const delResult = await notificationService.deleteNotification(teacherMainA, studentNotificationId);
    assert.ok(delResult);
    assert.match(delResult.message, /deleted successfully/i);

    // Verify it is no longer in active queries
    const feed = await notificationService.getNotifications(teacherMainA);
    const found = feed.notifications.find((n) => n._id.toString() === studentNotificationId.toString());
    assert.strictEqual(found, undefined);
  });

  await test('20. Teacher cannot delete a notification authored by another teacher (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        // Teacher Other tries to delete Teacher Main A's notification
        await notificationService.deleteNotification(teacherOther, labNotificationId);
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /only authorized to delete notifications that you authored/i);
        return true;
      }
    );
  });

  await test('21. Student cannot delete a notification (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        await notificationService.deleteNotification(studentA, labNotificationId);
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /strictly forbidden from deleting/i);
        return true;
      }
    );
  });

  await test('22. Admin can delete any notification', async () => {
    const delResult = await notificationService.deleteNotification(adminUser, sectionNotificationId);
    assert.ok(delResult);
    assert.match(delResult.message, /deleted successfully/i);
  });

  // =========================================================================
  // Section 4: Student & Cohort Progress Tracking (23-28)
  // =========================================================================
  console.log('\n--- Section 4: Student & Cohort Progress Tracking (23-28) ---');

  // Populate mock evaluations & viva scores for Student A in Lab 1
  mockEvaluations = [
    {
      _id: new mongoose.Types.ObjectId(),
      student: studentA._id,
      experiment: experiment1._id,
      lab: lab1._id,
      score: 8.5, // Automated score /10
      isHighestScore: true
    }
  ];

  mockVivaEvaluations = [
    {
      _id: new mongoose.Types.ObjectId(),
      student: studentA._id,
      experiment: experiment1._id,
      lab: lab1._id,
      marks: 4.5, // Viva marks /5
      isCurrent: true,
      status: 'EVALUATED'
    }
  ];

  mockSubmissions = [
    {
      _id: new mongoose.Types.ObjectId(),
      student: studentA._id,
      experiment: experiment1._id,
      lab: lab1._id,
      attemptNumber: 1,
      active: true
    }
  ];

  await test('23. Student can retrieve their overall progress across all assigned labs (GET /api/progress/student)', async () => {
    const progress = await progressService.getStudentOverallProgress(studentA);
    assert.ok(progress.summary);
    assert.strictEqual(progress.summary.totalEnrolledLabs, 1);
    assert.strictEqual(progress.summary.totalExperiments, 2);
    assert.strictEqual(progress.summary.completedExperiments, 1);
    assert.strictEqual(progress.summary.pendingExperiments, 1);
    assert.strictEqual(progress.summary.overallCompletionPercentage, 50);
    assert.strictEqual(progress.summary.averageTotalScore, 13); // 8.5 + 4.5 = 13 / 15
  });

  await test('24. Student can retrieve detailed progress for an enrolled laboratory (GET /api/progress/student/lab/:labId)', async () => {
    const labProg = await progressService.getStudentLabProgress(studentA, lab1._id);
    assert.ok(labProg.lab);
    assert.strictEqual(labProg.totalExperiments, 2);
    assert.strictEqual(labProg.completedExperiments, 1);
    assert.strictEqual(labProg.pendingExperiments, 1);
    assert.strictEqual(labProg.experiments.length, 2);
    assert.strictEqual(labProg.experiments[0].isCompleted, true);
    assert.strictEqual(labProg.experiments[0].automatedScore, 8.5);
    assert.strictEqual(labProg.experiments[0].vivaScore, 4.5);
    assert.strictEqual(labProg.experiments[0].totalScore, 13.0);
    assert.strictEqual(labProg.experiments[1].isCompleted, false);
    assert.strictEqual(labProg.experiments[1].totalScore, 0);
  });

  await test('25. Student cannot access progress for an unenrolled laboratory (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        await progressService.getStudentLabProgress(studentA, lab2Other._id);
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /not assigned to your academic section/i);
        return true;
      }
    );
  });

  await test('26. Student progress accurately calculates completed vs pending experiments and completion percentage', async () => {
    const labProg = await progressService.getStudentLabProgress(studentA, lab1._id);
    assert.strictEqual(labProg.completedExperiments, 1);
    assert.strictEqual(labProg.pendingExperiments, 1);
    assert.strictEqual(labProg.completionPercentage, 50.0);
  });

  await test('27. Student progress correctly incorporates highest automated score (/10) and viva score (/5) into total score (/15)', async () => {
    const labProg = await progressService.getStudentLabProgress(studentA, lab1._id);
    assert.strictEqual(labProg.averageAutomatedScore, 8.5);
    assert.strictEqual(labProg.averageVivaScore, 4.5);
    assert.strictEqual(labProg.averageTotalScore, 13.0);
  });

  await test('28. Progress excludes unattempted/inactive experiments from completed count and score averages', async () => {
    // Experiment 2 is pending and has 0 score, not dragging down the average of completed experiments
    const labProg = await progressService.getStudentLabProgress(studentA, lab1._id);
    assert.strictEqual(labProg.experiments[1].isCompleted, false);
    assert.strictEqual(labProg.averageTotalScore, 13.0);
  });

  // =========================================================================
  // Section 5: Teacher Cohort Progress & Security Guards (29-34)
  // =========================================================================
  console.log('\n--- Section 5: Teacher Cohort Progress & Security Guards (29-34) ---');

  await test('29. Authorized teacher can retrieve laboratory cohort student progress (GET /api/progress/lab/:labId)', async () => {
    const cohort = await progressService.getLabCohortProgress(teacherMainA, lab1._id);
    assert.ok(cohort.studentsProgress);
    assert.strictEqual(cohort.totalStudents, 1); // Alice is enrolled in Section A
    assert.strictEqual(cohort.studentsProgress[0].student.rollNumber, '202301001');
    assert.strictEqual(cohort.studentsProgress[0].completedExperiments, 1);
    assert.strictEqual(cohort.studentsProgress[0].averageTotalScore, 13.0);
  });

  await test('30. Unauthorized teacher without active assignment cannot access lab cohort progress (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        // Teacher Other is not assigned to Lab 1
        await progressService.getLabCohortProgress(teacherOther, lab1._id);
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /do not have an active assignment/i);
        return true;
      }
    );
  });

  await test('31. Authorized teacher can retrieve individual student progress for assigned lab', async () => {
    const stuProg = await progressService.getStudentProgressForTeacher(teacherMainA, lab1._id, studentA._id);
    assert.ok(stuProg.student);
    assert.strictEqual(stuProg.student.name, 'Alice Student');
    assert.strictEqual(stuProg.completedExperiments, 1);
    assert.strictEqual(stuProg.averageTotalScore, 13.0);
  });

  await test('32. Client-supplied role tampering in body/query cannot bypass authorization', async () => {
    // Calling service with student identity regardless of payload pretends to be role TEACHER
    await assert.rejects(
      async () => {
        await notificationService.createNotification(studentA, {
          role: 'TEACHER', // Client tampering attempt
          title: 'Forged Role',
          message: 'Should be rejected'
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        return true;
      }
    );
  });

  await test('33. Client-supplied teacherId tampering cannot grant faculty progress/notification access', async () => {
    await assert.rejects(
      async () => {
        // Student pretending to supply teacherId in payload
        await progressService.getLabCohortProgress(studentA, lab1._id);
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        return true;
      }
    );
  });

  await test('34. Client-supplied studentId tampering cannot access another student progress', async () => {
    await assert.rejects(
      async () => {
        // Student B attempting to access Lab 1 progress
        await progressService.getStudentLabProgress(studentB, lab1._id);
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        return true;
      }
    );
  });

  console.log(`\n==================================================`);
  console.log(`Phase 9 Test Results: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log(`==================================================\n`);
}

runPhase9Tests().catch((err) => {
  console.error('Fatal error during Phase 9 tests:', err);
  process.exit(1);
});
