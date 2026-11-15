import apiClient from './apiClient';
import { ApiResponse } from '../types/api';
import { ChatMessageResponse } from '../types/realtime';

export const chatService = {
  async getMyHistory(): Promise<ApiResponse<ChatMessageResponse[]>> {
    const res = await apiClient.get<ApiResponse<ChatMessageResponse[]>>('/chat/history');
    return res.data;
  },

  async uploadChatImage(file: File): Promise<ApiResponse<string>> {
    const formData = new FormData();
    formData.append('image', file);
    const res = await apiClient.post<ApiResponse<string>>('/chat/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  async getConversations(): Promise<ApiResponse<string[]>> {
    const res = await apiClient.get<ApiResponse<string[]>>('/admin/chat/conversations');
    return res.data;
  },

  async getCustomerHistory(username: string): Promise<ApiResponse<ChatMessageResponse[]>> {
    const res = await apiClient.get<ApiResponse<ChatMessageResponse[]>>(
      `/admin/chat/${encodeURIComponent(username)}`
    );
    return res.data;
  },
};
