/**
 * Module tập hợp các hộp thoại thao tác hành động phía Khách hàng (Customer Action Modals).
 * Bao gồm:
 * - Modal C5a: Chỉnh sửa yêu cầu trả hàng (ReturnEditModal - chỉ khi PENDING_APPROVAL).
 * - Modal C5b: Cập nhật / bổ sung thông tin ngân hàng (ReturnBankModal).
 * - Modal C5c: Xác nhận phương án xử lý sau kiểm định QC (ReturnConfirmPlanModal).
 * - Modal Hủy: Xác nhận hủy yêu cầu trả hàng (ReturnCancelModal).
 */

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Building2,
  CreditCard,
  User,
  X,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import QuantityStepper from '../ui/QuantityStepper';
import ReturnImageUploader from './ReturnImageUploader';
import BankSelect from './BankSelect';
import { getSelfDropOffFlag, setSelfDropOffFlag } from '../../constants/banks';
import { RETURN_REASON_OPTIONS } from '../../constants/returnMeta';
import {
  buildUpdateReturnPayload,
  buildConfirmPlanPayload,
  isValidBankAccountNumber,
  isValidPickupPhone,
  formatPickupAddress,
  validateReturnImageFiles,
  normalizeReturnReason,
  formatVND,
  canCustomerEditReturn,
  canCustomerUpdateBank,
  canCustomerConfirmPlan,
  canCustomerCancelReturn,
} from '../../utils/returnHelpers';
import { returnService } from '../../services/returnService';
import { userService } from '../../services/userService';
import { orderService } from '../../services/orderService';
import type { UserAddressResponse } from '../../types/user';
import type {
  ReturnRequestResponse,
  ReturnRequestImageResponse,
  ReturnReason,
} from '../../types/return';
import { cn } from '../../utils/cn';

/**
 * Chức năng: Chuyển đổi ảnh minh chứng đã lưu trên Cloudinary/server thành đối tượng File
 * khi khách hàng xóa bớt ảnh cũ hoặc tải thêm ảnh mới trong modal chỉnh sửa.
 *
 * @param url   Đầu vào: Đường dẫn URL của ảnh hiện có.
 * @param index Đầu vào: Chỉ số ảnh dùng để đặt tên tệp.
 * @returns Đầu ra: Promise<File> chứa dữ liệu ảnh tương ứng.
 */
async function fetchImageUrlAsFile(url: string, index: number): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Không thể tải lại ảnh minh chứng hiện có từ máy chủ.');
  }
  const blob = await res.blob();
  const mime = blob.type || 'image/jpeg';
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  return new File([blob], `existing-return-image-${index + 1}.${ext}`, { type: mime });
}

// ============================================================================
// 1. MODAL C5A: CHỈNH SỬA YÊU CẦU TRẢ HÀNG (RETURN EDIT MODAL)
// ============================================================================

export interface ReturnEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRequest: ReturnRequestResponse;
  onSuccess: (updated: ReturnRequestResponse) => void;
}

/**
 * Chức năng: Cho phép khách hàng sửa lý do, mô tả, số lượng sản phẩm trả và cập nhật ảnh/STK khi phiếu còn ở PENDING_APPROVAL.
 *
 * @param props Đầu vào: ReturnEditModalProps.
 * @returns Đầu ra: Thẻ JSX Modal C5a.
 */
export function ReturnEditModal({
  isOpen,
  onClose,
  returnRequest,
  onSuccess,
}: ReturnEditModalProps) {
  const [reason, setReason] = useState<ReturnReason>(
    normalizeReturnReason(returnRequest.reason)
  );
  const [reasonDetail, setReasonDetail] = useState<string>(returnRequest.reasonDetail || '');
  const [itemQuantities, setItemQuantities] = useState<Record<number, number>>({});
  const [keptImages, setKeptImages] = useState<ReturnRequestImageResponse[]>(
    returnRequest.images || []
  );
  const [newImages, setNewImages] = useState<File[]>([]);

  const [bankName, setBankName] = useState<string>(returnRequest.bankName || '');
  const [accountNumber, setAccountNumber] = useState<string>(
    returnRequest.accountNumber || returnRequest.bankAccountNumber || ''
  );
  const [accountHolderName, setAccountHolderName] = useState<string>(
    returnRequest.accountHolderName || returnRequest.bankAccountHolder || ''
  );

  // Thông tin lấy hàng chiều hoàn (GHN)
  const [addresses, setAddresses] = useState<UserAddressResponse[]>([]);
  const [orderItemMeta, setOrderItemMeta] = useState<
    Record<number, { maxQuantity: number; unitPrice: number }>
  >({});
  const [pickupAddressId, setPickupAddressId] = useState<string>('');
  const [pickupContactName, setPickupContactName] = useState<string>(
    returnRequest.pickupContactName || ''
  );
  const [pickupPhone, setPickupPhone] = useState<string>(returnRequest.pickupPhone || '');
  const [isSelfDropOff, setIsSelfDropOff] = useState<boolean>(() =>
    getSelfDropOffFlag(returnRequest.id)
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<{
    reasonDetail?: string;
    images?: string;
    pickupContactName?: string;
    pickupPhone?: string;
    accountNumber?: string;
  }>({});

  // Khởi tạo state số lượng sản phẩm, tải sổ địa chỉ & tính số lượng tối đa còn lại có thể trả
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    setReason(normalizeReturnReason(returnRequest.reason));
    setReasonDetail(returnRequest.reasonDetail || '');
    setBankName(returnRequest.bankName || '');
    setAccountNumber(returnRequest.accountNumber || returnRequest.bankAccountNumber || '');
    setAccountHolderName(returnRequest.accountHolderName || returnRequest.bankAccountHolder || '');
    setPickupAddressId('');
    setPickupContactName(returnRequest.pickupContactName || '');
    setPickupPhone(returnRequest.pickupPhone || '');
    setIsSelfDropOff(getSelfDropOffFlag(returnRequest.id));
    setKeptImages(returnRequest.images || []);
    setNewImages([]);
    setErrorMessage('');
    setFieldErrors({});

    const initialQtys: Record<number, number> = {};
    (returnRequest.items || []).forEach((item) => {
      initialQtys[item.orderItemId] = item.quantity;
    });
    setItemQuantities(initialQtys);

    userService
      .getAddresses()
      .then((res) => {
        if (isMounted && Array.isArray(res?.data)) {
          setAddresses(res.data);
        }
      })
      .catch(() => {
        // Bỏ qua lỗi tải sổ địa chỉ; vẫn cho phép giữ địa chỉ hiện tại hoặc nhập liên hệ
      });

    if (returnRequest.orderId) {
      Promise.all([
        orderService.getMyOrderById(returnRequest.orderId).catch(() => orderService.getOrderById(returnRequest.orderId)),
        returnService.getMyRequests(0, 100).catch(() => null),
      ])
        .then(([order, myReturnsRes]) => {
          if (!isMounted || !order?.orderItems?.length) return;
          const otherUsedMap: Record<number, number> = {};
          const reqList = myReturnsRes?.data?.content || [];
          reqList.forEach((req) => {
            if (
              req.id === returnRequest.id ||
              Number(req.orderId) !== Number(returnRequest.orderId) ||
              req.status === 'CANCELLED' ||
              req.status === 'REJECTED'
            ) {
              return;
            }
            (req.items || []).forEach((it) => {
              otherUsedMap[it.orderItemId] = (otherUsedMap[it.orderItemId] || 0) + (it.quantity || 0);
            });
          });

          const metaMap: Record<number, { maxQuantity: number; unitPrice: number }> = {};
          order.orderItems.forEach((oi) => {
            const currentItem = (returnRequest.items || []).find((ri) => ri.orderItemId === oi.id);
            const currentQty = currentItem?.quantity || 1;
            const remainingAvailable = Math.max(
              currentQty,
              (oi.quantity || currentQty) - (otherUsedMap[oi.id] || 0)
            );
            metaMap[oi.id] = {
              maxQuantity: remainingAvailable,
              unitPrice: oi.unitPrice || 0,
            };
          });
          setOrderItemMeta(metaMap);
        })
        .catch(() => {
          // Bỏ qua lỗi tải đơn hàng gốc; vẫn giữ fallback từ dữ liệu phiếu hiện tại
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, returnRequest]);

  // Kiểm tra quyền chỉnh sửa
  if (!canCustomerEditReturn(returnRequest)) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setFieldErrors({});

    const nextErrors: {
      reasonDetail?: string;
      images?: string;
      pickupContactName?: string;
      pickupPhone?: string;
      accountNumber?: string;
    } = {};

    if (!reasonDetail.trim()) {
      nextErrors.reasonDetail = 'Vui lòng nhập mô tả chi tiết lý do trả hàng.';
    } else if (reasonDetail.trim().length > 1000) {
      nextErrors.reasonDetail = 'Mô tả chi tiết không được vượt quá 1000 ký tự.';
    }

    // Kiểm tra tổng số ảnh giữ lại + ảnh mới thêm
    const totalImagesCount = keptImages.length + newImages.length;
    if (totalImagesCount > 5) {
      nextErrors.images = 'Mỗi yêu cầu chỉ được gửi tối đa 5 ảnh minh chứng.';
    } else if ((reason === 'DEFECTIVE' || reason === 'WRONG_ITEM') && totalImagesCount === 0) {
      nextErrors.images =
        'Vui lòng giữ lại hoặc tải lên từ 1 đến 5 ảnh minh chứng cho sản phẩm lỗi hoặc giao sai.';
    } else if (newImages.length > 0) {
      const imageValidation = validateReturnImageFiles(newImages, 'CHANGE_OF_MIND');
      if (!imageValidation.isValid) {
        nextErrors.images = imageValidation.error || 'Tệp ảnh minh chứng không hợp lệ.';
      }
    }

    // Kiểm tra thông tin lấy hàng GHN (chỉ khi không tự mang đến cửa hàng)
    const trimmedPickupName = isSelfDropOff ? '' : pickupContactName.trim();
    if (!isSelfDropOff && trimmedPickupName.length > 100) {
      nextErrors.pickupContactName = 'Tên người liên hệ lấy hàng không được vượt quá 100 ký tự.';
    }

    const trimmedPickupPhone = isSelfDropOff ? '' : pickupPhone.trim();
    if (!isSelfDropOff && trimmedPickupPhone !== '' && !isValidPickupPhone(trimmedPickupPhone)) {
      nextErrors.pickupPhone =
        'Số điện thoại lấy hàng không hợp lệ (bắt đầu bằng 0 hoặc +84, gồm 10–11 chữ số).';
    }

    // Kiểm tra định dạng số tài khoản ngân hàng nếu có nhập
    const trimmedAccount = accountNumber.trim();
    if (trimmedAccount !== '' && !isValidBankAccountNumber(trimmedAccount)) {
      nextErrors.accountNumber =
        'Số tài khoản ngân hàng không hợp lệ (phải gồm từ 6 đến 30 chữ số).';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    // Chuẩn bị danh sách sản phẩm trả
    const itemsPayload = (returnRequest.items || []).map((item) => ({
      orderItemId: item.orderItemId,
      quantity: itemQuantities[item.orderItemId] || item.quantity,
    }));

    // Bắt buộc ít nhất 1 sản phẩm có số lượng > 0
    const hasValidQuantity = itemsPayload.some((it) => it.quantity > 0);
    if (!hasValidQuantity) {
      setErrorMessage('Vui lòng chọn số lượng sản phẩm cần trả ít nhất là 1.');
      return;
    }

    // Dựng payload sạch qua pure helper (tuyệt đối không chứa orderId)
    const cleanPayload = buildUpdateReturnPayload({
      reason,
      reasonDetail,
      items: itemsPayload,
      bankName,
      accountNumber: trimmedAccount,
      accountHolderName,
      pickupAddressId: isSelfDropOff ? null : pickupAddressId || null,
      pickupContactName: trimmedPickupName,
      pickupPhone: trimmedPickupPhone,
    });

    setIsLoading(true);
    try {
      const originalImagesCount = returnRequest.images?.length || 0;
      const hasRemovedExisting = keptImages.length < originalImagesCount;
      let filesToSend: File[] | undefined;

      if (hasRemovedExisting || newImages.length > 0) {
        const keptFiles =
          keptImages.length > 0
            ? await Promise.all(keptImages.map((img, idx) => fetchImageUrlAsFile(img.imageUrl, idx)))
            : [];
        const combined = [...keptFiles, ...newImages];
        filesToSend = combined.length > 0 ? combined : undefined;
      }

      const res = await returnService.updateReturn(returnRequest.id, cleanPayload, filesToSend);

      if (res.data) {
        setSelfDropOffFlag(res.data.id, isSelfDropOff);
        onSuccess(res.data);
        onClose();
      }
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || err?.message || 'Chỉnh sửa yêu cầu thất bại.';
      setErrorMessage(serverMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chỉnh Sửa Yêu Cầu Trả Hàng"
      size="quick-view"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-surface border-l-4 border-line-error text-status-error text-sm rounded-sm">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. Chọn lý do trả hàng */}
        <div>
          <Select
            label="Lý do trả hàng"
            value={reason}
            onChange={(e) => setReason(e.target.value as ReturnReason)}
          >
            {RETURN_REASON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        {/* 2. Chi tiết lý do */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-content-primary">
            Mô tả chi tiết <span className="text-accent-red">*</span>
          </label>
          <textarea
            rows={3}
            value={reasonDetail}
            onChange={(e) => {
              setReasonDetail(e.target.value);
              setFieldErrors((prev) =>
                prev.reasonDetail ? { ...prev, reasonDetail: undefined } : prev
              );
            }}
            maxLength={1000}
            placeholder="Mô tả cụ thể tình trạng sản phẩm hoặc vấn đề gặp phải..."
            className={cn(
              'w-full rounded-input border bg-surface-body p-3 text-base text-content-primary focus:border-line-focus focus:outline-none',
              fieldErrors.reasonDetail ? 'border-line-error' : 'border-line'
            )}
          />
          {fieldErrors.reasonDetail && (
            <p className="mt-1 text-xs italic text-status-error">{fieldErrors.reasonDetail}</p>
          )}
          <span className="text-xs text-content-muted">{reasonDetail.length}/1000 ký tự</span>
        </div>

        {/* 3. Danh sách sản phẩm trả và điều chỉnh số lượng */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-content-primary">
            Sản phẩm yêu cầu trả
          </label>
          <div className="flex flex-col gap-2.5 border border-line-light rounded-sm p-3 bg-surface">
            {(returnRequest.items || []).map((item) => {
              const meta = orderItemMeta[item.orderItemId];
              const displayPrice =
                item.itemRefundAmount != null && item.itemRefundAmount > 0
                  ? item.itemRefundAmount
                  : meta?.unitPrice || 0;
              const maxQty = Math.max(item.quantity || 1, meta?.maxQuantity || item.quantity || 1);

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 border-b border-line-light pb-2.5 last:border-b-0 last:pb-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-content-primary truncate">
                      {item.productName}
                    </div>
                    <div className="text-xs text-content-muted">{item.variantInfo || 'Tiêu chuẩn'}</div>
                    <div className="text-xs text-content-secondary mt-0.5">
                      Giá:{' '}
                      {displayPrice > 0 ? formatVND(displayPrice) : 'Theo đơn hàng gốc'} •{' '}
                      <strong className="text-content-primary">
                        Tối đa có thể trả: {maxQty}
                      </strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-content-muted">SL trả:</span>
                    <QuantityStepper
                      min={1}
                      max={maxQty}
                      value={itemQuantities[item.orderItemId] || item.quantity}
                      onChange={(val) =>
                        setItemQuantities((prev) => ({
                          ...prev,
                          [item.orderItemId]: val,
                        }))
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Ảnh minh chứng: hiển thị ảnh đã tải lên kèm nút X xóa và cho phép tải thêm ảnh mới */}
        <div className="border-t border-line-light pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-content-primary">
              Ảnh Minh Chứng Hiện Tại &amp; Bổ Sung
            </h4>
            <span className="text-xs text-content-muted">
              Tổng cộng: <strong>{keptImages.length + newImages.length}</strong>/5 ảnh
            </span>
          </div>

          {keptImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {keptImages.map((imgItem, idx) => (
                <div
                  key={imgItem.id}
                  className="relative aspect-square border border-line-light rounded-sm overflow-hidden bg-surface"
                >
                  <img
                    src={imgItem.imageUrl}
                    alt={`Ảnh đã tải ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setKeptImages((prev) => prev.filter((it) => it.id !== imgItem.id));
                      setFieldErrors((prev) => (prev.images ? { ...prev, images: undefined } : prev));
                    }}
                    aria-label={`Xóa ảnh hiện tại ${idx + 1}`}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-surface-dark text-content-inverse flex items-center justify-center opacity-85 hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                  <div className="absolute bottom-1 left-1.5 text-[10px] bg-surface-dark text-content-inverse px-1 py-0.5 rounded-sm opacity-75">
                    Đã lưu
                  </div>
                </div>
              ))}
            </div>
          )}

          <ReturnImageUploader
            files={newImages}
            onChange={(files) => {
              if (keptImages.length + files.length > 5) {
                setFieldErrors((prev) => ({
                  ...prev,
                  images: 'Tổng số ảnh giữ lại và ảnh mới không được vượt quá 5 ảnh.',
                }));
                return;
              }
              setNewImages(files);
              setFieldErrors((prev) => (prev.images ? { ...prev, images: undefined } : prev));
            }}
            reason={reason}
            error={fieldErrors.images}
            disabled={keptImages.length + newImages.length >= 5}
          />
        </div>

        {/* 5. Hình thức gửi trả hàng (GHN hoặc Tự mang đến cửa hàng) */}
        <div className="border-t border-line-light pt-4 flex flex-col gap-3">
          <h4 className="text-sm font-bold text-content-primary">
            Hình Thức Gửi Trả Hàng
          </h4>

          <label className="flex items-center gap-2.5 p-3 border border-line-light rounded-sm bg-surface cursor-pointer text-xs font-medium text-content-primary">
            <input
              type="checkbox"
              checked={isSelfDropOff}
              onChange={(e) => setIsSelfDropOff(e.target.checked)}
              className="w-4 h-4 rounded-sm border-line text-primary focus:ring-0 shrink-0"
            />
            <span>Tôi tự mang sản phẩm đến cửa hàng (không cần shipper GHN đến lấy)</span>
          </label>

          {isSelfDropOff ? (
            <p className="text-xs text-content-muted">
              Sau khi yêu cầu được duyệt, bạn vui lòng mang sản phẩm trực tiếp đến cửa hàng gần nhất.
            </p>
          ) : (
            <>
              <div>
                <Select
                  label="Chọn địa chỉ lấy hàng mới (nếu muốn đổi)"
                  value={pickupAddressId}
                  onChange={(e) => setPickupAddressId(e.target.value)}
                >
                  <option value="">Giữ địa chỉ lấy hàng hiện tại / đơn gốc</option>
                  {addresses.map((addr) => (
                    <option key={addr.id} value={String(addr.id)}>
                      {[addr.fullAddress, addr.wardName, addr.provinceName].filter(Boolean).join(', ')}
                      {addr.isDefault ? ' (Mặc định)' : ''}
                    </option>
                  ))}
                </Select>
                {formatPickupAddress(returnRequest) && (
                  <p className="text-xs text-content-muted mt-1 break-words [overflow-wrap:anywhere]">
                    Địa chỉ hiện tại: {formatPickupAddress(returnRequest)}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Người liên hệ lấy hàng"
                  placeholder="VD: Nguyễn Văn A"
                  maxLength={100}
                  value={pickupContactName}
                  error={fieldErrors.pickupContactName}
                  onChange={(e) => {
                    setPickupContactName(e.target.value);
                    setFieldErrors((prev) =>
                      prev.pickupContactName ? { ...prev, pickupContactName: undefined } : prev
                    );
                  }}
                />
                <Input
                  label="SĐT lấy hàng"
                  placeholder="VD: 0901234567"
                  maxLength={20}
                  value={pickupPhone}
                  error={fieldErrors.pickupPhone}
                  onChange={(e) => {
                    setPickupPhone(e.target.value);
                    setFieldErrors((prev) =>
                      prev.pickupPhone ? { ...prev, pickupPhone: undefined } : prev
                    );
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* 6. Thông tin ngân hàng nhận tiền hoàn */}
        <div className="border-t border-line-light pt-4 flex flex-col gap-3">
          <h4 className="text-sm font-bold text-content-primary">
            Thông Tin Tài Khoản Nhận Hoàn Tiền (Tùy chọn)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <BankSelect
              label="Ngân hàng"
              value={bankName}
              onChange={setBankName}
              allowClear
              placeholder="Chọn ngân hàng..."
            />
            <Input
              label="Số tài khoản"
              placeholder="6 - 30 chữ số"
              value={accountNumber}
              error={fieldErrors.accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value);
                setFieldErrors((prev) =>
                  prev.accountNumber ? { ...prev, accountNumber: undefined } : prev
                );
              }}
            />
            <Input
              label="Tên chủ tài khoản"
              placeholder="NGUYEN VAN A"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
            />
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-3 border-t border-line-light pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Hủy Bỏ
          </Button>
          <Button type="submit" variant="primary" loading={isLoading}>
            Lưu Thay Đổi
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// 2. MODAL C5B: CẬP NHẬT TÀI KHOẢN NGÂN HÀNG (RETURN BANK MODAL)
// ============================================================================

export interface ReturnBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRequest: ReturnRequestResponse;
  onSuccess: (updated: ReturnRequestResponse) => void;
}

/**
 * Chức năng: Cho phép khách hàng bổ sung hoặc sửa đổi tài khoản ngân hàng để nhận tiền hoàn.
 *
 * @param props Đầu vào: ReturnBankModalProps.
 * @returns Đầu ra: Thẻ JSX Modal C5b.
 */
export function ReturnBankModal({
  isOpen,
  onClose,
  returnRequest,
  onSuccess,
}: ReturnBankModalProps) {
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setBankName(returnRequest.bankName || '');
      setAccountNumber(returnRequest.accountNumber || returnRequest.bankAccountNumber || '');
      setAccountHolderName(returnRequest.accountHolderName || returnRequest.bankAccountHolder || '');
      setErrorMessage('');
    }
  }, [isOpen, returnRequest]);

  if (!canCustomerUpdateBank(returnRequest)) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanBankName = bankName.trim();
    const cleanAccount = accountNumber.trim();
    const cleanHolder = accountHolderName.trim();

    if (!cleanBankName) {
      setErrorMessage('Vui lòng nhập tên ngân hàng tiếp nhận.');
      return;
    }
    if (!cleanAccount) {
      setErrorMessage('Vui lòng nhập số tài khoản ngân hàng.');
      return;
    }
    if (!isValidBankAccountNumber(cleanAccount)) {
      setErrorMessage('Số tài khoản ngân hàng phải gồm từ 6 đến 30 chữ số (không chứa chữ hoặc ký tự đặc biệt).');
      return;
    }
    if (!cleanHolder) {
      setErrorMessage('Vui lòng nhập tên chủ tài khoản nhận tiền.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await returnService.updateBankAccount(returnRequest.id, {
        bankName: cleanBankName,
        accountNumber: cleanAccount,
        accountHolderName: cleanHolder,
      });

      if (res.data) {
        onSuccess(res.data);
        onClose();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Cập nhật tài khoản ngân hàng thất bại.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thông Tin Tài Khoản Nhận Hoàn Tiền"
      size="size-guide"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-surface border-l-4 border-line-error text-status-error text-sm rounded-sm">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex items-start gap-3 p-3 bg-surface border border-line-light rounded-sm text-xs text-content-secondary">
          <Info size={16} className="text-content-primary shrink-0 mt-0.5" />
          <span>
            Sau khi phiếu được kế toán duyệt hoàn tiền, số tiền sẽ được chuyển khoản trực tiếp vào thông tin ngân hàng dưới đây.
          </span>
        </div>

        <div>
          <BankSelect
            label="Ngân hàng"
            value={bankName}
            onChange={setBankName}
            required
            placeholder="Chọn ngân hàng tiếp nhận..."
          />
        </div>

        <div>
          <Input
            label="Số tài khoản ngân hàng"
            placeholder="Chỉ gồm từ 6 đến 30 chữ số"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            required
          />
        </div>

        <div>
          <Input
            label="Tên chủ tài khoản"
            placeholder="NGUYEN VAN A (viết hoa không dấu)"
            value={accountHolderName}
            onChange={(e) => setAccountHolderName(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-line-light pt-4 mt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Đóng
          </Button>
          <Button type="submit" variant="primary" loading={isLoading}>
            Cập Nhật Tài Khoản
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// 3. MODAL C5C: XÁC NHẬN PHƯƠNG ÁN XỬ LÝ (RETURN CONFIRM PLAN MODAL)
// ============================================================================

export interface ReturnConfirmPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRequest: ReturnRequestResponse;
  onSuccess: (updated: ReturnRequestResponse) => void;
}

/**
 * Chức năng: Cho phép khách hàng phản hồi đồng ý hoặc không đồng ý với phương án điều chỉnh sau kiểm định QC.
 *
 * @param props Đầu vào: ReturnConfirmPlanModalProps.
 * @returns Đầu ra: Thẻ JSX Modal C5c.
 */
export function ReturnConfirmPlanModal({
  isOpen,
  onClose,
  returnRequest,
  onSuccess,
}: ReturnConfirmPlanModalProps) {
  const [agreed, setAgreed] = useState<boolean>(true);
  const [customerNote, setCustomerNote] = useState<string>('');

  const [bankName, setBankName] = useState<string>(returnRequest.bankName || '');
  const [accountNumber, setAccountNumber] = useState<string>(
    returnRequest.accountNumber || returnRequest.bankAccountNumber || ''
  );
  const [accountHolderName, setAccountHolderName] = useState<string>(
    returnRequest.accountHolderName || returnRequest.bankAccountHolder || ''
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setAgreed(true);
      setCustomerNote('');
      setBankName(returnRequest.bankName || '');
      setAccountNumber(returnRequest.accountNumber || returnRequest.bankAccountNumber || '');
      setAccountHolderName(returnRequest.accountHolderName || returnRequest.bankAccountHolder || '');
      setErrorMessage('');
    }
  }, [isOpen, returnRequest]);

  if (!canCustomerConfirmPlan(returnRequest)) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanBank = bankName.trim();
    const cleanAccount = accountNumber.trim();
    const cleanHolder = accountHolderName.trim();

    if (agreed) {
      // Nếu khách đồng ý phương án hoàn tiền nhưng chưa đủ thông tin STK thì yêu cầu nhập ngay
      // để tránh trường hợp xác nhận xong nhưng phiếu vẫn bị giữ ở trạng thái chờ bổ sung STK
      if (!cleanBank || !cleanAccount || !cleanHolder) {
        setErrorMessage(
          'Vui lòng bổ sung đầy đủ Tên ngân hàng, Số tài khoản và Tên chủ tài khoản để nhận tiền hoàn trước khi xác nhận.'
        );
        return;
      }
      if (!isValidBankAccountNumber(cleanAccount)) {
        setErrorMessage('Số tài khoản ngân hàng không hợp lệ (gồm 6–30 chữ số).');
        return;
      }
    } else if (cleanAccount !== '' && !isValidBankAccountNumber(cleanAccount)) {
      setErrorMessage('Số tài khoản ngân hàng không hợp lệ (gồm 6–30 chữ số).');
      return;
    }

    const payload = buildConfirmPlanPayload({
      agreed,
      customerNote,
      bankName: cleanBank,
      accountNumber: cleanAccount,
      accountHolderName: cleanHolder,
    });

    setIsLoading(true);
    try {
      const res = await returnService.confirmResolutionPlan(returnRequest.id, payload);
      if (res.data) {
        onSuccess(res.data);
        onClose();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Phản hồi phương án thất bại.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xác Nhận Phương Án Xử Lý Trả Hàng"
      size="quick-view"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-surface border-l-4 border-line-error text-status-error text-sm rounded-sm">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tóm tắt kết quả kiểm định QC */}
        <div className="p-4 bg-surface border border-line-light rounded-sm flex flex-col gap-3">
          <h4 className="text-sm font-bold text-content-primary">
            Kết Quả Kiểm Định Chất Lượng Tại Kho
          </h4>
          <div className="flex flex-col gap-2">
            {(returnRequest.items || []).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 text-xs border-b border-line-light pb-2 last:border-b-0 last:pb-0"
              >
                <div>
                  <span className="font-semibold text-content-primary">{item.productName}</span>
                  <span className="text-content-muted ml-2">({item.variantInfo || 'Mặc định'})</span>
                  {item.inspectionNote && (
                    <div className="text-content-secondary mt-0.5 italic">
                      Ghi chú QC: {item.inspectionNote}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-content-muted">Yêu cầu: {item.quantity}</span>
                  <span className="mx-1.5 font-bold">➔</span>
                  <span className="font-bold text-content-primary">
                    Duyệt nhận: {item.acceptedQuantity ?? item.quantity}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Đối soát số tiền hoàn dự kiến */}
          <div className="border-t border-line-light pt-2.5 flex flex-col gap-1.5 text-sm">
            {typeof returnRequest.itemsRefundAmount === 'number' && (
              <div className="flex items-center justify-between text-xs text-content-secondary">
                <span>Tiền hàng được hoàn:</span>
                <span className="font-semibold text-content-primary">
                  {formatVND(returnRequest.itemsRefundAmount)}
                </span>
              </div>
            )}
            {typeof returnRequest.returnShippingFee === 'number' && returnRequest.returnShippingFee > 0 && (
              <div className="flex items-center justify-between text-xs text-status-error">
                <span>Trừ phí gửi trả hàng:</span>
                <span className="font-semibold">- {formatVND(returnRequest.returnShippingFee)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-line-light">
              <span className="text-content-secondary font-medium">Số tiền bạn nhận lại:</span>
              <span className="text-base font-bold text-accent-red">
                {formatVND(returnRequest.refundAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Lựa chọn Đồng ý hoặc Không đồng ý */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-content-primary">
            Lựa chọn của bạn <span className="text-accent-red">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={cn(
                'flex items-center gap-3 p-3.5 border rounded-sm cursor-pointer transition-colors',
                agreed
                  ? 'border-primary bg-surface font-semibold text-content-primary'
                  : 'border-line-light hover:bg-surface text-content-secondary'
              )}
            >
              <input
                type="radio"
                name="confirmPlanOption"
                checked={agreed}
                onChange={() => setAgreed(true)}
                className="text-primary focus:ring-0"
              />
              <span>Tôi đồng ý với phương án này</span>
            </label>

            <label
              className={cn(
                'flex items-center gap-3 p-3.5 border rounded-sm cursor-pointer transition-colors',
                !agreed
                  ? 'border-primary bg-surface font-semibold text-content-primary'
                  : 'border-line-light hover:bg-surface text-content-secondary'
              )}
            >
              <input
                type="radio"
                name="confirmPlanOption"
                checked={!agreed}
                onChange={() => setAgreed(false)}
                className="text-primary focus:ring-0"
              />
              <span>Tôi không đồng ý với phương án</span>
            </label>
          </div>
        </div>

        {/* Ghi chú phản hồi của khách */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-content-primary">
            Ý kiến phản hồi của bạn (Tùy chọn)
          </label>
          <textarea
            rows={2}
            value={customerNote}
            onChange={(e) => setCustomerNote(e.target.value)}
            maxLength={500}
            placeholder="Nhập thêm lý do hoặc trao đổi với CSKH nếu có..."
            className="w-full rounded-input border border-line bg-surface-body p-3 text-sm text-content-primary focus:border-line-focus focus:outline-none"
          />
        </div>

        {/* Nếu đồng ý và chưa có hoặc muốn bổ sung STK */}
        {agreed && (
          <div className="border-t border-line-light pt-3 flex flex-col gap-3">
            <h5 className="text-xs font-bold uppercase tracking-wide text-content-primary">
              Thông tin ngân hàng nhận tiền hoàn <span className="text-accent-red">*</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <BankSelect
                label="Ngân hàng"
                value={bankName}
                onChange={setBankName}
                required
                placeholder="Chọn ngân hàng..."
              />
              <Input
                label="Số tài khoản *"
                placeholder="6–30 số"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
              />
              <Input
                label="Chủ tài khoản *"
                placeholder="NGUYEN VAN A"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                required
              />
            </div>
          </div>
        )}

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-3 border-t border-line-light pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Đóng
          </Button>
          <Button type="submit" variant="primary" loading={isLoading}>
            Gửi Phản Hồi
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// 4. MODAL HỦY YÊU CẦU TRẢ HÀNG (RETURN CANCEL MODAL)
// ============================================================================

export interface ReturnCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRequest: ReturnRequestResponse;
  onSuccess: (updated: ReturnRequestResponse) => void;
}

/**
 * Chức năng: Hộp thoại xác nhận hủy yêu cầu trả hàng trước khi gửi hàng về kho.
 *
 * @param props Đầu vào: ReturnCancelModalProps.
 * @returns Đầu ra: Thẻ JSX Modal Hủy.
 */
export function ReturnCancelModal({
  isOpen,
  onClose,
  returnRequest,
  onSuccess,
}: ReturnCancelModalProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!canCustomerCancelReturn(returnRequest)) {
    return null;
  }

  const handleCancel = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await returnService.cancelReturn(returnRequest.id);
      if (res.data) {
        onSuccess(res.data);
        onClose();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Hủy yêu cầu trả hàng không thành công.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xác Nhận Hủy Yêu Cầu Trả Hàng"
      size="size-guide"
    >
      <div className="flex flex-col gap-4">
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-surface border-l-4 border-line-error text-status-error text-sm rounded-sm">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex items-start gap-3 p-4 bg-surface border border-line-light rounded-sm">
          <AlertTriangle size={24} className="text-status-warning shrink-0" />
          <div className="text-sm">
            <p className="font-bold text-content-primary mb-1">
              Bạn có chắc chắn muốn hủy yêu cầu trả hàng này không?
            </p>
            <p className="text-content-muted mt-1 text-xs">
              Sau khi hủy, yêu cầu sẽ chuyển sang trạng thái <strong>Đã hủy</strong> và bạn sẽ không thể mở lại yêu cầu này.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-line-light pt-4 mt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Quay Lại
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={isLoading}
            onClick={handleCancel}
          >
            Xác Nhận Hủy Phiếu
          </Button>
        </div>
      </div>
    </Modal>
  );
}
