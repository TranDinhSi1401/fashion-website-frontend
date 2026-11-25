import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookmarkCheck,
  Check,
  Clock,
  Sparkles,
  Ticket,
  Wallet,
  X,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react';
import { VoucherResponse } from '../../types/voucher';
import { voucherService } from '../../services/voucherService';
import { extractErrorMessage, formatCurrencyVND } from '../../utils/format';
import { Button } from '../ui';

interface VoucherPickerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  appliedCode?: string | null;
  onSelectVoucher: (code: string) => Promise<void>;
  onRemoveVoucher: () => void;
}

export function estimateVoucherDiscount(v: VoucherResponse, subtotal: number): number {
  if (subtotal <= 0) return 0;
  if (v.discountType === 'PERCENTAGE') {
    const raw = Math.round((subtotal * Number(v.discountValue || 0)) / 100);
    const cap =
      v.maxDiscountAmount != null && Number(v.maxDiscountAmount) > 0
        ? Number(v.maxDiscountAmount)
        : Number.POSITIVE_INFINITY;
    return Math.min(subtotal, Math.min(raw, cap));
  }
  return Math.min(subtotal, Number(v.discountValue || 0));
}

function formatShortDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export default function VoucherPickerDrawer({
  isOpen,
  onClose,
  subtotal,
  appliedCode,
  onSelectVoucher,
  onRemoveVoucher,
}: VoucherPickerDrawerProps) {
  const [activeTab, setActiveTab] = useState<'ALL' | 'WALLET'>('ALL');
  const [availableVouchers, setAvailableVouchers] = useState<VoucherResponse[]>([]);
  const [myVouchers, setMyVouchers] = useState<VoucherResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [applyingCode, setApplyingCode] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const loadVouchers = async () => {
    setLoading(true);
    setError('');
    try {
      const [availRes, myRes] = await Promise.allSettled([
        voucherService.getAvailableVouchers(),
        voucherService.getMyVouchers(),
      ]);

      const availList =
        availRes.status === 'fulfilled' && Array.isArray(availRes.value.data)
          ? availRes.value.data
          : [];
      const walletList =
        myRes.status === 'fulfilled' && Array.isArray(myRes.value.data)
          ? myRes.value.data
          : [];

      const walletIds = new Set(walletList.map((w) => w.id));
      const mergedAvail = availList.map((v) => ({
        ...v,
        isClaimed: Boolean(v.isClaimed || walletIds.has(v.id)),
      }));

      setAvailableVouchers(mergedAvail);
      setMyVouchers(walletList);
    } catch (err) {
      setError(extractErrorMessage(err, 'Không thể tải danh sách mã giảm giá.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      void loadVouchers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Hợp nhất danh sách cho tab Tất cả (gồm cả voucher trong ví + kho công khai)
  const allMergedVouchers = useMemo(() => {
    const map = new Map<number, VoucherResponse>();
    myVouchers.forEach((v) => map.set(v.id, { ...v, isClaimed: true }));
    availableVouchers.forEach((v) => {
      const existing = map.get(v.id);
      map.set(v.id, {
        ...v,
        isClaimed: Boolean(v.isClaimed || existing?.isClaimed),
        claimedAt: v.claimedAt || existing?.claimedAt,
      });
    });
    return Array.from(map.values());
  }, [availableVouchers, myVouchers]);

  const evaluateVoucher = (v: VoucherResponse) => {
    const minOrder = Number(v.minOrderAmount || 0);
    const meetsMinOrder = subtotal >= minOrder;
    const hasStock = (v.remainingQuantity ?? v.totalQuantity - v.usedQuantity) > 0;
    const hasUserQuota = v.remainingUserUses == null || v.remainingUserUses > 0;
    const isClaimed = Boolean(v.isClaimed);
    const now = Date.now();
    const startOk = !v.startDate || new Date(v.startDate).getTime() <= now;
    const endOk = !v.endDate || new Date(v.endDate).getTime() >= now;
    const isActive = v.status === 'ACTIVE' && startOk && endOk;
    const isEligible = isActive && meetsMinOrder && hasStock && hasUserQuota && isClaimed;
    const estimatedDiscount = estimateVoucherDiscount(v, subtotal);
    const potentialDiscount = estimateVoucherDiscount(
      v,
      Math.max(subtotal, minOrder > 0 ? minOrder : subtotal)
    );
    const missingAmount = Math.max(0, minOrder - subtotal);

    let reason = '';
    if (!isActive) {
      reason = 'Voucher đã hết hạn hoặc tạm ngưng';
    } else if (!hasStock) {
      reason = 'Đã hết lượt sử dụng toàn hệ thống';
    } else if (!hasUserQuota) {
      reason = `Bạn đã sử dụng hết lượt của mã giảm giá này`;
    } else if (!isClaimed) {
      reason = 'Vui lòng bấm "Lưu vào Ví" trước khi áp dụng mã này';
    } else if (!meetsMinOrder) {
      reason = `Mua thêm ${formatCurrencyVND(missingAmount)} để giảm ${formatCurrencyVND(
        potentialDiscount
      )}`;
    }

    return {
      isEligible,
      isClaimed,
      meetsMinOrder,
      hasStock,
      hasUserQuota,
      isActive,
      estimatedDiscount,
      potentialDiscount,
      missingAmount,
      reason,
    };
  };

  // Tìm voucher giảm nhiều nhất trong số các voucher đủ điều kiện
  const bestVoucherId = useMemo(() => {
    let bestId: number | null = null;
    let maxDisc = 0;
    for (const v of allMergedVouchers) {
      const ev = evaluateVoucher(v);
      if (ev.isEligible && ev.estimatedDiscount > maxDisc) {
        maxDisc = ev.estimatedDiscount;
        bestId = v.id;
      }
    }
    return bestId;
  }, [allMergedVouchers, subtotal]);

  const displayedVouchers = useMemo(() => {
    const source = activeTab === 'WALLET' ? myVouchers : allMergedVouchers;
    return [...source].sort((a, b) => {
      const evA = evaluateVoucher(a);
      const evB = evaluateVoucher(b);
      if (evA.isEligible !== evB.isEligible) return evA.isEligible ? -1 : 1;
      if (Boolean(a.isClaimed) !== Boolean(b.isClaimed)) return a.isClaimed ? -1 : 1;
      return evB.estimatedDiscount - evA.estimatedDiscount;
    });
  }, [activeTab, myVouchers, allMergedVouchers, subtotal]);

  const handleApplyCode = async (code: string) => {
    if (!code.trim()) return;
    setApplyingCode(code);
    setFeedback(null);
    try {
      await onSelectVoucher(code.trim().toUpperCase());
      onClose();
    } catch (err) {
      const msg = extractErrorMessage(err, 'Mã giảm giá không tồn tại');
      if (msg.startsWith('Đã lưu mã')) {
        setFeedback({
          type: 'success',
          text: msg,
        });
        setManualCode('');
        void loadVouchers();
      } else {
        setFeedback({
          type: 'error',
          text: msg,
        });
      }
    } finally {
      setApplyingCode(null);
    }
  };

  const handleClaimToWallet = async (v: VoucherResponse) => {
    setClaimingId(v.id);
    setFeedback(null);
    try {
      const res = await voucherService.claimVoucher(v.id);
      const claimed = res.data || { ...v, isClaimed: true };
      setAvailableVouchers((prev) =>
        prev.map((item) => (item.id === v.id ? { ...item, isClaimed: true } : item))
      );
      setMyVouchers((prev) =>
        prev.some((item) => item.id === v.id) ? prev : [{ ...claimed, isClaimed: true }, ...prev]
      );
      setFeedback({
        type: 'success',
        text: `Đã lưu mã ${v.code} vào Ví Voucher của bạn!`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: extractErrorMessage(err, 'Không thể lưu voucher vào ví.'),
      });
    } finally {
      setClaimingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[1px] animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voucher-drawer-title"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-w-[480px] flex-col bg-surface-body shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-line-light bg-surface px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center bg-primary text-content-inverse">
              <Ticket size={18} />
            </div>
            <div>
              <h2
                id="voucher-drawer-title"
                className="text-base font-bold uppercase tracking-wider text-content-primary"
              >
                Chọn Mã Giảm Giá
              </h2>
              <p className="text-xs text-content-muted">
                Tổng tiền hàng hiện tại:{' '}
                <strong className="text-content-primary">{formatCurrencyVND(subtotal)}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng ngăn chọn voucher"
            className="flex h-8 w-8 items-center justify-center rounded-full text-content-muted transition-colors hover:bg-surface-elevated hover:text-content-primary"
          >
            <X size={18} />
          </button>
        </div>

        {/* Ô nhập mã nhanh trong Drawer */}
        <div className="border-b border-line-light bg-surface/60 px-5 py-3.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleApplyCode(manualCode);
                }
              }}
              placeholder="Nhập mã voucher (VD: WELCOME50K)"
              className="min-h-10 flex-1 rounded-input border border-line bg-surface-body px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:border-line-focus focus:outline-none"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={applyingCode === manualCode && Boolean(manualCode)}
              disabled={!manualCode.trim()}
              onClick={() => void handleApplyCode(manualCode)}
            >
              Áp dụng
            </Button>
          </div>
        </div>

        {/* Tabs chuyển đổi Tất cả / Ví của tôi */}
        <div className="grid grid-cols-2 border-b border-line-light bg-surface">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`flex items-center justify-center gap-2 border-b-2 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'ALL'
                ? 'border-primary text-content-primary'
                : 'border-transparent text-content-muted hover:text-content-primary'
            }`}
          >
            <Ticket size={14} />
            <span>Kho &amp; Ví ({allMergedVouchers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('WALLET')}
            className={`flex items-center justify-center gap-2 border-b-2 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'WALLET'
                ? 'border-primary text-content-primary'
                : 'border-transparent text-content-muted hover:text-content-primary'
            }`}
          >
            <Wallet size={14} />
            <span>Ví Của Tôi ({myVouchers.length})</span>
          </button>
        </div>

        {feedback && (
          <div
            className={`mx-5 mt-3 flex items-center gap-2 rounded-sm border px-3 py-2 text-xs ${
              feedback.type === 'success'
                ? 'border-status-success/30 bg-status-success/10 text-status-success'
                : 'border-status-error/30 bg-status-error/10 text-status-error'
            }`}
          >
            <AlertCircle size={14} className="shrink-0" />
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Danh sách thẻ Voucher */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">
          {loading ? (
            <div className="py-12 text-center text-sm text-content-muted">
              Đang tải danh sách mã giảm giá…
            </div>
          ) : error ? (
            <div className="rounded-sm border border-status-error/30 bg-status-error/10 p-4 text-center text-xs text-status-error">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void loadVouchers()}
                className="mt-2 font-semibold underline"
              >
                Thử lại
              </button>
            </div>
          ) : displayedVouchers.length === 0 ? (
            <div className="py-12 text-center">
              <Ticket size={36} className="mx-auto mb-3 text-content-muted opacity-40" />
              <p className="text-sm font-semibold text-content-primary">
                {activeTab === 'WALLET'
                  ? 'Ví Voucher của bạn chưa có mã nào'
                  : 'Hiện chưa có mã giảm giá khả dụng'}
              </p>
              <p className="mt-1 text-xs text-content-muted">
                {activeTab === 'WALLET'
                  ? 'Hãy chuyển sang tab "Kho & Ví" để lưu các mã giảm giá đang diễn ra.'
                  : 'Hãy quay lại sau để săn các chương trình ưu đãi mới nhất.'}
              </p>
            </div>
          ) : (
            displayedVouchers.map((v) => {
              const ev = evaluateVoucher(v);
              const isApplied =
                Boolean(appliedCode) &&
                appliedCode?.toUpperCase() === v.code.toUpperCase();
              const isBest = bestVoucherId === v.id && ev.isEligible;
              const isPercent = v.discountType === 'PERCENTAGE';
              const minOrder = Number(v.minOrderAmount || 0);
              const progressPct =
                minOrder > 0 ? Math.min(100, Math.round((subtotal / minOrder) * 100)) : 100;

              return (
                <div
                  key={v.id}
                  className={`relative overflow-hidden border transition-all ${
                    isApplied
                      ? 'border-primary bg-surface shadow-md ring-1 ring-primary'
                      : ev.isEligible
                        ? 'border-line bg-surface-body hover:border-primary'
                        : 'border-line-light bg-surface/50 opacity-75'
                  }`}
                >
                  {/* Top Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-line-light bg-surface px-3.5 py-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-extrabold tracking-wider text-content-primary">
                        {v.code}
                      </span>
                      {v.isClaimed && (
                        <span className="inline-flex items-center gap-1 rounded-xs bg-accent-gold/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-gold">
                          <BookmarkCheck size={11} />
                          Trong ví
                        </span>
                      )}
                      {isBest && (
                        <span className="inline-flex items-center gap-1 rounded-xs bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                          <Sparkles size={10} />
                          Tiết kiệm nhất
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-content-muted">
                      {v.remainingUserUses != null
                        ? `Còn ${v.remainingUserUses}/${v.maxUsesPerUser} lượt`
                        : `Tối đa ${v.maxUsesPerUser} lượt/TK`}
                    </span>
                  </div>

                  {/* Main Body */}
                  <div className="grid grid-cols-[92px_minmax(0,1fr)]">
                    {/* Left Stub */}
                    <div
                      className={`flex flex-col items-center justify-center border-r border-dashed border-line px-2 py-3 text-center ${
                        ev.isEligible
                          ? 'bg-primary text-content-inverse'
                          : 'bg-surface-elevated text-content-secondary'
                      }`}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                        GIẢM
                      </span>
                      <strong className="mt-0.5 text-base font-extrabold leading-tight">
                        {isPercent
                          ? `${v.discountValue}%`
                          : `${Math.round(Number(v.discountValue) / 1000)}K`}
                      </strong>
                      {isPercent && v.maxDiscountAmount != null && Number(v.maxDiscountAmount) > 0 && (
                        <span className="mt-1 text-[10px] opacity-85">
                          Tối đa {Math.round(Number(v.maxDiscountAmount) / 1000)}K
                        </span>
                      )}
                    </div>

                    {/* Right Info */}
                    <div className="flex flex-col justify-between p-3.5">
                      <div>
                        <h3 className="text-sm font-bold text-content-primary leading-snug">
                          {v.name}
                        </h3>
                        {v.description && (
                          <p className="mt-0.5 text-xs text-content-secondary line-clamp-2">
                            {v.description}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-content-muted">
                          <span>
                            {minOrder > 0
                              ? `Đơn tối thiểu ${formatCurrencyVND(minOrder)}`
                              : 'Không giới hạn đơn tối thiểu'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock size={11} />
                            HSD: {formatShortDate(v.endDate)}
                          </span>
                        </div>

                        {ev.isEligible && ev.estimatedDiscount > 0 && (
                          <p className="mt-1.5 text-xs font-bold text-status-success">
                            Giảm ngay −{formatCurrencyVND(ev.estimatedDiscount)} cho đơn này
                          </p>
                        )}

                        {!ev.isEligible && ev.reason && (
                          <div className="mt-2">
                            {!ev.meetsMinOrder && ev.isActive && ev.hasStock && ev.hasUserQuota && (
                              <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line-light">
                                <div
                                  className="h-full bg-accent-gold transition-all"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-medium text-amber-700">
                                {ev.reason}
                              </span>
                              {!ev.meetsMinOrder && ev.isActive && (
                                <Link
                                  to="/products"
                                  onClick={onClose}
                                  className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-primary underline"
                                >
                                  <ShoppingBag size={11} />
                                  Mua thêm
                                </Link>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-end gap-2 border-t border-line-light pt-2.5">
                        {!v.isClaimed ? (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={!ev.isActive || !ev.hasStock || !ev.hasUserQuota}
                            loading={claimingId === v.id}
                            onClick={() => void handleClaimToWallet(v)}
                          >
                            {!ev.hasUserQuota ? 'Đã sử dụng' : 'Lưu vào Ví để dùng'}
                          </Button>
                        ) : isApplied ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              onRemoveVoucher();
                              onClose();
                            }}
                          >
                            <Check size={14} className="mr-1 text-status-success" />
                            Đang chọn (Bỏ chọn)
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={!ev.isEligible}
                            loading={applyingCode === v.code}
                            onClick={() => void handleApplyCode(v.code)}
                          >
                            {!ev.hasUserQuota ? 'Đã sử dụng' : 'Áp dụng'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-line-light bg-surface px-5 py-3.5 flex items-center justify-between gap-3">
          <Link
            to="/account/vouchers"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-content-secondary hover:text-content-primary underline underline-offset-4"
          >
            <Wallet size={14} />
            <span>Quản lý Ví Voucher của tôi</span>
          </Link>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
