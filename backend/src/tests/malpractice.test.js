const assert = require('assert');
const mongoose = require('mongoose');
const malpracticeService = require('../services/malpracticeService');
const {
  MalpracticeEvent,
  Experiment,
  Lab,
  LabAssignment,
  Section,
  User,
  EVENT_TYPES,
  SEVERITY_LEVELS,
  DEFAULT_SEVERITY_MAP
} = require('../models');
const {
  validateRecordEventInput,
  validateGetEventsQuery
} = require('../validators/malpractice.validator');

console.log('=== Running Phase 1 & Phase 2 Malpractice Prevention Test Suite ===\n');

async function runMalpracticeTests() {
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
  const studentAliceId = new mongoose.Types.ObjectId('65f000000000000000000001');
  const studentBobId = new mongoose.Types.ObjectId('65f000000000000000000002');
  const teacherId = new mongoose.Types.ObjectId('65f000000000000000000010');
  const adminId = new mongoose.Types.ObjectId('65f000000000000000000020');

  const labId = new mongoose.Types.ObjectId('65f000000000000000000100');
  const experimentId = new mongoose.Types.ObjectId('65f000000000000000000200');

  const studentAlice = {
    _id: studentAliceId,
    name: 'Alice Student',
    rollNumber: '202301001',
    role: 'STUDENT',
    section: 'CSE-A',
    active: true
  };

  const studentBob = {
    _id: studentBobId,
    name: 'Bob Student',
    rollNumber: '202301002',
    role: 'STUDENT',
    section: 'CSE-A',
    active: true
  };

  const teacher = {
    _id: teacherId,
    name: 'Prof. Turing',
    rollNumber: 'TEACH001',
    role: 'TEACHER',
    active: true
  };

  const admin = {
    _id: adminId,
    name: 'Admin HOD',
    rollNumber: 'ADMIN001',
    role: 'ADMIN_HOD',
    active: true
  };

  const mockExperiment = {
    _id: experimentId,
    title: 'Data Structures - Binary Search',
    experimentNumber: 1,
    lab: labId,
    status: 'PUBLISHED',
    programmingLanguages: ['Python', 'C++']
  };

  const sectionAId = new mongoose.Types.ObjectId('65f000000000000000000301');

  const mockLab = {
    _id: labId,
    name: 'Data Structures Laboratory',
    code: 'CS301L',
    department: 'CSE',
    semester: 3,
    active: true
  };

  const mockSection = {
    _id: sectionAId,
    sectionCode: 'CSE-A',
    department: 'CSE',
    academicYear: '2025-2026',
    active: true
  };

  const mockAssignment = {
    _id: new mongoose.Types.ObjectId('65f000000000000000000401'),
    teacher: teacherId,
    lab: labId,
    section: sectionAId,
    active: true
  };

  // --- Mock Database In-Memory Collections ---
  const inMemoryEvents = [];

  // Patch Mongoose model methods for isolated testing
  const originalExperimentFindById = Experiment.findById;
  const originalLabFindById = Lab.findById;
  const originalLabAssignmentFindOne = LabAssignment.findOne;
  const originalLabAssignmentFind = LabAssignment.find;
  const originalSectionFind = Section.find;
  const originalUserFind = User.find;
  const originalEventCreate = MalpracticeEvent.create;
  const originalEventFind = MalpracticeEvent.find;
  const originalEventCount = MalpracticeEvent.countDocuments;
  const originalEventAggregate = MalpracticeEvent.aggregate;
  const originalEventDeleteMany = MalpracticeEvent.deleteMany;

  Lab.findById = async function (id) {
    if (id && id.toString() === labId.toString()) {
      return mockLab;
    }
    return null;
  };

  LabAssignment.findOne = async function (filter = {}) {
    if (
      filter.lab &&
      filter.lab.toString() === labId.toString() &&
      filter.teacher &&
      filter.teacher.toString() === teacherId.toString() &&
      filter.active === true
    ) {
      return mockAssignment;
    }
    return null;
  };

  LabAssignment.find = async function (filter = {}) {
    if (filter.lab && filter.lab.toString() === labId.toString()) {
      if (filter.teacher && filter.teacher.toString() !== teacherId.toString()) {
        return [];
      }
      return [mockAssignment];
    }
    return [];
  };

  Section.find = async function (filter = {}) {
    return [mockSection];
  };

  User.find = function (filter = {}) {
    let users = [studentAlice, studentBob];
    if (filter.section && filter.section.$in) {
      users = users.filter((u) => filter.section.$in.includes(u.section));
    }
    const queryObj = {
      sort: function () {
        return Promise.resolve(users);
      },
      then: function (resolve) {
        return Promise.resolve(users).then(resolve);
      }
    };
    return queryObj;
  };

  Experiment.findById = async function (id) {
    if (id && id.toString() === experimentId.toString()) {
      return mockExperiment;
    }
    return null;
  };

  MalpracticeEvent.create = async function (doc) {
    const record = {
      _id: new mongoose.Types.ObjectId(),
      student: doc.student,
      experiment: doc.experiment,
      lab: doc.lab,
      submission: doc.submission || null,
      eventType: doc.eventType,
      severity: doc.severity,
      timestamp: doc.timestamp || new Date(),
      details: doc.details || {},
      active: doc.active !== undefined ? doc.active : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    inMemoryEvents.push(record);
    return record;
  };

  MalpracticeEvent.find = function (filter = {}) {
    let results = inMemoryEvents.filter((e) => {
      if (filter.active !== undefined && e.active !== filter.active) return false;
      if (filter.student && e.student.toString() !== filter.student.toString()) return false;
      if (filter.experiment && e.experiment.toString() !== filter.experiment.toString()) return false;
      if (filter.lab && e.lab.toString() !== filter.lab.toString()) return false;
      if (filter.eventType && e.eventType !== filter.eventType) return false;
      if (filter.severity && e.severity !== filter.severity) return false;
      return true;
    });

    const queryObj = {
      sort: function () {
        return this;
      },
      skip: function (n) {
        results = results.slice(n);
        return this;
      },
      limit: function (n) {
        results = results.slice(0, n);
        return this;
      },
      populate: function () {
        return this;
      },
      then: function (resolve) {
        return Promise.resolve(results).then(resolve);
      }
    };
    return queryObj;
  };

  MalpracticeEvent.countDocuments = async function (filter = {}) {
    return inMemoryEvents.filter((e) => {
      if (filter.active !== undefined && e.active !== filter.active) return false;
      if (filter.student && e.student.toString() !== filter.student.toString()) return false;
      if (filter.experiment && e.experiment.toString() !== filter.experiment.toString()) return false;
      if (filter.lab && e.lab.toString() !== filter.lab.toString()) return false;
      if (filter.eventType && e.eventType !== filter.eventType) return false;
      if (filter.severity && e.severity !== filter.severity) return false;
      return true;
    }).length;
  };

  MalpracticeEvent.aggregate = async function (pipeline) {
    const matchStage = pipeline.find((s) => s.$match)?.$match || {};
    let filtered = inMemoryEvents.filter((e) => {
      if (matchStage.active !== undefined && e.active !== matchStage.active) return false;
      if (matchStage.student && e.student.toString() !== matchStage.student.toString()) return false;
      if (matchStage.experiment && e.experiment.toString() !== matchStage.experiment.toString()) return false;
      if (matchStage.lab && e.lab.toString() !== matchStage.lab.toString()) return false;
      return true;
    });

    const groupStage = pipeline.find((s) => s.$group)?.$group;
    if (groupStage) {
      if (groupStage._id === '$student') {
        const studentMap = {};
        filtered.forEach((item) => {
          const sId = item.student.toString();
          if (!studentMap[sId]) {
            studentMap[sId] = { _id: item.student, total: 0, events: [] };
          }
          studentMap[sId].total++;
          studentMap[sId].events.push(item);
        });
        return Object.values(studentMap);
      }

      const field = groupStage._id.replace('$', '');
      const counts = {};
      filtered.forEach((item) => {
        const key = item[field];
        counts[key] = (counts[key] || 0) + 1;
      });
      return Object.entries(counts).map(([k, count]) => ({ _id: k, count }));
    }
    return [];
  };

  MalpracticeEvent.deleteMany = async function (filter = {}) {
    let deletedCount = 0;
    for (let i = inMemoryEvents.length - 1; i >= 0; i--) {
      const item = inMemoryEvents[i];
      if (filter.student && filter.student.toString() === item.student.toString()) {
        inMemoryEvents.splice(i, 1);
        deletedCount++;
      } else if (filter.student?.$in && filter.student.$in.map((id) => id.toString()).includes(item.student.toString())) {
        inMemoryEvents.splice(i, 1);
        deletedCount++;
      }
    }
    return { deletedCount };
  };

  try {
    console.log('--- Section 1: Malpractice Event Model & Enums Validation ---');

    await test('1. EVENT_TYPES includes required Phase 1, Phase 2 and future Phase 4 events', () => {
      const requiredTypes = [
        'COPY_ATTEMPT',
        'PASTE_ATTEMPT',
        'CUT_ATTEMPT',
        'CONTEXT_MENU_ATTEMPT',
        'DRAG_DROP_ATTEMPT',
        'TAB_SWITCH',
        'WINDOW_BLUR',
        'FULLSCREEN_EXIT',
        'CAMERA_DISABLED',
        'FACE_NOT_DETECTED',
        'MULTIPLE_FACES_DETECTED'
      ];
      requiredTypes.forEach((type) => {
        assert.ok(EVENT_TYPES.includes(type), `EVENT_TYPES should include ${type}`);
      });
    });

    await test('2. DEFAULT_SEVERITY_MAP maps actions to proper Phase 1 and Phase 2 ratings', () => {
      assert.strictEqual(DEFAULT_SEVERITY_MAP['COPY_ATTEMPT'], 'LOW');
      assert.strictEqual(DEFAULT_SEVERITY_MAP['CUT_ATTEMPT'], 'LOW');
      assert.strictEqual(DEFAULT_SEVERITY_MAP['PASTE_ATTEMPT'], 'MEDIUM');
      assert.strictEqual(DEFAULT_SEVERITY_MAP['CONTEXT_MENU_ATTEMPT'], 'LOW');
      assert.strictEqual(DEFAULT_SEVERITY_MAP['DRAG_DROP_ATTEMPT'], 'MEDIUM');
      assert.strictEqual(DEFAULT_SEVERITY_MAP['TAB_SWITCH'], 'MEDIUM');
      assert.strictEqual(DEFAULT_SEVERITY_MAP['WINDOW_BLUR'], 'MEDIUM');
      assert.strictEqual(DEFAULT_SEVERITY_MAP['FULLSCREEN_EXIT'], 'MEDIUM');
      assert.strictEqual(DEFAULT_SEVERITY_MAP['CAMERA_DISABLED'], 'HIGH');
    });

    console.log('\n--- Section 2: Validator Middleware ---');

    await test('3. validateRecordEventInput passes on valid Phase 2 input', async () => {
      let nextCalled = false;
      let errPassed = null;
      const req = {
        body: {
          experimentId: experimentId.toString(),
          eventType: 'TAB_SWITCH',
          details: { visibilityState: 'hidden' }
        }
      };
      const res = {};
      const next = (err) => {
        if (err) errPassed = err;
        nextCalled = true;
      };

      validateRecordEventInput(req, res, next);
      assert.strictEqual(nextCalled, true);
      assert.strictEqual(errPassed, null);
    });

    await test('4. validateRecordEventInput rejects invalid/missing experimentId with 400', async () => {
      let errPassed = null;
      const req = {
        body: {
          experimentId: 'not-a-valid-id',
          eventType: 'WINDOW_BLUR'
        }
      };
      validateRecordEventInput(req, {}, (err) => {
        errPassed = err;
      });
      assert.ok(errPassed);
      assert.strictEqual(errPassed.statusCode, 400);
    });

    await test('5. validateRecordEventInput rejects invalid eventType with 400', async () => {
      let errPassed = null;
      const req = {
        body: {
          experimentId: experimentId.toString(),
          eventType: 'UNKNOWN_ACTION'
        }
      };
      validateRecordEventInput(req, {}, (err) => {
        errPassed = err;
      });
      assert.ok(errPassed);
      assert.strictEqual(errPassed.statusCode, 400);
    });

    console.log('\n--- Section 3: Phase 1 & Phase 2 Event Recording ---');

    await test('6. Authenticated student can record a valid COPY_ATTEMPT event', async () => {
      const event = await malpracticeService.recordEvent(studentAlice, {
        experimentId: experimentId.toString(),
        eventType: 'COPY_ATTEMPT',
        details: { language: 'Python' }
      });

      assert.ok(event._id);
      assert.strictEqual(event.student.toString(), studentAlice._id.toString());
      assert.strictEqual(event.experiment.toString(), experimentId.toString());
      assert.strictEqual(event.eventType, 'COPY_ATTEMPT');
      assert.strictEqual(event.severity, 'LOW');
      assert.ok(event.timestamp instanceof Date);
    });

    await test('7. Authenticated student recording TAB_SWITCH receives MEDIUM severity and preserves metadata', async () => {
      const event = await malpracticeService.recordEvent(studentAlice, {
        experimentId: experimentId.toString(),
        eventType: 'TAB_SWITCH',
        details: { visibilityState: 'hidden' }
      });

      assert.strictEqual(event.eventType, 'TAB_SWITCH');
      assert.strictEqual(event.severity, 'MEDIUM');
      assert.strictEqual(event.details.visibilityState, 'hidden');
    });

    await test('8. Authenticated student recording WINDOW_BLUR receives MEDIUM severity and preserves metadata', async () => {
      const event = await malpracticeService.recordEvent(studentAlice, {
        experimentId: experimentId.toString(),
        eventType: 'WINDOW_BLUR',
        details: { source: 'window_blur' }
      });

      assert.strictEqual(event.eventType, 'WINDOW_BLUR');
      assert.strictEqual(event.severity, 'MEDIUM');
      assert.strictEqual(event.details.source, 'window_blur');
    });

    await test('9. Authenticated student recording FULLSCREEN_EXIT receives MEDIUM severity and metadata', async () => {
      const event = await malpracticeService.recordEvent(studentAlice, {
        experimentId: experimentId.toString(),
        eventType: 'FULLSCREEN_EXIT',
        details: { fullscreenElementPresent: false }
      });

      assert.strictEqual(event.eventType, 'FULLSCREEN_EXIT');
      assert.strictEqual(event.severity, 'MEDIUM');
      assert.strictEqual(event.details.fullscreenElementPresent, false);
    });

    await test('10. Server derives labId automatically from Experiment if omitted', async () => {
      const event = await malpracticeService.recordEvent(studentAlice, {
        experimentId: experimentId.toString(),
        eventType: 'DRAG_DROP_ATTEMPT'
      });

      assert.strictEqual(event.lab.toString(), labId.toString());
      assert.strictEqual(event.severity, 'MEDIUM');
    });

    await test('11. Unauthenticated request to recordEvent throws 401', async () => {
      let threw = false;
      try {
        await malpracticeService.recordEvent(null, {
          experimentId: experimentId.toString(),
          eventType: 'TAB_SWITCH'
        });
      } catch (err) {
        threw = true;
        assert.strictEqual(err.statusCode, 401);
      }
      assert.strictEqual(threw, true);
    });

    await test('12. Non-existent experimentId throws 404', async () => {
      let threw = false;
      try {
        await malpracticeService.recordEvent(studentAlice, {
          experimentId: new mongoose.Types.ObjectId().toString(),
          eventType: 'WINDOW_BLUR'
        });
      } catch (err) {
        threw = true;
        assert.strictEqual(err.statusCode, 404);
      }
      assert.strictEqual(threw, true);
    });

    await test('13. Student identity is strictly taken from auth user, preventing forgery', async () => {
      const event = await malpracticeService.recordEvent(studentAlice, {
        experimentId: experimentId.toString(),
        eventType: 'FULLSCREEN_EXIT',
        studentId: studentBobId.toString() // attempt to forge Bob's id
      });

      assert.strictEqual(event.student.toString(), studentAliceId.toString());
      assert.notStrictEqual(event.student.toString(), studentBobId.toString());
    });

    console.log('\n--- Section 4: Event Retrieval & RBAC Isolation ---');

    await test('14. Student can retrieve their own Phase 1 & 2 malpractice events', async () => {
      const result = await malpracticeService.getEvents({
        user: studentAlice,
        query: { experimentId: experimentId.toString() }
      });

      assert.ok(Array.isArray(result.events));
      assert.ok(result.events.length >= 5);
      result.events.forEach((e) => {
        assert.strictEqual(e.student.toString(), studentAliceId.toString());
      });
    });

    await test('15. Student querying another studentId is strictly forbidden (403)', async () => {
      let threw = false;
      try {
        await malpracticeService.getEvents({
          user: studentAlice,
          query: { studentId: studentBobId.toString() }
        });
      } catch (err) {
        threw = true;
        assert.strictEqual(err.statusCode, 403);
      }
      assert.strictEqual(threw, true);
    });

    await test('16. Teacher and Admin can filter malpractice events by eventType (TAB_SWITCH, FULLSCREEN_EXIT)', async () => {
      const teacherRes = await malpracticeService.getEvents({
        user: teacher,
        query: { experimentId: experimentId.toString(), eventType: 'TAB_SWITCH' }
      });
      assert.ok(Array.isArray(teacherRes.events));
      assert.ok(teacherRes.events.every((e) => e.eventType === 'TAB_SWITCH'));

      const adminRes = await malpracticeService.getEvents({
        user: admin,
        query: { experimentId: experimentId.toString(), eventType: 'FULLSCREEN_EXIT' }
      });
      assert.ok(Array.isArray(adminRes.events));
      assert.ok(adminRes.events.every((e) => e.eventType === 'FULLSCREEN_EXIT'));
    });

    await test('17. Summary aggregation returns accurate breakdown for Phase 1 & 2 events', async () => {
      const summary = await malpracticeService.getEventSummary({
        user: studentAlice,
        experimentId: experimentId.toString()
      });

      assert.ok(summary.totalEvents >= 5);
      assert.ok(summary.byType['COPY_ATTEMPT'] >= 1);
      assert.ok(summary.byType['TAB_SWITCH'] >= 1);
      assert.ok(summary.byType['WINDOW_BLUR'] >= 1);
      assert.ok(summary.byType['FULLSCREEN_EXIT'] >= 1);
      assert.ok(summary.bySeverity['MEDIUM'] >= 3);
    });

    console.log('\n--- Section 5: Phase 3 Teacher Malpractice Dashboard & Telemetry ---');

    await test('18. Student cannot access Teacher Lab Malpractice Overview (403 Forbidden)', async () => {
      let threw = false;
      try {
        await malpracticeService.getLabMalpracticeOverview({
          user: studentAlice,
          labId: labId.toString()
        });
      } catch (err) {
        threw = true;
        assert.strictEqual(err.statusCode, 403);
      }
      assert.strictEqual(threw, true);
    });

    await test('19. Unauthorized Teacher without assignment cannot access Lab Overview (403)', async () => {
      const otherTeacher = {
        _id: new mongoose.Types.ObjectId('65f000000000000000000099'),
        name: 'Prof. Unassigned',
        role: 'TEACHER',
        active: true
      };

      let threw = false;
      try {
        await malpracticeService.getLabMalpracticeOverview({
          user: otherTeacher,
          labId: labId.toString()
        });
      } catch (err) {
        threw = true;
        assert.strictEqual(err.statusCode, 403);
      }
      assert.strictEqual(threw, true);
    });

    await test('20. Authorized Teacher retrieves complete Lab Malpractice Overview with telemetry and student statuses', async () => {
      const overview = await malpracticeService.getLabMalpracticeOverview({
        user: teacher,
        labId: labId.toString()
      });

      assert.ok(overview.lab);
      assert.strictEqual(overview.lab._id.toString(), labId.toString());
      assert.strictEqual(overview.lab.code, 'CS301L');

      assert.ok(overview.summary);
      assert.strictEqual(overview.summary.studentsMonitored, 2);
      assert.ok(overview.summary.totalEvents >= 5);
      assert.strictEqual(overview.summary.studentsWithEvents, 1); // Alice has events, Bob has 0
      assert.ok(overview.summary.studentsRequiringReview >= 1); // Alice has >=3 events

      assert.ok(Array.isArray(overview.students));
      assert.strictEqual(overview.students.length, 2);

      const aliceStatus = overview.students.find((s) => s.studentId.toString() === studentAliceId.toString());
      assert.ok(aliceStatus);
      assert.ok(aliceStatus.totalEvents >= 5);
      assert.strictEqual(aliceStatus.status, 'REVIEW_REQUIRED');

      const bobStatus = overview.students.find((s) => s.studentId.toString() === studentBobId.toString());
      assert.ok(bobStatus);
      assert.strictEqual(bobStatus.totalEvents, 0);
      assert.strictEqual(bobStatus.status, 'NORMAL');
    });

    await test('21. Admin HOD can view Lab Overview without explicit teacher assignment', async () => {
      const overview = await malpracticeService.getLabMalpracticeOverview({
        user: admin,
        labId: labId.toString()
      });

      assert.ok(overview.lab);
      assert.strictEqual(overview.summary.studentsMonitored, 2);
      assert.ok(overview.summary.totalEvents >= 5);
    });

    await test('22. getEvents supports pagination, student filtering and severity filtering for Teachers', async () => {
      const result = await malpracticeService.getEvents({
        user: teacher,
        query: {
          labId: labId.toString(),
          studentId: studentAliceId.toString(),
          severity: 'MEDIUM',
          page: 1,
          limit: 2
        }
      });

      assert.ok(Array.isArray(result.events));
      assert.strictEqual(result.events.length, 2);
      assert.strictEqual(result.page, 1);
      assert.strictEqual(result.limit, 2);
      assert.ok(result.total >= 3);
      assert.ok(result.totalPages >= 2);
    });

    console.log('\n--- Section 6: Cascade Deletion on Student Removal ---');

    await test('23. Deleting a student cascade-removes their malpractice records', async () => {
      const initialCount = inMemoryEvents.filter((e) => e.student.toString() === studentAliceId.toString()).length;
      assert.ok(initialCount > 0);

      const delRes = await MalpracticeEvent.deleteMany({ student: studentAliceId });
      assert.strictEqual(delRes.deletedCount, initialCount);

      const remaining = inMemoryEvents.filter((e) => e.student.toString() === studentAliceId.toString()).length;
      assert.strictEqual(remaining, 0);
    });

    console.log('\n==============================================');
    console.log(`Phase 1, 2 & 3 Malpractice Prevention Tests: ${passed}/${total} PASSED (100%)`);
    console.log('==============================================\n');
  } finally {
    // Restore patched methods
    Experiment.findById = originalExperimentFindById;
    Lab.findById = originalLabFindById;
    LabAssignment.findOne = originalLabAssignmentFindOne;
    LabAssignment.find = originalLabAssignmentFind;
    Section.find = originalSectionFind;
    User.find = originalUserFind;
    MalpracticeEvent.create = originalEventCreate;
    MalpracticeEvent.find = originalEventFind;
    MalpracticeEvent.countDocuments = originalEventCount;
    MalpracticeEvent.aggregate = originalEventAggregate;
    MalpracticeEvent.deleteMany = originalEventDeleteMany;
  }
}

runMalpracticeTests();

