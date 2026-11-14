import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Package, Tag, RotateCcw, Info } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { useStompSubscription } from '../../ws/useStompSubscription';
import { useWsStatus } from '../../ws/WebSocketProvider';
import { NotificationResponse, NotificationType } from '../../types/realtime';
import { IconButton } from '../ui';
import { cn } from '../../utils/cn';

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'ORDER_STATUS':
      return <Package size={16} className="text-accent-gold shrink-0 mt-0.5" />;
    case 'RETURN_REQUEST':
      return <RotateCcw size={16} className="text-blue-600 shrink-0 mt-0.5" />;
    case 'PROMOTION':
      return <Tag size={16} className="text-accent-red shrink-0 mt-0.5" />;
    default:
      return <Info size={16} className="text-content-secondary shrink-0 mt-0.5" />;
  }
}

function formatNotificationTime(iso?: string): string {
  if (!iso) return 'Vừa xong';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Vừa xong';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function NotificationBell() {
  const status = useWsStatus();
  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [unread, setUnread] = useState<number>(0);
  const [open, setOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        notificationService.getMyNotifications(0, 20),
        notificationService.getUnreadCount(),
      ]);
      if (listRes?.data?.content) {
        setItems(listRes.data.content);
      }
      if (typeof countRes?.data?.count === 'number') {
        setUnread(countRes.data.count);
      }
    } catch (err) {
      console.warn('Could not load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Tải lần đầu và tải lại mỗi khi (re)connect để không sót thông báo lúc mất mạng
  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (status === 'CONNECTED') {
      void load();
    }
  }, [status, load]);

  useStompSubscription<NotificationResponse>(
    '/user/queue/notifications',
    useCallback((n) => {
      let isNew = false;
      setItems((prev) => {
        if (prev.some((x) => x.id === n.id)) return prev;
        isNew = true;
        return [n, ...prev];
      });
      if (isNew && !n.seen) {
        setUnread((c) => c + 1);
      }
    }, [])
  );

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const markRead = async (n: NotificationResponse) => {
    if (!n.seen) {
      try {
        await notificationService.markAsRead(n.id);
        setItems((p) => p.map((x) => (x.id === n.id ? { ...x, seen: true } : x)));
        setUnread((c) => Math.max(0, c - 1));
      } catch (err) {
        console.warn('Could not mark notification as read:', err);
      }
    }
  };

  const markAll = async () => {
    if (unread === 0) return;
    try {
      await notificationService.markAllAsRead();
      setItems((p) => p.map((x) => ({ ...x, seen: true })));
      setUnread(0);
    } catch (err) {
      console.warn('Could not mark all notifications as read:', err);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <IconButton
        aria-label="Thông báo"
        aria-expanded={open}
        badgeCount={unread}
        badgeVariant="accent"
        onClick={() => setOpen((o) => !o)}
        icon={<Bell size={20} />}
      />

      {open && (
        <div className="animate-slide-up absolute right-0 top-[calc(100%+8px)] z-50 w-[330px] sm:w-[370px] overflow-hidden rounded-sm border border-line-light bg-surface-elevated shadow-dropdown">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line-light bg-surface px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-content-primary">
                Thông Báo
              </span>
              {unread > 0 && (
                <span className="rounded-full bg-accent-gold px-2 py-0.5 text-[0.68rem] font-bold text-content-inverse">
                  {unread} mới
                </span>
              )}
              <span
                title={status === 'CONNECTED' ? 'Đã kết nối Realtime (STOMP)' : 'Đang kết nối lại...'}
                className={cn(
                  'h-2 w-2 rounded-full',
                  status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
                )}
              />
            </div>

            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="flex items-center gap-1 text-[0.72rem] font-semibold text-accent-gold hover:underline"
              >
                <CheckCheck size={13} />
                <span>Đọc tất cả</span>
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-line-light">
            {loading && items.length === 0 ? (
              <div className="p-6 text-center text-xs text-content-muted">
                Đang tải thông báo...
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={26} className="mx-auto mb-2 text-content-muted opacity-40" />
                <p className="m-0 text-xs font-medium text-content-secondary">
                  Bạn chưa có thông báo nào.
                </p>
              </div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  onClick={() => void markRead(n)}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-surface',
                    !n.seen ? 'bg-accent-gold/5' : 'bg-surface-elevated'
                  )}
                >
                  {getNotificationIcon(n.type)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          'm-0 text-xs leading-snug',
                          !n.seen
                            ? 'font-bold text-content-primary'
                            : 'font-medium text-content-secondary'
                        )}
                      >
                        {n.title}
                      </p>
                      {!n.seen && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent-gold" />
                      )}
                    </div>
                    {n.content && (
                      <p className="m-0 mt-1 text-[0.76rem] leading-relaxed text-content-secondary">
                        {n.content}
                      </p>
                    )}
                    <span className="mt-1.5 block text-[0.68rem] text-content-muted">
                      {formatNotificationTime(n.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
