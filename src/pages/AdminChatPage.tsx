import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  ImagePlus,
  X,
  ZoomIn,
  Sparkles,
  CheckCheck,
  Headphones,
  Loader2,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';
import AdminNav from '../components/admin/AdminNav';
import { chatService } from '../services/chatService';
import { orderService, OrderResponse, OrderStatus } from '../services/orderService';
import { stompService } from '../ws/stompService';
import { useStompSubscription } from '../ws/useStompSubscription';
import { useWsStatus } from '../ws/WebSocketProvider';
import { mergeById } from '../utils/chat';
import { ChatMessageResponse, WsErrorResponse } from '../types/realtime';
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

const QUICK_REPLIES = [
  {
    label: '👋 Chào khách hàng',
    text: 'Dạ Fashion Website xin chào bạn! Mình có thể hỗ trợ tư vấn mẫu trang phục, bảng size hay đơn hàng nào cho bạn ạ?',
  },
  {
    label: '📏 Tư vấn chọn size',
    text: 'Dạ bạn vui lòng cho shop xin thông tin chiều cao và cân nặng để tư vấn viên chọn size chuẩn form nhất cho bạn nhé!',
  },
  {
    label: '📸 Xin ảnh thực tế / Mã đơn',
    text: 'Dạ bạn có thể gửi kèm hình ảnh sản phẩm hoặc mã đơn hàng tại khung chat này để shop kiểm tra và hỗ trợ ngay cho bạn ạ.',
  },
  {
    label: '🔄 Chính sách đổi trả',
    text: 'Dạ sản phẩm bên shop hỗ trợ đổi size/mẫu trong vòng 30 ngày kể từ khi nhận hàng (sản phẩm còn nguyên tem mác) ạ.',
  },
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

function formatChatTimestamp(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function formatShortTime(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isSameDay) {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function formatDateHeading(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  const formatted = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
  return isToday ? `Hôm nay, ${formatted}` : formatted;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AdminChatPage() {
  const status = useWsStatus();
  const [conversations, setConversations] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [byUser, setByUser] = useState<Record<string, ChatMessageResponse[]>>({});
  const [unreadByUser, setUnreadByUser] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'unread'>('all');
  const [messageSearch, setMessageSearch] = useState('');
  const [text, setText] = useState('');
  const [wsError, setWsError] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false);

  // State đính kèm ảnh & Lightbox
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Tiện ích cập nhật nhanh trạng thái đơn hàng để kiểm thử thông báo Realtime (OrderStatusChangedEvent)
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [targetOrderStatus, setTargetOrderStatus] = useState<OrderStatus>('SHIPPING');
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [orderNotice, setOrderNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedRef = useRef<string | null>(selected);
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    selectedRef.current = selected;
    if (selected) {
      setUnreadByUser((prev) => ({ ...prev, [selected]: 0 }));
    }
  }, [selected]);

  // Giải phóng Object URL khi đổi hoặc xóa ảnh preview
  useEffect(() => {
    return () => {
      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const res = await chatService.getConversations();
      if (res?.data) {
        const usernames = res.data;
        setConversations(usernames);
        setSelected((current) => current || usernames[0] || null);

        // Nạp trước lịch sử tóm tắt cho các cuộc hội thoại trong danh sách để hiển thị tin nhắn mới nhất
        void Promise.allSettled(
          usernames.slice(0, 15).map(async (uname) => {
            const historyRes = await chatService.getCustomerHistory(uname);
            if (historyRes?.data) {
              setByUser((prev) => ({
                ...prev,
                [uname]: mergeById(prev[uname] ?? [], historyRes.data),
              }));
            }
          })
        );
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

  const activeMessages = useMemo(() => {
    const raw = selected ? byUser[selected] ?? [] : [];
    const q = messageSearch.trim().toLowerCase();
    if (!q) return raw;
    return raw.filter((m) => (m.content || '').toLowerCase().includes(q));
  }, [byUser, selected, messageSearch]);

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

  const handleSelectImageFile = (file: File | null | undefined) => {
    if (!file) return;
    setWsError('');

    if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      setWsError('Chỉ hỗ trợ định dạng ảnh JPG, PNG, WEBP hoặc GIF.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setWsError('Kích thước ảnh không được vượt quá 5MB.');
      return;
    }

    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }
    setSelectedImageFile(file);
    setSelectedImagePreview(URL.createObjectURL(file));
  };

  const clearSelectedImage = () => {
    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }
    setSelectedImageFile(null);
    setSelectedImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handlePasteClipboard = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleSelectImageFile(file);
          break;
        }
      }
    }
  };

  const reply = async () => {
    const content = text.trim();
    if ((!content && !selectedImageFile) || !selected || status !== 'CONNECTED' || uploadingImage) {
      return;
    }
    setWsError('');

    try {
      let uploadedImageUrl: string | undefined;
      if (selectedImageFile) {
        setUploadingImage(true);
        const uploadRes = await chatService.uploadChatImage(selectedImageFile);
        uploadedImageUrl = uploadRes.data;
      }

      stompService.publish('/app/chat.reply', {
        toUsername: selected,
        content,
        imageUrl: uploadedImageUrl || null,
      });

      setText('');
      clearSelectedImage();
    } catch (err: any) {
      setWsError(extractErrorMessage(err, 'Không thể gửi phản hồi lúc này'));
    } finally {
      setUploadingImage(false);
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

  const totalUnreadCount = useMemo(
    () => Object.values(unreadByUser).reduce((acc, c) => acc + c, 0),
    [unreadByUser]
  );

  const filteredConversations = useMemo(() => {
    return conversations.filter((u) => {
      const matchesSearch = u.toLowerCase().includes(searchQuery.toLowerCase().trim());
      if (!matchesSearch) return false;
      if (sidebarFilter === 'unread') {
        return (unreadByUser[u] || 0) > 0;
      }
      return true;
    });
  }, [conversations, searchQuery, sidebarFilter, unreadByUser]);

  return (
    <div className="container py-8">
      <AdminNav
        title="Trung Tâm Chat Hỗ Trợ & Thông Báo Realtime (STOMP)"
        subtitle="Tiếp nhận và phản hồi khách hàng trực tuyến (Văn bản & Hình ảnh) qua /topic/admin/chat • Đồng bộ thông báo đơn hàng"
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

      {/* Khung Chat 2 Cột chuẩn Luxury Editorial */}
      <div className="grid grid-cols-1 lg:grid-cols-[330px_1fr] border border-line bg-surface-elevated shadow-dropdown h-[680px] overflow-hidden">
        {/* Cột trái: Danh sách khách hàng */}
        <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-line bg-surface-elevated h-full overflow-hidden">
          {/* Header Sidebar */}
          <div className="p-4 border-b border-line-light bg-surface">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[0.72rem] font-extrabold uppercase tracking-wider text-content-primary">
                  Hội Thoại Khách Hàng
                </span>
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[0.68rem] font-bold text-content-inverse">
                  {conversations.length}
                </span>
              </div>

              {/* Bộ lọc Tất cả / Chưa đọc */}
              <div className="flex items-center rounded-sm border border-line-light bg-surface-elevated p-0.5 text-[0.68rem] font-bold">
                <button
                  type="button"
                  onClick={() => setSidebarFilter('all')}
                  className={cn(
                    'px-2 py-0.5 transition-colors',
                    sidebarFilter === 'all'
                      ? 'bg-primary text-content-inverse'
                      : 'text-content-muted hover:text-content-primary'
                  )}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarFilter('unread')}
                  className={cn(
                    'px-2 py-0.5 transition-colors flex items-center gap-1',
                    sidebarFilter === 'unread'
                      ? 'bg-primary text-content-inverse'
                      : 'text-content-muted hover:text-content-primary'
                  )}
                >
                  <span>Chưa đọc</span>
                  {totalUnreadCount > 0 && (
                    <span className="inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-accent-red px-1 text-[0.6rem] text-white">
                      {totalUnreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Ô tìm kiếm tài khoản */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo @username khách hàng..."
                className="w-full rounded-none border border-line bg-surface-body pl-9 pr-8 py-2 text-xs text-content-primary outline-none transition-colors focus:border-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Danh sách hội thoại */}
          <div className="flex-1 overflow-y-auto divide-y divide-line-light">
            {loadingConversations && conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-content-muted">
                <Loader2 size={20} className="mb-2 animate-spin text-accent-gold" />
                <span>Đang tải danh sách hội thoại...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-content-muted">
                {sidebarFilter === 'unread'
                  ? 'Không có hội thoại nào chưa đọc.'
                  : 'Chưa có hội thoại nào khớp tìm kiếm.'}
              </div>
            ) : (
              filteredConversations.map((u) => {
                const isSelected = u === selected;
                const unread = unreadByUser[u] || 0;
                const userMsgs = byUser[u] || [];
                const lastMsg = userMsgs[userMsgs.length - 1];

                let previewText = 'Nhấn để xem lịch sử tin nhắn';
                if (lastMsg) {
                  const prefix = lastMsg.senderRole === 'ADMIN' ? 'Cửa hàng: ' : '';
                  if (lastMsg.imageUrl && lastMsg.content) {
                    previewText = `${prefix}[Hình ảnh] ${lastMsg.content}`;
                  } else if (lastMsg.imageUrl) {
                    previewText = `${prefix}Đã gửi một hình ảnh`;
                  } else {
                    previewText = `${prefix}${lastMsg.content}`;
                  }
                }

                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => {
                      setSelected(u);
                      setMessageSearch('');
                    }}
                    className={cn(
                      'group flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-all',
                      isSelected
                        ? 'bg-primary/[0.06] border-l-4 border-l-accent-gold'
                        : 'hover:bg-surface border-l-4 border-l-transparent'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-full text-xs font-extrabold uppercase transition-colors',
                            isSelected
                              ? 'bg-primary text-accent-gold ring-2 ring-accent-gold/40'
                              : 'bg-surface-dark/10 text-content-primary group-hover:bg-primary/15'
                          )}
                        >
                          {u[0]?.toUpperCase() || <User size={15} />}
                        </div>
                        <span
                          className={cn(
                            'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white',
                            status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-slate-400'
                          )}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              'truncate text-xs',
                              isSelected || unread > 0
                                ? 'font-extrabold text-content-primary'
                                : 'font-semibold text-content-secondary'
                            )}
                          >
                            @{u}
                          </span>
                          {lastMsg?.createdAt && (
                            <span className="shrink-0 text-[0.65rem] text-content-muted">
                              {formatShortTime(lastMsg.createdAt)}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p
                            className={cn(
                              'm-0 truncate text-[0.74rem] flex items-center gap-1',
                              unread > 0
                                ? 'font-bold text-content-primary'
                                : 'text-content-muted'
                            )}
                          >
                            {lastMsg?.imageUrl && <ImageIcon size={12} className="shrink-0 text-accent-gold" />}
                            <span className="truncate">{previewText}</span>
                          </p>

                          {unread > 0 && (
                            <span className="flex h-4 min-w-[18px] shrink-0 items-center justify-center rounded-full bg-accent-red px-1.5 text-[0.65rem] font-bold text-white">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Cột phải: Nội dung chat với khách đang chọn */}
        <div
          className="relative flex flex-col bg-surface h-full overflow-hidden"
          onDragOver={(e) => {
            e.preventDefault();
            if (selected) setIsDraggingImage(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) {
              setIsDraggingImage(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingImage(false);
            if (!selected) return;
            const file = e.dataTransfer?.files?.[0];
            if (file) {
              handleSelectImageFile(file);
            }
          }}
        >
          {/* Lớp phủ khi kéo thả ảnh vào khung chat */}
          {isDraggingImage && selected && (
            <div
              onDragLeave={() => setIsDraggingImage(false)}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-primary/80 text-content-inverse backdrop-blur-xs"
            >
              <div className="flex flex-col items-center rounded-sm border-2 border-dashed border-accent-gold px-10 py-8 text-center">
                <ImagePlus size={40} className="mb-3 text-accent-gold" />
                <p className="m-0 text-sm font-bold uppercase tracking-wider">
                  Thả hình ảnh vào đây để đính kèm
                </p>
                <p className="m-0 mt-1 text-xs text-white/75">
                  Hỗ trợ JPG, PNG, WEBP, GIF (Tối đa 5MB)
                </p>
              </div>
            </div>
          )}

          {selected ? (
            <>
              {/* Header hội thoại */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-elevated px-5 py-3.5 shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-extrabold uppercase text-accent-gold">
                      {selected[0]?.toUpperCase()}
                    </div>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="m-0 text-sm font-extrabold text-content-primary">
                        Khách hàng: @{selected}
                      </h3>
                      <span className="rounded-sm bg-accent-gold/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-accent-gold">
                        Khách Hàng
                      </span>
                    </div>
                    <p className="m-0 mt-0.5 text-[0.7rem] text-content-muted">
                      Kênh nhận: <code>/user/{selected}/queue/chat</code> • Kênh đồng bộ: <code>/topic/admin/chat</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Tìm trong cuộc trò chuyện */}
                  <div className="relative hidden sm:block">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted" />
                    <input
                      type="text"
                      value={messageSearch}
                      onChange={(e) => setMessageSearch(e.target.value)}
                      placeholder="Lọc nội dung tin nhắn..."
                      className="w-44 rounded-none border border-line-light bg-surface pl-8 pr-6 py-1.5 text-[0.72rem] text-content-primary outline-none focus:border-primary"
                    />
                    {messageSearch && (
                      <button
                        type="button"
                        onClick={() => setMessageSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <Badge variant="dark">{(byUser[selected] ?? []).length} tin nhắn</Badge>
                </div>
              </div>

              {/* Luồng tin nhắn */}
              <div
                ref={chatMessagesContainerRef}
                className="flex-1 space-y-4 overflow-y-auto px-5 py-5 bg-surface"
              >
                {activeMessages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-12 text-center text-content-muted">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface-elevated">
                      <MessageSquare size={24} className="text-accent-gold" />
                    </div>
                    <p className="m-0 text-xs font-bold text-content-secondary">
                      {messageSearch
                        ? 'Không tìm thấy tin nhắn nào khớp từ khóa lọc.'
                        : 'Chưa có tin nhắn nào trong hội thoại này.'}
                    </p>
                    <p className="m-0 mt-1 text-[0.72rem] text-content-muted">
                      Bạn có thể chọn câu trả lời nhanh bên dưới hoặc gửi hình ảnh tư vấn cho khách.
                    </p>
                  </div>
                ) : (
                  activeMessages.map((m, idx) => {
                    const isStoreSide = m.senderRole === 'ADMIN';
                    const prevMsg = idx > 0 ? activeMessages[idx - 1] : null;
                    const currentDay = formatDateHeading(m.createdAt);
                    const prevDay = prevMsg ? formatDateHeading(prevMsg.createdAt) : '';
                    const showDateDivider = currentDay && currentDay !== prevDay;

                    return (
                      <React.Fragment key={m.id}>
                        {showDateDivider && (
                          <div className="flex items-center justify-center my-3">
                            <span className="rounded-full border border-line-light bg-surface-elevated px-3.5 py-1 text-[0.66rem] font-bold uppercase tracking-wider text-content-muted shadow-2xs">
                              {currentDay}
                            </span>
                          </div>
                        )}

                        <div
                          className={cn(
                            'flex items-end gap-2.5',
                            isStoreSide ? 'flex-row-reverse' : 'flex-row'
                          )}
                        >
                          {/* Avatar người gửi */}
                          <div
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.68rem] font-extrabold uppercase shadow-2xs',
                              isStoreSide
                                ? 'bg-primary text-accent-gold border border-accent-gold/40'
                                : 'bg-surface-elevated text-content-primary border border-line'
                            )}
                          >
                            {isStoreSide ? <Headphones size={14} /> : m.senderUsername?.[0]?.toUpperCase() || 'K'}
                          </div>

                          {/* Khối nội dung bong bóng chat */}
                          <div
                            className={cn(
                              'flex max-w-[74%] flex-col',
                              isStoreSide ? 'items-end' : 'items-start'
                            )}
                          >
                            <div
                              className={cn(
                                'overflow-hidden px-4 py-3 text-xs leading-relaxed shadow-xs',
                                isStoreSide
                                  ? 'rounded-2xl rounded-br-none bg-primary text-content-inverse'
                                  : 'rounded-2xl rounded-bl-none border border-line bg-surface-elevated text-content-primary'
                              )}
                            >
                              <div
                                className={cn(
                                  'mb-1.5 flex items-center gap-1.5 text-[0.66rem] font-extrabold uppercase tracking-wider',
                                  isStoreSide ? 'text-accent-gold' : 'text-content-muted'
                                )}
                              >
                                <span>
                                  {isStoreSide
                                    ? `Cửa hàng (@${m.senderUsername})`
                                    : `Khách hàng (@${m.senderUsername})`}
                                </span>
                              </div>

                              {/* Hiển thị hình ảnh đính kèm nếu có */}
                              {m.imageUrl && (
                                <div className={cn('group relative overflow-hidden rounded-sm border border-white/15', m.content ? 'mb-2.5' : '')}>
                                  <img
                                    src={m.imageUrl}
                                    alt="Ảnh đính kèm trong chat"
                                    loading="lazy"
                                    onClick={() => setLightboxImageUrl(m.imageUrl || null)}
                                    className="max-h-64 w-auto max-w-full cursor-zoom-in object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setLightboxImageUrl(m.imageUrl || null)}
                                    className="absolute bottom-2 right-2 flex items-center gap-1 rounded-sm bg-black/75 px-2 py-1 text-[0.65rem] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"
                                  >
                                    <ZoomIn size={12} />
                                    <span>Phóng to</span>
                                  </button>
                                </div>
                              )}

                              {m.content && (
                                <div className="whitespace-pre-wrap break-words text-[0.82rem]">
                                  {m.content}
                                </div>
                              )}
                            </div>

                            {/* Thời gian & Trạng thái đã gửi */}
                            <div className="mt-1 flex items-center gap-1 px-1 text-[0.65rem] text-content-muted">
                              <span>{formatChatTimestamp(m.createdAt)}</span>
                              {isStoreSide && <CheckCheck size={12} className="text-accent-gold" />}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
              </div>

              {/* Thanh câu trả lời nhanh (Quick Replies) */}
              <div className="flex items-center gap-2 overflow-x-auto border-t border-line-light bg-surface-elevated px-4 py-2 shrink-0">
                <span className="flex shrink-0 items-center gap-1 text-[0.68rem] font-bold uppercase tracking-wider text-accent-gold">
                  <Sparkles size={12} />
                  <span>Mẫu câu nhanh:</span>
                </span>
                {QUICK_REPLIES.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setText(item.text);
                      textInputRef.current?.focus();
                    }}
                    className="shrink-0 rounded-full border border-line bg-surface px-3 py-1 text-[0.7rem] font-medium text-content-secondary transition-colors hover:border-primary hover:bg-primary hover:text-content-inverse"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Thanh xem trước hình ảnh đính kèm trước khi gửi */}
              {selectedImagePreview && selectedImageFile && (
                <div className="flex items-center justify-between gap-3 border-t border-line bg-surface px-4 py-2.5 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm border border-accent-gold bg-surface-elevated">
                      <img
                        src={selectedImagePreview}
                        alt="Xem trước ảnh gửi"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="m-0 truncate text-xs font-bold text-content-primary">
                        {selectedImageFile.name}
                      </p>
                      <p className="m-0 mt-0.5 text-[0.7rem] text-content-muted">
                        Kích thước: {formatFileSize(selectedImageFile.size)} • Sẵn sàng tải lên Cloudinary
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={clearSelectedImage}
                    disabled={uploadingImage}
                    className="flex items-center gap-1 rounded-sm border border-line px-2.5 py-1 text-xs font-semibold text-content-secondary hover:border-status-error hover:text-status-error"
                  >
                    <X size={14} />
                    <span>Bỏ chọn</span>
                  </button>
                </div>
              )}

              {wsError && (
                <div className="flex items-center justify-between gap-2 border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 shrink-0">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{wsError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWsError('')}
                    className="text-red-500 hover:text-red-800"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Ô nhập phản hồi + Nút gửi ảnh */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void reply();
                }}
                className="flex items-center gap-2.5 border-t border-line bg-surface-elevated p-3.5 shrink-0"
              >
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => handleSelectImageFile(e.target.files?.[0])}
                />

                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={status !== 'CONNECTED' || uploadingImage}
                  title="Đính kèm hình ảnh (Hoặc dán ảnh bằng Ctrl+V / Kéo thả ảnh)"
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center border transition-colors',
                    selectedImageFile
                      ? 'border-accent-gold bg-accent-gold/15 text-accent-gold'
                      : 'border-line bg-surface-body text-content-secondary hover:border-primary hover:text-content-primary disabled:opacity-40'
                  )}
                >
                  <ImagePlus size={18} />
                </button>

                <input
                  ref={textInputRef}
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onPaste={handlePasteClipboard}
                  maxLength={1000}
                  placeholder={`Nhập phản hồi hoặc dán ảnh (Ctrl+V) gửi cho @${selected}...`}
                  className="h-11 flex-1 rounded-none border border-line bg-surface-body px-3.5 text-sm text-content-primary outline-none transition-colors focus:border-primary"
                />

                <Button
                  type="submit"
                  variant="primary"
                  icon={Send}
                  loading={uploadingImage}
                  disabled={status !== 'CONNECTED' || (!text.trim() && !selectedImageFile) || uploadingImage}
                >
                  {uploadingImage ? 'Đang Tải Ảnh...' : 'Gửi Phản Hồi'}
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

        <form
          onSubmit={handleTriggerOrderStatusNotification}
          className="grid grid-cols-1 md:grid-cols-[1fr_280px_auto] gap-3 items-end"
        >
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

      {/* Modal Phóng To Hình Ảnh Trong Chat (Lightbox) */}
      {lightboxImageUrl && (
        <div
          onClick={() => setLightboxImageUrl(null)}
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center"
          >
            <div className="mb-3 flex w-full items-center justify-between gap-4 text-white">
              <span className="text-xs font-bold uppercase tracking-wider text-accent-gold">
                Xem Hình Ảnh Đính Kèm
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-sm border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                >
                  <ExternalLink size={13} />
                  <span>Mở Ảnh Gốc</span>
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxImageUrl(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-sm border border-white/25 bg-white/10 text-white hover:bg-white/20"
                  aria-label="Đóng xem ảnh"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <img
              src={lightboxImageUrl}
              alt="Ảnh phóng to"
              className="max-h-[82vh] max-w-full rounded-sm border border-white/20 object-contain shadow-modal"
            />
          </div>
        </div>
      )}
    </div>
  );
}
