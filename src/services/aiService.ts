import apiClient, { API_BASE_URL } from './apiClient';
import { AiAdviseRequest, AiAdviseResponse, AiSuggestedProduct } from '../types/ai';
import { ApiResponse } from '../types/api';
import { ProductResponse } from '../types/product';
import { productService } from './productService';

type AiRecommendedProduct = Omit<ProductResponse, 'id'> & { productId: number };

/**
 * Bộ nhớ đệm (cache) danh sách sản phẩm ở phía Client.
 * Dùng làm phương án dự phòng (Fallback) để tự động trích xuất thẻ sản phẩm từ văn bản trả lời của AI
 * trong trường hợp Backend chưa trả về `suggestedProducts` (ví dụ khi chưa restart server Backend).
 */
let cachedCatalogProducts: ProductResponse[] | null = null;

async function getCatalogProductsForFallback(): Promise<ProductResponse[]> {
  if (cachedCatalogProducts && cachedCatalogProducts.length > 0) {
    return cachedCatalogProducts;
  }
  try {
    const res = await productService.getProducts({ isActive: true });
    if (Array.isArray(res?.data)) {
      cachedCatalogProducts = res.data;
      return cachedCatalogProducts;
    }
  } catch {
    // Bỏ qua nếu không tải được catalog dự phòng
  }
  return [];
}

/**
 * Chuyển đổi đối tượng `ProductResponse` đầy đủ sang dạng `AiSuggestedProduct` rút gọn
 * để hiển thị trên thẻ sản phẩm trong khung chat AI.
 */
function mapProductToAiSuggested(p: ProductResponse): AiSuggestedProduct {
  const mainImg =
    p.imageUrl ||
    p.thumbnail ||
    p.image ||
    p.productImages?.find((img) => img.isMain)?.imageUrl ||
    p.productImages?.[0]?.imageUrl ||
    p.images?.[0] ||
    null;

  // Chỉ tổng hợp màu sắc và kích cỡ từ các biến thể đang hoạt động và còn tồn kho
  const activeVariants = (p.variants || []).filter(
    (v) => v.isActive !== false && (v.stockQuantity === undefined || v.stockQuantity > 0)
  );

  const colors = Array.from(
    new Set(
      activeVariants
        .map((v) => v.color)
        .filter((c): c is string => Boolean(c && c.trim()))
    )
  ).slice(0, 5);

  const sizes = Array.from(
    new Set(
      activeVariants
        .map((v) => v.size)
        .filter((s): s is string => Boolean(s && s.trim()))
    )
  ).slice(0, 6);

  const discPrice =
    p.bestOffer?.discountedPrice && p.bestOffer.discountedPrice < p.basePrice
      ? p.bestOffer.discountedPrice
      : p.discountedPrice && p.discountedPrice < p.basePrice
        ? p.discountedPrice
        : null;

  return {
    id: p.id,
    name: p.name,
    slug: p.slug || null,
    imageUrl: mainImg,
    basePrice: Number(p.basePrice || 0),
    discountedPrice: discPrice ? Number(discPrice) : null,
    availableColors: colors,
    availableSizes: sizes,
  };
}

/**
 * Xóa các thẻ đánh dấu kỹ thuật như `[[ID:123]]` hoặc `(Mã: 123)` khỏi văn bản trả lời của AI
 * để người dùng chỉ đọc được nội dung tư vấn tự nhiên.
 */
function cleanAiText(raw: string): string {
  return raw
    .replace(/\[\[(?:PRODUCT_)?ID\s*:\s*\d+\]\]/gi, '')
    .replace(/\(\s*Mã\s*:\s*\d+\s*\)/gi, '')
    .replace(/\[\s*Mã\s*:\s*\d+\s*\]/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Cơ chế dự phòng ở Frontend: Tự động đối chiếu câu trả lời của AI với danh sách sản phẩm đang bán
 * theo mã `[[ID:123]]`, `Mã: 123` hoặc theo tên sản phẩm xuất hiện trong câu trả lời (tối đa 4 sản phẩm).
 */
async function extractProductsFromAnswerFallback(answer: string): Promise<AiSuggestedProduct[]> {
  if (!answer.trim()) return [];
  const catalog = await getCatalogProductsForFallback();
  if (catalog.length === 0) return [];

  const byId = new Map<number, ProductResponse>();
  catalog.forEach((p) => byId.set(Number(p.id), p));

  const matched = new Map<number, AiSuggestedProduct>();

  // 1. Khớp theo [[ID:123]] hoặc "Mã: 123"
  const idRegex = /(?:\[\[(?:PRODUCT_)?ID\s*:\s*(\d+)\]\]|(?:Mã(?:\s+SP|\s+sản\s+phẩm)?|ID)\s*[:#]?\s*(\d+))/gi;
  let m: RegExpExecArray | null;
  while ((m = idRegex.exec(answer)) !== null) {
    const id = Number(m[1] || m[2]);
    const prod = byId.get(id);
    if (prod && !matched.has(prod.id)) {
      matched.set(prod.id, mapProductToAiSuggested(prod));
    }
  }

  // 2. Khớp theo tên sản phẩm xuất hiện trong văn bản (sắp xếp theo thứ tự xuất hiện)
  const lower = answer.toLowerCase();
  const nameHits: Array<{ pos: number; product: ProductResponse }> = [];
  for (const prod of catalog) {
    if (matched.has(prod.id) || !prod.name) continue;
    const cleanName = prod.name.trim().toLowerCase();
    if (cleanName.length < 3) continue;
    const idx = lower.indexOf(cleanName);
    if (idx >= 0) {
      nameHits.push({ pos: idx, product: prod });
    }
  }
  nameHits.sort((a, b) => a.pos - b.pos);
  for (const hit of nameHits) {
    if (!matched.has(hit.product.id)) {
      matched.set(hit.product.id, mapProductToAiSuggested(hit.product));
    }
  }

  return Array.from(matched.values()).slice(0, 4);
}

export const aiService = {
  async getRecommendations(userId: number, limit = 8, signal?: AbortSignal): Promise<ProductResponse[]> {
    const res = await apiClient.get<ApiResponse<AiRecommendedProduct[]>>(
      `/ai/understanding/recommend/${userId}`,
      { params: { limit }, signal }
    );
    return res.data.data.map(({ productId, ...product }) => ({
      ...product,
      id: productId,
    }));
  },

  /**
   * Hỏi AI Tư Vấn Thời Trang (Google Gemini qua Spring AI).
   * - Ưu tiên lấy `suggestedProducts` do Backend trích xuất sẵn từ `ProductCatalogCache`.
   * - Nếu Backend chưa trả về `suggestedProducts`, tự động chạy `extractProductsFromAnswerFallback` ở Client.
   */
  async advise(question: string): Promise<AiAdviseResponse> {
    const res = await apiClient.post<AiAdviseResponse>('/ai/advise', { question } as AiAdviseRequest);
    const rawAnswer = res.data?.answer || '';
    const cleanedAnswer = cleanAiText(rawAnswer);
    let suggestedProducts = Array.isArray(res.data?.suggestedProducts)
      ? res.data.suggestedProducts
      : [];

    if (suggestedProducts.length === 0 && rawAnswer) {
      suggestedProducts = await extractProductsFromAnswerFallback(rawAnswer);
    }

    return {
      answer: cleanedAnswer,
      suggestedProducts,
    };
  },

  /**
   * Tư vấn dạng Streaming (SSE Server-Sent Events)
   */
  async adviseStream(
    question: string,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const token = localStorage.getItem('fashion_access_token');

    const response = await fetch(`${API_BASE_URL}/ai/advise-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ question }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`AI Streaming thất bại (Mã lỗi: ${response.status})`);
    }

    if (!response.body) {
      return '';
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      onChunk(chunk);
    }

    return fullText;
  },
};

