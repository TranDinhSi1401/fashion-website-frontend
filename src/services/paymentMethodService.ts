import apiClient from './apiClient';
import { ApiResponse } from '../types/api';

export interface PaymentMethodResponse {
  id: number;
  code: string;
  name: string;
  description: string;
  iconUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const paymentMethodService = {
  async getPaymentMethods(): Promise<ApiResponse<PaymentMethodResponse[]>> {
    const response = await apiClient.get<ApiResponse<PaymentMethodResponse[]>>(
      '/paymentMethods'
    );
    return response.data;
  },
};
