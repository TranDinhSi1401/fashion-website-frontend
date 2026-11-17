import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  MessageCircle,
  Send,
  X,
  AlertCircle,
  Wifi,
  WifiOff,
  Headphones,
  ImagePlus,
  ZoomIn,
  Loader2,
  CheckCheck,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../services/chatService';
import { stompService } from '../../ws/stompService';
import { useStompSubscription } from '../../ws/useStompSubscription';
import { useWsStatus } from '../../ws/WebSocketProvider';
import { mergeById } from '../../utils/chat';
import { ChatMessageResponse, WsErrorResponse } from '../../types/realtime';
import { extractErrorMessage } from '../../utils/format';
import { cn } from '../../utils/cn';

const CUSTOMER_QUICK_QUESTIONS = [
  'Tư vấn chọn size giúp mình',
  'Kiểm tra trạng thái đơn hàng',
  'Chính sách đổi trả 30 ngày',
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

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

  // State đính kèm hình ảnh & Lightbox
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

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

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom('smooth');
    }
  }, [messages.length, isOpen]);

  // Ẩn widget nếu chưa đăng nhập hoặc đang ở trang quản trị của Admin/Staff
  if (!isAuthenticated || isAdmin || isStaff || location.pathname.startsWith('/admin')) {
    return null;
  }

  const handleSelectImage = (file: File | null | undefined) => {
    if (!file) return;
    setError('');
    if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      setError('Chỉ hỗ trợ định dạng ảnh JPG, PNG, WEBP hoặc GIF.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError('Kích thước ảnh tối đa 5MB.');
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
          handleSelectImage(file);
          break;
        }
      }
    }
  };

  const send = async () => {
    const content = text.trim();
    if ((!content && !selectedImageFile) || status !== 'CONNECTED' || uploadingImage) return;
    setError('');
    try {
      let uploadedImageUrl: string | undefined;
      if (selectedImageFile) {
        setUploadingImage(true);
        const uploadRes = await chatService.uploadChatImage(selectedImageFile);
        uploadedImageUrl = uploadRes.data;
      }

      stompService.publish('/app/chat.send', {
        content,
        imageUrl: uploadedImageUrl || null,
      });

      setText('');
      clearSelectedImage();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Không thể gửi tin nhắn lúc này'));
    } finally {
      setUploadingImage(false);
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
        <div className="fixed bottom-0 right-0 z-[1001] flex h-[84vh] w-full flex-col overflow-hidden border border-line bg-surface-body shadow-modal sm:bottom-6 sm:right-6 sm:h-[560px] sm:w-[390px] sm:rounded-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-accent-gold bg-primary px-4 py-3.5 text-content-inverse shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-gold text-content-inverse">
                <Headphones size={17} />
              </div>
              <div>
                <h4 className="m-0 text-[0.84rem] font-extrabold uppercase tracking-wider">
                  CSKH Fashion Website
                </h4>
                <div className="flex items-center gap-1.5 text-[0.68rem] text-accent-gold">
                  {status === 'CONNECTED' ? (
                    <>
                      <Wifi size={11} className="text-emerald-400" />
                      <span>Trực tuyến • Hỗ trợ gửi ảnh &amp; tin nhắn</span>
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
          <div
            ref={messagesContainerRef}
            className="flex-1 space-y-3 overflow-y-auto bg-surface p-4"
          >
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center text-content-muted">
                <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface-elevated">
                  <MessageCircle size={22} className="text-accent-gold" />
                </div>
                <p className="m-0 text-xs font-bold text-content-primary">
                  Xin chào {user?.fullname || user?.username}!
                </p>
                <p className="m-0 mt-1 text-[0.74rem] text-content-muted">
                  Bạn có thể gửi tin nhắn hoặc đính kèm hình ảnh sản phẩm/đơn hàng để tư vấn viên hỗ trợ ngay.
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
                        'max-w-[82%] overflow-hidden px-3.5 py-2.5 text-[0.82rem] leading-relaxed shadow-xs',
                        isCustomerMsg
                          ? 'rounded-2xl rounded-br-none bg-primary text-content-inverse'
                          : 'rounded-2xl rounded-bl-none border border-line bg-surface-elevated text-content-primary'
                      )}
                    >
                      {!isCustomerMsg && (
                        <div className="mb-1 flex items-center gap-1 text-[0.65rem] font-extrabold uppercase tracking-wider text-accent-gold">
                          <Headphones size={11} />
                          <span>Tư vấn viên (@{m.senderUsername})</span>
                        </div>
                      )}

                      {m.imageUrl && (
                        <div className={cn('group relative overflow-hidden rounded-sm border border-white/15', m.content ? 'mb-2' : '')}>
                          <img
                            src={m.imageUrl}
                            alt="Ảnh đính kèm"
                            loading="lazy"
                            onClick={() => setLightboxImageUrl(m.imageUrl || null)}
                            className="max-h-52 w-auto max-w-full cursor-zoom-in object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setLightboxImageUrl(m.imageUrl || null)}
                            className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-sm bg-black/75 px-2 py-0.5 text-[0.62rem] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <ZoomIn size={11} />
                            <span>Xem lớn</span>
                          </button>
                        </div>
                      )}

                      {m.content && (
                        <span className="whitespace-pre-wrap break-words">{m.content}</span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-1 px-1 text-[0.64rem] text-content-muted">
                      <span>{formatMessageTime(m.createdAt)}</span>
                      {isCustomerMsg && <CheckCheck size={11} className="text-accent-gold" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Gợi ý câu hỏi nhanh */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-line-light bg-surface-elevated px-3 py-1.5 shrink-0">
            {CUSTOMER_QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setText(q)}
                className="shrink-0 rounded-full border border-line bg-surface px-2.5 py-0.5 text-[0.68rem] font-medium text-content-secondary transition-colors hover:border-primary hover:bg-primary hover:text-content-inverse"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Xem trước ảnh đính kèm trước khi gửi */}
          {selectedImagePreview && selectedImageFile && (
            <div className="flex items-center justify-between gap-2 border-t border-line bg-surface px-3 py-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={selectedImagePreview}
                  alt="Preview"
                  className="h-11 w-11 shrink-0 rounded-sm border border-accent-gold object-cover"
                />
                <div className="min-w-0">
                  <p className="m-0 truncate text-[0.72rem] font-bold text-content-primary">
                    {selectedImageFile.name}
                  </p>
                  <p className="m-0 text-[0.65rem] text-content-muted">
                    Sẵn sàng gửi hình ảnh
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearSelectedImage}
                disabled={uploadingImage}
                className="rounded-sm p-1 text-content-muted hover:text-status-error"
                aria-label="Xóa ảnh đính kèm"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Thanh thông báo lỗi hoặc trạng thái */}
          {status !== 'CONNECTED' && (
            <div className="bg-amber-50 px-3.5 py-1.5 text-[0.72rem] font-medium text-amber-800 border-t border-amber-200 shrink-0">
              Đang kết nối lại máy chủ WebSocket...
            </div>
          )}
          {error && (
            <div className="flex items-center justify-between gap-1.5 bg-red-50 px-3.5 py-1.5 text-[0.74rem] font-medium text-red-700 border-t border-red-200 shrink-0">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
              <button type="button" onClick={() => setError('')} className="text-red-500">
                <X size={13} />
              </button>
            </div>
          )}

          {/* Ô nhập tin nhắn + Đính kèm hình ảnh */}
          <div className="flex items-center gap-2 border-t border-line bg-surface-elevated p-3 shrink-0">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => handleSelectImage(e.target.files?.[0])}
            />

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={status !== 'CONNECTED' || uploadingImage}
              title="Đính kèm hình ảnh (Hoặc dán ảnh bằng Ctrl+V)"
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border transition-colors',
                selectedImageFile
                  ? 'border-accent-gold bg-accent-gold/15 text-accent-gold'
                  : 'border-line bg-surface-body text-content-secondary hover:border-primary hover:text-content-primary disabled:opacity-40'
              )}
              aria-label="Đính kèm hình ảnh"
            >
              <ImagePlus size={16} />
            </button>

            <input
              type="text"
              value={text}
              maxLength={1000}
              placeholder="Nhập tin nhắn hoặc dán ảnh (Ctrl+V)..."
              onChange={(e) => setText(e.target.value)}
              onPaste={handlePasteClipboard}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void send();
                }
              }}
              className="flex-1 rounded-sm border border-line bg-surface-body px-3 py-2 text-xs text-content-primary outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={status !== 'CONNECTED' || (!text.trim() && !selectedImageFile) || uploadingImage}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-accent-gold text-content-inverse transition-opacity disabled:opacity-40"
              aria-label="Gửi tin nhắn"
            >
              {uploadingImage ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      )}

      {/* Lightbox xem ảnh phóng to */}
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
                  className="flex items-center gap-1.5 rounded-sm border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
                >
                  <ExternalLink size={13} />
                  <span>Mở Ảnh Gốc</span>
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxImageUrl(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-sm border border-white/25 bg-white/10 text-white hover:bg-white/20"
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
    </>
  );
}
