import React, { useEffect, useState } from 'react';
import { Package, Plus, Trash2 } from 'lucide-react';
import {
  OfferProductTarget,
  OfferType,
  SpecialOfferCreationRequest,
  SpecialOfferProductResponse,
  SpecialOfferResponse,
} from '../../types/promotion';
import { promotionService } from '../../services/promotionService';
import { extractErrorMessage, formatCurrencyVND } from '../../utils/format';
import { Badge, Button, Checkbox, Input, Modal, Select } from '../ui';
import ProductPickerModal from './ProductPickerModal';

export interface PromotionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerType: OfferType;
  editingOffer: SpecialOfferResponse | null;
  onSaved: (message: string) => void;
}

function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 16);
}

function normalizeIsoLocalDateTime(dtLocal: string): string {
  if (!dtLocal) return '';
  return dtLocal.length === 16 ? `${dtLocal}:00` : dtLocal;
}

function makeTargetKey(productId: number, variantId?: number | null): string {
  return `${productId}:${variantId ? variantId : 'ALL'}`;
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

export default function PromotionFormModal({
  isOpen,
  onClose,
  offerType,
  editingOffer,
  onSaved,
}: PromotionFormModalProps) {
  const [title, setTitle] = useState<string>('');
  const [discountMode, setDiscountMode] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [discountPercent, setDiscountPercent] = useState<string>('10');
  const [discountAmount, setDiscountAmount] = useState<string>('');
  const [minOrderAmount, setMinOrderAmount] = useState<string>('0');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Quản lý danh sách sản phẩm & biến thể áp dụng (cho khuyến mãi SẢN PHẨM)
  const [selectedTargets, setSelectedTargets] = useState<OfferProductTarget[]>([]);
  const [isLoadingAssignedProducts, setIsLoadingAssignedProducts] = useState<boolean>(false);
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);

  // Trạng thái lỗi validate & gửi biểu mẫu
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const effectiveOfferType: OfferType =
    (editingOffer?.offerType?.toUpperCase() === 'ORDER'
      ? 'ORDER'
      : editingOffer?.offerType?.toUpperCase() === 'PRODUCT'
      ? 'PRODUCT'
      : offerType) || offerType;

  // Khởi tạo dữ liệu form khi mở Modal Thêm mới hoặc Cập nhật
  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setSubmitError('');

    if (editingOffer) {
      setTitle(editingOffer.title || '');
      const hasAmount =
        editingOffer.discountAmount !== null &&
        editingOffer.discountAmount !== undefined &&
        Number(editingOffer.discountAmount) > 0;
      setDiscountMode(hasAmount ? 'AMOUNT' : 'PERCENT');
      setDiscountPercent(
        editingOffer.discountPercent !== null && editingOffer.discountPercent !== undefined
          ? String(editingOffer.discountPercent)
          : ''
      );
      setDiscountAmount(
        editingOffer.discountAmount !== null && editingOffer.discountAmount !== undefined
          ? sanitizeMoneyDigits(Math.round(Number(editingOffer.discountAmount)))
          : ''
      );
      setMinOrderAmount(
        editingOffer.minOrderAmount !== null && editingOffer.minOrderAmount !== undefined
          ? sanitizeMoneyDigits(Math.round(Number(editingOffer.minOrderAmount)))
          : '0'
      );
      setMaxDiscountAmount(
        editingOffer.maxDiscountAmount !== null && editingOffer.maxDiscountAmount !== undefined
          ? sanitizeMoneyDigits(Math.round(Number(editingOffer.maxDiscountAmount)))
          : ''
      );
      setStartDate(toDatetimeLocalValue(editingOffer.startDate));
      setEndDate(toDatetimeLocalValue(editingOffer.endDate));
      setIsActive(editingOffer.isActive !== false);

      // Nếu là khuyến mãi SẢN PHẨM, tải danh sách sản phẩm & biến thể đã gán trước đó
      if (effectiveOfferType === 'PRODUCT') {
        setSelectedTargets([]);
        setIsLoadingAssignedProducts(true);
        promotionService
          .getOfferProducts(editingOffer.id)
          .then((res) => {
            const list: SpecialOfferProductResponse[] = res?.data || [];
            const mapped: OfferProductTarget[] = list
              .filter((item) => Boolean(item.productId))
              .map((item) => ({
                productId: Number(item.productId),
                productVariantId:
                  item.productVariantId !== null && item.productVariantId !== undefined
                    ? Number(item.productVariantId)
                    : null,
                productName: item.productName || `Sản phẩm #${item.productId}`,
                productBasePrice: item.productBasePrice,
                productImageUrl: item.productImageUrl,
                variantSku: item.variantSku,
                variantColor: item.variantColor,
                variantSize: item.variantSize,
                variantPrice: item.variantPrice,
              }));
            setSelectedTargets(mapped);
          })
          .catch(() => {
            const fallbackTargets: OfferProductTarget[] = (editingOffer.productIds || []).map(
              (pid) => ({
                productId: Number(pid),
                productVariantId: null,
              })
            );
            setSelectedTargets(fallbackTargets);
          })
          .finally(() => {
            setIsLoadingAssignedProducts(false);
          });
      } else {
        setSelectedTargets([]);
      }
    } else {
      // Mặc định cho Thêm mới
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      const formatLocal = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
          d.getMinutes()
        )}`;

      setTitle('');
      setDiscountMode('PERCENT');
      setDiscountPercent('10');
      setDiscountAmount('');
      setMinOrderAmount(effectiveOfferType === 'ORDER' ? '300000' : '0');
      setMaxDiscountAmount('');
      setStartDate(formatLocal(now));
      setEndDate(formatLocal(nextWeek));
      setIsActive(true);
      setSelectedTargets([]);
    }
  }, [isOpen, editingOffer, effectiveOfferType]);

  const validateForm = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!title.trim()) {
      nextErrors.title = 'Vui lòng nhập tên / tiêu đề chương trình khuyến mãi.';
    } else if (title.trim().length > 200) {
      nextErrors.title = 'Tiêu đề khuyến mãi không được vượt quá 200 ký tự.';
    }

    if (discountMode === 'PERCENT') {
      const pct = Number(discountPercent);
      if (!discountPercent || isNaN(pct) || !Number.isInteger(pct) || pct < 1 || pct > 100) {
        nextErrors.discountPercent = 'Phần trăm giảm giá phải là số nguyên từ 1% đến 100%.';
      }
    } else {
      const amt = Number(discountAmount);
      if (!discountAmount || isNaN(amt) || amt <= 0) {
        nextErrors.discountAmount = 'Số tiền giảm giá phải lớn hơn 0₫.';
      }
    }

    if (minOrderAmount !== '') {
      const minOrd = Number(minOrderAmount);
      if (isNaN(minOrd) || minOrd < 0) {
        nextErrors.minOrderAmount = 'Giá trị đơn hàng tối thiểu không được âm.';
      }
    }

    if (maxDiscountAmount.trim() !== '') {
      const maxDisc = Number(maxDiscountAmount);
      if (isNaN(maxDisc) || maxDisc <= 0) {
        nextErrors.maxDiscountAmount = 'Mức giảm tối đa phải lớn hơn 0₫.';
      }
    }

    if (!startDate) {
      nextErrors.startDate = 'Vui lòng chọn thời điểm bắt đầu.';
    }
    if (!endDate) {
      nextErrors.endDate = 'Vui lòng chọn thời điểm kết thúc.';
    }
    if (startDate && endDate && new Date(startDate).getTime() > new Date(endDate).getTime()) {
      nextErrors.endDate = 'Thời điểm kết thúc phải lớn hơn hoặc bằng thời điểm bắt đầu.';
    }

    if (effectiveOfferType === 'PRODUCT' && selectedTargets.length === 0) {
      nextErrors.products =
        'Vui lòng chọn ít nhất 1 sản phẩm hoặc biến thể để áp dụng khuyến mãi.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleConfirmTargets = (targets: OfferProductTarget[]) => {
    setSelectedTargets(targets);
    if (targets.length > 0 && errors.products) {
      setErrors((prev) => ({ ...prev, products: '' }));
    }
  };

  const handleRemoveSelectedTarget = (target: OfferProductTarget) => {
    const key = makeTargetKey(target.productId, target.productVariantId);
    setSelectedTargets((prev) =>
      prev.filter((item) => makeTargetKey(item.productId, item.productVariantId) !== key)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) return;

    const distinctProductIds = Array.from(new Set(selectedTargets.map((t) => t.productId)));

    const payload: SpecialOfferCreationRequest = {
      title: title.trim(),
      offerType: effectiveOfferType,
      discountPercent: discountMode === 'PERCENT' ? Number(discountPercent) : null,
      discountAmount: discountMode === 'AMOUNT' ? Number(discountAmount) : null,
      minOrderAmount: minOrderAmount !== '' ? Number(minOrderAmount) : 0,
      maxDiscountAmount: maxDiscountAmount.trim() !== '' ? Number(maxDiscountAmount) : null,
      startDate: normalizeIsoLocalDateTime(startDate),
      endDate: normalizeIsoLocalDateTime(endDate),
      isActive,
      productIds: effectiveOfferType === 'PRODUCT' ? distinctProductIds : undefined,
      productTargets:
        effectiveOfferType === 'PRODUCT'
          ? selectedTargets.map((t) => ({
              productId: t.productId,
              productVariantId: t.productVariantId ?? null,
            }))
          : undefined,
    };

    setIsSubmitting(true);
    try {
      if (editingOffer) {
        await promotionService.updateOffer(editingOffer.id, payload);
        onSaved(`Đã cập nhật khuyến mãi "${payload.title}" thành công!`);
      } else {
        await promotionService.createOffer(payload);
        onSaved(`Đã tạo mới khuyến mãi "${payload.title}" thành công!`);
      }
      onClose();
    } catch (err) {
      setSubmitError(extractErrorMessage(err, 'Không thể lưu chương trình khuyến mãi.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle = editingOffer
    ? `Cập Nhật Khuyến Mãi ${effectiveOfferType === 'ORDER' ? 'Hóa Đơn' : 'Sản Phẩm'} #${
        editingOffer.id
      }`
    : `Thêm Khuyến Mãi ${effectiveOfferType === 'ORDER' ? 'Hóa Đơn' : 'Sản Phẩm'} Mới`;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} maxWidth="760px">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {submitError && (
            <div className="p-3 border-l-2 border-status-error bg-status-error/10 text-status-error text-xs font-semibold">
              {submitError}
            </div>
          )}

          {/* Loại khuyến mãi hiển thị rõ ràng */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-surface border border-line-light">
            <span className="text-xs font-semibold uppercase tracking-wider text-content-secondary">
              Phân loại chương trình
            </span>
            <Badge variant={effectiveOfferType === 'ORDER' ? 'vip' : 'sale'}>
              {effectiveOfferType === 'ORDER'
                ? 'KHUYẾN MÃI HÓA ĐƠN (ORDER)'
                : 'KHUYẾN MÃI SẢN PHẨM & BIẾN THỂ (PRODUCT)'}
            </Badge>
          </div>

          <Input
            label="Tên / Tiêu đề chương trình khuyến mãi *"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors({ ...errors, title: '' });
            }}
            placeholder={
              effectiveOfferType === 'ORDER'
                ? 'Ví dụ: VOUCHER HÓA ĐƠN MÙA THU - GIẢM 15% ĐƠN TỪ 500K'
                : 'Ví dụ: XẢ KHO ÁO SƠ MI & POLO THEO SIZE/MÀU - GIẢM TỚI 20%'
            }
            error={errors.title}
          />

          {/* Hình thức giảm giá & Giá trị giảm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Hình thức giảm giá *"
              value={discountMode}
              onChange={(e) => {
                const mode = e.target.value as 'PERCENT' | 'AMOUNT';
                setDiscountMode(mode);
                setErrors((prev) => ({
                  ...prev,
                  discountPercent: '',
                  discountAmount: '',
                }));
              }}
              options={[
                { value: 'PERCENT', label: 'Giảm theo phần trăm (%)' },
                { value: 'AMOUNT', label: 'Giảm số tiền cố định (VNĐ)' },
              ]}
            />

            {discountMode === 'PERCENT' ? (
              <Input
                label="Phần trăm giảm giá (1% - 100%) *"
                type="number"
                min={1}
                max={100}
                value={discountPercent}
                onChange={(e) => {
                  setDiscountPercent(e.target.value);
                  if (errors.discountPercent) setErrors({ ...errors, discountPercent: '' });
                }}
                placeholder="Ví dụ: 15"
                error={errors.discountPercent}
                helperText={
                  discountPercent && !isNaN(Number(discountPercent))
                    ? `Mức giảm: -${discountPercent}%`
                    : undefined
                }
              />
            ) : (
              <Input
                label="Số tiền giảm trực tiếp (VNĐ) *"
                type="text"
                inputMode="numeric"
                value={formatMoneyDots(discountAmount)}
                onChange={(e) => {
                  setDiscountAmount(sanitizeMoneyDigits(e.target.value));
                  if (errors.discountAmount) setErrors({ ...errors, discountAmount: '' });
                }}
                placeholder="Ví dụ: 50.000"
                error={errors.discountAmount}
                helperText={
                  discountAmount && Number(discountAmount) > 0
                    ? `Hiển thị: -${formatCurrencyVND(Number(discountAmount))}`
                    : undefined
                }
              />
            )}
          </div>

          {/* Điều kiện đơn hàng tối thiểu & Mức giảm tối đa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={
                effectiveOfferType === 'ORDER'
                  ? 'Giá trị hóa đơn tối thiểu (VNĐ) *'
                  : 'Giá trị đơn tối thiểu (VNĐ)'
              }
              type="text"
              inputMode="numeric"
              value={formatMoneyDots(minOrderAmount)}
              onChange={(e) => {
                setMinOrderAmount(sanitizeMoneyDigits(e.target.value));
                if (errors.minOrderAmount) setErrors({ ...errors, minOrderAmount: '' });
              }}
              placeholder="Ví dụ: 300.000 (nhập 0 nếu không giới hạn)"
              error={errors.minOrderAmount}
              helperText={`Tối thiểu: ${formatCurrencyVND(Number(minOrderAmount || 0))}`}
            />

            <Input
              label="Mức giảm tối đa (VNĐ - Tùy chọn)"
              type="text"
              inputMode="numeric"
              value={formatMoneyDots(maxDiscountAmount)}
              onChange={(e) => {
                setMaxDiscountAmount(sanitizeMoneyDigits(e.target.value));
                if (errors.maxDiscountAmount) setErrors({ ...errors, maxDiscountAmount: '' });
              }}
              placeholder="Để trống nếu không giới hạn trần giảm"
              error={errors.maxDiscountAmount}
              helperText={
                maxDiscountAmount && Number(maxDiscountAmount) > 0
                  ? `Tối đa: ${formatCurrencyVND(Number(maxDiscountAmount))}`
                  : 'Áp dụng hữu ích khi giảm theo %'
              }
            />
          </div>

          {/* Thời gian bắt đầu & kết thúc */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Thời điểm bắt đầu *"
              type="datetime-local"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (errors.startDate || errors.endDate) {
                  setErrors({ ...errors, startDate: '', endDate: '' });
                }
              }}
              error={errors.startDate}
            />

            <Input
              label="Thời điểm kết thúc *"
              type="datetime-local"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                if (errors.endDate) setErrors({ ...errors, endDate: '' });
              }}
              error={errors.endDate}
            />
          </div>

          {/* Phần chọn sản phẩm & biến thể áp dụng (Chỉ dành cho Khuyến mãi SẢN PHẨM) */}
          {effectiveOfferType === 'PRODUCT' && (
            <div className="border border-line-light bg-surface p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-content-primary">
                    Sản phẩm &amp; Biến thể áp dụng ({selectedTargets.length}) *
                  </div>
                  <div className="text-xs text-content-secondary">
                    Có thể chọn áp dụng cho cả sản phẩm hoặc chọn đến từng biến thể (Màu sắc &amp;
                    Kích cỡ).
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={Plus}
                  onClick={() => setIsPickerOpen(true)}
                >
                  Chọn SP / Biến Thể ({selectedTargets.length})
                </Button>
              </div>

              {errors.products && (
                <div className="text-xs italic text-status-error">{errors.products}</div>
              )}

              {isLoadingAssignedProducts ? (
                <div className="py-4 text-center text-xs text-content-muted">
                  Đang tải danh sách sản phẩm và biến thể đã gán...
                </div>
              ) : selectedTargets.length === 0 ? (
                <div className="py-5 text-center border border-dashed border-line text-xs text-content-muted bg-surface-body">
                  Chưa có sản phẩm/biến thể nào được chọn. Nhấn &ldquo;CHỌN SP / BIẾN THỂ&rdquo; để
                  thêm.
                </div>
              ) : (
                <div className="max-h-[210px] overflow-y-auto divide-y divide-line-light border border-line-light bg-surface-body">
                  {selectedTargets.map((target) => {
                    const key = makeTargetKey(target.productId, target.productVariantId);
                    const isVariant =
                      target.productVariantId !== null && target.productVariantId !== undefined;

                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-surface/60"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 aspect-[3/4] bg-surface border border-line-light overflow-hidden shrink-0 flex items-center justify-center">
                            {target.productImageUrl ? (
                              <img
                                src={target.productImageUrl}
                                alt={target.productName || `#${target.productId}`}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package size={14} className="text-content-muted" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-content-primary truncate">
                              {target.productName || `Sản phẩm #${target.productId}`}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-content-muted mt-0.5">
                              <span>Mã SP: #{target.productId}</span>
                              {isVariant ? (
                                <Badge variant="sale" className="text-[10px] py-0 px-1.5">
                                  Màu: {target.variantColor || '—'} • Size:{' '}
                                  {target.variantSize || '—'} (#{target.productVariantId})
                                </Badge>
                              ) : (
                                <Badge variant="new" className="text-[10px] py-0 px-1.5">
                                  Toàn bộ biến thể
                                </Badge>
                              )}
                              {(target.variantPrice ?? target.productBasePrice) !== undefined && (
                                <span>
                                  • Giá:{' '}
                                  {formatCurrencyVND(
                                    target.variantPrice ?? target.productBasePrice ?? 0
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedTarget(target)}
                          aria-label="Bỏ chọn"
                          className="inline-flex items-center gap-1 px-2 py-1 text-content-muted hover:text-status-error transition-colors shrink-0"
                        >
                          <Trash2 size={14} />
                          <span>Bỏ chọn</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <Checkbox
            label="Kích hoạt chương trình khuyến mãi ngay khi lưu"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line-light">
            <Button type="button" variant="secondary" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {editingOffer ? 'Lưu Cập Nhật' : 'Tạo Khuyến Mãi'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Hộp thoại chọn sản phẩm & biến thể áp khuyến mãi */}
      <ProductPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        selectedTargets={selectedTargets}
        onConfirm={handleConfirmTargets}
      />
    </>
  );
}
