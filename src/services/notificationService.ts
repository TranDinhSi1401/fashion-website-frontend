import apiClient from './apiClient';
import { ApiResponse } from '../types/api';
import { NotificationPageResponse } from '../types/realtime';

export const notificationService = {
  async getMyNotifications(page = 0, size = 20): Promise<ApiResponse<NotificationPageResponse>> {
    const res = await apiClient.get<ApiResponse<NotificationPageResponse>>('/notifications', {
      params: { page, size },
    });
    return res.data;
  },

  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    const res = await apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    return res.data;
  },

  async markAsRead(id: number): Promise<ApiResponse<null>> {
    const res = await apiClient.patch<ApiResponse<null>>(`/notifications/${id}/read`);
    return res.data;
  },

  async markAllAsRead(): Promise<ApiResponse<null>> {
    const res = await apiClient.patch<ApiResponse<null>>('/notifications/read-all');
    return res.data;
  },
};
