const malpracticeService = require('../services/malpracticeService');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const recordEvent = asyncHandler(async (req, res) => {
  const event = await malpracticeService.recordEvent(req.user, req.body);
  return successResponse(res, { event }, 'Malpractice event recorded successfully', 201);
});

const getEvents = asyncHandler(async (req, res) => {
  const result = await malpracticeService.getEvents({
    user: req.user,
    query: req.query
  });
  return successResponse(res, result, 'Malpractice events retrieved successfully');
});

const getEventSummary = asyncHandler(async (req, res) => {
  const { experimentId, studentId, labId } = req.query;
  const summary = await malpracticeService.getEventSummary({
    user: req.user,
    experimentId,
    studentId,
    labId
  });
  return successResponse(res, summary, 'Malpractice summary retrieved successfully');
});

module.exports = {
  recordEvent,
  getEvents,
  getEventSummary
};
