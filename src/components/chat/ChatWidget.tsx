import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, Send, X, AlertCircle, Wifi, WifiOff, Headphones } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../services/chatService';
import { stompService } from '../../ws/stompService';
import { useStompSubscription } from '../../ws/useStompSubscription';
import { useWsStatus } from '../../ws/WebSocketProvider';
import { mergeById } from '../../utils/chat';
import { ChatMessageResponse, WsErrorResponse } from '../../types/realtime';
import { cn } from '../../utils/cn';

function formatMessageTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export default function ChatWidget() {
  const { isAuthenticated, isAdmin, isStaff, user } = useAuth();
  const location = useLocation();
  const status = useWsStatus();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Tải lịch sử hội thoại mỗi khi kết nối thành công
  useEffect(() => {
    if (!isAuthenticated || status !== 'CONNECTED') return;
    chatService
      .getMyHistory()
      .then((res) => {
        if (res?.data) {
          setMessages((prev) => mergeById(prev, res.data));
        }
      })
      .catch((err) => console.warn('Could not load chat history:', err));
  }, [isAuthenticated, status]);

  useStompSubscription<ChatMessageResponse>(
    '/user/queue/chat',
    useCallback((m) => {
      setMessages((prev) => mergeById(prev, [m]));
      if (!isOpenRef.current && m.senderRole === 'ADMIN') {
        setUnreadCount((c) => c + 1);
      }
    }, []),
    isAuthenticated
  );

  useStompSubscription<WsErrorResponse>(
    '/user/queue/errors',
    useCallback((e) => {
      setError(e?.message || 'Gửi tin nhắn thất bại');
    }, []),
    isAuthenticated
  );

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Ẩn widget nếu chưa đăng nhập hoặc đang ở trang quản trị của Admin/Staff
  if (!isAuthenticated || isAdmin || isStaff || location.pathname.startsWith('/admin')) {
    return null;
  }

  const send = () => {
    const content = text.trim();
    if (!content || status !== 'CONNECTED') return;
    setError('');
    try {
      stompService.publish('/app/chat.send', { content });
      setText(''); // Tin nhắn sẽ hiển thị khi server gửi lại qua /user/queue/chat sau khi commit DB
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi tin nhắn lúc này');
    }
  };

  return (
    <>
      {/* Nút mở Chat Hỗ Trợ (nằm ngay dưới nút AI Stylist) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[997] flex items-center gap-2.5 rounded-full border border-line bg-surface-elevated px-4 py-3 text-content-primary shadow-dropdown transition-transform hover:-translate-y-0.5"
          aria-label="Chat hỗ trợ trực tuyến"
        >
          <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-content-inverse">
            <MessageCircle size={15} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-red px-1 text-[0.65rem] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="hidden text-[0.82rem] font-bold tracking-wide sm:inline">
            Chat Với Cửa Hàng
          </span>
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
            )}
          />
        </button>
      )}

      {/* Khung Chat Hỗ Trợ */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 z-[1001] flex h-[82vh] w-full flex-col overflow-hidden border border-line-light bg-surface-body shadow-modal sm:bottom-6 sm:right-6 sm:h-[520px] sm:w-[370px] sm:rounded-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-accent-gold bg-primary px-4 py-3.5 text-content-inverse">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-gold text-content-inverse">
                <Headphones size={17} />
              </div>
              <div>
                <h4 className="m-0 text-[0.86rem] font-extrabold uppercase tracking-wider">
                  CSKH Fashion Website
                </h4>
                <div className="flex items-center gap-1.5 text-[0.7rem] text-accent-gold">
                  {status === 'CONNECTED' ? (
                    <>
                      <Wifi size={11} className="text-emerald-400" />
                      <span>Trực tuyến (Realtime STOMP)</span>
                    </>
                  ) : (
                    <>
                      <WifiOff size={11} className="text-amber-300" />
                      <span>Đang kết nối lại...</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded p-1 text-content-inverse/80 transition-colors hover:bg-white/10 hover:text-content-inverse"
              aria-label="Đóng cửa sổ chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Danh sách tin nhắn */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-surface p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center text-content-muted">
                <MessageCircle size={32} className="mb-2 opacity-30" />
                <p className="m-0 text-xs font-semibold text-content-secondary">
                  Xin chào {user?.fullname || user?.username}!
                </p>
                <p className="m-0 mt-1 text-[0.75rem]">
                  Hãy để lại tin nhắn, đội ngũ tư vấn viên sẽ phản hồi bạn ngay lập tức.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isCustomerMsg = m.senderRole === 'CUSTOMER';
                return (
                  <div
                    key={m.id}
                    className={cn(
                      'flex flex-col',
                      isCustomerMsg ? 'items-end' : 'items-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[82%] px-3.5 py-2.5 text-[0.83rem] leading-relaxed shadow-xs',
                        isCustomerMsg
                          ? 'rounded-t-xl rounded-bl-xl bg-primary text-content-inverse'
                          : 'rounded-t-xl rounded-br-xl border border-line-light bg-surface-elevated text-content-primary'
                      )}
                    >
                      {!isCustomerMsg && (
                        <div className="mb-0.5 text-[0.68rem] font-bold uppercase tracking-wider text-accent-gold">
                          Nhân viên hỗ trợ (@{m.senderUsername})
                        </div>
                      )}
                      <span className="whitespace-pre-wrap break-words">{m.content}</span>
                    </div>
                    <span className="mt-1 px-1 text-[0.66rem] text-content-muted">
                      {formatMessageTime(m.createdAt)}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Thanh thông báo lỗi hoặc trạng thái */}
          {status !== 'CONNECTED' && (
            <div className="bg-amber-50 px-3.5 py-1.5 text-[0.72rem] font-medium text-amber-800 border-t border-amber-200">
              Đang kết nối lại máy chủ WebSocket...
            </div>
          )}
          {error && (
            <div className="flex items-center gap-1.5 bg-red-50 px-3.5 py-1.5 text-[0.74rem] font-medium text-red-700 border-t border-red-200">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Ô nhập tin nhắn */}
          <div className="flex items-center gap-2 border-t border-line-light bg-surface-elevated p-3">
            <input
              type="text"
              value={text}
              maxLength={1000}
              placeholder="Nhập tin nhắn hỗ trợ..."
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  send();
                }
              }}
              className="flex-1 rounded-sm border border-line bg-surface-body px-3 py-2 text-xs text-content-primary outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={send}
              disabled={status !== 'CONNECTED' || !text.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-accent-gold text-content-inverse transition-opacity disabled:opacity-40"
              aria-label="Gửi tin nhắn"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
