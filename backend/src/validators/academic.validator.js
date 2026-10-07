const mongoose = require('mongoose');
const AppError = require('../utils/appError');
const { ALPHANUMERIC_REGEX } = require('./auth.validator');

const validateObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const validateObjectIdParam = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !validateObjectId(id)) {
      return next(new AppError(`Invalid resource identifier: ${id}`, 400));
    }
    next();
  };
};

const validateSectionInput = (req, res, next) => {
  const { name, sectionCode, academicYear, semester, department } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new AppError('Section name is required', 400));
  }

  if (!sectionCode || typeof sectionCode !== 'string' || !sectionCode.trim()) {
    return next(new AppError('Section code is required', 400));
  }

  if (!academicYear || typeof academicYear !== 'string' || !academicYear.trim()) {
    return next(new AppError('Academic year is required (e.g. 2026-2027)', 400));
  }

  if (!semester || typeof semester !== 'string' || !semester.trim()) {
    return next(new AppError('Semester is required', 400));
  }

  if (!department || typeof department !== 'string' || !department.trim()) {
    return next(new AppError('Department is required', 400));
  }

  req.body.name = name.trim();
  req.body.sectionCode = sectionCode.trim().toUpperCase();
  req.body.academicYear = academicYear.trim();
  req.body.semester = semester.trim();
  req.body.department = department.trim();

  next();
};

const validateLabInput = (req, res, next) => {
  const { name, code, subject, department, academicYear, semester, description } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new AppError('Laboratory name is required', 400));
  }

  if (!code || typeof code !== 'string' || !code.trim()) {
    return next(new AppError('Laboratory code is required (e.g. CS-201P)', 400));
  }

  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    return next(new AppError('Subject name is required', 400));
  }

  if (!department || typeof department !== 'string' || !department.trim()) {
    return next(new AppError('Department is required', 400));
  }

  if (!academicYear || typeof academicYear !== 'string' || !academicYear.trim()) {
    return next(new AppError('Academic year is required', 400));
  }

  if (!semester || typeof semester !== 'string' || !semester.trim()) {
    return next(new AppError('Semester is required', 400));
  }

  req.body.name = name.trim();
  req.body.code = code.trim().toUpperCase();
  req.body.subject = subject.trim();
  req.body.department = department.trim();
  req.body.academicYear = academicYear.trim();
  req.body.semester = semester.trim();
  if (description) req.body.description = description.trim();

  next();
};

const validateLabAssignmentInput = (req, res, next) => {
  const { lab, section, teacher, assignmentType } = req.body;

  if (!lab || !validateObjectId(lab)) {
    return next(new AppError('Valid Lab reference is required', 400));
  }

  if (!section || !validateObjectId(section)) {
    return next(new AppError('Valid Section reference is required', 400));
  }

  if (!teacher || !validateObjectId(teacher)) {
    return next(new AppError('Valid Teacher reference is required', 400));
  }

  if (!assignmentType || !['MAIN', 'ASSISTANT'].includes(assignmentType)) {
    return next(new AppError('Assignment type must be either MAIN or ASSISTANT', 400));
  }

  next();
};

const validateCreateTeacherInput = (req, res, next) => {
  const { name, rollNumber, temporaryPassword } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new AppError('Name is required', 400));
  }

  if (!rollNumber || typeof rollNumber !== 'string' || !rollNumber.trim()) {
    return next(new AppError('Roll number / username is required', 400));
  }

  const cleanRoll = rollNumber.trim();
  if (!ALPHANUMERIC_REGEX.test(cleanRoll)) {
    return next(new AppError('Roll number / username must contain only letters and numbers', 400));
  }

  if (!temporaryPassword || typeof temporaryPassword !== 'string' || temporaryPassword.length < 6) {
    return next(new AppError('Temporary password is required (minimum 6 characters)', 400));
  }

  req.body.name = name.trim();
  req.body.rollNumber = cleanRoll.toUpperCase();
  req.body.role = 'TEACHER';

  next();
};

const validateCreateStudentInput = (req, res, next) => {
  const { name, rollNumber, temporaryPassword, section } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new AppError('Name is required', 400));
  }

  if (!rollNumber || typeof rollNumber !== 'string' || !rollNumber.trim()) {
    return next(new AppError('Roll number / username is required', 400));
  }

  const cleanRoll = rollNumber.trim();
  if (!ALPHANUMERIC_REGEX.test(cleanRoll)) {
    return next(new AppError('Roll number / username must contain only letters and numbers', 400));
  }

  if (!temporaryPassword || typeof temporaryPassword !== 'string' || temporaryPassword.length < 6) {
    return next(new AppError('Temporary password is required (minimum 6 characters)', 400));
  }

  req.body.name = name.trim();
  req.body.rollNumber = cleanRoll.toUpperCase();
  req.body.role = 'STUDENT';
  if (section && typeof section === 'string') req.body.section = section.trim();

  next();
};

const validateCreateUserInput = (req, res, next) => {
  const { name, rollNumber, role, temporaryPassword, section } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new AppError('Name is required', 400));
  }

  if (!rollNumber || typeof rollNumber !== 'string' || !rollNumber.trim()) {
    return next(new AppError('Roll number / username is required', 400));
  }

  const cleanRoll = rollNumber.trim();
  if (!ALPHANUMERIC_REGEX.test(cleanRoll)) {
    return next(new AppError('Roll number / username must contain only letters and numbers', 400));
  }

  if (role && !['TEACHER', 'STUDENT'].includes(role)) {
    return next(new AppError('Role must be either TEACHER or STUDENT', 400));
  }

  if (!temporaryPassword || typeof temporaryPassword !== 'string' || temporaryPassword.length < 6) {
    return next(new AppError('Temporary password is required (minimum 6 characters)', 400));
  }

  req.body.name = name.trim();
  req.body.rollNumber = cleanRoll.toUpperCase();
  if (section && typeof section === 'string') req.body.section = section.trim();

  next();
};

const validateAssignStudentInput = (req, res, next) => {
  const { studentId, sectionCode } = req.body;

  if (!studentId || !validateObjectId(studentId)) {
    return next(new AppError('Valid student reference ID is required', 400));
  }

  if (sectionCode !== undefined && typeof sectionCode !== 'string') {
    return next(new AppError('Section code must be a string', 400));
  }

  next();
};

module.exports = {
  validateObjectId,
  validateObjectIdParam,
  validateSectionInput,
  validateLabInput,
  validateLabAssignmentInput,
  validateCreateTeacherInput,
  validateCreateStudentInput,
  validateCreateUserInput,
  validateAssignStudentInput
};

