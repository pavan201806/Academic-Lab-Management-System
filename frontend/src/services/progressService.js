import api from './api';

export const progressService = {
  /**
   * Get student's overall progress across all assigned laboratories
   */
  async getStudentOverallProgress() {
    const response = await api.get('/progress/student');
    return response.data;
  },

  /**
   * Get student's detailed progress for a single enrolled laboratory
   */
  async getStudentLabProgress(labId) {
    const response = await api.get(`/progress/student/lab/${labId}`);
    return response.data;
  },

  /**
   * Get laboratory cohort progress for teachers and admin
   */
  async getLabCohortProgress(labId, sectionId = null) {
    const params = sectionId ? { sectionId } : {};
    const response = await api.get(`/progress/lab/${labId}`, { params });
    return response.data;
  },

  /**
   * Get single student detailed progress for a teacher / admin
   */
  async getStudentProgressForTeacher(labId, studentId) {
    const response = await api.get(`/progress/lab/${labId}/student/${studentId}`);
    return response.data;
  }
};
