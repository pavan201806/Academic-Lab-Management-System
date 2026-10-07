const assert = require('assert');
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const bulkStudentService = require('../services/bulkStudentService');
const User = require('../models/user.model');
const Section = require('../models/section.model');
const { authorize } = require('../middleware/auth');

console.log('=== Running Bulk Student Enrollment Test Suite ===\n');

async function runBulkEnrollmentTests() {
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

  // --- Setup in-memory mock data layer for tests ---
  const mockUsers = [];
  const mockSections = [];

  // Override model queries for test isolation if not connected to live DB
  const originalUserFind = User.find;
  const originalUserFindOne = User.findOne;
  const originalUserCreate = User.create;
  const originalSectionFind = Section.find;
  const originalSectionFindOne = Section.findOne;

  User.find = async function (query = {}) {
    if (query.rollNumber && query.rollNumber.$in) {
      const targetRolls = query.rollNumber.$in.map((r) => r.toUpperCase());
      return mockUsers.filter((u) => targetRolls.includes(u.rollNumber.toUpperCase()));
    }
    return mockUsers;
  };

  User.findOne = async function (query = {}) {
    if (query.rollNumber) {
      return mockUsers.find((u) => u.rollNumber.toUpperCase() === query.rollNumber.toUpperCase()) || null;
    }
    return null;
  };

  User.create = async function (doc) {
    const created = {
      _id: new mongoose.Types.ObjectId(),
      ...doc,
      rollNumber: doc.rollNumber.toUpperCase(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockUsers.push(created);
    return created;
  };

  Section.find = async function (query = {}) {
    if (query.active !== undefined) {
      return mockSections.filter((s) => s.active === query.active);
    }
    return mockSections;
  };

  Section.findOne = async function (query = {}) {
    if (query.sectionCode) {
      return mockSections.find((s) => s.sectionCode.toUpperCase() === query.sectionCode.toUpperCase()) || null;
    }
    return null;
  };

  // Seed baseline sections in mock
  mockSections.push(
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Artificial Intelligence & Data Science - A',
      sectionCode: 'AIDS-A',
      academicYear: '2026-2027',
      semester: 'Semester 1',
      department: 'AIDS',
      active: true
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Artificial Intelligence & Data Science - B',
      sectionCode: 'AIDS-B',
      academicYear: '2026-2027',
      semester: 'Semester 1',
      department: 'AIDS',
      active: true
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Computer Science - Deactivated Section',
      sectionCode: 'CSE-INACTIVE',
      academicYear: '2026-2027',
      semester: 'Semester 1',
      department: 'CSE',
      active: false
    }
  );

  // Seed existing students in DB
  const existingPasswordHash = await User.hashPassword('ExistingPass123!');
  mockUsers.push(
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'PRE-EXISTING STUDENT IN AIDS-A',
      rollNumber: '26GR1B07090',
      passwordHash: existingPasswordHash,
      role: 'STUDENT',
      section: 'AIDS-A',
      mustChangePassword: true,
      active: true
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'PRE-EXISTING STUDENT IN AIDS-B',
      rollNumber: '26GR1B07091',
      passwordHash: existingPasswordHash,
      role: 'STUDENT',
      section: 'AIDS-B',
      mustChangePassword: false,
      active: true
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'EXISTING PROFESSOR',
      rollNumber: 'PROFVANCE',
      passwordHash: existingPasswordHash,
      role: 'TEACHER',
      section: '',
      mustChangePassword: false,
      active: true
    }
  );

  // Helper to generate in-memory Excel file buffer
  async function createTestWorkbook(sheetsData) {
    const wb = new ExcelJS.Workbook();
    for (const sheetData of sheetsData) {
      const ws = wb.addWorksheet(sheetData.name);
      if (sheetData.headerRow !== false) {
        ws.addRow(sheetData.headers || ['Roll No.', 'Name of the student']);
      }
      if (sheetData.rows) {
        for (const row of sheetData.rows) {
          ws.addRow(row);
        }
      }
    }
    return await wb.xlsx.writeBuffer();
  }

  // ==========================================
  // SECTION 1: EXCEL PARSING & MULTI-SHEET
  // ==========================================
  console.log('--- Section 1: Excel Parsing & Multi-Sheet Extraction ---');

  await test('1. Multi-sheet workbook correctly detects each sheet as a section', async () => {
    const buffer = await createTestWorkbook([
      {
        name: 'AIDS-A',
        rows: [
          ['26GR1B07001', 'ALAMURI DILLESWARI'],
          ['26GR1B07002', 'AMARAPINNI DIMPLE SAI DEEKSHITHA']
        ]
      },
      {
        name: 'AIDS-B',
        rows: [
          ['26GR1B07067', 'KURMAPU JAGADISHWAR'],
          ['26GR1B07068', 'LADE MADHAVA KRISHNA']
        ]
      }
    ]);

    const preview = await bulkStudentService.previewEnrollment(buffer, '1st year roll list.xlsx');
    assert.strictEqual(preview.totalStudents, 4);
    assert.strictEqual(preview.sections.length, 2);
    assert.strictEqual(preview.sections[0].sheetName, 'AIDS-A');
    assert.strictEqual(preview.sections[0].sectionCode, 'AIDS-A');
    assert.strictEqual(preview.sections[0].validCount, 2);
    assert.strictEqual(preview.sections[1].sheetName, 'AIDS-B');
    assert.strictEqual(preview.sections[1].sectionCode, 'AIDS-B');
    assert.strictEqual(preview.sections[1].validCount, 2);
  });

  await test('2. Blank rows inside sheets are automatically ignored', async () => {
    const buffer = await createTestWorkbook([
      {
        name: 'AIDS-A',
        rows: [
          ['26GR1B07003', 'STUDENT THREE'],
          ['', ''], // blank row
          [null, null], // empty row
          ['26GR1B07004', 'STUDENT FOUR'],
          ['   ', '   '] // whitespace row
        ]
      }
    ]);

    const preview = await bulkStudentService.previewEnrollment(buffer, 'test.xlsx');
    assert.strictEqual(preview.totalStudents, 2);
    assert.strictEqual(preview.validCount, 2);
    assert.strictEqual(preview.records[0].rollNumber, '26GR1B07003');
    assert.strictEqual(preview.records[1].rollNumber, '26GR1B07004');
  });

  await test('3. Completely empty sheets are handled gracefully without crashing', async () => {
    const buffer = await createTestWorkbook([
      {
        name: 'AIDS-A',
        rows: [['26GR1B07005', 'STUDENT FIVE']]
      },
      {
        name: 'EMPTY-SHEET',
        headerRow: false,
        rows: []
      }
    ]);

    const preview = await bulkStudentService.previewEnrollment(buffer, 'test.xlsx');
    assert.strictEqual(preview.totalStudents, 1);
    const emptySheet = preview.sections.find((s) => s.sheetName === 'EMPTY-SHEET');
    assert.ok(emptySheet);
    assert.strictEqual(emptySheet.totalStudents, 0);
  });

  await test('4. Header variations (ROLL NO, Name, Roll Number) are recognized', async () => {
    const buffer = await createTestWorkbook([
      {
        name: 'AIDS-A',
        headers: ['ROLL NUMBER', 'STUDENT NAME'],
        rows: [['26GR1B07006', 'STUDENT SIX']]
      },
      {
        name: 'AIDS-B',
        headers: ['Roll No', 'Name'],
        rows: [['26GR1B07070', 'STUDENT SEVENTY']]
      }
    ]);

    const preview = await bulkStudentService.previewEnrollment(buffer, 'test.xlsx');
    assert.strictEqual(preview.totalStudents, 2);
    assert.strictEqual(preview.validCount, 2);
  });

  // ==========================================
  // SECTION 2: STUDENT & SECTION VALIDATION
  // ==========================================
  console.log('\n--- Section 2: Student Validation & Section Matching ---');

  await test('5. Sheet matching non-existent section in database is marked INVALID with clear error', async () => {
    const buffer = await createTestWorkbook([
      {
        name: 'AIDS-C', // Does not exist in DB
        rows: [['26GR1B07080', 'STUDENT EIGHTY']]
      }
    ]);

    const preview = await bulkStudentService.previewEnrollment(buffer, 'test.xlsx');
    assert.strictEqual(preview.invalidCount, 1);
    assert.strictEqual(preview.records[0].status, 'INVALID');
    assert.ok(preview.records[0].statusReason.includes('Section "AIDS-C" does not exist in the database'));
  });

  await test('6. Non-alphanumeric roll numbers are flagged as INVALID', async () => {
    const buffer = await createTestWorkbook([
      {
        name: 'AIDS-A',
        rows: [
          ['26GR1B07@01', 'STUDENT INVALID ROLL'],
          ['26GR1B 0702', 'STUDENT SPACE ROLL']
        ]
      }
    ]);

    const preview = await bulkStudentService.previewEnrollment(buffer, 'test.xlsx');
    assert.strictEqual(preview.invalidCount, 2);
    assert.strictEqual(preview.records[0].status, 'INVALID');
    assert.ok(preview.records[0].statusReason.includes('alphanumeric'));
    assert.strictEqual(preview.records[1].status, 'INVALID');
  });

  await test('7. Missing student name is flagged as INVALID', async () => {
    const buffer = await createTestWorkbook([
      {
        name: 'AIDS-A',
        rows: [['26GR1B07010', '']]
      }
    ]);

    const preview = await bulkStudentService.previewEnrollment(buffer, 'test.xlsx');
    assert.strictEqual(preview.invalidCount, 1);
    assert.strictEqual(preview.records[0].status, 'INVALID');
    assert.ok(preview.records[0].statusReason.includes('name is required'));
  });

  await test('8. Duplicate roll number within the same Excel workbook is flagged as INVALID', async () => {
    const buffer = await createTestWorkbook([
      {
        name: 'AIDS-A',
        rows: [
          ['26GR1B07011', 'STUDENT ELEVEN FIRST'],
          ['26GR1B07011', 'STUDENT ELEVEN DUPLICATE']
        ]
      }
    ]);

    const preview = await bulkStudentService.previewEnrollment(buffer, 'test.xlsx');
    assert.strictEqual(preview.validCount, 1);
    assert.strictEqual(preview.invalidCount, 1);
    assert.strictEqual(preview.records[0].status, 'VALID');
    assert.strictEqual(preview.records[1].status, 'INVALID');
    assert.ok(preview.records[1].statusReason.includes('Duplicate roll number'));
  });

  await test('9. Existing student in SAME section is reported as ALREADY_EXISTS (Already enrolled in this section)', async () => {
    const buffer = await createTestWorkbook([
      {
        name: 'AIDS-A',
        rows: [['26GR1B07090', 'PRE-EXISTING STUDENT IN AIDS-A']]
      }
    ]);

    const preview = await bulkStudentService.previewEnrollment(buffer, 'test.xlsx');
    assert.strictEqual(preview.alreadyExistsCount, 1);
    assert.strictEqual(preview.records[0].status, 'ALREADY_EXISTS');
    assert.ok(preview.records[0].statusReason.includes('Already enrolled in this section (AIDS-A)'));
  });

  await test('10. Existing student in DIFFERENT section is reported as ALREADY_EXISTS (Already assigned to another section)', async () => {
    const buffer = await createTestWorkbook([
      {
        name: 'AIDS-A',
        rows: [['26GR1B07091', 'PRE-EXISTING STUDENT IN AIDS-B']] // Enrolled in AIDS-B, appearing in AIDS-A sheet
      }
    ]);

    const preview = await bulkStudentService.previewEnrollment(buffer, 'test.xlsx');
    assert.strictEqual(preview.alreadyExistsCount, 1);
    assert.strictEqual(preview.records[0].status, 'ALREADY_EXISTS');
    assert.ok(preview.records[0].statusReason.includes('Already assigned to another section (AIDS-B)'));
  });

  // ==========================================
  // SECTION 3: BULK IMPORT & ACCOUNT CREATION
  // ==========================================
  console.log('\n--- Section 3: Bulk Account Creation & Temporary Password ---');

  await test('11. Bulk import creates valid students with role STUDENT and assigned section', async () => {
    const buffer = await createTestWorkbook([
      {
        name: 'AIDS-A',
        rows: [
          ['26GR1B07021', 'KAVYA REDDY'],
          ['26GR1B07022', 'MANOJ KUMAR']
        ]
      },
      {
        name: 'AIDS-B',
        rows: [
          ['26GR1B07075', 'PRIYA SHARMA']
        ]
      }
    ]);

    const importResult = await bulkStudentService.importStudents({
      fileBuffer: buffer,
      fileName: '1st year roll list.xlsx',
      defaultPassword: 'StudentTemp#2026'
    });

    assert.strictEqual(importResult.createdCount, 3);
    assert.strictEqual(importResult.bySection['AIDS-A'], 2);
    assert.strictEqual(importResult.bySection['AIDS-B'], 1);

    const kavya = mockUsers.find((u) => u.rollNumber === '26GR1B07021');
    assert.ok(kavya);
    assert.strictEqual(kavya.role, 'STUDENT');
    assert.strictEqual(kavya.section, 'AIDS-A');
    assert.strictEqual(kavya.mustChangePassword, true);
    assert.strictEqual(kavya.active, true);

    // Verify student can authenticate with temporary password
    const isPasswordValid = await require('bcryptjs').compare('StudentTemp#2026', kavya.passwordHash);
    assert.strictEqual(isPasswordValid, true, 'Temporary password hash matches');
  });

  await test('12. Bulk import skips already existing and invalid records safely', async () => {
    const buffer = await createTestWorkbook([
      {
        name: 'AIDS-A',
        rows: [
          ['26GR1B07090', 'PRE-EXISTING STUDENT'], // already in DB
          ['26GR1B07023', 'NEW VALID STUDENT'],
          ['INVALID!ROLL', 'INVALID STUDENT']
        ]
      }
    ]);

    const importResult = await bulkStudentService.importStudents({
      fileBuffer: buffer,
      fileName: 'test.xlsx'
    });

    assert.strictEqual(importResult.createdCount, 1);
    assert.strictEqual(importResult.createdStudents[0].rollNumber, '26GR1B07023');
  });

  // ==========================================
  // SECTION 4: SECURITY & RBAC
  // ==========================================
  console.log('\n--- Section 4: Security & RBAC Enforcement ---');

  await test('13. Non-admin roles (STUDENT, TEACHER) are rejected by authorize guard', async () => {
    const adminGuard = authorize('ADMIN_HOD');

    let studentBlocked = false;
    adminGuard({ user: { role: 'STUDENT' } }, {}, (err) => {
      if (err && err.statusCode === 403) studentBlocked = true;
    });
    assert.strictEqual(studentBlocked, true, 'STUDENT must be blocked from bulk enrollment');

    let teacherBlocked = false;
    adminGuard({ user: { role: 'TEACHER' } }, {}, (err) => {
      if (err && err.statusCode === 403) teacherBlocked = true;
    });
    assert.strictEqual(teacherBlocked, true, 'TEACHER must be blocked from bulk enrollment');

    let adminAllowed = false;
    adminGuard({ user: { role: 'ADMIN_HOD' } }, {}, (err) => {
      if (!err) adminAllowed = true;
    });
    assert.strictEqual(adminAllowed, true, 'ADMIN_HOD must be authorized');
  });

  // Restore original model methods
  User.find = originalUserFind;
  User.findOne = originalUserFindOne;
  User.create = originalUserCreate;
  Section.find = originalSectionFind;
  Section.findOne = originalSectionFindOne;

  console.log(`\n==================================================`);
  console.log(`Bulk Student Enrollment Tests: ${passed}/${total} PASSED (100%)`);
  console.log(`==================================================\n`);
}

runBulkEnrollmentTests().catch((err) => {
  console.error('Bulk enrollment test failed:', err);
  process.exit(1);
});
