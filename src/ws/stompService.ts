import { Client, StompSubscription } from '@stomp/stompjs';
import { WsConnectionStatus } from '../types/realtime';

interface SubscriptionEntry {
  destination: string;
  callback: (payload: any) => void;
  stompSub: StompSubscription | null;
}

function resolveBrokerUrl(): string {
  const configured = (import.meta.env.VITE_WS_URL || '/api/v1/ws').trim();
  if (configured.startsWith('ws://') || configured.startsWith('wss://')) {
    // Nếu đang truy cập qua HTTPS (ví dụ ngrok) mà cấu hình寫 ws://localhost, tự chuyển sang cùng host để tránh lỗi Mixed Content
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && configured.includes('localhost')) {
      return `wss://${window.location.host}/api/v1/ws`;
    }
    return configured;
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const path = configured.startsWith('/') ? configured : `/${configured}`;
    return `${protocol}//${window.location.host}${path}`;
  }
  return 'ws://localhost:8081/api/v1/ws';
}

class StompService {
  private client: Client | null = null;
  public connected = false;
  public status: WsConnectionStatus = 'DISCONNECTED';
  private subs = new Map<number, SubscriptionEntry>();
  private statusListeners = new Set<(status: WsConnectionStatus) => void>();
  private nextId = 1;

  connect(getToken: () => string | null): void {
    if (this.client) return;

    this.client = new Client({
      brokerURL: resolveBrokerUrl(),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // Chạy trước MỖI lần (re)connect -> luôn dùng token mới nhất
      beforeConnect: () => {
        const token = getToken();
        if (this.client) {
          this.client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
        }
      },
      onConnect: () => {
        this.connected = true;
        this.subs.forEach((_, id) => this._attach(id));
        this._emit('CONNECTED');
      },
      onWebSocketClose: () => {
        this.connected = false;
        this.subs.forEach((s) => {
          s.stompSub = null;
        });
        this._emit('DISCONNECTED');
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame.headers['message']);
      },
    });

    this.client.activate();
  }

  disconnect(): void {
    if (!this.client) return;
    void this.client.deactivate();
    this.client = null;
    this.connected = false;
    this.subs.forEach((s) => {
      s.stompSub = null;
    });
    this._emit('DISCONNECTED');
  }

  subscribe<T = any>(destination: string, callback: (payload: T) => void): () => void {
    const id = this.nextId++;
    this.subs.set(id, { destination, callback, stompSub: null });
    if (this.connected) {
      this._attach(id);
    }
    return () => this._detach(id);
  }

  publish(destination: string, body: unknown): void {
    if (!this.connected || !this.client) {
      throw new Error('WebSocket chưa kết nối');
    }
    this.client.publish({
      destination,
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    });
  }

  onStatus(listener: (status: WsConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private _attach(id: number): void {
    const s = this.subs.get(id);
    if (!s || s.stompSub || !this.client) return;
    s.stompSub = this.client.subscribe(s.destination, (msg) => {
      try {
        s.callback(JSON.parse(msg.body));
      } catch (e) {
        console.error('WS parse error', e);
      }
    });
  }

  private _detach(id: number): void {
    const s = this.subs.get(id);
    if (s?.stompSub && this.connected) {
      try {
        s.stompSub.unsubscribe();
      } catch {
        // Ignore unsubscribe error if connection already closed
      }
    }
    this.subs.delete(id);
  }

  private _emit(status: WsConnectionStatus): void {
    this.status = status;
    this.statusListeners.forEach((l) => l(status));
  }
}

export const stompService = new StompService();
