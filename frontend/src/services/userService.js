import apiClient from './api';

export const userService = {
  getUsers: async (filter = {}) => {
    const params = new URLSearchParams();
    if (filter.role) params.append('role', filter.role);
    if (filter.active !== undefined) params.append('active', filter.active);
    if (filter.section) params.append('section', filter.section);
    if (filter.search) params.append('search', filter.search);

    const res = await apiClient.get(`/users?${params.toString()}`);
    return res.data || res;
  },

  getUserById: async (id) => {
    const res = await apiClient.get(`/users/${id}`);
    return res.data || res;
  },

  createTeacher: async (data) => {
    const res = await apiClient.post('/users/teachers', data);
    return res.data || res;
  },

  createStudent: async (data) => {
    const res = await apiClient.post('/users/students', data);
    return res.data || res;
  },

  updateUser: async (id, data) => {
    const res = await apiClient.put(`/users/${id}`, data);
    return res.data || res;
  },

  resetPassword: async (id, temporaryPassword) => {
    const res = await apiClient.patch(`/users/${id}/reset-password`, { temporaryPassword });
    return res.data || res;
  },

  toggleActive: async (id, active) => {
    const res = await apiClient.patch(`/users/${id}/status`, { active });
    return res.data || res;
  },

  previewBulkEnrollment: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/users/bulk-import/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data || res;
  },

  importBulkStudents: async ({ records, defaultPassword, file }) => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      if (defaultPassword) formData.append('defaultPassword', defaultPassword);
      const res = await apiClient.post('/users/bulk-import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return res.data || res;
    }

    const res = await apiClient.post('/users/bulk-import', {
      records,
      defaultPassword
    });
    return res.data || res;
  },

  deleteStudent: async (id) => {
    const res = await apiClient.delete(`/users/students/${id}`);
    return res.data || res;
  },

  deleteTeacher: async (id) => {
    const res = await apiClient.delete(`/users/teachers/${id}`);
    return res.data || res;
  },

  deleteUser: async (id) => {
    const res = await apiClient.delete(`/users/${id}`);
    return res.data || res;
  },

  previewBulkDeleteStudents: async (studentIds) => {
    const res = await apiClient.post('/users/bulk-delete/preview', { studentIds });
    return res.data || res;
  },

  bulkDeleteStudents: async (studentIds) => {
    const res = await apiClient.post('/users/bulk-delete', { studentIds });
    return res.data || res;
  }
};



