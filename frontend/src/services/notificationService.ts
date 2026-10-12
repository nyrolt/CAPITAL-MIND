import { NotificationItem } from '../types';
import { apiClient } from './apiClient';

export const notificationService = {
  async getNotifications(): Promise<NotificationItem[]> {
    try {
      return await apiClient.fetchNotifications();
    } catch {
      return [];
    }
  }
};


