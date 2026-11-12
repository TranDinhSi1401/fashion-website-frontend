import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { userService } from '../services/userService';
import { shippingService, ShippingOrderPreview } from '../services/shippingService';
import { UserAddressResponse } from '../types/user';
import { extractErrorMessage, formatCurrencyVND } from '../utils/format';
import Breadcrumb from '../components/layout/Breadcrumb';
import Button from '../components/ui/Button';
import AddressFormModal from '../components/profile/AddressFormModal';
import './CheckoutPage.css';

type PaymentMethod = 'VNPay' | 'COD';

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const paymentMethodRef = useRef(paymentMethod);
  const [addresses, setAddresses] = useState<UserAddressResponse[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | ''>('');
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressesError, setAddressesError] = useState('');
  const [addressesRetry, setAddressesRetry] = useState(0);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [shippingPreview, setShippingPreview] = useState<ShippingOrderPreview | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');

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

  useEffect(() => {
    paymentMethodRef.current = paymentMethod;
  }, [paymentMethod]);

  useEffect(() => {
    if (
      typeof selectedAddressId !== 'number'
      || !Number.isFinite(selectedAddressId)
      || selectedAddressId <= 0
    ) {
      setShippingPreview(null);
      setShippingError('');
      setShippingLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setShippingPreview(null);
    setShippingError('');
    setShippingLoading(true);

    shippingService.getOrderPreview({
      userAddressId: selectedAddressId,
      paymentMethodId: paymentMethodRef.current === 'COD' ? 1 : 2,
    }, controller.signal)
      .then(preview => {
        if (active) setShippingPreview(preview);
      })
      .catch(failure => {
        if (active) setShippingError(extractErrorMessage(failure, 'Không thể tính phí vận chuyển.'));
      })
      .finally(() => {
        if (active) setShippingLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedAddressId]);

  const handleAddressSaved = (address: UserAddressResponse) => {
    setAddresses(current => [...current.filter(item => item.id !== address.id), address]);
    setSelectedAddressId(address.id);
  };

  const expectedDeliveryTime = shippingPreview
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })
      .format(new Date(shippingPreview.expected_delivery_time))
    : '';

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
                <input type="radio" name="paymentMethod" value="COD" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} />
                <span>Thanh toán khi nhận hàng</span>
              </label>
              <label className="checkout-radio">
                <input type="radio" name="paymentMethod" value="VNPay" checked={paymentMethod === 'VNPay'} onChange={() => setPaymentMethod('VNPay')} />
                <span>Thanh toán qua VNPay</span>
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
            <div className="checkout-coupon">
              <label htmlFor="checkout-coupon-code">Mã khuyến mãi</label>
              <div>
                <input id="checkout-coupon-code" name="coupon" type="text" placeholder="Nhập mã" />
                <Button type="button" variant="secondary" size="sm">Xác nhận</Button>
              </div>
            </div>
            <section className="checkout-payment-details" aria-labelledby="checkout-payment-details-heading">
              <h3 id="checkout-payment-details-heading">Chi tiết thanh toán</h3>
              <div className="checkout-total">
                <span>Tổng tiền hàng</span>
                <strong>{formatCurrencyVND(cart.totalPrice)}</strong>
              </div>
              <div className="checkout-total">
                <span>Phí vận chuyển</span>
                <strong>
                  {shippingLoading
                    ? 'Đang tính…'
                    : shippingPreview
                      ? formatCurrencyVND(shippingPreview.total_fee)
                      : '—'}
                </strong>
              </div>
              {shippingError && <p className="checkout-shipping-error" role="alert">{shippingError}</p>}
              {shippingPreview && (
                <p className="checkout-delivery-time">
                  Dự kiến giao hàng: {expectedDeliveryTime}
                </p>
              )}
              <div className="checkout-total checkout-grand-total">
                <span>Tổng thanh toán</span>
                <strong>
                  {shippingPreview
                    ? formatCurrencyVND(cart.totalPrice + shippingPreview.total_fee)
                    : '—'}
                </strong>
              </div>
              {!shippingPreview && !shippingLoading && !shippingError && (
                <p className="checkout-delivery-time">Chọn địa chỉ nhận hàng để tính phí vận chuyển.</p>
              )}
            </section>
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
