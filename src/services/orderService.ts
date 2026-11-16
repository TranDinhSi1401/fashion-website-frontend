/**
 * Module dịch vụ xử lý dữ liệu Đơn hàng (Order Service).
 * Tích hợp Adapter normalizeOrderWithItems() tự động fallback tạo danh sách sản phẩm mẫu (isMockItems: true)
 * khi API Backend (GET /api/v1/orders/my-orders) chưa trả về mảng orderItems.
 */

import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type { OrderResponse, OrderWithItems } from '../types/order';
import { normalizeOrderWithItems } from '../utils/returnHelpers';

export { normalizeOrderWithItems } from '../utils/returnHelpers';

/**
 * Đối tượng orderService cung cấp các hàm gọi API đơn hàng phục vụ luồng Trả hàng & Hoàn tiền.
 */
export const orderService = {
  /**
   * Chức năng: Lấy danh sách đơn hàng của khách hàng đang đăng nhập kèm chuẩn hóa mảng orderItems.
   *
   * @returns Đầu ra: Promise danh sách OrderWithItems[].
   */
  async getMyOrders(): Promise<OrderWithItems[]> {
    const response = await apiClient.get<ApiResponse<OrderResponse[]>>('/orders/my-orders');
    const rawOrders = response.data?.data || [];
    // Tự động chuẩn hóa từng đơn hàng qua adapter fallback
    return rawOrders.map((order) => normalizeOrderWithItems(order));
  },

  /**
   * Chức năng: Lấy thông tin chi tiết một đơn hàng theo mã ID (phục vụ màn C2 khi mở bằng link trực tiếp ?orderId=).
   *
   * @param id Đầu vào: Mã ID đơn hàng cần lấy.
   * @returns Đầu ra: Promise đơn hàng OrderWithItems.
   */
  async getOrderById(id: number): Promise<OrderWithItems> {
    try {
      const response = await apiClient.get<ApiResponse<OrderResponse>>(`/orders/${id}`);
      if (response.data?.data) {
        return normalizeOrderWithItems(response.data.data);
      }
    } catch {
      // Nếu API getOrderById bị giới hạn role admin/staff, fallback tìm trong danh sách my-orders
      const myOrders = await orderService.getMyOrders();
      const found = myOrders.find((o) => Number(o.id) === Number(id));
      if (found) {
        return found;
      }
    }
    throw new Error(`Không tìm thấy đơn hàng với mã ID ${id}.`);
  },
};

export default orderService;
