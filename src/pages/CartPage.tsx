import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { CartResponse } from '../types/cart';
import { formatCurrencyVND } from '../utils/format';
import Breadcrumb from '../components/layout/Breadcrumb';
import BackButton from '../components/common/BackButton';
import { Button, Modal, QuantityStepper } from '../components/ui';

function CartImage({ url, name }: { url?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="grid aspect-[3/4] w-[80px] place-items-center overflow-hidden bg-surface text-content-muted sm:w-[110px]">
      {url && !failed ? (
        <img
          src={url}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <ShoppingBag aria-label="Chưa có ảnh sản phẩm" />
      )}
    </div>
  );
}

export default function CartPage() {
  const { cart, loading, busy, error, refresh, updateItem, removeItem, clear } = useCart();
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mutate = async (action: () => Promise<CartResponse>, message: string) => {
    setActionError('');
    setNotice('');
    try {
      await action();
      setNotice(message);
      setConfirmClear(false);
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : 'Không thể cập nhật giỏ hàng.');
      await refresh();
    }
  };

  return (
    <div className="container pb-16">
      <Breadcrumb items={[{ label: 'Sản phẩm', to: '/products' }, { label: 'Giỏ hàng' }]} />
      <BackButton />

      <div className="my-6 flex flex-wrap items-center justify-between gap-6">
        <h1 className="text-xl font-bold uppercase tracking-wider text-content-primary md:text-2xl">
          Giỏ hàng của bạn
        </h1>
        <Button
          variant="ghost"
          disabled={busy || loading}
          onClick={() => {
            setActionError('');
            void refresh();
          }}
        >
          Tải lại giỏ hàng
        </Button>
      </div>

      {notice && (
        <p role="status" className="py-3 text-base font-medium text-status-success">
          {notice}
        </p>
      )}
      {(error || actionError) && (
        <p role="alert" className="py-3 text-base leading-relaxed text-status-error">
          {actionError || error}
        </p>
      )}
      {loading && (
        <p role="status" className="py-3 text-base text-content-secondary">
          Đang tải giỏ hàng…
        </p>
      )}
      {!loading && !cart && !error && (
        <p role="status" className="py-3 text-base text-content-secondary">
          Chưa tải được thông tin giỏ hàng.
        </p>
      )}

      {cart && cart.items.length === 0 && !loading && (
        <section className="flex flex-col items-center gap-6 px-5 py-16 text-center">
          <ShoppingBag size={44} className="text-content-muted" />
          <h2 className="text-xl font-bold uppercase tracking-wide text-content-primary">
            Giỏ hàng đang trống
          </h2>
          <p className="text-base text-content-secondary">
            Chọn màu và kích cỡ phù hợp để thêm sản phẩm vào giỏ.
          </p>
          <Link to="/products">
            <Button variant="primary">Khám phá sản phẩm</Button>
          </Link>
        </section>
      )}

      {cart && cart.items.length > 0 && (
        <div
          className="grid grid-cols-1 items-start gap-9 lg:grid-cols-[minmax(0,1fr)_340px]"
          aria-busy={busy || loading}
        >
          <section aria-label="Sản phẩm trong giỏ hàng">
            {cart.items.map((item) => (
              <article
                key={item.id}
                aria-label={`${item.productName}, ${item.color}, ${item.size}`}
                className="grid grid-cols-[80px_minmax(0,1fr)] gap-4 border-b border-line-light py-6 sm:grid-cols-[110px_minmax(0,1fr)_auto] sm:gap-6"
              >
                <Link to={`/products/${item.productId}`}>
                  <CartImage key={item.imageUrl} url={item.imageUrl} name={item.productName} />
                </Link>

                <div className="flex min-w-0 flex-col items-start gap-2.5">
                  <Link
                    to={`/products/${item.productId}`}
                    className="text-base font-medium leading-normal text-content-primary transition-colors hover:text-accent-gold"
                  >
                    {item.productName}
                  </Link>
                  <p className="text-sm text-content-secondary">
                    Màu: {item.color} · Size: {item.size}
                  </p>
                  <p className="text-sm text-content-secondary">
                    Đơn giá: {formatCurrencyVND(item.unitPrice)}
                  </p>
                  {!item.available ? (
                    <p className="text-sm leading-relaxed text-status-error">
                      Sản phẩm hiện không còn hàng hoặc đã ngừng bán. Vui lòng xóa khỏi giỏ.
                    </p>
                  ) : item.quantity > item.stockQuantity ? (
                    <p className="text-sm leading-relaxed text-status-error">
                      Chỉ còn {item.stockQuantity} sản phẩm. Vui lòng giảm số lượng.
                    </p>
                  ) : (
                    <p className="text-sm text-content-secondary">
                      Còn {item.stockQuantity} sản phẩm
                    </p>
                  )}

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

                <div className="col-start-2 flex flex-row items-center justify-between gap-4 sm:col-start-auto sm:flex-col sm:items-end">
                  <strong className="text-md font-bold text-content-primary">
                    {formatCurrencyVND(item.subtotal)}
                  </strong>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy || loading}
                    icon={Trash2}
                    aria-label={`Xóa ${item.productName}`}
                    onClick={() =>
                      void mutate(
                        () => removeItem(item.id),
                        'Đã xóa sản phẩm khỏi giỏ hàng.'
                      )
                    }
                  >
                    Xóa
                  </Button>
                </div>
              </article>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-4 py-6 text-sm">
              <Link
                to="/products"
                className="font-medium text-content-secondary transition-colors hover:text-content-primary"
              >
                ← Tiếp tục chọn sản phẩm
              </Link>
              <Button
                variant="ghost"
                disabled={busy || loading}
                onClick={() => setConfirmClear(true)}
              >
                Xóa tất cả
              </Button>
            </div>
          </section>

          <aside
            aria-label="Tổng giỏ hàng"
            className="flex flex-col gap-6 border border-line bg-surface p-6 lg:sticky lg:top-24"
          >
            <h2 className="text-md font-bold uppercase tracking-wide text-content-primary">
              Tổng giỏ hàng
            </h2>

            <div className="flex items-baseline justify-between gap-4 text-base">
              <span className="text-content-secondary">Số lượng</span>
              <strong className="font-bold text-content-primary">{cart.totalQuantity}</strong>
            </div>

            <div className="flex items-baseline justify-between gap-4 text-base">
              <span className="text-content-secondary">Tổng tiền sản phẩm</span>
              <strong className="whitespace-nowrap text-lg font-bold text-accent-red">
                {formatCurrencyVND(cart.totalPrice)}
              </strong>
            </div>

            <p className="text-xs leading-relaxed text-content-secondary">
              Chưa bao gồm phí giao hàng. Giá và tồn kho được kiểm tra lại khi cập nhật giỏ hàng.
            </p>

            <Link to="/checkout" className="w-full">
              <Button variant="primary" size="lg" className="w-full">
                Thanh toán
              </Button>
            </Link>
          </aside>
        </div>
      )}

      <Modal
        isOpen={confirmClear}
        onClose={() => {
          if (!busy) setConfirmClear(false);
        }}
        title="Xóa toàn bộ giỏ hàng"
      >
        <p className="text-base text-content-secondary">
          Bạn muốn xóa tất cả sản phẩm trong giỏ hàng?
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" disabled={busy} onClick={() => setConfirmClear(false)}>
            Giữ lại
          </Button>
          <Button
            variant="danger"
            loading={busy}
            onClick={() => void mutate(clear, 'Đã xóa toàn bộ giỏ hàng.')}
          >
            Xác nhận xóa
          </Button>
        </div>
      </Modal>
    </div>
  );
}
