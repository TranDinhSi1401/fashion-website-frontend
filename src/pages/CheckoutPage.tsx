import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, ShoppingBag, ChevronDown, Ticket, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { userService } from '../services/userService';
import { orderService } from '../services/orderService';
import { shippingService, ShippingOrderPreview } from '../services/shippingService';
import { paymentMethodService, PaymentMethodResponse } from '../services/paymentMethodService';
import { specialOfferService, SpecialOfferResponse } from '../services/specialOfferService';
import { voucherService } from '../services/voucherService';
import { VoucherCalculationResult, VoucherResponse } from '../types/voucher';
import { UserAddressResponse } from '../types/user';
import { extractErrorMessage, formatCurrencyVND } from '../utils/format';
import Breadcrumb from '../components/layout/Breadcrumb';
import AddressFormModal from '../components/profile/AddressFormModal';
import VoucherPickerDrawer, { estimateVoucherDiscount } from '../components/voucher/VoucherPickerDrawer';
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

  // Voucher states
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherCalculationResult | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState('');
  const [voucherClaimNotice, setVoucherClaimNotice] = useState('');
  const [isVoucherDrawerOpen, setIsVoucherDrawerOpen] = useState(false);
  const [quickVouchers, setQuickVouchers] = useState<VoucherResponse[]>([]);
  const [detailOffer, setDetailOffer] = useState<SpecialOfferResponse | null>(null);
  const offerSelectorRef = useRef<HTMLDivElement>(null);
  const offerTriggerRef = useRef<HTMLButtonElement>(null);
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
        offerTriggerRef.current?.focus();
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

  // Khi người dùng chọn cả Khuyến mãi (Ưu đãi) và Voucher: chỉ áp dụng 1 phần có mức giảm giá cao hơn
  const voucherDiscountAmount = appliedVoucher ? Number(appliedVoucher.discountAmount || 0) : 0;
  const hasEligibleOffer = Boolean(selectedOffer && offerEligible);
  const activeDiscountType: 'VOUCHER' | 'OFFER' | 'NONE' =
    appliedVoucher && hasEligibleOffer
      ? voucherDiscountAmount >= offerDiscountAmount
        ? 'VOUCHER'
        : 'OFFER'
      : appliedVoucher
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

  // Nếu phần được quyết định chọn là Khuyến mãi thì phần chữ của Voucher sẽ mờ đi
  const isVoucherDimmed = activeDiscountType === 'OFFER';

  // Nếu phần được quyết định chọn là Voucher thì Khuyến mãi sẽ không còn được chọn nữa
  useEffect(() => {
    if (activeDiscountType === 'VOUCHER' && selectedOfferId !== '') {
      setSelectedOfferId('');
    }
  }, [activeDiscountType, selectedOfferId]);

  const handleSelectOffer = (offer: SpecialOfferResponse) => {
    const candidateDiscount = computeSingleOfferDiscount(offer);
    if (appliedVoucher && voucherDiscountAmount >= candidateDiscount) {
      // Voucher có mức giảm cao hơn nên Voucher được chọn, Khuyến mãi không còn được chọn
      setSelectedOfferId('');
    } else {
      setSelectedOfferId(offer.id);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      voucherService.getAvailableVouchers(),
      voucherService.getMyVouchers(),
    ]).then(([availRes, myRes]) => {
      if (!active) return;
      const map = new Map<number, VoucherResponse>();
      if (myRes.status === 'fulfilled' && Array.isArray(myRes.value.data)) {
        myRes.value.data.forEach((v) => map.set(v.id, { ...v, isClaimed: true }));
      }
      if (availRes.status === 'fulfilled' && Array.isArray(availRes.value.data)) {
        availRes.value.data.forEach((v) => {
          const ex = map.get(v.id);
          map.set(v.id, { ...v, isClaimed: Boolean(v.isClaimed || ex?.isClaimed) });
        });
      }
      setQuickVouchers(Array.from(map.values()));
    });
    return () => {
      active = false;
    };
  }, []);

  const applyVoucherCodeDirect = async (codeToApply: string) => {
    const cleanCode = codeToApply.trim().toUpperCase();
    if (!cleanCode) {
      setVoucherError('Vui lòng nhập mã voucher');
      return;
    }
    if (!cart || cart.totalPrice <= 0) {
      setVoucherError('Giỏ hàng trống');
      return;
    }

    setVoucherInput(cleanCode);
    setVoucherLoading(true);
    setVoucherError('');
    setVoucherClaimNotice('');
    try {
      const res = await voucherService.validateVoucher({
        code: cleanCode,
        subtotal: cart.totalPrice,
      });
      if (res.data) {
        const resultData = res.data;
        setAppliedVoucher(resultData);
        setQuickVouchers((prev) =>
          prev.map((v) =>
            v.id === resultData.voucherId || v.code.toUpperCase() === resultData.code.toUpperCase()
              ? { ...v, isClaimed: true }
              : v
          )
        );
        if (resultData.newlyClaimed) {
          setVoucherClaimNotice(
            `Đã tự động lưu mã ${resultData.code} vào Ví Voucher của bạn và áp dụng thành công!`
          );
        }
        const newVoucherDisc = Number(resultData.discountAmount || 0);
        if (hasEligibleOffer && newVoucherDisc >= offerDiscountAmount) {
          // Nếu Voucher có mức giảm cao hơn thì Khuyến mãi đang chọn sẽ bị bỏ chọn
          setSelectedOfferId('');
        }
      }
    } catch (err) {
      const msg = extractErrorMessage(err, 'Mã giảm giá không tồn tại');
      if (msg.startsWith('Đã lưu mã')) {
        setVoucherClaimNotice(msg);
        setQuickVouchers((prev) =>
          prev.map((v) =>
            v.code.toUpperCase() === cleanCode ? { ...v, isClaimed: true } : v
          )
        );
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

  const eligibleVouchersCount = cart
    ? quickVouchers.filter((v) => {
        const minOrder = Number(v.minOrderAmount || 0);
        const hasStock = (v.remainingQuantity ?? v.totalQuantity - v.usedQuantity) > 0;
        const hasQuota = v.remainingUserUses == null || v.remainingUserUses > 0;
        const validFlag = v.isValid ?? (v as unknown as { valid?: boolean }).valid ?? true;
        return Boolean(v.isClaimed) && validFlag && cart.totalPrice >= minOrder && hasStock && hasQuota;
      }).length
    : 0;

  const bestPossibleVoucherDiscount = cart
    ? quickVouchers.reduce((max, v) => {
        const minOrder = Number(v.minOrderAmount || 0);
        const hasStock = (v.remainingQuantity ?? v.totalQuantity - v.usedQuantity) > 0;
        const hasQuota = v.remainingUserUses == null || v.remainingUserUses > 0;
        const validFlag = v.isValid ?? (v as unknown as { valid?: boolean }).valid ?? true;
        if (!v.isClaimed || !validFlag || cart.totalPrice < minOrder || !hasStock || !hasQuota) return max;
        return Math.max(max, estimateVoucherDiscount(v, cart.totalPrice));
      }, 0)
    : 0;

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

            {/* Nhập mã Voucher & Chọn từ Ví / Kho Voucher */}
            <div className="border-t border-line-light py-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label
                  htmlFor="checkout-voucher-code"
                  className={`block text-sm font-semibold transition-opacity ${
                    isVoucherDimmed
                      ? 'text-content-muted opacity-50'
                      : 'text-content-primary'
                  }`}
                >
                  Mã giảm giá (Voucher)
                </label>

                <button
                  type="button"
                  onClick={() => setIsVoucherDrawerOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-accent-gold transition-colors"
                >
                  <Ticket size={14} />
                  <span>Chọn từ Ví / Kho Voucher</span>
                  {eligibleVouchersCount > 0 && (
                    <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-bold text-content-inverse">
                      {eligibleVouchersCount}
                    </span>
                  )}
                </button>
              </div>

              <div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="checkout-voucher-code"
                      type="text"
                      placeholder="Nhập mã voucher (VD: WELCOME50K)"
                      value={voucherInput}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setVoucherInput(val);
                        if (voucherError) setVoucherError('');
                        if (appliedVoucher && val.trim() !== appliedVoucher.code) {
                          setAppliedVoucher(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleApplyVoucher();
                        }
                      }}
                      className={`min-h-10 w-full rounded-input border border-line bg-surface-body py-2 pl-3 pr-9 text-sm placeholder:text-content-muted focus:border-line-focus focus:outline-none transition-opacity ${
                        isVoucherDimmed
                          ? 'text-content-muted opacity-45'
                          : 'text-content-primary'
                      }`}
                    />
                    {(voucherInput.length > 0 || appliedVoucher) && (
                      <button
                        type="button"
                        onClick={handleRemoveVoucher}
                        title="Xóa trắng mã voucher"
                        aria-label="Xóa trắng mã voucher"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-content-muted transition-colors hover:bg-surface hover:text-content-primary"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    loading={voucherLoading}
                    onClick={() => void handleApplyVoucher()}
                  >
                    Áp dụng
                  </Button>
                </div>

                {voucherError && (
                  <p className="mt-1.5 text-xs text-status-error" role="alert">
                    {voucherError}
                  </p>
                )}

                {voucherClaimNotice && (
                  <p
                    className="mt-1.5 rounded-input border border-status-success/40 bg-status-success/10 px-2.5 py-1.5 text-xs font-medium text-status-success"
                    role="status"
                  >
                    {voucherClaimNotice}
                  </p>
                )}

                {appliedVoucher && (
                  <div className="mt-2.5 flex items-center justify-between gap-2 rounded-input border border-status-success/40 bg-status-success/10 px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <span className="font-bold text-content-primary">
                        Đã áp dụng: {appliedVoucher.code}
                      </span>
                      <span className="ml-1.5 font-semibold text-status-success">
                        (−{formatCurrencyVND(appliedVoucher.discountAmount)})
                      </span>
                      <p className="truncate text-[11px] text-content-secondary">
                        {appliedVoucher.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsVoucherDrawerOpen(true)}
                      className="shrink-0 font-bold text-primary underline"
                    >
                      Đổi mã
                    </button>
                  </div>
                )}

                {!appliedVoucher && eligibleVouchersCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsVoucherDrawerOpen(true)}
                    className="mt-2.5 flex w-full items-center justify-between gap-2 rounded-input border border-dashed border-accent-gold/60 bg-accent-gold/10 px-3 py-2 text-left text-xs transition-colors hover:bg-accent-gold/15"
                  >
                    <span className="text-content-primary">
                      Có <strong>{eligibleVouchersCount} voucher</strong> đủ điều kiện
                      {bestPossibleVoucherDiscount > 0
                        ? ` (giảm tới ${formatCurrencyVND(bestPossibleVoucherDiscount)})`
                        : ''}
                    </span>
                    <span className="shrink-0 font-bold text-primary underline">
                      Chọn ngay →
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="border-t border-line-light py-4">
              <div className="flex w-full flex-col">
                <label
                  htmlFor="checkout-special-offer"
                  className="mb-1.5 text-sm font-semibold text-content-primary"
                >
                  Ưu đãi
                </label>
                <div ref={offerSelectorRef} className="relative w-full">
                  <button
                    ref={offerTriggerRef}
                    id="checkout-special-offer"
                    type="button"
                    aria-expanded={isOfferMenuOpen}
                    aria-controls="checkout-special-offer-options"
                    disabled={specialOfferLoading || specialOffers.length === 0}
                    onClick={() => setIsOfferMenuOpen((isOpen) => !isOpen)}
                    className="flex min-h-10 w-full items-center justify-between gap-2 rounded-input border border-line bg-surface-body px-3 py-2 text-left text-sm text-content-primary hover:border-line-focus focus:border-line-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-line-focus disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-content-disabled"
                  >
                    <span className="min-w-0 flex-1 whitespace-normal break-words [overflow-wrap:anywhere]">
                      {specialOfferLoading ? (
                        'Đang tải ưu đãi…'
                      ) : selectedOffer ? (
                        selectedOffer.title
                      ) : specialOffers.length > 0 ? (
                        'Chọn ưu đãi'
                      ) : (
                        'Không có ưu đãi khả dụng'
                      )}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-content-muted transition-transform ${
                        isOfferMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOfferMenuOpen && (
                    <div
                      id="checkout-special-offer-options"
                      role="group"
                      aria-label="Danh sách ưu đãi đơn hàng"
                      className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-input border border-line bg-surface-body shadow-lg"
                    >
                      {specialOffers.map((offer) => {
                        const eligible =
                          cart.totalPrice >= (offer.minOrderAmount ?? 0);
                        const isSelected = selectedOfferId === offer.id;
                        return (
                          <div
                            key={offer.id}
                            className="flex items-center justify-between gap-3 border-b border-line-light px-3 py-2.5 last:border-b-0 hover:bg-surface"
                          >
                            <button
                              type="button"
                              onClick={() => setDetailOffer(offer)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <span
                                className={`block whitespace-normal break-words text-sm font-medium [overflow-wrap:anywhere] hover:underline ${
                                  eligible
                                    ? 'text-content-primary'
                                    : 'text-content-secondary'
                                }`}
                              >
                                {offer.title}
                              </span>
                              <span className="mt-0.5 block text-xs text-content-secondary">
                                {isPercentageOffer(offer)
                                  ? `Giảm ${offer.discountPercent ?? 0}%${
                                      offer.maxDiscountAmount
                                        ? ` (tối đa ${formatCurrencyVND(offer.maxDiscountAmount)})`
                                        : ''
                                    }`
                                  : `Giảm ${formatCurrencyVND(offer.discountAmount ?? 0)}`}
                                {offer.minOrderAmount && offer.minOrderAmount > 0
                                  ? ` • Đơn tối thiểu ${formatCurrencyVND(offer.minOrderAmount)}`
                                  : ' • Không giới hạn đơn tối thiểu'}
                              </span>
                              <span className="mt-1 inline-block text-[11px] text-content-muted underline">
                                Xem chi tiết điều lệ &amp; điều kiện
                              </span>
                            </button>

                            <label
                              className={`flex shrink-0 items-center pl-2 ${
                                eligible
                                  ? 'cursor-pointer'
                                  : 'cursor-not-allowed opacity-50'
                              }`}
                              title={
                                eligible
                                  ? 'Chọn áp dụng khuyến mãi này'
                                  : `Đơn tối thiểu ${formatCurrencyVND(offer.minOrderAmount)}`
                              }
                            >
                              <input
                                type="radio"
                                name="checkout-special-offer-radio"
                                checked={isSelected}
                                disabled={!eligible}
                                onChange={() => {
                                  if (eligible) {
                                    handleSelectOffer(offer);
                                  }
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (eligible && isSelected) {
                                    setSelectedOfferId('');
                                  }
                                }}
                                className="h-4 w-4 accent-primary"
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

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
                    Không áp dụng cộng dồn đồng thời với Mã giảm giá (Voucher); nếu chọn cả hai, hệ
                    thống sẽ chỉ tính 01 ưu đãi có mức giảm giá cao hơn.
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
