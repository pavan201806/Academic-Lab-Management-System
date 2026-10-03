const vivaService = require('../services/vivaService');

const getEligibleStudents = async (req, res, next) => {
  try {
    const { experimentId } = req.params;
    const students = await vivaService.getEligibleStudentsForViva(experimentId, req.user);
    res.status(200).json({
      status: 'success',
      results: students.length,
      data: students
    });
  } catch (err) {
    next(err);
  }
};

const createViva = async (req, res, next) => {
  try {
    const { studentId, experimentId, marks, remarks } = req.body;
    const viva = await vivaService.createVivaEvaluation(
      { studentId, experimentId, marks, remarks },
      req.user
    );
    res.status(201).json({
      status: 'success',
      data: viva
    });
  } catch (err) {
    next(err);
  }
};

const getStudentViva = async (req, res, next) => {
  try {
    const { experimentId } = req.params;
    const vivaData = await vivaService.getStudentViva(experimentId, req.user);
    res.status(200).json({
      status: 'success',
      data: vivaData
    });
  } catch (err) {
    next(err);
  }
};

const getStudentVivaForFaculty = async (req, res, next) => {
  try {
    const { studentId, experimentId } = req.params;
    const vivaData = await vivaService.getStudentVivaForFaculty(studentId, experimentId, req.user);
    res.status(200).json({
      status: 'success',
      data: vivaData
    });
  } catch (err) {
    next(err);
  }
};

const getLabVivaEvaluations = async (req, res, next) => {
  try {
    const { labId } = req.params;
    const { experimentId } = req.query;
    const vivas = await vivaService.getLabVivaEvaluations(labId, experimentId, req.user);
    res.status(200).json({
      status: 'success',
      results: vivas.length,
      data: vivas
    });
  } catch (err) {
    next(err);
  }
};

const getVivaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const viva = await vivaService.getVivaById(id, req.user);
    res.status(200).json({
      status: 'success',
      data: viva
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getEligibleStudents,
  createViva,
  getStudentViva,
  getStudentVivaForFaculty,
  getLabVivaEvaluations,
  getVivaById
};
