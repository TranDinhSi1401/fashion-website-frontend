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
import AddressFormModal from '../components/profile/AddressFormModal';
import { Button, Input, Radio, Select } from '../components/ui';

type PaymentMethod = 'VNPay' | 'COD';

function CheckoutProductImage({ url, name }: { url?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="grid aspect-[3/4] w-[54px] place-items-center overflow-hidden bg-surface text-content-muted">
      {url && !failed ? (
        <img
          src={url}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <ShoppingBag aria-label="Chưa có ảnh sản phẩm" size={18} />
      )}
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

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let active = true;

    userService
      .getAddresses()
      .then((response) => {
        if (!active) return;
        const userAddresses = response.data || [];
        setAddresses(userAddresses);
        const defaultAddress =
          userAddresses.find((address) => address.isDefault) || userAddresses[0];
        setSelectedAddressId(defaultAddress?.id ?? '');
      })
      .catch((failure) => {
        if (active) {
          setAddressesError(
            extractErrorMessage(failure, 'Không thể tải địa chỉ của bạn.')
          );
        }
      })
      .finally(() => {
        if (active) setAddressesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [addressesRetry]);

  useEffect(() => {
    paymentMethodRef.current = paymentMethod;
  }, [paymentMethod]);

  useEffect(() => {
    if (
      typeof selectedAddressId !== 'number' ||
      !Number.isFinite(selectedAddressId) ||
      selectedAddressId <= 0
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

    shippingService
      .getOrderPreview(
        {
          userAddressId: selectedAddressId,
          paymentMethodId: paymentMethodRef.current === 'COD' ? 1 : 2,
        },
        controller.signal
      )
      .then((preview) => {
        if (active) setShippingPreview(preview);
      })
      .catch((failure) => {
        if (active) {
          setShippingError(
            extractErrorMessage(failure, 'Không thể tính phí vận chuyển.')
          );
        }
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
    setAddresses((current) => [
      ...current.filter((item) => item.id !== address.id),
      address,
    ]);
    setSelectedAddressId(address.id);
  };

  const expectedDeliveryTime = shippingPreview
    ? new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(shippingPreview.expected_delivery_time))
    : '';

  return (
    <div className="container pb-16">
      <Breadcrumb
        items={[
          { label: 'Sản phẩm', to: '/products' },
          { label: 'Giỏ hàng', to: '/cart' },
          { label: 'Thanh toán' },
        ]}
      />

      <header className="flex flex-col items-center gap-2 py-7 pb-9 text-center">
        <CreditCard
          size={38}
          strokeWidth={1.5}
          aria-hidden="true"
          className="text-content-primary"
        />
        <h1 className="text-xl font-bold uppercase tracking-wider text-content-primary md:text-2xl">
          Thanh toán
        </h1>
        <p className="text-sm text-content-muted">
          Vui lòng kiểm tra thông tin khách hàng và giỏ hàng trước khi đặt hàng.
        </p>
      </header>

      {loading && (
        <p
          role="status"
          className="mx-auto mb-6 max-w-[1060px] bg-surface p-4 text-base text-content-secondary"
        >
          Đang tải giỏ hàng…
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mx-auto mb-6 max-w-[1060px] bg-surface p-4 text-base text-status-error"
        >
          {error}
        </p>
      )}
      {!loading && !error && cart && cart.items.length === 0 && (
        <div className="mx-auto mb-6 max-w-[1060px] bg-surface p-6 text-center">
          <p className="mb-4 text-base text-content-secondary">Giỏ hàng đang trống.</p>
          <Link to="/products">
            <Button variant="primary">Khám phá sản phẩm</Button>
          </Link>
        </div>
      )}

      {cart && cart.items.length > 0 && (
        <div className="mx-auto grid max-w-[1060px] grid-cols-1 items-start gap-9 md:grid-cols-[minmax(0,1fr)_minmax(300px,390px)] lg:gap-16">
          <form className="min-w-0" onSubmit={(event) => event.preventDefault()}>
            <section
              className="border-b border-line-light pb-7"
              aria-labelledby="checkout-customer-heading"
            >
              <h2
                id="checkout-customer-heading"
                className="mb-5 text-md font-bold uppercase tracking-wide text-content-primary"
              >
                Thông tin khách hàng
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input
                    label="Họ tên"
                    name="fullname"
                    type="text"
                    autoComplete="name"
                    value={user?.fullname || ''}
                    readOnly
                    className="[&_input]:cursor-default [&_input]:bg-surface [&_input]:text-content-secondary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Select
                    label="Địa chỉ nhận hàng"
                    name="address"
                    value={selectedAddressId}
                    onChange={(event) =>
                      setSelectedAddressId(
                        event.target.value ? Number(event.target.value) : ''
                      )
                    }
                    disabled={addressesLoading || addresses.length === 0}
                  >
                    <option value="">
                      {addressesLoading
                        ? 'Đang tải địa chỉ…'
                        : addresses.length
                          ? 'Chọn địa chỉ nhận hàng'
                          : 'Chưa có địa chỉ'}
                    </option>
                    {addresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.fullAddress}
                        {address.isDefault ? ' (Mặc định)' : ''}
                      </option>
                    ))}
                  </Select>
                </div>

                {addressesError && (
                  <p className="text-xs italic text-status-error sm:col-span-2" role="alert">
                    {addressesError}{' '}
                    <button
                      type="button"
                      className="underline underline-offset-2"
                      onClick={() => {
                        setAddressesLoading(true);
                        setAddressesError('');
                        setAddressesRetry((value) => value + 1);
                      }}
                    >
                      Thử lại
                    </button>
                  </p>
                )}

                <div className="sm:col-span-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsAddressModalOpen(true)}
                  >
                    Thêm địa chỉ mới
                  </Button>
                </div>

                <Input
                  label="Điện thoại"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={user?.phone || ''}
                  readOnly
                  className="[&_input]:cursor-default [&_input]:bg-surface [&_input]:text-content-secondary"
                />

                <Input
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={user?.email || ''}
                  readOnly
                  className="[&_input]:cursor-default [&_input]:bg-surface [&_input]:text-content-secondary"
                />
              </div>
            </section>

            <section
              className="flex flex-col items-start gap-3 border-b border-line-light py-6"
              aria-labelledby="checkout-payment-heading"
            >
              <h2
                id="checkout-payment-heading"
                className="mb-1 text-md font-bold uppercase tracking-wide text-content-primary"
              >
                Hình thức thanh toán
              </h2>

              <Radio
                name="paymentMethod"
                value="COD"
                label="Thanh toán khi nhận hàng"
                checked={paymentMethod === 'COD'}
                onChange={() => setPaymentMethod('COD')}
              />

              <Radio
                name="paymentMethod"
                value="VNPay"
                label="Thanh toán qua VNPay"
                checked={paymentMethod === 'VNPay'}
                onChange={() => setPaymentMethod('VNPay')}
              />
            </section>

            <Button type="button" size="lg" className="mt-5 w-full">
              Đặt hàng
            </Button>
          </form>

          <aside
            className="min-w-0 md:sticky md:top-24"
            aria-labelledby="checkout-summary-heading"
          >
            <div className="flex items-center justify-between border-b border-line-light pb-3.5">
              <h2
                id="checkout-summary-heading"
                className="text-md font-bold uppercase tracking-wide text-content-primary"
              >
                Giỏ hàng
              </h2>
              <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-semibold text-content-inverse">
                {cart.totalQuantity}
              </span>
            </div>

            <ul className="divide-y divide-line-light">
              {cart.items.map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[54px_minmax(0,1fr)_auto] items-center gap-3 py-3.5"
                >
                  <CheckoutProductImage
                    key={item.imageUrl}
                    url={item.imageUrl}
                    name={item.productName}
                  />
                  <div className="flex min-w-0 flex-col gap-1">
                    <Link
                      to={`/products/${item.productId}`}
                      className="truncate text-sm font-semibold text-content-primary transition-colors hover:text-accent-gold"
                    >
                      {item.productName}
                    </Link>
                    <span className="text-xs text-content-muted">
                      {item.color} · {item.size} · x {item.quantity}
                    </span>
                  </div>
                  <strong className="whitespace-nowrap text-sm font-bold text-content-primary">
                    {formatCurrencyVND(item.subtotal)}
                  </strong>
                </li>
              ))}
            </ul>

            <div className="border-t border-line-light py-4">
              <label
                htmlFor="checkout-coupon-code"
                className="mb-2 block text-sm font-semibold text-content-primary"
              >
                Mã khuyến mãi
              </label>
              <div className="flex gap-2">
                <Input
                  id="checkout-coupon-code"
                  name="coupon"
                  type="text"
                  placeholder="Nhập mã"
                  className="flex-1"
                />
                <Button type="button" variant="secondary" className="shrink-0">
                  Xác nhận
                </Button>
              </div>
            </div>

            <section
              className="border-t border-line-light pt-4"
              aria-labelledby="checkout-payment-details-heading"
            >
              <h3
                id="checkout-payment-details-heading"
                className="mb-2 text-base font-bold uppercase tracking-wide text-content-primary"
              >
                Chi tiết thanh toán
              </h3>

              <div className="flex justify-between gap-3 py-2 text-sm text-content-secondary">
                <span>Tổng tiền hàng</span>
                <strong className="whitespace-nowrap font-semibold text-content-primary">
                  {formatCurrencyVND(cart.totalPrice)}
                </strong>
              </div>

              <div className="flex justify-between gap-3 py-2 text-sm text-content-secondary">
                <span>Phí vận chuyển</span>
                <strong className="whitespace-nowrap font-semibold text-content-primary">
                  {shippingLoading
                    ? 'Đang tính…'
                    : shippingPreview
                      ? formatCurrencyVND(shippingPreview.total_fee)
                      : '—'}
                </strong>
              </div>

              {shippingError && (
                <p className="my-1.5 text-xs italic text-status-error" role="alert">
                  {shippingError}
                </p>
              )}

              {shippingPreview && (
                <p className="my-1.5 text-xs text-content-muted">
                  Dự kiến giao hàng: {expectedDeliveryTime}
                </p>
              )}

              <div className="mt-2 flex justify-between gap-3 border-t border-line-light pt-3.5 text-base font-bold text-content-primary">
                <span>Tổng thanh toán</span>
                <strong className="whitespace-nowrap text-lg text-accent-red">
                  {shippingPreview
                    ? formatCurrencyVND(cart.totalPrice + shippingPreview.total_fee)
                    : '—'}
                </strong>
              </div>

              {!shippingPreview && !shippingLoading && !shippingError && (
                <p className="mt-2 text-xs text-content-muted">
                  Chọn địa chỉ nhận hàng để tính phí vận chuyển.
                </p>
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
