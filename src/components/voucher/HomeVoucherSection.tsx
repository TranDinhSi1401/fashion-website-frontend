import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Gift,
  Info,
  Ticket,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { voucherService } from '../../services/voucherService';
import { VoucherResponse } from '../../types/voucher';
import { extractErrorMessage, formatCurrencyVND } from '../../utils/format';
import { Button, Modal } from '../ui';

function formatDateTimeVN(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export default function HomeVoucherSection() {
  const { isAuthenticated, isCustomer } = useAuth();
  const { refresh: refreshNotifications } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [vouchers, setVouchers] = useState<VoucherResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSectionCollapsed, setIsSectionCollapsed] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherResponse | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);
  const draggedDistanceRef = useRef(0);

  const updateScrollButtons = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [vouchers, isSectionCollapsed, updateScrollButtons]);

  const scrollByCards = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 320, behavior: 'smooth' });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    draggedDistanceRef.current = 0;
    dragStartXRef.current = e.pageX - el.offsetLeft;
    dragScrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const el = trackRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = x - dragStartXRef.current;
    draggedDistanceRef.current = Math.abs(walk);
    el.scrollLeft = dragScrollLeftRef.current - walk;
  };

  const stopDragging = () => {
    isDraggingRef.current = false;
  };

  useEffect(() => {
    let active = true;
    voucherService
      .getAvailableVouchers()
      .then((res) => {
        if (!active) return;
        if (Array.isArray(res.data)) {
          setVouchers(res.data);
          if (isAuthenticated) {
            void refreshNotifications();
          }
        }
      })
      .catch(() => {
        // Không chặn hiển thị trang chủ nếu lỗi mạng
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, refreshNotifications]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => {
        setCopiedCode((prev) => (prev === code ? null : prev));
      }, 2000);
    } catch {
      // Fallback
    }
  };

  const handleClaimVoucher = async (v: VoucherResponse, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (!isCustomer) {
      setNotice({
        type: 'error',
        text: 'Chỉ tài khoản khách hàng mới có thể lưu mã giảm giá vào Ví.',
      });
      return;
    }

    setClaimingId(v.id);
    setNotice(null);
    try {
      await voucherService.claimVoucher(v.id);
      setVouchers((prev) =>
        prev.map((item) => (item.id === v.id ? { ...item, isClaimed: true } : item))
      );
      setSelectedVoucher((prev) =>
        prev && prev.id === v.id ? { ...prev, isClaimed: true } : prev
      );
      setNotice({
        type: 'success',
        text: `Đã lưu mã "${v.code}" vào Ví Voucher của bạn!`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: extractErrorMessage(err, 'Không thể lưu mã giảm giá.'),
      });
    } finally {
      setClaimingId(null);
    }
  };

  if (loading && vouchers.length === 0) {
    return null;
  }

  if (vouchers.length === 0 && isAuthenticated) {
    return null;
  }

  const welcomeVoucher = vouchers.find(
    (v) => v.code.toUpperCase() === 'WELCOME50K'
  );

  return (
    <section
      id="home-voucher-section"
      className="border-b border-line bg-gradient-to-b from-surface to-surface-body py-5 sm:py-6 shadow-xs"
    >
      <div className="mx-auto max-w-container px-3.5 sm:px-6">
        {/* Thanh Header nổi bật trên 1 hàng */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 whitespace-nowrap text-sm sm:text-base font-extrabold uppercase tracking-wider text-content-primary">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-surface-dark text-accent-gold shadow-xs">
                <Ticket size={15} />
              </span>
              <span>Mã Khuyến Mãi &amp; Voucher Độc Quyền</span>
              <span className="rounded-xs bg-accent-gold px-2 py-0.5 text-[11px] font-extrabold text-black">
                {vouchers.length} MÃ HOT
              </span>
            </div>

            {!isAuthenticated && (
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xs border border-accent-gold bg-surface-dark px-3 py-1 text-xs font-bold text-content-inverse shadow-xs transition-colors hover:bg-black"
              >
                <Gift size={13} className="text-accent-gold shrink-0" />
                <span>
                  Tài khoản mới: Tặng ngay{' '}
                  <strong className="text-accent-gold">WELCOME50K (-50K)</strong>
                </span>
                <ArrowRight size={12} className="text-accent-gold shrink-0" />
              </Link>
            )}

            {isAuthenticated && isCustomer && welcomeVoucher && (
              <button
                type="button"
                onClick={() => setSelectedVoucher(welcomeVoucher)}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xs border border-accent-gold bg-surface-dark px-3 py-1 text-xs font-bold text-content-inverse shadow-xs transition-colors hover:bg-black cursor-pointer"
              >
                <Gift size={13} className="text-accent-gold shrink-0" />
                <span>
                  Quà tài khoản mới:{' '}
                  <strong className="font-mono text-accent-gold">WELCOME50K (-50K)</strong>
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {!isSectionCollapsed && (canScrollLeft || canScrollRight) && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollByCards(-1)}
                  disabled={!canScrollLeft}
                  aria-label="Kéo danh sách voucher sang trái"
                  title="Xem voucher phía trước"
                  className="flex h-7 w-7 items-center justify-center rounded-xs border border-line bg-surface-body text-content-primary transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollByCards(1)}
                  disabled={!canScrollRight}
                  aria-label="Kéo danh sách voucher sang phải"
                  title="Kéo qua phải xem thêm voucher"
                  className="flex h-7 w-7 items-center justify-center rounded-xs border border-line bg-surface-body text-content-primary transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}

            {isAuthenticated && isCustomer && (
              <Link
                to="/account/vouchers"
                className="inline-flex items-center gap-1.5 whitespace-nowrap border-b border-primary pb-0.5 text-xs font-bold uppercase tracking-wide text-content-primary transition-colors hover:text-accent-gold hover:border-accent-gold"
              >
                <Wallet size={13} className="shrink-0 text-accent-gold" />
                <span>Ví Voucher của tôi</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setIsSectionCollapsed((prev) => !prev)}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-xs border border-line bg-surface-body px-2.5 py-1 text-xs font-semibold text-content-secondary transition-colors hover:border-primary hover:text-content-primary cursor-pointer"
              aria-expanded={!isSectionCollapsed}
            >
              <span>{isSectionCollapsed ? 'Mở rộng' : 'Thu gọn'}</span>
              {isSectionCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>
        </div>

        {notice && !isSectionCollapsed && (
          <div
            className={`mt-3 flex items-center justify-between gap-3 border px-3.5 py-2 text-xs font-medium ${
              notice.type === 'success'
                ? 'border-status-success/40 bg-status-success/10 text-status-success'
                : 'border-status-error/40 bg-status-error/10 text-status-error'
            }`}
          >
            <span className="truncate">{notice.text}</span>
            {notice.type === 'success' && (
              <Link
                to="/account/vouchers"
                className="whitespace-nowrap font-bold underline underline-offset-2 shrink-0"
              >
                Mở Ví →
              </Link>
            )}
          </div>
        )}

        {/* Danh sách thẻ Voucher nằm trên 1 hàng ngang duy nhất, các mã tiếp theo nằm bên phải chờ kéo qua xem */}
        {!isSectionCollapsed && vouchers.length > 0 && (
          <div
            ref={trackRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDragging}
            onMouseLeave={stopDragging}
            className="mt-4 flex items-stretch gap-3 overflow-x-auto pb-1.5 pt-0.5 select-none [scrollbar-width:thin]"
          >
            {vouchers.map((v) => {
              const isPercent = v.discountType === 'PERCENTAGE';
              const minOrder = Number(v.minOrderAmount || 0);
              const remaining =
                v.remainingQuantity ?? Math.max(0, v.totalQuantity - v.usedQuantity);
              const isExhaustedForUser =
                v.remainingUserUses != null && v.remainingUserUses <= 0;
              const isWelcome = v.code.toUpperCase() === 'WELCOME50K';

              const openVoucherModal = () => {
                if (draggedDistanceRef.current > 6) return;
                setSelectedVoucher(v);
              };

              return (
                <div
                  key={v.id}
                  className={`group relative w-[290px] sm:w-[305px] shrink-0 overflow-hidden border bg-surface-body shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    isWelcome
                      ? 'border-accent-gold/70 hover:border-accent-gold'
                      : 'border-primary/25 hover:border-primary'
                  }`}
                >
                  {/* Răng cưa vé (Ticket Notches) trên và dưới tại vạch ngăn cách */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-[76px] -top-2 z-10 h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-line bg-surface"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-[76px] -bottom-2 z-10 h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-line bg-surface"
                  />

                  <div className="grid h-[70px] grid-cols-[76px_minmax(0,1fr)_auto] items-stretch">
                    {/* Cuống vé bên trái: Mức giảm nổi bật */}
                    <button
                      type="button"
                      onClick={openVoucherModal}
                      title="Nhấn để xem chi tiết điều kiện voucher"
                      className={`flex flex-col items-center justify-center border-r border-dashed px-1.5 text-center cursor-pointer shrink-0 ${
                        isWelcome
                          ? 'border-accent-gold/50 bg-surface-dark text-accent-gold'
                          : 'border-line bg-primary text-content-inverse'
                      }`}
                    >
                      <span className="whitespace-nowrap text-[9px] font-bold uppercase tracking-widest opacity-85 leading-none">
                        VOUCHER
                      </span>
                      <strong className="mt-1 whitespace-nowrap text-base font-extrabold leading-none">
                        {isPercent
                          ? `-${v.discountValue}%`
                          : `-${Math.round(Number(v.discountValue) / 1000)}K`}
                      </strong>
                    </button>

                    {/* Thông tin mã khuyến mãi ở giữa (Click mở Modal chi tiết) */}
                    <button
                      type="button"
                      onClick={openVoucherModal}
                      className="flex min-w-0 flex-col justify-center overflow-hidden px-3 text-left cursor-pointer hover:bg-surface/60 transition-colors"
                      title="Nhấn để xem chi tiết mã giảm giá"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`truncate whitespace-nowrap rounded-xs px-1.5 py-0.5 font-mono text-xs font-extrabold tracking-wider ${
                            isWelcome
                              ? 'bg-accent-gold/20 text-primary border border-accent-gold/50'
                              : 'bg-surface text-content-primary border border-line'
                          }`}
                        >
                          {v.code}
                        </span>
                        <Info
                          size={13}
                          className="shrink-0 text-content-muted group-hover:text-primary transition-colors"
                        />
                      </div>
                      <span className="mt-1 block truncate whitespace-nowrap text-[11px] font-medium text-content-secondary">
                        {minOrder > 0
                          ? `Đơn từ ${Math.round(minOrder / 1000)}K`
                          : 'Mọi đơn'}{' '}
                        • Còn {remaining} lượt
                      </span>
                    </button>

                    {/* Nút Lưu / Đã lưu cố định không xuống dòng */}
                    <div className="flex shrink-0 items-center pr-3">
                      {isExhaustedForUser ? (
                        <span className="whitespace-nowrap rounded-xs bg-surface px-2.5 py-1.5 text-[10px] font-semibold text-content-muted">
                          Đã dùng
                        </span>
                      ) : v.isClaimed ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-xs border border-status-success/40 bg-status-success/10 px-2.5 py-1.5 text-[11px] font-bold text-status-success">
                          <BookmarkCheck size={13} className="shrink-0" />
                          <span>Đã lưu</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={claimingId === v.id}
                          onClick={(e) => void handleClaimVoucher(v, e)}
                          className={`whitespace-nowrap rounded-xs px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide shadow-xs transition-all disabled:opacity-50 cursor-pointer ${
                            isWelcome
                              ? 'bg-accent-gold text-black hover:bg-accent-gold/90'
                              : 'bg-primary text-content-inverse hover:bg-primary/90'
                          }`}
                        >
                          {claimingId === v.id ? '...' : 'Lưu mã'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal xem chi tiết Voucher khi người dùng nhấn vào thẻ */}
      <Modal
        isOpen={selectedVoucher !== null}
        onClose={() => setSelectedVoucher(null)}
        title="Chi Tiết Mã Giảm Giá"
        maxWidth="480px"
      >
        {selectedVoucher && (() => {
          const v = selectedVoucher;
          const isPercent = v.discountType === 'PERCENTAGE';
          const minOrder = Number(v.minOrderAmount || 0);
          const remaining =
            v.remainingQuantity ?? Math.max(0, v.totalQuantity - v.usedQuantity);
          const isExhaustedForUser =
            v.remainingUserUses != null && v.remainingUserUses <= 0;

          return (
            <div className="flex flex-col gap-4 text-sm">
              {/* Header Banner trong Modal */}
              <div className="flex items-center justify-between border border-line bg-surface p-3.5">
                <div>
                  <span className="inline-flex items-center gap-1.5 bg-primary px-2.5 py-0.5 font-mono text-xs font-extrabold tracking-wider text-content-inverse">
                    <Ticket size={12} />
                    {v.code}
                  </span>
                  <h4 className="mt-1.5 text-base font-bold text-content-primary">
                    {v.name}
                  </h4>
                  <p className="mt-0.5 text-xs font-semibold text-status-success">
                    {isPercent
                      ? `Giảm ${v.discountValue}%${
                          v.maxDiscountAmount && Number(v.maxDiscountAmount) > 0
                            ? ` (Tối đa ${formatCurrencyVND(v.maxDiscountAmount)})`
                            : ''
                        }`
                      : `Giảm trực tiếp ${formatCurrencyVND(v.discountValue)}`}
                  </p>
                </div>

                {v.isClaimed && !isExhaustedForUser && (
                  <button
                    type="button"
                    onClick={() => void handleCopyCode(v.code)}
                    className="inline-flex items-center gap-1 border border-line bg-surface-body px-2.5 py-1.5 text-xs font-semibold text-content-primary hover:border-primary"
                  >
                    {copiedCode === v.code ? (
                      <>
                        <Check size={13} className="text-status-success" />
                        <span className="text-status-success">Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Sao chép mã</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {v.description && (
                <p className="text-xs leading-relaxed text-content-secondary">
                  {v.description}
                </p>
              )}

              {/* Bảng thông tin điều kiện */}
              <div className="space-y-2 border-t border-b border-line-light py-3 text-xs text-content-secondary">
                <div className="flex justify-between gap-3">
                  <span className="text-content-muted">Đơn hàng tối thiểu:</span>
                  <strong className="text-content-primary">
                    {minOrder > 0 ? formatCurrencyVND(minOrder) : 'Không giới hạn (0 ₫)'}
                  </strong>
                </div>

                {isPercent && v.maxDiscountAmount != null && Number(v.maxDiscountAmount) > 0 && (
                  <div className="flex justify-between gap-3">
                    <span className="text-content-muted">Giảm tối đa:</span>
                    <strong className="text-content-primary">
                      {formatCurrencyVND(v.maxDiscountAmount)}
                    </strong>
                  </div>
                )}

                <div className="flex justify-between gap-3">
                  <span className="text-content-muted">Số lượng còn lại:</span>
                  <strong className="text-content-primary">
                    {remaining} / {v.totalQuantity} lượt
                  </strong>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-content-muted">Giới hạn mỗi tài khoản:</span>
                  <strong className="text-content-primary">
                    {v.remainingUserUses != null
                      ? `Còn ${v.remainingUserUses}/${v.maxUsesPerUser} lượt`
                      : `Tối đa ${v.maxUsesPerUser} lượt`}
                  </strong>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-content-muted">Thời gian hiệu lực:</span>
                  <strong className="text-right text-content-primary">
                    {formatDateTimeVN(v.startDate)} – {formatDateTimeVN(v.endDate)}
                  </strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedVoucher(null)}
                >
                  Đóng
                </Button>

                {isExhaustedForUser ? (
                  <Button type="button" variant="secondary" size="sm" disabled>
                    Bạn đã sử dụng mã này
                  </Button>
                ) : v.isClaimed ? (
                  <Link to="/products" onClick={() => setSelectedVoucher(null)}>
                    <Button type="button" variant="primary" size="sm">
                      Đã có trong Ví — Mua sắm ngay
                    </Button>
                  </Link>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={claimingId === v.id}
                    onClick={() => void handleClaimVoucher(v)}
                  >
                    {isAuthenticated ? 'Lưu vào Ví Voucher' : 'Đăng nhập để lưu mã'}
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </section>
  );
}
