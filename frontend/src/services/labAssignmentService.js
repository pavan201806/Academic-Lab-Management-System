import apiClient from './api';

export const labAssignmentService = {
  getAssignments: async (filter = {}) => {
    const params = new URLSearchParams();
    if (filter.active !== undefined) params.append('active', filter.active);
    if (filter.lab) params.append('lab', filter.lab);
    if (filter.section) params.append('section', filter.section);
    if (filter.teacher) params.append('teacher', filter.teacher);
    if (filter.assignmentType) params.append('assignmentType', filter.assignmentType);

    const res = await apiClient.get(`/lab-assignments?${params.toString()}`);
    return res.data || res;
  },

  getAssignmentById: async (id) => {
    const res = await apiClient.get(`/lab-assignments/${id}`);
    return res.data || res;
  },

  createAssignment: async (data) => {
    const res = await apiClient.post('/lab-assignments', data);
    return res.data || res;
  },

  toggleActive: async (id, active) => {
    const res = await apiClient.patch(`/lab-assignments/${id}/status`, { active });
    return res.data || res;
  },

  getLabAssignments: async (labId) => {
    const res = await apiClient.get(`/lab-assignments/lab/${labId}`);
    return res.data || res;
  },

  getTeacherAssignments: async (teacherId) => {
    const res = await apiClient.get(`/lab-assignments/teacher/${teacherId}`);
    return res.data || res;
  }
};
