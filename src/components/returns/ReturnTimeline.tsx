/**
 * Component hiển thị tiến trình xử lý của phiếu trả hàng.
 * Tách ngôn ngữ rõ ràng giữa Khách hàng (ngắn gọn, thân thiện, không dùng thuật ngữ nội bộ)
 * và Quản trị viên (đầy đủ thông tin SLA và trạng thái điều phối).
 */

import React from 'react';
import { AlertTriangle, XCircle, Clock, CheckCircle2 } from 'lucide-react';
import { formatDateTime } from '../../utils/returnHelpers';
import type { ReturnRequestResponse } from '../../types/return';
import { cn } from '../../utils/cn';
import styles from './ReturnTimeline.module.css';

export interface ReturnTimelineProps {
  returnRequest: ReturnRequestResponse;
  viewerRole?: 'customer' | 'admin';
  className?: string;
}

export default function ReturnTimeline({
  returnRequest,
  viewerRole = 'customer',
  className = '',
}: ReturnTimelineProps) {
  const {
    status,
    isOverdue,
    overdueReason,
    estimatedCompletionAt,
    rejectionReason,
    customerConfirmedPlan,
    createdAt,
    approvedAt,
    handedOverAt,
    handoverDeadline,
    receivedAt,
    inspectedAt,
    refundedAt,
    completedAt,
  } = returnRequest;

  const isRejected = status === 'REJECTED';
  const isCancelled = status === 'CANCELLED';
  const isCustomer = viewerRole === 'customer';

  const getPlainStatusSummary = (): string => {
    if (isCustomer) {
      switch (status) {
        case 'PENDING_APPROVAL':
          return 'Đang chờ cửa hàng duyệt yêu cầu';
        case 'WAITING_FOR_RETURN_DELIVERY':
          return handedOverAt ? 'Hàng đang được gửi về kho' : 'Chờ bạn gửi hàng trả lại';
        case 'INSPECTING':
          return 'Kho đang kiểm tra sản phẩm';
        case 'WAITING_CUSTOMER_FEEDBACK':
          return 'Chờ bạn xác nhận số tiền hoàn';
        case 'WAITING_REFUND':
          return 'Đang chuyển khoản hoàn tiền cho bạn';
        case 'REFUNDED':
          return 'Đã hoàn tiền thành công';
        case 'REJECTED':
          return 'Yêu cầu không được chấp nhận';
        case 'CANCELLED':
          return 'Đã hủy yêu cầu';
        default:
          return 'Đang xử lý yêu cầu';
      }
    }

    switch (status) {
      case 'PENDING_APPROVAL':
        return 'Đang đợi nhân viên duyệt yêu cầu';
      case 'WAITING_FOR_RETURN_DELIVERY':
        return handedOverAt
          ? 'Đã bàn giao vận chuyển, đang đợi nhận hàng tại kho'
          : 'Đang đợi nhận hàng tại kho';
      case 'INSPECTING':
        return 'Đang đợi nhân viên kho kiểm định';
      case 'WAITING_CUSTOMER_FEEDBACK':
        return 'Đang đợi khách hàng phản hồi phương án';
      case 'WAITING_REFUND':
        return 'Đang hoàn tiền';
      case 'REFUNDED':
        return completedAt ? 'Đã xử lý xong' : 'Đã hoàn tiền';
      case 'REJECTED':
        return 'Yêu cầu đã bị từ chối';
      case 'CANCELLED':
        return 'Yêu cầu đã bị hủy';
      default:
        return 'Đang xử lý yêu cầu';
    }
  };

  const timestampEntries = isCustomer
    ? [
        createdAt ? `Gửi yêu cầu: ${formatDateTime(createdAt)}` : null,
        approvedAt ? `Đã duyệt: ${formatDateTime(approvedAt)}` : null,
        handoverDeadline && status === 'WAITING_FOR_RETURN_DELIVERY' && !handedOverAt
          ? `Hạn gửi hàng: ${formatDateTime(handoverDeadline)}`
          : null,
        handedOverAt ? `Đã gửi hàng: ${formatDateTime(handedOverAt)}` : null,
        receivedAt ? `Kho đã nhận: ${formatDateTime(receivedAt)}` : null,
        inspectedAt ? `Kiểm tra xong: ${formatDateTime(inspectedAt)}` : null,
        refundedAt ? `Đã hoàn tiền: ${formatDateTime(refundedAt)}` : null,
      ].filter((entry): entry is string => Boolean(entry))
    : [
        createdAt ? `Tạo yêu cầu: ${formatDateTime(createdAt)}` : null,
        approvedAt ? `Duyệt yêu cầu: ${formatDateTime(approvedAt)}` : null,
        handoverDeadline && status === 'WAITING_FOR_RETURN_DELIVERY' && !handedOverAt
          ? `Hạn gửi hàng: ${formatDateTime(handoverDeadline)}`
          : null,
        handedOverAt ? `Bàn giao VC: ${formatDateTime(handedOverAt)}` : null,
        receivedAt ? `Nhận tại kho: ${formatDateTime(receivedAt)}` : null,
        inspectedAt ? `Kiểm định QC: ${formatDateTime(inspectedAt)}` : null,
        refundedAt ? `Hoàn tiền: ${formatDateTime(refundedAt)}` : null,
        completedAt ? `Hoàn tất: ${formatDateTime(completedAt)}` : null,
      ].filter((entry): entry is string => Boolean(entry));

  return (
    <div className={cn(styles.timelineContainer, className)}>
      {/* 1. Banner thông báo tiến độ (chỉ hiện ngắn gọn với khách hàng, chi tiết SLA với Admin) */}
      {(isOverdue || overdueReason) && (
        <div className={cn('animate-fade-in', styles.bannerOverdue)}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-status-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              {isCustomer ? (
                <>
                  <div className="font-bold text-content-primary mb-1">
                    Cửa hàng đang ưu tiên xử lý yêu cầu của bạn
                  </div>
                  {overdueReason && (
                    <div className="text-xs text-content-secondary mb-1">
                      Lý do chậm xử lý: {overdueReason}
                    </div>
                  )}
                  {estimatedCompletionAt && (
                    <div className="text-xs text-content-secondary">
                      Dự kiến xong trước:{' '}
                      <strong className="text-content-primary">
                        {formatDateTime(estimatedCompletionAt)}
                      </strong>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="font-bold text-content-primary mb-1">
                    Hồ sơ quá hạn SLA
                  </div>
                  {overdueReason && (
                    <div className="text-content-secondary mb-1">
                      <span className="font-semibold">Nguyên nhân:</span> {overdueReason}
                    </div>
                  )}
                  {estimatedCompletionAt && (
                    <div className="text-content-secondary">
                      <span className="font-semibold">Dự kiến hoàn tất:</span>{' '}
                      {formatDateTime(estimatedCompletionAt)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Banner thông báo yêu cầu bị từ chối */}
      {isRejected && (
        <div className={cn('animate-fade-in', styles.bannerRejected)}>
          <div className="flex items-start gap-3">
            <XCircle size={20} className="text-status-error shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-bold text-status-error mb-1">
                Yêu Cầu Trả Hàng Không Được Chấp Nhận
              </div>
              <div className="text-content-secondary">
                <span className="font-semibold">Lý do:</span>{' '}
                {rejectionReason || 'Sản phẩm chưa đáp ứng điều kiện trả hàng.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Banner chờ phản hồi: phía khách chỉ hiện khi cần bổ sung STK (tránh trùng lặp với banner xác nhận ở header C4) */}
      {status === 'WAITING_CUSTOMER_FEEDBACK' && (!isCustomer || Boolean(customerConfirmedPlan)) && (
        <div className={cn('animate-fade-in', styles.bannerFeedback)}>
          <div className="flex items-start gap-3">
            <Clock size={20} className="text-accent-gold shrink-0 mt-0.5" />
            <div className="text-sm">
              {!isCustomer ? (
                <>
                  <div className="font-bold text-content-primary mb-1">
                    Đang Chờ Khách Hàng Phản Hồi Phương Án
                  </div>
                  <div className="text-content-secondary">
                    {customerConfirmedPlan
                      ? 'Khách đã đồng ý phương án nhưng còn thiếu thông tin tài khoản ngân hàng.'
                      : 'Kho đã có kết quả kiểm tra, đang chờ khách xác nhận phương án hoàn tiền.'}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-bold text-content-primary mb-1">
                    Cần bổ sung tài khoản ngân hàng nhận tiền
                  </div>
                  <div className="text-xs text-content-secondary">
                    Bạn đã đồng ý phương án hoàn tiền. Hãy bấm nút <strong>Thêm TK Ngân Hàng</strong> ở trên để cửa hàng chuyển khoản nhé.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Thẻ tóm tắt trạng thái hiện tại */}
      <div className="p-4 bg-surface border border-line-light rounded-sm flex items-start gap-3">
        {isRejected || isCancelled ? (
          <XCircle size={20} className="text-status-error shrink-0 mt-0.5" />
        ) : status === 'REFUNDED' ? (
          <CheckCircle2 size={20} className="text-status-success shrink-0 mt-0.5" />
        ) : (
          <Clock size={20} className="text-accent-gold shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-content-primary">
            {getPlainStatusSummary()}
          </div>
          {timestampEntries.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-content-muted">
              {timestampEntries.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
