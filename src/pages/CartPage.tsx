import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  ArrowRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  Tag,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { CartResponse } from '../types/cart';
import { formatCurrencyVND } from '../utils/format';
import { specialOfferService, SpecialOfferResponse } from '../services/specialOfferService';
import Breadcrumb from '../components/layout/Breadcrumb';
import BackButton from '../components/common/BackButton';
import { Button, Modal, QuantityStepper, Badge } from '../components/ui';
import { cn } from '../utils/cn';
import styles from './CartPage.module.css';
import CartItemPrice from '../components/cart/CartItemPrice';

// Mốc miễn phí giao hàng toàn quốc: 500.000 VNĐ
const FREE_SHIPPING_THRESHOLD = 500000;

function CartImage({ url, name }: { url?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative aspect-[3/4] w-20 sm:w-24 md:w-28 shrink-0 overflow-hidden rounded-none border border-line-light bg-surface transition-transform duration-300 hover:scale-[1.02]">
      {url && !failed ? (
        <img
          src={url}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-surface-elevated text-content-muted">
          <ShoppingBag size={24} aria-label="Chưa có ảnh sản phẩm" />
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  const { cart, loading, busy, error, refresh, updateItem, removeItem, clear } = useCart();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string } | null>(null);

  // Danh sách ưu đãi khuyến mãi có sẵn
  const [availableOffers, setAvailableOffers] = useState<SpecialOfferResponse[]>([]);
  const [showVouchers, setShowVouchers] = useState(false);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    specialOfferService
      .getActiveOffers()
      .then((offers) => {
        setAvailableOffers(offers.filter((o) => o.isActive));
      })
      .catch(() => {
        /* Bỏ qua lỗi tải voucher nếu có */
      });
  }, []);

  const mutate = async (action: () => Promise<CartResponse>, message: string) => {
    setActionError('');
    setNotice('');
    try {
      await action();
      setNotice(message);
      setConfirmClear(false);
      setItemToDelete(null);
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : 'Không thể cập nhật giỏ hàng.');
      await refresh();
    }
  };

  // Tính toán thanh tiến độ Freeship
  const freeShippingProgress = useMemo(() => {
    if (!cart || cart.totalPrice <= 0) return 0;
    const progress = (cart.totalPrice / FREE_SHIPPING_THRESHOLD) * 100;
    return Math.min(100, Math.round(progress));
  }, [cart]);

  const remainingForFreeShipping = useMemo(() => {
    if (!cart) return FREE_SHIPPING_THRESHOLD;
    return Math.max(0, FREE_SHIPPING_THRESHOLD - cart.totalPrice);
  }, [cart]);

  // Kiểm tra giỏ hàng có sản phẩm không hợp lệ
  const hasInvalidItems = useMemo(() => {
    if (!cart || cart.items.length === 0) return false;
    return cart.items.some((item) => !item.available || item.quantity > item.stockQuantity);
  }, [cart]);

  return (
    <div className={`${styles.page} pb-20 pt-4`}>
      {/* 1. Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: 'Sản phẩm', to: '/products' }, { label: 'Giỏ hàng' }]} />
        <BackButton />
      </div>

      {/* 3. Header Tiêu Đề */}
      <div className="mt-6 mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-line-light pb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-extrabold uppercase tracking-tight text-content-primary">
            Giỏ hàng của bạn
          </h1>
          {cart && cart.items.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-none bg-surface-elevated px-2.5 py-0.5 text-xs font-bold text-accent-gold border border-accent-gold/30">
              {cart.totalQuantity} món
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || loading}
            icon={RefreshCw}
            onClick={() => {
              setActionError('');
              void refresh();
            }}
            className="text-xs text-content-secondary hover:text-content-primary"
          >
            Làm mới
          </Button>
          {cart && cart.items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy || loading}
              icon={Trash2}
              onClick={() => setConfirmClear(true)}
              className="text-xs text-status-error/80 hover:text-status-error hover:bg-status-error/10"
            >
              Xóa tất cả
            </Button>
          )}
        </div>
      </div>

      {/* 4. Thông báo / Alerts */}
      {notice && (
        <div className="mb-6 flex items-center gap-2.5 rounded-none border border-emerald-200 bg-emerald-50/80 p-3.5 text-sm font-medium text-emerald-800 animate-fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {(error || actionError) && (
        <div className="mb-6 flex items-start gap-2.5 rounded-none border border-red-200 bg-red-50/80 p-3.5 text-sm font-medium text-red-800 animate-fade-in">
          <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <span>{actionError || error}</span>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-content-muted">
          <RefreshCw className="h-8 w-8 animate-spin text-accent-gold mb-3" />
          <p className="text-base font-medium">Đang tải thông tin giỏ hàng…</p>
        </div>
      )}

      {!loading && !cart && !error && (
        <div className="py-16 text-center text-content-secondary">
          <p className="text-base">Chưa tải được thông tin giỏ hàng.</p>
        </div>
      )}

      {/* 5. Giao diện Giỏ Hàng Trống (Empty State) */}
      {cart && cart.items.length === 0 && !loading && (
        <section className="mx-auto my-8 max-w-lg rounded-none border border-line-light bg-surface-body p-8 sm:p-12 text-center shadow-xs">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-none bg-surface ring-8 ring-surface-elevated text-accent-gold">
            <ShoppingBag size={38} />
          </div>
          <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-content-primary mb-2">
            Giỏ hàng của bạn đang trống
          </h2>
          <p className="text-sm text-content-secondary leading-relaxed mb-6">
            Chưa có sản phẩm nào trong giỏ hàng. Hãy khám phá bộ sưu tập thời trang mới nhất để tìm cho mình bộ trang phục ưng ý nhất!
          </p>
          <Link to="/products">
            <Button variant="primary" size="lg" icon={Sparkles} className="w-full sm:w-auto px-8">
              Khám Phá Sản Phẩm Ngay
            </Button>
          </Link>
        </section>
      )}

      {/* 6. Giao diện Giỏ Hàng Có Sản Phẩm */}
      {cart && cart.items.length > 0 && (
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]" aria-busy={busy || loading}>
          {/* CỘT TRÁI: DANH SÁCH SẢN PHẨM */}
          <section className="min-w-0 flex flex-col gap-5" aria-label="Sản phẩm trong giỏ hàng">
            {/* Thanh tiến độ Free Shipping */}
            <div className="rounded-none border border-line-light bg-surface p-4 shadow-2xs">
              <div className="flex items-center justify-between gap-3 text-xs md:text-sm font-semibold mb-2">
                <div className="flex items-center gap-2">
                  <Truck size={17} className={freeShippingProgress >= 100 ? 'text-emerald-600' : 'text-accent-gold'} />
                  {freeShippingProgress >= 100 ? (
                    <span className="text-emerald-700">
                      🎉 Chúc mừng! Bạn đã đủ điều kiện nhận <strong>Miễn Phí Giao Hàng</strong>
                    </span>
                  ) : (
                    <span className="text-content-primary">
                      Mua thêm <strong className="text-accent-gold">{formatCurrencyVND(remainingForFreeShipping)}</strong> để được <strong>Freeship</strong>
                    </span>
                  )}
                </div>
                <span className="text-xs text-content-muted font-bold">{freeShippingProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-none bg-surface-elevated border border-line-light">
                <div
                  className={cn(
                    'h-full transition-all duration-500 rounded-none',
                    freeShippingProgress >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-400 to-accent-gold'
                  )}
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>

            {/* Bảng Danh Sách Sản Phẩm */}
            <div className="rounded-none border border-line-light bg-surface-body overflow-hidden shadow-2xs">
              {/* Header Bảng Desktop */}
              <div className="hidden md:grid grid-cols-[100px_minmax(0,1fr)_120px_130px_120px_40px] items-center gap-4 bg-surface px-6 py-3.5 border-b border-line-light text-[0.72rem] font-bold uppercase tracking-wider text-content-muted">
                <span>Hình ảnh</span>
                <span>Thông tin sản phẩm</span>
                <span className="text-center">Đơn giá</span>
                <span className="text-center">Số lượng</span>
                <span className="text-right">Thành tiền</span>
                <span className="text-right">Xóa</span>
              </div>

              {/* Danh sách các sản phẩm */}
              <div className="divide-y divide-line-light">
                {cart.items.map((item) => (
                  <article
                    key={item.id}
                    className="p-4 sm:p-5 transition-colors hover:bg-surface/50"
                  >
                    <div className="grid grid-cols-[80px_minmax(0,1fr)] sm:grid-cols-[100px_minmax(0,1fr)] md:grid-cols-[100px_minmax(0,1fr)_120px_130px_120px_40px] items-center gap-4 md:gap-4">
                      {/* Cột 1: Hình ảnh */}
                      <Link to={`/products/${item.productId}`} className="group relative">
                        <CartImage url={item.imageUrl} name={item.productName} />
                      </Link>

                      {/* Cột 2: Thông tin sản phẩm */}
                      <div className="flex min-w-0 flex-col items-start gap-1.5">
                        <Link
                          to={`/products/${item.productId}`}
                          className="line-clamp-2 text-sm sm:text-base font-bold text-content-primary transition-colors hover:text-accent-gold leading-snug"
                        >
                          {item.productName}
                        </Link>

                        {/* Chips biến thể */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {item.color && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-xs font-medium bg-surface border border-line-light text-content-primary">
                              Màu: <strong>{item.color}</strong>
                            </span>
                          )}
                          {item.size && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-none text-xs font-semibold bg-surface border border-line-light text-content-primary">
                              Size: <strong>{item.size}</strong>
                            </span>
                          )}
                        </div>

                        {/* Đơn giá hiển thị cho Mobile */}
                        <div className="flex md:hidden items-center gap-2 mt-1">
                          <span className="text-xs text-content-muted">Đơn giá:</span>
                          <span className="text-xs font-semibold text-content-secondary">
                            <CartItemPrice item={item} />
                          </span>
                        </div>

                        {/* Trạng thái tồn kho */}
                        <div className="mt-1">
                          {!item.available ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-error bg-status-error/10 px-2 py-0.5 rounded-none">
                              <AlertCircle size={12} /> Tạm hết hàng hoặc ngừng bán
                            </span>
                          ) : item.quantity > item.stockQuantity ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-none border border-amber-200">
                              <Info size={12} /> Chỉ còn {item.stockQuantity} sản phẩm trong kho
                            </span>
                          ) : item.stockQuantity <= 5 ? (
                            <span className="text-xs text-amber-600 font-medium">
                              Chỉ còn {item.stockQuantity} sản phẩm
                            </span>
                          ) : (
                            <span className="text-[0.72rem] text-emerald-600 font-medium inline-flex items-center gap-1">
                              <CheckCircle2 size={11} /> Sẵn sàng giao
                            </span>
                          )}
                        </div>

                        {/* Mobile Stepper & Subtotal row */}
                        <div className="flex md:hidden w-full items-center justify-between gap-3 pt-3 mt-2 border-t border-line-light">
                          <QuantityStepper
                            value={item.quantity}
                            max={Math.max(1, item.stockQuantity)}
                            label={`Số lượng ${item.productName}`}
                            onValidationChange={(message) => {
                              if (message) setNotice('');
                            }}
                            disabled={busy || loading || !item.available}
                            onChange={(quantity) =>
                              void mutate(() => updateItem(item.id, quantity), 'Đã cập nhật số lượng.')
                            }
                          />

                          <div className="text-right">
                            <div className="text-[0.7rem] text-content-muted uppercase font-bold">Thành tiền</div>
                            <div className="text-sm font-extrabold text-content-primary">
                              {formatCurrencyVND(item.subtotal)}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={busy || loading}
                            aria-label={`Xóa ${item.productName}`}
                            onClick={() => setItemToDelete({ id: item.id, name: item.productName })}
                            className="p-1.5 text-content-muted hover:text-status-error hover:bg-status-error/10 rounded-none transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Cột 3: Đơn giá (Desktop) */}
                      <div className="hidden md:block text-center font-semibold text-sm text-content-secondary">
                        <CartItemPrice item={item} />
                      </div>

                      {/* Cột 4: Số lượng (Desktop) */}
                      <div className="hidden md:flex justify-center">
                        <QuantityStepper
                          value={item.quantity}
                          max={Math.max(1, item.stockQuantity)}
                          label={`Số lượng ${item.productName}`}
                          onValidationChange={(message) => {
                            if (message) setNotice('');
                          }}
                          disabled={busy || loading || !item.available}
                          onChange={(quantity) =>
                            void mutate(() => updateItem(item.id, quantity), 'Đã cập nhật số lượng.')
                          }
                        />
                      </div>

                      {/* Cột 5: Thành tiền (Desktop) */}
                      <div className="hidden md:block text-right font-extrabold text-sm lg:text-base text-content-primary">
                        {formatCurrencyVND(item.subtotal)}
                      </div>

                      {/* Cột 6: Nút xóa (Desktop) */}
                      <div className="hidden md:flex justify-end">
                        <button
                          type="button"
                          disabled={busy || loading}
                          aria-label={`Xóa ${item.productName}`}
                          onClick={() => setItemToDelete({ id: item.id, name: item.productName })}
                          className="flex h-8 w-8 items-center justify-center rounded-none text-content-muted transition-colors hover:bg-status-error/10 hover:text-status-error disabled:cursor-not-allowed"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* Điều hướng tiếp tục mua sắm */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold text-content-secondary transition-colors hover:text-accent-gold"
              >
                <ArrowLeft size={16} />
                <span>Tiếp tục chọn thêm sản phẩm</span>
              </Link>

              <span className="text-xs text-content-muted">
                Tổng cộng <strong>{cart.totalQuantity}</strong> sản phẩm trong giỏ
              </span>
            </div>
          </section>

          {/* CỘT PHẢI: TỔNG KẾT ĐƠN HÀNG & THANH TOÁN (STICKY ASIDE) */}
          <aside
            aria-label="Tổng giỏ hàng"
            className="flex flex-col gap-5 rounded-none border border-line-light bg-surface-body p-6 shadow-sm lg:sticky lg:top-24"
          >
            <div className="flex items-center justify-between border-b border-line-light pb-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-content-primary">
                Tóm Tắt Đơn Hàng
              </h2>
              <span className="text-xs font-semibold text-content-muted">
                {cart.totalQuantity} món
              </span>
            </div>

            {/* Chi tiết chi phí */}
            <div className="space-y-3 text-xs md:text-sm">
              <div className="flex items-center justify-between text-content-secondary">
                <span>Tạm tính tiền hàng</span>
                <span className="font-bold text-content-primary">{formatCurrencyVND(cart.totalPrice)}</span>
              </div>

              <div className="flex items-center justify-between text-content-secondary">
                <span className="flex items-center gap-1.5">
                  Phí vận chuyển
                  <span className="text-[10px] text-content-muted">(tiêu chuẩn)</span>
                </span>
                <span className="font-semibold text-content-primary">
                  {freeShippingProgress >= 100 ? (
                    <span className="text-emerald-600 font-bold">Miễn phí</span>
                  ) : (
                    <span>Tính khi thanh toán</span>
                  )}
                </span>
              </div>
            </div>

            {/* Khối Voucher & Ưu Đãi */}
            <div className="rounded-none border border-line-light bg-surface p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-primary">
                  <Tag size={15} className="text-accent-gold" />
                  <span>Ưu Đãi &amp; Voucher</span>
                </div>
                {availableOffers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowVouchers(!showVouchers)}
                    className="text-xs font-semibold text-accent-gold hover:underline cursor-pointer"
                  >
                    {showVouchers ? 'Thu gọn' : `Xem mã (${availableOffers.length})`}
                  </button>
                )}
              </div>

              {/* Danh sách các voucher xem nhanh */}
              {showVouchers && availableOffers.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-line-light pt-3 max-h-48 overflow-y-auto">
                  {availableOffers.map((offer) => {
                    const isEligible = cart.totalPrice >= (offer.minOrderAmount ?? 0);
                    return (
                      <div
                        key={offer.id}
                        className={cn(
                          'p-2.5 rounded-none border text-xs transition-colors flex items-start justify-between gap-2',
                          isEligible
                            ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                            : 'border-line-light bg-surface-elevated text-content-muted'
                        )}
                      >
                        <div>
                          <div className="font-bold">{offer.title}</div>
                          {offer.minOrderAmount && offer.minOrderAmount > 0 ? (
                            <div className="text-[11px] text-content-secondary">
                              Đơn tối thiểu {formatCurrencyVND(offer.minOrderAmount)}
                            </div>
                          ) : null}
                        </div>
                        <Badge variant={isEligible ? 'success' : 'default'} className="shrink-0 text-[10px]">
                          {isEligible ? 'Đủ điều kiện' : 'Chưa đủ'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="mt-2 text-[11px] text-content-muted leading-tight">
                * Mã giảm giá và điểm thưởng sẽ được chọn áp dụng trực tiếp tại trang Thanh toán.
              </p>
            </div>

            {/* Dòng Tổng Tiền Cuối Cùng */}
            <div className="border-t border-line-light pt-4">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div className="text-xs uppercase font-extrabold tracking-wider text-content-primary">
                    Tổng Thanh Toán
                  </div>
                  <div className="text-[11px] text-content-muted">(Đã bao gồm thuế nếu có)</div>
                </div>
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-black text-content-primary">
                    {formatCurrencyVND(cart.totalPrice)}
                  </div>
                </div>
              </div>
            </div>

            {/* Cảnh báo nếu có sản phẩm không hợp lệ */}
            {hasInvalidItems && (
              <div className="rounded-none border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
                <AlertCircle size={14} className="inline mr-1 text-red-600" />
                Một số sản phẩm trong giỏ không còn đủ hàng hoặc đã hết. Vui lòng điều chỉnh trước khi thanh toán.
              </div>
            )}

            {/* Nút Thanh Toán CTA */}
            <Link to="/checkout" className="w-full">
              <Button
                variant="primary"
                size="lg"
                disabled={busy || loading || hasInvalidItems}
                icon={ArrowRight}
                className="w-full h-12 text-sm font-bold uppercase tracking-wider justify-center shadow-md hover:shadow-lg transition-all"
              >
                Tiến Hành Thanh Toán
              </Button>
            </Link>

            {/* Cam Kết Dịch Vụ Khách Hàng (Trust Badges) */}
            <div className="space-y-2 border-t border-line-light pt-4 text-xs text-content-secondary">
              <div className="flex items-center gap-2">
                <Truck size={14} className="text-accent-gold shrink-0" />
                <span>Giao hàng hỏa tốc toàn quốc từ 2 - 4 ngày</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw size={14} className="text-accent-gold shrink-0" />
                <span>Hỗ trợ đổi trả hàng linh hoạt trong 15 ngày</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-accent-gold shrink-0" />
                <span>100% Sản phẩm chính hãng &amp; đồng kiểm khi nhận</span>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* 7. Mobile Floating Sticky Checkout Bar */}
      {cart && cart.items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-line-light bg-surface-body/95 p-3.5 backdrop-blur-md shadow-lg sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-content-muted uppercase font-bold">Tổng thanh toán</div>
              <div className="text-base font-black text-content-primary">
                {formatCurrencyVND(cart.totalPrice)}
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              disabled={busy || loading || hasInvalidItems}
              icon={ArrowRight}
              onClick={() => navigate('/checkout')}
              className="px-6 font-bold uppercase text-xs"
            >
              Thanh Toán ({cart.totalQuantity})
            </Button>
          </div>
        </div>
      )}

      {/* 8. Modal Xác Nhận Xóa Từng Sản Phẩm */}
      <Modal
        isOpen={Boolean(itemToDelete)}
        onClose={() => {
          if (!busy) setItemToDelete(null);
        }}
        title="Xác nhận xóa sản phẩm"
        className={styles.squareModal}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-content-secondary leading-relaxed">
            Bạn có chắc chắn muốn xóa sản phẩm <strong>"{itemToDelete?.name}"</strong> khỏi giỏ hàng không?
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-line-light">
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => setItemToDelete(null)}>
              Giữ lại
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={busy}
              onClick={() => {
                if (itemToDelete) {
                  void mutate(() => removeItem(itemToDelete.id), 'Đã xóa sản phẩm khỏi giỏ hàng.');
                }
              }}
            >
              Xác nhận xóa
            </Button>
          </div>
        </div>
      </Modal>

      {/* 9. Modal Xác Nhận Xóa Toàn Bộ Giỏ Hàng */}
      <Modal
        isOpen={confirmClear}
        onClose={() => {
          if (!busy) setConfirmClear(false);
        }}
        title="Xóa toàn bộ giỏ hàng"
        className={styles.squareModal}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-content-secondary leading-relaxed">
            Bạn có chắc chắn muốn xóa toàn bộ sản phẩm đang có trong giỏ hàng không? Thao tác này sẽ làm trống giỏ hàng của bạn.
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-line-light">
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => setConfirmClear(false)}>
              Giữ lại
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={busy}
              onClick={() => void mutate(clear, 'Đã xóa toàn bộ giỏ hàng.')}
            >
              Xác nhận xóa hết
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
