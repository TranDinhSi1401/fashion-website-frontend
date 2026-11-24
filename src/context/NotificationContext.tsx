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
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const status = useWsStatus();
  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const activeToken = useRef(token);
  const notificationIds = useRef(new Set<number>());

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
      notificationIds.current = new Set(listRes.data.content.map((item) => item.id));
      setItems(listRes.data.content);
      setUnread(countRes.data.count);
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
    if (notificationIds.current.has(notification.id)) return;
    notificationIds.current.add(notification.id);
    setItems((current) => [notification, ...current]);
    if (!notification.seen) {
      setUnread((count) => count + 1);
    }
  }, []);

  useStompSubscription<NotificationResponse>(
    '/user/queue/notifications',
    handleNotification,
    Boolean(token)
  );

  const markRead = useCallback(async (notification: NotificationResponse) => {
    if (notification.seen) return;
    try {
      await notificationService.markAsRead(notification.id);
      setItems((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, seen: true } : item
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
    <NotificationContext.Provider value={{ items, unread, loading, markRead, markAll }}>
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
