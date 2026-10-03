import apiClient from './api';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Helper to download binary files (PDF/XLSX) securely via Blob URL
 */
const downloadFile = async (url, params, fallbackFilename) => {
  const token = localStorage.getItem('auth_token');
  const response = await axios.get(`${API_BASE_URL}${url}`, {
    params,
    responseType: 'blob',
    headers: {
      Authorization: token ? `Bearer ${token}` : ''
    }
  });

  const blob = new Blob([response.data], {
    type: response.headers['content-type'] || 'application/octet-stream'
  });

  let filename = fallbackFilename;
  const disposition = response.headers['content-disposition'];
  if (disposition && disposition.includes('filename=')) {
    const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1];
    }
  }

  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};

export const reportService = {
  // 1. Student Academic Performance Report
  getStudentReport: async (studentId, params = {}) => {
    return await apiClient.get(`/reports/student/${studentId}`, { params });
  },

  downloadStudentReportPdf: async (studentId, params = {}) => {
    return await downloadFile(
      `/reports/student/${studentId}`,
      { ...params, format: 'pdf' },
      `student_report_${studentId}.pdf`
    );
  },

  downloadStudentReportExcel: async (studentId, params = {}) => {
    return await downloadFile(
      `/reports/student/${studentId}`,
      { ...params, format: 'excel' },
      `student_report_${studentId}.xlsx`
    );
  },

  // 2. Section Performance Report
  getSectionReport: async (sectionId, params = {}) => {
    return await apiClient.get(`/reports/section/${sectionId}`, { params });
  },

  downloadSectionReportPdf: async (sectionId, params = {}) => {
    return await downloadFile(
      `/reports/section/${sectionId}`,
      { ...params, format: 'pdf' },
      `section_report_${sectionId}.pdf`
    );
  },

  downloadSectionReportExcel: async (sectionId, params = {}) => {
    return await downloadFile(
      `/reports/section/${sectionId}`,
      { ...params, format: 'excel' },
      `section_report_${sectionId}.xlsx`
    );
  },

  // 3. Laboratory Performance Report
  getLabReport: async (labId, params = {}) => {
    return await apiClient.get(`/reports/lab/${labId}`, { params });
  },

  downloadLabReportPdf: async (labId, params = {}) => {
    return await downloadFile(
      `/reports/lab/${labId}`,
      { ...params, format: 'pdf' },
      `lab_report_${labId}.pdf`
    );
  },

  downloadLabReportExcel: async (labId, params = {}) => {
    return await downloadFile(
      `/reports/lab/${labId}`,
      { ...params, format: 'excel' },
      `lab_report_${labId}.xlsx`
    );
  },

  // 4. Experiment Performance Report
  getExperimentReport: async (experimentId, params = {}) => {
    return await apiClient.get(`/reports/experiment/${experimentId}`, { params });
  },

  downloadExperimentReportPdf: async (experimentId, params = {}) => {
    return await downloadFile(
      `/reports/experiment/${experimentId}`,
      { ...params, format: 'pdf' },
      `experiment_report_${experimentId}.pdf`
    );
  },

  downloadExperimentReportExcel: async (experimentId, params = {}) => {
    return await downloadFile(
      `/reports/experiment/${experimentId}`,
      { ...params, format: 'excel' },
      `experiment_report_${experimentId}.xlsx`
    );
  },

  // 5. Marks Ledger Report
  getMarksReport: async (params = {}) => {
    return await apiClient.get('/reports/marks', { params });
  },

  downloadMarksReportPdf: async (params = {}) => {
    return await downloadFile(
      '/reports/marks',
      { ...params, format: 'pdf' },
      `marks_ledger_report_${Date.now()}.pdf`
    );
  },

  downloadMarksReportExcel: async (params = {}) => {
    return await downloadFile(
      '/reports/marks',
      { ...params, format: 'excel' },
      `marks_ledger_report_${Date.now()}.xlsx`
    );
  },

  // 6. Viva Assessment Report
  getVivaReport: async (params = {}) => {
    return await apiClient.get('/reports/viva', { params });
  },

  downloadVivaReportPdf: async (params = {}) => {
    return await downloadFile(
      '/reports/viva',
      { ...params, format: 'pdf' },
      `viva_assessment_report_${Date.now()}.pdf`
    );
  },

  downloadVivaReportExcel: async (params = {}) => {
    return await downloadFile(
      '/reports/viva',
      { ...params, format: 'excel' },
      `viva_assessment_report_${Date.now()}.xlsx`
    );
  },

  // 7. Curriculum Progress Report
  getProgressReport: async (params = {}) => {
    return await apiClient.get('/reports/progress', { params });
  },

  downloadProgressReportPdf: async (params = {}) => {
    return await downloadFile(
      '/reports/progress',
      { ...params, format: 'pdf' },
      `progress_report_${Date.now()}.pdf`
    );
  },

  downloadProgressReportExcel: async (params = {}) => {
    return await downloadFile(
      '/reports/progress',
      { ...params, format: 'excel' },
      `progress_report_${Date.now()}.xlsx`
    );
  }
};
