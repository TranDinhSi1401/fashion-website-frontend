import apiClient from './apiClient';
import { ApiResponse } from '../types/api';
import type {
  OrderItemResponse as ReturnOrderItemResponse,
  OrderResponse as ReturnOrderResponse,
  OrderWithItems,
} from '../types/order';
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

export type PaymentStatus =
  | 'PENDING'
  | 'PENDING_COD'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED'
  | 'PARTIALLY_PAID'
  | 'REFUNDED';

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
  discountType?: 'VOUCHER' | 'OFFER' | string | null;
  discountCode?: string | null;
  totalAmount: number;
  orderStatus: OrderStatus;
  deliveredAt?: string | null;
  expectedDeliveryTime?: string | null;
  paymentStatus: string;
  paymentMethodId?: number | null;
  paymentMethodCode?: string | null;
  paymentMethodName?: string | null;
  paymentMethod?: {
    id?: number;
    code?: string;
    name?: string;
  } | null;
  paymentUrl?: string | null;
  notes?: string | null;
  trackingCode?: string | null;
  createdAt: string;
  updatedAt: string;
  orderItems?: ReturnOrderItemResponse[];
}

export interface OrdersPage {
  content: OrderResponse[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface OrderSearchFilters {
  page?: number;
  user_id?: number;
  order_code?: string;
  created_at?: string;
  order_status?: OrderStatus;
  payment_status?: PaymentStatus;
}

export interface OrderCreationRequest {
  userAddressId: number;
  paymentMethodId: number;
  specialOfferId: number | null;
  voucherCode?: string;
  notes?: string;
}

export interface OrderOverviewStatistics {
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
  processingOrders: number;
  cancelledOrders: number;
}

export interface RevenueStatisticsPoint {
  label: string;
  revenue: number;
  orderCount: number;
}

export interface RevenueStatistics {
  period: 'day' | 'month' | 'year';
  from: string;
  to: string;
  totalRevenue: number;
  totalOrders: number;
  points: RevenueStatisticsPoint[];
}

export interface OrderStatusStatistics {
  totalOrders: number;
  counts: Record<'PENDING_PAYMENT' | 'PROCESSING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED' | 'RETURNED', number>;
}

export interface PaymentStatistics {
  totalOrders: number;
  paymentStatuses: Record<'PENDING' | 'PENDING_COD' | 'PAID' | 'FAILED' | 'REFUNDED', number>;
  paymentMethods: Record<string, number>;
}

export interface CancellationStatistics {
  totalOrders: number;
  cancelledOrders: number;
  cancellationRate: number;
}

export interface AverageOrderValueStatistics {
  eligibleOrders: number;
  averageOrderValue: number;
}

export interface OrderStatisticsRange {
  from?: string;
  to?: string;
}

export const orderService = {
  async searchOrders(filters: OrderSearchFilters = {}): Promise<ApiResponse<OrdersPage>> {
    const res = await apiClient.get<ApiResponse<OrdersPage>>('/orders', {
      params: filters,
    });
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
   * Lấy chi tiết một đơn hàng của chính khách hàng đang đăng nhập qua GET /orders/my-orders/{id}
   * (có fallback về danh sách /orders/my-orders nếu môi trường chưa mở endpoint lẻ).
   *
   * @param id Đầu vào: Mã ID đơn hàng cần tìm.
   * @returns Đầu ra: Promise đơn hàng OrderWithItems kèm orderItems, returnEligible và remainingReturnableQuantity từ Backend.
   */
  async getMyOrderById(id: number): Promise<OrderWithItems> {
    try {
      const response = await apiClient.get<ApiResponse<ReturnOrderResponse>>(`/orders/my-orders/${id}`);
      if (response.data?.data) {
        return normalizeOrderWithItems(response.data.data);
      }
    } catch (err: any) {
      if (err?.response?.status === 403 || err?.response?.status === 404) {
        throw err;
      }
    }
    const myOrders = await orderService.getMyOrders();
    const found = myOrders.find((o) => Number(o.id) === Number(id));
    if (found) {
      return found;
    }
    throw new Error(`Không tìm thấy đơn hàng với mã ID ${id}.`);
  },

  /**
   * Lấy thông tin chi tiết một đơn hàng theo mã ID (dành cho ADMIN/STAFF gọi GET /orders/{id},
   * có fallback về my-orders nếu gọi thất bại).
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

  async getOrderOverviewStatistics(range: OrderStatisticsRange = {}, signal?: AbortSignal): Promise<OrderOverviewStatistics> {
    const res = await apiClient.get<ApiResponse<OrderOverviewStatistics>>('/orders/statistics/overview', { params: range, signal });
    return res.data.data;
  },

  async getOrderRevenueStatistics(period: 'day' | 'month' | 'year', range: OrderStatisticsRange = {}, signal?: AbortSignal): Promise<RevenueStatistics> {
    const res = await apiClient.get<ApiResponse<RevenueStatistics>>('/orders/statistics/revenue', { params: { period, ...range }, signal });
    return res.data.data;
  },

  async getOrderStatusStatistics(range: OrderStatisticsRange = {}, signal?: AbortSignal): Promise<OrderStatusStatistics> {
    const res = await apiClient.get<ApiResponse<OrderStatusStatistics>>('/orders/statistics/status', { params: range, signal });
    return res.data.data;
  },

  async getPaymentStatistics(range: OrderStatisticsRange = {}, signal?: AbortSignal): Promise<PaymentStatistics> {
    const res = await apiClient.get<ApiResponse<PaymentStatistics>>('/orders/statistics/payment-status', { params: range, signal });
    return res.data.data;
  },

  async getCancellationStatistics(range: OrderStatisticsRange = {}, signal?: AbortSignal): Promise<CancellationStatistics> {
    const res = await apiClient.get<ApiResponse<CancellationStatistics>>('/orders/statistics/cancellation-rate', { params: range, signal });
    return res.data.data;
  },

  async getAverageOrderValueStatistics(range: OrderStatisticsRange = {}, signal?: AbortSignal): Promise<AverageOrderValueStatistics> {
    const res = await apiClient.get<ApiResponse<AverageOrderValueStatistics>>('/orders/statistics/average-order-value', { params: range, signal });
    return res.data.data;
  },
};

export default orderService;
