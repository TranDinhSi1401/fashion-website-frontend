/**
 * Hàm thuần kiểm tra điều kiện đánh giá sản phẩm cho đơn hàng tại "Đơn hàng của tôi".
 *
 * Điều kiện hợp lệ:
 * 1. Đơn hàng ở trạng thái DELIVERED (Đã giao hàng).
 * 2. Đơn hàng ở trạng thái thanh toán PAID (Đã thanh toán).
 * 3. Có thời điểm giao hàng deliveredAt hợp lệ, không nằm ở tương lai, và thời điểm hiện tại
 *    không vượt quá deliveredAt + 14 ngày dương lịch (14 * 24 giờ).
 */

export const REVIEW_WINDOW_DAYS = 14;
export const REVIEW_WINDOW_MS = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export function isOrderEligibleForReview(
  order?: {
    orderStatus?: string | null;
    paymentStatus?: string | null;
    deliveredAt?: string | null;
  } | null,
  nowMs?: number
): boolean {
  if (!order) {
    return false;
  }

  if (order.orderStatus !== 'DELIVERED') {
    return false;
  }

  if (order.paymentStatus !== 'PAID') {
    return false;
  }

  if (!order.deliveredAt || typeof order.deliveredAt !== 'string' || order.deliveredAt.trim() === '') {
    return false;
  }

  const deliveredTimestamp = new Date(order.deliveredAt).getTime();
  if (Number.isNaN(deliveredTimestamp)) {
    return false;
  }

  const currentMs = typeof nowMs === 'number' ? nowMs : Date.now();
  if (deliveredTimestamp > currentMs) {
    return false;
  }

  return currentMs <= deliveredTimestamp + REVIEW_WINDOW_MS;
}
