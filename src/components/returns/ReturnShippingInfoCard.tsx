/**
 * Component hiển thị thông tin vận chuyển chiều hoàn (GHN), địa chỉ lấy hàng
 * và các ghi chú bàn giao / nhận hàng tại kho cho cả Khách hàng và Quản trị viên.
 */

import React from 'react';
import { Truck, MapPin, Phone, User, ExternalLink, FileText } from 'lucide-react';
import type { ReturnRequestResponse } from '../../types/return';
import { buildGhnTrackingUrl, formatPickupAddress } from '../../utils/returnHelpers';
import { cn } from '../../utils/cn';

export interface ReturnShippingInfoCardProps {
  /**
   * Thông tin phiếu trả hàng nhận từ Backend API.
   */
  returnRequest: ReturnRequestResponse;
  /**
   * Vai trò người xem (customer hoặc admin) để điều chỉnh bố cục phù hợp.
   */
  viewerRole?: 'customer' | 'admin';
  /**
   * Class CSS bổ sung tùy chọn.
   */
  className?: string;
}

/**
 * Chức năng: Hiển thị thẻ thông tin vận chuyển chiều hoàn (đơn vị vận chuyển, mã vận đơn GHN,
 * thông tin liên hệ/địa chỉ lấy hàng và ghi chú bàn giao/nhận kho).
 *
 * @param props Đầu vào: ReturnShippingInfoCardProps chứa returnRequest và viewerRole.
 * @returns Đầu ra: Thẻ JSX hiển thị thông tin vận chuyển chiều hoàn.
 */
export default function ReturnShippingInfoCard({
  returnRequest,
  viewerRole = 'customer',
  className = '',
}: ReturnShippingInfoCardProps) {
  const providerLabel =
    returnRequest.returnShippingProvider === 'GHN'
      ? 'Giao Hàng Nhanh (GHN)'
      : returnRequest.returnShippingProvider || 'Khách tự gửi / mang đến cửa hàng';

  const trackingUrl = buildGhnTrackingUrl(returnRequest.returnTrackingCode);
  const fullPickupAddress = formatPickupAddress(returnRequest);

  return (
    <div
      className={cn(
        'bg-surface border border-line-light rounded-sm p-5',
        viewerRole === 'customer' && 'bg-surface-body rounded-card p-6',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-line-light">
        <Truck size={18} className="text-content-primary shrink-0" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-content-primary">
          Vận chuyển chiều hoàn
        </h2>
      </div>

      <div className="space-y-2.5 text-xs text-content-primary">
        <div className="flex items-start justify-between gap-3">
          <span className="text-content-muted shrink-0">Đơn vị vận chuyển:</span>
          <span className="font-semibold text-right">{providerLabel}</span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <span className="text-content-muted shrink-0">Mã vận đơn:</span>
          {returnRequest.returnTrackingCode && trackingUrl ? (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono font-bold text-primary underline break-all text-right"
            >
              <span>{returnRequest.returnTrackingCode}</span>
              <ExternalLink size={12} className="shrink-0" />
            </a>
          ) : (
            <span className="text-content-muted">Chưa có</span>
          )}
        </div>

        <div className="pt-2 border-t border-line-light space-y-2">
          <div>
            <span className="text-content-muted block">Người liên hệ lấy hàng:</span>
            <div className="flex items-center gap-1.5 font-semibold mt-0.5">
              <User size={13} className="text-content-muted shrink-0" />
              <span className="break-words [overflow-wrap:anywhere]">
                {returnRequest.pickupContactName || 'Theo đơn hàng gốc'}
              </span>
            </div>
          </div>

          <div>
            <span className="text-content-muted block">Số điện thoại lấy hàng:</span>
            <div className="flex items-center gap-1.5 font-semibold font-mono mt-0.5">
              <Phone size={13} className="text-content-muted shrink-0" />
              <span>{returnRequest.pickupPhone || 'Theo đơn hàng gốc'}</span>
            </div>
          </div>

          <div>
            <span className="text-content-muted block">Địa chỉ lấy hàng:</span>
            <div className="flex items-start gap-1.5 font-medium mt-0.5">
              <MapPin size={13} className="text-content-muted shrink-0 mt-0.5" />
              <span className="break-words [overflow-wrap:anywhere]">
                {fullPickupAddress || 'Theo địa chỉ đơn gốc'}
              </span>
            </div>
          </div>
        </div>

        {(returnRequest.handoverNote || returnRequest.receiveNote) && (
          <div className="pt-2 border-t border-line-light space-y-2">
            {returnRequest.handoverNote && (
              <div>
                <span className="text-content-muted flex items-center gap-1 mb-0.5">
                  <FileText size={12} className="shrink-0" />
                  <span>Ghi chú bàn giao:</span>
                </span>
                <p className="text-content-secondary break-words [overflow-wrap:anywhere]">
                  {returnRequest.handoverNote}
                </p>
              </div>
            )}

            {returnRequest.receiveNote && (
              <div>
                <span className="text-content-muted flex items-center gap-1 mb-0.5">
                  <FileText size={12} className="shrink-0" />
                  <span>Ghi chú nhận kho:</span>
                </span>
                <p className="text-content-secondary break-words [overflow-wrap:anywhere]">
                  {returnRequest.receiveNote}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
