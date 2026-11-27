/**
 * Trang chi tiết phiếu trả hàng dành cho Khách hàng (Customer Return Detail Page - C4).
 * Địa chỉ route: /account/returns/:id.
 * Hiển thị tiến trình 6 bước (ReturnTimeline), danh sách sản phẩm đối soát kèm kết quả kiểm định QC,
 * bảng tính toán đối soát tài chính hoàn tiền, thư viện ảnh minh chứng (ReturnImageGallery)
 * và thanh tác vụ với các Modal C5a (Sửa), C5b (STK), C5c (Xác nhận phương án), Hủy phiếu.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  RotateCcw,
  ArrowLeft,
  ChevronRight,
  Package,
  Calendar,
  AlertCircle,
  Edit3,
  CreditCard,
  CheckCircle2,
  XCircle,
  DollarSign,
  Building2,
  FileText,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { returnService } from '../services/returnService';
import type { ReturnRequestResponse, ReturnRequestItemResponse } from '../types/return';
import {
  formatVND,
  formatDateTime,
  formatReturnShippingFeeDisplay,
  getReturnReasonLabel,
  getGeneralInspectionNote,
  canCustomerEditReturn,
  canCustomerUpdateBank,
  canCustomerConfirmPlan,
  canCustomerCancelReturn,
} from '../utils/returnHelpers';
import ReturnStatusBadge from '../components/returns/ReturnStatusBadge';
import ReturnTimeline from '../components/returns/ReturnTimeline';
import ReturnImageGallery from '../components/returns/ReturnImageGallery';
import ReturnShippingInfoCard from '../components/returns/ReturnShippingInfoCard';
import {
  ReturnEditModal,
  ReturnBankModal,
  ReturnConfirmPlanModal,
  ReturnCancelModal,
} from '../components/returns/ReturnActionModals';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { cn } from '../utils/cn';
import pageStyles from './ReturnPages.module.css';

/**
 * Chức năng: Màn hình chi tiết toàn diện của một phiếu yêu cầu trả hàng (C4).
 *
 * @returns Đầu ra: Thẻ JSX trang chi tiết phiếu trả hàng.
 */
export default function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [returnRequest, setReturnRequest] = useState<ReturnRequestResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Trạng thái bật/tắt các modal hành động C5
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState<boolean>(false);
  const [isConfirmPlanModalOpen, setIsConfirmPlanModalOpen] = useState<boolean>(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);

  // Tải thông tin chi tiết phiếu trả hàng từ Backend API
  const fetchReturnDetail = async (requestId: number) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await returnService.getMyRequestById(requestId);
      if (res.data) {
        setReturnRequest(res.data);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể tải thông tin phiếu trả hàng.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!id || isNaN(Number(id))) {
      setErrorMessage('Mã phiếu trả hàng trên đường dẫn không hợp lệ.');
      setIsLoading(false);
      return;
    }
    fetchReturnDetail(Number(id));
  }, [id]);

  // Cập nhật state sau khi thực hiện xong một thao tác modal thành công
  const handleActionSuccess = (updated: ReturnRequestResponse) => {
    setReturnRequest(updated);
  };

  // Trạng thái đang tải
  if (isLoading) {
    return (
      <div className="container py-20 text-center text-content-muted">
        <div className="w-8 h-8 border-2 border-line border-t-primary rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Đang tải thông tin phiếu trả hàng...</p>
      </div>
    );
  }

  // Trạng thái lỗi không tìm thấy phiếu
  if (errorMessage || !returnRequest) {
    return (
      <div className="container py-16 max-w-2xl">
        <div className="p-8 bg-surface border border-line-light rounded-sm text-center">
          <AlertCircle size={40} className="text-status-error mx-auto mb-3" />
          <h3 className="text-lg font-bold text-content-primary mb-2">
            Không Tìm Thấy Phiếu Trả Hàng
          </h3>
          <p className="text-sm text-content-secondary mb-6">{errorMessage}</p>
          <Button variant="primary" onClick={() => navigate('/account/returns')}>
            Quay Lại Danh Sách Phiếu Trả Hàng
          </Button>
        </div>
      </div>
    );
  }

  // Quyền tác vụ hành động của khách
  const canEdit = canCustomerEditReturn(returnRequest);
  const canUpdateBank = canCustomerUpdateBank(returnRequest);
  const canConfirmPlan = canCustomerConfirmPlan(returnRequest);
  const canCancel = canCustomerCancelReturn(returnRequest);

  const isShowingEstimatedRefund = !returnRequest.inspectedAt;
  const displayedItemsRefund = returnRequest.itemsRefundAmount || 0;
  const displayedNetRefund = returnRequest.refundAmount || 0;
  const generalNote = getGeneralInspectionNote(returnRequest);

  return (
    <div className="pt-8 pb-20">
      <div className="container max-w-5xl">
        {/* Breadcrumb điều hướng */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-content-muted mb-6">
          <Link to="/" className="hover:text-content-primary">
            Trang chủ
          </Link>
          <ChevronRight size={12} />
          <Link to="/account/profile" className="hover:text-content-primary">
            Tài khoản
          </Link>
          <ChevronRight size={12} />
          <Link to="/account/returns" className="hover:text-content-primary">
            Phiếu trả hàng
          </Link>
          <ChevronRight size={12} />
          <span className="text-content-primary font-semibold">{returnRequest.returnCode}</span>
        </nav>

        {/* Header thông tin phiếu & Thanh hành động nhanh */}
        <div className="bg-surface-body border border-line-light p-6 rounded-card mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-line-light">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold uppercase tracking-wide text-content-primary">
                  {returnRequest.returnCode}
                </h1>
                <ReturnStatusBadge status={returnRequest.status} prominent />
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-content-muted mt-2">
                <span className="flex items-center gap-1.5">
                  <Package size={14} />
                  <span>Đơn hàng: <strong>#{returnRequest.orderCode || returnRequest.orderId}</strong></span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>Ngày gửi: {formatDateTime(returnRequest.createdAt)}</span>
                </span>
                {returnRequest.inspectionResultSentAt && (
                  <span>Đã gửi kết quả: {formatDateTime(returnRequest.inspectionResultSentAt)}</span>
                )}
                {returnRequest.customerRespondedAt && (
                  <span>Bạn đã phản hồi: {formatDateTime(returnRequest.customerRespondedAt)}</span>
                )}
                {(returnRequest.status === 'REJECTED' || returnRequest.status === 'CANCELLED') &&
                  returnRequest.resolvedAt && (
                    <span>Đã đóng yêu cầu: {formatDateTime(returnRequest.resolvedAt)}</span>
                  )}
              </div>
            </div>

            {/* Thanh nút bấm hành động (Action Bar) */}
            <div className="flex flex-wrap items-center gap-2.5">
              {canEdit && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-1.5"
                >
                  <Edit3 size={14} />
                  <span>Sửa Yêu Cầu</span>
                </Button>
              )}

              {canUpdateBank && !canEdit && returnRequest.status !== 'WAITING_REFUND' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsBankModalOpen(true)}
                  className="flex items-center gap-1.5"
                >
                  <CreditCard size={14} />
                  <span>
                    {returnRequest.accountNumber || returnRequest.bankAccountNumber
                      ? 'Đổi TK Ngân Hàng'
                      : 'Thêm TK Ngân Hàng'}
                  </span>
                </Button>
              )}

              {canCancel && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="flex items-center gap-1.5 text-status-error hover:bg-surface"
                >
                  <XCircle size={14} />
                  <span>Hủy Yêu Cầu</span>
                </Button>
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/account/returns')}
                className="flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                <span>Quay Lại</span>
              </Button>
            </div>
          </div>

          {/* Banner nổi bật khi đang chờ khách xác nhận phương án sau kiểm tra hàng */}
          {canConfirmPlan && (
            <div className={cn('mt-6 animate-fade-in', pageStyles.alertGold)}>
              <Clock size={22} className="text-accent-gold shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-content-primary mb-1">
                  Cửa hàng đề xuất phương án hoàn tiền mới
                </h4>
                <p className="text-xs text-content-secondary mb-3">
                  Kho đã kiểm tra hàng trả về và cập nhật số tiền hoàn lại. Bạn vui lòng kiểm tra và xác nhận bên dưới.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsConfirmPlanModalOpen(true)}
                  className="flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>Xem &amp; Xác Nhận</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Chỉ hiển thị banner cảnh báo/thông báo quan trọng nếu có, bỏ khung Tiến Độ Xử Lý dư thừa */}
        <ReturnTimeline
          returnRequest={returnRequest}
          hideStatusSummary
          className="mb-8"
        />

        {/* 1b. THÔNG TIN GỬI HÀNG TRẢ */}
        <ReturnShippingInfoCard
          returnRequest={returnRequest}
          viewerRole="customer"
          className="mb-8"
        />

        {/* 2. BẢNG CHI TIẾT SẢN PHẨM TRẢ */}
        <div className="bg-surface-body border border-line-light rounded-card p-6 mb-8">
          <h2 className="text-base font-bold uppercase tracking-wide text-content-primary mb-1">
            Sản Phẩm Trả Lại
          </h2>
          <div className="text-xs text-content-muted mb-4 break-words [overflow-wrap:anywhere] space-y-1">
            <p>
              Lý do:{' '}
              <strong className="text-content-primary">
                {getReturnReasonLabel(returnRequest.reason)}
              </strong>
            </p>
            {returnRequest.reasonDetail?.trim() && (
              <p className="text-content-secondary">
                Chi tiết: {returnRequest.reasonDetail.trim()}
              </p>
            )}
          </div>
          {generalNote && (
            <p className="text-xs text-content-secondary mb-4 break-words [overflow-wrap:anywhere]">
              Phản hồi từ shop: <strong className="text-content-primary">{generalNote}</strong>
            </p>
          )}
          {returnRequest.extensionReason && (
            <p className="text-xs text-content-secondary mb-4 break-words [overflow-wrap:anywhere]">
              Gia hạn thời gian gửi hàng: <strong className="text-content-primary">{returnRequest.extensionReason}</strong>
              {(returnRequest.previousHandoverDeadline || returnRequest.handoverDeadline) && (
                <span className="ml-1.5 text-content-muted">
                  (
                  {returnRequest.previousHandoverDeadline && (
                    <>
                      Hạn cũ:{' '}
                      <span className="line-through">
                        {formatDateTime(returnRequest.previousHandoverDeadline)}
                      </span>
                      {returnRequest.handoverDeadline ? ' → ' : ''}
                    </>
                  )}
                  {returnRequest.handoverDeadline && (
                    <>
                      Hạn mới:{' '}
                      <strong className="text-content-primary">
                        {formatDateTime(returnRequest.handoverDeadline)}
                      </strong>
                    </>
                  )}
                  )
                </span>
              )}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={pageStyles.tableHeader}>
                  <th className="py-3 px-4">Sản Phẩm</th>
                  <th className="py-3 px-4 text-center">SL Trả</th>
                  <th className="py-3 px-4 text-center">Được Duyệt</th>
                  <th className="py-3 px-4">Ghi Chú Từ Shop</th>
                  <th className="py-3 px-4 text-right">Tiền Hoàn</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-line-light">
                {(returnRequest.items || []).map((item: ReturnRequestItemResponse) => (
                  <tr key={item.id} className={pageStyles.tableRow}>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-content-primary">{item.productName}</div>
                      <div className="text-xs text-content-muted">{item.variantInfo || 'Tiêu chuẩn'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium">{item.quantity}</td>
                    <td className="py-3.5 px-4 text-center">
                      {item.acceptedQuantity !== null && item.acceptedQuantity !== undefined ? (
                        <span
                          className={cn(
                            'font-bold px-2 py-0.5 rounded-sm text-xs',
                            item.acceptedQuantity < item.quantity
                              ? 'bg-surface text-status-warning'
                              : 'bg-surface text-status-success'
                          )}
                        >
                          {item.acceptedQuantity}
                        </span>
                      ) : (
                        <span className="text-content-muted italic text-xs">Chờ kiểm tra</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-content-secondary">
                      {item.inspectionNote || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-content-primary">
                      {formatVND(item.itemRefundAmount ?? 0)}
                      {isShowingEstimatedRefund && (item.itemRefundAmount ?? 0) > 0 && (
                        <span className="ml-1 text-[11px] font-normal text-content-muted">(Tạm tính)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. CHI TIẾT TIỀN HOÀN & TÀI KHOẢN NHẬN TIỀN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Cột 1: Bảng chi tiết tiền hoàn */}
          <div className={pageStyles.reconciliationCard}>
            <h3 className="text-sm font-bold uppercase tracking-wide text-content-primary mb-4 flex items-center gap-2">
              <DollarSign size={16} />
              <span>Chi Tiết Tiền Hoàn</span>
            </h3>

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between items-center text-content-secondary">
                <span>
                  {isShowingEstimatedRefund ? 'Tiền hàng trả lại (tạm tính):' : 'Tiền hàng được hoàn:'}
                </span>
                <span className="font-semibold text-content-primary">
                  {formatVND(displayedItemsRefund)}
                </span>
              </div>

              <div className="flex justify-between items-center text-content-secondary">
                <span>Phí gửi trả hàng:</span>
                {(() => {
                  const feeDisplay = formatReturnShippingFeeDisplay(returnRequest);
                  return (
                    <span
                      className={cn(
                        'font-semibold',
                        feeDisplay.isDeduction ? 'text-status-error' : 'text-content-primary'
                      )}
                    >
                      {feeDisplay.text}
                    </span>
                  );
                })()}
              </div>

              <div className="border-t border-line-light pt-3 flex justify-between items-center">
                <span className="font-bold text-content-primary">
                  {isShowingEstimatedRefund ? 'Số tiền nhận lại (tạm tính):' : 'Số tiền bạn nhận lại:'}
                </span>
                <span className={pageStyles.refundAmountHighlight}>
                  {formatVND(displayedNetRefund)}
                </span>
              </div>

              {returnRequest.status === 'REFUNDED' && returnRequest.refundTransactionCode && (
                <div className="mt-2 p-2.5 bg-surface-body border border-line-light rounded-sm text-xs">
                  <span className="text-content-muted">Mã giao dịch ngân hàng:</span>{' '}
                  <strong className="text-content-primary font-mono">
                    {returnRequest.refundTransactionCode}
                  </strong>
                </div>
              )}

              {returnRequest.status === 'REFUNDED' && returnRequest.refundProofImageUrl && (
                <div className="mt-2 p-2.5 bg-surface-body border border-line-light rounded-sm text-xs">
                  <span className="text-content-muted block mb-1.5">Ảnh biên lai chuyển khoản:</span>
                  <a
                    href={returnRequest.refundProofImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block"
                  >
                    <img
                      src={returnRequest.refundProofImageUrl}
                      alt="Biên lai hoàn tiền"
                      className="mt-2 max-h-48 rounded-sm border border-line-light object-contain"
                    />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Cột 2: Thông tin tài khoản ngân hàng nhận tiền */}
          <div className={pageStyles.reconciliationCard}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-content-primary flex items-center gap-2">
                <Building2 size={16} />
                <span>Tài Khoản Nhận Tiền Hoàn</span>
              </h3>
              {canUpdateBank && !canEdit && returnRequest.status !== 'WAITING_REFUND' && (
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(true)}
                  className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                >
                  Thay đổi
                </button>
              )}
            </div>

            {returnRequest.accountNumber || returnRequest.bankAccountNumber ? (
              <div className="flex flex-col gap-2.5 text-sm">
                <div>
                  <span className="text-xs text-content-muted block">Ngân hàng:</span>
                  <strong className="text-content-primary">
                    {returnRequest.bankName || 'Chưa cập nhật tên NH'}
                  </strong>
                </div>
                <div>
                  <span className="text-xs text-content-muted block">Số tài khoản:</span>
                  <strong className="text-content-primary font-mono">
                    {returnRequest.accountNumber || returnRequest.bankAccountNumber}
                  </strong>
                </div>
                <div>
                  <span className="text-xs text-content-muted block">Chủ tài khoản:</span>
                  <strong className="text-content-primary">
                    {returnRequest.accountHolderName || returnRequest.bankAccountHolder}
                  </strong>
                </div>
                {returnRequest.status === 'WAITING_REFUND' && (
                  <p className="mt-1 pt-2 border-t border-line-light text-xs text-content-muted">
                    Đang chờ hoàn tiền — liên hệ CSKH nếu cần thay đổi STK.
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 bg-surface-body border border-dashed border-line rounded-sm text-center">
                <p className="text-xs text-content-muted mb-3">
                  Bạn chưa cung cấp thông tin tài khoản ngân hàng nhận tiền hoàn.
                </p>
                {canUpdateBank && !canEdit && returnRequest.status !== 'WAITING_REFUND' && (
                  <Button variant="secondary" size="sm" onClick={() => setIsBankModalOpen(true)}>
                    Bổ Sung Tài Khoản Ngay
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 4. THƯ VIỆN ẢNH MINH CHỨNG */}
        <div className="bg-surface-body border border-line-light rounded-card p-6">
          <h2 className="text-base font-bold uppercase tracking-wide text-content-primary mb-1">
            Ảnh Minh Chứng
          </h2>
          <p className="text-xs text-content-muted mb-4">
            Bấm vào từng ảnh để phóng to và xem chi tiết
          </p>

          <ReturnImageGallery images={returnRequest.images} />
        </div>

        {/* CÁC MODAL HÀNH ĐỘNG C5 */}
        <ReturnEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          returnRequest={returnRequest}
          onSuccess={handleActionSuccess}
        />

        <ReturnBankModal
          isOpen={isBankModalOpen}
          onClose={() => setIsBankModalOpen(false)}
          returnRequest={returnRequest}
          onSuccess={handleActionSuccess}
        />

        <ReturnConfirmPlanModal
          isOpen={isConfirmPlanModalOpen}
          onClose={() => setIsConfirmPlanModalOpen(false)}
          returnRequest={returnRequest}
          onSuccess={handleActionSuccess}
        />

        <ReturnCancelModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          returnRequest={returnRequest}
          onSuccess={handleActionSuccess}
        />
      </div>
    </div>
  );
}
