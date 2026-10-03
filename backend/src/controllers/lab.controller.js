const labService = require('../services/labService');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const getLabs = asyncHandler(async (req, res) => {
  const labs = await labService.getLabs(req.query);
  return successResponse(res, labs, 'Laboratories retrieved successfully');
});

const getLabById = asyncHandler(async (req, res) => {
  const lab = await labService.getLabById(req.params.id);
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

module.exports = {
  getLabs,
  getLabById,
  createLab,
  updateLab,
  toggleActive
};
