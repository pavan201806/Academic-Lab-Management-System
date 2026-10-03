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
  }
};
