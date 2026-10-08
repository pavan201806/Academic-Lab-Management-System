import apiClient from './api';

export const labService = {
  getLabs: async (filter = {}) => {
    const params = new URLSearchParams();
    if (filter.active !== undefined) params.append('active', filter.active);
    if (filter.academicYear) params.append('academicYear', filter.academicYear);
    if (filter.semester) params.append('semester', filter.semester);
    if (filter.department) params.append('department', filter.department);
    if (filter.search) params.append('search', filter.search);

    const res = await apiClient.get(`/labs?${params.toString()}`);
    return res.data || res;
  },

  getAssignedLabs: async () => {
    const res = await apiClient.get('/labs/assigned');
    return res.data || res;
  },

  getLabById: async (id, sectionId = null) => {
    const url = sectionId ? `/labs/${id}?sectionId=${sectionId}` : `/labs/${id}`;
    const res = await apiClient.get(url);
    return res.data || res;
  },

  createLab: async (data) => {
    const res = await apiClient.post('/labs', data);
    return res.data || res;
  },

  updateLab: async (id, data) => {
    const res = await apiClient.put(`/labs/${id}`, data);
    return res.data || res;
  },

  toggleActive: async (id, active) => {
    const res = await apiClient.patch(`/labs/${id}/status`, { active });
    return res.data || res;
  },

  getLabDeletionStatus: async (id) => {
    const res = await apiClient.get(`/labs/${id}/deletion-status`);
    return res.data || res;
  },

  deleteLab: async (id) => {
    const res = await apiClient.delete(`/labs/${id}`);
    return res.data || res;
  },

  getLabStudentsPerformance: async (id, filter = {}) => {
    const params = new URLSearchParams();
    if (filter.sectionId) params.append('sectionId', filter.sectionId);
    if (filter.section) params.append('section', filter.section);
    if (filter.search) params.append('search', filter.search);
    if (filter.active !== undefined) params.append('active', filter.active);

    const queryString = params.toString();
    const url = queryString ? `/labs/${id}/students/performance?${queryString}` : `/labs/${id}/students/performance`;
    const res = await apiClient.get(url);
    return res.data || res;
  },

  getLabExperimentMarksMatrix: async (id, filter = {}) => {
    const params = new URLSearchParams();
    if (filter.sectionId) params.append('sectionId', filter.sectionId);
    if (filter.section) params.append('section', filter.section);
    if (filter.search) params.append('search', filter.search);
    if (filter.active !== undefined) params.append('active', filter.active);

    const queryString = params.toString();
    const url = queryString ? `/labs/${id}/marks-matrix?${queryString}` : `/labs/${id}/marks-matrix`;
    const res = await apiClient.get(url);
    return res.data || res;
  },

  getStudentLabPerformanceDetail: async (labId, studentId) => {
    const res = await apiClient.get(`/labs/${labId}/students/${studentId}/performance`);
    return res.data || res;
  }
};
