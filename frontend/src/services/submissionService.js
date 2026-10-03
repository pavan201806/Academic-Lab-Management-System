import apiClient from './api';

export const submissionService = {
  /**
   * Run student code for manual testing / preview (does not consume an attempt or save submission)
   */
  runCode: async ({ experimentId, language, sourceCode, stdin }) => {
    const res = await apiClient.post('/submissions/run', {
      experimentId,
      language,
      sourceCode,
      stdin: stdin || ''
    });
    return res.data || res;
  },

  /**
   * Submit official solution (consumes an attempt and records an immutable submission)
   */
  submitCode: async ({ experimentId, language, sourceCode, stdin }) => {
    const res = await apiClient.post('/submissions/submit', {
      experimentId,
      language,
      sourceCode,
      stdin: stdin || ''
    });
    return res.data || res;
  },

  /**
   * Get submission history for the logged-in student for a specific experiment
   */
  getStudentSubmissions: async (experimentId) => {
    const res = await apiClient.get(`/submissions/experiment/${experimentId}`);
    return res.data || res;
  },

  /**
   * Get single submission details
   */
  getSubmissionById: async (submissionId) => {
    const res = await apiClient.get(`/submissions/${submissionId}`);
    return res.data || res;
  },

  /**
   * Get all submissions for a lab (Teacher / Admin ledger view)
   */
  getTeacherSubmissionsForLab: async (labId, experimentId) => {
    const params = new URLSearchParams();
    if (experimentId) params.append('experimentId', experimentId);

    const res = await apiClient.get(`/submissions/lab/${labId}?${params.toString()}`);
    return res.data || res;
  }
};
