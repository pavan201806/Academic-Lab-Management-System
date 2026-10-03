const evaluationService = require('../services/evaluationService');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const getStudentEvaluations = asyncHandler(async (req, res) => {
  const { experimentId } = req.params;
  const result = await evaluationService.getStudentEvaluations(experimentId, req.user);
  return successResponse(res, result, 'Evaluations retrieved successfully');
});

const getEvaluationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const evaluation = await evaluationService.getEvaluationById(id, req.user);
  return successResponse(res, evaluation, 'Evaluation details retrieved successfully');
});

const getLabEvaluations = asyncHandler(async (req, res) => {
  const { labId } = req.params;
  const { experimentId } = req.query;
  const evaluations = await evaluationService.getLabEvaluations(labId, experimentId, req.user);
  return successResponse(res, evaluations, 'Laboratory evaluations ledger retrieved successfully');
});

module.exports = {
  getStudentEvaluations,
  getEvaluationById,
  getLabEvaluations
};
