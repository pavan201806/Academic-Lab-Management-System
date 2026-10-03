const labAssignmentService = require('../services/labAssignmentService');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const getAssignments = asyncHandler(async (req, res) => {
  const assignments = await labAssignmentService.getAssignments(req.query);
  return successResponse(res, assignments, 'Lab assignments retrieved successfully');
});

const getAssignmentById = asyncHandler(async (req, res) => {
  const assignment = await labAssignmentService.getAssignmentById(req.params.id);
  return successResponse(res, assignment, 'Lab assignment retrieved successfully');
});

const createAssignment = asyncHandler(async (req, res) => {
  const assignment = await labAssignmentService.createAssignment(req.body);
  return successResponse(res, assignment, 'Teacher assigned to lab section successfully', 201);
});

const toggleActive = asyncHandler(async (req, res) => {
  const { active } = req.body;
  const assignment = await labAssignmentService.toggleActive(req.params.id, active);
  return successResponse(
    res,
    assignment,
    `Assignment ${active ? 'activated' : 'deactivated'} successfully`
  );
});

const getLabAssignments = asyncHandler(async (req, res) => {
  const assignments = await labAssignmentService.getLabAssignments(req.params.labId);
  return successResponse(res, assignments, 'Lab active assignments retrieved successfully');
});

const getTeacherAssignments = asyncHandler(async (req, res) => {
  const assignments = await labAssignmentService.getTeacherAssignments(req.params.teacherId);
  return successResponse(res, assignments, 'Teacher active assignments retrieved successfully');
});

module.exports = {
  getAssignments,
  getAssignmentById,
  createAssignment,
  toggleActive,
  getLabAssignments,
  getTeacherAssignments
};
