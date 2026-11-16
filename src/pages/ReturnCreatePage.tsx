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
import type { OrderWithItems, OrderItemResponse } from '../types/order';
import type { ReturnReason } from '../types/return';
import { RETURN_REASON_OPTIONS } from '../constants/returnMeta';
import {
  isOrderEligibleForReturn,
  validateReturnImageFiles,
  buildCreateReturnPayload,
  isValidBankAccountNumber,
  formatVND,
} from '../utils/returnHelpers';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import QuantityStepper from '../components/ui/QuantityStepper';
import ReturnImageUploader from '../components/returns/ReturnImageUploader';
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

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Nếu không có state truyền từ C1, đọc orderId từ query param và gọi API lấy chi tiết đơn
  useEffect(() => {
    if (order) {
      // Khởi tạo trạng thái chọn sản phẩm: mặc định chọn tất cả sản phẩm
      const initSelected: Record<number, SelectedItemState> = {};
      (order.orderItems || []).forEach((item: OrderItemResponse) => {
        initSelected[item.id] = {
          selected: true,
          quantity: item.quantity || 1,
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
      .getOrderById(orderIdNum)
      .then((fetchedOrder: OrderWithItems) => {
        if (!isOrderEligibleForReturn(fetchedOrder)) {
          setOrderError('Đơn hàng này không đủ điều kiện yêu cầu trả (phải ở trạng thái Đã giao và trong vòng 7 ngày).');
          return;
        }

        setOrder(fetchedOrder);
        const initSelected: Record<number, SelectedItemState> = {};
        (fetchedOrder.orderItems || []).forEach((item: OrderItemResponse) => {
          initSelected[item.id] = {
            selected: true,
            quantity: item.quantity || 1,
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

    if (!order) {
      setFormError('Không có thông tin đơn hàng hợp lệ.');
      return;
    }

    // 1. Kiểm tra danh sách sản phẩm được chọn
    const chosenItems = (order.orderItems || [])
      .filter((item: OrderItemResponse) => selectedItems[item.id]?.selected)
      .map((item: OrderItemResponse) => ({
        orderItemId: item.id,
        quantity: selectedItems[item.id].quantity,
      }));

    if (chosenItems.length === 0) {
      setFormError('Vui lòng chọn ít nhất 1 sản phẩm bạn muốn yêu cầu trả hàng.');
      return;
    }

    // 2. Kiểm tra mô tả chi tiết lý do
    if (!reasonDetail.trim()) {
      setFormError('Vui lòng nhập mô tả chi tiết lý do trả hàng.');
      return;
    }

    if (reasonDetail.trim().length > 1000) {
      setFormError('Mô tả chi tiết không được vượt quá 1000 ký tự.');
      return;
    }

    // 3. Kiểm tra tính hợp lệ của ảnh minh chứng (1-5 ảnh khi DEFECTIVE hoặc WRONG_ITEM)
    const imageValidation = validateReturnImageFiles(images, reason);
    if (!imageValidation.isValid) {
      setFormError(imageValidation.error || 'Ảnh minh chứng chưa hợp lệ.');
      return;
    }

    // 4. Kiểm tra tài khoản ngân hàng nếu có điền
    const trimmedAccount = accountNumber.trim();
    if (trimmedAccount !== '' && !isValidBankAccountNumber(trimmedAccount)) {
      setFormError('Số tài khoản ngân hàng không hợp lệ (phải gồm từ 6 đến 30 chữ số).');
      return;
    }

    // 5. Dựng payload sạch qua helper (tự động lược bỏ trường ngân hàng rỗng)
    const payload = buildCreateReturnPayload({
      orderId: order.id,
      reason,
      reasonDetail: reasonDetail.trim(),
      items: chosenItems,
      bankName: bankName.trim(),
      accountNumber: trimmedAccount,
      accountHolderName: accountHolderName.trim(),
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
                const itemState = selectedItems[item.id] || { selected: false, quantity: 1 };

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-4 border rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors',
                      itemState.selected
                        ? 'border-primary bg-surface'
                        : 'border-line-light bg-surface-body opacity-60'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={itemState.selected}
                        onChange={() => handleToggleItem(item.id)}
                        className="w-5 h-5 rounded-sm border-line text-primary focus:ring-0 cursor-pointer"
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
                          Đơn giá: {formatVND(item.unitPrice)} | Số lượng đã mua: {item.quantity}
                        </div>
                      </div>
                    </div>

                    {/* Số lượng chọn trả */}
                    {itemState.selected && (
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="text-xs font-medium text-content-muted">SL trả:</span>
                        <QuantityStepper
                          min={1}
                          max={item.quantity || 1}
                          value={itemState.quantity}
                          onChange={(newQty) => handleQuantityChange(item.id, newQty)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
                onChange={(e) => setReason(e.target.value as ReturnReason)}
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
                onChange={(e) => setReasonDetail(e.target.value)}
                maxLength={1000}
                required
                placeholder="Vui lòng cung cấp chi tiết lỗi đường may, vị trí hỏng, hoặc chi tiết giao sai..."
                className="w-full rounded-input border border-line bg-surface-body p-3 text-sm text-content-primary focus:border-line-focus focus:outline-none"
              />
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
              onChange={setImages}
              reason={reason}
            />
          </div>

          {/* KHỐI 4: THÔNG TIN TÀI KHOẢN NGÂN HÀNG NHẬN HOÀN TIỀN */}
          <div className="bg-surface-body border border-line-light p-6 rounded-card flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold uppercase tracking-wide text-content-primary mb-1">
                4. Tài Khoản Ngân Hàng Nhận Hoàn Tiền (Tùy chọn)
              </h2>
              <p className="text-xs text-content-muted">
                Bạn có thể bổ sung ngay bây giờ hoặc cập nhật sau khi yêu cầu được kiểm định
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Tên ngân hàng"
                placeholder="VD: Vietcombank, Techcombank..."
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
              <Input
                label="Số tài khoản"
                placeholder="6–30 chữ số"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
              <Input
                label="Chủ tài khoản"
                placeholder="NGUYEN VAN A"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
              />
            </div>
          </div>

          {/* KHỐI HÀNH ĐỘNG GỬI YÊU CẦU */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-surface border border-line-light rounded-sm">
            <div className="text-xs text-content-muted">
              Bằng việc gửi yêu cầu, bạn xác nhận đồng ý với chính sách Trả hàng &amp; Hoàn tiền của chúng tôi.
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
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
                className="flex-1 sm:flex-initial"
              >
                Gửi Yêu Cầu Trả Hàng
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
