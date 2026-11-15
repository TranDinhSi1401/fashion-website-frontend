import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  Send,
  Search,
  User,
  Wifi,
  WifiOff,
  RefreshCw,
  BellRing,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import AdminNav from '../components/admin/AdminNav';
import { chatService } from '../services/chatService';
import { orderService, OrderResponse, OrderStatus } from '../services/orderService';
import { stompService } from '../ws/stompService';
import { useStompSubscription } from '../ws/useStompSubscription';
import { useWsStatus } from '../ws/WebSocketProvider';
import { mergeById } from '../utils/chat';
import { ChatMessageResponse, WsErrorResponse } from '../types/realtime';
import { Badge, Button, Input, Select } from '../components/ui';
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

function formatChatTimestamp(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function AdminChatPage() {
  const status = useWsStatus();
  const [conversations, setConversations] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [byUser, setByUser] = useState<Record<string, ChatMessageResponse[]>>({});
  const [unreadByUser, setUnreadByUser] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [text, setText] = useState('');
  const [wsError, setWsError] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Tiện ích cập nhật nhanh trạng thái đơn hàng để kiểm thử thông báo Realtime (OrderStatusChangedEvent)
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [targetOrderStatus, setTargetOrderStatus] = useState<OrderStatus>('SHIPPING');
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [orderNotice, setOrderNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedRef = useRef<string | null>(selected);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectedRef.current = selected;
    if (selected) {
      setUnreadByUser((prev) => ({ ...prev, [selected]: 0 }));
    }
  }, [selected]);

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const res = await chatService.getConversations();
      if (res?.data) {
        setConversations(res.data);
        setSelected((current) => current || res.data[0] || null);
      }
    } catch (err) {
      console.warn('Could not load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
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
    }
  }, [selectedOrderId]);

  useEffect(() => {
    void loadConversations();
    void loadOrders();
  }, [loadConversations, loadOrders]);

  useEffect(() => {
    if (status === 'CONNECTED') {
      void loadConversations();
    }
  }, [status, loadConversations]);

  useEffect(() => {
    if (!selected) return;
    chatService
      .getCustomerHistory(selected)
      .then((res) => {
        if (res?.data) {
          setByUser((prev) => ({
            ...prev,
            [selected]: mergeById(prev[selected] ?? [], res.data),
          }));
        }
      })
      .catch((err) => console.warn('Could not load customer chat history:', err));
  }, [selected]);

  useStompSubscription<ChatMessageResponse>(
    '/topic/admin/chat',
    useCallback((m) => {
      setByUser((prev) => ({
        ...prev,
        [m.customerUsername]: mergeById(prev[m.customerUsername] ?? [], [m]),
      }));
      setConversations((prev) => [
        m.customerUsername,
        ...prev.filter((u) => u !== m.customerUsername),
      ]);
      if (selectedRef.current !== m.customerUsername && m.senderRole === 'CUSTOMER') {
        setUnreadByUser((prev) => ({
          ...prev,
          [m.customerUsername]: (prev[m.customerUsername] || 0) + 1,
        }));
      }
    }, [])
  );

  useStompSubscription<WsErrorResponse>(
    '/user/queue/errors',
    useCallback((e) => {
      setWsError(e?.message || 'Gửi tin nhắn thất bại');
    }, [])
  );

  const activeMessages = selected ? byUser[selected] ?? [] : [];

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = chatMessagesContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    }
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [activeMessages.length, selected]);

  const reply = () => {
    const content = text.trim();
    if (!content || !selected || status !== 'CONNECTED') return;
    setWsError('');
    try {
      stompService.publish('/app/chat.reply', { toUsername: selected, content });
      setText('');
    } catch (err: any) {
      setWsError(err?.message || 'Không thể gửi phản hồi');
    }
  };

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
        text: `Đã cập nhật đơn hàng #${updated.data?.id || selectedOrderId} sang ${targetOrderStatus} & bắn thông báo WebSocket realtime cho khách!`,
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

  const filteredConversations = conversations.filter((u) =>
    u.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="container py-8">
      <AdminNav
        title="Trung Tâm Chat Hỗ Trợ & Thông Báo Realtime (STOMP)"
        subtitle="Tiếp nhận và phản hồi khách hàng trực tuyến qua /topic/admin/chat • Đồng bộ thông báo đơn hàng realtime"
        actions={
          <div className="flex items-center gap-2.5">
            <Badge variant={status === 'CONNECTED' ? 'success' : 'error'} className="flex items-center gap-1.5 px-3 py-1">
              {status === 'CONNECTED' ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span>{status === 'CONNECTED' ? 'STOMP CONNECTED' : 'DISCONNECTED'}</span>
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={() => {
                void loadConversations();
                void loadOrders();
              }}
            >
              Làm Mới
            </Button>
          </div>
        }
      />

      {/* Khung Chat 2 Cột: Danh sách hội thoại & Nội dung hội thoại */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] border border-line bg-surface-elevated shadow-xs h-[600px] overflow-hidden">
        {/* Cột trái: Danh sách khách hàng */}
        <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-line bg-surface h-full overflow-hidden">
          <div className="p-3.5 border-b border-line-light">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tài khoản khách hàng..."
                className="w-full rounded-sm border border-line bg-surface-body pl-9 pr-3 py-2 text-xs text-content-primary outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-line-light">
            {loadingConversations && conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-content-muted">
                Đang tải danh sách hội thoại...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-content-muted">
                Chưa có hội thoại nào khớp tìm kiếm.
              </div>
            ) : (
              filteredConversations.map((u) => {
                const isSelected = u === selected;
                const unread = unreadByUser[u] || 0;
                const userMsgs = byUser[u] || [];
                const lastMsg = userMsgs[userMsgs.length - 1];

                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setSelected(u)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors',
                      isSelected
                        ? 'bg-accent-gold/10 border-l-4 border-l-accent-gold'
                        : 'hover:bg-surface-elevated'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase',
                          isSelected
                            ? 'bg-primary text-content-inverse'
                            : 'bg-surface-dark/10 text-content-primary'
                        )}
                      >
                        {u[0]?.toUpperCase() || <User size={15} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'truncate text-xs',
                              isSelected || unread > 0
                                ? 'font-bold text-content-primary'
                                : 'font-semibold text-content-secondary'
                            )}
                          >
                            @{u}
                          </span>
                        </div>
                        <p className="m-0 mt-0.5 truncate text-[0.72rem] text-content-muted">
                          {lastMsg ? lastMsg.content : 'Nhấn để xem lịch sử tin nhắn'}
                        </p>
                      </div>
                    </div>

                    {unread > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-red px-1.5 text-[0.68rem] font-bold text-white">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Cột phải: Nội dung chat với khách đang chọn */}
        <div className="flex flex-col bg-surface-body h-full overflow-hidden">
          {selected ? (
            <>
              {/* Header hội thoại */}
              <div className="flex items-center justify-between border-b border-line-light bg-surface-elevated px-5 py-3.5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold uppercase text-content-inverse">
                    {selected[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="m-0 text-sm font-bold text-content-primary">
                      Khách hàng: @{selected}
                    </h3>
                    <p className="m-0 text-[0.72rem] text-content-muted">
                      Kênh nhận: <code>/user/{selected}/queue/chat</code> • Kênh đồng bộ: <code>/topic/admin/chat</code>
                    </p>
                  </div>
                </div>
                <Badge variant="dark">{activeMessages.length} tin nhắn</Badge>
              </div>

              {/* Luồng tin nhắn */}
              <div ref={chatMessagesContainerRef} className="flex-1 space-y-3 overflow-y-auto p-5">
                {activeMessages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-12 text-center text-content-muted">
                    <MessageSquare size={28} className="mb-2 opacity-30" />
                    <p className="m-0 text-xs">Chưa có tin nhắn nào trong hội thoại này.</p>
                  </div>
                ) : (
                  activeMessages.map((m) => {
                    const isStoreSide = m.senderRole === 'ADMIN';
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          'flex flex-col',
                          isStoreSide ? 'items-end' : 'items-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[75%] px-4 py-2.5 text-xs leading-relaxed shadow-xs',
                            isStoreSide
                              ? 'rounded-t-xl rounded-bl-xl bg-primary text-content-inverse'
                              : 'rounded-t-xl rounded-br-xl border border-line bg-surface-elevated text-content-primary'
                          )}
                        >
                          <div
                            className={cn(
                              'mb-1 text-[0.68rem] font-bold uppercase tracking-wider',
                              isStoreSide ? 'text-accent-gold' : 'text-content-muted'
                            )}
                          >
                            {isStoreSide ? `Cửa hàng (@${m.senderUsername})` : `Khách hàng (@${m.senderUsername})`}
                          </div>
                          <span className="whitespace-pre-wrap break-words">{m.content}</span>
                        </div>
                        <span className="mt-1 px-1 text-[0.66rem] text-content-muted">
                          {formatChatTimestamp(m.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {wsError && (
                <div className="flex items-center gap-2 border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 shrink-0">
                  <AlertCircle size={14} />
                  <span>{wsError}</span>
                </div>
              )}

              {/* Ô nhập phản hồi */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  reply();
                }}
                className="flex items-center gap-3 border-t border-line bg-surface-elevated p-4 shrink-0"
              >
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Nhập phản hồi cho @${selected}...`}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  variant="primary"
                  icon={Send}
                  disabled={status !== 'CONNECTED' || !text.trim()}
                >
                  Trả Lời
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-10 text-center text-content-muted">
              <MessageSquare size={36} className="mb-3 opacity-30" />
              <p className="m-0 text-sm font-semibold text-content-secondary">
                Chọn một khách hàng ở danh sách bên trái để bắt đầu hỗ trợ
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Khu vực Cập nhật nhanh trạng thái đơn hàng -> Bắn thông báo Realtime (OrderStatusChangedEvent) */}
      <div className="mt-8 border border-line bg-surface-elevated p-5 shadow-xs">
        <div className="flex items-center gap-2.5 mb-3">
          <BellRing size={18} className="text-accent-gold" />
          <h3 className="m-0 text-sm font-bold uppercase tracking-wider text-content-primary">
            Cập Nhật Trạng Thái Đơn Hàng &amp; Bắn Thông Báo Realtime (OrderStatusChangedEvent)
          </h3>
        </div>
        <p className="m-0 mb-4 text-xs text-content-secondary">
          Khi đổi trạng thái đơn hàng dưới đây, Backend sẽ lưu DB và phát <code>OrderStatusChangedEvent</code> ở pha <code>AFTER_COMMIT</code> để đẩy thông báo tức thì tới <code>/user/queue/notifications</code> của chủ đơn hàng.
        </p>

        {orderNotice && (
          <div
            className={cn(
              'mb-4 flex items-center gap-2 border p-3 text-xs font-medium',
              orderNotice.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            )}
          >
            {orderNotice.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{orderNotice.text}</span>
          </div>
        )}

        <form onSubmit={handleTriggerOrderStatusNotification} className="grid grid-cols-1 md:grid-cols-[1fr_280px_auto] gap-3 items-end">
          <Select
            label="Chọn đơn hàng"
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            options={
              orders.length > 0
                ? orders.slice(0, 30).map((o) => ({
                    value: String(o.id),
                    label: `#${o.id} (${o.orderCode}) — Khách: ${o.shippingRecipientName} — Hiện tại: ${o.orderStatus} — ${formatCurrencyVND(o.totalAmount)}`,
                  }))
                : [{ value: '', label: 'Chưa có đơn hàng' }]
            }
          />

          <Select
            label="Trạng thái mới"
            value={targetOrderStatus}
            onChange={(e) => setTargetOrderStatus(e.target.value as OrderStatus)}
            options={ORDER_STATUS_OPTIONS}
          />

          <Button
            type="submit"
            variant="primary"
            loading={updatingOrder}
            disabled={!selectedOrderId}
          >
            Cập Nhật &amp; Gửi Thông Báo
          </Button>
        </form>
      </div>
    </div>
  );
}
