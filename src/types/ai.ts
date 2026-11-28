// src/types/ai.ts

export interface AiAdviseRequest {
  question: string;
}

/**
 * Thông tin tóm tắt của một sản phẩm được AI Stylist gợi ý trong khung chat.
 * Dùng để render thẻ sản phẩm ngang thu gọn (AiMiniProductCard) ngay dưới tin nhắn AI.
 */
export interface AiSuggestedProduct {
  /** ID sản phẩm dùng để điều hướng tới trang chi tiết (/products/:id) */
  id: number;
  /** Tên sản phẩm */
  name: string;
  /** Slug URL của sản phẩm (nếu có) */
  slug?: string | null;
  /** Tên danh mục sản phẩm (hiển thị phụ khi không có biến thể màu/size) */
  categoryName?: string | null;
  /** URL ảnh đại diện của sản phẩm */
  imageUrl?: string | null;
  /** Giá gốc niêm yết (VNĐ) */
  basePrice: number;
  /** Giá sau khuyến mãi nếu sản phẩm đang có chương trình giảm giá */
  discountedPrice?: number | null;
  /** Danh sách các màu sắc đang còn hàng */
  availableColors?: string[];
  /** Danh sách các kích cỡ đang còn hàng */
  availableSizes?: string[];
}

/**
 * Dữ liệu trả về từ API POST /ai/advise.
 * Bao gồm nội dung văn bản tư vấn và danh sách thẻ sản phẩm được AI nhắc tới.
 */
export interface AiAdviseResponse {
  answer: string;
  suggestedProducts?: AiSuggestedProduct[];
}

/**
 * Cấu trúc một tin nhắn trong khung chat AI Stylist.
 * Tin nhắn từ AI (`sender === 'ai'`) có thể đính kèm mảng `products` để hiển thị danh sách thẻ sản phẩm.
 */
export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  products?: AiSuggestedProduct[];
  timestamp: Date;
}


