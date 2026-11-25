import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Package, Tag, RotateCcw, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWsStatus } from '../../ws/WebSocketProvider';
import { NotificationResponse, NotificationType } from '../../types/realtime';
import { useNotifications } from '../../context/NotificationContext';
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
  const { isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();
  const status = useWsStatus();
  const { items, unread, loading, markRead, markAll } = useNotifications();
  const [open, setOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const canManageReturns = Boolean(isAdmin || isStaff);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleNotificationClick = async (n: NotificationResponse) => {
    if (!n.seen) {
      await markRead(n);
    }

    setOpen(false);

    if (n.type === 'PROMOTION') {
      navigate('/account/vouchers');
      return;
    }

    if (n.type === 'RETURN_REQUEST') {
      navigate(
        n.referenceId
          ? canManageReturns
            ? `/admin/returns/${n.referenceId}`
            : `/account/returns/${n.referenceId}`
          : canManageReturns
            ? '/admin/returns'
            : '/account/returns'
      );
      return;
    }

    if (n.type === 'ORDER_STATUS') {
      navigate(canManageReturns ? '/admin/orders' : '/account/orders');
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <IconButton
        aria-label="Thông báo"
        title="Thông báo"
        aria-expanded={open}
        badgeCount={unread}
        badgeVariant="accent"
        onClick={() => setOpen((o) => !o)}
        icon={<Bell size={20} />}
      />

      {open && (
        <div
          role="region"
          aria-label="Danh sách thông báo"
          className="animate-slide-up absolute right-0 top-[calc(100%+8px)] z-50 w-[330px] sm:w-[370px] overflow-hidden rounded-sm border border-line-light bg-surface-elevated shadow-dropdown"
        >
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
                onClick={() => void markAll()}
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
              items.map((n, index) => (
                <button
                  type="button"
                  key={
                    n.id != null
                      ? n.id
                      : `topic-${n.type}-${n.referenceId ?? 'none'}-${n.createdAt ?? index}`
                  }
                  onClick={() => void handleNotificationClick(n)}
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-3 border-0 px-4 py-3 text-left transition-colors hover:bg-surface',
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
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
