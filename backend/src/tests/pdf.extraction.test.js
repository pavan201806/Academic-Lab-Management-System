const assert = require('assert');
const pdfExtractionService = require('../services/pdfExtractionService');
const experimentService = require('../services/experimentService');
const { Experiment, Lab, Section, LabAssignment, User } = require('../models');

console.log('=== Running Phase 5 PDF Experiment Extraction & Confirmation Tests ===\n');

async function runPhase5Tests() {
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

  // Mock Users
  const adminUser = {
    _id: '64f000000000000000000001',
    name: 'Admin User',
    rollNumber: 'ADMIN01',
    role: 'ADMIN_HOD',
    active: true
  };

  const teacherMainA = {
    _id: '64f000000000000000000010',
    name: 'Prof Vance',
    rollNumber: 'PROFVANCE',
    role: 'TEACHER',
    active: true
  };

  const teacherAssistantA = {
    _id: '64f000000000000000000011',
    name: 'Dr Smith',
    rollNumber: 'DRSMITH',
    role: 'TEACHER',
    active: true
  };

  const teacherUnassigned = {
    _id: '64f000000000000000000012',
    name: 'Prof Unassigned',
    rollNumber: 'PROFUNASSIGNED',
    role: 'TEACHER',
    active: true
  };

  const studentA = {
    _id: '64f000000000000000000020',
    name: 'Student Alice',
    rollNumber: '202301001',
    role: 'STUDENT',
    section: 'CSE-A',
    active: true
  };

  // Mock Labs & Sections
  const lab1 = {
    _id: '64f000000000000000000100',
    name: 'Data Structures Laboratory',
    code: 'CS201L',
    subject: 'Data Structures',
    active: true
  };

  const lab2 = {
    _id: '64f000000000000000000102',
    name: 'Algorithms Laboratory',
    code: 'CS202L',
    subject: 'Algorithms',
    active: true
  };

  const sectionA = {
    _id: '64f000000000000000000200',
    name: 'Section A',
    sectionCode: 'CSE-A',
    active: true
  };

  function setupMocks() {
    Lab.findById = (id) => {
      if (id?.toString() === lab1._id.toString()) return Promise.resolve(lab1);
      if (id?.toString() === lab2._id.toString()) return Promise.resolve(lab2);
      return Promise.resolve(null);
    };

    LabAssignment.find = (query) => {
      if (query.lab === lab1._id && (query.teacher === teacherMainA._id || query.teacher === teacherAssistantA._id)) {
        return Promise.resolve([
          { _id: 'asg1', lab: lab1, section: sectionA, teacher: teacherMainA, active: true }
        ]);
      }
      return Promise.resolve([]);
    };

    LabAssignment.findOne = (query) => {
      if (query.lab === lab1._id && query.section === sectionA._id && query.active === true) {
        return Promise.resolve({ _id: 'asg1', lab: lab1, section: sectionA, active: true });
      }
      return Promise.resolve(null);
    };

    Section.findOne = (query) => {
      if (query.sectionCode === 'CSE-A') return Promise.resolve(sectionA);
      return Promise.resolve(null);
    };
  }

  setupMocks();

  // --- 1. PDF VALIDATION TESTS ---

  // 1. Valid PDF buffer accepted
  await test('Valid PDF header is accepted by buffer validator', async () => {
    const validBuffer = Buffer.from('%PDF-1.4\n%âãÏÓ\nSample PDF Content');
    assert.doesNotThrow(() => {
      pdfExtractionService.validatePdfBuffer(validBuffer);
    });
  });

  // 2. Non-PDF buffer rejected
  await test('Non-PDF buffer (missing %PDF- header) is rejected with 400', async () => {
    const invalidBuffer = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00');
    try {
      pdfExtractionService.validatePdfBuffer(invalidBuffer);
      assert.fail('Should have rejected non-PDF buffer');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert(err.message.includes('not a valid PDF document'));
    }
  });

  // 3. Null / empty buffer rejected
  await test('Missing or empty buffer is rejected with 400', async () => {
    try {
      pdfExtractionService.validatePdfBuffer(null);
      assert.fail('Should have rejected null buffer');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  // 4. Malformed / corrupted PDF handled gracefully
  await test('Corrupt / malformed PDF parsing throws 400 error', async () => {
    const corruptBuffer = Buffer.from('%PDF-1.4 Corrupt binary junk %%EOF with no structure');
    try {
      await pdfExtractionService.extractTextFromPdf(corruptBuffer);
      assert.fail('Should have thrown 400 for corrupt PDF');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert(err.message.includes('Failed to parse PDF') || err.message.includes('Unable to extract text'));
    }
  });

  // --- 2. EXPERIMENT TEXT EXTRACTION & RECOGNITION TESTS ---

  // 5. Experiment names extracted from structured text
  await test('Experiment names and objectives are parsed accurately from text', async () => {
    const sampleText = `
      DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
      DATA STRUCTURES LAB MANUAL (CS201)

      Experiment 1: Implementation of Singly and Doubly Linked Lists in C++
      Aim: To implement insertion, deletion and traversal in linked lists.
      Procedure: Define node structure with pointer to next.

      Experiment 2: Stack Operations and Infix to Postfix Conversion
      Objective: Understand LIFO paradigm with array implementation.

      Experiment 3: Binary Search Tree Traversal using Python
      Aim: Implement inorder, preorder, and postorder traversals.
    `;

    const experiments = pdfExtractionService.parseExperimentsFromText(sampleText);
    assert.strictEqual(experiments.length, 3);

    assert.strictEqual(experiments[0].experimentNumber, 1);
    assert.strictEqual(experiments[0].title, 'Implementation of Singly and Doubly Linked Lists in C++');
    assert.strictEqual(experiments[0].objective, 'To implement insertion, deletion and traversal in linked lists.');
    assert(experiments[0].programmingLanguages.includes('C++'));

    assert.strictEqual(experiments[1].experimentNumber, 2);
    assert.strictEqual(experiments[1].title, 'Stack Operations and Infix to Postfix Conversion');

    assert.strictEqual(experiments[2].experimentNumber, 3);
    assert.strictEqual(experiments[2].title, 'Binary Search Tree Traversal using Python');
    assert(experiments[2].programmingLanguages.includes('Python'));
  });

  // 6. Numbered formats recognized (EXP 01, 1., Roman numerals)
  await test('Different experiment numbering formats (EXP, 1., Roman) are recognized', async () => {
    const sampleText = `
      EXP 01 - Matrix Multiplication in C
      EXP-02 - Quick Sort and Merge Sort Analysis in Java
      3. Graph BFS and DFS Traversal
      Experiment IV: Dijkstra Shortest Path Algorithm
    `;

    const experiments = pdfExtractionService.parseExperimentsFromText(sampleText);
    assert.strictEqual(experiments.length, 4);
    assert.strictEqual(experiments[0].experimentNumber, 1);
    assert.strictEqual(experiments[1].experimentNumber, 2);
    assert.strictEqual(experiments[2].experimentNumber, 3);
    assert.strictEqual(experiments[3].experimentNumber, 4);
  });

  // 7. Maximum 12 experiments limit in extraction
  await test('Extraction caps at maximum 12 experiments per lab manual', async () => {
    let longText = '';
    for (let i = 1; i <= 15; i++) {
      longText += `\nExperiment ${i}: Laboratory Exercise Number ${i} in Python\n`;
    }

    const experiments = pdfExtractionService.parseExperimentsFromText(longText);
    assert.strictEqual(experiments.length, 12);
    assert.strictEqual(experiments[11].experimentNumber, 12);
  });

  // 8. No experiments detected handling
  await test('No experiments detected in arbitrary text throws 400 error', async () => {
    const nonExpText = `
      1234567890
      ---
      ...
    `;

    try {
      pdfExtractionService.parseExperimentsFromText(nonExpText);
      assert.fail('Should have failed when no experiments detected');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert(err.message.includes('No experiments could be detected'));
    }
  });

  // 9. Extraction does NOT persist experiments automatically
  await test('Extraction endpoint does NOT persist experiments in MongoDB', async () => {
    // Mock pdfExtractionService.extractTextFromPdf
    pdfExtractionService.extractTextFromPdf = async () => ({
      text: 'Experiment 1: Heap Sort\nExperiment 2: Radix Sort',
      numPages: 2
    });

    Experiment.countDocuments = () => Promise.resolve(0);
    Experiment.find = () => ({ select: () => Promise.resolve([]) });
    Experiment.create = () => {
      assert.fail('Experiment.create must NOT be called during extraction');
    };
    Experiment.insertMany = () => {
      assert.fail('Experiment.insertMany must NOT be called during extraction');
    };

    const result = await experimentService.extractExperimentsFromPdf(
      lab1._id,
      Buffer.from('%PDF-1.4 sample'),
      'syllabus.pdf',
      1024,
      teacherMainA
    );

    assert.strictEqual(result.totalExtracted, 2);
    assert.strictEqual(result.experiments.length, 2);
    assert.strictEqual(result.experiments[0].title, 'Heap Sort');
  });

  // --- 3. REVIEW AND CONFIRMATION TESTS ---

  // 10. Edited extracted data can be confirmed and saved
  await test('Authorized teacher can confirm and persist reviewed experiments', async () => {
    Experiment.countDocuments = () => Promise.resolve(0);
    Experiment.find = () => Promise.resolve([]); // No conflicting numbers

    let insertedDocs = null;
    Experiment.insertMany = (docs) => {
      insertedDocs = docs.map((d, idx) => ({ _id: `exp_${idx + 1}`, ...d }));
      return Promise.resolve(insertedDocs);
    };

    const reviewPayload = [
      {
        experimentNumber: 1,
        title: 'Heap Sort Algorithm',
        objective: 'Study max heap creation',
        programmingLanguages: ['C', 'C++']
      },
      {
        experimentNumber: 2,
        title: 'Radix Sort Algorithm',
        objective: 'Study bucket distribution',
        programmingLanguages: ['Java']
      }
    ];

    const confirmed = await experimentService.confirmExtractedExperiments(
      lab1._id,
      reviewPayload,
      teacherMainA
    );

    assert.strictEqual(confirmed.length, 2);
    assert.strictEqual(confirmed[0].status, 'DRAFT'); // Not auto-published
    assert.strictEqual(confirmed[0].active, true);
    assert.strictEqual(confirmed[0].createdBy.toString(), teacherMainA._id.toString());
  });

  // 11. Duplicate experiment numbers in review batch rejected
  await test('Duplicate experiment numbers in confirmation payload rejected (400)', async () => {
    Experiment.countDocuments = () => Promise.resolve(0);
    Experiment.find = () => Promise.resolve([]);

    const duplicatePayload = [
      { experimentNumber: 1, title: 'Exp A', programmingLanguages: ['C'] },
      { experimentNumber: 1, title: 'Exp B', programmingLanguages: ['Python'] }
    ];

    try {
      await experimentService.confirmExtractedExperiments(lab1._id, duplicatePayload, teacherMainA);
      assert.fail('Should have rejected duplicate numbers');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert(err.message.includes('Duplicate experiment number'));
    }
  });

  // 12. Conflicting with existing experiment numbers rejected (409)
  await test('Conflicting with existing active experiment in lab rejected (409)', async () => {
    Experiment.countDocuments = () => Promise.resolve(1);
    // Existing experiment #1 already in DB
    Experiment.find = () => Promise.resolve([{ experimentNumber: 1 }]);

    const conflictingPayload = [
      { experimentNumber: 1, title: 'New Exp 1', programmingLanguages: ['C'] }
    ];

    try {
      await experimentService.confirmExtractedExperiments(lab1._id, conflictingPayload, teacherMainA);
      assert.fail('Should have rejected conflict with existing experiment');
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
      assert(err.message.includes('already exist in this laboratory'));
    }
  });

  // 13. Exceeding 12 total experiments rejected (400)
  await test('Confirming batch that exceeds 12 total active experiments is rejected (400)', async () => {
    // Already 10 active experiments
    Experiment.countDocuments = () => Promise.resolve(10);
    Experiment.find = () => Promise.resolve([]);

    // Attempting to add 4 more (10 + 4 = 14 > 12)
    const fourExperiments = [
      { experimentNumber: 11, title: 'Exp 11', programmingLanguages: ['C'] },
      { experimentNumber: 12, title: 'Exp 12', programmingLanguages: ['C'] },
      { experimentNumber: 13, title: 'Exp 13', programmingLanguages: ['C'] },
      { experimentNumber: 14, title: 'Exp 14', programmingLanguages: ['C'] }
    ];

    try {
      await experimentService.confirmExtractedExperiments(lab1._id, fourExperiments, teacherMainA);
      assert.fail('Should have rejected exceeding 12 experiments');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert(err.message.includes('exceed the laboratory maximum limit of 12'));
    }
  });

  // 14. Invalid experiment number (> 12 or < 1) rejected (400)
  await test('Invalid experiment numbers (<1 or >12) in confirmation payload rejected (400)', async () => {
    Experiment.countDocuments = () => Promise.resolve(0);
    Experiment.find = () => Promise.resolve([]);

    const invalidNumberPayload = [
      { experimentNumber: 15, title: 'Exp 15', programmingLanguages: ['C'] }
    ];

    try {
      await experimentService.confirmExtractedExperiments(lab1._id, invalidNumberPayload, teacherMainA);
      assert.fail('Should have rejected experiment number > 12');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert(err.message.includes('between 1 and 12'));
    }
  });

  // --- 4. AUTHORIZATION & SECURITY TESTS ---

  // 15. ADMIN_HOD allowed to extract and confirm
  await test('ADMIN_HOD can extract and confirm experiments across any lab', async () => {
    Experiment.countDocuments = () => Promise.resolve(0);
    Experiment.find = () => Promise.resolve([]);
    Experiment.insertMany = (docs) => Promise.resolve(docs);

    const confirmed = await experimentService.confirmExtractedExperiments(
      lab2._id,
      [{ experimentNumber: 1, title: 'Admin Created Exp', programmingLanguages: ['Python'] }],
      adminUser
    );
    assert.strictEqual(confirmed.length, 1);
  });

  // 16. Authorized ASSISTANT teacher can extract and confirm
  await test('Authorized ASSISTANT teacher can confirm experiments', async () => {
    Experiment.countDocuments = () => Promise.resolve(0);
    Experiment.find = () => Promise.resolve([]);
    Experiment.insertMany = (docs) => Promise.resolve(docs);

    const confirmed = await experimentService.confirmExtractedExperiments(
      lab1._id,
      [{ experimentNumber: 2, title: 'Assistant Created Exp', programmingLanguages: ['Java'] }],
      teacherAssistantA
    );
    assert.strictEqual(confirmed.length, 1);
  });

  // 17. Unauthorized teacher denied (403)
  await test('Unauthorized teacher cannot extract or confirm experiments (403)', async () => {
    try {
      await experimentService.extractExperimentsFromPdf(
        lab1._id,
        Buffer.from('%PDF-1.4 sample'),
        'syllabus.pdf',
        1024,
        teacherUnassigned
      );
      assert.fail('Should have denied unassigned teacher from extracting');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }

    try {
      await experimentService.confirmExtractedExperiments(
        lab1._id,
        [{ experimentNumber: 1, title: 'Hacked Exp', programmingLanguages: ['C'] }],
        teacherUnassigned
      );
      assert.fail('Should have denied unassigned teacher from confirming');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }
  });

  // 18. Student denied (403)
  await test('Student cannot extract or confirm experiments (403)', async () => {
    try {
      await experimentService.extractExperimentsFromPdf(
        lab1._id,
        Buffer.from('%PDF-1.4 sample'),
        'syllabus.pdf',
        1024,
        studentA
      );
      assert.fail('Student should be forbidden from extracting');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }

    try {
      await experimentService.confirmExtractedExperiments(
        lab1._id,
        [{ experimentNumber: 1, title: 'Student Exp', programmingLanguages: ['C'] }],
        studentA
      );
      assert.fail('Student should be forbidden from confirming');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }
  });

  // 19. Inactive teacher assignment denied (403)
  await test('Teacher with inactive LabAssignment (active: false) denied (403)', async () => {
    LabAssignment.find = () => Promise.resolve([]); // Inactive assignment

    try {
      await experimentService.confirmExtractedExperiments(
        lab1._id,
        [{ experimentNumber: 1, title: 'Inactive Teacher Exp', programmingLanguages: ['C'] }],
        teacherMainA
      );
      assert.fail('Should have rejected teacher with inactive assignment');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    } finally {
      setupMocks(); // Restore
    }
  });

  // 20. Lab IDOR (Teacher assigned to Lab 1 trying to confirm for Lab 2) denied (403)
  await test('Cross-lab IDOR attempt rejected (403)', async () => {
    try {
      await experimentService.confirmExtractedExperiments(
        lab2._id, // Lab 2 (Algorithms)
        [{ experimentNumber: 1, title: 'IDOR Exp', programmingLanguages: ['C'] }],
        teacherMainA // Assigned only to Lab 1
      );
      assert.fail('Should have rejected cross-lab IDOR');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      assert(err.message.includes('not have an active faculty assignment'));
    }
  });

  console.log(`\n=== ALL ${passed}/${total} PHASE 5 PDF EXTRACTION & CONFIRMATION TESTS PASSED CLEANLY ===\n`);
}

runPhase5Tests().catch((err) => {
  console.error('Phase 5 test execution failed:', err);
  process.exit(1);
});
