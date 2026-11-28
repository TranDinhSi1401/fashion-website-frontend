/**
 * Module định nghĩa các kiểu dữ liệu (TypeScript types & interfaces) cho phân hệ Đơn hàng (Orders).
 * Cung cấp cấu trúc phản hồi từ Backend Order API và kiểu mở rộng OrderWithItems hỗ trợ adapter fallback.
 */

/**
 * Trạng thái vòng đời của một đơn hàng trong hệ thống.
 */
export type OrderStatus =
  | 'PENDING'
  | 'PENDING_PAYMENT'
  | 'PROCESSING'
  | 'CONFIRMED'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'SYSTEM_CANCELED'
  | 'RETURNED'
  | 'COMPLETED';

/**
 * Trạng thái thanh toán của đơn hàng.
 */
export type PaymentStatus =
  | 'PENDING'
  | 'PENDING_COD'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED';

/**
 * Cấu trúc dữ liệu chi tiết một dòng sản phẩm trong đơn hàng (Order Item).
 */
export interface OrderItemResponse {
  /** Mã định danh dòng chi tiết đơn hàng (ID dùng để liên kết orderItemId khi trả hàng) */
  id: number;
  /** Mã đơn hàng chứa dòng sản phẩm này */
  orderId: number;
  /** Mã định danh biến thể sản phẩm */
  productVariantId: number;
  /** Tên sản phẩm hiển thị */
  productName: string;
  /** Thông tin mô tả biến thể (kích thước, màu sắc...) */
  variantInfo?: string;
  /** Đơn giá gốc trước khi giảm (VND) */
  originalPrice?: number;
  /** Đơn giá bán thực tế của sản phẩm (VND) */
  unitPrice: number;
  /** Số lượng sản phẩm khách đã mua */
  quantity: number;
  /** Tổng tiền của dòng sản phẩm (unitPrice * quantity) */
  totalPrice: number;
  /** Đường dẫn ảnh đại diện của sản phẩm */
  imageUrl?: string;
  /** Số lượng đã gửi trả / đã hoàn ở các phiếu hợp lệ trước đó */
  returnedQuantity?: number;
  /** Số lượng tối đa còn lại có thể trả cho dòng sản phẩm này */
  remainingReturnableQuantity?: number;
  /** Thời điểm tạo dòng chi tiết đơn */
  createdAt?: string;
  /** Thời điểm cập nhật gần nhất */
  updatedAt?: string;
}

/**
 * Cấu trúc dữ liệu đối tượng đơn hàng trả về từ Backend (GET /api/v1/orders/my-orders).
 */
export interface OrderResponse {
  /** Mã định danh đơn hàng */
  id: number;
  /** Mã đơn hàng hiển thị (ví dụ: ORD-20261115-001) */
  orderCode: string;
  /** Mã người dùng đặt đơn */
  userId: number;
  /** Họ tên người nhận hàng */
  shippingRecipientName: string;
  /** Số điện thoại người nhận hàng */
  shippingPhone: string;
  /** Địa chỉ chi tiết nhận hàng */
  shippingAddress: string;
  /** Tổng tiền hàng trước khi cộng ship và trừ voucher (VND) */
  subtotal: number;
  /** Phí vận chuyển đơn hàng (VND) */
  shippingFee: number;
  /** Số tiền giảm giá qua voucher/khuyến mãi (VND) */
  discountAmount?: number;
  /** Loại ưu đãi hóa đơn áp dụng ('VOUCHER' | 'OFFER') */
  discountType?: 'VOUCHER' | 'OFFER' | string | null;
  /** Mã voucher hoặc tên chương trình khuyến mãi đã áp dụng */
  discountCode?: string | null;
  /** Tổng số tiền thanh toán cuối cùng của đơn hàng (VND) */
  totalAmount: number;
  /** Trạng thái hiện tại của đơn hàng */
  orderStatus: OrderStatus | string;
  /** Thời điểm đơn hàng được giao thành công tới tay khách (mốc tính hạn 7 ngày trả hàng) */
  deliveredAt?: string | null;
  /** Cờ đơn hàng có hợp lệ để tạo phiếu trả hàng hay không (đã giao, trong hạn 7 ngày và còn sản phẩm trả được) */
  returnEligible?: boolean;
  /** Mốc hết hạn 7 ngày trả hàng (deliveredAt + 7 ngày) */
  returnDeadlineAt?: string | null;
  /** Thời điểm giao hàng dự kiến do đơn vị vận chuyển cung cấp */
  expectedDeliveryTime?: string | null;
  /** Trạng thái thanh toán của đơn hàng */
  paymentStatus: PaymentStatus | string;
  paymentMethodId?: number | null;
  paymentMethodCode?: string | null;
  paymentMethodName?: string | null;
  paymentMethod?: {
    id?: number;
    code?: string;
    name?: string;
  } | null;
  /** Ghi chú đơn hàng của khách */
  notes?: string | null;
  /** Mã vận đơn dùng để theo dõi đơn hàng */
  trackingCode?: string | null;
  /** Thời điểm tạo đơn hàng (ISO 8601) */
  createdAt: string;
  /** Thời điểm cập nhật đơn hàng gần nhất (ISO 8601) */
  updatedAt: string;
  /** Danh sách sản phẩm trong đơn (có thể rỗng hoặc undefined từ backend API gốc) */
  orderItems?: OrderItemResponse[];
}

/**
 * Cấu trúc đơn hàng mở rộng đảm bảo luôn có danh sách sản phẩm `orderItems`
 * phục vụ việc chọn sản phẩm trả hàng tại màn C1 và C2.
 */
export interface OrderWithItems extends OrderResponse {
  /** Danh sách sản phẩm chi tiết luôn được đảm bảo (thực tế hoặc fallback mock) */
  orderItems: OrderItemResponse[];
  /** Cờ đánh dấu dữ liệu orderItems đang sử dụng danh sách mẫu fallback do Backend chưa trả về */
  isMockItems?: boolean;
}
