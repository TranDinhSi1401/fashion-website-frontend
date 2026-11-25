/**
 * Component hiển thị huy hiệu trạng thái (Status Badge) cho quy trình Trả hàng & Hoàn tiền.
 * Ánh xạ 8 trạng thái ReturnRequestStatus sang nhãn tiếng Việt và kiểu dáng Badge chuẩn Design System.
 */

import React from 'react';
import Badge from '../ui/Badge';
import { RETURN_STATUS_META, ReturnBadgeVariant } from '../../constants/returnMeta';
import type { ReturnRequestStatus } from '../../types/return';
import { cn } from '../../utils/cn';

export interface ReturnStatusBadgeProps {
  /**
   * Mã trạng thái của phiếu yêu cầu trả hàng.
   */
  status?: ReturnRequestStatus | string | null;
  /**
   * Hiển thị nổi bật hơn (dùng cho màn hình danh sách khách hàng).
   */
  prominent?: boolean;
  /**
   * Kích thước hiển thị tương thích ('default' | 'prominent').
   */
  size?: 'default' | 'prominent';
  /**
   * Class CSS bổ sung tùy chọn.
   */
  className?: string;
}

/**
 * Chức năng: Hiển thị huy hiệu trạng thái phiếu trả hàng với màu sắc và nhãn tiếng Việt chuẩn, luôn hiển thị trên 1 dòng.
 */
export default function ReturnStatusBadge({
  status,
  prominent = false,
  size = 'default',
  className = '',
}: ReturnStatusBadgeProps) {
  const isProminent = prominent || size === 'prominent';
  const meta =
    status && status in RETURN_STATUS_META
      ? RETURN_STATUS_META[status as ReturnRequestStatus]
      : null;

  const variant: ReturnBadgeVariant = meta ? meta.badgeVariant : 'default';
  const label = meta ? meta.label : status || 'Không xác định';

  return (
    <Badge
      variant={variant}
      className={cn(
        'whitespace-nowrap shrink-0',
        isProminent && '!h-7 !px-3 !text-xs font-bold shadow-xs',
        className
      )}
      title={meta ? meta.description : undefined}
    >
      {label}
    </Badge>
  );
}
