import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  BookmarkCheck,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Gift,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Ticket,
  Wallet,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { voucherService } from '../services/voucherService';
import { VoucherResponse } from '../types/voucher';
import { extractErrorMessage, formatCurrencyVND } from '../utils/format';
import { Badge, Button, Input } from '../components/ui';

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

function isVoucherUsableForUser(v: VoucherResponse): boolean {
  if (v.status !== 'ACTIVE') return false;
  const now = Date.now();
  if (v.startDate && new Date(v.startDate).getTime() > now) return false;
  if (v.endDate && new Date(v.endDate).getTime() < now) return false;
  const remStock = v.remainingQuantity ?? v.totalQuantity - v.usedQuantity;
  if (remStock <= 0) return false;
  if (v.remainingUserUses != null && v.remainingUserUses <= 0) return false;
  return true;
}

export default function CustomerVouchersTab() {
  const { cart } = useCart();
  const navigate = useNavigate();

  const [myVouchers, setMyVouchers] = useState<VoucherResponse[]>([]);
  const [availableVouchers, setAvailableVouchers] = useState<VoucherResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'USABLE' | 'INACTIVE'>('ALL');
  const [claimCodeInput, setClaimCodeInput] = useState('');
  const [claimingCode, setClaimingCode] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [myRes, availRes] = await Promise.allSettled([
        voucherService.getMyVouchers(),
        voucherService.getAvailableVouchers(),
      ]);

      const walletList =
        myRes.status === 'fulfilled' && Array.isArray(myRes.value.data)
          ? myRes.value.data
          : [];
      const availList =
        availRes.status === 'fulfilled' && Array.isArray(availRes.value.data)
          ? availRes.value.data
          : [];

      setMyVouchers(walletList);
      setAvailableVouchers(availList);
    } catch (err) {
      setMessage({
        type: 'error',
        text: extractErrorMessage(err, 'Không thể tải dữ liệu Ví Voucher.'),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleClaimByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimCodeInput.trim()) return;

    setClaimingCode(true);
    setMessage(null);
    try {
      const res = await voucherService.claimVoucherByCode(claimCodeInput.trim().toUpperCase());
      setClaimCodeInput('');
      setMessage({
        type: 'success',
        text: `Đã lưu mã "${res.data?.code || claimCodeInput.toUpperCase()}" vào Ví Voucher thành công!`,
      });
      await loadData();
    } catch (err) {
      setMessage({
        type: 'error',
        text: extractErrorMessage(err, 'Không thể lưu mã voucher này.'),
      });
    } finally {
      setClaimingCode(false);
    }
  };

  const handleClaimPublicVoucher = async (v: VoucherResponse) => {
    setClaimingId(v.id);
    setMessage(null);
    try {
      await voucherService.claimVoucher(v.id);
      setMessage({
        type: 'success',
        text: `Đã lưu mã "${v.code}" vào Ví Voucher của bạn!`,
      });
      await loadData();
    } catch (err) {
      setMessage({
        type: 'error',
        text: extractErrorMessage(err, 'Không thể lưu mã voucher.'),
      });
    } finally {
      setClaimingId(null);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => {
        setCopiedCode((prev) => (prev === code ? null : prev));
      }, 2000);
    } catch {
      // ignore
    }
  };

  const handleUseNow = (v: VoucherResponse) => {
    if (cart && cart.items && cart.items.length > 0) {
      navigate('/checkout', { state: { voucherCode: v.code } });
    } else {
      navigate('/products');
    }
  };

  const usableCount = useMemo(
    () => myVouchers.filter((v) => isVoucherUsableForUser(v)).length,
    [myVouchers]
  );
  const inactiveCount = myVouchers.length - usableCount;

  const filteredWalletVouchers = useMemo(() => {
    if (filter === 'USABLE') {
      return myVouchers.filter((v) => isVoucherUsableForUser(v));
    }
    if (filter === 'INACTIVE') {
      return myVouchers.filter((v) => !isVoucherUsableForUser(v));
    }
    return [...myVouchers].sort((a, b) => {
      const uA = isVoucherUsableForUser(a);
      const uB = isVoucherUsableForUser(b);
      if (uA !== uB) return uA ? -1 : 1;
      return 0;
    });
  }, [myVouchers, filter]);

  const unclaimedPublicVouchers = useMemo(() => {
    const claimedIds = new Set(myVouchers.map((v) => v.id));
    return availableVouchers.filter((v) => !v.isClaimed && !claimedIds.has(v.id));
  }, [availableVouchers, myVouchers]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-[1.2rem] font-bold uppercase tracking-[0.05em] text-content-primary m-0">
              Ví Voucher Của Tôi
            </h3>
            <Badge variant="dark" className="text-xs font-bold px-2 py-0.5">
              {usableCount} khả dụng
            </Badge>
          </div>
          <p className="mt-1 text-xs text-content-secondary m-0">
            Lưu trữ các mã giảm giá đã thu thập và quà tặng thành viên để áp dụng nhanh khi thanh toán
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          onClick={() => void loadData()}
        >
          Làm mới
        </Button>
      </div>

      {/* Ô nhập mã để lưu vào Ví */}
      <form
        onSubmit={handleClaimByCode}
        className="mb-6 flex flex-col gap-3 border border-line-light bg-surface p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <Input
            label="Nhập mã Voucher để lưu vào Ví"
            placeholder="Nhập mã giảm giá (VD: WELCOME50K, FASHION10...)"
            value={claimCodeInput}
            onChange={(e) => setClaimCodeInput(e.target.value.toUpperCase())}
            icon={Ticket}
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          loading={claimingCode}
          disabled={!claimCodeInput.trim()}
          icon={Plus}
          className="sm:mb-0.5"
        >
          Lưu Vào Ví
        </Button>
      </form>

      {message && (
        <div
          className={`mb-5 flex items-center gap-2.5 border px-4 py-3 text-xs font-medium ${
            message.type === 'success'
              ? 'border-status-success/30 bg-status-success/10 text-status-success'
              : 'border-status-error/30 bg-status-error/10 text-status-error'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 size={16} className="shrink-0" />
          ) : (
            <AlertCircle size={16} className="shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Bộ lọc tab Ví */}
      <div className="mb-5 flex flex-wrap gap-2 border-b border-line-light pb-3">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
            filter === 'ALL'
              ? 'bg-primary text-content-inverse'
              : 'bg-surface text-content-secondary hover:text-content-primary'
          }`}
        >
          Tất cả ({myVouchers.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('USABLE')}
          className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
            filter === 'USABLE'
              ? 'bg-primary text-content-inverse'
              : 'bg-surface text-content-secondary hover:text-content-primary'
          }`}
        >
          Còn hiệu lực ({usableCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('INACTIVE')}
          className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
            filter === 'INACTIVE'
              ? 'bg-primary text-content-inverse'
              : 'bg-surface text-content-secondary hover:text-content-primary'
          }`}
        >
          Đã dùng hết / Hết hạn ({inactiveCount})
        </button>
      </div>

      {/* Danh sách Voucher trong Ví */}
      {loading ? (
        <div className="py-12 text-center text-sm text-content-muted">
          Đang tải Ví Voucher của bạn…
        </div>
      ) : filteredWalletVouchers.length === 0 ? (
        <div className="border border-dashed border-line-light bg-surface py-12 px-5 text-center">
          <Wallet size={36} className="mx-auto mb-3 text-content-muted opacity-40" />
          <p className="text-sm font-semibold text-content-primary m-0">
            {filter === 'ALL'
              ? 'Bạn chưa có voucher nào trong Ví'
              : filter === 'USABLE'
                ? 'Không có voucher nào đang còn hiệu lực trong Ví'
                : 'Không có voucher đã dùng hết hoặc hết hạn'}
          </p>
          <p className="mt-1 mb-4 text-xs text-content-muted">
            Hãy lưu các mã giảm giá bên dưới hoặc nhập mã code để tích lũy ưu đãi cho đơn hàng tiếp theo.
          </p>
          <Link to="/products">
            <Button variant="secondary" size="sm" icon={ShoppingBag}>
              Khám phá sản phẩm
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredWalletVouchers.map((v) => {
            const usable = isVoucherUsableForUser(v);
            const isPercent = v.discountType === 'PERCENTAGE';
            const minOrder = Number(v.minOrderAmount || 0);
            const isWelcome = v.code.toUpperCase() === 'WELCOME50K';
            const remUserUses =
              v.remainingUserUses != null ? v.remainingUserUses : v.maxUsesPerUser;

            return (
              <div
                key={v.id}
                className={`flex flex-col justify-between overflow-hidden border transition-all ${
                  usable
                    ? 'border-line bg-surface-body shadow-xs hover:border-primary'
                    : 'border-line-light bg-surface/60 opacity-70'
                }`}
              >
                {/* Top Strip */}
                <div className="flex items-center justify-between border-b border-dashed border-line-light bg-surface px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-extrabold tracking-wider text-content-primary">
                      {v.code}
                    </span>
                    {isWelcome && (
                      <span className="inline-flex items-center gap-1 rounded-xs bg-accent-gold/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-gold">
                        <Gift size={10} />
                        Quà chào mừng
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-medium text-content-muted">
                    {usable
                      ? `Còn ${remUserUses}/${v.maxUsesPerUser} lượt dùng`
                      : remUserUses <= 0
                        ? 'Đã dùng hết lượt'
                        : 'Đã hết hiệu lực'}
                  </span>
                </div>

                {/* Content */}
                <div className="grid grid-cols-[96px_minmax(0,1fr)] flex-1">
                  <div
                    className={`flex flex-col items-center justify-center border-r border-dashed border-line px-2 py-4 text-center ${
                      usable
                        ? 'bg-primary text-content-inverse'
                        : 'bg-surface-elevated text-content-secondary'
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                      GIẢM
                    </span>
                    <strong className="mt-0.5 text-lg font-extrabold leading-tight">
                      {isPercent
                        ? `${v.discountValue}%`
                        : `${Math.round(Number(v.discountValue) / 1000)}K`}
                    </strong>
                    {isPercent &&
                      v.maxDiscountAmount != null &&
                      Number(v.maxDiscountAmount) > 0 && (
                        <span className="mt-1 text-[10px] opacity-85">
                          Tối đa {Math.round(Number(v.maxDiscountAmount) / 1000)}K
                        </span>
                      )}
                  </div>

                  <div className="flex flex-col justify-between p-3.5">
                    <div>
                      <h4 className="text-sm font-bold text-content-primary">{v.name}</h4>
                      {v.description && (
                        <p className="mt-1 text-xs text-content-secondary line-clamp-2">
                          {v.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-content-muted">
                        <span>
                          {minOrder > 0
                            ? `Đơn từ ${formatCurrencyVND(minOrder)}`
                            : 'Mọi đơn hàng'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} />
                          HSD: {formatShortDate(v.endDate)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-line-light pt-2.5">
                      {usable ? (
                        <button
                          type="button"
                          onClick={() => void handleCopyCode(v.code)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-content-secondary hover:text-content-primary"
                        >
                          {copiedCode === v.code ? (
                            <>
                              <Check size={13} className="text-status-success" />
                              <span className="text-status-success">Đã sao chép</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              <span>Sao chép mã</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-content-muted">
                          {remUserUses <= 0 ? 'Bạn đã sử dụng mã này' : 'Mã đã hết hạn'}
                        </span>
                      )}

                      {usable ? (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => handleUseNow(v)}
                        >
                          {cart && cart.items && cart.items.length > 0
                            ? 'Dùng tại Checkout'
                            : 'Mua sắm ngay'}
                        </Button>
                      ) : (
                        <Badge variant="default">
                          {remUserUses <= 0 ? 'Đã sử dụng' : 'Không khả dụng'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Khám phá thêm từ Kho Voucher công khai */}
      {unclaimedPublicVouchers.length > 0 && (
        <div className="mt-10 border-t border-line-light pt-8">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-accent-gold" />
            <h4 className="text-base font-bold uppercase tracking-wider text-content-primary m-0">
              Săn Thêm Mã Giảm Giá Từ Cửa Hàng ({unclaimedPublicVouchers.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {unclaimedPublicVouchers.map((v) => {
              const isPercent = v.discountType === 'PERCENTAGE';
              const minOrder = Number(v.minOrderAmount || 0);
              return (
                <div
                  key={v.id}
                  className="grid grid-cols-[90px_minmax(0,1fr)] overflow-hidden border border-dashed border-accent-gold/60 bg-surface"
                >
                  <div className="flex flex-col items-center justify-center border-r border-dashed border-line bg-surface-dark px-2 py-3 text-center text-content-inverse">
                    <span className="text-[10px] font-semibold uppercase text-accent-gold">
                      KHO MÃ
                    </span>
                    <strong className="mt-0.5 text-base font-extrabold">
                      {isPercent
                        ? `${v.discountValue}%`
                        : `${Math.round(Number(v.discountValue) / 1000)}K`}
                    </strong>
                  </div>

                  <div className="flex flex-col justify-between p-3.5">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-extrabold text-content-primary">
                          {v.code}
                        </span>
                        <span className="text-[11px] text-content-muted">
                          Còn {v.remainingQuantity} lượt
                        </span>
                      </div>
                      <h5 className="mt-0.5 text-sm font-bold text-content-primary">
                        {v.name}
                      </h5>
                      <p className="mt-0.5 text-xs text-content-secondary">
                        {minOrder > 0
                          ? `Đơn từ ${formatCurrencyVND(minOrder)}`
                          : 'Không giới hạn đơn tối thiểu'}{' '}
                        • HSD: {formatShortDate(v.endDate)}
                      </p>
                    </div>

                    <div className="mt-2.5 flex justify-end border-t border-line-light pt-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        loading={claimingId === v.id}
                        onClick={() => void handleClaimPublicVoucher(v)}
                      >
                        Lưu vào Ví của tôi
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
