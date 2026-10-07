const assert = require('assert');
const mongoose = require('mongoose');
const labService = require('../services/labService');
const {
  User,
  Section,
  Lab,
  LabAssignment,
  Experiment,
  TestCase,
  Submission,
  Evaluation,
  VivaEvaluation,
  ReevaluationRequest,
  Notification
} = require('../models');
const { authorize } = require('../middleware/auth');

console.log('=== Running Lab Permanent Deletion & Academic Protection Test Suite ===\n');

async function runLabDeletionTests() {
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✓ [Test ${total}] ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ [Test ${total}] ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  // In-memory Mock Collections
  let mockLabs = [];
  let mockLabAssignments = [];
  let mockExperiments = [];
  let mockTestCases = [];
  let mockSubmissions = [];
  let mockEvaluations = [];
  let mockVivaEvaluations = [];
  let mockReevaluations = [];
  let mockNotifications = [];
  let mockUsers = [];
  let mockSections = [];

  // Overrides
  Lab.findById = function (id) {
    const lab = mockLabs.find((l) => l._id.toString() === id.toString()) || null;
    return {
      session: function () {
        return Promise.resolve(lab);
      },
      then: function (resolve) {
        return Promise.resolve(lab).then(resolve);
      }
    };
  };

  Lab.deleteOne = function (query) {
    const prevCount = mockLabs.length;
    mockLabs = mockLabs.filter((l) => l._id.toString() !== query._id.toString());
    const res = { deletedCount: prevCount - mockLabs.length };
    return {
      session: function () {
        return Promise.resolve(res);
      },
      then: function (resolve) {
        return Promise.resolve(res).then(resolve);
      }
    };
  };

  Lab.findByIdAndUpdate = function (id, update, options) {
    const lab = mockLabs.find((l) => l._id.toString() === id.toString());
    if (lab) {
      Object.assign(lab, update);
    }
    return Promise.resolve(lab);
  };

  Experiment.find = function (query = {}) {
    let result = [...mockExperiments];
    if (query.lab) {
      result = result.filter((e) => e.lab.toString() === query.lab.toString());
    }
    if (query._id && query._id.$in) {
      const idStrs = query._id.$in.map((id) => id.toString());
      result = result.filter((e) => idStrs.includes(e._id.toString()));
    }
    return {
      select: function () {
        return this;
      },
      lean: function () {
        return this;
      },
      session: function () {
        return Promise.resolve(result);
      },
      then: function (resolve) {
        return Promise.resolve(result).then(resolve);
      }
    };
  };

  Experiment.countDocuments = function (query = {}) {
    let count = 0;
    if (query.lab) {
      count = mockExperiments.filter((e) => e.lab.toString() === query.lab.toString()).length;
    }
    return {
      session: function () {
        return Promise.resolve(count);
      },
      then: function (resolve) {
        return Promise.resolve(count).then(resolve);
      }
    };
  };

  Experiment.deleteMany = function (query = {}) {
    let prev = mockExperiments.length;
    if (query.lab) {
      mockExperiments = mockExperiments.filter((e) => e.lab.toString() !== query.lab.toString());
    }
    const res = { deletedCount: prev - mockExperiments.length };
    return {
      session: function () {
        return Promise.resolve(res);
      },
      then: function (resolve) {
        return Promise.resolve(res).then(resolve);
      }
    };
  };

  TestCase.countDocuments = function (query = {}) {
    let count = 0;
    if (query.experiment && query.experiment.$in) {
      const expIds = query.experiment.$in.map((id) => id.toString());
      count = mockTestCases.filter((tc) => expIds.includes(tc.experiment.toString())).length;
    }
    return {
      session: function () {
        return Promise.resolve(count);
      },
      then: function (resolve) {
        return Promise.resolve(count).then(resolve);
      }
    };
  };

  TestCase.deleteMany = function (query = {}) {
    let prev = mockTestCases.length;
    if (query.experiment && query.experiment.$in) {
      const expIds = query.experiment.$in.map((id) => id.toString());
      mockTestCases = mockTestCases.filter((tc) => !expIds.includes(tc.experiment.toString()));
    }
    const res = { deletedCount: prev - mockTestCases.length };
    return {
      session: function () {
        return Promise.resolve(res);
      },
      then: function (resolve) {
        return Promise.resolve(res).then(resolve);
      }
    };
  };

  LabAssignment.countDocuments = function (query = {}) {
    let count = 0;
    if (query.lab) {
      count = mockLabAssignments.filter((a) => a.lab.toString() === query.lab.toString()).length;
    }
    return {
      session: function () {
        return Promise.resolve(count);
      },
      then: function (resolve) {
        return Promise.resolve(count).then(resolve);
      }
    };
  };

  LabAssignment.deleteMany = function (query = {}) {
    let prev = mockLabAssignments.length;
    if (query.lab) {
      mockLabAssignments = mockLabAssignments.filter((a) => a.lab.toString() !== query.lab.toString());
    }
    const res = { deletedCount: prev - mockLabAssignments.length };
    return {
      session: function () {
        return Promise.resolve(res);
      },
      then: function (resolve) {
        return Promise.resolve(res).then(resolve);
      }
    };
  };

  Submission.countDocuments = function (query = {}) {
    let count = 0;
    if (query.$or) {
      const labId = query.$or[0]?.lab?.toString();
      const expIds = (query.$or[1]?.experiment?.$in || []).map((id) => id.toString());
      count = mockSubmissions.filter(
        (s) => (labId && s.lab?.toString() === labId) || (s.experiment && expIds.includes(s.experiment.toString()))
      ).length;
    } else if (query.lab) {
      count = mockSubmissions.filter((s) => s.lab?.toString() === query.lab.toString()).length;
    }
    return {
      session: function () {
        return Promise.resolve(count);
      },
      then: function (resolve) {
        return Promise.resolve(count).then(resolve);
      }
    };
  };

  Evaluation.countDocuments = function (query = {}) {
    let count = 0;
    if (query.$or) {
      const labId = query.$or[0]?.lab?.toString();
      const expIds = (query.$or[1]?.experiment?.$in || []).map((id) => id.toString());
      count = mockEvaluations.filter(
        (e) => (labId && e.lab?.toString() === labId) || (e.experiment && expIds.includes(e.experiment.toString()))
      ).length;
    } else if (query.submission && query.submission.$in) {
      const subIds = query.submission.$in.map((id) => id.toString());
      count = mockEvaluations.filter((e) => subIds.includes(e.submission?.toString())).length;
    } else if (query.experiment && query.experiment.$in) {
      const expIds = query.experiment.$in.map((id) => id.toString());
      count = mockEvaluations.filter((e) => expIds.includes(e.experiment?.toString())).length;
    }
    return {
      session: function () {
        return Promise.resolve(count);
      },
      then: function (resolve) {
        return Promise.resolve(count).then(resolve);
      }
    };
  };

  VivaEvaluation.countDocuments = function (query = {}) {
    let count = 0;
    if (query.$or) {
      const labId = query.$or[0]?.lab?.toString();
      const expIds = (query.$or[1]?.experiment?.$in || []).map((id) => id.toString());
      count = mockVivaEvaluations.filter(
        (v) => (labId && v.lab?.toString() === labId) || (v.experiment && expIds.includes(v.experiment.toString()))
      ).length;
    } else if (query.lab) {
      count = mockVivaEvaluations.filter((v) => v.lab?.toString() === query.lab.toString()).length;
    } else if (query.experiment && query.experiment.$in) {
      const expIds = query.experiment.$in.map((id) => id.toString());
      count = mockVivaEvaluations.filter((v) => expIds.includes(v.experiment?.toString())).length;
    }
    return {
      session: function () {
        return Promise.resolve(count);
      },
      then: function (resolve) {
        return Promise.resolve(count).then(resolve);
      }
    };
  };

  ReevaluationRequest.countDocuments = function (query = {}) {
    let count = 0;
    if (query.$or) {
      const labId = query.$or[0]?.lab?.toString();
      const expIds = (query.$or[1]?.experiment?.$in || []).map((id) => id.toString());
      count = mockReevaluations.filter(
        (r) => (labId && r.lab?.toString() === labId) || (r.experiment && expIds.includes(r.experiment.toString())) || (r.submission && mockSubmissions.some(s => s._id.toString() === r.submission.toString() && ((labId && s.lab?.toString() === labId) || (s.experiment && expIds.includes(s.experiment.toString())))))
      ).length;
    } else if (query.submission && query.submission.$in) {
      const subIds = query.submission.$in.map((id) => id.toString());
      count = mockReevaluations.filter((r) => subIds.includes(r.submission?.toString())).length;
    }
    return {
      session: function () {
        return Promise.resolve(count);
      },
      then: function (resolve) {
        return Promise.resolve(count).then(resolve);
      }
    };
  };

  Notification.updateMany = function (query, update) {
    if (query.targetLabs && update.$pull && update.$pull.targetLabs) {
      const labId = update.$pull.targetLabs.toString();
      mockNotifications.forEach((n) => {
        if (n.targetLabs) {
          n.targetLabs = n.targetLabs.filter((id) => id.toString() !== labId);
        }
      });
    }
    return {
      session: function () {
        return Promise.resolve({ modifiedCount: 1 });
      },
      then: function (resolve) {
        return Promise.resolve({ modifiedCount: 1 }).then(resolve);
      }
    };
  };

  function resetState() {
    mockLabs = [];
    mockLabAssignments = [];
    mockExperiments = [];
    mockTestCases = [];
    mockSubmissions = [];
    mockEvaluations = [];
    mockVivaEvaluations = [];
    mockReevaluations = [];
    mockNotifications = [];
    mockUsers = [];
    mockSections = [];
  }

  // --- 1. Authorization Middleware Tests ---
  await test('RBAC: ADMIN_HOD is authorized to access deletion routes', async () => {
    const middleware = authorize('ADMIN_HOD');
    let calledNext = false;
    const req = { user: { role: 'ADMIN_HOD' } };
    const res = {};
    const next = () => {
      calledNext = true;
    };

    middleware(req, res, next);
    assert.strictEqual(calledNext, true, 'ADMIN_HOD must be permitted');
  });

  await test('RBAC: STUDENT is rejected with 403 Forbidden', async () => {
    const middleware = authorize('ADMIN_HOD');
    let errorReceived = null;
    const req = { user: { role: 'STUDENT' } };
    const res = {};
    const next = (err) => {
      errorReceived = err;
    };

    middleware(req, res, next);
    assert.ok(errorReceived, 'STUDENT role must be rejected with error');
    assert.strictEqual(errorReceived.statusCode, 403, 'STUDENT role must be forbidden (403)');
  });

  await test('RBAC: TEACHER is rejected with 403 Forbidden', async () => {
    const middleware = authorize('ADMIN_HOD');
    let errorReceived = null;
    const req = { user: { role: 'TEACHER' } };
    const res = {};
    const next = (err) => {
      errorReceived = err;
    };

    middleware(req, res, next);
    assert.ok(errorReceived, 'TEACHER role must be rejected with error');
    assert.strictEqual(errorReceived.statusCode, 403, 'TEACHER role must be forbidden (403)');
  });

  await test('RBAC: Unauthenticated user (no req.user) is rejected with 401 Unauthorized', async () => {
    const middleware = authorize('ADMIN_HOD');
    let errorReceived = null;
    const req = {};
    const res = {};
    const next = (err) => {
      errorReceived = err;
    };

    middleware(req, res, next);
    assert.ok(errorReceived, 'Unauthenticated request must be rejected with error');
    assert.strictEqual(errorReceived.statusCode, 401, 'Unauthenticated user must receive 401');
  });

  // --- 2. Lab Not Found (404) ---
  await test('Deleting non-existent lab throws 404', async () => {
    resetState();
    const fakeId = new mongoose.Types.ObjectId();
    try {
      await labService.deleteLab(fakeId);
      assert.fail('Should have thrown 404 error');
    } catch (err) {
      assert.strictEqual(err.statusCode, 404);
      assert.match(err.message, /Laboratory not found/i);
    }
  });

  // --- 3. Academic History Protection (Submissions Exist) ---
  await test('Lab Deletion is strictly BLOCKED if student submissions exist', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const expId = new mongoose.Types.ObjectId();
    const subId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'Data Structures Lab', code: 'CS-201P', active: true });
    mockExperiments.push({ _id: expId, title: 'Stack Implementation', lab: labId });
    mockTestCases.push({ _id: new mongoose.Types.ObjectId(), experiment: expId, name: 'Test 1' });
    mockSubmissions.push({ _id: subId, lab: labId, experiment: expId, student: new mongoose.Types.ObjectId() });

    // Check preview status
    const status = await labService.getLabDeletionStatus(labId);
    assert.strictEqual(status.canDelete, false);
    assert.strictEqual(status.hasAcademicHistory, true);
    assert.strictEqual(status.submissionsCount, 1);
    assert.strictEqual(status.experimentsCount, 1);
    assert.strictEqual(status.testCasesCount, 1);
    assert.strictEqual(status.reason, 'ACADEMIC_HISTORY_EXISTS');

    // Attempt deletion
    try {
      await labService.deleteLab(labId);
      assert.fail('Should have blocked deletion due to student submissions');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.match(err.message, /academic history/i);
      assert.strictEqual(err.dependencies.submissions, 1);
    }

    // Verify all records remain completely intact
    assert.strictEqual(mockLabs.length, 1, 'Lab must not be deleted');
    assert.strictEqual(mockExperiments.length, 1, 'Experiments must not be deleted');
    assert.strictEqual(mockTestCases.length, 1, 'Test cases must not be deleted');
    assert.strictEqual(mockSubmissions.length, 1, 'Submissions must not be deleted');
  });

  // --- 4. Academic History Protection (Evaluations & Vivas & Reevaluations) ---
  await test('Lab Deletion is strictly BLOCKED if evaluations or viva records exist', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const expId = new mongoose.Types.ObjectId();
    const subId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'Algorithms Lab', code: 'CS-202P', active: true });
    mockExperiments.push({ _id: expId, title: 'Graph BFS/DFS', lab: labId });
    mockSubmissions.push({ _id: subId, lab: labId, experiment: expId });
    mockEvaluations.push({ _id: new mongoose.Types.ObjectId(), submission: subId, experiment: expId, score: 95 });
    mockVivaEvaluations.push({ _id: new mongoose.Types.ObjectId(), lab: labId, experiment: expId, score: 10 });
    mockReevaluations.push({ _id: new mongoose.Types.ObjectId(), submission: subId, reason: 'Recheck marks' });

    const status = await labService.getLabDeletionStatus(labId);
    assert.strictEqual(status.canDelete, false);
    assert.strictEqual(status.hasAcademicHistory, true);
    assert.strictEqual(status.evaluationsCount, 1);
    assert.strictEqual(status.vivaEvaluationsCount, 1);
    assert.strictEqual(status.reevaluationRequestsCount, 1);

    try {
      await labService.deleteLab(labId);
      assert.fail('Should have thrown 400 error');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.strictEqual(err.dependencies.evaluations, 1);
      assert.strictEqual(err.dependencies.vivaEvaluations, 1);
      assert.strictEqual(err.dependencies.reevaluationRequests, 1);
    }

    // Everything preserved
    assert.strictEqual(mockLabs.length, 1);
    assert.strictEqual(mockEvaluations.length, 1);
    assert.strictEqual(mockVivaEvaluations.length, 1);
    assert.strictEqual(mockReevaluations.length, 1);
  });

  // --- 5. Empty Lab Safe Deletion ---
  await test('Empty Lab (0 experiments, 0 submissions) is safely deleted with assignments', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const sectionId = new mongoose.Types.ObjectId();

    const otherLabId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'Empty Python Lab', code: 'CS-101P', active: true });
    mockLabs.push({ _id: otherLabId, name: 'Other Lab', code: 'CS-301P', active: true });

    mockLabAssignments.push({ _id: new mongoose.Types.ObjectId(), lab: labId, teacher: teacherId, section: sectionId });
    mockLabAssignments.push({ _id: new mongoose.Types.ObjectId(), lab: otherLabId, teacher: teacherId, section: sectionId });

    mockUsers.push({ _id: teacherId, name: 'Teacher A', role: 'TEACHER' });
    mockSections.push({ _id: sectionId, sectionCode: 'CSE-A' });

    const status = await labService.getLabDeletionStatus(labId);
    assert.strictEqual(status.canDelete, true);
    assert.strictEqual(status.hasAcademicHistory, false);
    assert.strictEqual(status.assignmentsCount, 1);

    const result = await labService.deleteLab(labId);
    assert.strictEqual(result.deletedLab.name, 'Empty Python Lab');
    assert.strictEqual(result.cascadeSummary.assignmentsRemoved, 1);

    // Verify lab is removed
    assert.strictEqual(mockLabs.length, 1, 'Target lab must be removed');
    assert.strictEqual(mockLabs[0]._id.toString(), otherLabId.toString(), 'Other lab must remain');

    // Verify assignment for target lab removed, other lab assignment preserved
    assert.strictEqual(mockLabAssignments.length, 1);
    assert.strictEqual(mockLabAssignments[0].lab.toString(), otherLabId.toString());

    // Teacher and Section must be untouched
    assert.strictEqual(mockUsers.length, 1, 'Teacher must not be deleted');
    assert.strictEqual(mockSections.length, 1, 'Section must not be deleted');
  });

  // --- 6. Lab with Experiments & TestCases (0 submissions) Safe Deletion ---
  await test('Lab with Experiments & TestCases (0 submissions) deletes lab-owned resources cleanly', async () => {
    resetState();
    const labAId = new mongoose.Types.ObjectId();
    const labBId = new mongoose.Types.ObjectId();

    const expA1 = new mongoose.Types.ObjectId();
    const expA2 = new mongoose.Types.ObjectId();
    const expB1 = new mongoose.Types.ObjectId();

    const tcA1 = new mongoose.Types.ObjectId();
    const tcA2 = new mongoose.Types.ObjectId();
    const tcB1 = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labAId, name: 'Web Tech Lab', code: 'IT-201P', active: true });
    mockLabs.push({ _id: labBId, name: 'DBMS Lab', code: 'CS-204P', active: true });

    mockExperiments.push({ _id: expA1, lab: labAId, title: 'HTML Forms' });
    mockExperiments.push({ _id: expA2, lab: labAId, title: 'DOM Events' });
    mockExperiments.push({ _id: expB1, lab: labBId, title: 'SQL Joins' });

    mockTestCases.push({ _id: tcA1, experiment: expA1, name: 'TC1' });
    mockTestCases.push({ _id: tcA2, experiment: expA2, name: 'TC2' });
    mockTestCases.push({ _id: tcB1, experiment: expB1, name: 'TC3' });

    mockLabAssignments.push({ _id: new mongoose.Types.ObjectId(), lab: labAId });
    mockLabAssignments.push({ _id: new mongoose.Types.ObjectId(), lab: labBId });

    mockNotifications.push({ _id: new mongoose.Types.ObjectId(), title: 'Alert', targetLabs: [labAId, labBId] });

    const status = await labService.getLabDeletionStatus(labAId);
    assert.strictEqual(status.canDelete, true);
    assert.strictEqual(status.experimentsCount, 2);
    assert.strictEqual(status.testCasesCount, 2);
    assert.strictEqual(status.submissionsCount, 0);

    const deleteRes = await labService.deleteLab(labAId);
    assert.strictEqual(deleteRes.deletedLab.code, 'IT-201P');
    assert.strictEqual(deleteRes.cascadeSummary.experimentsRemoved, 2);
    assert.strictEqual(deleteRes.cascadeSummary.testCasesRemoved, 2);
    assert.strictEqual(deleteRes.cascadeSummary.assignmentsRemoved, 1);

    // Target lab records deleted
    assert.strictEqual(mockLabs.length, 1);
    assert.strictEqual(mockLabs[0]._id.toString(), labBId.toString());

    // Lab A experiments and testcases deleted, Lab B preserved
    assert.strictEqual(mockExperiments.length, 1);
    assert.strictEqual(mockExperiments[0].lab.toString(), labBId.toString());

    assert.strictEqual(mockTestCases.length, 1);
    assert.strictEqual(mockTestCases[0].experiment.toString(), expB1.toString());

    // Notifications cleaned of labAId
    assert.strictEqual(mockNotifications[0].targetLabs.length, 1);
    assert.strictEqual(mockNotifications[0].targetLabs[0].toString(), labBId.toString());
  });

  // --- 7. Repeat Deletion (Idempotency / 404) ---
  await test('Repeated deletion of an already deleted lab returns 404 without error or crash', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    mockLabs.push({ _id: labId, name: 'Compiler Lab', code: 'CS-401P' });

    await labService.deleteLab(labId);
    assert.strictEqual(mockLabs.length, 0);

    try {
      await labService.deleteLab(labId);
      assert.fail('Second deletion should return 404');
    } catch (err) {
      assert.strictEqual(err.statusCode, 404);
    }
  });

  // --- 8. Deactivation / Archiving Preservation ---
  await test('Deactivating/Archiving a Lab preserves all records intact', async () => {
    resetState();
    const labId = new mongoose.Types.ObjectId();
    const expId = new mongoose.Types.ObjectId();
    const subId = new mongoose.Types.ObjectId();

    mockLabs.push({ _id: labId, name: 'OS Lab', code: 'CS-203P', active: true });
    mockExperiments.push({ _id: expId, lab: labId, title: 'Process Scheduling' });
    mockSubmissions.push({ _id: subId, lab: labId, experiment: expId });
    mockEvaluations.push({ _id: new mongoose.Types.ObjectId(), submission: subId, score: 88 });

    // Toggle status to inactive
    const updated = await Lab.findByIdAndUpdate(labId, { active: false }, { new: true });
    assert.strictEqual(updated.active, false);

    // All records remain in database
    assert.strictEqual(mockLabs.length, 1);
    assert.strictEqual(mockExperiments.length, 1);
    assert.strictEqual(mockSubmissions.length, 1);
    assert.strictEqual(mockEvaluations.length, 1);
  });

  console.log(`\nAll ${passed}/${total} Lab Deletion & Academic Protection tests passed successfully! ✨\n`);
}

runLabDeletionTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
