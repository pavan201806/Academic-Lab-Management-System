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

module.exports = {
  getUsers,
  getUserById,
  createTeacher,
  createStudent,
  updateUser,
  resetPassword,
  toggleActive
};
