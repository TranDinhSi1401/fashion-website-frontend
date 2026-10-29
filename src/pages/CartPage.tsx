import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { CartResponse } from '../types/cart';
import { formatCurrencyVND } from '../utils/format';
import Breadcrumb from '../components/layout/Breadcrumb';
import QuantityStepper from '../components/product/QuantityStepper';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import './CartPage.css';

function CartImage({ url, name }: { url?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  return <div className="cart-image">{url && !failed ? <img src={url} alt={name} onError={() => setFailed(true)} /> : <ShoppingBag aria-label="Chưa có ảnh sản phẩm" />}</div>;
}

export default function CartPage() {
  const { cart, loading, busy, error, refresh, updateItem, removeItem, clear } = useCart();
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => { void refresh(); }, [refresh]);

  const mutate = async (action: () => Promise<CartResponse>, message: string) => {
    setActionError(''); setNotice('');
    try { await action(); setNotice(message); setConfirmClear(false); }
    catch (failure) {
      setActionError(failure instanceof Error ? failure.message : 'Không thể cập nhật giỏ hàng.');
      await refresh();
    }
  };

  return <div className="container cart-page">
    <Breadcrumb items={[{ label: 'Sản phẩm', to: '/products' }, { label: 'Giỏ hàng' }]} />
    <div className="cart-heading"><h1>Giỏ hàng của bạn</h1>
      <Button variant="ghost" disabled={busy || loading} onClick={() => { setActionError(''); void refresh(); }}>Tải lại giỏ hàng</Button>
    </div>
    {notice && <p role="status" className="cart-success">{notice}</p>}
    {(error || actionError) && <p role="alert" className="cart-error">{actionError || error}</p>}
    {loading && <p role="status">Đang tải giỏ hàng…</p>}
    {!loading && !cart && !error && <p role="status">Chưa tải được thông tin giỏ hàng.</p>}
    {cart && cart.items.length === 0 && !loading && <section className="cart-empty">
      <ShoppingBag size={44} /><h2>Giỏ hàng đang trống</h2><p>Chọn màu và kích cỡ phù hợp để thêm sản phẩm vào giỏ.</p>
      <Link to="/products" className="cart-continue">Khám phá sản phẩm</Link>
    </section>}
    {cart && cart.items.length > 0 && <div className="cart-layout" aria-busy={busy || loading}>
      <section aria-label="Sản phẩm trong giỏ hàng" className="cart-items">
        {cart.items.map(item => <article className="cart-item" key={item.id} aria-label={`${item.productName}, ${item.color}, ${item.size}`}>
          <Link to={`/products/${item.productId}`}><CartImage key={item.imageUrl} url={item.imageUrl} name={item.productName} /></Link>
          <div className="cart-item-info"><Link className="cart-item-name" to={`/products/${item.productId}`}>{item.productName}</Link>
            <p>Màu: {item.color} · Size: {item.size}</p><p>Đơn giá: {formatCurrencyVND(item.unitPrice)}</p>
            {!item.available ? <p className="cart-error">Sản phẩm hiện không còn hàng hoặc đã ngừng bán. Vui lòng xóa khỏi giỏ.</p>
              : item.quantity > item.stockQuantity ? <p className="cart-error">Chỉ còn {item.stockQuantity} sản phẩm. Vui lòng giảm số lượng.</p>
                : <p>Còn {item.stockQuantity} sản phẩm</p>}
            <QuantityStepper value={item.quantity} max={Math.max(1, item.stockQuantity)} label={`Số lượng ${item.productName}`}
              disabled={busy || loading || !item.available} onChange={quantity => void mutate(() => updateItem(item.id, quantity), 'Đã cập nhật số lượng.')} />
          </div>
          <div className="cart-item-total"><strong>{formatCurrencyVND(item.subtotal)}</strong>
            <Button variant="ghost" size="sm" disabled={busy || loading} icon={Trash2} aria-label={`Xóa ${item.productName}`}
              onClick={() => void mutate(() => removeItem(item.id), 'Đã xóa sản phẩm khỏi giỏ hàng.')}>Xóa</Button>
          </div>
        </article>)}
        <div className="cart-list-footer"><Link to="/products">← Tiếp tục chọn sản phẩm</Link>
          <Button variant="ghost" disabled={busy || loading} onClick={() => setConfirmClear(true)}>Xóa tất cả</Button></div>
      </section>
      <aside className="cart-summary" aria-label="Tổng giỏ hàng"><h2>Tổng giỏ hàng</h2>
        <div><span>Số lượng</span><strong>{cart.totalQuantity}</strong></div>
        <div><span>Tổng tiền sản phẩm</span><strong className="cart-total-price">{formatCurrencyVND(cart.totalPrice)}</strong></div>
        <p>Chưa bao gồm phí giao hàng. Giá và tồn kho được kiểm tra lại khi cập nhật giỏ hàng.</p>
        <Link to="/products" className="cart-continue">Tiếp tục mua sắm</Link>
      </aside>
    </div>}
    <Modal isOpen={confirmClear} onClose={() => { if (!busy) setConfirmClear(false); }} title="Xóa toàn bộ giỏ hàng">
      <p>Bạn muốn xóa tất cả sản phẩm trong giỏ hàng?</p><div className="cart-modal-actions">
        <Button variant="outline" disabled={busy} onClick={() => setConfirmClear(false)}>Giữ lại</Button>
        <Button variant="danger" loading={busy} onClick={() => void mutate(clear, 'Đã xóa toàn bộ giỏ hàng.')}>Xác nhận xóa</Button>
      </div>
    </Modal>
  </div>;
}
