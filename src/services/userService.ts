import apiClient from './apiClient';
import { ApiResponse } from '../types/api';
import {
  UserResponse,
  UserAddressResponse,
  UserAddressRequest,
  ChangePasswordRequest,
  UpdateUserRequest,
} from '../types/user';

export const userService = {
  // Current user endpoints
  async getCurrentUser(): Promise<ApiResponse<UserResponse>> {
    const res = await apiClient.get<ApiResponse<UserResponse>>('/users/info');
    return res.data;
  },

  async updateCurrentUser(data: UpdateUserRequest | FormData): Promise<ApiResponse<UserResponse>> {
    if (data instanceof FormData) {
      const res = await apiClient.put<ApiResponse<UserResponse>>('/users/info', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    }
    const res = await apiClient.put<ApiResponse<UserResponse>>('/users/info', data);
    return res.data;
  },

  async changePassword(data: ChangePasswordRequest): Promise<ApiResponse<null>> {
    const res = await apiClient.put<ApiResponse<null>>('/users/change-password', data);
    return res.data;
  },

  async uploadAvatar(file: File): Promise<ApiResponse<UserResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ApiResponse<UserResponse>>('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async deleteAvatar(): Promise<ApiResponse<UserResponse>> {
    const res = await apiClient.delete<ApiResponse<UserResponse>>('/users/avatar');
    return res.data;
  },

  // Address book endpoints
  async getAddresses(): Promise<ApiResponse<UserAddressResponse[]>> {
    const res = await apiClient.get<ApiResponse<UserAddressResponse[]>>('/users/addresses');
    return res.data;
  },

  async getAddressById(id: number): Promise<ApiResponse<UserAddressResponse>> {
    const res = await apiClient.get<ApiResponse<UserAddressResponse>>(`/users/addresses/${id}`);
    return res.data;
  },

  async createAddress(data: UserAddressRequest): Promise<ApiResponse<UserAddressResponse>> {
    const res = await apiClient.post<ApiResponse<UserAddressResponse>>('/users/addresses', data);
    return res.data;
  },

  async setDefaultAddress(id: number): Promise<ApiResponse<UserAddressResponse>> {
    const res = await apiClient.patch<ApiResponse<UserAddressResponse>>(`/users/addresses/${id}/default`);
    return res.data;
  },

  async updateAddress(id: number, data: UserAddressRequest): Promise<ApiResponse<UserAddressResponse>> {
    const res = await apiClient.put<ApiResponse<UserAddressResponse>>(`/users/addresses/${id}`, data);
    return res.data;
  },

  async deleteAddress(id: number): Promise<ApiResponse<null>> {
    const res = await apiClient.delete<ApiResponse<null>>(`/users/addresses/${id}`);
    return res.data;
  },

  // Admin / Staff user management
  async getAllUsers(): Promise<ApiResponse<UserResponse[]>> {
    const res = await apiClient.get<ApiResponse<UserResponse[]>>('/users');
    return res.data;
  },

  async getUserById(id: number): Promise<ApiResponse<UserResponse>> {
    const res = await apiClient.get<ApiResponse<UserResponse>>(`/users/${id}`);
    return res.data;
  },

  async createUser(data: any): Promise<ApiResponse<UserResponse>> {
    if (data instanceof FormData) {
      const res = await apiClient.post<ApiResponse<UserResponse>>('/users', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    }
    const res = await apiClient.post<ApiResponse<UserResponse>>('/users', data);
    return res.data;
  },

  async updateUser(id: number, data: any): Promise<ApiResponse<UserResponse>> {
    if (data instanceof FormData) {
      const res = await apiClient.put<ApiResponse<UserResponse>>(`/users/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    }
    const res = await apiClient.put<ApiResponse<UserResponse>>(`/users/${id}`, data);
    return res.data;
  },

  async deleteUser(id: number): Promise<ApiResponse<null>> {
    const res = await apiClient.delete<ApiResponse<null>>(`/users/${id}`);
    return res.data;
  },

  async getUserAddressesByAdmin(userId: number): Promise<ApiResponse<UserAddressResponse[]>> {
    const res = await apiClient.get<ApiResponse<UserAddressResponse[]>>(`/users/${userId}/addresses`);
    return res.data;
  },
};

