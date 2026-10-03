import apiClient from './api';

export const vivaService = {
  /**
   * Get eligible students for viva evaluation in an experiment (Teacher / Admin)
   */
  getEligibleStudents: async (experimentId) => {
    const res = await apiClient.get(`/viva/experiment/${experimentId}/students`);
    return res.data || res;
  },

  /**
   * Submit initial viva evaluation (Teacher / Admin)
   */
  createViva: async ({ studentId, experimentId, marks, remarks }) => {
    const res = await apiClient.post('/viva', {
      studentId,
      experimentId,
      marks,
      remarks
    });
    return res.data || res;
  },

  /**
   * Get student's own viva details & version history
   */
  getStudentViva: async (experimentId) => {
    const res = await apiClient.get(`/viva/experiment/${experimentId}/my-viva`);
    return res.data || res;
  },

  /**
   * Get specific student's viva details for faculty
   */
  getStudentVivaForFaculty: async (studentId, experimentId) => {
    const res = await apiClient.get(`/viva/student/${studentId}/experiment/${experimentId}`);
    return res.data || res;
  },

  /**
   * Get all viva evaluations for a lab
   */
  getLabVivaEvaluations: async (labId, experimentId) => {
    const params = new URLSearchParams();
    if (experimentId) params.append('experimentId', experimentId);

    const res = await apiClient.get(`/viva/lab/${labId}?${params.toString()}`);
    return res.data || res;
  },

  /**
   * Get single viva evaluation record
   */
  getVivaById: async (vivaId) => {
    const res = await apiClient.get(`/viva/${vivaId}`);
    return res.data || res;
  }
};
