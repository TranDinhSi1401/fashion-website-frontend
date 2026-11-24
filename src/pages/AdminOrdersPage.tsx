import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Package,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Truck,
  X,
} from 'lucide-react';
import AdminNav from '../components/admin/AdminNav';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import Select from '../components/ui/Select';
import { orderService } from '../services/orderService';
import type {
  OrderResponse,
  OrderSearchFilters,
  OrderStatus,
  PaymentStatus,
} from '../services/orderService';
import { extractErrorMessage, formatCurrencyVND } from '../utils/format';
import { formatDateTime } from '../utils/returnHelpers';
import ui from './AdminOrdersPage.module.css';

const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'SHIPPING', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'SYSTEM_CANCELED', label: 'Hệ thống đã hủy' },
  { value: 'RETURNED', label: 'Đã trả hàng' },
];

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'PENDING', label: 'Chờ thanh toán' },
  { value: 'PENDING_COD', label: 'Chờ thu COD' },
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'FAILED', label: 'Thất bại' },
  { value: 'EXPIRED', label: 'Hết hạn' },
  { value: 'PARTIALLY_PAID', label: 'Thanh toán một phần' },
  { value: 'REFUNDED', label: 'Đã hoàn tiền' },
];

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  SYSTEM_CANCELED: 'Hệ thống đã hủy',
  RETURNED: 'Đã trả hàng',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Chờ thanh toán',
  PENDING_COD: 'Chờ thu COD',
  PAID: 'Đã thanh toán',
  FAILED: 'Thất bại',
  EXPIRED: 'Hết hạn',
  PARTIALLY_PAID: 'Thanh toán một phần',
  REFUNDED: 'Đã hoàn tiền',
};

interface OrderFilterForm {
  userId: string;
  orderCode: string;
  createdAt: string;
  orderStatus: OrderStatus | '';
  paymentStatus: PaymentStatus | '';
}

const EMPTY_FILTER_FORM: OrderFilterForm = {
  userId: '',
  orderCode: '',
  createdAt: '',
  orderStatus: '',
  paymentStatus: '',
};

export default function AdminOrdersPage() {
  const [filterForm, setFilterForm] = useState<OrderFilterForm>(EMPTY_FILTER_FORM);
  const [filters, setFilters] = useState<OrderSearchFilters>({});
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [statusActionMessage, setStatusActionMessage] = useState('');
  const [statusActionError, setStatusActionError] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const handleOpenOrderDetail = async (order: OrderResponse) => {
    setStatusActionMessage('');
    setStatusActionError('');
    setSelectedOrder(order);
    setIsDetailLoading(true);
    try {
      const detail = await orderService.getOrderById(order.id);
      setSelectedOrder({
        ...order,
        ...detail,
        orderStatus: detail.orderStatus as OrderStatus,
        paymentStatus: detail.paymentStatus as PaymentStatus,
        discountAmount: detail.discountAmount ?? order.discountAmount ?? 0,
        orderItems: detail.orderItems,
      });
    } catch (error) {
      setStatusActionError(extractErrorMessage(error, 'Không thể tải dữ liệu mới nhất của đơn hàng.'));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const canShipOrder = (order: OrderResponse) =>
    order.orderStatus === 'PROCESSING' &&
    (order.paymentStatus === 'PAID' || order.paymentStatus === 'PENDING_COD');

  const canDeliverOrder = (order: OrderResponse) => order.orderStatus === 'SHIPPING';

  const handleUpdateOrderStatus = async (order: OrderResponse, status: 'SHIPPING' | 'DELIVERED') => {
    setStatusActionLoading(true);
    setStatusActionError('');
    setStatusActionMessage('');

    try {
      const response = await orderService.updateOrderStatus(order.id, status);
      const updated = response.data;
      if (selectedOrder?.id === order.id && updated) {
        setSelectedOrder((current) =>
          current ? { ...current, ...updated, orderStatus: updated.orderStatus } : current
        );
      }
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id && updated ? { ...item, ...updated } : item
        )
      );
      setStatusActionMessage(
        status === 'SHIPPING'
          ? 'Đơn hàng đã chuyển sang trạng thái đang giao.'
          : 'Đơn hàng đã được xác nhận giao thành công.'
      );
    } catch (error) {
      setStatusActionError(
        extractErrorMessage(error, 'Không thể cập nhật trạng thái đơn hàng.')
      );
    } finally {
      setStatusActionLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await orderService.searchOrders({
          ...filters,
          page: currentPage,
        });

        if (active) {
          setOrders(response.data?.content || []);
          setTotalElements(response.data?.page?.totalElements || 0);
          setTotalPages(response.data?.page?.totalPages || 0);
        }
      } catch (error) {
        if (active) {
          setOrders([]);
          setTotalElements(0);
          setTotalPages(0);
          setErrorMessage(extractErrorMessage(error, 'Không thể tải danh sách đơn hàng.'));
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadOrders();

    return () => {
      active = false;
    };
  }, [currentPage, filters, refreshVersion]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedUserId = filterForm.userId.trim();
    const userId = trimmedUserId ? Number(trimmedUserId) : undefined;
    if (trimmedUserId && (!Number.isSafeInteger(userId) || (userId ?? 0) <= 0)) {
      setErrorMessage('ID người dùng phải là số nguyên dương.');
      return;
    }

    const nextFilters: OrderSearchFilters = {};
    if (userId !== undefined) nextFilters.user_id = userId;
    if (filterForm.orderCode.trim()) nextFilters.order_code = filterForm.orderCode.trim();
    if (filterForm.createdAt) nextFilters.created_at = filterForm.createdAt;
    if (filterForm.orderStatus) nextFilters.order_status = filterForm.orderStatus;
    if (filterForm.paymentStatus) nextFilters.payment_status = filterForm.paymentStatus;

    setErrorMessage('');
    setCurrentPage(0);
    setFilters(nextFilters);
  };

  const handleResetFilters = () => {
    setFilterForm(EMPTY_FILTER_FORM);
    setFilters({});
    setCurrentPage(0);
    setErrorMessage('');
  };

  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== undefined && value !== ''
  ).length;

  return (
    <div className={ui.page}>
    <div className="container py-8 sm:py-10">
      <AdminNav
        title="Quản Lý Đơn Hàng"
        subtitle={`Tìm kiếm, lọc và theo dõi ${totalElements} đơn hàng trên hệ thống.`}
        actions={
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={() => setRefreshVersion((version) => version + 1)}
            loading={isLoading}
          >
            Làm Mới
          </Button>
        }
      />
      <section className={ui.workspace} aria-labelledby="order-list-heading">
        <div className={ui.listHeading}>
          <div className={ui.titleGroup}>
            <span className={ui.sectionIcon}><Package size={20} /></span>
            <div>
              <div className={ui.titleLine}>
                <h2 id="order-list-heading">Danh sách đơn hàng</h2>
                <span className={ui.count}>{totalElements}</span>
              </div>
              <p>Quản lý trạng thái và tiến trình giao hàng.</p>
            </div>
          </div>
          <span className={ui.liveLabel}><span /> Dữ liệu cửa hàng</span>
        </div>

        <form onSubmit={handleSearch} className={ui.filters}>
          <div className={ui.primaryFilters}>
            <Input
              label="Mã đơn hàng"
              icon={Search}
              value={filterForm.orderCode}
              onChange={(event) =>
                setFilterForm((current) => ({ ...current, orderCode: event.target.value }))
              }
              placeholder="Mã đơn hàng..."
            />
            <Select
              label="Trạng thái đơn hàng"
              value={filterForm.orderStatus}
              onChange={(event) =>
                setFilterForm((current) => ({
                  ...current,
                  orderStatus: event.target.value as OrderStatus | '',
                }))
              }
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                ...ORDER_STATUS_OPTIONS.map((status) => ({
                  value: status.value,
                  label: status.label,
                })),
              ]}
            />
            <Select
              label="Trạng thái thanh toán"
              value={filterForm.paymentStatus}
              onChange={(event) =>
                setFilterForm((current) => ({
                  ...current,
                  paymentStatus: event.target.value as PaymentStatus | '',
                }))
              }
              options={[
                { value: '', label: 'Tất cả thanh toán' },
                ...PAYMENT_STATUS_OPTIONS.map((status) => ({
                  value: status.value,
                  label: status.label,
                })),
              ]}
            />
            <button
              type="button"
              className={`${ui.filterToggle} ${advancedFilters ? ui.filterToggleActive : ''}`}
              aria-expanded={advancedFilters}
              aria-controls="advanced-order-filters"
              onClick={() => setAdvancedFilters((current) => !current)}
            >
              <SlidersHorizontal size={16} />
              <span>Lọc nâng cao</span>
              <ChevronDown size={14} />
            </button>
          </div>

          {advancedFilters && (
            <div id="advanced-order-filters" className={ui.advancedFilters}>
              <Input
                label="ID người dùng"
                type="number"
                min="1"
                step="1"
                value={filterForm.userId}
                onChange={(event) =>
                  setFilterForm((current) => ({ ...current, userId: event.target.value }))
                }
                placeholder="Ví dụ: 12"
              />
              <Input
                label="Ngày tạo"
                type="date"
                value={filterForm.createdAt}
                onChange={(event) =>
                  setFilterForm((current) => ({ ...current, createdAt: event.target.value }))
                }
              />
            </div>
          )}

          <div className={ui.filterFooter}>
            <span>
              {activeFilterCount ? (
                <><strong>{activeFilterCount}</strong> bộ lọc đang áp dụng</>
              ) : (
                'Hiển thị tất cả đơn hàng'
              )}
            </span>
            <div>
              <button type="button" className={ui.resetButton} onClick={handleResetFilters}>
                <X size={14} /> Xóa bộ lọc
              </button>
              <Button type="submit" size="sm" icon={Search} disabled={isLoading}>
                Tìm kiếm
              </Button>
            </div>
          </div>
        </form>

      {errorMessage && (
        <p role="alert" className={ui.alertError}>
          <AlertCircle size={16} />
          {errorMessage}
        </p>
      )}

      <div className={ui.tableWrap} aria-busy={isLoading}>
        <table className={ui.table}>
          <thead>
            <tr>
              {['Mã đơn hàng', 'Người dùng', 'Ngày tạo', 'Trạng thái đơn', 'Thanh toán', 'Tổng tiền', 'Thao tác'].map((heading) => (
                <th key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7}>
                  <div className={ui.emptyState}>
                    <RefreshCw size={25} className="animate-spin" />
                    <strong>Đang tải đơn hàng…</strong>
                  </div>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className={ui.emptyState}>
                    <Package size={32} />
                    <strong>Không tìm thấy đơn hàng</strong>
                    <span>Thử thay đổi từ khóa hoặc bỏ bớt bộ lọc.</span>
                    <button type="button" className={ui.resetButton} onClick={handleResetFilters}>
                      <X size={14} /> Xóa bộ lọc
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td data-label="Mã đơn hàng">
                    <strong className={ui.orderCode}>{order.orderCode || `#${order.id}`}</strong>
                  </td>
                  <td data-label="Người dùng">#{order.userId}</td>
                  <td data-label="Ngày tạo" className={ui.dateCell}>
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td data-label="Trạng thái đơn">
                    <span className={`${ui.status} ${order.orderStatus === 'DELIVERED' ? ui.statusSuccess : order.orderStatus === 'CANCELLED' || order.orderStatus === 'SYSTEM_CANCELED' ? ui.statusError : ui.statusDefault}`}>
                      <span />
                      {ORDER_STATUS_LABELS[order.orderStatus] || order.orderStatus}
                    </span>
                  </td>
                  <td data-label="Thanh toán">
                    <span className={`${ui.status} ${order.paymentStatus === 'PAID' ? ui.statusSuccess : ui.statusWarning}`}>
                      <span />
                      {PAYMENT_STATUS_LABELS[order.paymentStatus as PaymentStatus] ||
                        order.paymentStatus}
                    </span>
                  </td>
                  <td data-label="Tổng tiền" className={ui.price}>
                    {formatCurrencyVND(order.totalAmount)}
                  </td>
                  <td className={ui.actionsCell}>
                    <div className={ui.rowActions}>
                      {canShipOrder(order) && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Truck}
                          title="Chuyển đơn sang đang giao"
                          aria-label={`Chuyển đơn hàng ${order.orderCode || order.id} sang đang giao`}
                          loading={statusActionLoading}
                          className={ui.statusActionButton}
                          onClick={() => void handleUpdateOrderStatus(order, 'SHIPPING')}
                        >
                          <span>Giao hàng</span>
                        </Button>
                      )}
                      {canDeliverOrder(order) && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={CheckCircle2}
                          title="Xác nhận đã giao"
                          aria-label={`Xác nhận đơn hàng ${order.orderCode || order.id} đã giao`}
                          loading={statusActionLoading}
                          className={ui.statusActionButton}
                          onClick={() => void handleUpdateOrderStatus(order, 'DELIVERED')}
                        >
                          <span>Đã giao</span>
                        </Button>
                      )}
                      <button
                        type="button"
                        title="Xem chi tiết"
                        aria-label={`Xem chi tiết đơn hàng ${order.orderCode || order.id}`}
                        onClick={() => void handleOpenOrderDetail(order)}
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && totalPages > 0 && (
        <div className={ui.pagination}>
          <div className={ui.resultRange}>
            Hiển thị <strong>{currentPage * 10 + 1}–{Math.min((currentPage + 1) * 10, totalElements)}</strong> trong <strong>{totalElements}</strong> đơn hàng
          </div>
          <div className={ui.pageButtons}>
            <button type="button" aria-label="Trang trước" disabled={currentPage === 0} onClick={() => setCurrentPage((page) => page - 1)}>
              <ChevronLeft size={16} />
            </button>
            <span>{currentPage + 1} <small>/ {totalPages}</small></span>
            <button type="button" aria-label="Trang sau" disabled={currentPage + 1 >= totalPages} onClick={() => setCurrentPage((page) => page + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
      </section>

      <Modal
        isOpen={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Chi tiết đơn hàng ${selectedOrder.orderCode}` : 'Chi tiết đơn hàng'}
        maxWidth="960px"
      >
        {selectedOrder && (
          <div className="space-y-5 text-sm">
            {isDetailLoading && (
              <p className="text-xs text-content-muted">Đang cập nhật dữ liệu đơn hàng...</p>
            )}
            {(statusActionMessage || statusActionError) && (
              <div
                role="alert"
                className={`flex items-center gap-2 border p-3 text-sm ${
                  statusActionError
                    ? 'border-status-error text-status-error'
                    : 'border-status-success text-status-success'
                }`}
              >
                {statusActionError ? (
                  <AlertCircle size={17} />
                ) : (
                  <CheckCircle2 size={17} />
                )}
                <span>{statusActionError || statusActionMessage}</span>
              </div>
            )}
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-content-muted">Mã đơn hàng</dt>
                <dd className="font-semibold text-content-primary">{selectedOrder.orderCode}</dd>
              </div>
              <div>
                <dt className="text-xs text-content-muted">Mã vận đơn</dt>
                <dd className="font-semibold text-content-primary">
                  {selectedOrder.trackingCode?.trim() || 'Chưa có mã vận đơn'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-content-muted">ID người dùng</dt>
                <dd className="font-semibold text-content-primary">#{selectedOrder.userId}</dd>
              </div>
              <div>
                <dt className="text-xs text-content-muted">Ngày tạo</dt>
                <dd className="text-content-primary">{formatDateTime(selectedOrder.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-content-muted">Trạng thái đơn hàng</dt>
                <dd className="text-content-primary">
                  {ORDER_STATUS_LABELS[selectedOrder.orderStatus] || selectedOrder.orderStatus}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-content-muted">Trạng thái thanh toán</dt>
                <dd className="text-content-primary">
                  {PAYMENT_STATUS_LABELS[selectedOrder.paymentStatus as PaymentStatus] ||
                    selectedOrder.paymentStatus}
                </dd>
              </div>
              {selectedOrder.deliveredAt && (
                <div>
                  <dt className="text-xs text-content-muted">Ngày giao hàng thành công</dt>
                  <dd className="font-semibold text-status-success">
                    {formatDateTime(selectedOrder.deliveredAt)}
                  </dd>
                </div>
              )}
              {!selectedOrder.deliveredAt && selectedOrder.expectedDeliveryTime && (
                <div>
                  <dt className="text-xs text-content-muted">Ngày giao hàng dự kiến</dt>
                  <dd className="text-content-primary">
                    {formatDateTime(selectedOrder.expectedDeliveryTime)}
                  </dd>
                </div>
              )}
              {selectedOrder.shippingRecipientName && (
                <div>
                  <dt className="text-xs text-content-muted">Người nhận</dt>
                  <dd className="text-content-primary">{selectedOrder.shippingRecipientName}</dd>
                </div>
              )}
              {selectedOrder.shippingPhone && (
                <div>
                  <dt className="text-xs text-content-muted">Số điện thoại</dt>
                  <dd className="text-content-primary">{selectedOrder.shippingPhone}</dd>
                </div>
              )}
              {selectedOrder.shippingAddress && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-content-muted">Địa chỉ giao hàng</dt>
                  <dd className="text-content-primary">{selectedOrder.shippingAddress}</dd>
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
                  {(selectedOrder.orderItems || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-5 text-center text-content-muted">
                        Đơn hàng không có thông tin sản phẩm.
                      </td>
                    </tr>
                  ) : (
                    selectedOrder.orderItems?.map((item) => (
                      <tr key={item.id} className="border-t border-line-light">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.productName}
                                className="h-14 w-14 shrink-0 rounded-sm border border-line-light object-cover"
                              />
                            ) : (
                              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-sm border border-line-light bg-surface text-content-muted">
                                <Package size={18} />
                              </div>
                            )}
                            <span className="font-medium text-content-primary">
                              {item.productName}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-content-secondary">
                          {item.variantInfo || '—'}
                        </td>
                        <td className="p-3 text-right">{item.quantity}</td>
                        <td className="p-3 text-right">{formatCurrencyVND(item.unitPrice)}</td>
                        <td className="p-3 text-right font-semibold">
                          {formatCurrencyVND(item.totalPrice)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="ml-auto max-w-sm space-y-2 border-t border-line-light pt-4 text-right text-sm">
              <p className="flex justify-between gap-4">
                <span className="text-content-secondary">Tạm tính</span>
                <strong>{formatCurrencyVND(selectedOrder.subtotal)}</strong>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-content-secondary">Phí vận chuyển</span>
                <strong>{formatCurrencyVND(selectedOrder.shippingFee)}</strong>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-content-secondary">Giảm giá</span>
                <strong>{formatCurrencyVND(selectedOrder.discountAmount)}</strong>
              </p>
              <p className="flex justify-between gap-4 border-t border-line-light pt-2 text-base">
                <span className="font-semibold">Tổng thanh toán</span>
                <strong className="text-content-primary">
                  {formatCurrencyVND(selectedOrder.totalAmount)}
                </strong>
              </p>
            </div>

            {selectedOrder.notes && (
              <p className="border-t border-line-light pt-4 text-content-secondary">
                <strong className="text-content-primary">Ghi chú:</strong> {selectedOrder.notes}
              </p>
            )}

            {(canShipOrder(selectedOrder) || canDeliverOrder(selectedOrder)) && (
              <div className="flex flex-wrap justify-end gap-2 border-t border-line-light pt-4">
                {canShipOrder(selectedOrder) && (
                  <Button
                    variant="primary"
                    icon={Truck}
                    loading={statusActionLoading}
                    onClick={() =>
                      void handleUpdateOrderStatus(selectedOrder, 'SHIPPING')
                    }
                  >
                    Chuyển sang đang giao
                  </Button>
                )}
                {canDeliverOrder(selectedOrder) && (
                  <Button
                    variant="primary"
                    icon={CheckCircle2}
                    loading={statusActionLoading}
                    onClick={() =>
                      void handleUpdateOrderStatus(selectedOrder, 'DELIVERED')
                    }
                  >
                    Xác nhận đã giao
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
    </div>
  );
}
