/**
 * Component hiển thị huy hiệu trạng thái (Status Badge) cho quy trình Trả hàng & Hoàn tiền.
 * Ánh xạ 8 trạng thái ReturnRequestStatus sang nhãn tiếng Việt và kiểu dáng Badge chuẩn Design System.
 */

import React from 'react';
import Badge from '../ui/Badge';
import { RETURN_STATUS_META, ReturnBadgeVariant } from '../../constants/returnMeta';
import type { ReturnRequestStatus } from '../../types/return';

export interface ReturnStatusBadgeProps {
  /**
   * Mã trạng thái của phiếu yêu cầu trả hàng.
   */
  status?: ReturnRequestStatus | string | null;
  /**
   * Class CSS bổ sung tùy chọn.
   */
  className?: string;
}

/**
 * Chức năng: Hiển thị huy hiệu trạng thái phiếu trả hàng với màu sắc và nhãn tiếng Việt chuẩn.
 *
 * @param props Đầu vào: ReturnStatusBadgeProps chứa status và className tùy chọn.
 * @returns Đầu ra: Thẻ JSX hiển thị Badge tương ứng với trạng thái.
 */
export default function ReturnStatusBadge({ status, className = '' }: ReturnStatusBadgeProps) {
  // Trích xuất siêu dữ liệu trạng thái từ bản đồ RETURN_STATUS_META
  const meta = status && status in RETURN_STATUS_META
    ? RETURN_STATUS_META[status as ReturnRequestStatus]
    : null;

  // Lựa chọn biến thể Badge phù hợp: mặc định dùng 'default' nếu không xác định
  const variant: ReturnBadgeVariant = meta ? meta.badgeVariant : 'default';
  // Nhãn hiển thị tiếng Việt ngắn gọn: fallback về mã trạng thái gốc hoặc thông báo chưa rõ
  const label = meta ? meta.label : (status || 'Không xác định');

  return (
    <Badge
      variant={variant}
      className={className}
      title={meta ? meta.description : undefined}
    >
      {label}
    </Badge>
  );
}
