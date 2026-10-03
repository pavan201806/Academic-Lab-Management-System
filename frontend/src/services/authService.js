import apiClient from './api';

export const authService = {
  /**
   * Log in user with roll number / username and password
   */
  login: async (rollNumber, password) => {
    const res = await apiClient.post('/auth/login', { rollNumber, password });
    return res.data || res;
  },

  /**
   * Change current/temporary password
   */
  changePassword: async (currentPassword, newPassword, confirmPassword) => {
    const res = await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword
    });
    return res.data || res;
  },

  /**
   * Fetch currently authenticated user profile
   */
  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data || res;
  },

  /**
   * Inform backend of logout
   */
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Stateless logout doesn't depend on backend success
    }
  }
};
