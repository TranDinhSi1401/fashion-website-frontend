import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Eye, RefreshCw, Search } from 'lucide-react';
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
          setTotalElements(response.data?.totalElements || 0);
          setTotalPages(response.data?.totalPages || 0);
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

  return (
    <div className="container py-8">
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

      <form
        onSubmit={handleSearch}
        className="mb-6 grid grid-cols-1 items-end gap-3 border border-line-light bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
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
          label="Mã đơn hàng chính xác"
          value={filterForm.orderCode}
          onChange={(event) =>
            setFilterForm((current) => ({ ...current, orderCode: event.target.value }))
          }
          placeholder="Ví dụ: FWD1-20261117-305"
        />
        <Input
          label="Ngày tạo"
          type="date"
          value={filterForm.createdAt}
          onChange={(event) =>
            setFilterForm((current) => ({ ...current, createdAt: event.target.value }))
          }
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
        >
          <option value="">Tất cả trạng thái</option>
          {ORDER_STATUS_OPTIONS.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </Select>
        <Select
          label="Trạng thái thanh toán"
          value={filterForm.paymentStatus}
          onChange={(event) =>
            setFilterForm((current) => ({
              ...current,
              paymentStatus: event.target.value as PaymentStatus | '',
            }))
          }
        >
          <option value="">Tất cả trạng thái</option>
          {PAYMENT_STATUS_OPTIONS.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </Select>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" icon={Search} disabled={isLoading}>
            Tìm đơn hàng
          </Button>
          <Button type="button" variant="secondary" onClick={handleResetFilters}>
            Đặt lại
          </Button>
        </div>
      </form>

      {errorMessage && (
        <div
          role="alert"
          className="mb-5 flex items-center gap-2 border border-status-error bg-surface p-4 text-sm text-status-error"
        >
          <AlertCircle size={18} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="mb-3 text-xs text-content-secondary">
        Tổng số đơn hàng: <strong className="font-mono text-content-primary">{totalElements}</strong>
      </div>

      <div className="overflow-x-auto border border-line-light bg-surface-body">
        <table className="w-full border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-line-light bg-surface text-[0.7rem] font-bold uppercase tracking-wide text-content-secondary">
              <th className="p-3">Mã đơn hàng</th>
              <th className="p-3">ID người dùng</th>
              <th className="p-3">Ngày tạo</th>
              <th className="p-3">Trạng thái đơn</th>
              <th className="p-3">Thanh toán</th>
              <th className="p-3 text-right">Tổng tiền</th>
              <th className="p-3 text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-content-muted">
                  Đang tải danh sách đơn hàng...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-content-muted">
                  Không tìm thấy đơn hàng phù hợp.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-line-light transition-colors last:border-b-0 hover:bg-surface"
                >
                  <td className="p-3 font-semibold text-content-primary">
                    {order.orderCode || `#${order.id}`}
                  </td>
                  <td className="p-3 text-content-secondary">#{order.userId}</td>
                  <td className="p-3 whitespace-nowrap text-content-secondary">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={
                        order.orderStatus === 'DELIVERED'
                          ? 'success'
                          : order.orderStatus === 'CANCELLED' ||
                              order.orderStatus === 'SYSTEM_CANCELED'
                            ? 'error'
                            : 'default'
                      }
                    >
                      {ORDER_STATUS_LABELS[order.orderStatus] || order.orderStatus}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant={order.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                      {PAYMENT_STATUS_LABELS[order.paymentStatus as PaymentStatus] ||
                        order.paymentStatus}
                    </Badge>
                  </td>
                  <td className="p-3 text-right font-semibold text-content-primary">
                    {formatCurrencyVND(order.totalAmount)}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Eye}
                      onClick={() => setSelectedOrder(order)}
                    >
                      Xem
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && totalPages > 0 && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <p className="text-xs text-content-muted">
            Hiển thị {currentPage * 10 + 1}–
            {Math.min((currentPage + 1) * 10, totalElements)} trên {totalElements} đơn hàng
          </p>
          <Pagination
            currentPage={currentPage + 1}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page - 1)}
          />
        </div>
      )}

      <Modal
        isOpen={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Chi tiết đơn hàng ${selectedOrder.orderCode}` : 'Chi tiết đơn hàng'}
        maxWidth="960px"
      >
        {selectedOrder && (
          <div className="space-y-5 text-sm">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-content-muted">Mã đơn hàng</dt>
                <dd className="font-semibold text-content-primary">{selectedOrder.orderCode}</dd>
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
                        <td className="p-3 font-medium text-content-primary">
                          {item.productName}
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
          </div>
        )}
      </Modal>
    </div>
  );
}
