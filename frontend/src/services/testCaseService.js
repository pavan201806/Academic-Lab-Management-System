import apiClient from './api';

export const testCaseService = {
  /**
   * Get test cases for an experiment
   * Students only receive visible test cases without input/expectedOutput of hidden cases.
   * Faculty/Admin receive all test cases with full configurations.
   */
  getTestCasesForExperiment: async (experimentId) => {
    const res = await apiClient.get(`/test-cases/experiment/${experimentId}`);
    return res.data || res;
  },

  /**
   * Get single test case details by ID
   */
  getTestCaseById: async (testCaseId) => {
    const res = await apiClient.get(`/test-cases/${testCaseId}`);
    return res.data || res;
  },

  /**
   * Create a new test case (Faculty / Admin only)
   */
  createTestCase: async (payload) => {
    const res = await apiClient.post('/test-cases', payload);
    return res.data || res;
  },

  /**
   * Update an existing test case (Faculty / Admin only)
   */
  updateTestCase: async (testCaseId, payload) => {
    const res = await apiClient.put(`/test-cases/${testCaseId}`, payload);
    return res.data || res;
  },

  /**
   * Deactivate a test case (Soft delete)
   */
  deactivateTestCase: async (testCaseId) => {
    const res = await apiClient.patch(`/test-cases/${testCaseId}/status`, { active: false });
    return res.data || res;
  },

  /**
   * Reorder test cases for an experiment
   */
  reorderTestCases: async (experimentId, orders) => {
    const res = await apiClient.put('/test-cases/order', { experimentId, orders });
    return res.data || res;
  }
};
