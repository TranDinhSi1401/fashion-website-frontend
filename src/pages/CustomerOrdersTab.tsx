/**
 * Tab hiển thị danh sách đơn hàng của khách hàng (Customer Orders Tab - C1).
 * Tích hợp trong ProfilePage (/account/orders).
 * Cung cấp nút "Yêu cầu trả hàng / Hoàn tiền" chỉ kích hoạt khi đơn hàng ở trạng thái DELIVERED
 * và thời gian giao hàng còn trong hạn 7 ngày lịch (isOrderEligibleForReturn).
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, RotateCcw, Clock, AlertCircle, CheckCircle, Truck, ExternalLink } from 'lucide-react';
import { orderService } from '../services/orderService';
import type { OrderWithItems, OrderItemResponse } from '../types/order';
import { isOrderEligibleForReturn, formatVND, formatDateTime } from '../utils/returnHelpers';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { cn } from '../utils/cn';

type CustomerOrderFilter = 'ALL' | 'PROCESSING' | 'SHIPPING' | 'DELIVERED';

const CUSTOMER_ORDER_FILTERS: { value: CustomerOrderFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'SHIPPING', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Giao thành công' },
];

/**
 * Chức năng: Hiển thị danh sách các đơn hàng đã mua của khách hàng và điều kiện tạo phiếu trả hàng.
 *
 * @returns Đầu ra: Thẻ JSX danh sách đơn hàng.
 */
export default function CustomerOrdersTab() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<CustomerOrderFilter>('ALL');

  // Tải danh sách đơn hàng của khách hàng từ orderService
  useEffect(() => {
    let isMounted = true;

    async function fetchOrders() {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const data = await orderService.getMyOrders();
        if (isMounted) {
          setOrders(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err?.message || 'Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  // Điều hướng sang trang tạo phiếu trả hàng C2 kèm truyền state đơn hàng
  const handleInitiateReturn = (order: OrderWithItems) => {
    navigate(`/account/returns/new?orderId=${order.id}`, {
      state: { order },
    });
  };

  // Trạng thái đang tải dữ liệu
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-content-muted">
        <div className="w-8 h-8 border-2 border-line border-t-primary rounded-full animate-spin mb-3" />
        <p className="text-sm">Đang tải danh sách đơn hàng của bạn...</p>
      </div>
    );
  }

  // Trạng thái gặp lỗi khi gọi API
  if (errorMessage) {
    return (
      <div className="p-6 bg-surface border border-line-light rounded-sm text-center">
        <AlertCircle size={32} className="mx-auto text-status-error mb-2" />
        <p className="text-sm text-content-primary font-medium mb-4">{errorMessage}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Thử Lại
        </Button>
      </div>
    );
  }

  // Trạng thái chưa có đơn hàng nào
  if (orders.length === 0) {
    return (
      <div className="p-12 bg-surface border border-line-light rounded-sm text-center">
        <Package size={40} className="mx-auto text-content-muted mb-3" />
        <h4 className="text-base font-bold text-content-primary mb-1">
          Bạn chưa có đơn hàng nào
        </h4>
        <p className="text-xs text-content-muted mb-5">
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
          <p className="text-xs text-content-muted mt-0.5">
            Quản lý lịch sử mua hàng và theo dõi điều kiện đổi trả trong vòng 7 ngày
          </p>
        </div>
        <span className="text-xs font-semibold text-content-muted">
          Tổng cộng: <strong className="text-content-primary">{supportedOrders.length}</strong> đơn
        </span>
      </div>

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
        ) : filteredOrders.map((order) => {
          const eligibleForReturn = isOrderEligibleForReturn(order);
          const isDelivered = order.orderStatus === 'DELIVERED';

          return (
            <div
              key={order.id}
              className="border border-line-light bg-surface-body rounded-card overflow-hidden transition-shadow hover:shadow-dropdown"
            >
              {/* Header thẻ đơn hàng */}
              <div className="bg-surface px-5 py-3.5 border-b border-line-light flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-content-primary">
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
                      : order.orderStatus === 'CANCELLED'
                      ? 'Đã hủy'
                      : order.orderStatus || 'Đang xử lý'}
                  </Badge>

                  {order.paymentStatus && (
                    <Badge variant={order.paymentStatus === 'PAID' ? 'dark' : 'warning'}>
                      {order.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Danh sách sản phẩm trong đơn hàng */}
              <div className="p-5 flex flex-col gap-3">
                {(order.orderItems || []).map((item: OrderItemResponse) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 border-b border-line-light pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
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
                        <div className="text-sm font-semibold text-content-primary line-clamp-1">
                          {item.productName}
                        </div>
                        <div className="text-xs text-content-muted mt-0.5">
                          {item.variantInfo || 'Phân loại tiêu chuẩn'}
                        </div>
                        <div className="text-xs text-content-secondary mt-1">
                          SL: {item.quantity} x {formatVND(item.unitPrice)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-content-primary">
                        {formatVND(item.totalPrice || item.unitPrice * item.quantity)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer thẻ đơn hàng: Tổng tiền & Nút tác vụ trả hàng */}
              <div className="bg-surface px-5 py-3.5 border-t border-line-light flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-content-secondary">
                  {order.deliveredAt ? (
                    <span className="flex items-center gap-1.5">
                      <Truck size={14} className="text-status-success shrink-0" />
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
                    <span className="text-xs text-content-muted mr-1.5">Tổng thanh toán:</span>
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
                      <span className="text-xs text-content-muted italic flex items-center gap-1">
                        <Clock size={12} />
                        Đã quá hạn 7 ngày trả hàng
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-content-muted italic">
                      Chỉ trả hàng sau khi đã nhận
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
