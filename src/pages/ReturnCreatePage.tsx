/**
 * Trang tạo yêu cầu trả hàng mới dành cho Khách hàng (Return Create Page - C2).
 * Địa chỉ route: /account/returns/new (nhận query parameter ?orderId=<id> hoặc state.order).
 * Cho phép chọn sản phẩm cần trả, lý do trả, tải lên từ 1 đến 5 ảnh minh chứng (bắt buộc khi lỗi/giao sai)
 * và thông tin ngân hàng tùy chọn để nhận tiền hoàn.
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  RotateCcw,
  Package,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { orderService } from '../services/orderService';
import { returnService } from '../services/returnService';
import { userService } from '../services/userService';
import type { OrderWithItems, OrderItemResponse } from '../types/order';
import type { UserAddressResponse } from '../types/user';
import type { ReturnReason } from '../types/return';
import { RETURN_REASON_OPTIONS } from '../constants/returnMeta';
import {
  isOrderEligibleForReturn,
  validateReturnImageFiles,
  buildCreateReturnPayload,
  sanitizeBankAccountNumberInput,
  normalizeBankAccountHolderInput,
  validateRequiredBankInfo,
  getBankAccountHint,
  getRealtimeBankAccountError,
  validateBankAccountNumberForBank,
  isValidPickupPhone,
  formatVND,
} from '../utils/returnHelpers';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import QuantityStepper from '../components/ui/QuantityStepper';
import ReturnImageUploader from '../components/returns/ReturnImageUploader';
import BankSelect from '../components/returns/BankSelect';
import { cn } from '../utils/cn';

/**
 * Interface lưu trữ trạng thái chọn từng món hàng cần trả.
 */
interface SelectedItemState {
  selected: boolean;
  quantity: number;
}

/**
 * Chức năng: Màn hình tạo mới phiếu yêu cầu trả hàng và hoàn tiền (C2).
 *
 * @returns Đầu ra: Thẻ JSX toàn màn hình tạo phiếu.
 */
export default function ReturnCreatePage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderWithItems | null>(
    (location.state as { order?: OrderWithItems })?.order || null
  );
  const [isLoadingOrder, setIsLoadingOrder] = useState<boolean>(!order);
  const [orderError, setOrderError] = useState<string>('');

  // Form state
  const [selectedItems, setSelectedItems] = useState<Record<number, SelectedItemState>>({});
  const [reason, setReason] = useState<ReturnReason>('DEFECTIVE');
  const [reasonDetail, setReasonDetail] = useState<string>('');
  const [images, setImages] = useState<File[]>([]);
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');

  // Thông tin địa chỉ & liên hệ lấy hàng chiều hoàn (GHN)
  const [addresses, setAddresses] = useState<UserAddressResponse[]>([]);
  const [addressesLoadFailed, setAddressesLoadFailed] = useState<boolean>(false);
  const [pickupAddressId, setPickupAddressId] = useState<string>('');
  const [pickupContactName, setPickupContactName] = useState<string>(
    () => (location.state as { order?: OrderWithItems })?.order?.shippingRecipientName || ''
  );
  const [pickupPhone, setPickupPhone] = useState<string>(
    () => (location.state as { order?: OrderWithItems })?.order?.shippingPhone || ''
  );
  const [isSelfDropOff, setIsSelfDropOff] = useState<boolean>(false);
  const [agreedPolicy, setAgreedPolicy] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<{
    items?: string;
    reasonDetail?: string;
    images?: string;
    pickupContactName?: string;
    pickupPhone?: string;
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
  }>({});

  // Tải sổ địa chỉ của khách hàng để chọn nơi shipper GHN tới lấy hàng
  useEffect(() => {
    let isMounted = true;
    userService
      .getAddresses()
      .then((res) => {
        if (isMounted && Array.isArray(res?.data)) {
          setAddresses(res.data);
          setAddressesLoadFailed(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAddressesLoadFailed(true);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Nếu đơn được truyền qua router state chưa có remainingReturnableQuantity từ API mới, gọi lại GET /orders/my-orders/{id} để đồng bộ chính xác
  useEffect(() => {
    if (!order?.id) return;
    const missingRemainingField = (order.orderItems || []).some(
      (it) => typeof it.remainingReturnableQuantity !== 'number'
    );
    if (!missingRemainingField) return;
    let isMounted = true;
    orderService
      .getMyOrderById(order.id)
      .then((freshOrder) => {
        if (isMounted && freshOrder) {
          setOrder(freshOrder);
        }
      })
      .catch(() => {
        // Giữ nguyên dữ liệu hiện có nếu không gọi được API lẻ
      });
    return () => {
      isMounted = false;
    };
  }, [order?.id]);

  // Nếu không có state truyền từ C1, đọc orderId từ query param và gọi API lấy chi tiết đơn
  useEffect(() => {
    if (order) {
      // Khởi tạo trạng thái chọn sản phẩm: mặc định bỏ chọn và đặt số lượng khởi điểm = 1 để không tạo nhầm trả toàn bộ đơn
      const initSelected: Record<number, SelectedItemState> = {};
      (order.orderItems || []).forEach((item: OrderItemResponse) => {
        initSelected[item.id] = {
          selected: false,
          quantity: 1,
        };
      });
      setSelectedItems(initSelected);
      return;
    }

    const queryParams = new URLSearchParams(location.search);
    const orderIdParam = queryParams.get('orderId');

    if (!orderIdParam) {
      setOrderError('Thiếu mã định danh đơn hàng cần trả. Vui lòng chọn từ danh sách đơn hàng của bạn.');
      setIsLoadingOrder(false);
      return;
    }

    const orderIdNum = Number(orderIdParam);
    if (isNaN(orderIdNum) || orderIdNum <= 0) {
      setOrderError('Mã đơn hàng không hợp lệ.');
      setIsLoadingOrder(false);
      return;
    }

    setIsLoadingOrder(true);
    setOrderError('');

    orderService
      .getMyOrderById(orderIdNum)
      .then((fetchedOrder: OrderWithItems) => {
        if (!isOrderEligibleForReturn(fetchedOrder)) {
          setOrderError('Đơn hàng này không đủ điều kiện yêu cầu trả (phải ở trạng thái Đã giao và trong vòng 7 ngày).');
          return;
        }

        setOrder(fetchedOrder);
        setPickupContactName((prev) => prev || fetchedOrder.shippingRecipientName || '');
        setPickupPhone((prev) => prev || fetchedOrder.shippingPhone || '');
        const initSelected: Record<number, SelectedItemState> = {};
        (fetchedOrder.orderItems || []).forEach((item: OrderItemResponse) => {
          initSelected[item.id] = {
            selected: false,
            quantity: 1,
          };
        });
        setSelectedItems(initSelected);
      })
      .catch((err: any) => {
        setOrderError(err?.message || 'Không tìm thấy thông tin đơn hàng này trong hệ thống.');
      })
      .finally(() => {
        setIsLoadingOrder(false);
      });
  }, [location.search, order]);

  // Xử lý bật/tắt checkbox chọn sản phẩm
  const handleToggleItem = (itemId: number) => {
    setFieldErrors((prev) => (prev.items ? { ...prev, items: undefined } : prev));
    setSelectedItems((prev) => {
      const current = prev[itemId] || { selected: false, quantity: 1 };
      return {
        ...prev,
        [itemId]: {
          ...current,
          selected: !current.selected,
        },
      };
    });
  };

  // Cập nhật số lượng sản phẩm cần trả
  const handleQuantityChange = (itemId: number, newQty: number) => {
    setFieldErrors((prev) => (prev.items ? { ...prev, items: undefined } : prev));
    setSelectedItems((prev) => {
      const current = prev[itemId] || { selected: true, quantity: 1 };
      return {
        ...prev,
        [itemId]: {
          ...current,
          quantity: newQty,
        },
      };
    });
  };

  // Xử lý nộp form tạo phiếu trả hàng
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    if (!order) {
      setFormError('Không có thông tin đơn hàng hợp lệ.');
      return;
    }

    const nextErrors: {
      items?: string;
      reasonDetail?: string;
      images?: string;
      pickupContactName?: string;
      pickupPhone?: string;
      bankName?: string;
      accountNumber?: string;
      accountHolderName?: string;
    } = {};

    // 1. Kiểm tra danh sách sản phẩm được chọn và giới hạn còn có thể trả
    const chosenItems = (order.orderItems || [])
      .filter((item: OrderItemResponse) => selectedItems[item.id]?.selected)
      .map((item: OrderItemResponse) => {
        const remainingQty = Math.max(
          0,
          item.remainingReturnableQuantity ?? item.quantity ?? 0
        );
        return {
          orderItemId: item.id,
          quantity: Math.min(selectedItems[item.id]?.quantity || 1, remainingQty),
          remainingQty,
        };
      })
      .filter((it) => it.remainingQty > 0 && it.quantity > 0);

    if (chosenItems.length === 0) {
      nextErrors.items = 'Vui lòng chọn ít nhất 1 sản phẩm còn số lượng có thể trả.';
    }

    // 2. Kiểm tra mô tả chi tiết lý do
    if (!reasonDetail.trim()) {
      nextErrors.reasonDetail = 'Vui lòng nhập mô tả chi tiết lý do trả hàng.';
    } else if (reasonDetail.trim().length > 1000) {
      nextErrors.reasonDetail = 'Mô tả chi tiết không được vượt quá 1000 ký tự.';
    }

    // 3. Kiểm tra tính hợp lệ của ảnh minh chứng (1-5 ảnh khi DEFECTIVE hoặc WRONG_ITEM)
    const imageValidation = validateReturnImageFiles(images, reason);
    if (!imageValidation.isValid) {
      nextErrors.images = imageValidation.error || 'Ảnh minh chứng chưa hợp lệ.';
    }

    // 4. Kiểm tra thông tin lấy hàng GHN (chỉ khi không tự mang đến cửa hàng)
    const trimmedPickupName = isSelfDropOff ? '' : pickupContactName.trim();
    if (!isSelfDropOff && trimmedPickupName.length > 100) {
      nextErrors.pickupContactName = 'Tên người liên hệ lấy hàng không được vượt quá 100 ký tự.';
    }

    const trimmedPickupPhone = isSelfDropOff ? '' : pickupPhone.trim();
    if (!isSelfDropOff && trimmedPickupPhone !== '' && !isValidPickupPhone(trimmedPickupPhone)) {
      nextErrors.pickupPhone =
        'Số điện thoại lấy hàng không hợp lệ (bắt đầu bằng 0 hoặc +84, gồm 10–11 chữ số).';
    }

    // 5. Kiểm tra bắt buộc đầy đủ thông tin tài khoản ngân hàng nhận hoàn tiền
    const trimmedAccount = accountNumber.trim();
    const trimmedHolder = accountHolderName.trim();
    const bankErrors = validateRequiredBankInfo({
      bankName,
      accountNumber: trimmedAccount,
      accountHolderName: trimmedHolder,
    });
    if (bankErrors.bankName) nextErrors.bankName = bankErrors.bankName;
    if (bankErrors.accountNumber) nextErrors.accountNumber = bankErrors.accountNumber;
    if (bankErrors.accountHolderName) nextErrors.accountHolderName = bankErrors.accountHolderName;

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    // 6. Dựng payload sạch qua helper (tự động lược bỏ trường rỗng)
    const payload = buildCreateReturnPayload({
      orderId: order.id,
      reason,
      reasonDetail: reasonDetail.trim(),
      items: chosenItems.map(({ orderItemId, quantity }) => ({ orderItemId, quantity })),
      bankName: bankName.trim(),
      accountNumber: trimmedAccount,
      accountHolderName: accountHolderName.trim(),
      selfDropOff: isSelfDropOff,
      pickupAddressId: isSelfDropOff ? null : pickupAddressId || null,
      pickupContactName: trimmedPickupName,
      pickupPhone: trimmedPickupPhone,
    });

    setIsSubmitting(true);
    try {
      // Gửi yêu cầu qua returnService (hỗ trợ cả JSON và Multipart)
      const res = await returnService.createReturn(
        payload,
        images.length > 0 ? images : undefined
      );

      if (res.data) {
        // Chuyển hướng sang màn C4 chi tiết phiếu trả hàng vừa tạo
        navigate(`/account/returns/${res.data.id}`, {
          state: { newlyCreated: true },
        });
      } else {
        navigate('/account/returns');
      }
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message || err?.message || 'Tạo yêu cầu trả hàng không thành công.';
      setFormError(serverMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trạng thái đang tải đơn hàng
  if (isLoadingOrder) {
    return (
      <div className="container py-20 text-center text-content-muted">
        <div className="w-8 h-8 border-2 border-line border-t-primary rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  // Trạng thái lỗi không tìm thấy đơn hoặc không đủ điều kiện 7 ngày
  if (orderError || !order) {
    return (
      <div className="container py-16 max-w-2xl">
        <div className="p-8 bg-surface border border-line-light rounded-sm text-center">
          <AlertCircle size={40} className="text-status-error mx-auto mb-3" />
          <h3 className="text-lg font-bold text-content-primary mb-2">
            Không Thể Tạo Yêu Cầu Trả Hàng
          </h3>
          <p className="text-sm text-content-secondary mb-6">{orderError}</p>
          <Button variant="primary" onClick={() => navigate('/account/orders')}>
            Quay Lại Danh Sách Đơn Hàng
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-8 pb-20">
      <div className="container max-w-4xl">
        {/* Breadcrumb điều hướng */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-content-muted mb-6">
          <Link to="/" className="hover:text-content-primary">
            Trang chủ
          </Link>
          <ChevronRight size={12} />
          <Link to="/account/profile" className="hover:text-content-primary">
            Tài khoản
          </Link>
          <ChevronRight size={12} />
          <Link to="/account/orders" className="hover:text-content-primary">
            Đơn hàng
          </Link>
          <ChevronRight size={12} />
          <span className="text-content-primary font-semibold">Tạo yêu cầu trả hàng</span>
        </nav>

        {/* Tiêu đề trang & Quay lại */}
        <div className="flex items-center justify-between border-b border-line-light pb-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wide text-content-primary flex items-center gap-2.5">
              <RotateCcw size={24} />
              <span>Yêu Cầu Trả Hàng &amp; Hoàn Tiền</span>
            </h1>
            <p className="text-xs text-content-muted mt-1">
              Đơn hàng: <strong className="text-content-primary">#{order.orderCode || order.id}</strong> (Giao ngày:{' '}
              {order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString('vi-VN') : 'Mới đây'})
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/account/orders')}
            className="flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            <span>Quay Lại</span>
          </Button>
        </div>

        {/* Banner cảnh báo khi toàn bộ sản phẩm đã yêu cầu trả đủ số lượng */}
        {(() => {
          const hasReturnableItems = (order.orderItems || []).some(
            (item: OrderItemResponse) =>
              Math.max(0, item.remainingReturnableQuantity ?? item.quantity ?? 0) > 0
          );
          if (hasReturnableItems) return null;
          return (
            <div className="flex items-center gap-2.5 p-4 bg-surface border-l-4 border-line-error text-status-error text-sm rounded-sm mb-6">
              <AlertCircle size={20} className="shrink-0" />
              <span>
                Tất cả sản phẩm trong đơn hàng này đã được yêu cầu trả đủ số lượng. Bạn không thể gửi thêm yêu cầu trả hàng mới.
              </span>
            </div>
          );
        })()}

        {/* Banner thông báo lỗi nếu có */}
        {formError && (
          <div className="flex items-center gap-2.5 p-4 bg-surface border-l-4 border-line-error text-status-error text-sm rounded-sm mb-6">
            <AlertCircle size={20} className="shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          {/* KHỐI 1: CHỌN SẢN PHẨM CẦN TRẢ */}
          <div className="bg-surface-body border border-line-light p-6 rounded-card">
            <h2 className="text-base font-bold uppercase tracking-wide text-content-primary mb-1">
              1. Chọn Sản Phẩm Cần Trả <span className="text-accent-red">*</span>
            </h2>
            <p className="text-xs text-content-muted mb-4">
              Tích chọn sản phẩm và điều chỉnh số lượng bạn muốn gửi trả lại cho cửa hàng
            </p>

            <div className="flex flex-col gap-3">
              {(order.orderItems || []).map((item: OrderItemResponse) => {
                const remainingQty = Math.max(
                  0,
                  item.remainingReturnableQuantity ?? item.quantity ?? 0
                );
                const isExhausted = remainingQty === 0;
                const itemState = selectedItems[item.id] || { selected: false, quantity: 1 };
                const safeSelectedQty = Math.min(itemState.quantity || 1, Math.max(1, remainingQty));

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-4 border rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors',
                      isExhausted
                        ? 'border-line-light bg-surface opacity-55'
                        : itemState.selected
                          ? 'border-primary bg-surface'
                          : 'border-line-light bg-surface-body opacity-75'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!isExhausted && itemState.selected}
                        disabled={isExhausted}
                        onChange={() => handleToggleItem(item.id)}
                        className="w-5 h-5 rounded-sm border-line text-primary focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                        id={`item-checkbox-${item.id}`}
                      />

                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="w-14 h-14 object-cover rounded-sm border border-line-light shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-surface text-content-muted flex items-center justify-center rounded-sm shrink-0">
                          <Package size={20} />
                        </div>
                      )}

                      <div>
                        <label
                          htmlFor={`item-checkbox-${item.id}`}
                          className="text-sm font-semibold text-content-primary cursor-pointer line-clamp-1"
                        >
                          {item.productName}
                        </label>
                        <div className="text-xs text-content-muted">{item.variantInfo || 'Tiêu chuẩn'}</div>
                        <div className="text-xs text-content-secondary mt-0.5">
                          Đơn giá: {formatVND(item.unitPrice)} | Đã mua: {item.quantity} |{' '}
                          <strong className={isExhausted ? 'text-status-error' : 'text-content-primary'}>
                            {isExhausted
                              ? 'Đã yêu cầu trả đủ số lượng'
                              : `Còn có thể trả: ${remainingQty}`}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Số lượng chọn trả */}
                    {!isExhausted && itemState.selected && (
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="text-xs font-medium text-content-muted">SL trả:</span>
                        <QuantityStepper
                          min={1}
                          max={Math.max(1, remainingQty)}
                          value={safeSelectedQty}
                          onChange={(newQty) => handleQuantityChange(item.id, newQty)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {fieldErrors.items && (
              <p className="mt-2 text-xs italic text-status-error">{fieldErrors.items}</p>
            )}
          </div>

          {/* KHỐI 2: LÝ DO TRẢ HÀNG & MÔ TẢ CHI TIẾT */}
          <div className="bg-surface-body border border-line-light p-6 rounded-card flex flex-col gap-5">
            <div>
              <h2 className="text-base font-bold uppercase tracking-wide text-content-primary mb-1">
                2. Lý Do &amp; Mô Tả Trả Hàng <span className="text-accent-red">*</span>
              </h2>
              <p className="text-xs text-content-muted">
                Giúp cửa hàng nắm rõ tình trạng để xét duyệt và xử lý nhanh chóng nhất
              </p>
            </div>

            <div>
              <Select
                label="Lý do trả hàng"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value as ReturnReason);
                  setFieldErrors((prev) => (prev.images ? { ...prev, images: undefined } : prev));
                }}
                required
              >
                {RETURN_REASON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.description}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-content-primary">
                Mô tả chi tiết tình trạng sản phẩm <span className="text-accent-red">*</span>
              </label>
              <textarea
                rows={4}
                value={reasonDetail}
                onChange={(e) => {
                  setReasonDetail(e.target.value);
                  setFieldErrors((prev) =>
                    prev.reasonDetail ? { ...prev, reasonDetail: undefined } : prev
                  );
                }}
                maxLength={1000}
                placeholder="Vui lòng cung cấp chi tiết lỗi đường may, vị trí hỏng, hoặc chi tiết giao sai..."
                className={cn(
                  'w-full rounded-input border bg-surface-body p-3 text-sm text-content-primary focus:border-line-focus focus:outline-none',
                  fieldErrors.reasonDetail ? 'border-line-error' : 'border-line'
                )}
              />
              {fieldErrors.reasonDetail && (
                <p className="mt-1 text-xs italic text-status-error">{fieldErrors.reasonDetail}</p>
              )}
              <div className="flex justify-between items-center text-xs text-content-muted mt-1">
                <span>Tối đa 1000 ký tự</span>
                <span>{reasonDetail.length}/1000</span>
              </div>
            </div>
          </div>

          {/* KHỐI 3: TẢI LÊN ẢNH MINH CHỨNG */}
          <div className="bg-surface-body border border-line-light p-6 rounded-card">
            <h2 className="text-base font-bold uppercase tracking-wide text-content-primary mb-1">
              3. Ảnh Minh Chứng
            </h2>
            <p className="text-xs text-content-muted mb-4">
              Chụp rõ nét tem mác, bao bì và cận cảnh lỗi sản phẩm để nhân viên đối soát
            </p>

            <ReturnImageUploader
              files={images}
              onChange={(nextFiles) => {
                setImages(nextFiles);
                setFieldErrors((prev) => (prev.images ? { ...prev, images: undefined } : prev));
              }}
              reason={reason}
              error={fieldErrors.images}
            />
          </div>

          {/* KHỐI 4: HÌNH THỨC GỬI TRẢ HÀNG & THÔNG TIN LẤY HÀNG */}
          <div className="bg-surface-body border border-line-light p-6 rounded-card flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold uppercase tracking-wide text-content-primary mb-1">
                4. Hình Thức Gửi Trả Hàng
              </h2>
              <p className="text-xs text-content-muted">
                Bạn có thể chọn tự mang hàng đến cửa hàng hoặc để bưu tá GHN đến lấy tận nơi
              </p>
            </div>

            <label
              htmlFor="self-dropoff-create"
              className={cn(
                'flex items-center gap-3 p-3.5 border rounded-sm cursor-pointer transition-colors',
                isSelfDropOff
                  ? 'border-primary bg-surface font-medium text-content-primary'
                  : 'border-line-light bg-surface-body text-content-primary hover:bg-surface'
              )}
            >
              <input
                id="self-dropoff-create"
                type="checkbox"
                checked={isSelfDropOff}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsSelfDropOff(checked);
                  if (checked) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      pickupContactName: undefined,
                      pickupPhone: undefined,
                    }));
                  }
                }}
                className="w-4 h-4 rounded-sm border-line text-primary focus:ring-0 cursor-pointer shrink-0"
              />
              <span className="text-sm">
                Tôi tự mang sản phẩm đến cửa hàng (không cần shipper GHN đến lấy)
              </span>
            </label>

            {isSelfDropOff ? (
              <div className="p-3.5 bg-surface border border-line-light rounded-sm text-xs text-content-secondary">
                Sau khi yêu cầu được duyệt, bạn vui lòng mang sản phẩm trực tiếp đến cửa hàng gần nhất để nhân viên tiếp nhận kiểm tra.
              </div>
            ) : (
              <>
                <div>
                  <Select
                    label="Địa chỉ lấy hàng (từ sổ địa chỉ)"
                    value={pickupAddressId}
                    onChange={(e) => setPickupAddressId(e.target.value)}
                    helperText={
                      addressesLoadFailed
                        ? 'Không tải được sổ địa chỉ; hệ thống sẽ tự lấy theo địa chỉ giao hàng của đơn gốc.'
                        : undefined
                    }
                  >
                    <option value="">Dùng địa chỉ giao hàng của đơn gốc (mặc định)</option>
                    {addresses.map((addr) => (
                      <option key={addr.id} value={String(addr.id)}>
                        {[addr.fullAddress, addr.wardName, addr.provinceName].filter(Boolean).join(', ')}
                        {addr.isDefault ? ' (Mặc định)' : ''}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Người liên hệ lấy hàng"
                    placeholder="VD: Nguyễn Văn A"
                    maxLength={100}
                    value={pickupContactName}
                    error={fieldErrors.pickupContactName}
                    onChange={(e) => {
                      setPickupContactName(e.target.value);
                      setFieldErrors((prev) =>
                        prev.pickupContactName ? { ...prev, pickupContactName: undefined } : prev
                      );
                    }}
                  />
                  <Input
                    label="SĐT lấy hàng"
                    placeholder="VD: 0901234567"
                    maxLength={20}
                    value={pickupPhone}
                    error={fieldErrors.pickupPhone}
                    onChange={(e) => {
                      setPickupPhone(e.target.value);
                      setFieldErrors((prev) =>
                        prev.pickupPhone ? { ...prev, pickupPhone: undefined } : prev
                      );
                    }}
                  />
                </div>
              </>
            )}
          </div>

          {/* KHỐI 5: THÔNG TIN TÀI KHOẢN NGÂN HÀNG NHẬN HOÀN TIỀN */}
          <div className="bg-surface-body border border-line-light p-6 rounded-card flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold uppercase tracking-wide text-content-primary mb-1">
                5. Tài Khoản Ngân Hàng Nhận Hoàn Tiền <span className="text-accent-red">*</span>
              </h2>
              <p className="text-xs text-content-muted">
                Vui lòng nhập chính xác thông tin tài khoản ngân hàng chính chủ để cửa hàng hoàn tiền sau khi kiểm tra sản phẩm
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <BankSelect
                label="Ngân hàng"
                value={bankName}
                onChange={(val) => {
                  setBankName(val);
                  setFieldErrors((prev) => ({
                    ...prev,
                    bankName: undefined,
                    accountNumber: accountNumber.trim()
                      ? validateBankAccountNumberForBank(accountNumber, val)
                      : undefined,
                  }));
                }}
                error={fieldErrors.bankName}
                required
                placeholder="Chọn ngân hàng..."
              />
              <Input
                label="Số tài khoản *"
                placeholder="Nhập số tài khoản"
                helperText={getBankAccountHint(bankName)}
                inputMode="numeric"
                maxLength={30}
                value={accountNumber}
                error={fieldErrors.accountNumber}
                required
                onChange={(e) => {
                  const next = sanitizeBankAccountNumberInput(e.target.value);
                  setAccountNumber(next);
                  const realtimeErr = getRealtimeBankAccountError(next, bankName);
                  setFieldErrors((prev) => ({
                    ...prev,
                    accountNumber: realtimeErr,
                  }));
                }}
                onBlur={() => {
                  if (accountNumber.trim()) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      accountNumber: validateBankAccountNumberForBank(accountNumber, bankName),
                    }));
                  }
                }}
              />
              <Input
                label="Chủ tài khoản *"
                placeholder="NGUYEN VAN A"
                helperText="Viết hoa không dấu"
                maxLength={100}
                value={accountHolderName}
                error={fieldErrors.accountHolderName}
                required
                onChange={(e) => {
                  setAccountHolderName(normalizeBankAccountHolderInput(e.target.value));
                  setFieldErrors((prev) =>
                    prev.accountHolderName ? { ...prev, accountHolderName: undefined } : prev
                  );
                }}
              />
            </div>
          </div>

          {/* KHỐI HÀNH ĐỘNG GỬI YÊU CẦU */}
          {(() => {
            const hasReturnableItems = (order.orderItems || []).some(
              (item: OrderItemResponse) =>
                Math.max(0, item.remainingReturnableQuantity ?? item.quantity ?? 0) > 0
            );
            const isSubmitDisabled = !hasReturnableItems || !agreedPolicy || isSubmitting;

            return (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-surface border border-line-light rounded-sm">
                <label
                  htmlFor="agree-return-policy"
                  className={cn(
                    'flex items-start sm:items-center gap-2.5 text-xs text-content-primary select-none',
                    hasReturnableItems ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                  )}
                >
                  <input
                    id="agree-return-policy"
                    type="checkbox"
                    checked={agreedPolicy}
                    disabled={!hasReturnableItems || isSubmitting}
                    onChange={(e) => setAgreedPolicy(e.target.checked)}
                    className="w-4 h-4 mt-0.5 sm:mt-0 rounded-sm border-line text-primary focus:ring-0 cursor-pointer shrink-0 disabled:cursor-not-allowed"
                  />
                  <span>
                    Tôi đã đọc và đồng ý với{' '}
                    <Link
                      to="/chinh-sach-doi-tra"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-primary underline hover:opacity-80"
                    >
                      Chính sách Trả hàng &amp; Hoàn tiền
                    </Link>
                  </span>
                </label>
                <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate('/account/orders')}
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-initial"
                  >
                    Hủy Bỏ
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isSubmitting}
                    disabled={isSubmitDisabled}
                    className={cn(
                      'flex-1 sm:flex-initial transition-opacity',
                      isSubmitDisabled && 'opacity-45 cursor-not-allowed'
                    )}
                  >
                    Gửi Yêu Cầu Trả Hàng
                  </Button>
                </div>
              </div>
            );
          })()}
        </form>
      </div>
    </div>
  );
}
