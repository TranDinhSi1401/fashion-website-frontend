/**
 * Màn hình Chi tiết và Điều phối xử lý phiếu yêu cầu Trả hàng & Hoàn tiền (A2).
 * Tuyến đường: /admin/returns/:id.
 *
 * Tính năng chính:
 * - Tiêu đề hồ sơ, mã phiếu, mã đơn hàng, thông tin khách hàng và huy hiệu trạng thái.
 * - Thanh tác vụ động (Action Bar) sinh tự động theo kết quả getAdminAvailableActions(ret),
 *   kích hoạt 11 modals/dialogs điều phối theo từng bước vòng đời.
 * - Tiến trình 6 bước trực quan (ReturnTimeline) kèm các mốc thời gian chi tiết.
 * - Bảng chi tiết sản phẩm hiển thị số lượng yêu cầu, số lượng QC duyệt, số lượng nhập kho và ghi chú kiểm định.
 * - Thẻ đối soát tài chính (itemsRefundAmount - returnShippingFee = refundAmount).
 * - Thẻ thông tin tài khoản ngân hàng và mã giao dịch chuyển tiền hoàn.
 * - Thư viện ảnh minh chứng do khách hàng tải lên (ReturnImageGallery).
 * - Dấu vết kiểm toán nhân sự (Personnel Audit Trail) ghi nhận ID nhân viên và thời điểm xử lý từng khâu.
 * - Thẻ nhật ký liên hệ CSKH và niêm phong lưu kho với nút mở modal ghi chú nhanh.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Truck,
  CalendarClock,
  PackageCheck,
  CreditCard,
  AlertTriangle,
  PhoneCall,
  Archive,
  AlertCircle,
  Building2,
  User,
  Hash,
  ShieldCheck,
  DollarSign,
  UserCheck,
  RefreshCw,
  UploadCloud,
  X,
} from 'lucide-react';
import type { ReturnRequestResponse } from '../types/return';
import { returnAdminService } from '../services/returnAdminService';
import {
  getAdminAvailableActions,
  AdminActionType,
  formatVND,
  formatDateTime,
  formatReturnShippingFeeDisplay,
  getReturnReasonLabel,
  getGeneralInspectionNote,
  validateReturnImageFiles,
  ACCEPTED_IMAGE_EXTENSIONS,
} from '../utils/returnHelpers';
import { buildDynamicVietQrUrl, formatVietQrTransferNote } from '../constants/banks';
import ReturnStatusBadge from '../components/returns/ReturnStatusBadge';
import ReturnTimeline from '../components/returns/ReturnTimeline';
import ReturnImageGallery from '../components/returns/ReturnImageGallery';
import ReturnShippingInfoCard from '../components/returns/ReturnShippingInfoCard';
import {
  ReturnApproveModal,
  ReturnRejectModal,
  ReturnHandoverModal,
  ReturnExtendHandoverModal,
  ReturnReceiveModal,
  ReturnRefundModal,
  ReturnOverdueNoteModal,
  ReturnContactLogModal,
  ReturnCompleteModal,
} from '../components/returns/AdminActionModals';
import {
  ReturnInspectModal,
  ReturnRestockModal,
} from '../components/returns/AdminInspectRestockModals';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

/**
 * Cấu hình hiển thị nút thao tác cho từng mã hành động quản trị.
 */
interface ActionConfig {
  label: string;
  icon: React.ElementType;
  variant: 'primary' | 'secondary' | 'outline' | 'danger';
}

const ACTION_BUTTON_CONFIGS: Record<AdminActionType, ActionConfig> = {
  approve: {
    label: 'Duyệt yêu cầu',
    icon: CheckCircle2,
    variant: 'primary',
  },
  reject: {
    label: 'Từ chối yêu cầu',
    icon: XCircle,
    variant: 'danger',
  },
  handover: {
    label: 'Bàn giao shipper',
    icon: Truck,
    variant: 'primary',
  },
  extendHandover: {
    label: 'Gia hạn bàn giao (+3 ngày)',
    icon: CalendarClock,
    variant: 'outline',
  },
  receive: {
    label: 'Nhận hàng tại kho',
    icon: PackageCheck,
    variant: 'primary',
  },
  inspect: {
    label: 'Kiểm định QC',
    icon: ShieldCheck,
    variant: 'primary',
  },
  refund: {
    label: 'Xác nhận hoàn tiền',
    icon: CreditCard,
    variant: 'primary',
  },
  restock: {
    label: 'Nhập lại kho bán',
    icon: PackageCheck,
    variant: 'primary',
  },
  overdueNote: {
    label: 'Giải trình trễ SLA',
    icon: AlertTriangle,
    variant: 'outline',
  },
  contactLog: {
    label: 'Ghi nhật ký CSKH',
    icon: PhoneCall,
    variant: 'outline',
  },
  complete: {
    label: 'Đóng hoàn tất hồ sơ',
    icon: Archive,
    variant: 'secondary',
  },
};

/**
 * Chức năng: Hiển thị toàn diện hồ sơ trả hàng, tiến trình xử lý, đối soát và kích hoạt các hành động vận hành.
 *
 * @returns Đầu ra: Thẻ JSX trang chi tiết điều phối trả hàng.
 */
export default function AdminReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [returnRequest, setReturnRequest] = useState<ReturnRequestResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // State điều khiển modal đang mở
  const [activeModal, setActiveModal] = useState<AdminActionType | null>(null);

  // State hoàn tiền trực tiếp (inline VietQR + upload ảnh biên lai) khi trạng thái là WAITING_REFUND
  const inlineRefundFileRef = useRef<HTMLInputElement>(null);
  const [inlineProofImage, setInlineProofImage] = useState<File | null>(null);
  const [inlineProofPreviewUrl, setInlineProofPreviewUrl] = useState<string>('');
  const [inlineRefundNote, setInlineRefundNote] = useState<string>('');
  const [debouncedInlineNote, setDebouncedInlineNote] = useState<string>('');
  const [inlineRefundError, setInlineRefundError] = useState<string>('');
  const [isInlineRefunding, setIsInlineRefunding] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInlineNote(inlineRefundNote);
    }, 350);
    return () => clearTimeout(timer);
  }, [inlineRefundNote]);

  useEffect(() => {
    if (!inlineProofImage) {
      setInlineProofPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(inlineProofImage);
    setInlineProofPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [inlineProofImage]);

  // Tải thông tin chi tiết phiếu trả hàng
  const loadDetail = useCallback(async () => {
    if (!id || isNaN(Number(id))) {
      setErrorMessage('Mã định danh phiếu trả hàng trên đường dẫn không hợp lệ.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await returnAdminService.getReturnById(Number(id));
      if (res && res.data) {
        setReturnRequest(res.data);
      } else {
        setErrorMessage('Không tìm thấy dữ liệu phiếu trả hàng.');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể tải thông tin chi tiết phiếu trả hàng.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Trạng thái đang tải
  if (isLoading) {
    return (
      <div className="container py-20 flex flex-col items-center justify-center text-content-muted">
        <div className="w-8 h-8 border-2 border-line border-t-primary rounded-full animate-spin mb-3" />
        <p className="text-sm">Đang tải hồ sơ trả hàng #{id}...</p>
      </div>
    );
  }

  // Trạng thái gặp lỗi hoặc không tìm thấy
  if (errorMessage || !returnRequest) {
    return (
      <div className="container py-12 max-w-4xl">
        <div className="p-8 bg-surface border border-line-error rounded-sm text-center">
          <AlertCircle size={40} className="mx-auto text-status-error mb-3" />
          <h2 className="text-lg font-bold text-content-primary mb-2">Không Thể Tải Hồ Sơ</h2>
          <p className="text-sm text-content-secondary mb-6">{errorMessage}</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate('/admin/returns')} icon={ArrowLeft}>
              Về Danh Sách
            </Button>
            <Button variant="primary" onClick={loadDetail} icon={RefreshCw}>
              Thử Lại
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleInlineProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inlineRefundFileRef.current) {
      inlineRefundFileRef.current.value = '';
    }
    if (!file) return;

    const validation = validateReturnImageFiles([file], 'CHANGE_OF_MIND');
    if (!validation.isValid) {
      setInlineRefundError(validation.error || 'Tệp ảnh biên lai không hợp lệ.');
      return;
    }
    setInlineRefundError('');
    setInlineProofImage(file);
  };

  const handleInlineRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnRequest) return;
    if (!inlineProofImage) {
      setInlineRefundError('Vui lòng tải lên ảnh chụp màn hình biên lai chuyển khoản.');
      return;
    }
    if (isInlineRefunding) return;

    setIsInlineRefunding(true);
    setInlineRefundError('');
    try {
      await returnAdminService.refundReturn(
        returnRequest.id,
        { note: inlineRefundNote.trim() || undefined },
        inlineProofImage
      );
      setInlineProofImage(null);
      setInlineRefundNote('');
      await loadDetail();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi xác nhận hoàn tiền.';
      setInlineRefundError(msg);
    } finally {
      setIsInlineRefunding(false);
    }
  };

  // Chỉ hiển thị các nút điều phối thực sự khả dụng ở bước hiện tại (tránh làm nhân viên rối)
  const rawAvailableActions = getAdminAvailableActions(returnRequest);
  const availableActions = rawAvailableActions.filter((actionKey) => {
    if (actionKey === 'contactLog') return false;
    if (actionKey === 'overdueNote' && !returnRequest.isOverdue) return false;
    if (returnRequest.status === 'WAITING_CUSTOMER_FEEDBACK') {
      if (actionKey === 'restock') return false;
      if ((actionKey === 'inspect' || actionKey === 'reject') && returnRequest.customerConfirmedPlan !== false) {
        return false;
      }
    }
    if (returnRequest.status === 'WAITING_REFUND' && actionKey === 'restock') {
      return false;
    }
    return true;
  });

  const inlineQrInfo = buildDynamicVietQrUrl({
    baseQrUrl: returnRequest.refundVietQrUrl,
    bankName: returnRequest.bankName,
    accountNumber: returnRequest.accountNumber || returnRequest.bankAccountNumber,
    accountHolder: returnRequest.accountHolderName || returnRequest.bankAccountHolder,
    refundAmount: returnRequest.refundAmount,
    orderCode: returnRequest.orderCode,
    returnCode: returnRequest.returnCode,
    customNote: debouncedInlineNote,
  });
  const liveInlineQrNote = formatVietQrTransferNote(
    inlineQrInfo.defaultNote,
    inlineRefundNote
  );

  const isInspected = Boolean(returnRequest.inspectedAt);
  const isEstimatedSummary = !isInspected;
  const displayedItemsRefund = returnRequest.itemsRefundAmount || 0;
  const shippingFee = returnRequest.returnShippingFee || 0;
  const displayedNetRefund = returnRequest.refundAmount || 0;
  const generalNote = getGeneralInspectionNote(returnRequest);

  return (
    <div className="container py-8 max-w-7xl">
      {/* Breadcrumb điều hướng */}
      <nav className="flex items-center gap-2 text-xs text-content-secondary mb-4">
        <Link to="/admin/returns" className="hover:text-content-primary transition-colors">
          Quản lý trả hàng
        </Link>
        <span>/</span>
        <span className="text-content-primary font-mono font-semibold">
          {returnRequest.returnCode}
        </span>
      </nav>

      {/* Header hồ sơ */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 bg-surface border border-line-light rounded-sm mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-xl font-bold font-mono text-content-primary">
              {returnRequest.returnCode}
            </h1>
            <ReturnStatusBadge status={returnRequest.status} />
            {returnRequest.status === 'REFUNDED' && !returnRequest.restockedAt && (
              <Badge variant="warning">Chưa nhập lại kho</Badge>
            )}
            {returnRequest.isOverdue && (
              <Badge variant="error">
                <AlertTriangle size={12} className="mr-1" />
                Quá hạn SLA
              </Badge>
            )}
          </div>

          <p className="text-xs text-content-secondary flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              Mã đơn hàng: <strong className="text-content-primary font-mono">{returnRequest.orderCode}</strong>
            </span>
            <span>
              Mã khách hàng: <strong className="text-content-primary">ID #{returnRequest.userId}</strong>
            </span>
            <span>
              Khởi tạo: <strong className="text-content-primary">{formatDateTime(returnRequest.createdAt)}</strong>
            </span>
            <span>
              Cập nhật gần nhất: <strong className="text-content-primary">{formatDateTime(returnRequest.updatedAt)}</strong>
            </span>
          </p>
        </div>
      </div>

      {/* THANH TÁC VỤ ĐIỀU PHỐI (DYNAMIC ACTION BAR) */}
      <div className="p-4 bg-surface border border-line-light rounded-sm mb-6">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-line-light">
          <span className="text-xs font-bold uppercase tracking-wider text-content-muted">
            Thao tác điều phối khả dụng ({availableActions.length})
          </span>
        </div>

        {(() => {
          const isCustomerDisagreed =
            returnRequest.status === 'WAITING_CUSTOMER_FEEDBACK' &&
            returnRequest.customerConfirmedPlan === false &&
            Boolean(returnRequest.customerNote?.trim());

          return (
            <>
              {availableActions.length === 0 ? (
                <p className="text-xs text-content-muted italic">
                  {returnRequest.status === 'WAITING_CUSTOMER_FEEDBACK'
                    ? 'Đang chờ khách phản hồi, không có thao tác khả dụng.'
                    : 'Hồ sơ đã đóng hoặc hiện không có tác vụ nào khả dụng tại bước này.'}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {availableActions.map((actionKey) => {
                    const cfg = ACTION_BUTTON_CONFIGS[actionKey];
                    if (!cfg) return null;
                    const Icon = cfg.icon;
                    const buttonLabel =
                      actionKey === 'inspect' && isCustomerDisagreed
                        ? 'Kiểm định lại'
                        : cfg.label;

                    return (
                      <Button
                        key={actionKey}
                        data-testid={`btn-open-${actionKey}`}
                        variant={cfg.variant}
                        size="sm"
                        onClick={() => setActiveModal(actionKey)}
                        icon={Icon}
                      >
                        {buttonLabel}
                      </Button>
                    );
                  })}
                </div>
              )}

              {isCustomerDisagreed && (
                <div className="mt-3 text-xs font-semibold text-status-error space-y-0.5">
                  <p>Khách hàng không đồng ý với phương án của shop</p>
                  {returnRequest.customerNote && (
                    <p>Nội dung khách phản hồi: {returnRequest.customerNote}</p>
                  )}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* CHỈ HIỂN THỊ BANNER CẢNH BÁO (NẾU CÓ) — ẨN KHUNG TRẠNG THÁI DƯ THỪA */}
      <ReturnTimeline
        returnRequest={returnRequest}
        viewerRole="admin"
        hideStatusSummary
        className="mb-6"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* CỘT TRÁI (8 CỘT): DANH SÁCH SẢN PHẨM & CHI TIẾT TIỀN HOÀN */}
        <div className="lg:col-span-8 space-y-6">
          {/* Bảng sản phẩm khách yêu cầu trả */}
          <div className="p-5 bg-surface border border-line-light rounded-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-content-primary mb-3">
              Sản phẩm khách yêu cầu trả ({returnRequest.items?.length || 0})
            </h2>

            <div className="overflow-x-auto border border-line-light rounded-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface border-b border-line-light text-content-muted font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Sản phẩm</th>
                    <th className="py-2.5 px-3 text-right w-24">Đơn giá</th>
                    <th className="py-2.5 px-3 text-center w-16">SL trả</th>
                    <th className="py-2.5 px-3 text-center w-28">SL đồng ý hoàn</th>
                    <th className="py-2.5 px-3 text-center w-24">Nhập lại kho</th>
                    <th className="py-2.5 px-3 text-right w-28">Tiền hoàn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-light">
                  {(returnRequest.items || []).map((it) => {
                    const unitPrice =
                      it.itemRefundAmount && it.quantity > 0
                        ? Math.round(it.itemRefundAmount / it.quantity)
                        : 0;
                    const lineRefundDisplay = it.itemRefundAmount ?? 0;
                    const showEstimatedBadge = !isInspected && lineRefundDisplay > 0;

                    return (
                      <tr key={it.id} className="hover:bg-surface transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-semibold text-content-primary text-sm line-clamp-1">
                            {it.productName}
                          </p>
                          {it.variantInfo && (
                            <p className="text-content-muted text-xs">{it.variantInfo}</p>
                          )}
                          {it.inspectionNote && (
                            <p className="text-xs text-status-warning mt-1">
                              Ghi chú kiểm tra: {it.inspectionNote}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-content-secondary">
                          {unitPrice > 0 ? formatVND(unitPrice) : '—'}
                        </td>

                        <td className="py-3 px-3 text-center font-bold text-sm text-content-primary">
                          {it.quantity}
                        </td>

                        <td className="py-3 px-3 text-center">
                          {it.acceptedQuantity !== null && it.acceptedQuantity !== undefined ? (
                            <Badge variant={it.acceptedQuantity > 0 ? 'success' : 'error'}>
                              {it.acceptedQuantity} / {it.quantity}
                            </Badge>
                          ) : (
                            <span className="text-content-muted">Chưa kiểm tra</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center">
                          {(it.restockedQuantity ?? 0) > 0 ? (
                            <Badge variant="vip">{it.restockedQuantity} sp</Badge>
                          ) : (
                            <span className="text-content-muted">Chưa nhập</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold text-content-primary">
                          <div>{formatVND(lineRefundDisplay)}</div>
                          {showEstimatedBadge && (
                            <div className="text-[10px] font-sans font-normal text-content-muted">
                              (Tạm tính)
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Chi tiết lý do khách hàng mô tả */}
            <div className="mt-4 p-3 bg-surface-body border border-line-light rounded-sm min-w-0">
              <span className="text-xs font-bold text-content-primary block mb-1">
                Lý do trả hàng: <span>{getReturnReasonLabel(returnRequest.reason)}</span>
              </span>
              <p className="text-xs text-content-secondary whitespace-pre-line break-words [overflow-wrap:anywhere]">
                {returnRequest.reasonDetail || 'Không có mô tả chi tiết từ khách hàng.'}
              </p>
              {generalNote && (
                <p className="text-xs text-content-secondary mt-2 pt-2 border-t border-line-light break-words [overflow-wrap:anywhere]">
                  <strong className="text-content-primary">Ghi chú kiểm tra chung:</strong>{' '}
                  {generalNote}
                </p>
              )}
              {returnRequest.extensionReason && (
                <p className="text-xs text-content-secondary mt-2 pt-2 border-t border-line-light break-words [overflow-wrap:anywhere]">
                  <strong className="text-content-primary">Lý do gia hạn bàn giao:</strong>{' '}
                  {returnRequest.extensionReason}
                  {(returnRequest.previousHandoverDeadline || returnRequest.handoverDeadline) && (
                    <span className="block mt-1 text-[11px] text-content-muted">
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
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Thẻ chi tiết tiền hoàn */}
          <div className="p-5 bg-surface border border-line-light rounded-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-line-light">
              <div className="flex items-center gap-2">
                <DollarSign size={18} className="text-content-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-content-primary">
                  Chi tiết tiền hoàn
                </h2>
              </div>
              {isInspected ? (
                <Badge variant="success">Đã chốt sau kiểm tra</Badge>
              ) : (
                <Badge variant="default">Tạm tính — Chưa kiểm tra hàng</Badge>
              )}
            </div>

            <div className="p-4 bg-surface-body border border-line-light rounded-sm space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-content-secondary">
                  {isEstimatedSummary
                    ? 'Giá trị sản phẩm khách trả (tạm tính):'
                    : 'Tiền hàng đồng ý hoàn:'}
                </span>
                <span className="font-mono font-semibold text-content-primary">
                  {formatVND(displayedItemsRefund)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-content-secondary">
                  Phí vận chuyển chiều hoàn (khách chịu):
                </span>
                {(() => {
                  const feeDisplay = formatReturnShippingFeeDisplay(returnRequest);
                  return (
                    <span
                      className={
                        feeDisplay.isDeduction
                          ? 'font-mono font-semibold text-status-error'
                          : 'font-mono text-content-muted'
                      }
                    >
                      {feeDisplay.text}
                    </span>
                  );
                })()}
              </div>

              <div className="border-t border-line-light pt-3 flex items-center justify-between gap-4">
                <span className="font-bold text-content-primary">
                  {isEstimatedSummary
                    ? 'Số tiền dự kiến hoàn cho khách:'
                    : 'Số tiền thực tế hoàn cho khách:'}
                </span>
                <span className="font-mono font-bold text-lg text-accent-red">
                  {formatVND(displayedNetRefund)}
                </span>
              </div>
            </div>

            {!isInspected && (
              <p className="text-xs text-content-muted mt-3">
                Số tiền hoàn chính thức sẽ được hệ thống chốt sau khi kho nhận và kiểm tra tình trạng sản phẩm.
                {returnRequest.reason === 'CHANGE_OF_MIND' &&
                  ' Do khách đổi ý, phí vận chuyển chiều hoàn sẽ được khấu trừ sau khi có cước GHN.'}
              </p>
            )}

            {returnRequest.proposedChangeOfMind && (
              <div className="mt-3 p-2.5 bg-surface-body border-l-2 border-line text-xs text-content-secondary">
                Đơn trả được tính theo trường hợp <strong>Khách đổi ý</strong>, trừ phí gửi trả{' '}
                {formatVND(shippingFee)} vào tiền hoàn.
              </div>
            )}
          </div>

          {/* Thư viện ảnh minh chứng do khách tải lên */}
          <div className="p-5 bg-surface border border-line-light rounded-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-content-primary mb-3">
              Ảnh minh chứng từ khách hàng ({returnRequest.images?.length || 0})
            </h2>
            <ReturnImageGallery images={returnRequest.images} />
          </div>
        </div>

        {/* CỘT PHẢI (4 CỘT): VẬN CHUYỂN CHIỀU HOÀN, TÀI KHOẢN NGÂN HÀNG, DẤU VẾT NHÂN SỰ & CSKH LOG */}
        <div className="lg:col-span-4 space-y-6">
          {/* Thông tin vận chuyển chiều hoàn (GHN) */}
          <ReturnShippingInfoCard returnRequest={returnRequest} viewerRole="admin" />

          {/* Thông tin tài khoản ngân hàng */}
          <div className="p-5 bg-surface border border-line-light rounded-sm">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-line-light">
              <CreditCard size={18} className="text-content-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-content-primary">
                Tài khoản nhận tiền hoàn
              </h2>
            </div>

            <div className="space-y-2.5 text-xs text-content-primary">
              <div>
                <span className="text-content-muted block">Ngân hàng:</span>
                <div className="flex items-center gap-1 font-semibold mt-0.5">
                  <Building2 size={13} className="text-content-muted" />
                  <span>{returnRequest.bankName || 'Chưa cung cấp'}</span>
                </div>
              </div>

              <div>
                <span className="text-content-muted block">Số tài khoản:</span>
                <div className="flex items-center gap-1 font-semibold font-mono mt-0.5">
                  <Hash size={13} className="text-content-muted" />
                  <span>{returnRequest.accountNumber || returnRequest.bankAccountNumber || 'Chưa cung cấp'}</span>
                </div>
              </div>

              <div>
                <span className="text-content-muted block">Chủ tài khoản:</span>
                <div className="flex items-center gap-1 font-semibold mt-0.5">
                  <User size={13} className="text-content-muted" />
                  <span>{returnRequest.accountHolderName || returnRequest.bankAccountHolder || 'Chưa cung cấp'}</span>
                </div>
              </div>

              {returnRequest.refundTransactionCode && (
                <div className="pt-2 border-t border-line-light">
                  <span className="text-content-muted block">Mã giao dịch / Số UNC:</span>
                  <span className="font-mono font-bold text-sm text-status-success mt-0.5 block">
                    {returnRequest.refundTransactionCode}
                  </span>
                </div>
              )}

              {returnRequest.refundProofImageUrl && (
                <div className="pt-2 border-t border-line-light">
                  <span className="text-content-muted block mb-1">Ảnh biên lai hoàn tiền:</span>
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

              {/* Khu vực quét VietQR & upload biên lai hoàn tiền trực tiếp khi phiếu ở WAITING_REFUND */}
              {returnRequest.status === 'WAITING_REFUND' && (
                <form
                  onSubmit={handleInlineRefundSubmit}
                  className="pt-3 mt-3 border-t border-line-light space-y-3"
                >
                  <div className="p-3 bg-surface-body border border-line-light rounded-sm text-center">
                    {inlineQrInfo.qrUrl ? (
                      <>
                        <img
                          data-testid="img-refund-vietqr"
                          src={inlineQrInfo.qrUrl}
                          alt="Mã VietQR hoàn tiền"
                          className="mx-auto w-48 h-48 object-contain border border-line-light rounded-sm bg-surface-body"
                        />
                        <p className="text-[11px] text-content-secondary mt-1.5">
                          Quét mã bằng ứng dụng ngân hàng để chuyển khoản
                        </p>
                        <p className="text-[11px] text-content-muted mt-1">
                          Nội dung QR:{' '}
                          <span className="font-mono font-semibold text-content-primary">
                            {liveInlineQrNote}
                          </span>
                        </p>
                      </>
                    ) : (
                      <p className="text-[11px] text-content-muted italic">
                        Chưa có mã VietQR (khách chưa cung cấp đủ STK)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-content-primary mb-1">
                      Ảnh biên lai chuyển khoản <span className="text-status-error">*</span>
                    </label>
                    <input
                      ref={inlineRefundFileRef}
                      data-testid="upload-refund-proof"
                      type="file"
                      accept={ACCEPTED_IMAGE_EXTENSIONS.join(', ')}
                      onChange={handleInlineProofFileChange}
                      disabled={isInlineRefunding}
                      className="hidden"
                    />
                    {inlineProofPreviewUrl && inlineProofImage ? (
                      <div className="p-2 bg-surface-body border border-line-light rounded-sm flex items-center gap-2.5">
                        <img
                          src={inlineProofPreviewUrl}
                          alt="Xem trước biên lai"
                          className="w-14 h-14 object-contain rounded-sm border border-line-light shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-content-primary">
                            {inlineProofImage.name}
                          </p>
                          <button
                            type="button"
                            onClick={() => inlineRefundFileRef.current?.click()}
                            className="text-[11px] text-primary underline cursor-pointer mt-0.5"
                          >
                            Đổi ảnh
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInlineProofImage(null)}
                          className="p-1 text-content-muted hover:text-status-error cursor-pointer"
                          aria-label="Xóa ảnh biên lai"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => inlineRefundFileRef.current?.click()}
                        disabled={isInlineRefunding}
                        className="w-full p-3 border border-dashed border-line rounded-sm bg-surface-body hover:border-line-focus transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer"
                      >
                        <UploadCloud size={18} className="text-content-muted" />
                        <span className="font-semibold text-content-primary">
                          Chọn ảnh biên lai chuyển khoản
                        </span>
                      </button>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      value={inlineRefundNote}
                      onChange={(e) => setInlineRefundNote(e.target.value)}
                      maxLength={500}
                      placeholder="Ghi chú hoàn tiền (tùy chọn)..."
                      disabled={isInlineRefunding}
                      className="h-9 w-full rounded-sm border border-line bg-surface-body px-2.5 text-xs text-content-primary focus:border-line-focus focus:outline-none"
                    />
                  </div>

                  {inlineRefundError && (
                    <div className="flex items-center gap-1.5 p-2 bg-surface-body border border-line-error rounded-sm text-status-error text-xs">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{inlineRefundError}</span>
                    </div>
                  )}

                  <Button
                    data-testid="btn-confirm-refund"
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={isInlineRefunding}
                    icon={CreditCard}
                    className="w-full"
                  >
                    Xác Nhận Đã Hoàn Tiền
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Lịch sử xử lý & nhân sự phụ trách */}
          <div className="p-5 bg-surface border border-line-light rounded-sm">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-line-light">
              <UserCheck size={18} className="text-content-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-content-primary">
                Lịch sử xử lý
              </h2>
            </div>

            <div className="divide-y divide-line-light text-xs">
              {[
                {
                  label: 'Duyệt yêu cầu',
                  time: returnRequest.approvedAt,
                  staffId: returnRequest.approvedBy,
                  emptyText: 'Chưa duyệt',
                },
                {
                  label: 'Hạn gửi hàng',
                  time: returnRequest.handoverDeadline,
                  subText: returnRequest.previousHandoverDeadline
                    ? `Hạn cũ: ${formatDateTime(returnRequest.previousHandoverDeadline)}`
                    : undefined,
                  emptyText: 'Chưa có',
                },
                ...(returnRequest.handoverReminderSentAt
                  ? [
                      {
                        label: 'Nhắc khách gửi hàng',
                        time: returnRequest.handoverReminderSentAt,
                        emptyText: '',
                      },
                    ]
                  : []),
                {
                  label: 'Khách gửi hàng',
                  time: returnRequest.handedOverAt,
                  emptyText: 'Chưa gửi',
                },
                {
                  label: 'Kho nhận hàng',
                  time: returnRequest.receivedAt,
                  emptyText: 'Chưa nhận',
                },
                {
                  label: 'Kiểm tra chất lượng',
                  time: returnRequest.inspectedAt,
                  staffId: returnRequest.inspectedBy,
                  emptyText: 'Chưa kiểm tra',
                },
                ...(returnRequest.inspectionResultSentAt
                  ? [
                      {
                        label: 'Gửi kết quả kiểm tra',
                        time: returnRequest.inspectionResultSentAt,
                        emptyText: '',
                      },
                    ]
                  : []),
                ...(returnRequest.feedbackReminderSentAt
                  ? [
                      {
                        label: 'Nhắc khách phản hồi',
                        time: returnRequest.feedbackReminderSentAt,
                        emptyText: '',
                      },
                    ]
                  : []),
                ...(returnRequest.customerRespondedAt
                  ? [
                      {
                        label: 'Khách phản hồi phương án',
                        time: returnRequest.customerRespondedAt,
                        emptyText: '',
                      },
                    ]
                  : []),
                ...(returnRequest.refundEligibleAt
                  ? [
                      {
                        label: 'Đủ điều kiện hoàn tiền',
                        time: returnRequest.refundEligibleAt,
                        emptyText: '',
                      },
                    ]
                  : []),
                {
                  label: 'Chuyển khoản hoàn tiền',
                  time: returnRequest.refundedAt,
                  staffId: returnRequest.refundedBy,
                  emptyText: 'Chưa hoàn tiền',
                },
                {
                  label: 'Nhập lại kho bán',
                  time: returnRequest.restockedAt,
                  staffId: returnRequest.restockedBy,
                  emptyText: 'Chưa nhập kho',
                },
                ...(returnRequest.resolvedAt
                  ? [
                      {
                        label: 'Giải quyết xong',
                        time: returnRequest.resolvedAt,
                        emptyText: '',
                      },
                    ]
                  : []),
                {
                  label: 'Đóng hồ sơ',
                  time: returnRequest.completedAt,
                  emptyText: 'Chưa đóng',
                },
              ].map((step) => (
                <div key={step.label} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="text-content-secondary font-medium shrink-0">{step.label}</span>
                  <div className="text-right">
                    {step.time ? (
                      <>
                        <div className="font-mono text-content-primary">
                          {formatDateTime(step.time)}
                        </div>
                        {'subText' in step && step.subText ? (
                          <div className="text-[11px] text-content-muted line-through">
                            {step.subText}
                          </div>
                        ) : null}
                        {step.staffId ? (
                          <div className="text-[11px] text-content-muted">
                            Nhân viên #{step.staffId}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-content-muted italic">{step.emptyText}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nhật ký liên hệ CSKH & Niêm phong */}
          <div className="p-5 bg-surface border border-line-light rounded-sm">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-line-light">
              <div className="flex items-center gap-2">
                <PhoneCall size={18} className="text-content-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-content-primary">
                  Nhật ký CSKH
                </h2>
              </div>
              {rawAvailableActions.includes('contactLog') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveModal('contactLog')}
                >
                  Ghi Chú
                </Button>
              )}
            </div>

            {returnRequest.staffContactLog ? (
              <div className="p-3 bg-surface-body border border-line-light rounded-sm text-xs text-content-secondary font-mono whitespace-pre-line max-h-48 overflow-y-auto">
                {returnRequest.staffContactLog}
              </div>
            ) : (
              <p className="text-xs text-content-muted italic">
                Chưa có nhật ký liên hệ hoặc ghi chú niêm phong nào được ghi nhận.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* RENDER CÁC MODALS TÁC VỤ KHI ĐƯỢC KÍCH HOẠT */}
      {returnRequest && (
        <>
          <ReturnApproveModal
            isOpen={activeModal === 'approve'}
            onClose={() => setActiveModal(null)}
            returnRequest={returnRequest}
            onSuccess={loadDetail}
          />

          <ReturnRejectModal
            isOpen={activeModal === 'reject'}
            onClose={() => setActiveModal(null)}
            returnRequest={returnRequest}
            onSuccess={loadDetail}
          />

          <ReturnHandoverModal
            isOpen={activeModal === 'handover'}
            onClose={() => setActiveModal(null)}
            returnRequest={returnRequest}
            onSuccess={loadDetail}
          />

          <ReturnExtendHandoverModal
            isOpen={activeModal === 'extendHandover'}
            onClose={() => setActiveModal(null)}
            returnRequest={returnRequest}
            onSuccess={loadDetail}
          />

          <ReturnReceiveModal
            isOpen={activeModal === 'receive'}
            onClose={() => setActiveModal(null)}
            returnRequest={returnRequest}
            onSuccess={loadDetail}
          />

          <ReturnRefundModal
            isOpen={activeModal === 'refund'}
            onClose={() => setActiveModal(null)}
            returnRequest={returnRequest}
            onSuccess={loadDetail}
          />

          <ReturnOverdueNoteModal
            isOpen={activeModal === 'overdueNote'}
            onClose={() => setActiveModal(null)}
            returnRequest={returnRequest}
            onSuccess={loadDetail}
          />

          <ReturnContactLogModal
            isOpen={activeModal === 'contactLog'}
            onClose={() => setActiveModal(null)}
            returnRequest={returnRequest}
            onSuccess={loadDetail}
          />

          <ReturnCompleteModal
            isOpen={activeModal === 'complete'}
            onClose={() => setActiveModal(null)}
            returnRequest={returnRequest}
            onSuccess={loadDetail}
          />

          <ReturnInspectModal
            isOpen={activeModal === 'inspect'}
            onClose={() => setActiveModal(null)}
            returnRequest={returnRequest}
            onSuccess={loadDetail}
          />

          <ReturnRestockModal
            isOpen={activeModal === 'restock'}
            onClose={() => setActiveModal(null)}
            returnRequest={returnRequest}
            onSuccess={loadDetail}
          />
        </>
      )}
    </div>
  );
}
