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

const getLabMalpracticeOverview = asyncHandler(async (req, res) => {
  const { labId } = req.params;
  const { sectionId, experimentId } = req.query;
  const overview = await malpracticeService.getLabMalpracticeOverview({
    user: req.user,
    labId,
    sectionId,
    experimentId
  });
  return successResponse(res, overview, 'Lab malpractice overview retrieved successfully');
});

module.exports = {
  recordEvent,
  getEvents,
  getEventSummary,
  getLabMalpracticeOverview
};
