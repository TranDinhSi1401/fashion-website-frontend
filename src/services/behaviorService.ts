import apiClient, { TOKEN_KEY } from './apiClient';
import { 
  TrackBehaviorRequest, 
  UserPreferenceScoreResponse, 
  UserPreferenceProfileResponse,
  ProductScore 
} from '../types/behavior';
import { ApiResponse } from '../types/api';

// Bắn đơn lẻ (Fire-and-forget): không chặn giao diện, nuốt lỗi, bỏ qua nếu chưa đăng nhập
export function trackBehavior(payload: TrackBehaviorRequest): void {
  if (!localStorage.getItem(TOKEN_KEY)) return;
  apiClient.post<ApiResponse<void>>('/behaviors', payload).catch(() => {
    /* bỏ qua lỗi theo dõi hành vi ngầm */
  });
}

// Bắn hàng loạt (Event Batching): gửi mảng tối đa 20 sự kiện qua POST /behaviors/batch
export async function trackBehaviorBatch(requests: TrackBehaviorRequest[]): Promise<void> {
  if (!localStorage.getItem(TOKEN_KEY) || !requests.length) return;
  try {
    await apiClient.post<ApiResponse<void>>('/behaviors/batch', requests);
  } catch {
    /* nuốt lỗi theo dõi ngầm */
  }
}

// ==========================================
// TỰ ĐỘNG GOM SỰ KIỆN TRONG HÀNG ĐỢI (EVENT BATCHING QUEUE)
// ==========================================
let batchQueue: TrackBehaviorRequest[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;

export function queueBehavior(request: TrackBehaviorRequest): void {
  if (!localStorage.getItem(TOKEN_KEY)) return;
  batchQueue.push(request);

  // Nếu hàng đợi đạt 10 sự kiện thì flush ngay lập tức
  if (batchQueue.length >= 10) {
    flushBehaviorQueue();
    return;
  }

  // Nếu chưa có timer thì hẹn giờ 1.5s flush
  if (!batchTimer) {
    batchTimer = setTimeout(() => {
      flushBehaviorQueue();
    }, 1500);
  }
}

export function flushBehaviorQueue(): void {
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
  if (batchQueue.length === 0) return;
  const itemsToSend = [...batchQueue];
  batchQueue = [];
  trackBehaviorBatch(itemsToSend);
}

// ==========================================
// FEATURE STORE & MA TRẬN ĐIỂM SỞ THÍCH
// ==========================================

export const behaviorService = {
  track: trackBehavior,
  trackBatch: trackBehaviorBatch,
  queue: queueBehavior,
  flush: flushBehaviorQueue,

  // Lấy ma trận điểm sở thích theo danh mục: GET /api/v1/user-preferences/me/scores
  async getMyPreferenceScores(): Promise<UserPreferenceScoreResponse | null> {
    try {
      const res = await apiClient.get<ApiResponse<UserPreferenceScoreResponse>>('/user-preferences/me/scores');
      return res.data?.data || null;
    } catch (err) {
      console.warn('Không thể lấy ma trận điểm sở thích:', err);
      return null;
    }
  },

  // Feature Store: Lấy hồ sơ sở thích đa chiều (Top SP, Danh mục, Màu, Size): GET /api/v1/behaviors/me/preferences
  async getMyPreferences(): Promise<UserPreferenceProfileResponse | null> {
    try {
      const res = await apiClient.get<ApiResponse<UserPreferenceProfileResponse>>('/behaviors/me/preferences');
      return res.data?.data || null;
    } catch (err) {
      console.warn('Không thể lấy hồ sơ sở thích:', err);
      return null;
    }
  },

  // Lấy top sản phẩm quan tâm: GET /api/v1/behaviors/me/top-products
  async getMyTopProducts(limit = 10): Promise<ProductScore[]> {
    try {
      const res = await apiClient.get<ApiResponse<ProductScore[]>>('/behaviors/me/top-products', {
        params: { limit }
      });
      return res.data?.data || [];
    } catch (err) {
      console.warn('Không thể lấy top sản phẩm:', err);
      return [];
    }
  }
};
