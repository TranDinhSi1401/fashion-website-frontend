import { useLayoutEffect, useRef, useState } from 'react';
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [actionError, setActionError] = useState('');

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!isOpen) { if (dialog.open) dialog.close(); return; }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  async function mutate(action: () => Promise<unknown>) {
    setActionError('');
    try { await action(); }
    catch (e) { setActionError(e instanceof Error ? e.message : 'Không cập nhật được giỏ hàng. Vui lòng thử lại.'); }
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

  return (
    <dialog
      ref={dialogRef}
      aria-label="Giỏ hàng nhanh"
      className={styles.shell}
      onCancel={event => { event.preventDefault(); onClose(); }}
    >
      <div
        onClick={onClose}
        className={cn(styles.backdrop)}
      />

      <aside
        className={cn(
          'flex flex-col rounded-none bg-surface-elevated shadow-modal',
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
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {(actionError || error) && (
            <p className="mb-4 border border-line-error bg-surface p-3 text-xs italic text-status-error">
              {actionError || error}
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
                        Chưa có ảnh
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
                          onClick={() => void mutate(() => removeItem(item.id))}
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
                        max={Math.max(1, item.stockQuantity ?? 0)}
                        disabled={busy || !item.available}
                        label={`Số lượng ${item.productName}`}
                        onChange={(qty) => void mutate(() => updateItem(item.id, qty))}
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
        <div className={styles.footer}>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold uppercase tracking-wide text-content-secondary">
              Tạm tính
            </span>
            <span className="text-lg font-bold text-accent-red">
              {formatCurrencyVND(totalPrice)}
            </span>
          </div>

          <div className={styles.actions}>
            <Button
              variant="secondary"
              className={styles.actionButton}
              onClick={() => handleNavigate('/cart')}
            >
              Xem giỏ hàng
            </Button>
            <Button
              variant="primary"
              className={styles.actionButton}
              disabled={!isCustomer || items.length === 0}
              onClick={() => handleNavigate('/checkout')}
            >
              Thanh toán
            </Button>
          </div>
        </div>
      </aside>
    </dialog>
  );
}
