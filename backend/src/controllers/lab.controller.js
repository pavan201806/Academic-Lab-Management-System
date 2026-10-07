const labService = require('../services/labService');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const getLabs = asyncHandler(async (req, res) => {
  const labs = await labService.getLabs(req.query);
  return successResponse(res, labs, 'Laboratories retrieved successfully');
});

const getAssignedLabs = asyncHandler(async (req, res) => {
  const labs = await labService.getAssignedLabs(req.user);
  return successResponse(res, labs, 'Assigned laboratories retrieved successfully');
});

const getLabById = asyncHandler(async (req, res) => {
  const sectionId = req.params.sectionId || req.query.sectionId;
  const sectionCode = req.query.sectionCode;
  const lab = await labService.getLabDetailsForUser(req.params.id, req.user, {
    sectionId,
    sectionCode
  });
  return successResponse(res, lab, 'Laboratory retrieved successfully');
});

const createLab = asyncHandler(async (req, res) => {
  const lab = await labService.createLab(req.body);
  return successResponse(res, lab, 'Laboratory created successfully', 201);
});

const updateLab = asyncHandler(async (req, res) => {
  const lab = await labService.updateLab(req.params.id, req.body);
  return successResponse(res, lab, 'Laboratory updated successfully');
});

const toggleActive = asyncHandler(async (req, res) => {
  const { active } = req.body;
  const lab = await labService.toggleActive(req.params.id, active);
  return successResponse(
    res,
    lab,
    `Laboratory ${active ? 'activated' : 'deactivated'} successfully`
  );
});

const getLabDeletionStatus = asyncHandler(async (req, res) => {
  const status = await labService.getLabDeletionStatus(req.params.id);
  return successResponse(res, status, 'Laboratory deletion status retrieved successfully');
});

const deleteLab = asyncHandler(async (req, res) => {
  const result = await labService.deleteLab(req.params.id);
  return successResponse(res, result, result.message || 'Laboratory deleted successfully');
});

const getLabStudentsPerformance = asyncHandler(async (req, res) => {
  const sectionId = req.query.sectionId;
  const section = req.query.section;
  const search = req.query.search;
  const active = req.query.active;

  const result = await labService.getLabStudentsPerformance(req.params.id, req.user, {
    sectionId,
    section,
    search,
    active
  });

  return successResponse(res, result, 'Laboratory students performance retrieved successfully');
});

const getStudentLabPerformanceDetail = asyncHandler(async (req, res) => {
  const result = await labService.getStudentLabPerformanceDetail(
    req.params.id,
    req.params.studentId,
    req.user
  );

  return successResponse(res, result, 'Student laboratory performance details retrieved successfully');
});

module.exports = {
  getLabs,
  getAssignedLabs,
  getLabById,
  createLab,
  updateLab,
  toggleActive,
  getLabDeletionStatus,
  deleteLab,
  getLabStudentsPerformance,
  getStudentLabPerformanceDetail
};

