import apiClient from './api';

export const experimentService = {
  getExperiments: async (labId, filter = {}) => {
    const params = new URLSearchParams();
    if (labId) params.append('labId', labId);
    if (filter.status) params.append('status', filter.status);
    if (filter.search) params.append('search', filter.search);

    const res = await apiClient.get(`/experiments?${params.toString()}`);
    return res.data || res;
  },

  getExperimentById: async (id) => {
    const res = await apiClient.get(`/experiments/${id}`);
    return res.data || res;
  },

  createExperiment: async (data) => {
    const res = await apiClient.post('/experiments', data);
    return res.data || res;
  },

  updateExperiment: async (id, data) => {
    const res = await apiClient.put(`/experiments/${id}`, data);
    return res.data || res;
  },

  publishExperiment: async (id) => {
    const res = await apiClient.post(`/experiments/${id}/publish`);
    return res.data || res;
  },

  scheduleExperiment: async (id, scheduledAt, deadline) => {
    const res = await apiClient.post(`/experiments/${id}/schedule`, { scheduledAt, deadline });
    return res.data || res;
  },

  reopenExperiment: async (id, reopenedUntil) => {
    const res = await apiClient.post(`/experiments/${id}/reopen`, { reopenedUntil });
    return res.data || res;
  },

  closeExperiment: async (id) => {
    const res = await apiClient.post(`/experiments/${id}/close`);
    return res.data || res;
  },

  reorderExperiments: async (labId, orders) => {
    const res = await apiClient.put('/experiments/reorder/batch', { labId, orders });
    return res.data || res;
  },

  toggleActive: async (id, active) => {
    const res = await apiClient.patch(`/experiments/${id}/status`, { active });
    return res.data || res;
  },

  extractFromPdf: async (labId, pdfFile) => {
    const formData = new FormData();
    formData.append('labId', labId);
    formData.append('pdf', pdfFile);

    const res = await apiClient.post('/experiments/extract-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data || res;
  },

  confirmPdfExperiments: async (labId, experiments) => {
    const res = await apiClient.post('/experiments/confirm-pdf', { labId, experiments });
    return res.data || res;
  }
};
