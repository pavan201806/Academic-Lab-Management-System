const sectionService = require('../services/sectionService');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const getSections = asyncHandler(async (req, res) => {
  const sections = await sectionService.getSections(req.query);
  return successResponse(res, sections, 'Sections retrieved successfully');
});

const getSectionById = asyncHandler(async (req, res) => {
  const section = await sectionService.getSectionById(req.params.id);
  return successResponse(res, section, 'Section retrieved successfully');
});

const createSection = asyncHandler(async (req, res) => {
  const section = await sectionService.createSection(req.body);
  return successResponse(res, section, 'Section created successfully', 201);
});

const updateSection = asyncHandler(async (req, res) => {
  const section = await sectionService.updateSection(req.params.id, req.body);
  return successResponse(res, section, 'Section updated successfully');
});

const toggleActive = asyncHandler(async (req, res) => {
  const { active } = req.body;
  const section = await sectionService.toggleActive(req.params.id, active);
  return successResponse(
    res,
    section,
    `Section ${active ? 'activated' : 'deactivated'} successfully`
  );
});

const getSectionStudents = asyncHandler(async (req, res) => {
  const students = await sectionService.getSectionStudents(req.params.sectionCode);
  return successResponse(res, students, 'Section students retrieved successfully');
});

const assignStudent = asyncHandler(async (req, res) => {
  const { studentId, sectionCode } = req.body;
  const student = await sectionService.assignStudentToSection(studentId, sectionCode);
  return successResponse(res, student, 'Student assigned to section successfully');
});

module.exports = {
  getSections,
  getSectionById,
  createSection,
  updateSection,
  toggleActive,
  getSectionStudents,
  assignStudent
};
