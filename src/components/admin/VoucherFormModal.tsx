import React, { useEffect, useState } from 'react';
import {
  CreateVoucherRequest,
  UpdateVoucherRequest,
  VoucherDiscountType,
  VoucherResponse,
  VoucherStatus,
} from '../../types/voucher';
import { voucherService } from '../../services/voucherService';
import { extractErrorMessage } from '../../utils/format';
import { Button, Input, Modal, Select } from '../ui';

export interface VoucherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingVoucher: VoucherResponse | null;
  onSaved: (message: string) => void;
}

function formatLocalDatetime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getDefaultStartDate(): string {
  const d = new Date();
  // Lùi 5 phút để tránh chênh lệch mili-giây giữa client và server
  d.setMinutes(d.getMinutes() - 5);
  return formatLocalDatetime(d);
}

function getDefaultEndDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return formatLocalDatetime(d);
}

function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 16);
}

function sanitizeMoneyDigits(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const digits = String(val).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits;
}

function formatMoneyDots(val: string): string {
  const digits = sanitizeMoneyDigits(val);
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export default function VoucherFormModal({
  isOpen,
  onClose,
  editingVoucher,
  onSaved,
}: VoucherFormModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<VoucherDiscountType>('FIXED_AMOUNT');
  const [discountValue, setDiscountValue] = useState('50000');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('200000');
  const [totalQuantity, setTotalQuantity] = useState('100');
  const [maxUsesPerUser, setMaxUsesPerUser] = useState('1');
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());
  const [status, setStatus] = useState<VoucherStatus>('ACTIVE');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isEditing = Boolean(editingVoucher);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage('');

    if (editingVoucher) {
      setCode(editingVoucher.code);
      setName(editingVoucher.name);
      setDescription(editingVoucher.description || '');
      setDiscountType(editingVoucher.discountType);
      setDiscountValue(
        editingVoucher.discountType === 'FIXED_AMOUNT'
          ? sanitizeMoneyDigits(Math.round(Number(editingVoucher.discountValue)))
          : String(editingVoucher.discountValue)
      );
      setMaxDiscountAmount(
        editingVoucher.maxDiscountAmount
          ? sanitizeMoneyDigits(Math.round(Number(editingVoucher.maxDiscountAmount)))
          : ''
      );
      setMinOrderAmount(
        sanitizeMoneyDigits(Math.round(Number(editingVoucher.minOrderAmount || 0))) || '0'
      );
      setTotalQuantity(String(editingVoucher.totalQuantity));
      setMaxUsesPerUser(String(editingVoucher.maxUsesPerUser || 1));
      setStartDate(toDatetimeLocalValue(editingVoucher.startDate));
      setEndDate(toDatetimeLocalValue(editingVoucher.endDate));
      setStatus(editingVoucher.status || 'ACTIVE');
    } else {
      setCode('');
      setName('');
      setDescription('');
      setDiscountType('FIXED_AMOUNT');
      setDiscountValue('50000');
      setMaxDiscountAmount('');
      setMinOrderAmount('200000');
      setTotalQuantity('100');
      setMaxUsesPerUser('1');
      setStartDate(getDefaultStartDate());
      setEndDate(getDefaultEndDate());
      setStatus('ACTIVE');
    }
  }, [isOpen, editingVoucher]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isEditing && !code.trim()) {
      setErrorMessage('Vui lòng nhập mã voucher');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập tên voucher');
      return;
    }

    const numValue = Number(discountValue);
    if (isNaN(numValue) || numValue <= 0) {
      setErrorMessage('Giá trị giảm phải lớn hơn 0');
      return;
    }

    if (discountType === 'PERCENTAGE' && numValue > 100) {
      setErrorMessage('Giảm theo % không được vượt quá 100%');
      return;
    }

    const numTotalQty = Number(totalQuantity);
    if (isNaN(numTotalQty) || !Number.isInteger(numTotalQty) || numTotalQty < 1) {
      setErrorMessage('Tổng số lượng voucher phải là số nguyên từ 1 trở lên');
      return;
    }

    const numMaxUses = Number(maxUsesPerUser);
    if (isNaN(numMaxUses) || !Number.isInteger(numMaxUses) || numMaxUses < 1) {
      setErrorMessage('Số lần áp dụng cho mỗi tài khoản phải là số nguyên từ 1 trở lên');
      return;
    }

    if (numMaxUses > numTotalQty) {
      setErrorMessage('Số lần áp dụng cho mỗi tài khoản không được vượt quá tổng số lượng phát hành');
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      setErrorMessage('Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && editingVoucher) {
        const updatePayload: UpdateVoucherRequest = {
          name: name.trim(),
          description: description.trim() || undefined,
          discountType,
          discountValue: numValue,
          maxDiscountAmount:
            discountType === 'PERCENTAGE' && maxDiscountAmount.trim()
              ? Number(maxDiscountAmount)
              : undefined,
          minOrderAmount: minOrderAmount.trim() ? Number(minOrderAmount) : 0,
          totalQuantity: numTotalQty,
          maxUsesPerUser: numMaxUses,
          startDate: `${startDate}:00`,
          endDate: `${endDate}:00`,
          status,
        };
        await voucherService.updateVoucher(editingVoucher.id, updatePayload);
        onSaved(`Đã cập nhật voucher "${editingVoucher.code}" (tối đa ${numMaxUses} lần/tài khoản) thành công!`);
      } else {
        const createPayload: CreateVoucherRequest = {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || undefined,
          discountType,
          discountValue: numValue,
          maxDiscountAmount:
            discountType === 'PERCENTAGE' && maxDiscountAmount.trim()
              ? Number(maxDiscountAmount)
              : undefined,
          minOrderAmount: minOrderAmount.trim() ? Number(minOrderAmount) : 0,
          totalQuantity: numTotalQty,
          maxUsesPerUser: numMaxUses,
          startDate: `${startDate}:00`,
          endDate: `${endDate}:00`,
          status: 'ACTIVE',
        };
        await voucherService.createVoucher(createPayload);
        onSaved(`Đã tạo thành công voucher "${createPayload.code}" (tối đa ${numMaxUses} lần/tài khoản)!`);
      }
      onClose();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, isEditing ? 'Lỗi khi cập nhật voucher' : 'Lỗi khi tạo voucher'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `CHỈNH SỬA VOUCHER — ${editingVoucher?.code}` : 'TẠO MÃ GIẢM GIÁ (VOUCHER) MỚI'}
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
        {errorMessage && (
          <div className="rounded-input border border-status-error/30 bg-status-error/10 p-3 text-xs text-status-error">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block font-semibold text-content-primary">
              Mã Voucher {!isEditing && <span className="text-accent-red">*</span>}
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VD: WELCOME50K"
              disabled={isEditing}
              required={!isEditing}
            />
            {isEditing && (
              <p className="mt-1 text-[11px] text-content-muted">
                Mã voucher là duy nhất và không thể thay đổi sau khi tạo.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block font-semibold text-content-primary">
              Tên Chiến Dịch <span className="text-accent-red">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Giảm 50K cho đơn đầu tiên"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block font-semibold text-content-primary">
            Mô Tả Chi Tiết
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả điều kiện áp dụng cho voucher..."
            rows={2}
            className="w-full rounded-input border border-line bg-surface-body p-2 text-content-primary placeholder:text-content-muted focus:border-line-focus focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block font-semibold text-content-primary">
              Hình Thức Giảm Giá
            </label>
            <Select
              value={discountType}
              onChange={(e) => {
                const nextType = e.target.value as VoucherDiscountType;
                setDiscountType(nextType);
                if (nextType === 'PERCENTAGE' && Number(discountValue) > 100) {
                  setDiscountValue('10');
                }
              }}
              options={[
                { value: 'FIXED_AMOUNT', label: 'Số tiền cố định (VND)' },
                { value: 'PERCENTAGE', label: 'Theo phần trăm (%)' },
              ]}
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-content-primary">
              {discountType === 'PERCENTAGE' ? 'Phần Trăm Giảm (%)' : 'Số Tiền Giảm (VND)'}{' '}
              <span className="text-accent-red">*</span>
            </label>
            {discountType === 'PERCENTAGE' ? (
              <Input
                type="number"
                min={1}
                max={100}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                required
              />
            ) : (
              <Input
                type="text"
                inputMode="numeric"
                value={formatMoneyDots(discountValue)}
                onChange={(e) => setDiscountValue(sanitizeMoneyDigits(e.target.value))}
                placeholder="VD: 50.000"
                required
              />
            )}
          </div>
        </div>

        {discountType === 'PERCENTAGE' && (
          <div>
            <label className="mb-1 block font-semibold text-content-primary">
              Mức Giảm Tối Đa (VND)
            </label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Để trống nếu không giới hạn tối đa"
              value={formatMoneyDots(maxDiscountAmount)}
              onChange={(e) => setMaxDiscountAmount(sanitizeMoneyDigits(e.target.value))}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block font-semibold text-content-primary">
              Đơn Tối Thiểu (VND)
            </label>
            <Input
              type="text"
              inputMode="numeric"
              value={formatMoneyDots(minOrderAmount)}
              onChange={(e) => setMinOrderAmount(sanitizeMoneyDigits(e.target.value))}
              placeholder="VD: 200.000"
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-content-primary">
              Tổng Số Lượng <span className="text-accent-red">*</span>
            </label>
            <Input
              type="number"
              min={1}
              value={totalQuantity}
              onChange={(e) => setTotalQuantity(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-content-primary">
              Số Lần Dùng / 1 Tài Khoản <span className="text-accent-red">*</span>
            </label>
            <Input
              type="number"
              min={1}
              max={Number(totalQuantity) || undefined}
              step={1}
              value={maxUsesPerUser}
              onChange={(e) => setMaxUsesPerUser(e.target.value)}
              required
            />
            <p className="mt-1 text-[11px] text-content-muted">
              Giới hạn số lần tối đa mỗi tài khoản được áp dụng mã này.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block font-semibold text-content-primary">
              Bắt Đầu Từ <span className="text-accent-red">*</span>
            </label>
            <Input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-content-primary">
              Hạn Đến <span className="text-accent-red">*</span>
            </label>
            <Input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        {isEditing && (
          <div>
            <label className="mb-1 block font-semibold text-content-primary">
              Trạng Thái Kích Hoạt
            </label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as VoucherStatus)}
              options={[
                { value: 'ACTIVE', label: 'Đang hoạt động (ACTIVE)' },
                { value: 'INACTIVE', label: 'Tạm tắt (INACTIVE)' },
              ]}
            />
          </div>
        )}

        <div className="mt-4 flex justify-end gap-3 border-t border-line-light pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Hủy Bỏ
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {isEditing ? 'Lưu Thay Đổi' : 'Lưu Voucher'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
