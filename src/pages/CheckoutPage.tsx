import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  ShoppingBag,
  ChevronDown,
  Ticket,
  X,
  Tag,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { userService } from '../services/userService';
import { orderService } from '../services/orderService';
import { shippingService, ShippingOrderPreview } from '../services/shippingService';
import { paymentMethodService, PaymentMethodResponse } from '../services/paymentMethodService';
import { specialOfferService, SpecialOfferResponse } from '../services/specialOfferService';
import { voucherService } from '../services/voucherService';
import { VoucherCalculationResult } from '../types/voucher';
import { UserAddressResponse } from '../types/user';
import { extractErrorMessage, formatCurrencyVND } from '../utils/format';
import Breadcrumb from '../components/layout/Breadcrumb';
import AddressFormModal from '../components/profile/AddressFormModal';
import VoucherPickerDrawer from '../components/voucher/VoucherPickerDrawer';
import { Button, Input, Modal, Radio, Select } from '../components/ui';

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

function isOrderOffer(offer: SpecialOfferResponse) {
  return offer.type === 'ORDER' || offer.offerType === 'ORDER';
}

function isPercentageOffer(offer: SpecialOfferResponse) {
  if (offer.offerType === 'PERCENT') return true;
  if (offer.offerType === 'AMOUNT') return false;

  return (
    !(typeof offer.discountAmount === 'number' && offer.discountAmount > 0) &&
    typeof offer.discountPercent === 'number'
  );
}

function getPaymentRedirectUrl(paymentUrl: string | null | undefined) {
  if (!paymentUrl?.trim()) return null;

  try {
    const url = new URL(paymentUrl);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export default function CheckoutPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { cart, loading, error, refresh } = useCart();
  const [isPhoneSetupModalOpen, setIsPhoneSetupModalOpen] = useState(false);
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
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [shippingPreview, setShippingPreview] = useState<ShippingOrderPreview | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');
  const [specialOffers, setSpecialOffers] = useState<SpecialOfferResponse[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<number | ''>('');
  const [isOfferMenuOpen, setIsOfferMenuOpen] = useState(false);
  const [specialOfferLoading, setSpecialOfferLoading] = useState(true);
  const [specialOfferError, setSpecialOfferError] = useState('');
  const [specialOfferRetry, setSpecialOfferRetry] = useState(0);

  // Voucher & Promotion resolution states
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherCalculationResult | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState('');
  const [voucherClaimNotice, setVoucherClaimNotice] = useState('');
  const [discountChangeNotice, setDiscountChangeNotice] = useState<{
    type: 'info' | 'warning' | 'error';
    text: string;
  } | null>(null);
  const [isVoucherDrawerOpen, setIsVoucherDrawerOpen] = useState(false);
  const [detailOffer, setDetailOffer] = useState<SpecialOfferResponse | null>(null);
  const offerSelectorRef = useRef<HTMLDivElement>(null);
  const prevOfferEligibleRef = useRef<boolean | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderCreatedWithoutPaymentUrl, setOrderCreatedWithoutPaymentUrl] = useState(false);
  const [isOrderConfirmOpen, setIsOrderConfirmOpen] = useState(false);
  const [orderConfirmationMessage, setOrderConfirmationMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!authLoading && !user?.phone?.trim()) {
      setIsPhoneSetupModalOpen(true);
    } else {
      setIsPhoneSetupModalOpen(false);
    }
  }, [authLoading, user?.phone]);

  useEffect(() => {
    let active = true;

    specialOfferService
      .getActiveOffers()
      .then((offers) => {
        if (!active) return;
        setSpecialOffers(
          offers.filter((offer) => offer.isActive && isOrderOffer(offer))
        );
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
    if (!isOfferMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!offerSelectorRef.current?.contains(event.target as Node)) {
        setIsOfferMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOfferMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOfferMenuOpen]);

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
          : activePaymentMethods.find(
              (paymentMethod) => paymentMethod.code === 'FWDEMO1_VNPAY'
            )?.id ??
            activePaymentMethods[0]?.id ??
            '';
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
      !user?.phone?.trim() ||
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
  }, [selectedAddressId, selectedPaymentMethodId, user?.phone]);

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

  const computeSingleOfferDiscount = (offer: SpecialOfferResponse | null): number => {
    if (!offer || !cart) return 0;
    if (cart.totalPrice < (offer.minOrderAmount ?? 0)) return 0;
    return Math.min(
      cart.totalPrice,
      Math.round(
        isPercentageOffer(offer)
          ? Math.min(
              (cart.totalPrice * (offer.discountPercent ?? 0)) / 100,
              offer.maxDiscountAmount ?? Number.POSITIVE_INFINITY
            )
          : offer.discountAmount ?? 0
      )
    );
  };

  const selectedOffer =
    specialOffers.find((offer) => offer.id === selectedOfferId) ?? null;
  const offerEligible =
    selectedOffer !== null &&
    cart !== null &&
    cart.totalPrice >= (selectedOffer.minOrderAmount ?? 0);
  const offerDiscountAmount = computeSingleOfferDiscount(selectedOffer);

  // Quy tắc: Chọn cái nào sau thì áp dụng cái đó (chọn Voucher sẽ bỏ chọn Khuyến mãi và ngược lại)
  const voucherDiscountAmount = appliedVoucher ? Number(appliedVoucher.discountAmount || 0) : 0;
  const hasEligibleOffer = Boolean(selectedOffer && offerEligible);

  const activeDiscountType: 'VOUCHER' | 'OFFER' | 'NONE' = appliedVoucher
    ? 'VOUCHER'
    : hasEligibleOffer
      ? 'OFFER'
      : 'NONE';

  const discountAmount =
    activeDiscountType === 'VOUCHER'
      ? voucherDiscountAmount
      : activeDiscountType === 'OFFER'
        ? offerDiscountAmount
        : 0;

  // Cảnh báo nếu Khuyến mãi đang chọn bị mất điều kiện khi tổng tiền giỏ hàng thay đổi
  useEffect(() => {
    if (!selectedOffer) {
      prevOfferEligibleRef.current = null;
      return;
    }
    if (prevOfferEligibleRef.current === true && !offerEligible && cart) {
      const missing = Math.max(0, (selectedOffer.minOrderAmount ?? 0) - cart.totalPrice);
      setDiscountChangeNotice({
        type: 'warning',
        text: `Khuyến mãi "${selectedOffer.title}" hiện không còn đủ điều kiện do tổng tiền hàng thay đổi (cần thêm ${formatCurrencyVND(missing)}).`,
      });
    }
    prevOfferEligibleRef.current = offerEligible;
  }, [selectedOffer, offerEligible, cart?.totalPrice]);

  // Tự động kiểm tra lại (re-validate) Voucher khi tổng tiền giỏ hàng thay đổi
  useEffect(() => {
    if (!appliedVoucher || !cart || cart.totalPrice <= 0) return;
    if (appliedVoucher.subtotal === cart.totalPrice) return;

    let active = true;
    const prevDiscount = Number(appliedVoucher.discountAmount || 0);
    const codeToCheck = appliedVoucher.code;

    voucherService
      .validateVoucher({
        code: codeToCheck,
        subtotal: cart.totalPrice,
      })
      .then((res) => {
        if (!active || !res.data) return;
        const nextResult = res.data;
        const nextDiscount = Number(nextResult.discountAmount || 0);
        setAppliedVoucher(nextResult);
        if (nextDiscount !== prevDiscount) {
          setDiscountChangeNotice({
            type: 'info',
            text: `Tổng tiền giỏ hàng thay đổi nên mức giảm của mã ${codeToCheck} đã được cập nhật từ ${formatCurrencyVND(
              prevDiscount
            )} thành ${formatCurrencyVND(nextDiscount)}.`,
          });
        }
      })
      .catch((err) => {
        if (!active) return;
        const msg = extractErrorMessage(
          err,
          `Mã ${codeToCheck} không còn đủ điều kiện áp dụng cho giỏ hàng hiện tại.`
        );
        setAppliedVoucher(null);
        setVoucherError(msg);
        setDiscountChangeNotice({
          type: 'error',
          text: `Voucher ${codeToCheck} đã bị gỡ tự động do giỏ hàng thay đổi: ${msg}`,
        });
      });

    return () => {
      active = false;
    };
  }, [cart?.totalPrice, appliedVoucher?.code, appliedVoucher?.subtotal]);

  const handleSelectOffer = (offer: SpecialOfferResponse) => {
    setDiscountChangeNotice(null);
    if (selectedOfferId === offer.id) {
      setSelectedOfferId('');
      return;
    }
    // Chọn Khuyến mãi sau -> áp dụng Khuyến mãi, gỡ Voucher đang chọn (nếu có)
    setSelectedOfferId(offer.id);
    if (appliedVoucher || voucherInput) {
      setAppliedVoucher(null);
      setVoucherInput('');
      setVoucherError('');
      setVoucherClaimNotice('');
    }
  };

  const applyVoucherCodeDirect = async (codeToApply: string) => {
    const cleanCode = codeToApply.trim().toUpperCase();
    if (!cleanCode) {
      setVoucherError('Vui lòng nhập mã voucher trước khi bấm Áp dụng.');
      return;
    }
    if (!cart || cart.totalPrice <= 0) {
      setVoucherError('Giỏ hàng trống, không thể áp dụng voucher.');
      return;
    }

    setVoucherInput(cleanCode);
    setVoucherLoading(true);
    setVoucherError('');
    setVoucherClaimNotice('');
    setDiscountChangeNotice(null);
    try {
      const res = await voucherService.validateVoucher({
        code: cleanCode,
        subtotal: cart.totalPrice,
      });
      if (res.data) {
        const resultData = res.data;
        // Chọn Voucher sau -> áp dụng Voucher, gỡ Khuyến mãi đang chọn (nếu có)
        setAppliedVoucher(resultData);
        setSelectedOfferId('');
        if (resultData.newlyClaimed) {
          setVoucherClaimNotice(
            `Đã tự động lưu mã ${resultData.code} vào Ví Voucher của bạn và áp dụng thành công!`
          );
        }
      }
    } catch (err) {
      const msg = extractErrorMessage(err, 'Mã giảm giá không tồn tại hoặc không hợp lệ.');
      if (msg.startsWith('Đã lưu mã')) {
        setVoucherClaimNotice(msg);
      } else {
        setVoucherError(msg);
      }
      setAppliedVoucher(null);
      throw err;
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleApplyVoucher = async () => {
    try {
      await applyVoucherCodeDirect(voucherInput);
    } catch {
      // Đã xử lý hiển thị lỗi tại voucherError
    }
  };

  useEffect(() => {
    const stateCode = (location.state as { voucherCode?: string } | null)?.voucherCode;
    if (stateCode && cart && cart.totalPrice > 0 && !appliedVoucher && !voucherInput) {
      void applyVoucherCodeDirect(stateCode).catch(() => {});
    }
  }, [location.state, cart?.totalPrice]);

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherInput('');
    setVoucherError('');
    setVoucherClaimNotice('');
  };

  const handlePlaceOrder = async () => {
    if (!user?.phone?.trim()) {
      setIsPhoneSetupModalOpen(true);
      setOrderError('');
      return;
    }
    if (typeof selectedAddressId !== 'number' || selectedAddressId <= 0) {
      setOrderError('Vui lòng chọn địa chỉ nhận hàng trước khi đặt mua.');
      return;
    }
    if (typeof selectedPaymentMethodId !== 'number' || selectedPaymentMethodId <= 0) {
      setOrderError('Vui lòng chọn phương thức thanh toán trước khi đặt mua.');
      return;
    }
    if (selectedOfferId !== '' && (!selectedOffer || !offerEligible)) {
      setOrderError('Ưu đãi đã chọn không còn phù hợp với đơn hàng. Vui lòng chọn lại.');
      return;
    }

    const selectedPaymentMethod = paymentMethods.find(
      (paymentMethod) => paymentMethod.id === selectedPaymentMethodId
    );
    if (!selectedPaymentMethod) {
      setOrderError('Phương thức thanh toán đã chọn không còn khả dụng. Vui lòng chọn lại.');
      return;
    }

    setOrderError('');
    const isVnPay = selectedPaymentMethod.code === 'FWDEMO1_VNPAY';
    const confirmationMessage = isVnPay
      ? `Bạn xác nhận đặt hàng và tiếp tục thanh toán qua VNPay?`
      : `Bạn xác nhận đặt hàng với phương thức "${selectedPaymentMethod.name}"?`;
    setOrderConfirmationMessage(confirmationMessage);
    setIsOrderConfirmOpen(true);
  };

  const confirmPlaceOrder = async () => {
    if (typeof selectedAddressId !== 'number' || selectedAddressId <= 0) return;
    if (typeof selectedPaymentMethodId !== 'number' || selectedPaymentMethodId <= 0) return;

    const selectedPaymentMethod = paymentMethods.find(
      (paymentMethod) => paymentMethod.id === selectedPaymentMethodId
    );
    if (!selectedPaymentMethod) return;

    const isVnPay = selectedPaymentMethod.code === 'FWDEMO1_VNPAY';
    setIsOrderConfirmOpen(false);
    setPlacingOrder(true);
    setOrderError('');
    try {
      const response = await orderService.createOrder({
        userAddressId: selectedAddressId,
        paymentMethodId: selectedPaymentMethodId,
        specialOfferId:
          activeDiscountType === 'OFFER' && selectedOfferId !== '' ? selectedOfferId : null,
        voucherCode:
          activeDiscountType === 'VOUCHER' && appliedVoucher ? appliedVoucher.code : undefined,
        notes: checkoutNotes.trim() || undefined,
      });
      await refresh();
      if (isVnPay) {
        const paymentUrl = getPaymentRedirectUrl(response.data?.paymentUrl);
        if (!paymentUrl) {
          setOrderCreatedWithoutPaymentUrl(true);
          setOrderError(
            'Đơn hàng đã được tạo nhưng backend không trả về paymentUrl hợp lệ. Không thể chuyển đến VNPay; vui lòng kiểm tra đơn hàng trước khi thử lại.'
          );
          return;
        }

        window.location.assign(paymentUrl);
        return;
      }

      navigate('/account/orders', {
        state: { orderPlacedSuccessfully: true },
        replace: true,
      });
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
              className="border-b border-line-light py-6"
              aria-labelledby="checkout-notes-heading"
            >
              <h2
                id="checkout-notes-heading"
                className="mb-4 text-md font-bold uppercase tracking-wide text-content-primary"
              >
                Ghi chú đơn hàng
              </h2>
              <Input
                id="checkout-notes"
                label="Ghi chú cho đơn hàng"
                name="notes"
                multiline
                rows={3}
                maxLength={255}
                value={checkoutNotes}
                onChange={(event) =>
                  setCheckoutNotes(event.target.value.slice(0, 255))
                }
                placeholder="Nhập ghi chú nếu bạn có yêu cầu thêm…"
                helperText={`${checkoutNotes.length}/255 ký tự`}
                className="[&_textarea]:resize-y"
              />
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
            {orderCreatedWithoutPaymentUrl && (
              <p className="mt-2 text-xs text-content-secondary">
                <Link to="/account/orders" className="underline underline-offset-2">
                  Xem đơn hàng của tôi
                </Link>
              </p>
            )}

            <Button
              type="button"
              size="lg"
              className="mt-5 w-full"
              loading={placingOrder}
              disabled={
                placingOrder ||
                orderCreatedWithoutPaymentUrl
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

            {/* Khối Voucher & Khuyến mãi tối giản: chọn cái nào sau sẽ tính cái đó */}
            <section
              className="border-t border-line-light py-3.5"
              aria-labelledby="checkout-promotions-heading"
            >
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Tag size={15} className="text-accent-gold" />
                  <h3
                    id="checkout-promotions-heading"
                    className="text-xs font-bold uppercase tracking-wider text-content-primary"
                  >
                    Voucher &amp; Khuyến mãi
                  </h3>
                </div>
                {discountAmount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-xs bg-status-success/15 px-1.5 py-0.5 text-[11px] font-bold text-status-success">
                    <CheckCircle2 size={11} />
                    −{formatCurrencyVND(discountAmount)}
                  </span>
                )}
              </div>

              {/* Thông báo gọn khi giỏ hàng thay đổi làm ảnh hưởng tới Voucher/Khuyến mãi */}
              {discountChangeNotice && (
                <div
                  role="alert"
                  className={`mb-2.5 flex items-start justify-between gap-2 rounded-input border px-2.5 py-1.5 text-[11px] leading-snug ${
                    discountChangeNotice.type === 'error'
                      ? 'border-status-error/40 bg-status-error/10 text-status-error'
                      : discountChangeNotice.type === 'warning'
                        ? 'border-amber-300 bg-amber-50 text-amber-900'
                        : 'border-blue-200 bg-blue-50/80 text-blue-900'
                  }`}
                >
                  <div className="flex items-start gap-1.5">
                    <AlertCircle size={13} className="mt-0.5 shrink-0" />
                    <span>{discountChangeNotice.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDiscountChangeNotice(null)}
                    aria-label="Đóng thông báo"
                    className="shrink-0 opacity-70 hover:opacity-100"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              <div className="space-y-2.5">
                {/* 1. VOUCHER: Luôn cố định 1 thanh cao 36px (h-9) */}
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <label
                      htmlFor="checkout-voucher-code"
                      className="font-semibold text-content-primary"
                    >
                      Mã giảm giá (Voucher)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsVoucherDrawerOpen(true)}
                      className="inline-flex items-center gap-1 font-bold text-primary transition-colors hover:text-accent-gold"
                    >
                      <Ticket size={13} />
                      <span>Chọn từ Ví / Kho</span>
                    </button>
                  </div>

                  {appliedVoucher &&
                  (!voucherInput.trim() ||
                    voucherInput.trim().toUpperCase() === appliedVoucher.code.toUpperCase()) ? (
                    <div className="flex h-9 items-center justify-between gap-2 rounded-input border border-status-success/40 bg-status-success/10 px-2.5 text-xs">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Ticket size={13} className="shrink-0 text-status-success" />
                        <span className="font-mono font-extrabold text-content-primary">
                          {appliedVoucher.code}
                        </span>
                        <span className="shrink-0 font-bold text-status-success">
                          (−{formatCurrencyVND(appliedVoucher.discountAmount)})
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setIsVoucherDrawerOpen(true)}
                          className="font-bold text-primary underline"
                        >
                          Đổi
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveVoucher}
                          aria-label="Gỡ mã voucher"
                          className="text-content-muted hover:text-status-error"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-9 gap-1.5">
                      <div className="relative flex-1">
                        <input
                          id="checkout-voucher-code"
                          type="text"
                          placeholder="Nhập mã voucher…"
                          value={voucherInput}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setVoucherInput(val);
                            if (voucherError) setVoucherError('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void handleApplyVoucher();
                            }
                          }}
                          className="h-9 w-full rounded-input border border-line bg-surface-body py-1 pl-2.5 pr-7 text-xs text-content-primary placeholder:text-content-muted focus:border-line-focus focus:outline-none"
                        />
                        {voucherInput.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (appliedVoucher) {
                                setVoucherInput(appliedVoucher.code);
                              } else {
                                handleRemoveVoucher();
                              }
                            }}
                            aria-label="Xóa chữ đang nhập"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={voucherLoading}
                        disabled={!voucherInput.trim()}
                        onClick={() => void handleApplyVoucher()}
                        className="h-9 px-3 text-xs"
                      >
                        Áp dụng
                      </Button>
                    </div>
                  )}

                  {appliedVoucher &&
                    voucherInput.trim().length > 0 &&
                    voucherInput.trim().toUpperCase() !== appliedVoucher.code.toUpperCase() && (
                      <p className="mt-1 flex items-center justify-between gap-2 text-[11px] text-amber-700">
                        <span>
                          Đang giữ mã <strong>{appliedVoucher.code}</strong>. Bấm Áp dụng để đổi mã.
                        </span>
                        <button
                          type="button"
                          onClick={() => setVoucherInput(appliedVoucher.code)}
                          className="shrink-0 font-semibold underline"
                        >
                          Hủy
                        </button>
                      </p>
                    )}

                  {voucherError && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-status-error" role="alert">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>{voucherError}</span>
                    </p>
                  )}

                  {voucherClaimNotice && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-status-success" role="status">
                      <CheckCircle2 size={12} className="shrink-0" />
                      <span>{voucherClaimNotice}</span>
                    </p>
                  )}
                </div>

                {/* 2. ƯU ĐÃI ĐƠN HÀNG: Luôn cố định 1 thanh cao 36px (h-9) và mở menu nổi (Popover) */}
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-content-primary">
                      Ưu đãi đơn hàng (Khuyến mãi)
                    </span>
                    {selectedOffer && (
                      <button
                        type="button"
                        onClick={() => setSelectedOfferId('')}
                        className="text-[11px] font-semibold text-content-muted underline hover:text-status-error"
                      >
                        Bỏ chọn
                      </button>
                    )}
                  </div>

                  <div ref={offerSelectorRef} className="relative w-full">
                    <button
                      type="button"
                      disabled={specialOfferLoading || specialOffers.length === 0}
                      aria-expanded={isOfferMenuOpen}
                      onClick={() => setIsOfferMenuOpen((prev) => !prev)}
                      className={`flex h-9 w-full items-center justify-between gap-2 rounded-input border px-2.5 text-left text-xs transition-colors focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-content-disabled ${
                        selectedOffer
                          ? 'border-status-success/40 bg-status-success/10 text-content-primary'
                          : 'border-line bg-surface-body text-content-secondary hover:border-line-focus hover:text-content-primary'
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        {selectedOffer ? (
                          <>
                            <Sparkles size={13} className="shrink-0 text-status-success" />
                            <span className="truncate font-bold text-content-primary">
                              {selectedOffer.title}
                            </span>
                            {offerEligible ? (
                              <span className="shrink-0 font-bold text-status-success">
                                (−{formatCurrencyVND(offerDiscountAmount)})
                              </span>
                            ) : (
                              <span className="shrink-0 text-[10px] font-semibold text-status-error">
                                (Chưa đủ ĐK)
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="truncate">
                            {specialOfferLoading
                              ? 'Đang tải ưu đãi…'
                              : specialOffers.length > 0
                                ? 'Chọn ưu đãi đơn hàng'
                                : 'Không có ưu đãi khả dụng'}
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        size={14}
                        className={`shrink-0 text-content-muted transition-transform ${
                          isOfferMenuOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Menu nổi (Popover) hiển thị đè lên trên, không đẩy chiều cao trang */}
                    {isOfferMenuOpen && specialOffers.length > 0 && (
                      <div
                        role="group"
                        aria-label="Danh sách ưu đãi đơn hàng"
                        className="absolute left-0 right-0 z-30 mt-1 max-h-60 divide-y divide-line-light overflow-y-auto rounded-input border border-line bg-surface-body shadow-lg"
                      >
                        {specialOffers.map((offer) => {
                          const minOrder = offer.minOrderAmount ?? 0;
                          const eligible = cart.totalPrice >= minOrder;
                          const isSelected = selectedOfferId === offer.id;
                          const actualDiscount = computeSingleOfferDiscount(offer);
                          const missingAmount = Math.max(0, minOrder - cart.totalPrice);

                          return (
                            <div
                              key={offer.id}
                              className={`flex items-center justify-between gap-2.5 px-3 py-2 text-xs transition-colors ${
                                isSelected
                                  ? 'bg-status-success/10'
                                  : eligible
                                    ? 'hover:bg-surface'
                                    : 'bg-surface/40 opacity-75'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-bold text-content-primary">
                                    {offer.title}
                                  </span>
                                  {eligible ? (
                                    <span className="font-bold text-status-success">
                                      (−{formatCurrencyVND(actualDiscount)})
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-medium text-amber-700">
                                      (Thiếu {formatCurrencyVND(missingAmount)})
                                    </span>
                                  )}
                                </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-content-muted">
                                  <span>
                                    {minOrder > 0
                                      ? `Đơn từ ${formatCurrencyVND(minOrder)}`
                                      : 'Không giới hạn đơn tối thiểu'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDetailOffer(offer);
                                      setIsOfferMenuOpen(false);
                                    }}
                                    className="underline hover:text-content-primary"
                                  >
                                    Chi tiết
                                  </button>
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-1.5">
                                {isSelected ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedOfferId('');
                                      setIsOfferMenuOpen(false);
                                    }}
                                    className="rounded-xs border border-line bg-surface px-2 py-1 text-[11px] font-semibold text-content-secondary hover:border-status-error hover:text-status-error"
                                  >
                                    Bỏ chọn
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={!eligible}
                                    onClick={() => {
                                      handleSelectOffer(offer);
                                      setIsOfferMenuOpen(false);
                                    }}
                                    className={`rounded-xs px-2.5 py-1 text-[11px] font-bold transition-colors ${
                                      eligible
                                        ? 'bg-primary text-content-inverse hover:opacity-90'
                                        : 'cursor-not-allowed bg-surface-disabled text-content-disabled'
                                    }`}
                                  >
                                    {eligible ? 'Chọn' : 'Chưa đủ'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {specialOfferError && (
                    <p className="mt-1 text-[11px] text-status-error">
                      {specialOfferError}{' '}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => {
                          setSpecialOfferLoading(true);
                          setSpecialOfferError('');
                          setSpecialOfferRetry((v) => v + 1);
                        }}
                      >
                        Thử lại
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </section>

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

              {discountAmount > 0 && (
                <div className="flex justify-between gap-3 py-2 text-sm text-content-secondary">
                  <span className="min-w-0 flex-1">
                    Giảm giá{' '}
                    {activeDiscountType === 'VOUCHER' && appliedVoucher ? (
                      <span className="font-medium text-content-primary">
                        (Voucher: {appliedVoucher.code})
                      </span>
                    ) : activeDiscountType === 'OFFER' && selectedOffer ? (
                      <span className="font-medium text-content-primary">
                        (Khuyến mãi: {selectedOffer.title})
                      </span>
                    ) : null}
                  </span>
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
                <span>Tổng tạm tính</span>
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
                  Vui lòng chọn địa chỉ nhận hàng và thiết lập số điện thoại để tính phí vận chuyển.
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
      <Modal
        isOpen={isOrderConfirmOpen}
        onClose={() => {
          if (!placingOrder) setIsOrderConfirmOpen(false);
        }}
        title="Xác nhận thanh toán"
        maxWidth="520px"
      >
        <div className="flex flex-col gap-5">
          <p className="text-center text-sm leading-relaxed text-content-secondary">
            {orderConfirmationMessage}
          </p>
          <div className="flex justify-center gap-3 border-t border-line-light pt-4">
            <Button
              type="button"
              variant="danger"
              onClick={() => setIsOrderConfirmOpen(false)}
              disabled={placingOrder}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
              loading={placingOrder}
              onClick={() => void confirmPlaceOrder()}
            >
              Xác nhận
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={isPhoneSetupModalOpen}
        onClose={() => setIsPhoneSetupModalOpen(false)}
        title="Thiết lập số điện thoại"
        maxWidth="520px"
      >
        <div className="flex flex-col gap-5">
          <p className="text-center text-sm leading-relaxed text-content-secondary">
            Hãy thiết lập số điện thoại ở profile trước khi thực hiện thanh toán để đảm bảo thông tin liên lạc và nhận thông báo về đơn hàng.
          </p>
          <div className="flex justify-center border-t border-line-light pt-4">
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setIsPhoneSetupModalOpen(false);
                navigate('/account/profile');
              }}
            >
              Thiết lập số điện thoại
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={detailOffer !== null}
        onClose={() => setDetailOffer(null)}
        title="Chi tiết điều lệ & điều kiện khuyến mãi"
        maxWidth="540px"
      >
        {detailOffer && (() => {
          const isPercent = isPercentageOffer(detailOffer);
          const minOrder = detailOffer.minOrderAmount ?? 0;
          const isEligible = cart ? cart.totalPrice >= minOrder : false;
          const formatOfferDate = (iso?: string) => {
            if (!iso) return 'Đang cập nhật';
            const d = new Date(iso);
            if (isNaN(d.getTime())) return iso;
            return new Intl.DateTimeFormat('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }).format(d);
          };

          return (
            <div className="flex flex-col gap-4 text-sm">
              <div className="rounded-input border border-line-light bg-surface p-3.5">
                <h4 className="text-base font-bold text-content-primary">
                  {detailOffer.title}
                </h4>
                <p className="mt-1 text-xs font-semibold text-status-success">
                  {isPercent
                    ? `Giảm ${detailOffer.discountPercent ?? 0}% giá trị đơn hàng${
                        detailOffer.maxDiscountAmount
                          ? ` (Tối đa ${formatCurrencyVND(detailOffer.maxDiscountAmount)})`
                          : ''
                      }`
                    : `Giảm trực tiếp ${formatCurrencyVND(detailOffer.discountAmount ?? 0)}`}
                </p>
              </div>

              <div className="space-y-2.5 text-xs text-content-secondary">
                <div className="flex justify-between gap-3 border-b border-line-light pb-2">
                  <span className="text-content-muted">Phạm vi áp dụng:</span>
                  <strong className="text-right text-content-primary">
                    Khuyến mãi trên tổng giá trị hóa đơn
                  </strong>
                </div>

                <div className="flex justify-between gap-3 border-b border-line-light pb-2">
                  <span className="text-content-muted">Đơn hàng tối thiểu:</span>
                  <strong className="text-right text-content-primary">
                    {minOrder > 0
                      ? `Từ ${formatCurrencyVND(minOrder)}`
                      : 'Không yêu cầu giá trị tối thiểu (0 ₫)'}
                  </strong>
                </div>

                {detailOffer.maxDiscountAmount != null && detailOffer.maxDiscountAmount > 0 && (
                  <div className="flex justify-between gap-3 border-b border-line-light pb-2">
                    <span className="text-content-muted">Mức giảm tối đa:</span>
                    <strong className="text-right text-content-primary">
                      {formatCurrencyVND(detailOffer.maxDiscountAmount)}
                    </strong>
                  </div>
                )}

                <div className="flex justify-between gap-3 border-b border-line-light pb-2">
                  <span className="text-content-muted">Thời gian bắt đầu:</span>
                  <strong className="text-right text-content-primary">
                    {formatOfferDate(detailOffer.startDate)}
                  </strong>
                </div>

                <div className="flex justify-between gap-3 border-b border-line-light pb-2">
                  <span className="text-content-muted">Thời gian kết thúc:</span>
                  <strong className="text-right text-content-primary">
                    {formatOfferDate(detailOffer.endDate)}
                  </strong>
                </div>

                <div className="flex justify-between gap-3 border-b border-line-light pb-2">
                  <span className="text-content-muted">Trạng thái đơn hiện tại:</span>
                  {isEligible ? (
                    <strong className="text-right text-status-success">
                      Đủ điều kiện áp dụng
                    </strong>
                  ) : (
                    <strong className="text-right text-status-error">
                      Chưa đủ điều kiện (Cần thêm{' '}
                      {formatCurrencyVND(Math.max(0, minOrder - (cart?.totalPrice ?? 0)))})
                    </strong>
                  )}
                </div>
              </div>

              <div className="rounded-input border border-line-light bg-surface p-3 text-xs text-content-secondary">
                <p className="mb-1.5 font-semibold text-content-primary">
                  Điều lệ &amp; điều kiện chương trình:
                </p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    Áp dụng cho các đơn hàng thỏa mãn điều kiện giá trị tiền hàng tối thiểu (chưa
                    bao gồm phí vận chuyển) trong thời gian hiệu lực của chương trình.
                  </li>
                  <li>
                    Mỗi đơn hàng chỉ được chọn 01 chương trình khuyến mãi hóa đơn tại một thời điểm.
                  </li>
                  <li>
                    Không áp dụng cộng dồn đồng thời với Mã giảm giá (Voucher); nếu bạn chọn ưu đãi
                    khác sau đó, hệ thống sẽ áp dụng theo lựa chọn mới nhất.
                  </li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 border-t border-line-light pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDetailOffer(null)}
                >
                  Đóng
                </Button>
                {isEligible && selectedOfferId !== detailOffer.id && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      handleSelectOffer(detailOffer);
                      setDetailOffer(null);
                    }}
                  >
                    Chọn khuyến mãi này
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      <VoucherPickerDrawer
        isOpen={isVoucherDrawerOpen}
        onClose={() => setIsVoucherDrawerOpen(false)}
        subtotal={cart?.totalPrice ?? 0}
        appliedCode={appliedVoucher?.code ?? null}
        onSelectVoucher={applyVoucherCodeDirect}
        onRemoveVoucher={handleRemoveVoucher}
      />
    </div>
  );
}
