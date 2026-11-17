import apiClient from './apiClient';
import { ApiResponse } from '../types/api';
import type { OrderResponse as ReturnOrderResponse, OrderWithItems } from '../types/order';
import { normalizeOrderWithItems } from '../utils/returnHelpers';

export { normalizeOrderWithItems } from '../utils/returnHelpers';

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
  paymentUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderCreationRequest {
  userAddressId: number;
  paymentMethodId: number;
  specialOfferId: number | null;
  notes?: string;
}

export const orderService = {
  async getAllOrders(): Promise<ApiResponse<OrderResponse[]>> {
    const res = await apiClient.get<ApiResponse<OrderResponse[]>>('/orders');
    return res.data;
  },

  /**
   * Lấy danh sách đơn hàng của khách hàng đang đăng nhập kèm chuẩn hóa mảng orderItems.
   */
  async getMyOrders(): Promise<OrderWithItems[]> {
    const response = await apiClient.get<ApiResponse<ReturnOrderResponse[]>>('/orders/my-orders');
    const rawOrders = response.data?.data || [];
    return rawOrders.map((order) => normalizeOrderWithItems(order));
  },

  /**
   * Lấy thông tin chi tiết một đơn hàng theo mã ID (phục vụ màn C2 khi mở bằng link trực tiếp ?orderId=).
   */
  async getOrderById(id: number): Promise<OrderWithItems> {
    try {
      const response = await apiClient.get<ApiResponse<ReturnOrderResponse>>(`/orders/${id}`);
      if (response.data?.data) {
        return normalizeOrderWithItems(response.data.data);
      }
    } catch {
      const myOrders = await orderService.getMyOrders();
      const found = myOrders.find((o) => Number(o.id) === Number(id));
      if (found) {
        return found;
      }
    }
    throw new Error(`Không tìm thấy đơn hàng với mã ID ${id}.`);
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

export default orderService;
