const submissionService = require('../services/submissionService');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const runCode = asyncHandler(async (req, res) => {
  const { experimentId, language, sourceCode, stdin } = req.body;
  const result = await submissionService.runCode(
    experimentId,
    language,
    sourceCode,
    stdin || '',
    req.user
  );
  return successResponse(res, result, 'Code executed successfully');
});

const submitCode = asyncHandler(async (req, res) => {
  const { experimentId, language, sourceCode, stdin } = req.body;
  const submission = await submissionService.submitCode(
    experimentId,
    language,
    sourceCode,
    stdin || '',
    req.user
  );
  return successResponse(res, submission, 'Code submitted successfully', 201);
});

const getStudentSubmissions = asyncHandler(async (req, res) => {
  const { experimentId } = req.params;
  const submissions = await submissionService.getStudentSubmissions(experimentId, req.user);
  return successResponse(res, submissions, 'Submissions retrieved successfully');
});

const getSubmissionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const submission = await submissionService.getSubmissionById(id, req.user);
  return successResponse(res, submission, 'Submission retrieved successfully');
});

const getTeacherSubmissionsForLab = asyncHandler(async (req, res) => {
  const { labId } = req.params;
  const { experimentId } = req.query;
  const submissions = await submissionService.getTeacherSubmissionsForLab(labId, experimentId, req.user);
  return successResponse(res, submissions, 'Laboratory submissions retrieved successfully');
});

module.exports = {
  runCode,
  submitCode,
  getStudentSubmissions,
  getSubmissionById,
  getTeacherSubmissionsForLab
};
