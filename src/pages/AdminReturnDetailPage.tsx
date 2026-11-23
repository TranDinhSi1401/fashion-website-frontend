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

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import type { ReturnRequestResponse } from '../types/return';
import { returnAdminService } from '../services/returnAdminService';
import { RETURN_STATUS_META } from '../constants/returnMeta';
import {
  getAdminAvailableActions,
  AdminActionType,
  formatVND,
  formatDateTime,
  getReturnReasonLabel,
} from '../utils/returnHelpers';
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

  // Danh sách các hành động quản trị khả dụng tại trạng thái hiện tại
  const availableActions = getAdminAvailableActions(returnRequest);

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

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/returns')}
            icon={ArrowLeft}
          >
            Quay Lại
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDetail}
            icon={RefreshCw}
          >
            Tải Lại
          </Button>
        </div>
      </div>

      {/* THANH TÁC VỤ ĐIỀU PHỐI (DYNAMIC ACTION BAR) */}
      <div className="p-4 bg-surface border border-line-light rounded-sm mb-6">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-line-light">
          <span className="text-xs font-bold uppercase tracking-wider text-content-muted">
            Thao tác điều phối khả dụng ({availableActions.length})
          </span>
          <span className="text-xs text-content-muted">
            Trạng thái hiện tại:{' '}
            <strong>{RETURN_STATUS_META[returnRequest.status]?.label || returnRequest.status}</strong>
          </span>
        </div>

        {returnRequest.status === 'WAITING_CUSTOMER_FEEDBACK' &&
          returnRequest.customerConfirmedPlan === false && (
            <div className="mb-3 rounded-sm border border-status-warning bg-surface px-3 py-2 text-xs text-content-primary">
              Khách hàng đã bấm <strong>Không đồng ý phương án</strong>
              {returnRequest.customerNote ? ` ("${returnRequest.customerNote}")` : ''}. Quản lý có thể trao đổi và bấm{' '}
              <strong>Kiểm định QC</strong> để điều chỉnh lại phương án xử lý.
            </div>
          )}

        {availableActions.length === 0 ? (
          <p className="text-xs text-content-muted italic">
            Hồ sơ đã đóng hoặc hiện không có tác vụ nào khả dụng tại bước này.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {availableActions.map((actionKey) => {
              const cfg = ACTION_BUTTON_CONFIGS[actionKey];
              if (!cfg) return null;
              const Icon = cfg.icon;

              return (
                <Button
                  key={actionKey}
                  variant={cfg.variant}
                  size="sm"
                  onClick={() => setActiveModal(actionKey)}
                  icon={Icon}
                >
                  {cfg.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* TIẾN TRÌNH 6 BƯỚC VÒNG ĐỜI (RETURN TIMELINE) */}
      <div className="mb-6">
        <ReturnTimeline returnRequest={returnRequest} viewerRole="admin" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* CỘT TRÁI (8 CỘT): DANH SÁCH SẢN PHẨM & ĐỐI SOÁT TÀI CHÍNH */}
        <div className="lg:col-span-8 space-y-6">
          {/* Bảng danh sách sản phẩm yêu cầu trả */}
          <div className="p-5 bg-surface border border-line-light rounded-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-content-primary mb-3">
              Danh sách sản phẩm yêu cầu trả ({returnRequest.items?.length || 0})
            </h2>

            <div className="overflow-x-auto border border-line-light rounded-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface border-b border-line-light text-content-muted font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Sản phẩm</th>
                    <th className="py-2.5 px-3 text-center w-20">SL Trả</th>
                    <th className="py-2.5 px-3 text-center w-24">QC Duyệt</th>
                    <th className="py-2.5 px-3 text-center w-24">Nhập kho</th>
                    <th className="py-2.5 px-3 text-right w-28">Tiền duyệt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-light">
                  {(returnRequest.items || []).map((it) => (
                    <tr key={it.id} className="hover:bg-surface transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-content-primary text-sm line-clamp-1">
                          {it.productName}
                        </p>
                        {it.variantInfo && (
                          <p className="text-content-muted text-xs">{it.variantInfo}</p>
                        )}
                        {it.inspectionNote && (
                          <p className="text-xs text-status-warning mt-1 font-mono">
                            QC: {it.inspectionNote}
                          </p>
                        )}
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
                          <span className="text-content-muted">Chưa QC</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {it.restockedQuantity !== null && it.restockedQuantity !== undefined ? (
                          <Badge variant="vip">
                            {it.restockedQuantity} món
                          </Badge>
                        ) : (
                          <span className="text-content-muted">Chưa nhập</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-content-primary">
                        {it.itemRefundAmount !== null && it.itemRefundAmount !== undefined
                          ? formatVND(it.itemRefundAmount)
                          : '—'}
                      </td>
                    </tr>
                  ))}
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
              {returnRequest.rejectionReason && returnRequest.status !== 'REJECTED' && (
                <p className="text-xs text-content-secondary mt-2 pt-2 border-t border-line-light break-words [overflow-wrap:anywhere]">
                  <strong className="text-content-primary">Ghi chú kiểm định chung:</strong>{' '}
                  {returnRequest.rejectionReason}
                </p>
              )}
              {returnRequest.extensionReason && (
                <p className="text-xs text-content-secondary mt-2 pt-2 border-t border-line-light break-words [overflow-wrap:anywhere]">
                  <strong className="text-content-primary">Lý do gia hạn bàn giao:</strong>{' '}
                  {returnRequest.extensionReason}
                </p>
              )}
            </div>
          </div>

          {/* Thẻ đối soát tài chính */}
          <div className="p-5 bg-surface border border-line-light rounded-sm">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-line-light">
              <DollarSign size={18} className="text-content-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-content-primary">
                Đối soát tài chính hoàn tiền
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs mb-4">
              <div className="p-3 bg-surface-body border border-line-light rounded-sm">
                <span className="text-content-muted block mb-1">Tổng tiền hàng được duyệt:</span>
                <span className="font-mono font-bold text-base text-content-primary">
                  {formatVND(returnRequest.itemsRefundAmount || 0)}
                </span>
              </div>

              <div className="p-3 bg-surface-body border border-line-light rounded-sm">
                <span className="text-content-muted block mb-1">Phí vận chuyển khách chịu:</span>
                <span className="font-mono font-bold text-base text-status-error">
                  - {formatVND(returnRequest.returnShippingFee || 0)}
                </span>
              </div>

              <div className="p-3 bg-surface-body border border-line-light rounded-sm">
                <span className="text-content-muted block mb-1">Số tiền thực hoàn cho khách:</span>
                <span className="font-mono font-bold text-lg text-accent-red">
                  {formatVND(returnRequest.refundAmount || 0)}
                </span>
              </div>
            </div>

            {returnRequest.proposedChangeOfMind && (
              <div className="p-2.5 bg-surface-body border-l-2 border-line text-xs text-content-secondary">
                Lưu ý: Hồ sơ này đã được đề xuất chuyển sang lý do <strong>Đổi ý</strong> sau kiểm định QC,
                khấu trừ phí vận chuyển {formatVND(returnRequest.returnShippingFee || 0)} vào tổng tiền hoàn.
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
            </div>
          </div>

          {/* Dấu vết kiểm toán nhân sự (Personnel Audit Trail) */}
          <div className="p-5 bg-surface border border-line-light rounded-sm">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-line-light">
              <UserCheck size={18} className="text-content-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-content-primary">
                Dấu vết nhân sự &amp; Mốc xử lý
              </h2>
            </div>

            <div className="space-y-2 text-xs text-content-secondary">
              <div className="flex justify-between">
                <span>Nhân viên duyệt:</span>
                <span className="font-mono font-semibold text-content-primary">
                  {returnRequest.approvedBy ? `ID #${returnRequest.approvedBy}` : '—'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Thời điểm duyệt:</span>
                <span className="text-content-primary font-mono">
                  {returnRequest.approvedAt ? formatDateTime(returnRequest.approvedAt) : '—'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Hạn bàn giao:</span>
                <span className="text-content-primary font-mono">
                  {returnRequest.handoverDeadline ? formatDateTime(returnRequest.handoverDeadline) : '—'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Đã nhắc bàn giao:</span>
                <span className="text-content-primary font-mono">
                  {returnRequest.handoverReminderSentAt
                    ? formatDateTime(returnRequest.handoverReminderSentAt)
                    : 'Chưa gửi'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Bàn giao shipper:</span>
                <span className="text-content-primary font-mono">
                  {returnRequest.handedOverAt ? formatDateTime(returnRequest.handedOverAt) : '—'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Kho nhận hàng:</span>
                <span className="text-content-primary font-mono">
                  {returnRequest.receivedAt ? formatDateTime(returnRequest.receivedAt) : '—'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Nhân viên QC:</span>
                <span className="font-mono font-semibold text-content-primary">
                  {returnRequest.inspectedBy ? `ID #${returnRequest.inspectedBy}` : '—'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Thời điểm QC:</span>
                <span className="text-content-primary font-mono">
                  {returnRequest.inspectedAt ? formatDateTime(returnRequest.inspectedAt) : '—'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Nhân viên hoàn tiền:</span>
                <span className="font-mono font-semibold text-content-primary">
                  {returnRequest.refundedBy ? `ID #${returnRequest.refundedBy}` : '—'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Thời điểm hoàn tiền:</span>
                <span className="text-content-primary font-mono">
                  {returnRequest.refundedAt ? formatDateTime(returnRequest.refundedAt) : '—'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Nhân viên nhập kho:</span>
                <span className="font-mono font-semibold text-content-primary">
                  {returnRequest.restockedBy ? `ID #${returnRequest.restockedBy}` : '—'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Thời điểm nhập kho:</span>
                <span className="text-content-primary font-mono">
                  {returnRequest.restockedAt ? formatDateTime(returnRequest.restockedAt) : '—'}
                </span>
              </div>

              <div className="flex justify-between pt-1 border-t border-line-light">
                <span>Đóng hoàn tất:</span>
                <span className="text-content-primary font-mono">
                  {returnRequest.completedAt ? formatDateTime(returnRequest.completedAt) : 'Chưa đóng'}
                </span>
              </div>
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
              {availableActions.includes('contactLog') && (
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
