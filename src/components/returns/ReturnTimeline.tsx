/**
 * Component hiển thị tiến trình vòng đời 6 bước (Lifecycle Timeline) của phiếu trả hàng.
 * Bao gồm các mốc thời gian chi tiết, chỉ báo trạng thái từng bước và các banner cảnh báo
 * quá hạn SLA, từ chối yêu cầu, hoặc chờ khách hàng phản hồi phương án xử lý.
 */

import React from 'react';
import { AlertTriangle, XCircle, Clock, Check, X } from 'lucide-react';
import { RETURN_STATUS_META, RETURN_TIMELINE_STEPS } from '../../constants/returnMeta';
import { formatDateTime } from '../../utils/returnHelpers';
import type { ReturnRequestResponse } from '../../types/return';
import { cn } from '../../utils/cn';
import styles from './ReturnTimeline.module.css';

export interface ReturnTimelineProps {
  /**
   * Thông tin phiếu trả hàng từ Backend API.
   */
  returnRequest: ReturnRequestResponse;
  /**
   * Vai trò người xem (customer hoặc admin) để hiển thị đúng thông điệp banner ngữ cảnh.
   */
  viewerRole?: 'customer' | 'admin';
  /**
   * Class CSS bổ sung tùy chọn.
   */
  className?: string;
}

/**
 * Chức năng: Hiển thị thanh tiến trình 6 bước và các banner cảnh báo nghiệp vụ tương ứng.
 *
 * @param props Đầu vào: ReturnTimelineProps chứa returnRequest, viewerRole và className.
 * @returns Đầu ra: Thẻ JSX hiển thị tiến trình và các cảnh báo liên quan.
 */
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

  // Xác định bước hiện tại trong tiến trình (1..6) dựa vào trạng thái
  const currentStepIndex = RETURN_STATUS_META[status]?.stepIndex ?? 1;
  const isRejected = status === 'REJECTED';
  const isCancelled = status === 'CANCELLED';

  // Lấy danh sách mốc thời gian chi tiết tương ứng với từng bước để hiển thị dưới tiêu đề bước
  const getStepTimestamp = (stepNumber: number): string | null => {
    switch (stepNumber) {
      case 1:
        // Bước 1: Thời điểm khách tạo yêu cầu
        return createdAt ? `Tạo: ${formatDateTime(createdAt)}` : null;
      case 2:
        // Bước 2: Duyệt yêu cầu hoặc bàn giao vận chuyển
        if (handedOverAt) {
          return `Đã gửi: ${formatDateTime(handedOverAt)}`;
        }
        if (approvedAt) {
          return `Duyệt: ${formatDateTime(approvedAt)}`;
        }
        if (handoverDeadline && currentStepIndex === 2) {
          return `Hạn gửi: ${formatDateTime(handoverDeadline)}`;
        }
        return null;
      case 3:
        // Bước 3: Kho nhận được kiện hàng
        return receivedAt ? `Nhận: ${formatDateTime(receivedAt)}` : null;
      case 4:
        // Bước 4: Kiểm định chất lượng hàng trả
        return inspectedAt ? `QC: ${formatDateTime(inspectedAt)}` : null;
      case 5:
        // Bước 5: Kế toán hoàn tiền thành công
        return refundedAt ? `Hoàn: ${formatDateTime(refundedAt)}` : null;
      case 6:
        // Bước 6: Đóng hồ sơ kết thúc quy trình
        return completedAt ? `Đóng: ${formatDateTime(completedAt)}` : null;
      default:
        return null;
    }
  };

  return (
    <div className={cn(styles.timelineContainer, className)}>
      {/* 1. Banner cảnh báo quá hạn SLA xử lý (khi có cờ isOverdue hoặc có lý do giải trình) */}
      {(isOverdue || overdueReason) && (
        <div className={cn('animate-fade-in', styles.bannerOverdue)}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-status-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-bold text-content-primary mb-1">
                Thông Báo: Hồ Sơ Đang Trong Diện Theo Dõi Tiến Độ (SLA)
              </div>
              {overdueReason && (
                <div className="text-content-secondary mb-1">
                  <span className="font-semibold">Giải trình nguyên nhân trễ hạn:</span> {overdueReason}
                </div>
              )}
              {estimatedCompletionAt && (
                <div className="text-content-secondary">
                  <span className="font-semibold">Thời gian dự kiến hoàn tất xử lý:</span>{' '}
                  {formatDateTime(estimatedCompletionAt)}
                </div>
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
                Yêu Cầu Trả Hàng Đã Bị Từ Chối
              </div>
              <div className="text-content-secondary">
                <span className="font-semibold">Lý do từ chối:</span>{' '}
                {rejectionReason || 'Sản phẩm không đáp ứng đủ điều kiện chính sách trả hàng.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Banner thông báo chờ khách hàng phản hồi phương án sau kiểm định QC */}
      {status === 'WAITING_CUSTOMER_FEEDBACK' && (
        <div className={cn('animate-fade-in', styles.bannerFeedback)}>
          <div className="flex items-start gap-3">
            <Clock size={20} className="text-accent-gold shrink-0 mt-0.5" />
            <div className="text-sm">
              {viewerRole === 'admin' ? (
                <>
                  <div className="font-bold text-content-primary mb-1">
                    Đang Chờ Khách Hàng Phản Hồi Phương Án
                  </div>
                  <div className="text-content-secondary">
                    {customerConfirmedPlan
                      ? 'Khách hàng đã đồng ý phương án xử lý nhưng vẫn đang thiếu thông tin tài khoản ngân hàng nhận hoàn tiền.'
                      : 'Kho đã có kết quả kiểm định QC. Hệ thống đang chờ khách hàng xác nhận phương án xử lý hoặc bổ sung số tài khoản ngân hàng.'}
                  </div>
                </>
              ) : customerConfirmedPlan ? (
                <>
                  <div className="font-bold text-content-primary mb-1">
                    Cần Bạn Bổ Sung Tài Khoản Ngân Hàng
                  </div>
                  <div className="text-content-secondary">
                    Bạn đã xác nhận đồng ý phương án xử lý. Vui lòng bấm nút{' '}
                    <strong>Bổ Sung STK</strong> phía trên để cung cấp thông tin nhận tiền hoàn.
                  </div>
                </>
              ) : (
                <>
                  <div className="font-bold text-content-primary mb-1">
                    Cần Bạn Phản Hồi: Đề Xuất Điều Chỉnh Phương Án Xử Lý
                  </div>
                  <div className="text-content-secondary">
                    Bộ phận kiểm định chất lượng kho đã kiểm tra sản phẩm và đề xuất phương án giải quyết.
                    Vui lòng xem chi tiết phía dưới và bấm nút <strong>Xem &amp; Xác Nhận Phương Án</strong> để hoàn tất quy trình.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Thanh hiển thị tiến trình 6 bước */}
      <div className="overflow-x-auto py-3">
        <div className="min-w-[620px] flex items-center justify-between">
          {RETURN_TIMELINE_STEPS.map((stepItem, index) => {
            const stepNum = stepItem.step;
            // Kiểm tra từng bước đã hoàn tất (bao gồm bước 6 khi đã đóng hoàn tất hồ sơ và bước 1+ đã qua khi bị hủy/từ chối)
            const hasReachedTimestamp =
              (stepNum === 1 && Boolean(createdAt)) ||
              (stepNum === 2 && Boolean(handedOverAt || approvedAt)) ||
              (stepNum === 3 && Boolean(receivedAt)) ||
              (stepNum === 4 && Boolean(inspectedAt) && !isRejected) ||
              (stepNum === 5 && Boolean(refundedAt));

            const isCompleted =
              !isRejected && !isCancelled
                ? stepNum < currentStepIndex ||
                  (stepNum === 6 && status === 'REFUNDED' && Boolean(completedAt))
                : stepNum < 6 && hasReachedTimestamp;

            const isActive = stepNum === currentStepIndex && !isCompleted;
            const isFailedStep = stepNum === currentStepIndex && (isRejected || isCancelled);
            const stepTime = getStepTimestamp(stepNum);

            return (
              <React.Fragment key={stepNum}>
                {/* Vòng tròn biểu tượng số bước */}
                <div className="flex flex-col items-center text-center max-w-[110px]">
                  <div
                    className={cn(
                      styles.stepCircle,
                      isCompleted && styles.stepCircleCompleted,
                      isActive && !isFailedStep && styles.stepCircleActive,
                      isFailedStep && isRejected && styles.stepCircleRejected,
                      isFailedStep && isCancelled && styles.stepCircleCancelled
                    )}
                  >
                    {isCompleted ? (
                      <Check size={16} />
                    ) : isFailedStep ? (
                      <X size={16} />
                    ) : (
                      stepNum
                    )}
                  </div>

                  {/* Tiêu đề bước */}
                  <span
                    className={cn(
                      'mt-2 text-xs font-semibold leading-tight',
                      isActive ? 'text-content-primary' : 'text-content-muted',
                      isFailedStep && isRejected && 'text-status-error'
                    )}
                  >
                    {stepItem.title}
                  </span>

                  {/* Thời điểm thực hiện nếu có */}
                  {stepTime && (
                    <span className="mt-1 text-[11px] text-content-muted leading-tight">
                      {stepTime}
                    </span>
                  )}
                </div>

                {/* Đường kẻ nối giữa hai bước liên tiếp */}
                {index < RETURN_TIMELINE_STEPS.length - 1 && (
                  <div
                    className={cn(
                      styles.stepLine,
                      stepNum < currentStepIndex && !isRejected && !isCancelled && styles.stepLineCompleted
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
