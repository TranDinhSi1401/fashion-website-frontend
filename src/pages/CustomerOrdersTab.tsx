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
import OrderReviewModal from '../components/product/OrderReviewModal';
import { cn } from '../utils/cn';

type CustomerOrderFilter = 'ALL' | 'PROCESSING' | 'SHIPPING' | 'DELIVERED';

const CUSTOMER_ORDER_FILTERS: { value: CustomerOrderFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'SHIPPING', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Giao thành công' },
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
      order.orderStatus === 'DELIVERED'
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
                              <div className="mt-1 text-xs text-content-secondary">
                                SL: {revItem.quantity} x {formatVND(revItem.unitPrice)}
                              </div>

                              {/* Tóm tắt đánh giá đã gửi (nếu có) */}
                              {revItem.reviewed && existingReview && (
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                  <span className="inline-flex items-center gap-0.5 text-primary">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        size={12}
                                        className={
                                          star <= existingReview.rating
                                            ? 'fill-primary text-primary'
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
                            <div className="text-sm font-bold text-content-primary">
                              {formatVND(
                                revItem.totalPrice || revItem.unitPrice * revItem.quantity
                              )}
                            </div>

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
                    (order.orderItems || []).map((item: OrderItemResponse) => (
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
                            <div className="mt-1 text-xs text-content-secondary">
                              SL: {item.quantity} x {formatVND(item.unitPrice)}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-sm font-bold text-content-primary">
                            {formatVND(item.totalPrice || item.unitPrice * item.quantity)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer thẻ đơn hàng: Tổng tiền & Nút tác vụ trả hàng */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-light bg-surface px-5 py-3.5">
                  <div className="text-xs text-content-secondary">
                    {order.deliveredAt ? (
                      <span className="flex items-center gap-1.5">
                        <Truck size={14} className="shrink-0 text-status-success" />
                        <span>Ngày nhận hàng: {formatDateTime(order.deliveredAt)}</span>
                      </span>
                    ) : order.orderStatus === 'CANCELLED' ? (
                      <span>Đơn hàng đã hủy</span>
                    ) : (
                      <span>Đơn hàng chưa hoàn tất giao nhận</span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="mr-1.5 text-xs text-content-muted">Tổng thanh toán:</span>
                      <strong className="text-base text-content-primary">
                        {formatVND(order.totalAmount || order.subtotal)}
                      </strong>
                    </div>

                    {/* Nút yêu cầu trả hàng được kích hoạt dựa trên hạn 7 ngày */}
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
                    ) : (
                      <span className="text-xs italic text-content-muted">
                        Chỉ trả hàng sau khi đã nhận
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal tạo / xem & sửa / xóa đánh giá sản phẩm trong đơn hàng */}
      <OrderReviewModal
        isOpen={Boolean(activeReviewItem)}
        item={activeReviewItem}
        onClose={() => setActiveReviewItem(null)}
        onSuccess={handleReviewSuccess}
      />
    </div>
  );
}
