import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { userService } from '../services/userService';
import { orderService } from '../services/orderService';
import { shippingService, ShippingOrderPreview } from '../services/shippingService';
import { paymentMethodService, PaymentMethodResponse } from '../services/paymentMethodService';
import { specialOfferService, SpecialOfferResponse } from '../services/specialOfferService';
import { UserAddressResponse } from '../types/user';
import { extractErrorMessage, formatCurrencyVND } from '../utils/format';
import Breadcrumb from '../components/layout/Breadcrumb';
import AddressFormModal from '../components/profile/AddressFormModal';
import { Button, Input, Radio, Select } from '../components/ui';

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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodResponse[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<number | ''>('');
  const selectedPaymentMethodIdRef = useRef(selectedPaymentMethodId);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
  const [paymentMethodsError, setPaymentMethodsError] = useState('');
  const [paymentMethodsRetry, setPaymentMethodsRetry] = useState(0);
  const [addresses, setAddresses] = useState<UserAddressResponse[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | ''>('');
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressesError, setAddressesError] = useState('');
  const [addressesRetry, setAddressesRetry] = useState(0);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [shippingPreview, setShippingPreview] = useState<ShippingOrderPreview | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');
  const [specialOffers, setSpecialOffers] = useState<SpecialOfferResponse[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<number | ''>('');
  const [specialOfferLoading, setSpecialOfferLoading] = useState(true);
  const [specialOfferError, setSpecialOfferError] = useState('');
  const [specialOfferRetry, setSpecialOfferRetry] = useState(0);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState<string>('');
  const navigate = useNavigate();


  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let active = true;

    specialOfferService
      .getActiveOffers()
      .then((offers) => {
        if (!active) return;
        setSpecialOffers(offers.filter((offer) => offer.isActive));
        setSelectedOfferId('');
      })
      .catch((failure) => {
        if (active) {
          setSpecialOfferError(
            extractErrorMessage(failure, 'Không thể tải ưu đãi.')
          );
        }
      })
      .finally(() => {
        if (active) setSpecialOfferLoading(false);
      });

    return () => {
      active = false;
    };
  }, [specialOfferRetry]);

  useEffect(() => {
    let active = true;

    paymentMethodService
      .getPaymentMethods()
      .then((response) => {
        if (!active) return;
        const activePaymentMethods = (response.data || []).filter(
          (paymentMethod) => paymentMethod.isActive === true
        );
        setPaymentMethods(activePaymentMethods);
        const selectedId = activePaymentMethods.some(
          (paymentMethod) => paymentMethod.id === selectedPaymentMethodIdRef.current
        )
          ? selectedPaymentMethodIdRef.current
          : activePaymentMethods[0]?.id ?? '';
        selectedPaymentMethodIdRef.current = selectedId;
        setSelectedPaymentMethodId(selectedId);
      })
      .catch((failure) => {
        if (active) {
          setPaymentMethodsError(
            extractErrorMessage(failure, 'Không thể tải phương thức thanh toán.')
          );
        }
      })
      .finally(() => {
        if (active) setPaymentMethodsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [paymentMethodsRetry]);

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
    const paymentMethodId = selectedPaymentMethodId;

    if (
      typeof selectedAddressId !== 'number' ||
      !Number.isFinite(selectedAddressId) ||
      selectedAddressId <= 0 ||
      typeof paymentMethodId !== 'number' ||
      !Number.isFinite(paymentMethodId)
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
          paymentMethodId,
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
  }, [selectedAddressId, selectedPaymentMethodId]);

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
  const selectedOffer =
    specialOffers.find((offer) => offer.id === selectedOfferId) ?? null;
  const offerEligible =
    selectedOffer !== null &&
    cart !== null &&
    cart.totalPrice >= (selectedOffer.minOrderAmount ?? 0);
  const discountAmount =
    selectedOffer && offerEligible && cart
      ? Math.min(
          cart.totalPrice,
          Math.round(
            selectedOffer.offerType === 'PERCENT'
              ? Math.min(
                  (cart.totalPrice * (selectedOffer.discountPercent ?? 0)) / 100,
                  selectedOffer.maxDiscountAmount ?? Number.POSITIVE_INFINITY
                )
              : selectedOffer.discountAmount ?? 0
          )
        )
      : 0;

  const handlePlaceOrder = async () => {
    if (typeof selectedAddressId !== 'number' || selectedAddressId <= 0) {
      setOrderError('Vui lòng chọn địa chỉ nhận hàng trước khi đặt mua.');
      return;
    }
    if (typeof selectedPaymentMethodId !== 'number' || selectedPaymentMethodId <= 0) {
      setOrderError('Vui lòng chọn phương thức thanh toán trước khi đặt mua.');
      return;
    }
    setPlacingOrder(true);
    setOrderError('');
    setOrderSuccess('');
    try {
      const res = await orderService.createOrder({
        userAddressId: selectedAddressId,
        paymentMethodId: selectedPaymentMethodId,
      });
      await refresh();
      setOrderSuccess(
        `Đặt hàng thành công! Mã đơn hàng: ${res.data?.orderCode || '#' + res.data?.id}. Tồn kho sản phẩm và thông báo đơn hàng đã được đồng bộ realtime.`
      );
    } catch (err) {
      setOrderError(extractErrorMessage(err, 'Không thể tạo đơn hàng. Vui lòng kiểm tra lại tồn kho.'));
    } finally {
      setPlacingOrder(false);
    }
  };

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
      {orderSuccess && (
        <div className="mx-auto mb-6 max-w-[1060px] border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-900">
          <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-600" />
          <p className="mb-4 text-sm font-semibold">{orderSuccess}</p>
          <div className="flex justify-center gap-3">
            <Button variant="primary" onClick={() => navigate('/products')}>
              Tiếp tục mua sắm
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && !orderSuccess && cart && cart.items.length === 0 && (
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

              {paymentMethodsLoading && (
                <p className="text-sm text-content-muted" role="status">
                  Đang tải phương thức thanh toán…
                </p>
              )}
              {paymentMethodsError && (
                <p className="text-xs italic text-status-error" role="alert">
                  {paymentMethodsError}{' '}
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() => {
                      setPaymentMethodsLoading(true);
                      setPaymentMethodsError('');
                      setPaymentMethodsRetry((value) => value + 1);
                    }}
                  >
                    Thử lại
                  </button>
                </p>
              )}
              {!paymentMethodsLoading &&
                !paymentMethodsError &&
                paymentMethods.length === 0 && (
                  <p className="text-sm text-content-muted">
                    Hiện không có phương thức thanh toán khả dụng.
                  </p>
                )}
              {paymentMethods.map((paymentMethod) => (
                <Radio
                  key={paymentMethod.id}
                  id={`payment-method-${paymentMethod.id}`}
                  name="paymentMethod"
                  value={paymentMethod.id}
                  label={paymentMethod.name}
                  checked={selectedPaymentMethodId === paymentMethod.id}
                  onChange={() => {
                    selectedPaymentMethodIdRef.current = paymentMethod.id;
                    setSelectedPaymentMethodId(paymentMethod.id);
                  }}
                />
              ))}
            </section>

            {orderError && (
              <p className="mt-4 text-xs font-medium text-status-error" role="alert">
                {orderError}
              </p>
            )}

            <Button
              type="button"
              size="lg"
              className="mt-5 w-full"
              loading={placingOrder}
              disabled={
                !selectedAddressId ||
                typeof selectedPaymentMethodId !== 'number' ||
                placingOrder
              }
              onClick={() => void handlePlaceOrder()}
            >
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
              <Select
                id="checkout-special-offer"
                name="specialOffer"
                label="Ưu đãi"
                value={selectedOfferId}
                onChange={(event) =>
                  setSelectedOfferId(
                    event.target.value ? Number(event.target.value) : ''
                  )
                }
                disabled={specialOfferLoading || specialOffers.length === 0}
              >
                <option value="">
                  {specialOfferLoading
                    ? 'Đang tải ưu đãi…'
                    : specialOffers.length > 0
                      ? 'Chọn ưu đãi'
                      : 'Không có ưu đãi khả dụng'}
                </option>
                {specialOffers.map((offer) => {
                  const eligible =
                    cart.totalPrice >= (offer.minOrderAmount ?? 0);
                  return (
                    <option key={offer.id} value={offer.id} disabled={!eligible}>
                      {offer.title}
                      {offer.offerType === 'PERCENT'
                        ? ` — Giảm ${offer.discountPercent ?? 0}%`
                        : ` — Giảm ${formatCurrencyVND(offer.discountAmount)}`}
                      {!eligible
                        ? ` (Đơn tối thiểu ${formatCurrencyVND(offer.minOrderAmount)})`
                        : ''}
                    </option>
                  );
                })}
              </Select>

              {specialOfferError && (
                <p className="mt-2 text-xs italic text-status-error" role="alert">
                  {specialOfferError}{' '}
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() => {
                      setSpecialOfferLoading(true);
                      setSpecialOfferError('');
                      setSpecialOfferRetry((value) => value + 1);
                    }}
                  >
                    Thử lại
                  </button>
                </p>
              )}
              {selectedOffer && !offerEligible && (
                <p className="mt-2 text-xs text-content-muted">
                  Đơn hàng tối thiểu {formatCurrencyVND(selectedOffer.minOrderAmount)} để
                  áp dụng ưu đãi này.
                </p>
              )}
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

              {selectedOffer && (
                <div className="flex justify-between gap-3 py-2 text-sm text-content-secondary">
                  <span>Ưu đãi</span>
                  <strong className="whitespace-nowrap font-semibold text-status-success">
                    −{formatCurrencyVND(discountAmount)}
                  </strong>
                </div>
              )}

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
                    ? formatCurrencyVND(
                        cart.totalPrice - discountAmount + shippingPreview.total_fee
                      )
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
