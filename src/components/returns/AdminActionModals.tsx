/**
 * Module tập hợp 8 Contextual Modals và 1 Complete Confirmation Dialog phục vụ thao tác Quản trị & Vận hành (A2).
 * Tích hợp chặt chẽ với returnAdminService, đảm bảo bảo vệ double-click (pessimistic lock),
 * kiểm tra hợp lệ các trường bắt buộc, hiển thị đối soát tài chính và dấu vết kiểm toán.
 *
 * Danh sách modals:
 * 1. ReturnApproveModal: Duyệt yêu cầu & gửi hướng dẫn đóng gói
 * 2. ReturnRejectModal: Từ chối yêu cầu kèm lý do bắt buộc
 * 3. ReturnHandoverModal: Xác nhận khách bàn giao hàng cho shipper
 * 4. ReturnExtendHandoverModal: Gia hạn thời hạn bàn giao (+3 ngày lịch)
 * 5. ReturnReceiveModal: Xác nhận kho đã nhận kiện hàng hoàn
 * 6. ReturnRefundModal: Xác nhận kế toán chuyển khoản hoàn tiền kèm mã UNC
 * 7. ReturnOverdueNoteModal: Giải trình trễ hạn SLA & cam kết hạn hoàn thành mới
 * 8. ReturnContactLogModal: Ghi nhật ký liên hệ CSKH / niêm phong kho
 * 9. ReturnCompleteModal: Hộp thoại xác nhận đóng hoàn tất hồ sơ
 */

import React, { useState, useEffect, useRef } from 'react';
import {
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
  UploadCloud,
  X,
} from 'lucide-react';
import type { ReturnRequestResponse } from '../../types/return';
import { returnAdminService } from '../../services/returnAdminService';
import {
  formatVND,
  formatDateTime,
  toLocalIsoDateTimeString,
  validateReturnImageFiles,
  ACCEPTED_IMAGE_EXTENSIONS,
  isSelfDropOffReturn,
} from '../../utils/returnHelpers';
import { buildDynamicVietQrUrl } from '../../constants/banks';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';

/**
 * Hàm tiện ích chuyển đổi đối tượng Date sang chuỗi format của input type="datetime-local" (YYYY-MM-DDTHH:mm).
 *
 * @param date Ngày cần chuyển đổi (mặc định là hiện tại).
 * @returns Chuỗi định dạng YYYY-MM-DDTHH:mm.
 */
function toDatetimeLocalString(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// ============================================================================
// 1. MODAL DUYỆT YÊU CẦU (RETURN APPROVE MODAL)
// ============================================================================

export interface ReturnApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRequest: ReturnRequestResponse;
  onSuccess: () => void;
}

/**
 * Chức năng: Modal phê duyệt yêu cầu trả hàng, gửi hướng dẫn đóng gói và gửi hàng cho khách (Bước 2).
 *
 * @param props Đầu vào: Thuộc tính điều khiển hiển thị và thông tin phiếu trả hàng.
 * @returns Đầu ra: Thẻ JSX Modal phê duyệt.
 */
export function ReturnApproveModal({
  isOpen,
  onClose,
  returnRequest,
  onSuccess,
}: ReturnApproveModalProps) {
  const isSelfDropOff = isSelfDropOffReturn(returnRequest);
  const [instructionNote, setInstructionNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setInstructionNote(
        isSelfDropOff
          ? 'Quý khách vui lòng đóng gói sản phẩm nguyên vẹn và mang trực tiếp đến cửa hàng trong vòng 7 ngày làm việc.'
          : 'Quý khách vui lòng đóng gói sản phẩm nguyên vẹn vào hộp, dán kín miệng hộp và chờ shipper liên hệ lấy hàng trong vòng 7 ngày làm việc.'
      );
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen, isSelfDropOff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await returnAdminService.approveReturn(returnRequest.id, {
        instructionNote: instructionNote.trim() || undefined,
        autoCreateShippingOrder: !isSelfDropOff,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi duyệt yêu cầu.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Duyệt yêu cầu trả hàng" size="size-guide">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 bg-surface border border-line-light rounded-sm">
          <CheckCircle2 size={20} className="text-status-success shrink-0 mt-0.5" />
          <div className="text-sm text-content-primary">
            <p className="font-semibold">
              Phê duyệt phiếu yêu cầu: <span className="font-mono">{returnRequest.returnCode}</span>
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-surface border border-line-light rounded-sm text-xs text-content-secondary">
          {isSelfDropOff
            ? 'Khách đã chọn tự mang hàng đến cửa hàng (phí ship 0đ)'
            : 'Khách đã chọn gửi hàng qua Giao Hàng Nhanh (GHN) — Hệ thống sẽ tự động tạo đơn lấy hàng khi duyệt.'}
        </div>

        <div>
          <label className="block text-sm font-semibold text-content-primary mb-1.5">
            Hướng dẫn đóng gói &amp; gửi hàng cho khách (tùy chọn)
          </label>
          <Input
            multiline
            name="instructionNote"
            data-testid="textarea-instruction-note"
            rows={4}
            value={instructionNote}
            onChange={(e) => setInstructionNote(e.target.value)}
            placeholder="Nhập hướng dẫn đóng gói..."
            disabled={isSubmitting}
          />
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-surface border border-line-error rounded-sm text-status-error text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-line-light">
          <Button data-testid="btn-close-modal" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Đóng
          </Button>
          <Button data-testid="btn-confirm-approve" type="submit" variant="primary" loading={isSubmitting}>
            Xác Nhận Duyệt
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// 2. MODAL TỪ CHỐI YÊU CẦU (RETURN REJECT MODAL)
// ============================================================================

export interface ReturnRejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRequest: ReturnRequestResponse;
  onSuccess: () => void;
}

/**
 * Chức năng: Modal từ chối yêu cầu trả hàng kèm lý do bắt buộc.
 *
 * @param props Đầu vào: Thuộc tính điều khiển hiển thị và thông tin phiếu trả hàng.
 * @returns Đầu ra: Thẻ JSX Modal từ chối.
 */
export function ReturnRejectModal({
  isOpen,
  onClose,
  returnRequest,
  onSuccess,
}: ReturnRejectModalProps) {
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setRejectionReason('');
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rejectionReason.trim()) {
      setErrorMessage('Vui lòng nhập lý do từ chối yêu cầu trả hàng.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await returnAdminService.rejectReturn(returnRequest.id, {
        rejectionReason: rejectionReason.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi từ chối yêu cầu.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Từ chối yêu cầu trả hàng" size="size-guide">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 bg-surface border border-line-error rounded-sm">
          <XCircle size={20} className="text-status-error shrink-0 mt-0.5" />
          <div className="text-sm text-content-primary">
            <p className="font-semibold">
              Từ chối phiếu yêu cầu: <span className="font-mono">{returnRequest.returnCode}</span>
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-content-primary mb-1.5">
            Lý do từ chối yêu cầu <span className="text-status-error">*</span>
          </label>
          <Input
            multiline
            rows={4}
            value={rejectionReason}
            onChange={(e) => {
              setRejectionReason(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
            placeholder="Nhập chi tiết lý do từ chối (ví dụ: sản phẩm không đúng quy cách, lỗi do người dùng cố ý làm rách...)"
            disabled={isSubmitting}
          />
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-surface border border-line-error rounded-sm text-status-error text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-line-light">
          <Button data-testid="btn-close-modal" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Đóng
          </Button>
          <Button data-testid="btn-confirm-reject" type="submit" variant="danger" loading={isSubmitting}>
            Xác Nhận Từ Chối
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// 3. MODAL BÀN GIAO VẬN CHUYỂN (RETURN HANDOVER MODAL)
// ============================================================================

export interface ReturnHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRequest: ReturnRequestResponse;
  onSuccess: () => void;
}

/**
 * Chức năng: Modal ghi nhận thời điểm khách bàn giao hàng cho shipper và mã vận đơn (Bước 3).
 *
 * @param props Đầu vào: Thuộc tính điều khiển hiển thị và thông tin phiếu trả hàng.
 * @returns Đầu ra: Thẻ JSX Modal bàn giao shipper.
 */
export function ReturnHandoverModal({
  isOpen,
  onClose,
  returnRequest,
  onSuccess,
}: ReturnHandoverModalProps) {
  const [handedOverAt, setHandedOverAt] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setHandedOverAt(toDatetimeLocalString());
      setNote('');
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const isoHandedOver = toLocalIsoDateTimeString(handedOverAt);
      await returnAdminService.confirmHandover(returnRequest.id, {
        handedOverAt: isoHandedOver,
        note: note.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi xác nhận bàn giao.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Xác nhận bàn giao vận chuyển" size="size-guide">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 bg-surface border border-line-light rounded-sm">
          <Truck size={20} className="text-content-primary shrink-0 mt-0.5" />
          <div className="text-sm text-content-primary">
            <p className="font-semibold mb-1">
              Ghi nhận shipper lấy hàng: <span className="font-mono">{returnRequest.returnCode}</span>
            </p>
            <p className="text-content-secondary text-xs">
              Sau khi xác nhận bàn giao, khách hàng sẽ không thể chủ động hủy yêu cầu trả hàng.
            </p>
          </div>
        </div>

        <div className="text-xs text-content-muted">
          Thời điểm bàn giao thực tế:{' '}
          <span className="font-mono">{formatDateTime(handedOverAt)}</span>
        </div>

        <div>
          <label className="block text-sm font-semibold text-content-primary mb-1.5">
            Ghi chú (tùy chọn)
          </label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: GHN - Mã VĐ: 8493021948 - Shipper Nguyễn Văn A"
            disabled={isSubmitting}
          />
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-surface border border-line-error rounded-sm text-status-error text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-line-light">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Đóng
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Xác Nhận Bàn Giao
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// 4. MODAL GIA HẠN THỜI HẠN BÀN GIAO (RETURN EXTEND HANDOVER MODAL)
// ============================================================================

export interface ReturnExtendHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRequest: ReturnRequestResponse;
  onSuccess: () => void;
}

/**
 * Chức năng: Modal gia hạn thời hạn bàn giao hàng thêm 3 ngày lịch (Bước 3).
 *
 * @param props Đầu vào: Thuộc tính điều khiển hiển thị và thông tin phiếu trả hàng.
 * @returns Đầu ra: Thẻ JSX Modal gia hạn.
 */
export function ReturnExtendHandoverModal({
  isOpen,
  onClose,
  returnRequest,
  onSuccess,
}: ReturnExtendHandoverModalProps) {
  const [extensionReason, setExtensionReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setExtensionReason('');
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!extensionReason.trim()) {
      setErrorMessage('Vui lòng nhập lý do gia hạn thời hạn bàn giao.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await returnAdminService.extendHandover(returnRequest.id, {
        extensionReason: extensionReason.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi gia hạn.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gia hạn thời hạn bàn giao hàng" size="size-guide">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 bg-surface border border-line-light rounded-sm">
          <CalendarClock size={20} className="text-content-primary shrink-0 mt-0.5" />
          <div className="text-sm text-content-primary">
            <p className="font-semibold mb-1">
              Gia hạn cho phiếu: <span className="font-mono">{returnRequest.returnCode}</span>
            </p>
            <p className="text-content-secondary text-xs">
              Hệ thống sẽ cộng thêm <strong>3 ngày lịch</strong> vào thời hạn bàn giao hiện tại để
              khách hàng có thêm thời gian sắp xếp giao hàng cho shipper.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-content-primary mb-1.5">
            Lý do gia hạn bàn giao <span className="text-status-error">*</span>
          </label>
          <Input
            multiline
            rows={3}
            value={extensionReason}
            onChange={(e) => {
              setExtensionReason(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
            placeholder="Ví dụ: Khách hàng đi công tác đột xuất, xin dời lịch gửi hàng thêm 3 ngày..."
            disabled={isSubmitting}
          />
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-surface border border-line-error rounded-sm text-status-error text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-line-light">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Gia Hạn Thêm 3 Ngày
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// 5. MODAL NHẬN HÀNG TẠI KHO (RETURN RECEIVE MODAL)
// ============================================================================

export interface ReturnReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRequest: ReturnRequestResponse;
  onSuccess: () => void;
}

/**
 * Chức năng: Modal tiếp nhận kiện hàng hoàn tại kho và chuyển trạng thái sang INSPECTING (Bước 4).
 *
 * @param props Đầu vào: Thuộc tính điều khiển hiển thị và thông tin phiếu trả hàng.
 * @returns Đầu ra: Thẻ JSX Modal nhận hàng tại kho.
 */
export function ReturnReceiveModal({
  isOpen,
  onClose,
  returnRequest,
  onSuccess,
}: ReturnReceiveModalProps) {
  const [receivedAt, setReceivedAt] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setReceivedAt(toDatetimeLocalString());
      setNote('');
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const isoReceivedAt = toLocalIsoDateTimeString(receivedAt);
      await returnAdminService.receiveReturn(returnRequest.id, {
        receivedAt: isoReceivedAt,
        note: note.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi nhận hàng tại kho.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Xác nhận nhận hàng tại kho" size="size-guide">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 bg-surface border border-line-light rounded-sm">
          <PackageCheck size={20} className="text-status-success shrink-0 mt-0.5" />
          <div className="text-sm text-content-primary">
            <p className="font-semibold">
              Nhận kiện hàng: <span className="font-mono">{returnRequest.returnCode}</span>
            </p>
          </div>
        </div>

        <div className="text-xs text-content-muted">
          Thời điểm nhận hàng thực tế tại kho:{' '}
          <span className="font-mono">{formatDateTime(receivedAt)}</span>
        </div>

        <div>
          <label className="block text-sm font-semibold text-content-primary mb-1.5">
            Ghi chú tình trạng kiện hàng lúc mở nhận (tùy chọn)
          </label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: Hộp nguyên seal, không móp méo, đầy đủ phụ kiện đi kèm..."
            disabled={isSubmitting}
          />
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-surface border border-line-error rounded-sm text-status-error text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-line-light">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Đóng
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Xác Nhận Đã Nhận Hàng
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// 6. MODAL HOÀN TIỀN (RETURN REFUND MODAL - PESSIMISTIC LOCK)
// ============================================================================

export interface ReturnRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRequest: ReturnRequestResponse;
  onSuccess: () => void;
}

/**
 * Chức năng: Modal kế toán quét VietQR chuyển khoản và tải lên ảnh biên lai hoàn tiền (Bước 5).
 * Có cơ chế Pessimistic Lock chống double-click gửi trùng lệnh hoàn tiền.
 *
 * @param props Đầu vào: Thuộc tính điều khiển hiển thị và thông tin phiếu trả hàng.
 * @returns Đầu ra: Thẻ JSX Modal hoàn tiền.
 */
export function ReturnRefundModal({
  isOpen,
  onClose,
  returnRequest,
  onSuccess,
}: ReturnRefundModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [debouncedNote, setDebouncedNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedNote(note);
    }, 350);
    return () => clearTimeout(timer);
  }, [note]);

  useEffect(() => {
    if (isOpen) {
      setProofImage(null);
      setNote('');
      setDebouncedNote('');
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Tạo và giải phóng URL xem trước cho tệp ảnh biên lai đã chọn
  useEffect(() => {
    if (!proofImage) {
      setProofPreviewUrl('');
      return;
    }
    const objectUrl = URL.createObjectURL(proofImage);
    setProofPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [proofImage]);

  const bankName = returnRequest.bankName || 'Chưa cung cấp';
  const accountNumber =
    returnRequest.accountNumber || returnRequest.bankAccountNumber || 'Chưa cung cấp';
  const accountHolder =
    returnRequest.accountHolderName || returnRequest.bankAccountHolder || 'Chưa cung cấp';
  const refundAmount = returnRequest.refundAmount ?? 0;

  const dynamicQr = buildDynamicVietQrUrl({
    baseQrUrl: returnRequest.refundVietQrUrl,
    bankName: returnRequest.bankName,
    accountNumber: returnRequest.accountNumber || returnRequest.bankAccountNumber,
    accountHolder: returnRequest.accountHolderName || returnRequest.bankAccountHolder,
    refundAmount,
    returnCode: returnRequest.returnCode,
    customNote: debouncedNote,
  });
  const liveQrNote = note.trim() || dynamicQr.defaultNote;

  // Kiểm tra file ảnh biên lai khi kế toán chọn từ máy
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (!selected) return;

    const validation = validateReturnImageFiles([selected], 'CHANGE_OF_MIND');
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Tệp ảnh biên lai không hợp lệ.');
      return;
    }

    setErrorMessage('');
    setProofImage(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proofImage) {
      setErrorMessage('Vui lòng tải lên ảnh chụp màn hình biên lai chuyển khoản.');
      return;
    }

    if (note.trim().length > 500) {
      setErrorMessage('Ghi chú hoàn tiền không được vượt quá 500 ký tự.');
      return;
    }

    // Pessimistic double-click lock
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await returnAdminService.refundReturn(
        returnRequest.id,
        { note: note.trim() || undefined },
        proofImage
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi hoàn tiền.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Xác nhận chuyển khoản hoàn tiền" size="size-guide">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Thông tin đối soát tài khoản nhận tiền */}
        <div className="p-4 bg-surface border border-line-light rounded-sm space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-line-light">
            <span className="text-xs uppercase tracking-wide text-content-muted font-bold">
              Số tiền cần hoàn trả:
            </span>
            <span className="text-lg font-bold text-accent-red font-mono">
              {formatVND(refundAmount)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs text-content-primary">
            <div>
              <span className="text-content-muted block mb-0.5">Ngân hàng:</span>
              <div className="flex items-center gap-1 font-semibold">
                <Building2 size={13} className="text-content-muted" />
                <span>{bankName}</span>
              </div>
            </div>
            <div>
              <span className="text-content-muted block mb-0.5">Số tài khoản:</span>
              <div className="flex items-center gap-1 font-semibold font-mono">
                <Hash size={13} className="text-content-muted" />
                <span>{accountNumber}</span>
              </div>
            </div>
            <div>
              <span className="text-content-muted block mb-0.5">Chủ tài khoản:</span>
              <div className="flex items-center gap-1 font-semibold">
                <User size={13} className="text-content-muted" />
                <span>{accountHolder}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mã VietQR quét chuyển khoản nhanh */}
        <div className="p-4 bg-surface border border-line-light rounded-sm text-center">
          {dynamicQr.qrUrl ? (
            <>
              <img
                data-testid="img-refund-vietqr"
                src={dynamicQr.qrUrl}
                alt="Mã VietQR hoàn tiền"
                className="mx-auto w-56 h-56 object-contain border border-line-light rounded-sm bg-surface-body"
              />
              <p className="text-xs text-content-secondary mt-2">
                Quét mã bằng ứng dụng ngân hàng để chuyển khoản
              </p>
              <p className="text-xs text-content-muted mt-1">
                Nội dung CK trên mã QR:{' '}
                <span className="font-mono font-semibold text-content-primary">{liveQrNote}</span>
              </p>
            </>
          ) : (
            <p className="text-xs text-content-muted italic">
              Chưa có mã VietQR (khách chưa cung cấp đủ STK)
            </p>
          )}
        </div>

        {/* Upload ảnh chụp màn hình biên lai chuyển khoản (bắt buộc) */}
        <div>
          <label className="block text-sm font-semibold text-content-primary mb-1.5">
            Ảnh chụp màn hình biên lai chuyển khoản <span className="text-status-error">*</span>
          </label>

          <input
            ref={fileInputRef}
            data-testid="upload-refund-proof"
            type="file"
            accept={ACCEPTED_IMAGE_EXTENSIONS.join(', ')}
            onChange={handleFileChange}
            disabled={isSubmitting}
            className="hidden"
          />

          {proofPreviewUrl && proofImage ? (
            <div className="p-3 bg-surface border border-line-light rounded-sm flex items-start gap-3">
              <img
                src={proofPreviewUrl}
                alt="Xem trước biên lai"
                className="w-24 h-24 object-contain rounded-sm border border-line-light bg-surface-body shrink-0"
              />
              <div className="flex-1 min-w-0 text-xs">
                <p className="font-semibold text-content-primary truncate">{proofImage.name}</p>
                <p className="text-content-muted mt-0.5">
                  {(proofImage.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                  >
                    Đổi ảnh khác
                  </Button>
                  <button
                    type="button"
                    onClick={() => setProofImage(null)}
                    disabled={isSubmitting}
                    className="p-1.5 text-content-muted hover:text-status-error transition-colors"
                    title="Xóa ảnh đã chọn"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              className="w-full p-5 border border-dashed border-line rounded-sm bg-surface hover:border-line-focus transition-colors flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer"
            >
              <UploadCloud size={24} className="text-content-muted" />
              <span className="text-xs font-semibold text-content-primary">
                Bấm để chọn ảnh biên lai chuyển khoản
              </span>
              <span className="text-[11px] text-content-muted">
                Hỗ trợ JPG, JPEG, PNG, WebP (tối đa 5MB)
              </span>
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-content-primary mb-1.5">
            Ghi chú hoàn tiền (tùy chọn)
          </label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="Ví dụ: Đã chuyển khoản hoàn tiền qua VietQR."
            disabled={isSubmitting}
          />
          <p className="text-xs text-content-muted mt-1.5">
            Mã giao dịch <span className="font-mono font-semibold">REFUND-…</span> sẽ do hệ thống tự sinh.
          </p>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-surface border border-line-error rounded-sm text-status-error text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-line-light">
          <Button data-testid="btn-close-modal" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Đóng
          </Button>
          <Button
            data-testid="btn-confirm-refund"
            type="submit"
            variant="primary"
            loading={isSubmitting}
            icon={CreditCard}
          >
            Xác Nhận Đã Hoàn Tiền
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// 7. MODAL GIẢI TRÌNH TRỄ HẠN SLA (RETURN OVERDUE NOTE MODAL)
// ============================================================================

export interface ReturnOverdueNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRequest: ReturnRequestResponse;
  onSuccess: () => void;
}

/**
 * Chức năng: Modal ghi nhận giải trình nguyên nhân trễ hạn SLA 2 ngày làm việc và hẹn ngày hoàn thành mới.
 *
 * @param props Đầu vào: Thuộc tính điều khiển hiển thị và thông tin phiếu trả hàng.
 * @returns Đầu ra: Thẻ JSX Modal giải trình SLA.
 */
export function ReturnOverdueNoteModal({
  isOpen,
  onClose,
  returnRequest,
  onSuccess,
}: ReturnOverdueNoteModalProps) {
  const [overdueReason, setOverdueReason] = useState<string>('');
  const [estimatedCompletionAt, setEstimatedCompletionAt] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setOverdueReason(returnRequest.overdueReason || '');
      // Gợi ý ngày hoàn thành mới: mặc định 2 ngày sau
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      setEstimatedCompletionAt(toDatetimeLocalString(futureDate));
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen, returnRequest.overdueReason]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!overdueReason.trim()) {
      setErrorMessage('Vui lòng nhập nguyên nhân giải trình việc xử lý bị quá hạn SLA.');
      return;
    }

    if (!estimatedCompletionAt) {
      setErrorMessage('Vui lòng chọn thời điểm dự kiến hoàn thành mới.');
      return;
    }

    const estimatedEpoch = new Date(estimatedCompletionAt).getTime();
    if (isNaN(estimatedEpoch)) {
      setErrorMessage('Thời điểm dự kiến hoàn thành mới không hợp lệ.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await returnAdminService.updateOverdueNote(returnRequest.id, {
        overdueReason: overdueReason.trim(),
        estimatedCompletionAt: toLocalIsoDateTimeString(estimatedCompletionAt) || estimatedCompletionAt,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi cập nhật giải trình SLA.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Giải trình nguyên nhân trễ hạn SLA" size="size-guide">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 bg-surface border border-line-error rounded-sm">
          <AlertTriangle size={20} className="text-status-error shrink-0 mt-0.5" />
          <div className="text-sm text-content-primary">
            <p className="font-semibold">
              Hồ sơ quá hạn SLA: <span className="font-mono">{returnRequest.returnCode}</span>
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-content-primary mb-1.5">
            Nguyên nhân trễ hạn SLA <span className="text-status-error">*</span>
          </label>
          <Input
            multiline
            rows={3}
            value={overdueReason}
            onChange={(e) => {
              setOverdueReason(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
            placeholder="Ví dụ: Chờ thẩm định từ bộ phận chuyên môn cao hơn do chất liệu vải phức tạp..."
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-content-primary mb-1.5">
            Thời điểm dự kiến hoàn thành mới <span className="text-status-error">*</span>
          </label>
          <input
            type="datetime-local"
            value={estimatedCompletionAt}
            onChange={(e) => {
              setEstimatedCompletionAt(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
            disabled={isSubmitting}
            className="h-10 w-full rounded-sm border border-line bg-surface-body px-3 text-base text-content-primary focus:border-line-focus focus:outline-none"
          />
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-surface border border-line-error rounded-sm text-status-error text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-line-light">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Lưu Giải Trình SLA
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// 8. MODAL NHẬT KÝ LIÊN HỆ CSKH (RETURN CONTACT LOG MODAL)
// ============================================================================

export interface ReturnContactLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRequest: ReturnRequestResponse;
  onSuccess: () => void;
}

/**
 * Chức năng: Modal ghi nhật ký liên hệ CSKH, gọi điện, nhắn tin hoặc biên bản niêm phong lưu kho riêng.
 *
 * @param props Đầu vào: Thuộc tính điều khiển hiển thị và thông tin phiếu trả hàng.
 * @returns Đầu ra: Thẻ JSX Modal nhật ký CSKH.
 */
export function ReturnContactLogModal({
  isOpen,
  onClose,
  returnRequest,
  onSuccess,
}: ReturnContactLogModalProps) {
  const [contactNote, setContactNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setContactNote('');
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contactNote.trim()) {
      setErrorMessage('Vui lòng nhập nội dung liên hệ CSKH hoặc ghi chú niêm phong.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await returnAdminService.addContactLog(returnRequest.id, {
        contactNote: contactNote.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi ghi nhật ký.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ghi nhật ký liên hệ CSKH" size="size-guide">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Lịch sử nhật ký hiện có nếu có */}
        {returnRequest.staffContactLog && (
          <div className="p-3 bg-surface border border-line-light rounded-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-content-muted block mb-1.5">
              Lịch sử nhật ký CSKH trước đó:
            </span>
            <div className="text-xs text-content-secondary whitespace-pre-line max-h-36 overflow-y-auto font-mono bg-surface-body p-2 border border-line-light rounded-sm">
              {returnRequest.staffContactLog}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-content-primary mb-1.5">
            Nội dung ghi chú mới <span className="text-status-error">*</span>
          </label>
          <Input
            multiline
            rows={4}
            value={contactNote}
            onChange={(e) => {
              setContactNote(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
            placeholder="Ví dụ: Gọi điện cho khách lần 2 lúc 10h15, khách xác nhận sẽ bổ sung số tài khoản ngân hàng trong chiều nay..."
            disabled={isSubmitting}
          />
          <p className="text-xs text-content-muted mt-1">
            Hệ thống sẽ tự động ghi kèm tên tài khoản nhân sự và dấu thời gian thực thi.
          </p>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-surface border border-line-error rounded-sm text-status-error text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-line-light">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Đóng
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting} icon={PhoneCall}>
            Lưu Nhật Ký
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// 9. DIALOG XÁC NHẬN ĐÓNG HOÀN TẤT HỒ SƠ (RETURN COMPLETE DIALOG)
// ============================================================================

export interface ReturnCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRequest: ReturnRequestResponse;
  onSuccess: () => void;
}

/**
 * Chức năng: Hộp thoại xác nhận đóng hoàn tất hồ sơ trả hàng khi tiền đã hoàn hoặc phiếu đã bị từ chối (Bước 6).
 *
 * @param props Đầu vào: Thuộc tính điều khiển hiển thị và thông tin phiếu trả hàng.
 * @returns Đầu ra: Thẻ JSX Dialog xác nhận hoàn tất.
 */
export function ReturnCompleteModal({
  isOpen,
  onClose,
  returnRequest,
  onSuccess,
}: ReturnCompleteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await returnAdminService.completeReturn(returnRequest.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi đóng hồ sơ.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Đóng hoàn tất hồ sơ trả hàng" size="size-guide">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 bg-surface border border-line-light rounded-sm">
          <Archive size={20} className="text-content-primary shrink-0 mt-0.5" />
          <div className="text-sm text-content-primary">
            <p className="font-semibold mb-1">
              Đóng hồ sơ: <span className="font-mono">{returnRequest.returnCode}</span>
            </p>
            <p className="text-content-secondary text-xs">
              Xác nhận đóng và lưu trữ hồ sơ này? Sau khi đóng sẽ không thể chỉnh sửa thêm.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-surface border border-line-error rounded-sm text-status-error text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-line-light">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleConfirm} loading={isSubmitting}>
            Xác Nhận Đóng Hồ Sơ
          </Button>
        </div>
      </div>
    </Modal>
  );
}
