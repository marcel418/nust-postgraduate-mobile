// src/api/notificationsApi.js

import { api } from './http';

function unwrapItems(response) {
  return response?.data?.items || response?.items || [];
}

export const notificationsApi = {
  list: async () => {
    const response = await api.get('/notifications');
    return response;
  },

  getAll: async () => {
    const response = await api.get('/notifications');
    return unwrapItems(response);
  },

  getUnreadCount: async () => {
    const response = await api.get('/notifications');
    const items = unwrapItems(response);

    return items.filter((item) => !item.read_at && !item.read).length;
  },

  markAsRead: async (notificationId) => {
    if (!notificationId) {
      throw new Error('Notification ID is required.');
    }

    return api.post(`/notifications/${notificationId}/read`);
  },
};

export async function getNotifications() {
  return notificationsApi.getAll();
}

export async function markNotificationAsRead(notificationId) {
  return notificationsApi.markAsRead(notificationId);
}

export default notificationsApi;