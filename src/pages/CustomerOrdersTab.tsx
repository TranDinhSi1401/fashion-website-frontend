/**
 * Tab hiển thị danh sách đơn hàng của khách hàng (Customer Orders Tab - C1).
 * Tích hợp trong ProfilePage (/account/orders).
 * - Cung cấp nút "Yêu cầu trả hàng / Hoàn tiền" khi đơn DELIVERED và còn hạn 7 ngày lịch.
 * - Đồng bộ trạng thái đánh giá từng sản phẩm thuộc đơn DELIVERED qua API
 *   GET /api/v1/product-reviews/my-order-items (không can thiệp module Order).
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  RotateCcw,
  Clock,
  AlertCircle,
  CheckCircle2,
  Truck,
  Star,
  Pencil,
  ExternalLink,
  X,
} from 'lucide-react';
import { orderService } from '../services/orderService';
import { reviewService } from '../services/reviewService';
import type { OrderWithItems, OrderItemResponse } from '../types/order';
import type { ReviewableOrderItemResponse } from '../types/review';
import { isOrderEligibleForReturn, formatVND, formatDateTime } from '../utils/returnHelpers';
import { isOrderEligibleForReview } from '../utils/reviewHelpers';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import OrderReviewModal from '../components/product/OrderReviewModal';
import { cn } from '../utils/cn';
import { extractErrorMessage } from '../utils/format';

type CustomerOrderFilter = 'ALL' | 'PROCESSING' | 'SHIPPING' | 'DELIVERED' | 'RETURNED';

const CUSTOMER_ORDER_FILTERS: { value: CustomerOrderFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'SHIPPING', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Giao thành công' },
  { value: 'RETURNED', label: 'Đã trả hàng' },
];

function groupReviewableItemsByOrder(
  items: ReviewableOrderItemResponse[]
): Record<number, ReviewableOrderItemResponse[]> {
  const grouped: Record<number, ReviewableOrderItemResponse[]> = {};
  for (const item of items) {
    if (!grouped[item.orderId]) {
      grouped[item.orderId] = [];
    }
    grouped[item.orderId].push(item);
  }
  return grouped;
}

function isCodOrder(order: OrderWithItems) {
  const methodCode = order.paymentMethodCode || order.paymentMethod?.code || '';
  const methodName = order.paymentMethodName || order.paymentMethod?.name || '';
  return (
    order.paymentStatus === 'PENDING_COD' ||
    /cod/i.test(methodCode) ||
    /cod|tiền mặt|cash/i.test(methodName)
  );
}

function computeOrderItemPricing(
  order: OrderWithItems,
  item: {
    quantity: number;
    unitPrice: number;
    totalPrice?: number;
    originalPrice?: number;
  }
) {
  const qty = Math.max(1, Number(item.quantity || 1));
  const unitPrice = Number(item.unitPrice || 0);
  const originalUnitPrice =
    item.originalPrice && Number(item.originalPrice) > unitPrice
      ? Number(item.originalPrice)
      : unitPrice;
  const originalTotalPrice = originalUnitPrice * qty;
  const lineTotalAfterProductOffer = Number(item.totalPrice || unitPrice * qty);

  const orderSubtotal = Number(order.subtotal || lineTotalAfterProductOffer || 0);
  const orderDiscount = Number(order.discountAmount || 0);

  // Phân bổ tiền giảm giá voucher/hóa đơn theo tỷ lệ giá trị dòng sản phẩm
  const allocatedOrderDiscount =
    orderDiscount > 0 && orderSubtotal > 0
      ? Math.round((lineTotalAfterProductOffer / orderSubtotal) * orderDiscount)
      : 0;

  const finalTotalPrice = Math.max(0, lineTotalAfterProductOffer - allocatedOrderDiscount);
  const finalUnitPrice = Math.round(finalTotalPrice / qty);
  const totalDiscountOnItem = Math.max(0, originalTotalPrice - finalTotalPrice);

  return {
    qty,
    originalUnitPrice,
    originalTotalPrice,
    lineTotalAfterProductOffer,
    allocatedOrderDiscount,
    finalUnitPrice,
    finalTotalPrice,
    totalDiscountOnItem,
    hasDiscount: totalDiscountOnItem > 0,
  };
}

function computeOrderSummaryPricing(order: OrderWithItems) {
  const items = order.orderItems || [];
  const rawOriginalSubtotal = items.reduce((sum, it) => {
    const qty = Math.max(1, Number(it.quantity || 1));
    const unit = Number(it.unitPrice || 0);
    const origUnit =
      it.originalPrice && Number(it.originalPrice) > unit ? Number(it.originalPrice) : unit;
    return sum + origUnit * qty;
  }, 0);

  const subtotalAfterProductOffer = Number(order.subtotal || rawOriginalSubtotal || 0);
  const originalSubtotal = Math.max(rawOriginalSubtotal, subtotalAfterProductOffer);
  const productDiscountAmount = Math.max(0, originalSubtotal - subtotalAfterProductOffer);
  const orderDiscountAmount = Number(order.discountAmount || 0);
  const totalDiscountAmount = productDiscountAmount + orderDiscountAmount;
  const discountedItemsSubtotal = Math.max(0, subtotalAfterProductOffer - orderDiscountAmount);
  const shippingFee = Number(order.shippingFee || 0);
  const originalTotalWithShip = originalSubtotal + shippingFee;
  const finalTotalAmount =
    order.totalAmount !== undefined && order.totalAmount !== null
      ? Number(order.totalAmount)
      : Math.max(0, discountedItemsSubtotal + shippingFee);

  return {
    originalSubtotal,
    subtotalAfterProductOffer,
    productDiscountAmount,
    orderDiscountAmount,
    totalDiscountAmount,
    discountedItemsSubtotal,
    shippingFee,
    originalTotalWithShip,
    finalTotalAmount,
    hasDiscount: totalDiscountAmount > 0,
  };
}

/**
 * Chức năng: Hiển thị danh sách các đơn hàng đã mua của khách hàng, điều kiện đổi trả
 * và thao tác đánh giá sản phẩm cho từng dòng sản phẩm thuộc đơn hàng đã giao thành công.
 */
export default function CustomerOrdersTab() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [reviewableByOrderId, setReviewableByOrderId] = useState<
    Record<number, ReviewableOrderItemResponse[]>
  >({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<CustomerOrderFilter>('ALL');

  const [activeReviewItem, setActiveReviewItem] = useState<ReviewableOrderItemResponse | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<string>('');
  const [cancelTarget, setCancelTarget] = useState<OrderWithItems | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState('');
  const [cancelFeedbackError, setCancelFeedbackError] = useState(false);
  const [detailTarget, setDetailTarget] = useState<OrderWithItems | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const handleOpenOrderDetail = async (order: OrderWithItems) => {
    setDetailTarget(order);
    setIsDetailLoading(true);
    try {
      const detail = await orderService.getOrderById(order.id);
      setDetailTarget(detail);
    } catch {
      // Giữ dữ liệu đơn hàng đã tải trong danh sách nếu API chi tiết không khả dụng.
    } finally {
      setIsDetailLoading(false);
    }
  };

  const loadReviewableItems = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await reviewService.getMyReviewableOrderItems(undefined, signal);
      if (!signal?.aborted) {
        setReviewableByOrderId(groupReviewableItemsByOrder(res.data || []));
      }
    } catch {
      // Giữ danh sách đơn hàng hiển thị bình thường nếu không tải được trạng thái đánh giá
    }
  }, []);

  // Tải đồng thời danh sách đơn hàng và danh sách dòng sản phẩm đủ điều kiện đánh giá
  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    async function fetchOrdersAndReviews() {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const [ordersData] = await Promise.all([
          orderService.getMyOrders(),
          loadReviewableItems(controller.signal),
        ]);
        if (isMounted) {
          setOrders(ordersData);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message =
            (err as { message?: string })?.message ||
            'Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.';
          setErrorMessage(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchOrdersAndReviews();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [loadReviewableItems]);

  // Điều hướng sang trang tạo phiếu trả hàng C2 kèm truyền state đơn hàng
  const handleInitiateReturn = (order: OrderWithItems) => {
    navigate(`/account/returns/new?orderId=${order.id}`, {
      state: { order },
    });
  };

  // Đồng bộ lại trạng thái đánh giá ngay sau khi tạo / sửa / xóa thành công
  const handleReviewSuccess = async (message: string) => {
    setReviewFeedback(message);
    await loadReviewableItems();
  };

  const handleConfirmCancelOrder = async () => {
    if (!cancelTarget) return;

    setIsCancelling(true);
    setCancelFeedback('');
    setCancelFeedbackError(false);
    try {
      await orderService.updateOrderStatus(cancelTarget.id, 'CANCELLED');
      setOrders((current) =>
        current.map((order) =>
          order.id === cancelTarget.id
            ? { ...order, orderStatus: 'CANCELLED', paymentStatus: 'FAILED' }
            : order
        )
      );
      setCancelTarget(null);
      setCancelFeedback('Đơn hàng COD đã được hủy thành công.');
    } catch (error) {
      setCancelFeedbackError(true);
      setCancelFeedback(extractErrorMessage(error, 'Không thể hủy đơn hàng.'));
      setCancelTarget(null);
    } finally {
      setIsCancelling(false);
    }
  };

  // Trạng thái đang tải dữ liệu
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-content-muted">
        <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" />
        <p className="text-sm">Đang tải danh sách đơn hàng của bạn...</p>
      </div>
    );
  }

  // Trạng thái gặp lỗi khi gọi API
  if (errorMessage) {
    return (
      <div className="rounded-sm border border-line-light bg-surface p-6 text-center">
        <AlertCircle size={32} className="mx-auto mb-2 text-status-error" />
        <p className="mb-4 text-sm font-medium text-content-primary">{errorMessage}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Thử Lại
        </Button>
      </div>
    );
  }

  // Trạng thái chưa có đơn hàng nào
  if (orders.length === 0) {
    return (
      <div className="rounded-sm border border-line-light bg-surface p-12 text-center">
        <Package size={40} className="mx-auto mb-3 text-content-muted" />
        <h4 className="mb-1 text-base font-bold text-content-primary">
          Bạn chưa có đơn hàng nào
        </h4>
        <p className="mb-5 text-xs text-content-muted">
          Hãy khám phá các bộ sưu tập thời trang mới nhất của chúng tôi.
        </p>
        <Button variant="primary" onClick={() => navigate('/products')}>
          Mua Sắm Ngay
        </Button>
      </div>
    );
  }

  const supportedOrders = orders.filter(
    (order) =>
      order.orderStatus === 'PROCESSING' ||
      order.orderStatus === 'SHIPPING' ||
      order.orderStatus === 'DELIVERED' ||
      order.orderStatus === 'RETURNED'
  );
  const filteredOrders =
    activeFilter === 'ALL'
      ? supportedOrders
      : supportedOrders.filter((order) => order.orderStatus === activeFilter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-line-light pb-4">
        <div>
          <h3 className="text-lg font-bold uppercase tracking-wide text-content-primary">
            Đơn Hàng Của Tôi
          </h3>
          <p className="mt-0.5 text-xs text-content-muted">
            Quản lý lịch sử mua hàng, đánh giá sản phẩm trong 14 ngày sau khi nhận và theo dõi điều kiện đổi trả trong 7 ngày
          </p>
        </div>
        <span className="text-xs font-semibold text-content-muted">
          Tổng cộng: <strong className="text-content-primary">{supportedOrders.length}</strong> đơn
        </span>
      </div>

      {/* Thông báo sau khi gửi / sửa / xóa đánh giá */}
      {reviewFeedback && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 border border-status-success bg-surface px-4 py-3 text-xs font-medium text-status-success"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{reviewFeedback}</span>
          </span>
          <button
            type="button"
            onClick={() => setReviewFeedback('')}
            aria-label="Đóng thông báo"
            className="text-content-muted hover:text-content-primary"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {cancelFeedback && (
        <div
          role="status"
          className={cn(
            'flex items-center justify-between gap-3 border bg-surface px-4 py-3 text-xs font-medium',
            cancelFeedbackError
              ? 'border-status-error text-status-error'
              : 'border-status-success text-status-success'
          )}
        >
          <span>{cancelFeedback}</span>
          <button
            type="button"
            onClick={() => setCancelFeedback('')}
            aria-label="Đóng thông báo"
            className="text-content-muted hover:text-content-primary"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div
        role="group"
        aria-label="Lọc đơn hàng theo trạng thái"
        className="flex flex-wrap gap-2"
      >
        {CUSTOMER_ORDER_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={activeFilter === filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={cn(
              'border-b-2 px-4 py-2 text-sm font-semibold transition-colors',
              activeFilter === filter.value
                ? 'border-primary text-content-primary'
                : 'border-transparent text-content-secondary hover:border-line-light hover:text-content-primary'
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Danh sách thẻ đơn hàng */}
      <div className="flex flex-col gap-5">
        {filteredOrders.length === 0 ? (
          <div className="border border-line-light bg-surface p-8 text-center text-sm text-content-muted">
            Không có đơn hàng phù hợp với trạng thái này.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const eligibleForReturn = isOrderEligibleForReturn(order);
            const isDelivered = order.orderStatus === 'DELIVERED';
            // Chỉ hiển thị phần đánh giá khi đơn đã giao (DELIVERED), đã thanh toán (PAID) và trong hạn 14 ngày
            const eligibleForReview = isOrderEligibleForReview(order);
            const reviewableItems = eligibleForReview ? reviewableByOrderId[order.id] : undefined;
            const hasRealReviewableItems = Boolean(reviewableItems && reviewableItems.length > 0);

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-card border border-line-light bg-surface-body transition-shadow hover:shadow-dropdown"
                role="button"
                tabIndex={0}
                aria-label={`Xem chi tiết đơn hàng ${order.orderCode || order.id}`}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('button, a, input, select, textarea')) {
                    return;
                  }
                  void handleOpenOrderDetail(order);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    void handleOpenOrderDetail(order);
                  }
                }}
              >
                {/* Header thẻ đơn hàng */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-light bg-surface px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-content-primary">
                      Mã đơn: #{order.orderCode || order.id}
                    </span>
                    <span className="text-xs text-content-muted">
                      Ngày đặt: {formatDateTime(order.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={isDelivered ? 'success' : 'default'}>
                      {order.orderStatus === 'DELIVERED'
                        ? 'Đã giao hàng'
                        : order.orderStatus === 'SHIPPING'
                        ? 'Đang vận chuyển'
                        : order.orderStatus === 'CONFIRMED'
                        ? 'Đã xác nhận'
                        : order.orderStatus === 'PROCESSING'
                        ? 'Đang xử lý'
                        : order.orderStatus === 'PENDING_PAYMENT'
                        ? 'Chờ thanh toán'
                        : order.orderStatus === 'PENDING'
                        ? 'Chờ xác nhận'
                        : order.orderStatus === 'COMPLETED'
                        ? 'Hoàn thành'
                        : order.orderStatus === 'RETURNED'
                        ? 'Đã trả hàng'
                        : order.orderStatus === 'CANCELLED'
                        ? 'Đã hủy'
                        : order.orderStatus || 'Đang xử lý'}
                    </Badge>

                    {order.paymentStatus && (
                      <Badge variant={order.paymentStatus === 'PAID' ? 'dark' : order.paymentStatus === 'REFUNDED' ? 'success' : 'warning'}>
                        {order.paymentStatus === 'PAID'
                          ? 'Đã thanh toán'
                          : order.paymentStatus === 'REFUNDED'
                          ? 'Đã hoàn tiền'
                          : 'Chưa thanh toán'}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Danh sách sản phẩm trong đơn hàng */}
                <div className="flex flex-col gap-3 p-5">
                  {hasRealReviewableItems && reviewableItems ? (
                    reviewableItems.map((revItem) => {
                      const existingReview = revItem.review;
                      const imageCount = existingReview?.images?.length ?? 0;

                      return (
                        <div
                          key={revItem.orderItemId}
                          className="flex flex-col gap-3 border-b border-line-light pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <Link
                              to={`/products/${revItem.productId}`}
                              className="shrink-0 overflow-hidden border border-line-light bg-surface"
                            >
                              {revItem.productImageUrl ? (
                                <img
                                  src={revItem.productImageUrl}
                                  alt={revItem.productName}
                                  className="aspect-[3/4] w-14 object-cover"
                                />
                              ) : (
                                <div className="flex aspect-[3/4] w-14 items-center justify-center text-content-muted">
                                  <Package size={20} />
                                </div>
                              )}
                            </Link>

                            <div className="min-w-0">
                              <Link
                                to={`/products/${revItem.productId}`}
                                className="line-clamp-1 text-sm font-semibold text-content-primary hover:underline"
                              >
                                {revItem.productName}
                              </Link>
                              <div className="mt-0.5 text-xs text-content-muted">
                                {revItem.variantInfo || 'Phân loại tiêu chuẩn'}
                              </div>
                              {(() => {
                                const itemPrice = computeOrderItemPricing(order, revItem);
                                return (
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-content-secondary">
                                    <span>
                                      SL: {revItem.quantity} x{' '}
                                      <strong className="font-semibold text-content-primary">
                                        {formatVND(itemPrice.finalUnitPrice)}
                                      </strong>
                                    </span>
                                    {itemPrice.hasDiscount && (
                                      <>
                                        <span className="text-content-muted line-through">
                                          {formatVND(itemPrice.originalUnitPrice)}
                                        </span>
                                        <span className="rounded bg-status-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-status-success">
                                          −{formatVND(itemPrice.totalDiscountOnItem)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Tóm tắt đánh giá đã gửi (nếu có) */}
                              {revItem.reviewed && existingReview && (
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                  <span className="inline-flex items-center gap-0.5 text-amber-400">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        size={12}
                                        className={
                                          star <= existingReview.rating
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'fill-transparent text-line'
                                        }
                                      />
                                    ))}
                                  </span>
                                  <span className="font-semibold text-status-success">
                                    Đã đánh giá
                                  </span>
                                  {imageCount > 0 && (
                                    <span className="text-content-muted">• {imageCount} ảnh</span>
                                  )}
                                  {existingReview.comment && (
                                    <span className="line-clamp-1 max-w-[320px] text-content-secondary">
                                      “{existingReview.comment}”
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Giá dòng sản phẩm & nút Đánh giá / Xem & Sửa */}
                          <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
                            {(() => {
                              const itemPrice = computeOrderItemPricing(order, revItem);
                              return (
                                <div className="text-right">
                                  {itemPrice.hasDiscount && (
                                    <div className="text-xs text-content-muted line-through">
                                      {formatVND(itemPrice.originalTotalPrice)}
                                    </div>
                                  )}
                                  <div className="text-sm font-bold text-content-primary">
                                    {formatVND(itemPrice.finalTotalPrice)}
                                  </div>
                                </div>
                              );
                            })()}

                            <div className="flex flex-wrap items-center gap-2">
                              {revItem.reviewed ? (
                                <>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setActiveReviewItem(revItem)}
                                    className="flex items-center gap-1.5"
                                  >
                                    <Pencil size={13} />
                                    <span>Xem / Sửa Đánh Giá</span>
                                  </Button>
                                  <Link
                                    to={`/products/${revItem.productId}#product-reviews-section`}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-content-secondary underline hover:text-content-primary"
                                    title="Xem đánh giá trên trang sản phẩm"
                                  >
                                    <span>Xem SP</span>
                                    <ExternalLink size={12} />
                                  </Link>
                                </>
                              ) : (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => setActiveReviewItem(revItem)}
                                  className="flex items-center gap-1.5"
                                >
                                  <Star size={13} />
                                  <span>Đánh Giá</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    (order.orderItems || []).map((item: OrderItemResponse) => {
                      const itemPrice = computeOrderItemPricing(order, item);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-4 border-b border-line-light pb-3 last:border-b-0 last:pb-0"
                        >
                          <div className="flex items-center gap-3">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.productName}
                                className="h-14 w-14 shrink-0 rounded-sm border border-line-light object-cover"
                              />
                            ) : (
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm bg-surface text-content-muted">
                                <Package size={20} />
                              </div>
                            )}
                            <div>
                              <div className="line-clamp-1 text-sm font-semibold text-content-primary">
                                {item.productName}
                              </div>
                              <div className="mt-0.5 text-xs text-content-muted">
                                {item.variantInfo || 'Phân loại tiêu chuẩn'}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-content-secondary">
                                <span>
                                  SL: {item.quantity} x{' '}
                                  <strong className="font-semibold text-content-primary">
                                    {formatVND(itemPrice.finalUnitPrice)}
                                  </strong>
                                </span>
                                {itemPrice.hasDiscount && (
                                  <>
                                    <span className="text-content-muted line-through">
                                      {formatVND(itemPrice.originalUnitPrice)}
                                    </span>
                                    <span className="rounded bg-status-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-status-success">
                                      Đã giảm −{formatVND(itemPrice.totalDiscountOnItem)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            {itemPrice.hasDiscount && (
                              <div className="text-xs text-content-muted line-through">
                                {formatVND(itemPrice.originalTotalPrice)}
                              </div>
                            )}
                            <div className="text-sm font-bold text-content-primary">
                              {formatVND(itemPrice.finalTotalPrice)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer thẻ đơn hàng: Tổng tiền & Nút tác vụ trả hàng */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-light bg-surface px-5 py-3.5">
                  {(order.orderStatus === 'DELIVERED' ? order.deliveredAt : order.expectedDeliveryTime) && (
                    <span className="flex items-center gap-1.5 text-xs text-content-secondary">
                      <Truck size={14} className="shrink-0 text-status-success" />
                      <span>
                        {order.orderStatus === 'DELIVERED'
                          ? `Ngày giao: ${formatDateTime(order.deliveredAt)}`
                          : `Ngày giao dự kiến: ${formatDateTime(order.expectedDeliveryTime)}`}
                      </span>
                    </span>
                  )}

                  <div className="ml-auto flex flex-wrap items-center justify-end gap-4">
                    {(() => {
                      const summary = computeOrderSummaryPricing(order);
                      return (
                        <div className="flex flex-wrap items-center justify-end gap-2.5 text-right">
                          {summary.hasDiscount && (
                            <span className="rounded-xs bg-status-success/15 px-1.5 py-0.5 text-xs font-semibold text-status-success">
                              Đã giảm −{formatVND(summary.totalDiscountAmount)}
                            </span>
                          )}
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs text-content-muted">Tổng thanh toán:</span>
                            <strong className="text-base font-bold text-accent-red">
                              {formatVND(summary.finalTotalAmount)}
                            </strong>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Nút yêu cầu trả hàng được kích hoạt dựa trên hạn 7 ngày */}
                    {order.orderStatus === 'PROCESSING' && isCodOrder(order) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setCancelFeedback('');
                          setCancelTarget(order);
                        }}
                        className="border-status-error text-status-error"
                      >
                        Hủy Đơn Hàng
                      </Button>
                    )}
                    {isDelivered ? (
                      eligibleForReturn ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleInitiateReturn(order)}
                          className="flex items-center gap-1.5"
                        >
                          <RotateCcw size={14} />
                          <span>Yêu Cầu Trả Hàng</span>
                        </Button>
                      ) : (
                        <span className="flex items-center gap-1 text-xs italic text-content-muted">
                          <Clock size={12} />
                          Đã quá hạn 7 ngày trả hàng
                        </span>
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal xem chi tiết đơn hàng */}
      <Modal
        isOpen={detailTarget !== null}
        onClose={() => setDetailTarget(null)}
        title={detailTarget ? `Chi tiết đơn hàng ${detailTarget.orderCode || detailTarget.id}` : 'Chi tiết đơn hàng'}
        maxWidth="960px"
      >
        {detailTarget && (
          <div className="space-y-5 text-sm">
            {isDetailLoading && (
              <p className="text-xs text-content-muted">Đang cập nhật dữ liệu đơn hàng...</p>
            )}
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-content-muted">Mã đơn hàng</dt>
                <dd className="font-semibold text-content-primary">
                  {detailTarget.orderCode || `#${detailTarget.id}`}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-content-muted">Mã vận đơn</dt>
                <dd className="font-semibold text-content-primary">
                  {detailTarget.trackingCode?.trim() || 'Chưa có mã vận đơn'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-content-muted">Ngày đặt</dt>
                <dd className="text-content-primary">{formatDateTime(detailTarget.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-content-muted">Trạng thái thanh toán</dt>
                <dd className="text-content-primary">
                  {detailTarget.paymentStatus === 'PAID'
                    ? 'Đã thanh toán'
                    : detailTarget.paymentStatus === 'PENDING_COD'
                    ? 'Chờ thu COD'
                    : detailTarget.paymentStatus === 'PENDING'
                    ? 'Chờ thanh toán'
                    : detailTarget.paymentStatus}
                </dd>
              </div>
              {detailTarget.shippingRecipientName && (
                <div>
                  <dt className="text-xs text-content-muted">Người nhận</dt>
                  <dd className="text-content-primary">{detailTarget.shippingRecipientName}</dd>
                </div>
              )}
              {detailTarget.shippingPhone && (
                <div>
                  <dt className="text-xs text-content-muted">Số điện thoại</dt>
                  <dd className="text-content-primary">{detailTarget.shippingPhone}</dd>
                </div>
              )}
              {detailTarget.shippingAddress && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-content-muted">Địa chỉ giao hàng</dt>
                  <dd className="text-content-primary">{detailTarget.shippingAddress}</dd>
                </div>
              )}
              {(detailTarget.orderStatus === 'DELIVERED'
                ? detailTarget.deliveredAt
                : detailTarget.expectedDeliveryTime) && (
                <div>
                  <dt className="text-xs text-content-muted">
                    {detailTarget.orderStatus === 'DELIVERED'
                      ? 'Ngày giao hàng thành công'
                      : 'Ngày giao hàng dự kiến'}
                  </dt>
                  <dd className={detailTarget.orderStatus === 'DELIVERED' ? 'font-semibold text-status-success' : 'text-content-primary'}>
                    {formatDateTime(
                      detailTarget.orderStatus === 'DELIVERED'
                        ? detailTarget.deliveredAt
                        : detailTarget.expectedDeliveryTime
                    )}
                  </dd>
                </div>
              )}
            </dl>

            <div className="overflow-x-auto border border-line-light">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface text-content-secondary">
                  <tr>
                    <th className="p-3">Sản phẩm</th>
                    <th className="p-3">Phân loại</th>
                    <th className="p-3 text-right">Số lượng</th>
                    <th className="p-3 text-right">Đơn giá</th>
                    <th className="p-3 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {detailTarget.orderItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-5 text-center text-content-muted">
                        Đơn hàng không có thông tin sản phẩm.
                      </td>
                    </tr>
                  ) : (
                    detailTarget.orderItems.map((item) => {
                      const itemPrice = computeOrderItemPricing(detailTarget, item);
                      return (
                        <tr key={item.id} className="border-t border-line-light">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.productName}
                                  className="h-14 w-14 shrink-0 object-cover"
                                />
                              ) : (
                                <div className="grid h-14 w-14 shrink-0 place-items-center bg-surface text-content-muted">
                                  <Package size={18} />
                                </div>
                              )}
                              <span className="font-medium text-content-primary">
                                {item.productName}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-content-secondary">{item.variantInfo || '—'}</td>
                          <td className="p-3 text-right">{item.quantity}</td>
                          <td className="p-3 text-right">
                            {itemPrice.hasDiscount && (
                              <div className="text-[11px] text-content-muted line-through">
                                {formatVND(itemPrice.originalUnitPrice)}
                              </div>
                            )}
                            <div className="font-medium text-content-primary">
                              {formatVND(itemPrice.finalUnitPrice)}
                            </div>
                          </td>
                          <td className="p-3 text-right font-semibold">
                            {itemPrice.hasDiscount && (
                              <div className="text-[11px] font-normal text-content-muted line-through">
                                {formatVND(itemPrice.originalTotalPrice)}
                              </div>
                            )}
                            <div className="font-bold text-content-primary">
                              {formatVND(itemPrice.finalTotalPrice)}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {(() => {
              const summary = computeOrderSummaryPricing(detailTarget);
              const dType = (detailTarget.discountType || '').trim().toUpperCase();
              const dCode = (detailTarget.discountCode || '').trim();
              const orderDiscountLabel =
                dType === 'VOUCHER'
                  ? dCode
                    ? `Giảm giá (Voucher - ${dCode})`
                    : 'Giảm giá (Voucher)'
                  : dType === 'OFFER'
                    ? dCode
                      ? `Giảm giá (Khuyến mãi - ${dCode})`
                      : 'Giảm giá (Khuyến mãi đơn hàng)'
                    : dCode
                      ? `Giảm giá (${dCode})`
                      : 'Giảm giá';

              return (
                <div className="ml-auto max-w-sm space-y-2 border-t border-line-light pt-4 text-right text-sm">
                  <p className="flex justify-between gap-4">
                    <span className="text-content-secondary">Tổng tiền hàng</span>
                    <strong>{formatVND(summary.originalSubtotal)}</strong>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span className="text-content-secondary">Phí vận chuyển</span>
                    <strong>{formatVND(summary.shippingFee)}</strong>
                  </p>
                  {summary.productDiscountAmount > 0 && summary.orderDiscountAmount > 0 ? (
                    <>
                      <p className="flex justify-between gap-4 text-status-success">
                        <span className="text-left">Giảm giá (Khuyến mãi sản phẩm)</span>
                        <strong className="shrink-0">−{formatVND(summary.productDiscountAmount)}</strong>
                      </p>
                      <p className="flex justify-between gap-4 text-status-success">
                        <span className="text-left">{orderDiscountLabel}</span>
                        <strong className="shrink-0">−{formatVND(summary.orderDiscountAmount)}</strong>
                      </p>
                    </>
                  ) : summary.orderDiscountAmount > 0 ? (
                    <p className="flex justify-between gap-4 text-status-success">
                      <span className="text-left">{orderDiscountLabel}</span>
                      <strong className="shrink-0">−{formatVND(summary.orderDiscountAmount)}</strong>
                    </p>
                  ) : summary.productDiscountAmount > 0 ? (
                    <p className="flex justify-between gap-4 text-status-success">
                      <span className="text-left">Giảm giá (Khuyến mãi sản phẩm)</span>
                      <strong className="shrink-0">−{formatVND(summary.productDiscountAmount)}</strong>
                    </p>
                  ) : null}
                  <p className="flex justify-between gap-4 border-t border-line-light pt-2 text-base">
                    <span className="font-semibold">Tổng thanh toán</span>
                    <strong className="text-accent-red">
                      {formatVND(summary.finalTotalAmount)}
                    </strong>
                  </p>
                </div>
              );
            })()}

            {detailTarget.notes && (
              <p className="border-t border-line-light pt-4 text-content-secondary">
                <strong className="text-content-primary">Ghi chú:</strong> {detailTarget.notes}
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Modal tạo / xem & sửa / xóa đánh giá sản phẩm trong đơn hàng */}
      <Modal
        isOpen={cancelTarget !== null}
        onClose={() => {
          if (!isCancelling) setCancelTarget(null);
        }}
        title="Xác nhận hủy đơn hàng"
        maxWidth="460px"
      >
        <div className="space-y-5">
          <p className="text-sm text-content-secondary">
            Bạn có chắc chắn muốn hủy đơn hàng{' '}
            <strong className="text-content-primary">
              #{cancelTarget?.orderCode || cancelTarget?.id}
            </strong>{' '}
            không? Số lượng sản phẩm sẽ được hoàn lại vào kho.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={isCancelling}
              onClick={() => setCancelTarget(null)}
            >
              Không, giữ đơn
            </Button>
            <Button
              variant="primary"
              loading={isCancelling}
              onClick={() => void handleConfirmCancelOrder()}
            >
              Xác nhận hủy
            </Button>
          </div>
        </div>
      </Modal>

      <OrderReviewModal
        isOpen={Boolean(activeReviewItem)}
        item={activeReviewItem}
        onClose={() => setActiveReviewItem(null)}
        onSuccess={handleReviewSuccess}
      />
    </div>
  );
}
