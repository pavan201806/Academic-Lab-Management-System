const reportService = require('../services/reportService');

/**
 * Helper to handle PDF/Excel/JSON response formatting
 */
const sendFormattedReport = async (res, reportData, format, defaultFilename) => {
  if (format === 'pdf') {
    const pdfBuffer = await reportService.exportReportPdf(reportData);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${defaultFilename}.pdf"`);
    return res.send(pdfBuffer);
  }

  if (format === 'excel' || format === 'xlsx') {
    const excelBuffer = await reportService.exportReportExcel(reportData);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${defaultFilename}.xlsx"`);
    return res.send(excelBuffer);
  }

  return res.status(200).json({
    status: 'success',
    data: reportData
  });
};

const getStudentReport = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { labId, format } = req.query;
    const report = await reportService.getStudentReport(req.user, studentId, { labId });
    const filename = `student_report_${studentId}_${Date.now()}`;
    await sendFormattedReport(res, report, format, filename);
  } catch (err) {
    next(err);
  }
};

const getSectionReport = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { labId, format } = req.query;
    const report = await reportService.getSectionReport(req.user, sectionId, { labId });
    const filename = `section_report_${sectionId}_${Date.now()}`;
    await sendFormattedReport(res, report, format, filename);
  } catch (err) {
    next(err);
  }
};

const getLabReport = async (req, res, next) => {
  try {
    const { labId } = req.params;
    const { sectionId, format } = req.query;
    const report = await reportService.getLabReport(req.user, labId, { sectionId });
    const filename = `lab_report_${labId}_${Date.now()}`;
    await sendFormattedReport(res, report, format, filename);
  } catch (err) {
    next(err);
  }
};

const getExperimentReport = async (req, res, next) => {
  try {
    const { experimentId } = req.params;
    const { sectionId, format } = req.query;
    const report = await reportService.getExperimentReport(req.user, experimentId, { sectionId });
    const filename = `experiment_report_${experimentId}_${Date.now()}`;
    await sendFormattedReport(res, report, format, filename);
  } catch (err) {
    next(err);
  }
};

const getMarksReport = async (req, res, next) => {
  try {
    const { labId, sectionId, experimentId, studentId, format } = req.query;
    const report = await reportService.getMarksReport(req.user, { labId, sectionId, experimentId, studentId });
    const filename = `marks_report_${Date.now()}`;
    await sendFormattedReport(res, report, format, filename);
  } catch (err) {
    next(err);
  }
};

const getVivaReport = async (req, res, next) => {
  try {
    const { labId, sectionId, experimentId, studentId, format } = req.query;
    const report = await reportService.getVivaReport(req.user, { labId, sectionId, experimentId, studentId });
    const filename = `viva_report_${Date.now()}`;
    await sendFormattedReport(res, report, format, filename);
  } catch (err) {
    next(err);
  }
};

const getProgressReport = async (req, res, next) => {
  try {
    const { labId, sectionId, studentId, format } = req.query;
    const report = await reportService.getProgressReport(req.user, { labId, sectionId, studentId });
    const filename = `progress_report_${Date.now()}`;
    await sendFormattedReport(res, report, format, filename);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStudentReport,
  getSectionReport,
  getLabReport,
  getExperimentReport,
  getMarksReport,
  getVivaReport,
  getProgressReport
};
