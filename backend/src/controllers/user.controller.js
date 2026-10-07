const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const getUsers = asyncHandler(async (req, res) => {
  const users = await userService.getUsers(req.query);
  return successResponse(res, users, 'Users retrieved successfully');
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  return successResponse(res, user, 'User retrieved successfully');
});

const createTeacher = asyncHandler(async (req, res) => {
  const { name, rollNumber, temporaryPassword } = req.body;
  const teacher = await userService.createUser({
    name,
    rollNumber,
    role: 'TEACHER',
    temporaryPassword
  });
  return successResponse(res, teacher, 'Teacher account created successfully', 201);
});

const createStudent = asyncHandler(async (req, res) => {
  const { name, rollNumber, temporaryPassword, section } = req.body;
  const student = await userService.createUser({
    name,
    rollNumber,
    role: 'STUDENT',
    temporaryPassword,
    section
  });
  return successResponse(res, student, 'Student account created successfully', 201);
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body);
  return successResponse(res, user, 'User updated successfully');
});

const resetPassword = asyncHandler(async (req, res) => {
  const { temporaryPassword } = req.body;
  if (!temporaryPassword || temporaryPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Temporary password is required (minimum 6 characters)'
    });
  }
  const user = await userService.resetTemporaryPassword(req.params.id, temporaryPassword);
  return successResponse(res, user, 'Temporary password reset successfully');
});

const toggleActive = asyncHandler(async (req, res) => {
  const { active } = req.body;
  const user = await userService.toggleActive(req.params.id, active);
  return successResponse(
    res,
    user,
    `User ${active ? 'activated' : 'deactivated'} successfully`
  );
});

const bulkStudentService = require('../services/bulkStudentService');
const AppError = require('../utils/appError');

const previewBulkImport = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    throw new AppError('Excel file (.xlsx, .xls) is required for previewing bulk student enrollment', 400);
  }
  const preview = await bulkStudentService.previewEnrollment(req.file.buffer, req.file.originalname);
  return successResponse(res, preview, 'Bulk student enrollment preview generated successfully');
});

const executeBulkImport = asyncHandler(async (req, res) => {
  const { records, defaultPassword } = req.body;
  const fileBuffer = req.file ? req.file.buffer : null;
  const fileName = req.file ? req.file.originalname : null;

  if (!fileBuffer && (!records || !Array.isArray(records) || records.length === 0)) {
    throw new AppError('Either an Excel file or confirmed student records array is required for bulk import', 400);
  }

  const result = await bulkStudentService.importStudents({
    records,
    defaultPassword,
    fileBuffer,
    fileName
  });

  return successResponse(res, result, 'Bulk student enrollment completed successfully', 201);
});

const deleteStudent = asyncHandler(async (req, res) => {
  const result = await userService.deleteStudent(req.params.id);
  return successResponse(
    res,
    result,
    `Student ${result.deletedStudent.rollNumber} — ${result.deletedStudent.name} and all related records deleted permanently`
  );
});

const deleteTeacher = asyncHandler(async (req, res) => {
  const result = await userService.deleteTeacher(req.params.id);
  return successResponse(
    res,
    result,
    `Teacher ${result.deletedTeacher.name} (${result.deletedTeacher.rollNumber}) and assignments permanently deleted successfully`
  );
});

const deleteUser = asyncHandler(async (req, res) => {
  const result = await userService.deleteUser(req.params.id);
  const name = result.deletedStudent?.name || result.deletedTeacher?.name || 'User';
  const id = result.deletedStudent?.rollNumber || result.deletedTeacher?.rollNumber || req.params.id;
  return successResponse(
    res,
    result,
    `Account ${name} (${id}) permanently deleted successfully`
  );
});

const previewBulkDeleteStudents = asyncHandler(async (req, res) => {
  const { studentIds } = req.body;
  const result = await userService.previewBulkDeleteStudents(studentIds);
  return successResponse(res, result, 'Bulk student deletion preview generated successfully');
});

const bulkDeleteStudents = asyncHandler(async (req, res) => {
  const { studentIds } = req.body;
  const result = await userService.bulkDeleteStudents(studentIds);
  return successResponse(
    res,
    result,
    `Bulk student deletion completed successfully: ${result.deletedCount} students permanently deleted.`
  );
});

module.exports = {
  getUsers,
  getUserById,
  createTeacher,
  createStudent,
  updateUser,
  resetPassword,
  toggleActive,
  previewBulkImport,
  executeBulkImport,
  previewBulkDeleteStudents,
  bulkDeleteStudents,
  deleteStudent,
  deleteTeacher,
  deleteUser
};




