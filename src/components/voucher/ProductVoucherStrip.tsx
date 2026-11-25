import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BookmarkCheck,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Ticket,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { voucherService } from '../../services/voucherService';
import { VoucherResponse } from '../../types/voucher';
import { extractErrorMessage, formatCurrencyVND } from '../../utils/format';
import { Button, Modal } from '../ui';
import { estimateVoucherDiscount } from './VoucherPickerDrawer';

interface ProductVoucherStripProps {
  unitPrice: number;
  quantity: number;
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

export default function ProductVoucherStrip({
  unitPrice,
  quantity,
}: ProductVoucherStripProps) {
  const { isAuthenticated, isCustomer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [vouchers, setVouchers] = useState<VoucherResponse[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    let active = true;
    voucherService
      .getAvailableVouchers()
      .then((res) => {
        if (!active) return;
        if (Array.isArray(res.data)) {
          setVouchers(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {});
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  if (vouchers.length === 0) return null;

  const estimatedOrderSubtotal = Math.max(0, unitPrice * Math.max(1, quantity));

  const handleCopy = async (code: string) => {
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

  const handleClaim = async (v: VoucherResponse) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (!isCustomer) {
      setFeedback({
        type: 'error',
        text: 'Chỉ tài khoản khách hàng mới có thể lưu mã giảm giá.',
      });
      return;
    }

    setClaimingId(v.id);
    setFeedback(null);
    try {
      await voucherService.claimVoucher(v.id);
      setVouchers((prev) =>
        prev.map((item) => (item.id === v.id ? { ...item, isClaimed: true } : item))
      );
      setFeedback({
        type: 'success',
        text: `Đã lưu mã "${v.code}" vào Ví Voucher của bạn!`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: extractErrorMessage(err, 'Không thể lưu mã giảm giá.'),
      });
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <>
      <div className="w-full rounded-sm border border-dashed border-accent-gold/60 bg-surface px-3.5 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-content-primary mr-1">
              <Ticket size={14} className="text-accent-gold" />
              Mã giảm giá:
            </span>

            {vouchers.slice(0, 3).map((v) => {
              const isPercent = v.discountType === 'PERCENTAGE';
              const label = isPercent
                ? `Giảm ${v.discountValue}%`
                : `Giảm ${Math.round(Number(v.discountValue) / 1000)}K`;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className={`inline-flex items-center gap-1 rounded-xs border px-2 py-0.5 text-xs font-bold transition-colors ${
                    v.isClaimed
                      ? 'border-status-success/40 bg-status-success/10 text-status-success'
                      : 'border-primary/30 bg-surface-body text-content-primary hover:border-primary'
                  }`}
                >
                  <span>{label}</span>
                  {v.isClaimed && <Check size={11} />}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-0.5 text-xs font-bold text-primary hover:text-accent-gold transition-colors"
          >
            <span>Nhận mã ({vouchers.length})</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Mã Giảm Giá Cho Sản Phẩm Này"
        maxWidth="560px"
      >
        <div className="flex flex-col gap-3.5">
          <p className="text-xs text-content-secondary">
            Lưu mã vào <strong>Ví Voucher</strong> hoặc sao chép mã để áp dụng tại bước Thanh toán.
            Giá tạm tính theo số lượng đang chọn:{' '}
            <strong className="text-content-primary">
              {formatCurrencyVND(estimatedOrderSubtotal)}
            </strong>
          </p>

          {feedback && (
            <div
              className={`rounded-sm border px-3 py-2 text-xs font-medium ${
                feedback.type === 'success'
                  ? 'border-status-success/30 bg-status-success/10 text-status-success'
                  : 'border-status-error/30 bg-status-error/10 text-status-error'
              }`}
            >
              {feedback.text}
            </div>
          )}

          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {vouchers.map((v) => {
              const isPercent = v.discountType === 'PERCENTAGE';
              const minOrder = Number(v.minOrderAmount || 0);
              const meetsMinOrder = estimatedOrderSubtotal >= minOrder;
              const estDiscount = estimateVoucherDiscount(
                v,
                Math.max(estimatedOrderSubtotal, minOrder)
              );
              const isExhaustedForUser =
                v.remainingUserUses != null && v.remainingUserUses <= 0;

              return (
                <div
                  key={v.id}
                  className="grid grid-cols-[90px_minmax(0,1fr)] overflow-hidden border border-line bg-surface-body"
                >
                  <div className="flex flex-col items-center justify-center border-r border-dashed border-line bg-primary px-2 py-3 text-center text-content-inverse">
                    <span className="text-[10px] font-semibold uppercase opacity-80">
                      VOUCHER
                    </span>
                    <strong className="mt-0.5 text-base font-extrabold">
                      {isPercent
                        ? `${v.discountValue}%`
                        : `${Math.round(Number(v.discountValue) / 1000)}K`}
                    </strong>
                    {isPercent &&
                      v.maxDiscountAmount != null &&
                      Number(v.maxDiscountAmount) > 0 && (
                        <span className="mt-0.5 text-[10px] opacity-85">
                          Tối đa {Math.round(Number(v.maxDiscountAmount) / 1000)}K
                        </span>
                      )}
                  </div>

                  <div className="flex flex-col justify-between p-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-extrabold tracking-wider text-content-primary">
                          {v.code}
                        </span>
                        {isExhaustedForUser ? (
                          <span className="text-[11px] font-semibold text-content-muted">
                            Đã sử dụng
                          </span>
                        ) : v.isClaimed ? (
                          <button
                            type="button"
                            onClick={() => void handleCopy(v.code)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-content-secondary hover:text-content-primary"
                          >
                            {copiedCode === v.code ? (
                              <span className="text-status-success">Đã sao chép</span>
                            ) : (
                              <>
                                <Copy size={11} />
                                <span>Chép mã</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-[11px] text-content-muted">
                            Cần lưu vào ví để dùng
                          </span>
                        )}
                      </div>

                      <h4 className="mt-0.5 text-sm font-bold text-content-primary">
                        {v.name}
                      </h4>
                      <p className="mt-0.5 text-xs text-content-secondary">
                        {minOrder > 0
                          ? `Đơn tối thiểu ${formatCurrencyVND(minOrder)}`
                          : 'Không giới hạn đơn tối thiểu'}{' '}
                        • Tiết kiệm tới{' '}
                        <strong className="text-status-success">
                          {formatCurrencyVND(estDiscount)}
                        </strong>
                      </p>

                      {meetsMinOrder ? (
                        <p className="mt-1 text-[11px] font-semibold text-status-success">
                          ✓ Sản phẩm đang chọn đã đủ điều kiện giá trị đơn tối thiểu
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-amber-700">
                          Mua thêm {formatCurrencyVND(minOrder - estimatedOrderSubtotal)} để áp dụng mã này
                        </p>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line-light pt-2">
                      <span className="inline-flex items-center gap-1 text-[11px] text-content-muted">
                        <Clock size={11} />
                        HSD: {formatShortDate(v.endDate)}
                      </span>

                      {isExhaustedForUser ? (
                        <span className="text-xs font-semibold text-content-muted">
                          Đã dùng hết lượt
                        </span>
                      ) : v.isClaimed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-status-success">
                          <BookmarkCheck size={14} />
                          Đã có trong ví
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          loading={claimingId === v.id}
                          onClick={() => void handleClaim(v)}
                        >
                          {isAuthenticated ? 'Lưu vào ví' : 'Đăng nhập để lưu'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-line-light pt-3">
            {isAuthenticated && isCustomer ? (
              <Link
                to="/account/vouchers"
                onClick={() => setIsModalOpen(false)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline"
              >
                <Wallet size={14} />
                <span>Xem Ví Voucher của tôi</span>
              </Link>
            ) : (
              <Link
                to="/register"
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-semibold text-primary underline"
              >
                Đăng ký tài khoản mới nhận ngay mã WELCOME50K
              </Link>
            )}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Đóng
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
