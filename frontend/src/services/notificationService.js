import api from './api';

export const notificationService = {
  /**
   * Get role-aware notifications
   */
  async getNotifications() {
    const response = await api.get('/notifications');
    return response.data;
  },

  /**
   * Get single notification by ID
   */
  async getNotificationById(id) {
    const response = await api.get(`/notifications/${id}`);
    return response.data;
  },

  /**
   * Create a new notification (Teacher / Admin)
   */
  async createNotification(data) {
    const response = await api.post('/notifications', data);
    return response.data;
  },

  /**
   * Mark a single notification as read (Student)
   */
  async markAsRead(id) {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  /**
   * Mark all targeted notifications as read (Student)
   */
  async markAllAsRead() {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },

  /**
   * Soft-delete a notification (Teacher / Admin)
   */
  async deleteNotification(id) {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  }
};
