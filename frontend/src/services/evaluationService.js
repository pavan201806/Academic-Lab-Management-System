import apiClient from './api';

export const evaluationService = {
  /**
   * Get student's evaluation results for an experiment (attempts, score /10, highest score, test case results)
   */
  getStudentEvaluations: async (experimentId) => {
    const res = await apiClient.get(`/evaluations/experiment/${experimentId}/student`);
    return res.data || res;
  },

  /**
   * Get evaluation for a specific submission by submission ID
   */
  getEvaluationBySubmissionId: async (submissionId) => {
    const res = await apiClient.get(`/evaluations/submission/${submissionId}`);
    return res.data || res;
  },

  /**
   * Get evaluation by its ID
   */
  getEvaluationById: async (evaluationId) => {
    const res = await apiClient.get(`/evaluations/${evaluationId}`);
    return res.data || res;
  },

  /**
   * Get all evaluations for a lab (Teacher / Admin ledger view)
   */
  getLabEvaluations: async (labId, experimentId) => {
    const params = new URLSearchParams();
    if (experimentId) params.append('experimentId', experimentId);

    const res = await apiClient.get(`/evaluations/lab/${labId}?${params.toString()}`);
    return res.data || res;
  }
};
