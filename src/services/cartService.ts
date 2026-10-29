import apiClient from './apiClient';
import { ApiResponse } from '../types/api';
import { CartResponse } from '../types/cart';

export const cartService = {
  async getCart(signal?: AbortSignal): Promise<CartResponse> {
    return (await apiClient.get<ApiResponse<CartResponse>>('/cart', { signal })).data.data;
  },
  async addItem(variantId: number, quantity: number): Promise<CartResponse> {
    return (await apiClient.post<ApiResponse<CartResponse>>('/cart/items', { variantId, quantity })).data.data;
  },
  async updateItem(itemId: number, quantity: number): Promise<CartResponse> {
    return (await apiClient.put<ApiResponse<CartResponse>>(`/cart/items/${itemId}`, { quantity })).data.data;
  },
  async removeItem(itemId: number): Promise<CartResponse> {
    return (await apiClient.delete<ApiResponse<CartResponse>>(`/cart/items/${itemId}`)).data.data;
  },
  async clear(): Promise<CartResponse> {
    return (await apiClient.delete<ApiResponse<CartResponse>>('/cart/items')).data.data;
  },
};
