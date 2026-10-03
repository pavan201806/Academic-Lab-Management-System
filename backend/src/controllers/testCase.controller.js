const testCaseService = require('../services/testCaseService');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const getTestCases = asyncHandler(async (req, res) => {
  const { experimentId } = req.params;
  const testCases = await testCaseService.getTestCases(experimentId, req.user);
  return successResponse(res, testCases, 'Test cases retrieved successfully');
});

const createTestCase = asyncHandler(async (req, res) => {
  const testCase = await testCaseService.createTestCase(req.body, req.user);
  return successResponse(res, testCase, 'Test case created successfully', 201);
});

const updateTestCase = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const testCase = await testCaseService.updateTestCase(id, req.body, req.user);
  return successResponse(res, testCase, 'Test case updated successfully');
});

const deactivateTestCase = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const testCase = await testCaseService.deactivateTestCase(id, req.user);
  return successResponse(res, testCase, 'Test case deactivated successfully');
});

const reorderTestCases = asyncHandler(async (req, res) => {
  const { experimentId, orders } = req.body;
  const testCases = await testCaseService.reorderTestCases(experimentId, orders, req.user);
  return successResponse(res, testCases, 'Test cases reordered successfully');
});

module.exports = {
  getTestCases,
  createTestCase,
  updateTestCase,
  deactivateTestCase,
  reorderTestCases
};
