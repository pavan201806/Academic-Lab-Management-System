const reevaluationService = require('../services/reevaluationService');

const requestReevaluation = async (req, res, next) => {
  try {
    const { experimentId, reason } = req.body;
    const request = await reevaluationService.requestReevaluation(
      { experimentId, reason },
      req.user
    );
    res.status(201).json({
      status: 'success',
      data: request
    });
  } catch (err) {
    next(err);
  }
};

const getStudentRequest = async (req, res, next) => {
  try {
    const { experimentId } = req.params;
    const request = await reevaluationService.getStudentReevaluationRequest(experimentId, req.user);
    res.status(200).json({
      status: 'success',
      data: request
    });
  } catch (err) {
    next(err);
  }
};

const getLabRequests = async (req, res, next) => {
  try {
    const { labId } = req.params;
    const { experimentId } = req.query;
    const requests = await reevaluationService.getLabReevaluationRequests(labId, experimentId, req.user);
    res.status(200).json({
      status: 'success',
      results: requests.length,
      data: requests
    });
  } catch (err) {
    next(err);
  }
};

const getRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await reevaluationService.getReevaluationRequestById(id, req.user);
    res.status(200).json({
      status: 'success',
      data: request
    });
  } catch (err) {
    next(err);
  }
};

const processRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, reviewRemarks, marks, remarks } = req.body;
    const result = await reevaluationService.processReevaluationRequest(
      id,
      { action, reviewRemarks, marks, remarks },
      req.user
    );
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  requestReevaluation,
  getStudentRequest,
  getLabRequests,
  getRequestById,
  processRequest
};
