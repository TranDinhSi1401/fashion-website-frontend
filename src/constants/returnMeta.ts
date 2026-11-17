/**
 * Module định nghĩa các hằng số siêu dữ liệu (Metadata) cho giao diện phân hệ Trả hàng & Hoàn tiền.
 * Bao gồm tên hiển thị tiếng Việt, biến thể Badge (phù hợp với src/components/ui/Badge.tsx),
 * mô tả tiến trình và danh mục lý do trả hàng.
 */

import type { ReturnReason, ReturnRequestStatus } from '../types/return.ts';

/**
 * Kiểu biến thể Badge tương thích với component src/components/ui/Badge.tsx.
 */
export type ReturnBadgeVariant =
  | 'warning'
  | 'dark'
  | 'vip'
  | 'new'
  | 'success'
  | 'error'
  | 'default';

/**
 * Cấu trúc thông tin siêu dữ liệu của một trạng thái phiếu trả hàng.
 */
export interface ReturnStatusMeta {
  /** Nhãn hiển thị tiếng Việt ngắn gọn */
  label: string;
  /** Mô tả chi tiết ý nghĩa của trạng thái */
  description: string;
  /** Biến thể Badge màu sắc theo Design System */
  badgeVariant: ReturnBadgeVariant;
  /** Số thứ tự bước trong tiến trình 6 bước (1..6) */
  stepIndex: number;
}

/**
 * Ánh xạ siêu dữ liệu cho 8 trạng thái vòng đời của phiếu trả hàng.
 * Phù hợp tuyệt đối với bảng thiết kế tại docs/RETURN_REFUND_FRONTEND_PLAN.md §4.1.
 */
export const RETURN_STATUS_META: Record<ReturnRequestStatus, ReturnStatusMeta> = {
  PENDING_APPROVAL: {
    label: 'Chờ duyệt',
    description: 'Yêu cầu vừa tạo, đang chờ nhân viên kiểm tra tính hợp lệ',
    badgeVariant: 'warning',
    stepIndex: 1,
  },
  WAITING_FOR_RETURN_DELIVERY: {
    label: 'Chờ nhận hàng trả',
    description: 'Yêu cầu đã được duyệt, chờ khách bàn giao hàng cho đơn vị vận chuyển',
    badgeVariant: 'dark',
    stepIndex: 2,
  },
  INSPECTING: {
    label: 'Đang kiểm tra hàng',
    description: 'Kiện hàng đã về đến kho, nhân viên kiểm định QC đang kiểm tra chất lượng',
    badgeVariant: 'vip',
    stepIndex: 3,
  },
  WAITING_CUSTOMER_FEEDBACK: {
    label: 'Chờ khách phản hồi',
    description: 'Kho đã có kết quả kiểm định, chờ khách xác nhận phương án hoặc bổ sung STK',
    badgeVariant: 'warning',
    stepIndex: 4,
  },
  WAITING_REFUND: {
    label: 'Chờ hoàn tiền',
    description: 'Đã hoàn tất kiểm tra và chốt phương án, chờ kế toán chuyển khoản',
    badgeVariant: 'new',
    stepIndex: 5,
  },
  REFUNDED: {
    label: 'Đã hoàn tiền',
    description: 'Kế toán đã chuyển khoản hoàn tiền thành công vào tài khoản khách hàng',
    badgeVariant: 'success',
    stepIndex: 6,
  },
  REJECTED: {
    label: 'Bị từ chối',
    description: 'Yêu cầu không đạt điều kiện hoặc sản phẩm gửi về bị từ chối nhận lại',
    badgeVariant: 'error',
    stepIndex: 6,
  },
  CANCELLED: {
    label: 'Đã hủy',
    description: 'Khách hàng đã chủ động hủy yêu cầu trước khi gửi hàng về kho',
    badgeVariant: 'default',
    stepIndex: 6,
  },
};

/**
 * Cấu trúc thông tin siêu dữ liệu của lý do trả hàng.
 */
export interface ReturnReasonMeta {
  /** Nhãn hiển thị tiếng Việt */
  label: string;
  /** Mô tả chi tiết điều kiện áp dụng lý do */
  description: string;
  /** Cờ yêu cầu bắt buộc phải đính kèm từ 1 đến 5 ảnh minh chứng */
  requiresImages: boolean;
  /** Khách hàng có phải tự chịu phí vận chuyển gửi trả hàng hay không */
  customerPaysShipping: boolean;
}

/**
 * Ánh xạ siêu dữ liệu cho 3 lý do trả hàng hợp lệ.
 */
export const RETURN_REASON_META: Record<ReturnReason, ReturnReasonMeta> = {
  CHANGE_OF_MIND: {
    label: 'Đổi ý, không còn nhu cầu',
    description: 'Khách hàng thay đổi ý định mua sắm (khách chịu phí ship trả)',
    requiresImages: false,
    customerPaysShipping: true,
  },
  DEFECTIVE: {
    label: 'Sản phẩm bị lỗi sản xuất',
    description: 'Lỗi đường may, rách vải, hỏng khóa, ố bẩn (yêu cầu từ 1 đến 5 ảnh minh chứng)',
    requiresImages: true,
    customerPaysShipping: false,
  },
  WRONG_ITEM: {
    label: 'Shop giao sai sản phẩm',
    description: 'Giao sai mẫu mã, sai kích thước hoặc màu sắc (yêu cầu từ 1 đến 5 ảnh minh chứng)',
    requiresImages: true,
    customerPaysShipping: false,
  },
};

/**
 * Danh sách tùy chọn lý do trả hàng dùng cho component Select / Radio của form tạo/sửa phiếu.
 */
export const RETURN_REASON_OPTIONS: Array<{ value: ReturnReason; label: string; description: string }> = [
  {
    value: 'CHANGE_OF_MIND',
    label: RETURN_REASON_META.CHANGE_OF_MIND.label,
    description: RETURN_REASON_META.CHANGE_OF_MIND.description,
  },
  {
    value: 'DEFECTIVE',
    label: RETURN_REASON_META.DEFECTIVE.label,
    description: RETURN_REASON_META.DEFECTIVE.description,
  },
  {
    value: 'WRONG_ITEM',
    label: RETURN_REASON_META.WRONG_ITEM.label,
    description: RETURN_REASON_META.WRONG_ITEM.description,
  },
];

/**
 * Danh sách 6 bước tiêu chuẩn trong tiến trình vòng đời trả hàng (Return Timeline).
 */
export const RETURN_TIMELINE_STEPS = [
  { step: 1, title: 'Tạo yêu cầu', description: 'Gửi phiếu yêu cầu trả hàng' },
  { step: 2, title: 'Xét duyệt & Bàn giao', description: 'Duyệt yêu cầu và gửi hàng cho shipper' },
  { step: 3, title: 'Nhận hàng tại kho', description: 'Kiện hàng về đến kho và bắt đầu kiểm định' },
  { step: 4, title: 'Kiểm định QC', description: 'Kiểm tra chất lượng và chốt phương án' },
  { step: 5, title: 'Hoàn tiền', description: 'Chuyển khoản hoàn tiền cho khách hàng' },
  { step: 6, title: 'Đóng hồ sơ', description: 'Nhập lại kho và kết thúc quy trình' },
];
