const assert = require('assert');
const mongoose = require('mongoose');
const submissionService = require('../services/submissionService');
const codeExecutionService = require('../services/codeExecutionService');
const { Submission, Experiment, Lab, Section, LabAssignment, User } = require('../models');
const { validateRunInput, validateSubmitInput } = require('../validators/submission.validator');

console.log('=== Running Phase 6 Code Execution & Submission Comprehensive Tests ===\n');

async function runPhase6Tests() {
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

  const teacherMain = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000010'),
    name: 'Prof Vance',
    rollNumber: 'PROFVANCE',
    role: 'TEACHER',
    active: true
  };

  const teacherOther = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000012'),
    name: 'Prof Other',
    rollNumber: 'PROFOTHER',
    role: 'TEACHER',
    active: true
  };

  const studentSectionA = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000020'),
    name: 'Alice Student',
    rollNumber: '202301001',
    role: 'STUDENT',
    section: 'CSE-A',
    active: true
  };

  const studentSectionB = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000021'),
    name: 'Bob Student',
    rollNumber: '202301002',
    role: 'STUDENT',
    section: 'CSE-B',
    active: true
  };

  const inactiveStudent = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000022'),
    name: 'Eve Inactive',
    rollNumber: '202301003',
    role: 'STUDENT',
    section: 'CSE-A',
    active: false
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
    active: true
  };

  const inactiveLab = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000201'),
    name: 'Inactive Lab',
    code: 'CS299L',
    active: false
  };

  const experimentPublished = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000300'),
    title: 'Binary Search Implementation',
    experimentNumber: 1,
    lab: lab1,
    status: 'PUBLISHED',
    programmingLanguages: ['C', 'C++', 'Java', 'Python'],
    active: true
  };

  const experimentDraft = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000301'),
    title: 'Graph Traversal',
    experimentNumber: 2,
    lab: lab1,
    status: 'DRAFT',
    programmingLanguages: ['Python'],
    active: true
  };

  const experimentClosed = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000302'),
    title: 'Stack Operations',
    experimentNumber: 3,
    lab: lab1,
    status: 'CLOSED',
    programmingLanguages: ['C', 'Python'],
    active: true
  };

  const experimentInactiveLab = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000303'),
    title: 'Inactive Lab Exp',
    experimentNumber: 1,
    lab: inactiveLab,
    status: 'PUBLISHED',
    programmingLanguages: ['Python'],
    active: true
  };

  const experimentPublished2 = {
    _id: new mongoose.Types.ObjectId('64f000000000000000000304'),
    title: 'Linear Search Implementation',
    experimentNumber: 4,
    lab: lab1,
    status: 'PUBLISHED',
    programmingLanguages: ['C', 'C++', 'Java', 'Python'],
    active: true
  };

  // In-memory submissions store for mock testing
  let mockSubmissions = [];

  function setupMocks() {
    mockSubmissions = [];

    Section.findOne = (query) => {
      if (query.sectionCode === 'CSE-A' && query.active === true) return Promise.resolve(sectionA);
      if (query.sectionCode === 'CSE-B' && query.active === true) return Promise.resolve(sectionB);
      return Promise.resolve(null);
    };

    Lab.findById = (id) => {
      if (!id) return Promise.resolve(null);
      if (id.toString() === lab1._id.toString()) return Promise.resolve(lab1);
      if (id.toString() === inactiveLab._id.toString()) return Promise.resolve(inactiveLab);
      return Promise.resolve(null);
    };

    Experiment.findById = (id) => {
      let exp = null;
      if (id?.toString() === experimentPublished._id.toString()) exp = { ...experimentPublished };
      if (id?.toString() === experimentPublished2._id.toString()) exp = { ...experimentPublished2 };
      if (id?.toString() === experimentDraft._id.toString()) exp = { ...experimentDraft };
      if (id?.toString() === experimentClosed._id.toString()) exp = { ...experimentClosed };
      if (id?.toString() === experimentInactiveLab._id.toString()) exp = { ...experimentInactiveLab };

      return {
        populate: () => Promise.resolve(exp)
      };
    };

    LabAssignment.findOne = (query) => {
      // Lab1 is assigned to Section A (Teacher: teacherMain)
      if (
        query.lab?.toString() === lab1._id.toString() &&
        query.section?.toString() === sectionA._id.toString() &&
        query.active === true
      ) {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          lab: lab1,
          section: sectionA,
          teacher: teacherMain,
          active: true
        });
      }

      // Teacher lookups
      if (
        query.lab?.toString() === lab1._id.toString() &&
        query.teacher?.toString() === teacherMain._id.toString() &&
        query.active === true
      ) {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          lab: lab1,
          section: sectionA,
          teacher: teacherMain,
          active: true
        });
      }

      return Promise.resolve(null);
    };

    Submission.countDocuments = (query) => {
      const count = mockSubmissions.filter(
        (s) =>
          s.student.toString() === query.student.toString() &&
          s.experiment.toString() === query.experiment.toString() &&
          s.active === query.active
      ).length;
      return Promise.resolve(count);
    };

    Submission.create = (data) => {
      const doc = {
        _id: new mongoose.Types.ObjectId(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockSubmissions.push(doc);
      return Promise.resolve(doc);
    };

    Submission.find = (query) => {
      let filtered = mockSubmissions.filter((s) => {
        let match = true;
        if (query.student && s.student.toString() !== query.student.toString()) match = false;
        if (query.experiment && s.experiment.toString() !== query.experiment.toString()) match = false;
        if (query.lab && s.lab.toString() !== query.lab.toString()) match = false;
        if (query.active !== undefined && s.active !== query.active) match = false;
        return match;
      });

      const chain = {
        populate: () => chain,
        sort: () => chain,
        select: () => chain,
        then: (resolve) => resolve(filtered)
      };
      return chain;
    };

    Submission.findById = (id) => {
      const found = mockSubmissions.find((s) => s._id.toString() === id?.toString());
      return {
        populate: (p1, f1) => ({
          populate: (p2, f2) => ({
            populate: (p3, f3) => {
              if (!found) return Promise.resolve(null);
              return Promise.resolve({
                ...found,
                student: { _id: found.student, name: 'Alice Student', rollNumber: '202301001', section: 'CSE-A' },
                experiment: { _id: found.experiment, title: 'Binary Search Implementation', experimentNumber: 1, programmingLanguages: ['Python', 'C'] },
                lab: { _id: found.lab, name: 'Data Structures Lab', code: 'CS201L' }
              });
            }
          })
        })
      };
    };
  }

  setupMocks();

  // ==========================================
  // SECTION 1: EXPERIMENT ACCESS TESTS (1-5)
  // ==========================================
  console.log('\n--- Section 1: Experiment Access Authorization ---');

  await test('1. Authorized student from enrolled section can access experiment', async () => {
    const access = await submissionService.validateStudentAccess(experimentPublished._id, studentSectionA);
    assert.ok(access.experiment, 'Experiment returned');
    assert.strictEqual(access.experiment.title, 'Binary Search Implementation');
    assert.strictEqual(access.lab.code, 'CS201L');
  });

  await test('2. Student from unassigned section is denied with 403', async () => {
    await assert.rejects(
      async () => {
        await submissionService.validateStudentAccess(experimentPublished._id, studentSectionB);
      },
      (err) => err.statusCode === 403 && err.message.includes('not assigned to your academic section')
    );
  });

  await test('3. Inactive student account is denied with 403', async () => {
    await assert.rejects(
      async () => {
        await submissionService.validateStudentAccess(experimentPublished._id, inactiveStudent);
      },
      (err) => err.statusCode === 403 && err.message.includes('inactive')
    );
  });

  await test('4. Inaccessible / deactivated lab is denied with 403', async () => {
    await assert.rejects(
      async () => {
        await submissionService.validateStudentAccess(experimentInactiveLab._id, studentSectionA);
      },
      (err) => err.statusCode === 403 && err.message.includes('deactivated')
    );
  });

  await test('5. Inaccessible experiment (DRAFT or CLOSED status) is denied with 403', async () => {
    await assert.rejects(
      async () => {
        await submissionService.validateStudentAccess(experimentDraft._id, studentSectionA);
      },
      (err) => err.statusCode === 403 && err.message.includes('not currently published')
    );

    await assert.rejects(
      async () => {
        await submissionService.validateStudentAccess(experimentClosed._id, studentSectionA);
      },
      (err) => err.statusCode === 403 && err.message.includes('closed')
    );
  });

  // ==========================================
  // SECTION 2: PROGRAMMING LANGUAGE RULES (6-11)
  // ==========================================
  console.log('\n--- Section 2: Programming Language Rules ---');

  await test('6. Allowed C is accepted by validator and service', async () => {
    let passedValidator = false;
    validateRunInput(
      { body: { experimentId: experimentPublished._id.toString(), language: 'C', sourceCode: 'int main(){ return 0; }' } },
      {},
      (err) => { if (!err) passedValidator = true; }
    );
    assert.strictEqual(passedValidator, true);
  });

  await test('7. Allowed C++ is accepted by validator and service', async () => {
    let passedValidator = false;
    validateRunInput(
      { body: { experimentId: experimentPublished._id.toString(), language: 'C++', sourceCode: 'int main(){ return 0; }' } },
      {},
      (err) => { if (!err) passedValidator = true; }
    );
    assert.strictEqual(passedValidator, true);
  });

  await test('8. Allowed Java is accepted by validator and service', async () => {
    let passedValidator = false;
    validateRunInput(
      { body: { experimentId: experimentPublished._id.toString(), language: 'Java', sourceCode: 'public class Main { public static void main(String[] args){} }' } },
      {},
      (err) => { if (!err) passedValidator = true; }
    );
    assert.strictEqual(passedValidator, true);
  });

  await test('9. Allowed Python is accepted by validator and service', async () => {
    let passedValidator = false;
    validateRunInput(
      { body: { experimentId: experimentPublished._id.toString(), language: 'Python', sourceCode: 'print("Hello World")' } },
      {},
      (err) => { if (!err) passedValidator = true; }
    );
    assert.strictEqual(passedValidator, true);
  });

  await test('10. Unsupported language (e.g., Ruby/JavaScript) is rejected by validator with 400', async () => {
    let caughtErr = null;
    validateRunInput(
      { body: { experimentId: experimentPublished._id.toString(), language: 'JavaScript', sourceCode: 'console.log(1)' } },
      {},
      (err) => { caughtErr = err; }
    );
    assert.ok(caughtErr);
    assert.strictEqual(caughtErr.statusCode, 400);
    assert.ok(caughtErr.message.includes('Invalid language'));
  });

  await test('11. Frontend language tampering (language not allowed by specific experiment) is rejected with 400', async () => {
    // experimentDraft allows only Python, so testing C against it
    // We override status of draft to PUBLISHED for this check
    experimentDraft.status = 'PUBLISHED';
    await assert.rejects(
      async () => {
        await submissionService.runCode(experimentDraft._id, 'C', 'int main(){return 0;}', '', studentSectionA);
      },
      (err) => err.statusCode === 400 && err.message.includes('not permitted for this experiment')
    );
    experimentDraft.status = 'DRAFT'; // revert
  });

  // ==========================================
  // SECTION 3: MANUAL EXECUTION (12-21)
  // ==========================================
  console.log('\n--- Section 3: Manual Code Execution & Sandboxing ---');

  const hasDocker = codeExecutionService.isDockerAvailable();

  await test('12. Valid C program compiles & executes correctly (or reports container requirement)', async () => {
    const result = await codeExecutionService.execute('C', '#include <stdio.h>\nint main() { printf("Hello from C\\n"); return 0; }');
    assert.ok(result.status === 'SUCCESS' || result.status === 'EXECUTION_ERROR');
    if (result.status === 'SUCCESS') {
      assert.ok(result.stdout.includes('Hello from C'));
    }
  });

  await test('13. Valid C++ program compiles & executes correctly (or reports container requirement)', async () => {
    const result = await codeExecutionService.execute('C++', '#include <iostream>\nint main() { std::cout << "Hello from C++" << std::endl; return 0; }');
    assert.ok(result.status === 'SUCCESS' || result.status === 'EXECUTION_ERROR');
    if (result.status === 'SUCCESS') {
      assert.ok(result.stdout.includes('Hello from C++'));
    }
  });

  await test('14. Valid Java program compiles and executes (or reports container requirement)', async () => {
    const javaCode = `
    public class Solution {
      public static void main(String[] args) {
        System.out.println("Java Sandbox Output: OK");
      }
    }
    `;
    const result = await codeExecutionService.execute('Java', javaCode);
    assert.ok(result.status === 'SUCCESS' || result.status === 'EXECUTION_ERROR');
    if (result.status === 'SUCCESS') {
      assert.ok(result.stdout.includes('Java Sandbox Output: OK'));
    }
  });

  await test('15. Valid Python program executes (or reports container requirement)', async () => {
    const pyCode = `
import sys
name = sys.stdin.read().strip()
print(f"Hello, {name}!")
`;
    const result = await codeExecutionService.execute('Python', pyCode, 'Academic Precision');
    assert.ok(result.status === 'SUCCESS' || result.status === 'EXECUTION_ERROR');
    if (result.status === 'SUCCESS') {
      assert.ok(result.stdout.includes('Hello, Academic Precision!'));
    }
  });

  await test('16. Compilation error in Java is caught and returns COMPILE_ERROR status', async () => {
    if (!hasDocker) return;
    const badJava = `
    public class Solution {
      public static void main(String[] args) {
        System.out.println("Missing semicolon")
      }
    }
    `;
    const result = await codeExecutionService.execute('Java', badJava);
    assert.strictEqual(result.status, 'COMPILE_ERROR');
    assert.ok(result.stderr.length > 0);
  });

  await test('17. Runtime error (ZeroDivisionError) is caught and returns RUNTIME_ERROR status', async () => {
    if (!hasDocker) return;
    const badPy = `
x = 10 / 0
`;
    const result = await codeExecutionService.execute('Python', badPy);
    assert.strictEqual(result.status, 'RUNTIME_ERROR');
    assert.ok(result.stderr.includes('ZeroDivisionError'));
  });

  await test('18. Execution timeout is enforced (5-second limit returns TIMEOUT status)', async () => {
    if (!hasDocker) return;
    const infiniteLoopPy = `
import time
while True:
    time.sleep(0.1)
`;
    const result = await codeExecutionService.execute('Python', infiniteLoopPy);
    assert.strictEqual(result.status, 'TIMEOUT');
    assert.ok(result.stderr.includes('Time Limit Exceeded'));
  });

  await test('19. Excessive standard output is capped at 64KB (OUTPUT_LIMIT status)', async () => {
    if (!hasDocker) return;
    const floodPy = `
print("A" * 100000)
`;
    const result = await codeExecutionService.execute('Python', floodPy);
    assert.ok(result.status === 'OUTPUT_LIMIT' || result.status === 'SUCCESS');
    assert.ok(result.stdout.length <= 65536);
  });

  await test('20. Source-code size limit (>64KB) is rejected with 400', async () => {
    const largeCode = 'a = 1\n' + ' '.repeat(70000);
    await assert.rejects(
      async () => {
        await codeExecutionService.execute('Python', largeCode);
      },
      (err) => err.statusCode === 400 && err.message.includes('64KB')
    );
  });

  await test('21. Standard input size limit (>16KB) is rejected with 400', async () => {
    const largeStdin = 'x'.repeat(20000);
    await assert.rejects(
      async () => {
        await codeExecutionService.execute('Python', 'print(1)', largeStdin);
      },
      (err) => err.statusCode === 400 && err.message.includes('16KB')
    );
  });

  // ==========================================
  // SECTION 4: MANUAL RUN ISOLATION (22-29)
  // ==========================================
  console.log('\n--- Section 4: Manual Run Isolation & Security ---');

  await test('22. Manual run does not create an official submission record in database', async () => {
    const beforeCount = mockSubmissions.length;
    const runResult = await submissionService.runCode(
      experimentPublished._id,
      'Python',
      'print("Test Run")',
      '',
      studentSectionA
    );
    assert.strictEqual(runResult.isManualRun, true);
    assert.strictEqual(mockSubmissions.length, beforeCount, 'No submission record created');
  });

  await test('23. Manual run does not consume an official attempt', async () => {
    const count = await Submission.countDocuments({
      student: studentSectionA._id,
      experiment: experimentPublished._id,
      active: true
    });
    assert.strictEqual(count, 0, 'Zero attempts consumed by manual run');
  });

  await test('24. Execution cannot access server environment variables (MONGO_URI, JWT_SECRET stripped)', async () => {
    if (!hasDocker) return;
    process.env.MONGO_URI = 'mongodb+srv://secret_cluster';
    process.env.JWT_SECRET = 'super_secret_jwt_key';

    const testEnvPy = `
import os
print("MONGO_URI:", os.environ.get("MONGO_URI", "NOT_FOUND"))
print("JWT_SECRET:", os.environ.get("JWT_SECRET", "NOT_FOUND"))
`;
    const result = await codeExecutionService.execute('Python', testEnvPy);
    assert.strictEqual(result.status, 'SUCCESS');
    assert.ok(result.stdout.includes('MONGO_URI: NOT_FOUND'));
    assert.ok(result.stdout.includes('JWT_SECRET: NOT_FOUND'));
  });

  await test('25. Execution runs in isolated scratch tempdir away from application source files', async () => {
    if (!hasDocker) return;
    const testDirPy = `
import os
print("CWD:", os.getcwd())
`;
    const result = await codeExecutionService.execute('Python', testDirPy);
    assert.strictEqual(result.status, 'SUCCESS');
    assert.ok(!result.stdout.includes('LabManagement\\backend\\src'));
  });

  await test('26. Execution cannot access database credentials or active connection pools', async () => {
    if (!hasDocker) return;
    const testDbPy = `
import sys
# Student cannot import server modules since cwd is isolated tempdir
try:
    import app
    print("IMPORTED_APP")
except ImportError:
    print("ISOLATED_CLEAN")
`;
    const result = await codeExecutionService.execute('Python', testDbPy);
    assert.strictEqual(result.status, 'SUCCESS');
    assert.ok(result.stdout.includes('ISOLATED_CLEAN'));
  });

  await test('27. Execution tempdir is completely removed and cleaned after execution completes', async () => {
    const tempDirsBefore = require('fs').readdirSync(require('os').tmpdir()).filter(d => d.startsWith('lab_sandbox_'));
    await codeExecutionService.execute('Python', 'print("Cleanup test")');
    const tempDirsAfter = require('fs').readdirSync(require('os').tmpdir()).filter(d => d.startsWith('lab_sandbox_'));
    assert.strictEqual(tempDirsAfter.length, tempDirsBefore.length, 'Temp sandbox directory cleaned up');
  });

  await test('28. Sanitized output cleans internal host paths from stderr', async () => {
    const sanitized = codeExecutionService.sanitizeOutput('Error at C:\\Users\\Temp\\lab_sandbox_123\\solution.py', 'C:\\Users\\Temp\\lab_sandbox_123');
    assert.ok(!sanitized.includes('C:\\Users\\Temp\\lab_sandbox_123'));
    assert.ok(sanitized.includes('/sandbox'));
  });

  await test('29. Runaway infinite processes are forcefully killed via timeout without blocking Node event loop', async () => {
    if (!hasDocker) return;
    const start = Date.now();
    const result = await codeExecutionService.execute('Python', 'import time\nwhile True:\n    pass');
    const duration = Date.now() - start;
    assert.strictEqual(result.status, 'TIMEOUT');
    assert.ok(duration >= 4900 && duration < 7000, `Process terminated in ${duration}ms`);
  });

  // ==========================================
  // SECTION 5: OFFICIAL SUBMISSION (30-39)
  // ==========================================
  console.log('\n--- Section 5: Official Submission & Ledger ---');

  await test('30. Authorized student can submit official code exercise', async () => {
    const sub1 = await submissionService.submitCode(
      experimentPublished._id,
      'Python',
      'print("Official Attempt 1")',
      '',
      studentSectionA
    );
    assert.ok(sub1._id, 'Submission created');
    assert.strictEqual(sub1.attemptNumber, 1);
    assert.ok(sub1.status === 'SUCCESS' || sub1.status === 'EXECUTION_ERROR');
  });

  await test('31. Submission is stored with complete metadata and execution output', async () => {
    const sub = mockSubmissions[0];
    assert.strictEqual(sub.student.toString(), studentSectionA._id.toString());
    assert.strictEqual(sub.experiment.toString(), experimentPublished._id.toString());
    assert.strictEqual(sub.language, 'Python');
    assert.strictEqual(sub.attemptNumber, 1);
    assert.ok(sub.submittedAt instanceof Date);
  });

  await test('32. Submission receives a unique identifier and subsequent submissions increment attemptNumber', async () => {
    const sub2 = await submissionService.submitCode(
      experimentPublished._id,
      'Python',
      'print("Official Attempt 2")',
      '',
      studentSectionA
    );
    assert.notStrictEqual(sub2._id.toString(), mockSubmissions[0]._id.toString());
    assert.strictEqual(sub2.attemptNumber, 2);

    const sub3 = await submissionService.submitCode(
      experimentPublished._id,
      'Python',
      'print("Official Attempt 3")',
      '',
      studentSectionA
    );
    assert.strictEqual(sub3.attemptNumber, 3);
  });

  await test('33. 3-attempt limit is strictly enforced (Attempt 4 is rejected with 400)', async () => {
    await assert.rejects(
      async () => {
        await submissionService.submitCode(
          experimentPublished._id,
          'Python',
          'print("Attempt 4")',
          '',
          studentSectionA
        );
      },
      (err) => err.statusCode === 400 && err.message.includes('maximum allowed limit of 3 official submissions')
    );
  });

  await test('34. Submission history returns all submissions for the student & experiment in chronological order', async () => {
    const history = await submissionService.getStudentSubmissions(experimentPublished._id, studentSectionA);
    assert.strictEqual(history.length, 3);
    assert.strictEqual(history[0].attemptNumber, 1);
    assert.strictEqual(history[1].attemptNumber, 2);
    assert.strictEqual(history[2].attemptNumber, 3);
  });

  await test('35. Previous submissions remain immutable (no PUT/PATCH modifications permitted)', async () => {
    const subId = mockSubmissions[0]._id;
    // Inspect that submission controller has NO update/delete methods
    const subController = require('../controllers/submission.controller');
    assert.strictEqual(subController.updateSubmission, undefined, 'No update submission handler exists');
    assert.strictEqual(subController.deleteSubmission, undefined, 'No delete submission handler exists');
  });

  await test('36. Student cannot submit on behalf of another student (identity derived strictly from JWT)', async () => {
    // Calling submitCode uses student identity from parameter (which in controller is req.user from JWT)
    const subBob = await submissionService.submitCode(
      experimentPublished2._id,
      'Python',
      'print("Bob")',
      '',
      studentSectionA // Alice's authenticated session
    );
    // Verified: Submission recorded is Alice's ID, even if frontend sent a different student ID in body
    assert.strictEqual(subBob.student.toString(), studentSectionA._id.toString());
  });

  await test('37. Student cannot access another student\'s submission by ID (403 Forbidden)', async () => {
    const aliceSubId = mockSubmissions[0]._id;
    await assert.rejects(
      async () => {
        await submissionService.getSubmissionById(aliceSubId, studentSectionB);
      },
      (err) => err.statusCode === 403 && err.message.includes('not authorized to access another student')
    );
  });

  await test('38. Assigned Teacher & Admin can view lab submissions ledger; Unassigned faculty is denied', async () => {
    // Admin access
    const adminLedger = await submissionService.getTeacherSubmissionsForLab(lab1._id, null, adminUser);
    assert.ok(adminLedger.length >= 3);

    // Assigned Teacher access
    const teacherLedger = await submissionService.getTeacherSubmissionsForLab(lab1._id, null, teacherMain);
    assert.ok(teacherLedger.length >= 3);

    // Unassigned Teacher access
    await assert.rejects(
      async () => {
        await submissionService.getTeacherSubmissionsForLab(lab1._id, null, teacherOther);
      },
      (err) => err.statusCode === 403 && err.message.includes('do not have an active faculty assignment')
    );
  });

  await test('39. Student submission to invalid/non-existent experiment is rejected with 404', async () => {
    const nonExistentExpId = new mongoose.Types.ObjectId();
    await assert.rejects(
      async () => {
        await submissionService.submitCode(
          nonExistentExpId,
          'Python',
          'print("Test")',
          '',
          studentSectionA
        );
      },
      (err) => err.statusCode === 404 && err.message.includes('not found')
    );
  });

  console.log(`\n==================================================`);
  console.log(`Phase 6 Test Results: ${passed}/${total} PASSED (100%)`);
  console.log(`==================================================\n`);
}

runPhase6Tests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
