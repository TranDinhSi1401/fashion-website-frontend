import { useLayoutEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { cn } from '../../utils/cn';
import { formatCurrencyVND } from '../../utils/format';
import { Button, QuantityStepper } from '../ui';
import styles from './MiniCartDrawer.module.css';

export interface MiniCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MiniCartDrawer({ isOpen, onClose }: MiniCartDrawerProps) {
  const { isAuthenticated, isCustomer } = useAuth();
  const { cart, busy, error, updateItem, removeItem } = useCart();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const items = cart?.items || [];
  const totalQuantity = cart?.totalQuantity || 0;
  const totalPrice = cart?.totalPrice || 0;

  const handleClose = () => {
    document.body.style.overflow = '';
    onClose();
  };

  const handleNavigate = (to: string) => {
    document.body.style.overflow = '';
    onClose();
    navigate(to);
  };

  return (
    <div
      aria-hidden={!isOpen}
      className={cn(
        'fixed inset-0 z-50',
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      )}
    >
      <div
        onClick={onClose}
        className={cn('fixed inset-0', styles.backdrop, isOpen && styles.backdropOpen)}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Giỏ hàng nhanh"
        className={cn(
          'fixed right-0 top-0 z-50 flex h-screen w-[420px] max-w-full flex-col rounded-none bg-surface-elevated shadow-modal',
          styles.drawer,
          isOpen && styles.drawerOpen
        )}
      >
        {/* Header: 60px */}
        <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-line-light px-6">
          <div className="flex items-center gap-2">
            <h2 className="text-md font-bold uppercase tracking-wide text-content-primary">
              Giỏ hàng ({totalQuantity})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng giỏ hàng"
            className="flex h-9 w-9 items-center justify-center text-content-secondary transition-colors hover:bg-surface hover:text-content-primary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Product List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <p className="mb-4 border border-line-error bg-surface p-3 text-xs italic text-status-error">
              {error}
            </p>
          )}

          {!isAuthenticated ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <ShoppingBag size={36} className="text-content-muted" />
              <p className="text-base text-content-secondary">
                Đăng nhập tài khoản khách hàng để xem và đồng bộ giỏ hàng của bạn.
              </p>
              <Button variant="primary" onClick={() => handleNavigate('/login')}>
                Đăng nhập
              </Button>
            </div>
          ) : !isCustomer ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <ShoppingBag size={36} className="text-content-muted" />
              <p className="text-base text-content-secondary">
                Giỏ hàng chỉ khả dụng cho tài khoản khách hàng.
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <ShoppingBag size={36} className="text-content-muted" />
              <p className="text-base text-content-secondary">
                Giỏ hàng của bạn đang trống.
              </p>
              <Button variant="secondary" onClick={() => handleNavigate('/products')}>
                Khám phá sản phẩm
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-line-light">
              {items.map((item) => (
                <li key={item.id} className="flex gap-4 py-4 first:pt-0">
                  <Link
                    to={`/products/${item.productId}`}
                    onClick={handleClose}
                    className="aspect-[3/4] w-20 shrink-0 overflow-hidden bg-surface"
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-content-muted">
                        No image
                      </div>
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/products/${item.productId}`}
                          onClick={handleClose}
                          className="line-clamp-1 text-base font-medium text-content-primary hover:text-content-secondary"
                        >
                          {item.productName}
                        </Link>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void removeItem(item.id)}
                          aria-label={`Xóa ${item.productName}`}
                          className="shrink-0 text-content-muted transition-colors hover:text-accent-red disabled:cursor-not-allowed disabled:text-content-disabled"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <p className="mt-1 text-sm text-content-secondary">
                        Màu: {item.color} / Size: {item.size}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <QuantityStepper
                        value={item.quantity}
                        min={1}
                        max={Math.max(1, item.stockQuantity || 99)}
                        disabled={busy || !item.available}
                        label={`Số lượng ${item.productName}`}
                        onChange={(qty) => void updateItem(item.id, qty)}
                      />

                      <span className="text-md font-bold text-content-primary">
                        {formatCurrencyVND(item.subtotal)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer: 160px */}
        <div className="flex h-[160px] shrink-0 flex-col justify-between border-t border-line-light bg-surface-body px-6 py-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold uppercase tracking-wide text-content-secondary">
              Tạm tính
            </span>
            <span className="text-lg font-bold text-accent-red">
              {formatCurrencyVND(totalPrice)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              onClick={() => handleNavigate('/cart')}
            >
              Xem giỏ hàng
            </Button>
            <Button
              variant="primary"
              disabled={!isCustomer || items.length === 0}
              onClick={() => handleNavigate('/checkout')}
            >
              Thanh toán
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
