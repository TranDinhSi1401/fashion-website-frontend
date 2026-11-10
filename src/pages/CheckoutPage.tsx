import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { userService } from '../services/userService';
import { UserAddressResponse } from '../types/user';
import { extractErrorMessage, formatCurrencyVND } from '../utils/format';
import Breadcrumb from '../components/layout/Breadcrumb';
import Button from '../components/ui/Button';
import AddressFormModal from '../components/profile/AddressFormModal';
import './CheckoutPage.css';

type PaymentMethod = 'cash' | 'transfer' | 'cod';

function CheckoutProductImage({ url, name }: { url?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="checkout-product-image">
      {url && !failed
        ? <img src={url} alt={name} onError={() => setFailed(true)} />
        : <ShoppingBag aria-label="Chưa có ảnh sản phẩm" />}
    </div>
  );
}

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cart, loading, error, refresh } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [addresses, setAddresses] = useState<UserAddressResponse[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | ''>('');
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressesError, setAddressesError] = useState('');
  const [addressesRetry, setAddressesRetry] = useState(0);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    let active = true;

    userService.getAddresses()
      .then(response => {
        if (!active) return;
        const userAddresses = response.data || [];
        setAddresses(userAddresses);
        const defaultAddress = userAddresses.find(address => address.isDefault) || userAddresses[0];
        setSelectedAddressId(defaultAddress?.id ?? '');
      })
      .catch(failure => {
        if (active) setAddressesError(extractErrorMessage(failure, 'Không thể tải địa chỉ của bạn.'));
      })
      .finally(() => {
        if (active) setAddressesLoading(false);
      });

    return () => { active = false; };
  }, [addressesRetry]);

  const handleAddressSaved = (address: UserAddressResponse) => {
    setAddresses(current => [...current.filter(item => item.id !== address.id), address]);
    setSelectedAddressId(address.id);
  };

  return (
    <div className="container checkout-page">
      <Breadcrumb items={[
        { label: 'Sản phẩm', to: '/products' },
        { label: 'Giỏ hàng', to: '/cart' },
        { label: 'Thanh toán' },
      ]} />

      <header className="checkout-heading">
        <CreditCard size={38} strokeWidth={1.5} aria-hidden="true" />
        <h1>Thanh toán</h1>
        <p>Vui lòng kiểm tra thông tin khách hàng và giỏ hàng trước khi đặt hàng.</p>
      </header>

      {loading && <p role="status" className="checkout-message">Đang tải giỏ hàng…</p>}
      {error && <p role="alert" className="checkout-message checkout-error">{error}</p>}
      {!loading && !error && cart && cart.items.length === 0 && (
        <div className="checkout-message">
          <p>Giỏ hàng đang trống.</p>
          <Link to="/products">Khám phá sản phẩm</Link>
        </div>
      )}

      {cart && cart.items.length > 0 && (
        <div className="checkout-layout">
          <form className="checkout-customer" onSubmit={event => event.preventDefault()}>
            <section className="checkout-section" aria-labelledby="checkout-customer-heading">
              <h2 id="checkout-customer-heading">Thông tin khách hàng</h2>
              <div className="checkout-fields">
                <label className="checkout-field checkout-field-wide">
                  <span>Họ tên</span>
                  <input name="fullname" type="text" autoComplete="name" value={user?.fullname || ''} readOnly />
                </label>
                <label className="checkout-field checkout-field-wide">
                  <span>Địa chỉ nhận hàng</span>
                  <select
                    name="address"
                    value={selectedAddressId}
                    onChange={event => setSelectedAddressId(event.target.value ? Number(event.target.value) : '')}
                    disabled={addressesLoading || addresses.length === 0}
                  >
                    <option value="">
                      {addressesLoading ? 'Đang tải địa chỉ…' : addresses.length ? 'Chọn địa chỉ nhận hàng' : 'Chưa có địa chỉ'}
                    </option>
                    {addresses.map(address => (
                      <option key={address.id} value={address.id}>
                        {address.fullAddress}{address.isDefault ? ' (Mặc định)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                {addressesError && (
                  <p className="checkout-address-error" role="alert">
                    {addressesError}{' '}
                    <button type="button" onClick={() => {
                      setAddressesLoading(true);
                      setAddressesError('');
                      setAddressesRetry(value => value + 1);
                    }}>Thử lại</button>
                  </p>
                )}
                <div className="checkout-address-actions checkout-field-wide">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsAddressModalOpen(true)}>
                    Thêm địa chỉ mới
                  </Button>
                </div>
                <label className="checkout-field">
                  <span>Điện thoại</span>
                  <input name="phone" type="tel" autoComplete="tel" value={user?.phone || ''} readOnly />
                </label>
                <label className="checkout-field">
                  <span>Email</span>
                  <input name="email" type="email" autoComplete="email" value={user?.email || ''} readOnly />
                </label>
              </div>
            </section>

            <section className="checkout-section checkout-payment" aria-labelledby="checkout-payment-heading">
              <h2 id="checkout-payment-heading">Hình thức thanh toán</h2>
              <label className="checkout-radio">
                <input type="radio" name="paymentMethod" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} />
                <span>Tiền mặt</span>
              </label>
              <label className="checkout-radio">
                <input type="radio" name="paymentMethod" value="transfer" checked={paymentMethod === 'transfer'} onChange={() => setPaymentMethod('transfer')} />
                <span>Chuyển khoản</span>
              </label>
              <label className="checkout-radio">
                <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                <span>Ship COD</span>
              </label>
            </section>

            <Button type="button" className="checkout-submit" size="lg">Đặt hàng</Button>
          </form>

          <aside className="checkout-summary" aria-labelledby="checkout-summary-heading">
            <div className="checkout-summary-title">
              <h2 id="checkout-summary-heading">Giỏ hàng</h2>
              <span className="checkout-item-count">{cart.totalQuantity}</span>
            </div>
            <ul className="checkout-items">
              {cart.items.map(item => (
                <li className="checkout-item" key={item.id}>
                  <CheckoutProductImage key={item.imageUrl} url={item.imageUrl} name={item.productName} />
                  <div className="checkout-item-info">
                    <Link to={`/products/${item.productId}`}>{item.productName}</Link>
                    <span>{item.color} · {item.size} · x {item.quantity}</span>
                  </div>
                  <strong>{formatCurrencyVND(item.subtotal)}</strong>
                </li>
              ))}
            </ul>
            <div className="checkout-total">
              <span>Tổng thanh toán</span>
              <strong>{formatCurrencyVND(cart.totalPrice)}</strong>
            </div>
            <div className="checkout-coupon">
              <label htmlFor="checkout-coupon-code">Mã khuyến mãi</label>
              <div>
                <input id="checkout-coupon-code" name="coupon" type="text" placeholder="Nhập mã" />
                <Button type="button" variant="secondary" size="sm">Xác nhận</Button>
              </div>
            </div>
          </aside>
        </div>
      )}
      <AddressFormModal
        key={`${isAddressModalOpen}-checkout-new`}
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        defaultAddress={addresses.length === 0}
        onSaved={handleAddressSaved}
      />
    </div>
  );
}
