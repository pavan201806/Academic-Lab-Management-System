import apiClient from './api';

export const sectionService = {
  getSections: async (filter = {}) => {
    const params = new URLSearchParams();
    if (filter.active !== undefined) params.append('active', filter.active);
    if (filter.academicYear) params.append('academicYear', filter.academicYear);
    if (filter.semester) params.append('semester', filter.semester);
    if (filter.department) params.append('department', filter.department);
    if (filter.search) params.append('search', filter.search);

    const res = await apiClient.get(`/sections?${params.toString()}`);
    return res.data || res;
  },

  getSectionById: async (id) => {
    const res = await apiClient.get(`/sections/${id}`);
    return res.data || res;
  },

  createSection: async (data) => {
    const res = await apiClient.post('/sections', data);
    return res.data || res;
  },

  updateSection: async (id, data) => {
    const res = await apiClient.put(`/sections/${id}`, data);
    return res.data || res;
  },

  toggleActive: async (id, active) => {
    const res = await apiClient.patch(`/sections/${id}/status`, { active });
    return res.data || res;
  },

  getSectionStudents: async (sectionCode) => {
    const res = await apiClient.get(`/sections/${encodeURIComponent(sectionCode)}/students`);
    return res.data || res;
  },

  assignStudent: async (studentId, sectionCode) => {
    const res = await apiClient.post('/sections/assign-student', { studentId, sectionCode });
    return res.data || res;
  },

  deleteSection: async (id) => {
    const res = await apiClient.delete(`/sections/${id}`);
    return res.data || res;
  }
};
