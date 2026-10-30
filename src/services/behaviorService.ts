import apiClient, { TOKEN_KEY } from './apiClient';
import { TrackBehaviorPayload } from '../types/behavior';

// Bắn rồi bỏ: không chặn giao diện, nuốt mọi lỗi, bỏ qua nếu chưa đăng nhập
export function trackBehavior(payload: TrackBehaviorPayload): void {
  if (!localStorage.getItem(TOKEN_KEY)) return;
  apiClient.post('/behaviors', payload).catch(() => { /* bỏ qua lỗi theo dõi hành vi */ });
}
