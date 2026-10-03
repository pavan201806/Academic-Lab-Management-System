import apiClient from './api';

export const healthService = {
  checkHealth: async () => {
    return await apiClient.get('/health');
  }
};
