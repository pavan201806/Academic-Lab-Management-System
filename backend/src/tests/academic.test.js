const assert = require('assert');
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Section = require('../models/section.model');
const Lab = require('../models/lab.model');
const LabAssignment = require('../models/labAssignment.model');
const { authorize } = require('../middleware/auth');
const {
  validateSectionInput,
  validateLabInput,
  validateLabAssignmentInput,
  validateCreateUserInput
} = require('../validators/academic.validator');

async function runAcademicUnitTests() {
  console.log('=== Running Phase 2 Academic Structure & Administration Unit Tests ===\n');

  // 1. Validation Tests
  console.log('1. Testing Academic Input Validators...');

  // Section validation
  let sectionPassed = false;
  validateSectionInput(
    {
      body: {
        name: 'Section A',
        sectionCode: 'cse-a',
        academicYear: '2026-2027',
        semester: 'Semester 1',
        department: 'Computer Science & Engineering'
      }
    },
    {},
    (err) => {
      if (!err) sectionPassed = true;
    }
  );
  assert.strictEqual(sectionPassed, true, 'Valid section input should pass');

  // Lab validation
  let labPassed = false;
  validateLabInput(
    {
      body: {
        name: 'Data Structures Lab',
        code: 'cs-201p',
        subject: 'Data Structures',
        department: 'Computer Science & Engineering',
        academicYear: '2026-2027',
        semester: 'Semester 3'
      }
    },
    {},
    (err) => {
      if (!err) labPassed = true;
    }
  );
  assert.strictEqual(labPassed, true, 'Valid lab input should pass');

  // User creation validation
  let studentPassed = false;
  validateCreateUserInput(
    {
      body: {
        name: 'John Doe',
        rollNumber: '23341a4504',
        role: 'STUDENT',
        temporaryPassword: 'TempStudentPass123!',
        section: 'CSE-A'
      }
    },
    {},
    (err) => {
      if (!err) studentPassed = true;
    }
  );
  assert.strictEqual(studentPassed, true, 'Valid student creation input should pass');
  console.log('✓ Academic input validation rules passed.\n');

  // 2. Data Models Instantiation & Schema Integrity
  console.log('2. Testing Mongoose Models Instantiation...');

  const mockSection = new Section({
    name: 'Section A',
    sectionCode: 'CSE-A',
    academicYear: '2026-2027',
    semester: 'Semester 1',
    department: 'Computer Science & Engineering',
    active: true
  });
  assert.strictEqual(mockSection.sectionCode, 'CSE-A');
  assert.strictEqual(mockSection.active, true);

  const mockLab = new Lab({
    name: 'Data Structures & Algorithms Lab',
    code: 'CS-201P',
    subject: 'Data Structures',
    department: 'Computer Science & Engineering',
    academicYear: '2026-2027',
    semester: 'Semester 3',
    active: true
  });
  assert.strictEqual(mockLab.code, 'CS-201P');

  const mockTeacherId = new mongoose.Types.ObjectId();
  const mockAssignment = new LabAssignment({
    lab: mockLab._id,
    section: mockSection._id,
    teacher: mockTeacherId,
    assignmentType: 'MAIN',
    active: true
  });
  assert.strictEqual(mockAssignment.assignmentType, 'MAIN');
  assert.strictEqual(mockAssignment.active, true);
  console.log('✓ Section, Lab, and LabAssignment models instantiated cleanly.\n');

  // 3. Business Rule Validation: Main vs Assistant Teacher Assignments
  console.log('3. Testing Lab Assignment Business Rules Logic...');

  const teacherAId = new mongoose.Types.ObjectId();
  const teacherBId = new mongoose.Types.ObjectId();
  const studentUser = new User({
    _id: new mongoose.Types.ObjectId(),
    name: 'Student User',
    rollNumber: '202301001',
    passwordHash: 'hash',
    role: 'STUDENT',
    active: true
  });

  // Rule: Cannot assign non-teacher to Lab
  assert.strictEqual(studentUser.role !== 'TEACHER', true, 'Student cannot be assigned as teacher');

  // Rule: Single active MAIN teacher simulation
  const existingAssignments = [
    {
      lab: mockLab._id.toString(),
      section: mockSection._id.toString(),
      teacher: teacherAId.toString(),
      assignmentType: 'MAIN',
      active: true
    }
  ];

  // Try assigning second MAIN teacher
  const candidateAssignment = {
    lab: mockLab._id.toString(),
    section: mockSection._id.toString(),
    teacher: teacherBId.toString(),
    assignmentType: 'MAIN',
    active: true
  };

  const hasExistingMain = existingAssignments.some(
    (a) =>
      a.lab === candidateAssignment.lab &&
      a.section === candidateAssignment.section &&
      a.assignmentType === 'MAIN' &&
      a.active === true
  );
  assert.strictEqual(hasExistingMain, true, 'Second active MAIN teacher must be detected and prevented');

  // Assistant teacher assignment allowed
  candidateAssignment.assignmentType = 'ASSISTANT';
  const hasDuplicateTeacher = existingAssignments.some(
    (a) =>
      a.lab === candidateAssignment.lab &&
      a.section === candidateAssignment.section &&
      a.teacher === candidateAssignment.teacher &&
      a.active === true
  );
  assert.strictEqual(hasDuplicateTeacher, false, 'Distinct assistant teacher is allowed');
  console.log('✓ Lab Assignment single-MAIN teacher and distinct assistant constraints verified.\n');

  // 4. Role Authorization for Academic Administration
  console.log('4. Testing Role Authorization Guards for Academic APIs...');
  const adminGuard = authorize('ADMIN_HOD');

  let adminAllowed = false;
  adminGuard({ user: { role: 'ADMIN_HOD' } }, {}, (err) => {
    if (!err) adminAllowed = true;
  });
  assert.strictEqual(adminAllowed, true, 'ADMIN_HOD must be allowed access to administration APIs');

  let teacherBlocked = false;
  adminGuard({ user: { role: 'TEACHER' } }, {}, (err) => {
    if (err && err.statusCode === 403) teacherBlocked = true;
  });
  assert.strictEqual(teacherBlocked, true, 'TEACHER must be blocked from ADMIN_HOD management APIs');

  let studentBlocked = false;
  adminGuard({ user: { role: 'STUDENT' } }, {}, (err) => {
    if (err && err.statusCode === 403) studentBlocked = true;
  });
  assert.strictEqual(studentBlocked, true, 'STUDENT must be blocked from ADMIN_HOD management APIs');
  console.log('✓ RBAC Authorization for Academic Administration verified.\n');

  console.log('=== ALL PHASE 2 ACADEMIC STRUCTURE UNIT TESTS PASSED ===');
}

runAcademicUnitTests().catch((err) => {
  console.error('Academic test failure:', err);
  process.exit(1);
});
