import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
  MessageSquare,
  Send,
  Search,
  User,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  ImagePlus,
  X,
  ZoomIn,
  Sparkles,
  CheckCheck,
  Headphones,
  Loader2,
  ExternalLink,
  Image as ImageIcon,
  Trash2,
  Clock,
  CheckCircle2,
  Shield,
  Layers,
} from "lucide-react";
import {chatService} from "../services/chatService";
import {stompService} from "../ws/stompService";
import {useStompSubscription} from "../ws/useStompSubscription";
import {useWsStatus} from "../ws/WebSocketProvider";
import {mergeById} from "../utils/chat";
import {ChatMessageResponse, WsErrorResponse} from "../types/realtime";
import {Modal} from "../components/ui";
import {extractErrorMessage} from "../utils/format";
import {cn} from "../utils/cn";

const QUICK_REPLIES = [
  {
    label: "👋 Chào khách hàng",
    text: "Dạ Fashion Website xin chào bạn! Mình có thể hỗ trợ tư vấn mẫu trang phục, bảng size hay đơn hàng nào cho bạn ạ?",
  },
  {
    label: "📏 Tư vấn chọn size",
    text: "Dạ bạn vui lòng cho shop xin thông tin chiều cao và cân nặng để tư vấn viên chọn size chuẩn form nhất cho bạn nhé!",
  },
  {
    label: "📸 Xin ảnh thực tế / Mã đơn",
    text: "Dạ bạn có thể gửi kèm hình ảnh sản phẩm hoặc mã đơn hàng tại khung chat này để shop kiểm tra và hỗ trợ ngay cho bạn ạ.",
  },
  {
    label: "🔄 Chính sách đổi trả",
    text: "Dạ sản phẩm bên shop hỗ trợ đổi size/mẫu trong vòng 30 ngày kể từ khi nhận hàng (sản phẩm còn nguyên tem mác) ạ.",
  },
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

function formatChatTimestamp(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatShortTime(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isSameDay) {
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatDateHeading(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  const formatted = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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
  const [byUser, setByUser] = useState<Record<string, ChatMessageResponse[]>>(
    {},
  );
  const [unreadByUser, setUnreadByUser] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarFilter, setSidebarFilter] = useState<"all" | "unread">("all");
  const [messageSearch, setMessageSearch] = useState("");
  const [text, setText] = useState("");
  const [wsError, setWsError] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(false);

  // State đính kèm ảnh & Lightbox
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<
    string | null
  >(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // State dọn dẹp tin nhắn & xóa cuộc trò chuyện
  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(30);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [deleteConvModalOpen, setDeleteConvModalOpen] = useState(false);
  const [deletingConv, setDeletingConv] = useState(false);
  const [actionNotice, setActionNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const selectedRef = useRef<string | null>(selected);
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    selectedRef.current = selected;
    if (selected) {
      setUnreadByUser((prev) => ({...prev, [selected]: 0}));
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

        // Nạp trước lịch sử tóm tắt cho các cuộc hội thoại
        void Promise.allSettled(
          usernames.slice(0, 15).map(async (uname) => {
            const historyRes = await chatService.getCustomerHistory(uname);
            if (historyRes?.data) {
              setByUser((prev) => ({
                ...prev,
                [uname]: mergeById(prev[uname] ?? [], historyRes.data),
              }));
            }
          }),
        );
      }
    } catch (err) {
      console.warn("Could not load conversations:", err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (status === "CONNECTED") {
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
      .catch((err) =>
        console.warn("Could not load customer chat history:", err),
      );
  }, [selected]);

  useStompSubscription<ChatMessageResponse>(
    "/topic/admin/chat",
    useCallback((m) => {
      setByUser((prev) => ({
        ...prev,
        [m.customerUsername]: mergeById(prev[m.customerUsername] ?? [], [m]),
      }));
      setConversations((prev) => [
        m.customerUsername,
        ...prev.filter((u) => u !== m.customerUsername),
      ]);
      if (
        selectedRef.current !== m.customerUsername &&
        m.senderRole === "CUSTOMER"
      ) {
        setUnreadByUser((prev) => ({
          ...prev,
          [m.customerUsername]: (prev[m.customerUsername] || 0) + 1,
        }));
      }
    }, []),
  );

  useStompSubscription<WsErrorResponse>(
    "/user/queue/errors",
    useCallback((e) => {
      setWsError(e?.message || "Gửi tin nhắn thất bại");
    }, []),
  );

  const activeMessages = useMemo(() => {
    const raw = selected ? (byUser[selected] ?? []) : [];
    const q = messageSearch.trim().toLowerCase();
    if (!q) return raw;
    return raw.filter((m) => (m.content || "").toLowerCase().includes(q));
  }, [byUser, selected, messageSearch]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const container = chatMessagesContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    }
  };

  useEffect(() => {
    scrollToBottom("smooth");
  }, [activeMessages.length, selected]);

  const handleSelectImageFile = (file: File | null | undefined) => {
    if (!file) return;
    setWsError("");

    if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      setWsError("Chỉ hỗ trợ định dạng ảnh JPG, PNG, WEBP hoặc GIF.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setWsError("Kích thước ảnh không được vượt quá 5MB.");
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
      imageInputRef.current.value = "";
    }
  };

  const handlePasteClipboard = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
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
    if (
      (!content && !selectedImageFile) ||
      !selected ||
      status !== "CONNECTED" ||
      uploadingImage
    ) {
      return;
    }
    setWsError("");

    try {
      let uploadedImageUrl: string | undefined;
      if (selectedImageFile) {
        setUploadingImage(true);
        const uploadRes = await chatService.uploadChatImage(selectedImageFile);
        uploadedImageUrl = uploadRes.data;
      }

      stompService.publish("/app/chat.reply", {
        toUsername: selected,
        content,
        imageUrl: uploadedImageUrl || null,
      });

      setText("");
      clearSelectedImage();
    } catch (err: any) {
      setWsError(extractErrorMessage(err, "Không thể gửi phản hồi lúc này"));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCleanupExpired = async () => {
    setCleaningUp(true);
    setActionNotice(null);
    try {
      const res = await chatService.cleanupExpiredMessages(cleanupDays);
      const count = res?.data ?? 0;
      setActionNotice({
        type: "success",
        text: `Đã dọn dẹp thành công ${count} tin nhắn cũ hơn ${cleanupDays} ngày!`,
      });
      setCleanupModalOpen(false);
      await loadConversations();
    } catch (err: any) {
      setActionNotice({
        type: "error",
        text: extractErrorMessage(err, "Dọn dẹp tin nhắn thất bại"),
      });
    } finally {
      setCleaningUp(false);
    }
  };

  const handleDeleteCurrentConversation = async () => {
    if (!selected) return;
    setDeletingConv(true);
    setActionNotice(null);
    const targetUser = selected;
    try {
      const res = await chatService.deleteConversation(targetUser);
      const count = res?.data ?? 0;
      setActionNotice({
        type: "success",
        text: `Đã xóa toàn bộ lịch sử cuộc trò chuyện với @${targetUser} (${count} tin nhắn)!`,
      });
      setDeleteConvModalOpen(false);
      setByUser((prev) => {
        const copy = {...prev};
        delete copy[targetUser];
        return copy;
      });
      setConversations((prev) => {
        const updated = prev.filter((u) => u !== targetUser);
        setSelected(updated[0] || null);
        return updated;
      });
    } catch (err: any) {
      setActionNotice({
        type: "error",
        text: extractErrorMessage(err, "Xóa cuộc trò chuyện thất bại"),
      });
    } finally {
      setDeletingConv(false);
    }
  };

  const totalUnreadCount = useMemo(
    () => Object.values(unreadByUser).reduce((acc, c) => acc + c, 0),
    [unreadByUser],
  );

  const filteredConversations = useMemo(() => {
    return conversations.filter((u) => {
      const matchesSearch = u
        .toLowerCase()
        .includes(searchQuery.toLowerCase().trim());
      if (!matchesSearch) return false;
      if (sidebarFilter === "unread") {
        return (unreadByUser[u] || 0) > 0;
      }
      return true;
    });
  }, [conversations, searchQuery, sidebarFilter, unreadByUser]);

  return (
    <div className='flex flex-col h-[calc(100dvh-100px)] min-h-[580px] p-2.5 sm:p-4 overflow-hidden bg-[#f7f8fa]'>
      {/* 1. Header Khu Vực Chat Tinh Gọn (Compact Topbar) */}
      <div className='mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-xs'>
        <div className='flex items-center gap-3'>
          <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-black text-amber-400 shadow-xs'>
            <Headphones size={18} />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-sm sm:text-base font-bold text-gray-900 tracking-tight m-0'>
                Hỗ Trợ Khách Hàng Trực Tuyến
              </h1>
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold",
                  status === "CONNECTED"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    status === "CONNECTED"
                      ? "bg-emerald-500"
                      : "bg-amber-500 animate-pulse",
                  )}
                />
                {status === "CONNECTED" ? "Realtime Connected" : "Mất kết nối"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={() => setCleanupModalOpen(true)}
            className='flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-black transition-colors'
          >
            <Clock size={13} className='text-gray-500' />
            <span className='hidden md:inline'>Dọn Tin Nhắn Cũ</span>
            <span className='md:hidden'>Dọn dẹp</span>
          </button>

          <button
            type='button'
            onClick={() => void loadConversations()}
            disabled={loadingConversations}
            className='flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-black transition-colors disabled:opacity-50'
          >
            <RefreshCw
              size={13}
              className={cn(
                "text-gray-500",
                loadingConversations && "animate-spin",
              )}
            />
            <span>Làm Mới</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div
          className={cn(
            "mb-3 flex shrink-0 items-center justify-between gap-2 rounded-xl border p-2.5 text-xs font-medium animate-fadeIn",
            actionNotice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800",
          )}
        >
          <div className='flex items-center gap-2'>
            {actionNotice.type === "success" ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            <span>{actionNotice.text}</span>
          </div>
          <button
            type='button'
            onClick={() => setActionNotice(null)}
            className='opacity-70 hover:opacity-100'
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 2. Khung Chat 2 Cột Chuẩn Workspace (Vừa vặn 100% màn hình, không bị đẩy cuộn) */}
      <div className='flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[310px_1fr] rounded-2xl border border-gray-200/90 bg-white shadow-sm overflow-hidden'>
        {/* CỘT TRÁI: DANH SÁCH HỘI THOẠI KHÁCH HÀNG */}
        <div className='flex flex-col border-b lg:border-b-0 lg:border-r border-gray-200 bg-white h-full overflow-hidden'>
          {/* Header Cột Trái & Bộ Lọc */}
          <div className='p-3.5 border-b border-gray-100 bg-white shrink-0'>
            <div className='flex items-center justify-between mb-2.5'>
              <span className='text-xs font-bold uppercase tracking-wider text-gray-700'>
                Hội thoại ({conversations.length})
              </span>

              {/* Pill Bộ Lọc Tất cả / Chưa đọc */}
              <div className='flex items-center rounded-lg bg-gray-100 p-0.5 text-[0.7rem] font-semibold'>
                <button
                  type='button'
                  onClick={() => setSidebarFilter("all")}
                  className={cn(
                    "rounded-md px-2.5 py-0.5 transition-colors",
                    sidebarFilter === "all"
                      ? "bg-white text-gray-900 shadow-2xs font-bold"
                      : "text-gray-500 hover:text-gray-900",
                  )}
                >
                  Tất cả
                </button>
                <button
                  type='button'
                  onClick={() => setSidebarFilter("unread")}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2.5 py-0.5 transition-colors",
                    sidebarFilter === "unread"
                      ? "bg-white text-gray-900 shadow-2xs font-bold"
                      : "text-gray-500 hover:text-gray-900",
                  )}
                >
                  <span>Chưa đọc</span>
                  {totalUnreadCount > 0 && (
                    <span className='flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-600 px-1 text-[0.58rem] font-bold text-white'>
                      {totalUnreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Ô tìm kiếm khách hàng */}
            <div className='relative'>
              <Search
                size={13}
                className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'
              />
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Tìm kiếm @username...'
                className='w-full rounded-xl border border-gray-200 bg-gray-50/70 pl-8 pr-7 py-1.5 text-xs text-gray-800 placeholder-gray-400 outline-none transition-colors focus:border-black focus:bg-white'
              />
              {searchQuery && (
                <button
                  type='button'
                  onClick={() => setSearchQuery("")}
                  className='absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black'
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Danh Sách Khách Hàng Cuộn Độc Lập */}
          <div className='flex-1 overflow-y-auto divide-y divide-gray-100'>
            {loadingConversations && conversations.length === 0 ? (
              <div className='flex flex-col items-center justify-center p-8 text-center text-xs text-gray-400'>
                <Loader2
                  size={20}
                  className='mb-2 animate-spin text-gray-500'
                />
                <span>Đang tải danh sách...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className='p-8 text-center text-xs text-gray-400'>
                {sidebarFilter === "unread"
                  ? "Không có cuộc trò chuyện chưa đọc."
                  : "Không tìm thấy khách hàng phù hợp."}
              </div>
            ) : (
              filteredConversations.map((u) => {
                const isSelected = u === selected;
                const unread = unreadByUser[u] || 0;
                const userMsgs = byUser[u] || [];
                const lastMsg = userMsgs[userMsgs.length - 1];

                let previewText = "Nhấn để trò chuyện";
                if (lastMsg) {
                  const prefix = lastMsg.senderRole === "ADMIN" ? "Bạn: " : "";
                  if (lastMsg.imageUrl && lastMsg.content) {
                    previewText = `${prefix}[Ảnh] ${lastMsg.content}`;
                  } else if (lastMsg.imageUrl) {
                    previewText = `${prefix}Đã gửi một hình ảnh`;
                  } else {
                    previewText = `${prefix}${lastMsg.content}`;
                  }
                }

                return (
                  <button
                    key={u}
                    type='button'
                    onClick={() => {
                      setSelected(u);
                      setMessageSearch("");
                    }}
                    className={cn(
                      "group flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-all",
                      isSelected
                        ? "bg-amber-500/10 border-l-[3.5px] border-l-amber-600"
                        : "hover:bg-gray-50 border-l-[3.5px] border-l-transparent",
                    )}
                  >
                    <div className='flex items-center gap-2.5 min-w-0 flex-1'>
                      {/* Avatar */}
                      <div className='relative shrink-0'>
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold uppercase transition-colors",
                            isSelected
                              ? "bg-black text-amber-400"
                              : "bg-gray-100 text-gray-700 group-hover:bg-gray-200",
                          )}
                        >
                          {u[0]?.toUpperCase() || <User size={14} />}
                        </div>
                        <span
                          className={cn(
                            "absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white",
                            status === "CONNECTED"
                              ? "bg-emerald-500"
                              : "bg-gray-400",
                          )}
                        />
                      </div>

                      {/* Content preview */}
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center justify-between gap-1.5'>
                          <span
                            className={cn(
                              "truncate text-xs",
                              isSelected || unread > 0
                                ? "font-bold text-gray-900"
                                : "font-medium text-gray-700",
                            )}
                          >
                            @{u}
                          </span>
                          {lastMsg?.createdAt && (
                            <span className='shrink-0 text-[0.62rem] text-gray-400'>
                              {formatShortTime(lastMsg.createdAt)}
                            </span>
                          )}
                        </div>

                        <div className='mt-0.5 flex items-center justify-between gap-1.5'>
                          <p
                            className={cn(
                              "m-0 truncate text-[0.72rem] flex items-center gap-1",
                              unread > 0
                                ? "font-semibold text-gray-900"
                                : "text-gray-500",
                            )}
                          >
                            {lastMsg?.imageUrl && (
                              <ImageIcon
                                size={11}
                                className='shrink-0 text-amber-600'
                              />
                            )}
                            <span className='truncate'>{previewText}</span>
                          </p>

                          {unread > 0 && (
                            <span className='flex h-4 min-w-[16px] shrink-0 items-center justify-center rounded-full bg-red-600 px-1 text-[0.6rem] font-bold text-white'>
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

        {/* CỘT PHẢI: KHUNG TRÒ CHUYỆN VỚI KHÁCH HÀNG ĐANG CHỌN */}
        <div
          className='relative flex flex-col bg-[#f8f9fa] h-full overflow-hidden'
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
          {/* Lớp phủ kéo thả ảnh */}
          {isDraggingImage && selected && (
            <div
              onDragLeave={() => setIsDraggingImage(false)}
              className='absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 text-white backdrop-blur-xs'
            >
              <div className='flex flex-col items-center rounded-2xl border-2 border-dashed border-amber-400 p-8 text-center'>
                <ImagePlus size={36} className='mb-2.5 text-amber-400' />
                <p className='m-0 text-sm font-bold uppercase tracking-wider'>
                  Thả hình ảnh vào đây để gửi
                </p>
                <p className='m-0 mt-1 text-xs text-white/70'>
                  Hỗ trợ JPG, PNG, WEBP, GIF (Tối đa 5MB)
                </p>
              </div>
            </div>
          )}

          {selected ? (
            <>
              {/* Header Khung Chat */}
              <div className='flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-5 py-3 shadow-2xs'>
                <div className='flex items-center gap-3'>
                  <div className='relative'>
                    <div className='flex h-9 w-9 items-center justify-center rounded-full bg-black text-xs font-bold uppercase text-amber-400'>
                      {selected[0]?.toUpperCase()}
                    </div>
                    <span className='absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white bg-emerald-500' />
                  </div>
                  <div>
                    <div className='flex items-center gap-2'>
                      <h3 className='m-0 text-sm font-bold text-gray-900'>
                        @{selected}
                      </h3>
                      <span className='rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-amber-700'>
                        Khách Hàng
                      </span>
                    </div>
                    <span className='text-[0.68rem] text-gray-400'>
                      Đang kết nối
                    </span>
                  </div>
                </div>

                <div className='flex items-center gap-2'>
                  {/* Ô lọc nội dung tin nhắn */}
                  <div className='relative hidden md:block'>
                    <Search
                      size={12}
                      className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400'
                    />
                    <input
                      type='text'
                      value={messageSearch}
                      onChange={(e) => setMessageSearch(e.target.value)}
                      placeholder='Lọc tin nhắn...'
                      className='w-36 rounded-lg border border-gray-200 bg-gray-50/80 pl-7 pr-6 py-1 text-[0.72rem] text-gray-800 outline-none focus:bg-white focus:border-black transition-colors'
                    />
                    {messageSearch && (
                      <button
                        type='button'
                        onClick={() => setMessageSearch("")}
                        className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black'
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>

                  <span className='rounded-md bg-gray-100 px-2 py-1 text-[0.68rem] font-semibold text-gray-600'>
                    {(byUser[selected] ?? []).length} tin
                  </span>

                  <button
                    type='button'
                    onClick={() => setDeleteConvModalOpen(true)}
                    className='flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors'
                    title={`Xóa hội thoại với @${selected}`}
                    aria-label='Xóa hội thoại'
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Luồng Tin Nhắn Cuộn Độc Lập */}
              <div
                ref={chatMessagesContainerRef}
                className='flex-1 space-y-3.5 overflow-y-auto px-4 sm:px-6 py-4 bg-[#f8f9fa]'
              >
                {activeMessages.length === 0 ? (
                  <div className='flex h-full flex-col items-center justify-center py-10 text-center text-gray-400'>
                    <div className='mb-2.5 flex h-12 w-12 items-center justify-center rounded-full bg-white border border-gray-200 shadow-2xs'>
                      <MessageSquare size={20} className='text-amber-500' />
                    </div>
                    <p className='m-0 text-xs font-semibold text-gray-700'>
                      {messageSearch
                        ? "Không có tin nhắn nào khớp từ khóa lọc."
                        : "Chưa có tin nhắn trong cuộc trò chuyện này."}
                    </p>
                    <p className='m-0 mt-1 text-[0.72rem] text-gray-400'>
                      Bạn có thể chọn câu trả lời nhanh bên dưới để phản hồi
                      ngay.
                    </p>
                  </div>
                ) : (
                  activeMessages.map((m, idx) => {
                    const isStoreSide = m.senderRole === "ADMIN";
                    const prevMsg = idx > 0 ? activeMessages[idx - 1] : null;
                    const currentDay = formatDateHeading(m.createdAt);
                    const prevDay = prevMsg
                      ? formatDateHeading(prevMsg.createdAt)
                      : "";
                    const showDateDivider =
                      currentDay && currentDay !== prevDay;

                    return (
                      <React.Fragment key={m.id}>
                        {showDateDivider && (
                          <div className='flex items-center justify-center my-3'>
                            <span className='rounded-full border border-gray-200 bg-white px-3 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-gray-500 shadow-2xs'>
                              {currentDay}
                            </span>
                          </div>
                        )}

                        <div
                          className={cn(
                            "flex items-end gap-2",
                            isStoreSide ? "flex-row-reverse" : "flex-row",
                          )}
                        >
                          {/* Avatar người gửi */}
                          <div
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.62rem] font-bold uppercase shadow-2xs",
                              isStoreSide
                                ? "bg-black text-amber-400"
                                : "bg-white text-gray-800 border border-gray-200",
                            )}
                          >
                            {isStoreSide ? (
                              <Headphones size={13} />
                            ) : (
                              m.senderUsername?.[0]?.toUpperCase() || "K"
                            )}
                          </div>

                          {/* Khối bong bóng chat */}
                          <div
                            className={cn(
                              "flex max-w-[78%] sm:max-w-[70%] flex-col",
                              isStoreSide ? "items-end" : "items-start",
                            )}
                          >
                            <div
                              className={cn(
                                "overflow-hidden px-4 py-2.5 text-xs leading-relaxed shadow-2xs",
                                isStoreSide
                                  ? "rounded-2xl rounded-br-sm bg-black text-white"
                                  : "rounded-2xl rounded-bl-sm border border-gray-200/90 bg-white text-gray-900",
                              )}
                            >
                              <div
                                className={cn(
                                  "mb-1 flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-wider",
                                  isStoreSide
                                    ? "text-amber-400"
                                    : "text-gray-400",
                                )}
                              >
                                <span>
                                  {isStoreSide
                                    ? `Cửa hàng (@${m.senderUsername})`
                                    : `Khách hàng (@${m.senderUsername})`}
                                </span>
                              </div>

                              {/* Hình ảnh đính kèm nếu có */}
                              {m.imageUrl && (
                                <div
                                  className={cn(
                                    "group relative overflow-hidden rounded-xl border border-white/10",
                                    m.content ? "mb-2" : "",
                                  )}
                                >
                                  <img
                                    src={m.imageUrl}
                                    alt='Ảnh đính kèm'
                                    loading='lazy'
                                    onClick={() =>
                                      setLightboxImageUrl(m.imageUrl || null)
                                    }
                                    className='max-h-60 w-auto max-w-full cursor-zoom-in object-cover transition-transform duration-200 group-hover:scale-[1.02]'
                                  />
                                  <button
                                    type='button'
                                    onClick={() =>
                                      setLightboxImageUrl(m.imageUrl || null)
                                    }
                                    className='absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/80 px-2 py-1 text-[0.62rem] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100'
                                  >
                                    <ZoomIn size={11} />
                                    <span>Phóng to</span>
                                  </button>
                                </div>
                              )}

                              {m.content && (
                                <div className='whitespace-pre-wrap break-words text-[0.8rem]'>
                                  {m.content}
                                </div>
                              )}
                            </div>

                            {/* Thời gian & Trạng thái gửi */}
                            <div className='mt-1 flex items-center gap-1 px-1 text-[0.62rem] text-gray-400'>
                              <span>{formatChatTimestamp(m.createdAt)}</span>
                              {isStoreSide && (
                                <CheckCheck
                                  size={12}
                                  className='text-amber-500'
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
              </div>

              {/* Mẫu Câu Trả Lời Nhanh (Quick Replies Chips) */}
              <div className='flex shrink-0 items-center gap-2 overflow-x-auto border-t border-gray-100 bg-white px-4 py-2'>
                <span className='flex shrink-0 items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wider text-amber-700'>
                  <Sparkles size={12} className='text-amber-500' />
                  <span>Gợi ý:</span>
                </span>
                {QUICK_REPLIES.map((item) => (
                  <button
                    key={item.label}
                    type='button'
                    onClick={() => {
                      setText(item.text);
                      textInputRef.current?.focus();
                    }}
                    className='shrink-0 rounded-full border border-gray-200 bg-gray-50/80 px-3 py-1 text-[0.68rem] font-medium text-gray-700 transition-colors hover:border-black hover:bg-black hover:text-white'
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Preview Ảnh Đính Kèm Trước Khi Gửi */}
              {selectedImagePreview && selectedImageFile && (
                <div className='flex shrink-0 items-center justify-between gap-3 border-t border-amber-200 bg-amber-50/70 px-4 py-2'>
                  <div className='flex items-center gap-2.5 min-w-0'>
                    <div className='relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-amber-300 bg-white'>
                      <img
                        src={selectedImagePreview}
                        alt='Xem trước ảnh'
                        className='h-full w-full object-cover'
                      />
                    </div>
                    <div className='min-w-0'>
                      <p className='m-0 truncate text-xs font-bold text-gray-900'>
                        {selectedImageFile.name}
                      </p>
                      <p className='m-0 text-[0.68rem] text-gray-500'>
                        {formatFileSize(selectedImageFile.size)} • Sẵn sàng gửi
                      </p>
                    </div>
                  </div>

                  <button
                    type='button'
                    onClick={clearSelectedImage}
                    disabled={uploadingImage}
                    className='flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-red-300 hover:text-red-600 transition-colors'
                  >
                    <X size={13} />
                    <span>Hủy ảnh</span>
                  </button>
                </div>
              )}

              {wsError && (
                <div className='flex shrink-0 items-center justify-between gap-2 border-t border-red-200 bg-red-50 px-4 py-1.5 text-xs text-red-700'>
                  <div className='flex items-center gap-2'>
                    <AlertCircle size={14} className='shrink-0' />
                    <span>{wsError}</span>
                  </div>
                  <button
                    type='button'
                    onClick={() => setWsError("")}
                    className='text-red-500 hover:text-red-800'
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Ô Nhập Tin Nhắn + Nút Gửi (LUÔN CỐ ĐỊNH Ở ĐÁY, KHÔNG BAO GIỜ BỊ ĐẨY XUỐNG) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void reply();
                }}
                className='flex shrink-0 items-center gap-2 border-t border-gray-200 bg-white p-3 shadow-2xs'
              >
                <input
                  ref={imageInputRef}
                  type='file'
                  accept='image/jpeg,image/png,image/webp,image/gif'
                  className='hidden'
                  onChange={(e) => handleSelectImageFile(e.target.files?.[0])}
                />

                <button
                  type='button'
                  onClick={() => imageInputRef.current?.click()}
                  disabled={status !== "CONNECTED" || uploadingImage}
                  title='Đính kèm hình ảnh (hoặc Ctrl+V / Kéo thả ảnh)'
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
                    selectedImageFile
                      ? "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:border-black hover:text-black disabled:opacity-40",
                  )}
                >
                  <ImagePlus size={17} />
                </button>

                <input
                  ref={textInputRef}
                  type='text'
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onPaste={handlePasteClipboard}
                  maxLength={1000}
                  placeholder={`Nhập phản hồi gửi cho @${selected}...`}
                  className='h-10 flex-1 rounded-xl border border-gray-200 bg-gray-50/70 px-3.5 text-xs sm:text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-black focus:bg-white'
                />

                <button
                  type='submit'
                  disabled={
                    status !== "CONNECTED" ||
                    (!text.trim() && !selectedImageFile) ||
                    uploadingImage
                  }
                  className='flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-black px-4 sm:px-5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-colors hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed'
                >
                  {uploadingImage ? (
                    <>
                      <Loader2
                        size={14}
                        className='animate-spin text-amber-400'
                      />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <span>Gửi</span>
                      <Send size={13} />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className='flex flex-1 flex-col items-center justify-center p-10 text-center text-gray-400'>
              <MessageSquare
                size={36}
                className='mb-3 opacity-30 text-gray-600'
              />
              <p className='m-0 text-sm font-semibold text-gray-700'>
                Chọn một khách hàng ở danh sách bên trái để bắt đầu hỗ trợ
              </p>
              <p className='m-0 mt-1 text-xs text-gray-400'>
                Lịch sử trò chuyện và thông tin sẽ hiển thị tức thì tại đây.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Phóng To Hình Ảnh (Lightbox) */}
      {lightboxImageUrl && (
        <div
          onClick={() => setLightboxImageUrl(null)}
          className='fixed inset-0 z-[1200] flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs'
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className='relative flex max-h-[90vh] max-w-[90vw] flex-col items-center'
          >
            <div className='mb-3 flex w-full items-center justify-between gap-4 text-white'>
              <span className='text-xs font-bold uppercase tracking-wider text-amber-400'>
                Xem Hình Ảnh Đính Kèm
              </span>
              <div className='flex items-center gap-2'>
                <a
                  href={lightboxImageUrl}
                  target='_blank'
                  rel='noreferrer'
                  className='flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20'
                >
                  <ExternalLink size={13} />
                  <span>Mở Ảnh Gốc</span>
                </a>
                <button
                  type='button'
                  onClick={() => setLightboxImageUrl(null)}
                  className='flex h-8 w-8 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white hover:bg-white/20'
                  aria-label='Đóng xem ảnh'
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <img
              src={lightboxImageUrl}
              alt='Ảnh phóng to'
              className='max-h-[82vh] max-w-full rounded-xl border border-white/20 object-contain shadow-2xl'
            />
          </div>
        </div>
      )}

      {/* Modal Dọn Dẹp Tin Nhắn Cũ */}
      <Modal
        isOpen={cleanupModalOpen}
        onClose={() => setCleanupModalOpen(false)}
        title='Dọn Dẹp Tin Nhắn Chat Cũ'
      >
        <div className='space-y-4 text-xs sm:text-sm text-gray-700'>
          <p>
            Hệ thống sẽ quét và xóa vĩnh viễn các tin nhắn đã gửi vượt quá số
            ngày được chọn dưới đây. Tất cả hình ảnh liên quan được lưu trữ trên
            Cloudinary cũng sẽ được tự động giải phóng bộ nhớ.
          </p>

          <div>
            <label className='block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5'>
              Thời gian lưu trữ tin nhắn tối đa:
            </label>
            <select
              value={cleanupDays}
              onChange={(e) => setCleanupDays(Number(e.target.value))}
              className='w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs sm:text-sm font-semibold outline-none focus:border-black'
            >
              <option value={7}>Cũ hơn 7 ngày (1 tuần)</option>
              <option value={15}>Cũ hơn 15 ngày (Nửa tháng)</option>
              <option value={30}>Cũ hơn 30 ngày (1 tháng - Khuyến nghị)</option>
              <option value={60}>Cũ hơn 60 ngày (2 tháng)</option>
              <option value={90}>Cũ hơn 90 ngày (3 tháng)</option>
            </select>
          </div>

          <div className='flex justify-end gap-2.5 pt-3 border-t border-gray-100'>
            <button
              type='button'
              onClick={() => setCleanupModalOpen(false)}
              disabled={cleaningUp}
              className='rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50'
            >
              Hủy Bỏ
            </button>
            <button
              type='button'
              onClick={() => void handleCleanupExpired()}
              disabled={cleaningUp}
              className='flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50'
            >
              {cleaningUp && <Loader2 size={13} className='animate-spin' />}
              <span>{cleaningUp ? "Đang dọn dẹp..." : "Xác Nhận Dọn Dẹp"}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Xóa Toàn Bộ Cuộc Trò Chuyện Hiện Tại */}
      <Modal
        isOpen={deleteConvModalOpen}
        onClose={() => setDeleteConvModalOpen(false)}
        title={`Xóa Cuộc Trò Chuyện Với @${selected}`}
      >
        <div className='space-y-4 text-xs sm:text-sm text-gray-700'>
          <p>
            Bạn có chắc chắn muốn xóa toàn bộ lịch sử tin nhắn của khách hàng{" "}
            <strong className='text-black'>@{selected}</strong>?
          </p>
          <p className='text-xs text-red-600 font-medium'>
            * Hành động này sẽ xóa toàn bộ nội dung tin nhắn và hình ảnh vĩnh
            viễn khỏi cơ sở dữ liệu.
          </p>

          <div className='flex justify-end gap-2.5 pt-3 border-t border-gray-100'>
            <button
              type='button'
              onClick={() => setDeleteConvModalOpen(false)}
              disabled={deletingConv}
              className='rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50'
            >
              Hủy Bỏ
            </button>
            <button
              type='button'
              onClick={() => void handleDeleteCurrentConversation()}
              disabled={deletingConv}
              className='flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50'
            >
              {deletingConv && <Loader2 size={13} className='animate-spin' />}
              <span>{deletingConv ? "Đang xóa..." : "Xác Nhận Xóa"}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
