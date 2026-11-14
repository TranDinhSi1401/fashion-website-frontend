import apiClient from './apiClient';
import { ApiResponse } from '../types/api';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'SYSTEM_CANCELED'
  | 'RETURNED';

export interface OrderResponse {
  id: number;
  orderCode: string;
  userId: number;
  shippingRecipientName: string;
  shippingPhone: string;
  shippingAddress: string;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  orderStatus: OrderStatus;
  deliveredAt?: string | null;
  paymentStatus: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderCreationRequest {
  userAddressId: number;
  paymentMethodId: number;
}

export const orderService = {
  async getAllOrders(): Promise<ApiResponse<OrderResponse[]>> {
    const res = await apiClient.get<ApiResponse<OrderResponse[]>>('/orders');
    return res.data;
  },

  async getMyOrders(): Promise<ApiResponse<OrderResponse[]>> {
    const res = await apiClient.get<ApiResponse<OrderResponse[]>>('/orders/my-orders');
    return res.data;
  },

  async createOrder(request: OrderCreationRequest): Promise<ApiResponse<OrderResponse>> {
    const res = await apiClient.post<ApiResponse<OrderResponse>>('/orders', request);
    return res.data;
  },

  async updateOrderStatus(orderId: number, status: OrderStatus): Promise<ApiResponse<OrderResponse>> {
    const res = await apiClient.patch<ApiResponse<OrderResponse>>(`/orders/${orderId}/status`, {
      status,
    });
    return res.data;
  },
};
