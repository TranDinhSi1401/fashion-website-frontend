import React, { useCallback, useEffect, useState } from 'react';
import {
  BellRing,
  AlertCircle,
  CheckCircle2,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  Package,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import AdminNav from '../components/admin/AdminNav';
import { orderService, OrderResponse, OrderStatus } from '../services/orderService';
import { useWsStatus } from '../ws/WebSocketProvider';
import { Badge, Button, Select } from '../components/ui';
import { extractErrorMessage, formatCurrencyVND } from '../utils/format';
import { cn } from '../utils/cn';

const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'PENDING_PAYMENT', label: 'PENDING_PAYMENT (Chờ thanh toán)' },
  { value: 'PROCESSING', label: 'PROCESSING (Đang xử lý)' },
  { value: 'SHIPPING', label: 'SHIPPING (Đang giao hàng)' },
  { value: 'DELIVERED', label: 'DELIVERED (Đã giao thành công)' },
  { value: 'CANCELLED', label: 'CANCELLED (Đã hủy)' },
  { value: 'RETURNED', label: 'RETURNED (Đã trả hàng)' },
];

export default function AdminNotificationsPage() {
  const status = useWsStatus();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [targetOrderStatus, setTargetOrderStatus] = useState<OrderStatus>('SHIPPING');
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderNotice, setOrderNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await orderService.getAllOrders();
      if (res?.data) {
        const sorted = [...res.data].sort((a, b) => b.id - a.id);
        setOrders(sorted);
        if (sorted.length > 0 && !selectedOrderId) {
          setSelectedOrderId(String(sorted[0].id));
        }
      }
    } catch (err) {
      console.warn('Could not load orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  }, [selectedOrderId]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handleTriggerOrderStatusNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    setUpdatingOrder(true);
    setOrderNotice(null);
    try {
      const updated = await orderService.updateOrderStatus(Number(selectedOrderId), targetOrderStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === Number(selectedOrderId) ? { ...o, orderStatus: targetOrderStatus } : o))
      );
      setOrderNotice({
        type: 'success',
        text: `Đã cập nhật đơn hàng #${updated.data?.id || selectedOrderId} sang trạng thái ${targetOrderStatus} và kích hoạt sự kiện OrderStatusChangedEvent để đẩy thông báo realtime!`,
      });
    } catch (err) {
      setOrderNotice({
        type: 'error',
        text: extractErrorMessage(err, 'Không thể cập nhật trạng thái đơn hàng'),
      });
    } finally {
      setUpdatingOrder(false);
    }
  };

  const selectedOrder = orders.find((o) => String(o.id) === selectedOrderId);

  return (
    <div className="container py-8">
      <AdminNav
        title="Trung Tâm Thông Báo Realtime & Sự Kiện Đơn Hàng"
        subtitle="Quản lý và kích hoạt sự kiện thông báo đơn hàng realtime (OrderStatusChangedEvent) qua STOMP WebSocket"
        actions={
          <div className="flex items-center gap-2.5">
            <Badge
              variant={status === 'CONNECTED' ? 'success' : 'error'}
              className="flex items-center gap-1.5 px-3 py-1"
            >
              {status === 'CONNECTED' ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span>{status === 'CONNECTED' ? 'STOMP CONNECTED' : 'DISCONNECTED'}</span>
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={() => void loadOrders()}
              loading={loadingOrders}
            >
              Làm Mới
            </Button>
          </div>
        }
      />

      {/* Thông tin bàn giao kiến trúc cho thành viên phụ trách */}
      <div className="mb-6 border-l-4 border-l-accent-gold border border-line bg-surface-elevated p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-accent-gold mt-0.5 shrink-0" />
          <div className="text-xs">
            <h4 className="m-0 font-bold uppercase tracking-wider text-content-primary">
              Phân Hệ Thông Báo Đơn Hàng &amp; Quản Lý Sự Kiện Realtime
            </h4>
            <p className="m-0 mt-1 text-content-secondary leading-relaxed">
              Mục này được tách biệt thành phân hệ độc lập để thành viên phụ trách tiếp tục hoàn thiện các luồng: 
              <strong> Thông báo thay đổi trạng thái đơn hàng</strong>, <strong>Thông báo khiếu nại hoàn trả</strong>, 
              và <strong>Lịch sử thông báo hệ thống</strong>. Phần Chat hỗ trợ trực tuyến khách hàng được quy hoạch tại tab <em>Chat Hỗ Trợ Khách Hàng</em>.
            </p>
          </div>
        </div>
      </div>

      {/* Form kích hoạt cập nhật trạng thái đơn hàng */}
      <div className="border border-line bg-surface-elevated p-6 shadow-xs">
        <div className="flex items-center gap-2.5 mb-3">
          <BellRing size={20} className="text-accent-gold" />
          <h3 className="m-0 text-sm font-bold uppercase tracking-wider text-content-primary">
            Cập Nhật Trạng Thái Đơn Hàng &amp; Phát Sự Kiện Realtime (OrderStatusChangedEvent)
          </h3>
        </div>
        <p className="m-0 mb-5 text-xs text-content-secondary leading-relaxed">
          Khi admin thay đổi trạng thái đơn hàng, Backend sẽ lưu xuống Database và tự động kích hoạt <code>OrderStatusChangedEvent</code> ở pha <code>AFTER_COMMIT</code>. 
          Event Listener sẽ đóng gói DTO và gửi tức thì tới kênh cá nhân <code>/user/{'{username}'}/queue/notifications</code> của khách hàng mà không làm chậm transaction.
        </p>

        {orderNotice && (
          <div
            className={cn(
              'mb-5 flex items-center gap-2 border p-3.5 text-xs font-medium',
              orderNotice.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            )}
          >
            {orderNotice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{orderNotice.text}</span>
          </div>
        )}

        <form onSubmit={handleTriggerOrderStatusNotification} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4">
            <Select
              label="Chọn đơn hàng cần cập nhật"
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              options={
                orders.length > 0
                  ? orders.slice(0, 50).map((o) => ({
                      value: String(o.id),
                      label: `#${o.id} (${o.orderCode}) — Khách: ${o.shippingRecipientName} — Hiện tại: ${o.orderStatus} — ${formatCurrencyVND(o.totalAmount)}`,
                    }))
                  : [{ value: '', label: 'Chưa có đơn hàng nào' }]
              }
            />

            <Select
              label="Trạng thái mới chuyển sang"
              value={targetOrderStatus}
              onChange={(e) => setTargetOrderStatus(e.target.value as OrderStatus)}
              options={ORDER_STATUS_OPTIONS}
            />
          </div>

          {selectedOrder && (
            <div className="rounded-sm border border-line-light bg-surface p-4 text-xs">
              <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-wider text-content-secondary">
                <Package size={14} className="text-accent-gold" />
                <span>Chi tiết tóm tắt đơn hàng #{selectedOrder.id}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-content-primary">
                <div>
                  <span className="text-content-muted block text-[0.7rem]">Mã đơn hàng:</span>
                  <span className="font-semibold">{selectedOrder.orderCode}</span>
                </div>
                <div>
                  <span className="text-content-muted block text-[0.7rem]">Người nhận:</span>
                  <span className="font-semibold">{selectedOrder.shippingRecipientName} ({selectedOrder.shippingPhone})</span>
                </div>
                <div>
                  <span className="text-content-muted block text-[0.7rem]">Tổng giá trị:</span>
                  <span className="font-bold text-accent-red">{formatCurrencyVND(selectedOrder.totalAmount)}</span>
                </div>
                <div>
                  <span className="text-content-muted block text-[0.7rem]">Trạng thái hiện tại:</span>
                  <Badge variant="dark" className="mt-0.5">{selectedOrder.orderStatus}</Badge>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              loading={updatingOrder}
              disabled={!selectedOrderId || updatingOrder}
              icon={BellRing}
            >
              Cập Nhật &amp; Gửi Thông Báo Realtime
            </Button>
          </div>
        </form>
      </div>

      {/* Kiến trúc kỹ thuật và hướng dẫn bàn giao cho thành viên */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="border border-line bg-surface-elevated p-4">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-content-primary mb-2">
            <Layers size={15} className="text-accent-gold" />
            <span>Kênh WebSocket STOMP</span>
          </div>
          <p className="text-[0.76rem] text-content-secondary m-0 leading-relaxed">
            Kênh nhận thông báo cá nhân: <code>/user/queue/notifications</code><br />
            Kênh tồn kho: <code>/topic/stock</code><br />
            Kênh hỗ trợ chat: <code>/topic/admin/chat</code>
          </p>
        </div>

        <div className="border border-line bg-surface-elevated p-4">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-content-primary mb-2">
            <Clock size={15} className="text-accent-gold" />
            <span>Cơ chế AFTER_COMMIT</span>
          </div>
          <p className="text-[0.76rem] text-content-secondary m-0 leading-relaxed">
            Sự kiện luôn được phát sau khi Database commit thành công để ngăn chặn việc gửi thông báo giả khi giao dịch bị rollback.
          </p>
        </div>

        <div className="border border-line bg-surface-elevated p-4">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-content-primary mb-2">
            <ArrowRight size={15} className="text-accent-gold" />
            <span>Nhiệm vụ tiếp theo</span>
          </div>
          <p className="text-[0.76rem] text-content-secondary m-0 leading-relaxed">
            Thành viên phụ trách có thể tích hợp danh sách lịch sử thông báo, đánh dấu đã đọc và bộ lọc loại thông báo (PROMOTION, ORDER_STATUS).
          </p>
        </div>
      </div>
    </div>
  );
}
