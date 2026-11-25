import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { notificationService } from '../services/notificationService';
import { NotificationResponse } from '../types/realtime';
import { useAuth } from './AuthContext';
import { useWsStatus } from '../ws/WebSocketProvider';
import { useStompSubscription } from '../ws/useStompSubscription';

interface NotificationContextValue {
  items: NotificationResponse[];
  unread: number;
  loading: boolean;
  markRead: (notification: NotificationResponse) => Promise<void>;
  markAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

/**
 * Kiểm tra hai thông báo có đại diện cho cùng một sự kiện realtime hay không
 * để chống trùng lặp khi Admin/Staff nhận đồng thời từ /user/queue/notifications và /topic/admin/returns.
 */
function isDuplicateBroadcast(a: NotificationResponse, b: NotificationResponse): boolean {
  if (a.id != null && b.id != null) {
    return a.id === b.id;
  }
  if (a.type !== b.type || a.title !== b.title) {
    return false;
  }
  if (a.referenceId == null || b.referenceId == null || a.referenceId !== b.referenceId) {
    return false;
  }
  const timeA = a.createdAt ? new Date(a.createdAt).getTime() : NaN;
  const timeB = b.createdAt ? new Date(b.createdAt).getTime() : NaN;
  if (!Number.isNaN(timeA) && !Number.isNaN(timeB)) {
    return Math.abs(timeA - timeB) <= 60_000;
  }
  return true;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token, isAdmin, isStaff } = useAuth();
  const status = useWsStatus();
  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const activeToken = useRef(token);
  const notificationIds = useRef(new Set<number>());

  const canManageReturns = Boolean(token && (isAdmin || isStaff));

  useEffect(() => {
    activeToken.current = token;
  }, [token]);

  const load = useCallback(async () => {
    if (!token) {
      setItems([]);
      setUnread(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        notificationService.getMyNotifications(0, 20),
        notificationService.getUnreadCount(),
      ]);
      if (activeToken.current !== token) return;
      const isHiddenVip = (item: NotificationResponse) =>
        Boolean(
          item.title?.toUpperCase().includes('VIP') ||
            item.content?.toUpperCase().includes('VIP15')
        );
      const validItems = listRes.data.content.filter((item) => !isHiddenVip(item));
      const hiddenUnread = listRes.data.content.filter(
        (item) => isHiddenVip(item) && !item.seen
      ).length;
      notificationIds.current = new Set(
        validItems.map((item) => item.id).filter((id): id is number => id != null)
      );
      setItems(validItems);
      setUnread(Math.max(0, countRes.data.count - hiddenUnread));
    } catch (error) {
      console.warn('Could not load notifications:', error);
    } finally {
      if (activeToken.current === token) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (status === 'CONNECTED') void load();
  }, [status, load]);

  const handleNotification = useCallback((notification: NotificationResponse) => {
    if (notification.id != null && notificationIds.current.has(notification.id)) {
      return;
    }

    let shouldIncrementUnread = false;
    setItems((current) => {
      if (notification.id != null && current.some((x) => x.id === notification.id)) {
        return current;
      }

      const dupIndex = current.findIndex((x) => isDuplicateBroadcast(x, notification));
      if (dupIndex !== -1) {
        const existing = current[dupIndex];
        if (existing.id == null && notification.id != null) {
          notificationIds.current.add(notification.id);
          const next = [...current];
          next[dupIndex] = notification;
          return next;
        }
        return current;
      }

      if (notification.id != null) {
        notificationIds.current.add(notification.id);
      }
      shouldIncrementUnread = !notification.seen;
      return [notification, ...current];
    });

    if (shouldIncrementUnread) {
      setUnread((count) => count + 1);
    }
  }, []);

  useStompSubscription<NotificationResponse>(
    '/user/queue/notifications',
    handleNotification,
    Boolean(token)
  );

  useStompSubscription<NotificationResponse>(
    '/topic/admin/returns',
    handleNotification,
    canManageReturns
  );

  const markRead = useCallback(async (notification: NotificationResponse) => {
    if (notification.seen) return;
    try {
      if (notification.id != null) {
        await notificationService.markAsRead(notification.id);
      }
      setItems((current) =>
        current.map((item) =>
          (notification.id != null ? item.id === notification.id : item === notification)
            ? { ...item, seen: true }
            : item
        )
      );
      setUnread((count) => Math.max(0, count - 1));
    } catch (error) {
      console.warn('Could not mark notification as read:', error);
    }
  }, []);

  const markAll = useCallback(async () => {
    if (unread === 0) return;
    try {
      await notificationService.markAllAsRead();
      setItems((current) => current.map((item) => ({ ...item, seen: true })));
      setUnread(0);
    } catch (error) {
      console.warn('Could not mark all notifications as read:', error);
    }
  }, [unread]);

  return (
    <NotificationContext.Provider value={{ items, unread, loading, markRead, markAll, refresh: load }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
