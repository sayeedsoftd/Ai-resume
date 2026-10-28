import api from './api';

export const notificationService = {
  async getNotifications() {
    const response = await api.get('/notifications/');
    return response.data;
  },

  async markAsRead(notificationId) {
    if (!notificationId) return null;
    try {
      const response = await api.patch(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (err) {
      try {
        const fallback = await api.post(`/notifications/${notificationId}/read`);
        return fallback.data;
      } catch (fallbackErr) {
        // Silently resolve if notification was a client-side generated temporary toast
        return null;
      }
    }
  },

  async sendBroadcast(data) {
    const response = await api.post('/notifications/broadcast', data);
    return response.data;
  },
};

