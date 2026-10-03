import apiClient from './api';

export const adminDashboardService = {
  getFullDashboard: async (params = {}) => {
    return await apiClient.get('/admin/dashboard', { params });
  },

  getStatistics: async (params = {}) => {
    return await apiClient.get('/admin/dashboard/statistics', { params });
  },

  getStudentsOverview: async (params = {}) => {
    return await apiClient.get('/admin/dashboard/students', { params });
  },

  getTeachersOverview: async (params = {}) => {
    return await apiClient.get('/admin/dashboard/teachers', { params });
  },

  getLabsOverview: async (params = {}) => {
    return await apiClient.get('/admin/dashboard/labs', { params });
  },

  getSectionsOverview: async (params = {}) => {
    return await apiClient.get('/admin/dashboard/sections', { params });
  },

  getActivityFeed: async (limit = 15) => {
    return await apiClient.get('/admin/dashboard/activity', { params: { limit } });
  },

  getPerformanceOverview: async (params = {}) => {
    return await apiClient.get('/admin/dashboard/performance', { params });
  }
};
