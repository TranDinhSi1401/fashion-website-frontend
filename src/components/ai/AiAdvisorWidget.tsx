import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sparkles,
  Send,
  X,
  Bot,
  RefreshCw,
  GripVertical,
  ShoppingBag,
  ChevronRight,
} from 'lucide-react';
import { aiService } from '../../services/aiService';
import { AiSuggestedProduct, ChatMessage } from '../../types/ai';
import { useAuth } from '../../context/AuthContext';
import { formatCurrencyVND } from '../../utils/format';
import styles from './AiAdvisorWidget.module.css';

const SUGGESTED_PROMPTS = [
  'Tư vấn cho tôi một set đồ công sở lịch sự theo gu của tôi?',
  'Gợi ý trang phục đi hẹn hò / tiệc tối cuối tuần?',
  'Dựa trên sở thích của tôi, tôi hợp với tông màu và phom dáng nào?',
  'Phối đồ với Áo sơ mi và Quần tây sao cho trẻ trung?',
];

interface AiAdvisorWidgetProps {
  hideLauncher?: boolean;
}

/**
 * Chuyển đổi văn bản có chứa **in đậm** từ AI thành các đoạn ReactNode sạch sẽ,
 * không để lộ các dấu sao ** thô trong khung chat.
 */
function renderFormattedAiText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-bold text-content-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

/**
 * Thẻ sản phẩm thu gọn (Compact Product Card) hiển thị ngay bên dưới bong bóng tin nhắn của AI.
 * Thiết kế theo bố cục ngang siêu gọn (thumbnail 40x52px, cao ~62px) để không chiếm diện tích khung chat 400x580px:
 * - Hiển thị: Ảnh đại diện (có icon fallback nếu lỗi ảnh), Tên sản phẩm (1 dòng), Giá bán / Giá KM, Màu & Size còn hàng.
 * - Toàn bộ thẻ là một `<Link to="/products/:id">` giúp khách hàng bấm chuyển thẳng sang trang chi tiết sản phẩm.
 */
function AiMiniProductCard({ product }: { product: AiSuggestedProduct }) {
  const [imgFailed, setImgFailed] = useState(false);
  const hasSale =
    product.discountedPrice != null &&
    Number(product.discountedPrice) > 0 &&
    Number(product.discountedPrice) < Number(product.basePrice);
  const displayPrice = hasSale ? Number(product.discountedPrice) : Number(product.basePrice);

  const variantMeta: string[] = [];
  if (product.availableColors && product.availableColors.length > 0) {
    variantMeta.push(product.availableColors.slice(0, 3).join(', '));
  }
  if (product.availableSizes && product.availableSizes.length > 0) {
    variantMeta.push(`Size ${product.availableSizes.slice(0, 4).join(', ')}`);
  }

  return (
    <Link
      to={`/products/${product.id}`}
      className="group flex items-center gap-2.5 rounded-lg border border-line-light bg-surface-body p-1.5 transition-all hover:border-accent-gold hover:shadow-xs"
      title={`Xem chi tiết ${product.name}`}
    >
      {/* Thumbnail nhỏ gọn tỷ lệ 3:4 */}
      <div className="relative h-[52px] w-[40px] shrink-0 overflow-hidden rounded bg-surface text-content-muted">
        {product.imageUrl && !imgFailed ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBag size={15} />
          </div>
        )}
      </div>

      {/* Thông tin tên, giá & màu/size tóm tắt */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold text-content-primary transition-colors group-hover:text-accent-gold">
          {product.name}
        </div>

        <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
          <span className="text-xs font-extrabold text-accent-red">
            {formatCurrencyVND(displayPrice)}
          </span>
          {hasSale && (
            <span className="text-[10px] text-content-muted line-through">
              {formatCurrencyVND(Number(product.basePrice))}
            </span>
          )}
        </div>

        {variantMeta.length > 0 ? (
          <div className="mt-0.5 truncate text-[10px] text-content-muted">
            {variantMeta.join(' · ')}
          </div>
        ) : product.categoryName ? (
          <div className="mt-0.5 truncate text-[10px] text-content-muted">
            {product.categoryName}
          </div>
        ) : null}
      </div>

      {/* Nút điều hướng gọn bên phải */}
      <div className="flex shrink-0 items-center gap-0.5 pr-1 text-[11px] font-bold text-primary transition-transform group-hover:translate-x-0.5 group-hover:text-accent-gold">
        <span>Xem</span>
        <ChevronRight size={13} />
      </div>
    </Link>
  );
}

export default function AiAdvisorWidget({ hideLauncher = true }: AiAdvisorWidgetProps) {
  const { isAuthenticated, user, isAdmin, isStaff } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'ai',
      text: isAuthenticated
        ? `Xin chào ${user?.fullname || 'bạn'}! Tôi là Trợ Lý Thời Trang AI của Fashion Website. Tôi đã đồng bộ Ma trận sở thích và gu thời trang của bạn từ hệ thống. Bạn cần tôi tư vấn set đồ hoặc phong cách nào hôm nay?`
        : 'Xin chào bạn! Tôi là Trợ Lý Thời Trang AI. Hãy cho tôi biết nhu cầu hoặc sự kiện sắp tới để tôi gợi ý trang phục hoàn hảo nhất cho bạn nhé!',
      timestamp: new Date(),
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Draggable state cho nút AI Stylist
  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const isDraggingBtn = useRef(false);
  const hasMovedBtn = useRef(false);
  const btnStartRef = useRef({ pointerX: 0, pointerY: 0, elemX: 0, elemY: 0 });

  useEffect(() => {
    const handleOpenAi = () => setIsOpen(true);
    const handleCloseAll = () => setIsOpen(false);
    window.addEventListener('fashion:open-ai-stylist', handleOpenAi);
    window.addEventListener('fashion:open-store-chat', handleCloseAll);
    return () => {
      window.removeEventListener('fashion:open-ai-stylist', handleOpenAi);
      window.removeEventListener('fashion:open-store-chat', handleCloseAll);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('fashion:ai-stylist-state', { detail: { isOpen } })
    );
  }, [isOpen]);

  const handleLauncherPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const btn = launcherRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    btnStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      elemX: rect.left,
      elemY: rect.top,
    };
    isDraggingBtn.current = true;
    hasMovedBtn.current = false;
    btn.setPointerCapture(e.pointerId);
  };

  const handleLauncherPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingBtn.current) return;
    const dx = e.clientX - btnStartRef.current.pointerX;
    const dy = e.clientY - btnStartRef.current.pointerY;

    if (Math.hypot(dx, dy) > 4) {
      hasMovedBtn.current = true;
    }

    if (hasMovedBtn.current && launcherRef.current) {
      const w = launcherRef.current.offsetWidth || 180;
      const h = launcherRef.current.offsetHeight || 52;
      const maxX = window.innerWidth - w - 8;
      const maxY = window.innerHeight - h - 8;

      const newX = Math.max(8, Math.min(maxX, btnStartRef.current.elemX + dx));
      const newY = Math.max(8, Math.min(maxY, btnStartRef.current.elemY + dy));
      setBtnPos({ x: newX, y: newY });
    }
  };

  const handleLauncherPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingBtn.current) return;
    isDraggingBtn.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleLauncherClick = (e: React.MouseEvent) => {
    if (hasMovedBtn.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setIsOpen(true);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Ẩn hoàn toàn trên các trang quản trị của Admin/Staff (đặt sau toàn bộ Hook để tuân thủ Rules of Hooks)
  if (isAdmin || isStaff || location.pathname.startsWith('/admin')) {
    return null;
  }

  const handleSend = async (questionToSend?: string) => {
    const text = (questionToSend || inputQuestion).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionToSend) setInputQuestion('');
    setIsLoading(true);

    try {
      const response = await aiService.advise(text);
      const aiMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text:
          response.answer ||
          'Rất tiếc, tôi chưa có câu trả lời phù hợp lúc này. Bạn thử hỏi câu khác nhé!',
        products: response.suggestedProducts,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: 'Xin lỗi bạn, kết nối tới dịch vụ AI đang bận. Vui lòng thử lại sau ít giây.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <>
      {/* Nút bấm mở Floating AI Stylist (Đã được gộp vào bong bóng chat chung khi hideLauncher = true) */}
      {!hideLauncher && !isOpen && (
        <button
          ref={launcherRef}
          type="button"
          onClick={handleLauncherClick}
          onPointerDown={handleLauncherPointerDown}
          onPointerMove={handleLauncherPointerMove}
          onPointerUp={handleLauncherPointerUp}
          onPointerCancel={handleLauncherPointerUp}
          style={
            btnPos
              ? { left: `${btnPos.x}px`, top: `${btnPos.y}px`, bottom: 'auto', right: 'auto' }
              : undefined
          }
          className={`${styles.launcherBtn} select-none touch-none cursor-grab active:cursor-grabbing flex items-center gap-2`}
          title="Bấm để mở hoặc kéo thả để di chuyển đến vị trí mong muốn"
          aria-label="Tư vấn thời trang AI (Kéo thả để di chuyển)"
        >
          <GripVertical size={13} className="text-content-muted opacity-60 shrink-0 cursor-grab" />
          <div className="w-7 h-7 rounded-full bg-accent-gold flex items-center justify-center text-content-inverse shrink-0">
            <Sparkles size={16} />
          </div>
          <span className={styles.launcherText}>AI Stylist Tư Vấn</span>
        </button>
      )}

      {/* Hộp Chat AI Styling Modal */}
      {isOpen && (
        <div className={styles.widgetShell}>
          {/* Header */}
          <div className="bg-primary text-content-inverse px-5 py-3.5 flex items-center justify-between border-b-2 border-accent-gold">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-accent-gold flex items-center justify-center text-content-inverse">
                <Sparkles size={18} />
              </div>
              <div>
                <h4 className="m-0 text-[0.92rem] font-extrabold tracking-[0.04em]">
                  AI STYLIST TƯ VẤN
                </h4>
                <p className="m-0 text-[0.72rem] text-accent-gold">
                  {isAuthenticated
                    ? 'Đã kích hoạt Ma trận sở thích của bạn'
                    : 'Tư vấn thời trang thông minh'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="bg-transparent border-0 text-content-muted hover:text-content-inverse cursor-pointer p-1 transition-colors"
              aria-label="Đóng chat"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3.5 bg-surface-elevated">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={
                  msg.sender === 'user'
                    ? 'flex gap-2 self-end max-w-[85%]'
                    : 'flex gap-2 self-start max-w-[90%] w-full'
                }
              >
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-primary text-accent-gold flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={16} />
                  </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className={msg.sender === 'user' ? styles.userBubble : styles.aiBubble}>
                    {msg.sender === 'ai' ? renderFormattedAiText(msg.text) : msg.text}
                  </div>

                  {/* Danh sách sản phẩm được AI tư vấn (Thẻ ngang nhỏ gọn, tối đa cao ~148px có cuộn nếu nhiều SP) */}
                  {msg.sender === 'ai' && msg.products && msg.products.length > 0 && (
                    <div className="rounded-xl border border-line-light bg-surface p-2 shadow-2xs">
                      <div className="mb-1.5 flex items-center justify-between px-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted">
                          Sản phẩm gợi ý ({msg.products.length})
                        </span>
                        <span className="text-[10px] text-content-muted">Bấm để xem chi tiết</span>
                      </div>
                      <div className="max-h-[144px] space-y-1.5 overflow-y-auto pr-0.5">
                        {msg.products.map((prod) => (
                          <AiMiniProductCard key={prod.id} product={prod} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 self-start">
                <div className="w-7 h-7 rounded-full bg-primary text-accent-gold flex items-center justify-center shrink-0">
                  <Bot size={16} />
                </div>
                <div className="bg-surface-body px-4 py-2.5 rounded-modal border border-line-light flex items-center gap-1.5 text-content-secondary text-[0.82rem]">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>AI đang phân tích sở thích &amp; tìm sản phẩm...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts (Gợi ý câu hỏi) */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 bg-surface-body border-t border-line-light flex flex-col gap-1.5">
              <span className="text-[0.7rem] font-bold text-content-muted uppercase">
                Gợi ý câu hỏi nhanh:
              </span>
              <div className="flex flex-col gap-1">
                {SUGGESTED_PROMPTS.slice(0, 2).map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => void handleSend(prompt)}
                    className={styles.suggestedBtn}
                  >
                    💡 {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Box */}
          <div className="px-4 py-3 bg-surface-body border-t border-line-light flex items-center gap-2">
            <input
              type="text"
              placeholder="Nhập câu hỏi bạn muốn AI tư vấn..."
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className={styles.chatInput}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={isLoading || !inputQuestion.trim()}
              className={styles.sendBtn}
              aria-label="Gửi câu hỏi"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

