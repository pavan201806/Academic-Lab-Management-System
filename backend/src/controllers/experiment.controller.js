const experimentService = require('../services/experimentService');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const AppError = require('../utils/appError');

const getExperiments = asyncHandler(async (req, res) => {
  const labId = req.query.lab || req.query.labId;
  if (!labId) {
    throw new AppError('Laboratory ID (lab or labId query param) is required', 400);
  }
  const experiments = await experimentService.getExperiments(labId, req.user, req.query);
  return successResponse(res, experiments, 'Experiments retrieved successfully');
});

const getExperimentById = asyncHandler(async (req, res) => {
  const experiment = await experimentService.getExperimentById(req.params.id, req.user);
  return successResponse(res, experiment, 'Experiment retrieved successfully');
});

const createExperiment = asyncHandler(async (req, res) => {
  const experiment = await experimentService.createExperiment(req.body, req.user);
  return successResponse(res, experiment, 'Experiment created successfully', 201);
});

const updateExperiment = asyncHandler(async (req, res) => {
  const experiment = await experimentService.updateExperiment(req.params.id, req.body, req.user);
  return successResponse(res, experiment, 'Experiment updated successfully');
});

const publishExperiment = asyncHandler(async (req, res) => {
  const experiment = await experimentService.publishExperiment(req.params.id, req.user);
  return successResponse(res, experiment, 'Experiment published successfully');
});

const scheduleExperiment = asyncHandler(async (req, res) => {
  const { scheduledAt, deadline } = req.body;
  const experiment = await experimentService.scheduleExperiment(
    req.params.id,
    scheduledAt,
    deadline,
    req.user
  );
  return successResponse(res, experiment, 'Experiment scheduled successfully');
});

const reopenExperiment = asyncHandler(async (req, res) => {
  const { reopenedUntil } = req.body;
  const experiment = await experimentService.reopenExperiment(req.params.id, reopenedUntil, req.user);
  return successResponse(res, experiment, 'Experiment reopened successfully');
});

const closeExperiment = asyncHandler(async (req, res) => {
  const experiment = await experimentService.closeExperiment(req.params.id, req.user);
  return successResponse(res, experiment, 'Experiment closed successfully');
});

const reorderExperiments = asyncHandler(async (req, res) => {
  const { labId, orders } = req.body;
  if (!labId) {
    throw new AppError('Laboratory ID (labId) is required for reordering', 400);
  }
  const experiments = await experimentService.reorderExperiments(labId, orders, req.user);
  return successResponse(res, experiments, 'Experiments reordered successfully');
});

const toggleActive = asyncHandler(async (req, res) => {
  const { active } = req.body;
  const experiment = await experimentService.toggleActive(req.params.id, active, req.user);
  return successResponse(
    res,
    experiment,
    `Experiment ${active ? 'activated' : 'deactivated'} successfully`
  );
});

const extractPdfExperiments = asyncHandler(async (req, res) => {
  const labId = req.body.labId || req.query.labId || req.query.lab;
  if (!labId) {
    throw new AppError('Laboratory ID (labId) is required for PDF extraction', 400);
  }

  if (!req.file) {
    throw new AppError('A PDF file is required for experiment extraction', 400);
  }

  const result = await experimentService.extractExperimentsFromPdf(
    labId,
    req.file.buffer,
    req.file.originalname,
    req.file.size,
    req.user
  );

  return successResponse(res, result, 'Experiments extracted successfully from PDF');
});

const confirmPdfExperiments = asyncHandler(async (req, res) => {
  const { labId, experiments } = req.body;

  const createdExperiments = await experimentService.confirmExtractedExperiments(
    labId,
    experiments,
    req.user
  );

  return successResponse(
    res,
    createdExperiments,
    `Successfully created ${createdExperiments.length} experiments from PDF extraction`,
    201
  );
});

module.exports = {
  getExperiments,
  getExperimentById,
  createExperiment,
  updateExperiment,
  publishExperiment,
  scheduleExperiment,
  reopenExperiment,
  closeExperiment,
  reorderExperiments,
  toggleActive,
  extractPdfExperiments,
  confirmPdfExperiments
};

