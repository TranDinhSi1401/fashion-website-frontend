import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  MessageCircle,
  Send,
  X,
  AlertCircle,
  Headphones,
  ImagePlus,
  ZoomIn,
  Loader2,
  CheckCheck,
  ExternalLink,
  Minus,
  ChevronDown,
  Smile,
  Ruler,
  Package,
  RotateCcw,
  Sparkles,
  Calculator,
  ArrowDown,
  UploadCloud,
  GripVertical,
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
import styles from './ChatWidget.module.css';

interface QuickQuestion {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
  isSpecial?: 'size_calc';
}

const QUICK_QUESTIONS: QuickQuestion[] = [
  {
    id: 'size_help',
    label: 'Tư vấn chọn size',
    icon: <Ruler size={13} className="text-[#C9A961]" />,
    prompt: 'Nhờ shop tư vấn chọn size chuẩn giúp mình với nhé.',
  },
  {
    id: 'size_calculator',
    label: 'Bảng tính size nhanh',
    icon: <Calculator size={13} className="text-[#C9A961]" />,
    prompt: '',
    isSpecial: 'size_calc',
  },
  {
    id: 'order_status',
    label: 'Kiểm tra đơn hàng',
    icon: <Package size={13} className="text-[#C9A961]" />,
    prompt: 'Shop kiểm tra giúp mình tình trạng đơn hàng mới đặt nhé.',
  },
  {
    id: 'return_policy',
    label: 'Đổi trả trong 30 ngày',
    icon: <RotateCcw size={13} className="text-[#C9A961]" />,
    prompt: 'Shop cho mình hỏi về chính sách đổi size / đổi trả hàng trong 30 ngày nhé.',
  },
  {
    id: 'promotions',
    label: 'Ưu đãi hôm nay',
    icon: <Sparkles size={13} className="text-[#C9A961]" />,
    prompt: 'Cửa hàng hiện đang có mã giảm giá hay chương trình ưu đãi nào không ạ?',
  },
];

const POPULAR_EMOJIS = ['😊', '👍', '❤️', '🔥', '✨', '🙏', '👕', '👔', '📦', '⭐', '💯', '👌'];

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

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function formatDateSeparator(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Hôm nay';
  const now = new Date();
  if (isSameDay(d, now)) return 'Hôm nay';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, yesterday)) return 'Hôm qua';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export default function ChatWidget() {
  const { isAuthenticated, isAdmin, isStaff, user } = useAuth();
  const location = useLocation();
  const status = useWsStatus();

  // Widget States
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [isAiStylistOpen, setIsAiStylistOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Quick replies & suggestions
  const [usedQuestions, setUsedQuestions] = useState<string[]>([]);
  const [showQuickChips, setShowQuickChips] = useState(true);

  // Size Calculator Tool
  const [showSizeCalc, setShowSizeCalc] = useState(false);
  const [heightCm, setHeightCm] = useState('172');
  const [weightKg, setWeightKg] = useState('65');

  // Drag & drop / Emoji / Scroll
  const [isDragging, setIsDragging] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isAdvisorTyping, setIsAdvisorTyping] = useState(false);

  // State đính kèm hình ảnh & Lightbox
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Draggable States cho Launcher & Chat Window
  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  const [dockSide, setDockSide] = useState<'left' | 'right'>('right');
  const [isSnappingBtn, setIsSnappingBtn] = useState(false);
  const [windowPos, setWindowPos] = useState<{ x: number; y: number } | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const isDraggingBtn = useRef(false);
  const hasMovedBtn = useRef(false);
  const btnStartRef = useRef({ pointerX: 0, pointerY: 0, elemX: 0, elemY: 0 });
  const isDraggingWin = useRef(false);
  const winStartRef = useRef({ pointerX: 0, pointerY: 0, elemX: 0, elemY: 0 });

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isOpenRef = useRef(isOpen);

  // Lắng nghe trạng thái đóng/mở của AI Stylist để đồng bộ bong bóng chung
  useEffect(() => {
    const handleAiState = (e: Event) => {
      const customEvent = e as CustomEvent<{ isOpen: boolean }>;
      setIsAiStylistOpen(Boolean(customEvent.detail?.isOpen));
    };
    window.addEventListener('fashion:ai-stylist-state', handleAiState);
    return () => window.removeEventListener('fashion:ai-stylist-state', handleAiState);
  }, []);

  // Giữ bong bóng bám đúng lề trái/phải khi người dùng thay đổi kích thước cửa sổ trình duyệt
  useEffect(() => {
    const handleResize = () => {
      setBtnPos((prev) => {
        if (!prev) return null;
        const w = launcherRef.current?.offsetWidth || 60;
        const h = launcherRef.current?.offsetHeight || 60;
        const edgeMargin = window.innerWidth < 640 ? 16 : 24;
        const snappedX =
          dockSide === 'left' ? edgeMargin : Math.max(edgeMargin, window.innerWidth - w - edgeMargin);
        const clampedY = Math.max(12, Math.min(window.innerHeight - h - 12, prev.y));
        return { x: snappedX, y: clampedY };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dockSide]);

  // Kéo thả Launcher Button (khi thả ra sẽ tự động hút về lề trái hoặc lề phải gần nhất)
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
    setIsSnappingBtn(false);
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
      if (isMenuExpanded) {
        setIsMenuExpanded(false);
      }
      const w = launcherRef.current.offsetWidth || 60;
      const h = launcherRef.current.offsetHeight || 60;
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

    if (hasMovedBtn.current && launcherRef.current) {
      const rect = launcherRef.current.getBoundingClientRect();
      const w = rect.width || 60;
      const h = rect.height || 60;
      const edgeMargin = window.innerWidth < 640 ? 16 : 24;

      // Chỉ xét 2 lề trái và phải: tâm bong bóng gần lề nào hơn thì hút mượt về lề đó, giữ nguyên trục Y
      const centerX = rect.left + w / 2;
      const isLeftCloser = centerX < window.innerWidth / 2;
      const targetSide: 'left' | 'right' = isLeftCloser ? 'left' : 'right';
      const targetX = isLeftCloser
        ? edgeMargin
        : Math.max(edgeMargin, window.innerWidth - w - edgeMargin);
      const clampedY = Math.max(12, Math.min(window.innerHeight - h - 12, rect.top));

      setDockSide(targetSide);
      setIsSnappingBtn(true);
      setBtnPos({ x: targetX, y: clampedY });
    }
  };

  const handleLauncherClick = (e: React.MouseEvent) => {
    if (hasMovedBtn.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Nếu khách chưa đăng nhập thì chỉ có 1 chức năng AI Stylist -> mở luôn hoặc mở menu tùy chọn
    setIsMenuExpanded((prev) => !prev);
  };

  const handleOpenAiStylist = () => {
    setIsMenuExpanded(false);
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('fashion:open-ai-stylist'));
  };

  const handleOpenStoreChat = () => {
    setIsMenuExpanded(false);
    window.dispatchEvent(new CustomEvent('fashion:open-store-chat'));
    setIsOpen(true);
    setIsMinimized(false);
  };

  // Kéo thả Chat Window Header
  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.button !== 0) return;
    if (window.innerWidth < 640) return;

    const win = chatWindowRef.current;
    if (!win) return;
    const rect = win.getBoundingClientRect();

    winStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      elemX: rect.left,
      elemY: rect.top,
    };
    isDraggingWin.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingWin.current) return;
    const dx = e.clientX - winStartRef.current.pointerX;
    const dy = e.clientY - winStartRef.current.pointerY;

    if (chatWindowRef.current) {
      const w = chatWindowRef.current.offsetWidth || 380;
      const h = chatWindowRef.current.offsetHeight || 600;
      const maxX = window.innerWidth - w - 8;
      const maxY = window.innerHeight - h - 8;

      const newX = Math.max(8, Math.min(maxX, winStartRef.current.elemX + dx));
      const newY = Math.max(8, Math.min(maxY, winStartRef.current.elemY + dy));
      setWindowPos({ x: newX, y: newY });
    }
  };

  const handleHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingWin.current) return;
    isDraggingWin.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setUnreadCount(0);
      setIsMinimized(false);
      setIsMenuExpanded(false);
    }
  }, [isOpen]);

  // Clean up blob preview
  useEffect(() => {
    return () => {
      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  // Handle ESC key to close/minimize
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isMenuExpanded) {
          setIsMenuExpanded(false);
        } else if (isOpen) {
          setIsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMenuExpanded]);

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

  // Nhận tin nhắn mới qua WebSocket STOMP
  useStompSubscription<ChatMessageResponse>(
    '/user/queue/chat',
    useCallback((m) => {
      setMessages((prev) => mergeById(prev, [m]));
      if (m.senderRole === 'ADMIN') {
        setIsAdvisorTyping(false);
        if (!isOpenRef.current) {
          setUnreadCount((c) => c + 1);
        }
      }
    }, []),
    isAuthenticated
  );

  useStompSubscription<WsErrorResponse>(
    '/user/queue/errors',
    useCallback((e) => {
      setIsAdvisorTyping(false);
      setError(e?.message || 'Gửi tin nhắn thất bại');
    }, []),
    isAuthenticated
  );

  // Cuộn xuống cuối
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
      setShowScrollBottom(false);
    }
  };

  // Lắng nghe sự kiện scroll để hiện nút "Cuộn xuống"
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollBottom(distanceToBottom > 120);
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom('smooth');
    }
  }, [messages.length, isOpen, isMinimized, isAdvisorTyping]);

  // Sắp xếp tin nhắn tuyệt đối theo thời gian thực (tránh lỗi 15:05 nhảy sau 15:17)
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB && !Number.isNaN(timeA) && !Number.isNaN(timeB)) {
        return timeA - timeB;
      }
      return a.id - b.id;
    });
  }, [messages]);

  // Gợi ý kích thước dựa trên chiều cao & cân nặng
  const calculatedSize = useMemo(() => {
    const h = parseInt(heightCm, 10) || 170;
    const w = parseInt(weightKg, 10) || 65;
    if (w < 55) return { size: 'S', note: 'Ôm vừa người, thanh mảnh' };
    if (w <= 65) return { size: 'M', note: 'Vừa vặn chuẩn người mẫu' };
    if (w <= 75) return { size: 'L', note: 'Thoải mái, sang trọng' };
    if (w <= 85) return { size: 'XL', note: 'Rộng rãi, lịch lãm' };
    return { size: 'XXL', note: 'Form lớn thoải mái' };
  }, [heightCm, weightKg]);

  // Ẩn widget nếu đang ở trang quản trị của Admin/Staff
  if (isAdmin || isStaff || location.pathname.startsWith('/admin')) {
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleSelectImage(file);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
  };

  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleSendQuickQuestion = (q: QuickQuestion) => {
    if (q.isSpecial === 'size_calc') {
      setShowSizeCalc(true);
      return;
    }

    setUsedQuestions((prev) => (prev.includes(q.id) ? prev : [...prev, q.id]));
    setText(q.prompt);
    // Gửi ngay lập tức nếu đã kết nối
    if (status === 'CONNECTED') {
      stompService.publish('/app/chat.send', {
        content: q.prompt,
        imageUrl: null,
      });
      setText('');
      // Hiển thị trạng thái tư vấn viên chuẩn bị phản hồi
      setIsAdvisorTyping(true);
      setTimeout(() => setIsAdvisorTyping(false), 5000);
    }
  };

  const handleSendSizeCalcResult = () => {
    const content = `Nhờ shop tư vấn size giúp mình: Chiều cao ${heightCm}cm, Cân nặng ${weightKg}kg. Gợi ý ban đầu là size ${calculatedSize.size} (${calculatedSize.note}).`;
    if (status === 'CONNECTED') {
      stompService.publish('/app/chat.send', {
        content,
        imageUrl: null,
      });
    } else {
      setText(content);
    }
    setShowSizeCalc(false);
    setUsedQuestions((prev) => (prev.includes('size_calculator') ? prev : [...prev, 'size_calculator']));
  };

  const send = async () => {
    const content = text.trim();
    if ((!content && !selectedImageFile) || status !== 'CONNECTED' || uploadingImage) return;
    setError('');
    setShowEmojiPicker(false);

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
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      clearSelectedImage();

      // Giả lập trạng thái typing phản hồi từ chuyên viên trong vài giây
      setIsAdvisorTyping(true);
      setTimeout(() => setIsAdvisorTyping(false), 4500);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Không thể gửi tin nhắn lúc này'));
    } finally {
      setUploadingImage(false);
    }
  };

  // Lọc các câu hỏi nhanh chưa sử dụng
  const availableQuickQuestions = QUICK_QUESTIONS.filter((q) => !usedQuestions.includes(q.id));

  return (
    <>
      {/* Lớp nền mờ nhẹ khi mở menu bong bóng hướng tâm */}
      <div
        onClick={() => setIsMenuExpanded(false)}
        className={cn(
          styles.speedDialBackdrop,
          isMenuExpanded && !isOpen && !isAiStylistOpen
            ? styles.speedDialBackdropOpen
            : styles.speedDialBackdropClosed
        )}
        aria-hidden="true"
      />

      {/* Bong bóng gộp (Unified Radial Speed-Dial Bubble) cho AI Stylist & Chat Với Cửa Hàng */}
      {!isOpen && !isAiStylistOpen && (
        <div
          style={
            btnPos
              ? { left: `${btnPos.x}px`, top: `${btnPos.y}px`, bottom: 'auto', right: 'auto' }
              : undefined
          }
          className={cn(styles.speedDialRoot, isSnappingBtn && styles.speedDialSnapping)}
        >
          {/* Mục 1: AI Stylist Tư Vấn (Xòe lên cung trên) */}
          <button
            type="button"
            onClick={handleOpenAiStylist}
            className={cn(
              styles.radialItem,
              dockSide === 'left' && styles.radialItemLeft,
              isMenuExpanded
                ? dockSide === 'left'
                  ? styles.radialItemAiOpenLeft
                  : styles.radialItemAiOpen
                : styles.radialItemClosed
            )}
            aria-label="Mở AI Stylist Tư Vấn"
          >
            <div className={cn(styles.radialLabel, dockSide === 'left' && styles.radialLabelLeft)}>
              <span className={styles.radialTitle}>AI Stylist Tư Vấn</span>
              <span className={styles.radialSub}>Phối đồ thông minh</span>
            </div>
            <div className={cn(styles.radialCircle, styles.radialCircleAi)}>
              <Sparkles size={21} />
            </div>
          </button>

          {/* Mục 2: Chat Với Cửa Hàng (Xòe chéo theo hình vòng cung vào trong màn hình) */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleOpenStoreChat}
              className={cn(
                styles.radialItem,
                dockSide === 'left' && styles.radialItemLeft,
                isMenuExpanded
                  ? dockSide === 'left'
                    ? styles.radialItemChatOpenLeft
                    : styles.radialItemChatOpen
                  : styles.radialItemClosed
              )}
              aria-label="Mở Chat Với Cửa Hàng"
            >
              <div className={cn(styles.radialLabel, dockSide === 'left' && styles.radialLabelLeft)}>
                <span className={styles.radialTitle}>Chat Với Cửa Hàng</span>
                <span className={styles.radialSub}>Tư vấn viên online</span>
              </div>
              <div className={cn(styles.radialCircle, styles.radialCircleChat)}>
                <MessageCircle size={20} className="fill-[#E5CA82]" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[0.65rem] font-extrabold text-white">
                    {unreadCount}
                  </span>
                )}
                <span
                  className={cn(
                    'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#111111]',
                    status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-amber-400'
                  )}
                />
              </div>
            </button>
          )}

          {/* Nút Bong bóng chính (Nhấn để bung / đóng với hiệu ứng xoay X mượt mà) */}
          <button
            ref={launcherRef}
            type="button"
            onClick={handleLauncherClick}
            onPointerDown={handleLauncherPointerDown}
            onPointerMove={handleLauncherPointerMove}
            onPointerUp={handleLauncherPointerUp}
            onPointerCancel={handleLauncherPointerUp}
            title="Nhấn để chọn trợ lý tư vấn hoặc kéo thả để di chuyển"
            aria-expanded={isMenuExpanded}
            aria-label="Mở menu tư vấn và trò chuyện"
            className={cn(
              styles.mainFab,
              isMenuExpanded ? styles.mainFabOpen : styles.launcherPulse,
              'select-none touch-none'
            )}
          >
            <div className={styles.fabIconWrap}>
              <div
                className={cn(
                  styles.fabIcon,
                  isMenuExpanded ? styles.fabIconHidden : styles.fabIconVisible
                )}
              >
                <div className="relative flex items-center justify-center">
                  <MessageCircle size={24} className="text-[#E5CA82] fill-[#E5CA82]/20" />
                  <Sparkles
                    size={12}
                    className="absolute -right-1.5 -top-1.5 text-[#FAF8F5] drop-shadow"
                  />
                </div>
              </div>
              <X
                size={24}
                strokeWidth={2.5}
                className={cn(
                  styles.fabIcon,
                  isMenuExpanded ? styles.fabCloseVisible : styles.fabCloseHidden
                )}
              />
            </div>

            {/* Chấm báo tin nhắn chưa đọc hoặc trạng thái trực tuyến trên nút chính khi đang đóng */}
            {!isMenuExpanded && unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[0.68rem] font-extrabold text-white shadow-md animate-pulse">
                {unreadCount}
              </span>
            )}
            {!isMenuExpanded && isAuthenticated && unreadCount === 0 && (
              <span
                className={cn(
                  'absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#111111]',
                  status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
                )}
                title={status === 'CONNECTED' ? 'Tư vấn viên đang online' : 'Đang kết nối'}
              />
            )}
          </button>
        </div>
      )}

      {/* Mini Bar khi bấm Minimize (Thu nhỏ) */}
      {isOpen && isMinimized && (
        <div
          onClick={() => setIsMinimized(false)}
          style={btnPos ? { left: `${btnPos.x}px`, top: `${btnPos.y}px`, bottom: 'auto', right: 'auto' } : undefined}
          className={cn(
            'fixed z-[1001] flex cursor-pointer items-center gap-3 rounded-full border border-[#C9A961]/40 bg-[#111111] px-4 py-2.5 text-white shadow-2xl transition-transform hover:-translate-y-0.5',
            !btnPos && 'bottom-6 right-6'
          )}
        >
          <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[#C9A961] text-[#111111]">
            <Headphones size={15} />
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-black bg-emerald-500" />
          </div>
          <span className="text-xs font-semibold tracking-wide">CSKH Trực Tuyến</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="ml-1 rounded-full p-1 text-gray-400 hover:text-white"
            aria-label="Đóng cửa sổ chat"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Khung Chat Hỗ Trợ (Cửa sổ chính) */}
      {isOpen && !isMinimized && (
        <div
          ref={chatWindowRef}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={windowPos ? { left: `${windowPos.x}px`, top: `${windowPos.y}px`, bottom: 'auto', right: 'auto' } : undefined}
          className={cn(
            'fixed z-[1001] flex flex-col overflow-hidden',
            // Mobile: Full-width / Bottom Sheet bo góc đỉnh
            'bottom-0 right-0 left-0 h-[88vh] max-h-[88vh] rounded-t-[20px] rounded-b-none',
            // Desktop: Kích thước 380x600px neo góc dưới phải (nếu chưa kéo)
            !windowPos && 'sm:bottom-6 sm:right-6 sm:left-auto',
            'sm:h-[600px] sm:w-[380px] sm:rounded-[20px]',
            styles.chatContainer,
            styles.safeBottom
          )}
        >
          {/* Lớp phủ Drag & Drop khi kéo ảnh vào */}
          {isDragging && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#111111]/85 p-6 text-center text-white backdrop-blur-xs">
              <UploadCloud size={44} className="mb-2 text-[#C9A961] animate-bounce" />
              <p className="text-sm font-bold text-[#FAF8F5]">Thả hình ảnh vào đây để gửi</p>
              <p className="text-xs text-[#8A8A8A]">Hỗ trợ JPG, PNG, WEBP tối đa 5MB</p>
            </div>
          )}

          {/* Header sang trọng với đường gradient gold mảnh - Hỗ trợ kéo di chuyển cửa sổ */}
          <div
            onPointerDown={handleHeaderPointerDown}
            onPointerMove={handleHeaderPointerMove}
            onPointerUp={handleHeaderPointerUp}
            onPointerCancel={handleHeaderPointerUp}
            className="relative bg-[#111111] px-4 py-3.5 text-white shrink-0 sm:cursor-grab sm:active:cursor-grabbing select-none touch-none"
            title="Kéo thả để di chuyển cửa sổ chat"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <GripVertical size={16} className="text-[#8A8A8A] hover:text-[#C9A961] opacity-70 shrink-0 hidden sm:inline" />
                {/* Avatar tư vấn viên với chấm xanh online */}
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#947633] via-[#C9A961] to-[#E9D49C] text-[#111111] shadow-xs">
                  <Headphones size={20} className="text-[#111111]" />
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#111111]',
                      status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-amber-400'
                    )}
                    title={status === 'CONNECTED' ? 'Đang trực tuyến' : 'Mất kết nối'}
                  />
                </div>
                <div>
                  <h4 className="m-0 flex items-center gap-1.5 text-[0.88rem] font-bold tracking-wide text-[#FAF8F5]">
                    CSKH FASHION WEB
                  </h4>
                  <div className="flex items-center gap-1 text-[0.68rem] text-[#C9A961]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Thường trả lời trong vài phút</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Minimize & Close */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="rounded-full p-1.5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                  title="Thu nhỏ"
                  aria-label="Thu nhỏ cửa sổ chat"
                >
                  <Minus size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1.5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                  title="Đóng (Esc)"
                  aria-label="Đóng cửa sổ chat"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Đường viền gradient vàng mảnh dưới đáy header */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A961] to-transparent" />
          </div>

          {/* Khu vực danh sách tin nhắn */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className={cn('flex-1 space-y-2 overflow-y-auto p-4', styles.messagesScroll)}
            role="log"
            aria-live="polite"
          >
            {sortedMessages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-[#C9A961]/30 bg-white shadow-sm">
                  <Headphones size={24} className="text-[#C9A961]" />
                </div>
                <h5 className="m-0 text-sm font-bold text-[#111111]">
                  Xin chào {user?.fullname || user?.username}!
                </h5>
                <p className="m-0 mt-1.5 text-[0.76rem] leading-relaxed text-[#8A8A8A] max-w-[260px]">
                  Chuyên viên hỗ trợ luôn sẵn sàng tư vấn size trang phục, kiểm tra đơn hàng và giải đáp thắc mắc cho bạn.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-[0.72rem] font-semibold text-[#C9A961]">
                  <Sparkles size={13} />
                  <span>Chọn câu hỏi nhanh bên dưới để bắt đầu</span>
                </div>
              </div>
            ) : (
              sortedMessages.map((m, idx) => {
                const isCustomerMsg = m.senderRole === 'CUSTOMER';
                const prevMsg = idx > 0 ? sortedMessages[idx - 1] : null;
                const nextMsg = idx < sortedMessages.length - 1 ? sortedMessages[idx + 1] : null;

                // Kiểm tra xem có sang ngày mới không
                const isNewDay =
                  !prevMsg ||
                  !isSameDay(new Date(prevMsg.createdAt), new Date(m.createdAt));

                // Gom nhóm các tin liên tiếp của cùng 1 người gửi (cách nhau dưới 3 phút)
                const isFirstInGroup =
                  !prevMsg ||
                  isNewDay ||
                  prevMsg.senderRole !== m.senderRole ||
                  new Date(m.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() >
                    3 * 60 * 1000;

                const isLastInGroup =
                  !nextMsg ||
                  !isSameDay(new Date(m.createdAt), new Date(nextMsg.createdAt)) ||
                  nextMsg.senderRole !== m.senderRole ||
                  new Date(nextMsg.createdAt).getTime() - new Date(m.createdAt).getTime() >
                    3 * 60 * 1000;

                return (
                  <React.Fragment key={m.id}>
                    {/* Phân cách ngày */}
                    {isNewDay && (
                      <div className="my-3 flex items-center justify-center">
                        <div className="h-px flex-1 bg-[#EAE6DF]" />
                        <span className="px-3 text-[0.66rem] font-semibold uppercase tracking-wider text-[#8A8A8A]">
                          {formatDateSeparator(m.createdAt)}
                        </span>
                        <div className="h-px flex-1 bg-[#EAE6DF]" />
                      </div>
                    )}

                    <div
                      className={cn(
                        'flex flex-col',
                        isCustomerMsg ? 'items-end' : 'items-start',
                        isFirstInGroup ? 'mt-2.5' : 'mt-1',
                        styles.messageItem
                      )}
                    >
                      <div
                        className={cn(
                          'flex max-w-[84%] gap-2',
                          isCustomerMsg ? 'flex-row-reverse' : 'flex-row'
                        )}
                      >
                        {/* Avatar nhỏ cho tư vấn viên (chỉ hiện ở tin cuối của nhóm) */}
                        {!isCustomerMsg && (
                          <div className="flex w-6 shrink-0 flex-col items-center justify-end">
                            {isLastInGroup ? (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#C9A961] text-[#111111] text-[10px] font-bold shadow-xs">
                                <Headphones size={12} />
                              </div>
                            ) : (
                              <div className="w-6" />
                            )}
                          </div>
                        )}

                        <div className="flex flex-col">
                          {/* Bong bóng tin nhắn */}
                          <div
                            className={cn(
                              'overflow-hidden px-3.5 py-2.5 text-[0.84rem] leading-relaxed shadow-xs transition-all',
                              isCustomerMsg
                                ? cn(
                                    'bg-[#111111] text-white',
                                    isFirstInGroup && isLastInGroup
                                      ? 'rounded-2xl rounded-br-[4px]'
                                      : isFirstInGroup
                                      ? 'rounded-2xl rounded-br-[6px]'
                                      : isLastInGroup
                                      ? 'rounded-2xl rounded-tr-[6px] rounded-br-[4px]'
                                      : 'rounded-2xl rounded-r-[6px]'
                                  )
                                : cn(
                                    'border border-[#EAE6DF] bg-white text-[#111111]',
                                    isFirstInGroup && isLastInGroup
                                      ? 'rounded-2xl rounded-bl-[4px]'
                                      : isFirstInGroup
                                      ? 'rounded-2xl rounded-bl-[6px]'
                                      : isLastInGroup
                                      ? 'rounded-2xl rounded-tl-[6px] rounded-bl-[4px]'
                                      : 'rounded-2xl rounded-l-[6px]'
                                  )
                            )}
                          >
                            {/* Ảnh đính kèm */}
                            {m.imageUrl && (
                              <div className={cn('group relative overflow-hidden rounded-md border border-black/10', m.content ? 'mb-2' : '')}>
                                <img
                                  src={m.imageUrl}
                                  alt="Ảnh đính kèm"
                                  loading="lazy"
                                  onClick={() => setLightboxImageUrl(m.imageUrl || null)}
                                  className="max-h-56 w-auto max-w-full cursor-zoom-in object-cover transition-transform duration-200 group-hover:scale-102"
                                />
                                <button
                                  type="button"
                                  onClick={() => setLightboxImageUrl(m.imageUrl || null)}
                                  className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-sm bg-black/75 px-2 py-0.5 text-[0.62rem] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
                                >
                                  <ZoomIn size={11} />
                                  <span>Phóng to</span>
                                </button>
                              </div>
                            )}

                            {/* Nội dung text */}
                            {m.content && (
                              <p className="m-0 whitespace-pre-wrap break-words">{m.content}</p>
                            )}
                          </div>

                          {/* Giờ gửi & Check status (chỉ hiển thị ở cuối nhóm tin) */}
                          {isLastInGroup && (
                            <div
                              className={cn(
                                'mt-1 flex items-center gap-1 px-1 text-[0.62rem] text-[#8A8A8A]',
                                isCustomerMsg ? 'justify-end' : 'justify-start'
                              )}
                            >
                              <span>{formatMessageTime(m.createdAt)}</span>
                              {isCustomerMsg && (
                                <span title="Đã chuyển đến chuyên viên">
                                  <CheckCheck size={12} className="text-[#C9A961]" />
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}

            {/* Trạng thái "Tư vấn viên đang soạn tin..." */}
            {isAdvisorTyping && (
              <div className="flex items-center gap-2 pl-8 pt-1">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-[4px] border border-[#EAE6DF] bg-white px-3 py-2 shadow-xs">
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                </div>
                <span className="text-[0.68rem] italic text-[#8A8A8A]">Chuyên viên đang soạn tin...</span>
              </div>
            )}
          </div>

          {/* Nút Floating "Cuộn xuống tin mới nhất" */}
          {showScrollBottom && (
            <button
              type="button"
              onClick={() => scrollToBottom('smooth')}
              className="absolute bottom-20 right-4 z-20 flex items-center gap-1.5 rounded-full border border-[#C9A961]/40 bg-[#111111] px-3 py-1.5 text-xs text-white shadow-lg transition-transform hover:scale-105"
            >
              <ArrowDown size={12} className="text-[#C9A961]" />
              <span className="text-[0.68rem] font-semibold">Tin mới nhất</span>
            </button>
          )}

          {/* Panel Bảng tính Size Nhanh (Tính năng tăng chuyển đổi) */}
          {showSizeCalc && (
            <div className="border-t border-[#C9A961]/30 bg-white p-3.5 shadow-md shrink-0">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#111111]">
                  <Calculator size={14} className="text-[#C9A961]" />
                  <span>Bảng Đề Xuất Size Chuẩn Nam</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSizeCalc(false)}
                  className="rounded-full p-1 text-gray-400 hover:text-black"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[0.68rem] text-[#8A8A8A]">Chiều cao (cm)</label>
                  <input
                    type="number"
                    min={150}
                    max={205}
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="w-full rounded-md border border-[#EAE6DF] px-2 py-1 text-xs outline-none focus:border-[#C9A961]"
                  />
                </div>
                <div>
                  <label className="text-[0.68rem] text-[#8A8A8A]">Cân nặng (kg)</label>
                  <input
                    type="number"
                    min={40}
                    max={120}
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full rounded-md border border-[#EAE6DF] px-2 py-1 text-xs outline-none focus:border-[#C9A961]"
                  />
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between rounded-md bg-[#FAF8F5] p-2 border border-[#EAE6DF]">
                <div>
                  <span className="text-[0.68rem] text-[#8A8A8A]">Size khuyên dùng: </span>
                  <span className="font-extrabold text-[#C9A961] text-sm">Size {calculatedSize.size}</span>
                  <p className="m-0 text-[0.65rem] text-gray-500">{calculatedSize.note}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSendSizeCalcResult}
                  className="rounded bg-[#111111] px-2.5 py-1 text-[0.7rem] font-semibold text-white transition-colors hover:bg-[#C9A961] hover:text-black"
                >
                  Gửi cho shop
                </button>
              </div>
            </div>
          )}

          {/* Gợi ý câu hỏi nhanh (Dạng Chip Flex-wrap không thanh cuộn ngang) */}
          {availableQuickQuestions.length > 0 && showQuickChips && !showSizeCalc && (
            <div className="border-t border-[#EAE6DF] bg-[#FAF8F5] px-3 py-2 shrink-0">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[0.66rem] font-semibold uppercase tracking-wider text-[#8A8A8A]">
                  Gợi ý câu hỏi nhanh:
                </span>
                <button
                  type="button"
                  onClick={() => setShowQuickChips(false)}
                  className="text-[0.65rem] text-[#8A8A8A] hover:text-[#111111]"
                >
                  Ẩn
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {availableQuickQuestions.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => handleSendQuickQuestion(q)}
                    className={styles.quickChip}
                  >
                    {q.icon}
                    <span>{q.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nút bật lại gợi ý nếu người dùng đã ẩn */}
          {!showQuickChips && availableQuickQuestions.length > 0 && !showSizeCalc && (
            <div className="flex justify-end px-3 py-1 bg-[#FAF8F5] shrink-0 border-t border-[#EAE6DF]">
              <button
                type="button"
                onClick={() => setShowQuickChips(true)}
                className="flex items-center gap-1 text-[0.68rem] text-[#C9A961] hover:underline"
              >
                <Sparkles size={11} />
                <span>Hiện câu hỏi gợi ý</span>
              </button>
            </div>
          )}

          {/* Xem trước ảnh đính kèm trước khi gửi */}
          {selectedImagePreview && selectedImageFile && (
            <div className="flex items-center justify-between gap-2 border-t border-[#C9A961]/40 bg-white px-3.5 py-2 shrink-0">
              <div className="flex min-w-0 items-center gap-2.5">
                <img
                  src={selectedImagePreview}
                  alt="Preview"
                  className="h-11 w-11 shrink-0 rounded-md border border-[#C9A961] object-cover"
                />
                <div className="min-w-0">
                  <p className="m-0 truncate text-[0.74rem] font-bold text-[#111111]">
                    {selectedImageFile.name}
                  </p>
                  <p className="m-0 text-[0.65rem] text-[#8A8A8A]">
                    {(selectedImageFile.size / 1024).toFixed(1)} KB • Sẵn sàng gửi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearSelectedImage}
                disabled={uploadingImage}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                aria-label="Xóa ảnh đính kèm"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Bảng chọn Emoji nhanh */}
          {showEmojiPicker && (
            <div className="grid grid-cols-6 gap-2 border-t border-[#EAE6DF] bg-white p-2.5 shrink-0">
              {POPULAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-base transition-transform hover:scale-125 hover:bg-[#FAF8F5]"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Thanh thông báo lỗi hoặc mất kết nối */}
          {status !== 'CONNECTED' && (
            <div className="border-t border-amber-200 bg-amber-50 px-3.5 py-1.5 text-[0.72rem] font-medium text-amber-800 shrink-0">
              Đang kết nối lại máy chủ trò chuyện...
            </div>
          )}
          {error && (
            <div className="flex items-center justify-between gap-1.5 border-t border-red-200 bg-red-50 px-3.5 py-1.5 text-[0.74rem] font-medium text-red-700 shrink-0">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
              <button type="button" onClick={() => setError('')} className="text-red-500">
                <X size={13} />
              </button>
            </div>
          )}

          {/* Ô nhập tin nhắn + Đính kèm hình ảnh + Emoji */}
          <div className="border-t border-[#EAE6DF] bg-white p-3 shrink-0">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => handleSelectImage(e.target.files?.[0])}
            />

            <div className="flex items-end gap-1.5">
              {/* Nút đính kèm ảnh */}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={status !== 'CONNECTED' || uploadingImage}
                title="Đính kèm hình ảnh (hoặc dán Ctrl+V)"
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors',
                  selectedImageFile
                    ? 'border-[#C9A961] bg-[#FAF3E0] text-[#C9A961]'
                    : 'border-[#EAE6DF] text-[#8A8A8A] hover:border-[#C9A961] hover:text-[#111111] disabled:opacity-40'
                )}
                aria-label="Đính kèm hình ảnh"
              >
                <ImagePlus size={17} />
              </button>

              {/* Nút Emoji */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors',
                  showEmojiPicker
                    ? 'border-[#C9A961] bg-[#FAF3E0] text-[#C9A961]'
                    : 'border-[#EAE6DF] text-[#8A8A8A] hover:border-[#C9A961] hover:text-[#111111]'
                )}
                title="Chèn biểu cảm"
                aria-label="Bật bảng chọn biểu cảm"
              >
                <Smile size={17} />
              </button>

              {/* Textarea tự co giãn chiều cao */}
              <div className="relative flex-1">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={text}
                  maxLength={1000}
                  placeholder="Nhập tin nhắn (Shift+Enter xuống dòng)..."
                  onChange={handleTextChange}
                  onPaste={handlePasteClipboard}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  className="max-h-[100px] min-h-[38px] w-full resize-none rounded-lg border border-[#EAE6DF] bg-[#FAF8F5] px-3 py-2 text-[0.82rem] leading-normal text-[#111111] outline-none transition-all placeholder:text-[#8A8A8A] focus:border-[#C9A961] focus:bg-white focus:ring-1 focus:ring-[#C9A961]"
                />
              </div>

              {/* Nút gửi */}
              <button
                type="button"
                onClick={() => void send()}
                disabled={status !== 'CONNECTED' || (!text.trim() && !selectedImageFile) || uploadingImage}
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
                  text.trim() || selectedImageFile
                    ? 'bg-[#C9A961] text-white shadow-sm hover:bg-[#B38F46] active:scale-95'
                    : 'bg-[#EAE6DF] text-[#8A8A8A] opacity-50 cursor-not-allowed'
                )}
                aria-label="Gửi tin nhắn"
              >
                {uploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
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
              <span className="text-xs font-bold uppercase tracking-wider text-[#C9A961]">
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
              className="max-h-[82vh] max-w-full rounded-md border border-white/20 object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
