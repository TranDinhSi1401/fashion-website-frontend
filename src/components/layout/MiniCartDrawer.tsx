import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, X, Minus, Plus, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { cn } from '../../utils/cn';
import { formatCurrencyVND } from '../../utils/format';
import styles from './MiniCartDrawer.module.css';
import CartItemPrice from '../cart/CartItemPrice';

export interface MiniCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function CartItemImage({ src, alt }: { src?: string | null; alt: string }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative aspect-square w-20 sm:w-22 shrink-0 overflow-hidden rounded-none border border-gray-100 bg-gray-50 transition-transform duration-200 hover:scale-[1.03]">
      {src && !imgError ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover object-center"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-gray-300">
          <ShoppingBag size={24} />
        </div>
      )}
    </div>
  );
}

export default function MiniCartDrawer({ isOpen, onClose }: MiniCartDrawerProps) {
  const { isAuthenticated, isCustomer } = useAuth();
  const { cart, busy, error, updateItem, removeItem, refresh } = useCart();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState('');

  // Khóa cuộn trang và lắng nghe phím ESC
  useEffect(() => {
    if (!isOpen) return;

    void refresh();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose, refresh]);

  if (!isOpen) return null;

  async function mutate(action: () => Promise<unknown>) {
    setActionError('');
    try {
      await action();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Không thể cập nhật giỏ hàng. Vui lòng thử lại.');
    }
  }

  const items = cart?.items || [];
  const totalQuantity = cart?.totalQuantity || 0;
  const totalPrice = cart?.totalPrice || 0;

  const handleClose = () => {
    onClose();
  };

  const handleNavigate = (to: string) => {
    onClose();
    navigate(to);
  };

  const drawerContent = (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Giỏ hàng của bạn"
    >
      {/* 1. Lớp phủ mờ (Backdrop) */}
      <div
        className={styles.backdrop}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 2. Khung Sidebar Giỏ hàng */}
      <aside className={cn(styles.drawer, styles.drawerOpen)}>
        {/* Header Cố Định */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-5 sm:px-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Giỏ hàng của bạn
              {totalQuantity > 0 ? (
                <span className="ml-1.5 text-base font-medium text-gray-500">
                  ({totalQuantity})
                </span>
              ) : null}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng giỏ hàng"
            className="flex h-8 w-8 items-center justify-center rounded-none bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900"
          >
            <X size={18} />
          </button>
        </div>

        {/* Danh Sách Sản Phẩm Cuộn Độc Lập */}
        <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 sm:px-6 py-4', styles.productList)}>
          {(actionError || error) && (
            <div className="mb-4 flex items-start gap-2.5 rounded-none border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
              <span>{actionError || error}</span>
            </div>
          )}

          {!isAuthenticated ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-4 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-none bg-gray-100 text-gray-400">
                <ShoppingBag size={28} />
              </div>
              <h3 className="text-base font-bold text-gray-900">Vui lòng đăng nhập</h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-[260px]">
                Đăng nhập tài khoản khách hàng để xem và đồng bộ giỏ hàng của bạn.
              </p>
              <button
                type="button"
                onClick={() => handleNavigate('/login')}
                className="mt-2 flex h-10 items-center justify-center rounded-none bg-black px-6 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-zinc-800"
              >
                Đăng nhập ngay
              </button>
            </div>
          ) : !isCustomer ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-4 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-none bg-gray-100 text-gray-400">
                <ShoppingBag size={28} />
              </div>
              <h3 className="text-base font-bold text-gray-900">Tài khoản quản trị / Nhân viên</h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-[260px]">
                Giỏ hàng trực tuyến chỉ khả dụng cho tài khoản khách hàng mua sắm.
              </p>
              <button
                type="button"
                onClick={() => handleNavigate('/')}
                className="mt-2 flex h-10 items-center justify-center rounded-none border border-gray-900 bg-white px-6 text-xs font-bold uppercase tracking-wider text-gray-900 transition-colors hover:bg-gray-50"
              >
                Về trang chủ
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-4 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-none bg-gray-100 text-gray-400">
                <ShoppingBag size={28} />
              </div>
              <h3 className="text-base font-bold text-gray-900">Giỏ hàng của bạn đang trống</h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-[260px]">
                Hãy khám phá những bộ trang phục mới nhất để thêm vào giỏ hàng nhé!
              </p>
              <button
                type="button"
                onClick={() => handleNavigate('/products')}
                className="mt-2 flex h-10 items-center justify-center rounded-none bg-black px-6 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-zinc-800"
              >
                Khám phá sản phẩm
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3.5 py-4 first:pt-0 last:pb-0">
                  {/* Ảnh sản phẩm */}
                  <Link
                    to={`/products/${item.productId}`}
                    onClick={handleClose}
                    className="shrink-0"
                  >
                    <CartItemImage src={item.imageUrl} alt={item.productName} />
                  </Link>

                  {/* Thông tin sản phẩm */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                    <div>
                      {/* Tên sản phẩm & Nút Xóa */}
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/products/${item.productId}`}
                          onClick={handleClose}
                          className="line-clamp-2 text-sm font-semibold text-gray-900 transition-colors hover:text-black hover:underline"
                          title={item.productName}
                        >
                          {item.productName}
                        </Link>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void mutate(() => removeItem(item.id))}
                          aria-label={`Xóa ${item.productName}`}
                          className="shrink-0 text-xs font-medium text-gray-400 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:text-gray-300"
                        >
                          Xóa
                        </button>
                      </div>

                      {/* Phân loại thuộc tính (Màu sắc / Kích thước) */}
                      <p className="mt-1 text-xs text-gray-500">
                        {[item.color && `Màu: ${item.color}`, item.size && `Size: ${item.size}`]
                          .filter(Boolean)
                          .join(' / ') || 'Tiêu chuẩn'}
                      </p>

                      <div className="mt-2 text-sm"><CartItemPrice item={item} /></div>

                      {/* Trạng thái tồn kho nếu có */}
                      {!item.available ? (
                        <span className="mt-1 inline-block text-[11px] font-medium text-red-600">
                          Tạm hết hàng
                        </span>
                      ) : item.stockQuantity && item.stockQuantity <= 5 ? (
                        <span className="mt-1 inline-block text-[11px] font-medium text-amber-600">
                          Chỉ còn {item.stockQuantity} sản phẩm
                        </span>
                      ) : null}
                    </div>

                    {/* Bộ tăng giảm số lượng & Thành tiền */}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="inline-flex h-8 items-center rounded-none border border-gray-200 bg-white">
                        <button
                          type="button"
                          aria-label="Giảm số lượng"
                          disabled={busy || item.quantity <= 1}
                          onClick={() => void mutate(() => updateItem(item.id, Math.max(1, item.quantity - 1)))}
                          className="flex h-full w-7 items-center justify-center text-gray-500 transition-colors hover:bg-gray-100 hover:text-black disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-xs font-semibold text-gray-900 select-none">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Tăng số lượng"
                          disabled={
                            busy ||
                            !item.available ||
                            (item.stockQuantity !== undefined && item.quantity >= item.stockQuantity)
                          }
                          onClick={() => void mutate(() => updateItem(item.id, item.quantity + 1))}
                          className="flex h-full w-7 items-center justify-center text-gray-500 transition-colors hover:bg-gray-100 hover:text-black disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <span className="text-sm sm:text-base font-bold text-red-600">
                        {formatCurrencyVND(item.subtotal)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer Cố Định Ở Đáy Sidebar */}
        {items.length > 0 && isCustomer && (
          <div className="shrink-0 border-t border-gray-100 bg-white p-5 sm:p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
            {/* Dòng Tổng tiền */}
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-gray-800">
                Tổng tiền:
              </span>
              <span className="text-xl sm:text-2xl font-bold text-red-600">
                {formatCurrencyVND(totalPrice)}
              </span>
            </div>

            {/* Hai Nút Hành Động */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleNavigate('/cart')}
                className="flex h-11 sm:h-12 items-center justify-center rounded-none border border-gray-900 bg-white px-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-900 transition-all hover:bg-gray-50 active:scale-[0.99]"
              >
                Giỏ hàng
              </button>
              <button
                type="button"
                disabled={busy || items.length === 0}
                onClick={() => handleNavigate('/checkout')}
                className="flex h-11 sm:h-12 items-center justify-center rounded-none bg-black px-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
              >
                Thanh toán ngay
              </button>
            </div>

            {/* Dòng Hoặc Tiếp Tục Mua Hàng */}
            <button
              type="button"
              onClick={onClose}
              className="mt-3.5 block w-full text-center text-xs font-semibold uppercase tracking-wider text-gray-500 transition-colors hover:text-gray-900 hover:underline cursor-pointer"
            >
              Hoặc tiếp tục mua hàng
            </button>
          </div>
        )}
      </aside>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
