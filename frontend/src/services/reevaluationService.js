import apiClient from './api';

export const reevaluationService = {
  /**
   * Student requests a re-evaluation for their completed viva
   */
  requestReevaluation: async ({ experimentId, reason }) => {
    const res = await apiClient.post('/reevaluations/request', {
      experimentId,
      reason
    });
    return res.data || res;
  },

  /**
   * Student retrieves their latest re-evaluation request for an experiment
   */
  getMyRequest: async (experimentId) => {
    const res = await apiClient.get(`/reevaluations/experiment/${experimentId}/my-request`);
    return res.data || res;
  },

  /**
   * Get all re-evaluation requests for a laboratory (Teacher / Admin)
   */
  getLabRequests: async (labId, experimentId) => {
    const params = new URLSearchParams();
    if (experimentId) params.append('experimentId', experimentId);

    const res = await apiClient.get(`/reevaluations/lab/${labId}?${params.toString()}`);
    return res.data || res;
  },

  /**
   * Get single re-evaluation request details
   */
  getRequestById: async (requestId) => {
    const res = await apiClient.get(`/reevaluations/${requestId}`);
    return res.data || res;
  },

  /**
   * Faculty processes (Approve & re-evaluate or Reject) a re-evaluation request
   */
  processRequest: async (requestId, { action, reviewRemarks, marks, remarks }) => {
    const res = await apiClient.post(`/reevaluations/${requestId}/process`, {
      action,
      reviewRemarks,
      marks,
      remarks
    });
    return res.data || res;
  }
};
