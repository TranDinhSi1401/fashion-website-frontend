# TÀI LIỆU CẬP NHẬT THAY ĐỔI FRONTEND (UPDATE_TEN)
**Dự án**: FASHION WEBSITE FRONTEND  
**Nội dung cập nhật**: Đồng bộ Ma trận Sở thích (Feature Store), Dwell Time 15s, Event Batching và Tích hợp Trợ lý AI Stylist (Spring AI & Google Gemini).

---

## 1. TỔNG QUAN CÁC THAY ĐỔI ĐÃ TRIỂN KHAI

| STT | Thành phần / File | Thay đổi chính | Trạng thái |
| :-: | :--- | :--- | :---: |
| 1 | [`src/types/behavior.ts`](file:///e:/fashion-website-frontend/src/types/behavior.ts) | Bổ sung `DWELL_15S` vào `BehaviorType`. Thêm các interface `TrackBehaviorRequest`, `CategoryPreferenceScore`, `UserPreferenceScoreResponse`, `UserPreferenceProfileResponse`. | Hoàn tất |
| 2 | [`src/pages/ProductDetailPage.tsx`](file:///e:/fashion-website-frontend/src/pages/ProductDetailPage.tsx) | Bắn sự kiện `VIEW` ngay khi vào trang. Kích hoạt hẹn giờ 15 giây để bắn sự kiện `DWELL_15S` (+2 điểm vào Feature Store). Tự hủy timer nếu khách rời trang trước 15s. | Hoàn tất |
| 3 | [`src/services/behaviorService.ts`](file:///e:/fashion-website-frontend/src/services/behaviorService.ts) | Hỗ trợ bắn đơn lẻ `POST /behaviors`, bắn hàng loạt `POST /behaviors/batch`, hàng đợi gom sự kiện `queueBehavior`, API lấy điểm `/user-preferences/me/scores` và `/behaviors/me/preferences`. | Hoàn tất |
| 4 | [`src/types/ai.ts`](file:///e:/fashion-website-frontend/src/types/ai.ts) & [`src/services/aiService.ts`](file:///e:/fashion-website-frontend/src/services/aiService.ts) | Thêm service gọi AI tư vấn `POST /api/v1/ai/advise` và SSE streaming `POST /api/v1/ai/advise-stream` (tự động đính kèm token). | Hoàn tất |
| 5 | [`src/components/ai/AiAdvisorWidget.tsx`](file:///e:/fashion-website-frontend/src/components/ai/AiAdvisorWidget.tsx) | Widget nổi AI Stylist tư vấn thời trang thông minh bằng Google Gemini trên toàn website, có gợi ý câu hỏi nhanh. | Hoàn tất |
| 6 | [`src/components/profile/PreferenceMatrixTab.tsx`](file:///e:/fashion-website-frontend/src/components/profile/PreferenceMatrixTab.tsx) | Tab trực quan hóa ma trận sở thích khách hàng tại `/account/preferences`, hiển thị chi tiết số lần View, Dwell >15s, Chọn size, Giỏ hàng, tổng điểm và thanh tỷ lệ quan tâm. | Hoàn tất |
| 7 | [`src/App.tsx`](file:///e:/fashion-website-frontend/src/App.tsx) | Đăng ký route `/account/preferences` và mount widget `<AiAdvisorWidget />`. | Hoàn tất |

---

## 2. CHI TIẾT KỸ THUẬT CÁC CẬP NHẬT

### 2.1. Cập nhật `src/types/behavior.ts`
```typescript
// Chỉ các hành vi client được phép gửi; ADD_TO_CART, REMOVE_FROM_CART, PURCHASE do backend tự ghi
export type BehaviorType = 'VIEW' | 'SELECT_VARIANT' | 'DWELL_15S';
export type ClientBehaviorType = BehaviorType;

export interface TrackBehaviorRequest {
  productId: number;
  variantId?: number | null;
  type: BehaviorType;
}

export type TrackBehaviorPayload = TrackBehaviorRequest;

// Ma trận điểm sở thích theo danh mục (Feature Store Category Score)
export interface CategoryPreferenceScore {
  categoryId: number;
  categoryName: string;
  viewCount: number;
  dwellCount: number;
  selectSizeCount: number;
  cartCount: number;
  score: number;
}

export interface UserPreferenceScoreResponse {
  userId: number;
  categoryScores: CategoryPreferenceScore[];
  totalScore: number;
}
```

---

### 2.2. Bắn sự kiện Dwell Time > 15s tại `ProductDetailPage.tsx`
Khách hàng dừng chân đọc thông tin trên 15 giây phản ánh mức độ quan tâm sâu sắc hơn chỉ lướt qua (`VIEW`). Hệ thống ghi nhận thêm `+2` điểm trọng số vào danh mục tương ứng:

```typescript
// 1. Gửi VIEW ngay khi vào trang & 2. Dwell time: Sau 15 giây gửi DWELL_15S (+2 điểm ma trận sở thích)
useEffect(() => {
  if (!product || !isAuthenticated || !isCustomer) return;

  // 1. Gửi VIEW ngay (dùng useRef chặn gửi đôi do React StrictMode)
  if (viewedProductId.current !== product.id) {
    viewedProductId.current = product.id;
    trackBehavior({ productId: product.id, variantId: null, type: 'VIEW' });
  }

  // 2. Dwell time: Sau 15 giây nếu khách vẫn đang đọc thông tin, gửi DWELL_15S
  const dwellTimer = setTimeout(() => {
    trackBehavior({ productId: product.id, variantId: null, type: 'DWELL_15S' });
  }, 15000);

  // Xóa timer nếu khách chuyển trang trước 15s
  return () => clearTimeout(dwellTimer);
}, [product, isAuthenticated, isCustomer]);
```

---

### 2.3. Hỗ trợ Event Batching tại `behaviorService.ts`
Cho phép gom nhiều hành vi trong hàng đợi để gửi 1 lần, giúp tiết kiệm kết nối mạng và tối ưu hóa hiệu năng máy chủ:

* **Endpoint đơn lẻ**: `POST /api/v1/behaviors`
* **Endpoint Batching**: `POST /api/v1/behaviors/batch`
  - Body: Mảng `TrackBehaviorRequest[]` (tối đa 20 sự kiện).
  - Tích hợp hàm `queueBehavior(request)` tự động gom và gửi sau 1.5s hoặc khi đạt 10 sự kiện.

---

### 2.4. Trợ lý Thời trang AI (Spring AI & Google Gemini)
* **Endpoint**: `POST /api/v1/ai/advise`
* **Cơ chế**: Khi gửi câu hỏi từ Frontend, thư viện `apiClient` tự động đính kèm `Authorization: Bearer <token>`.
* **Backend xử lý**: Tự động trích xuất `userId` và ma trận sở thích (`Score(U, C)`, top màu, top size, sản phẩm xem gần đây) từ Feature Store để nạp vào prompt của Google Gemini.
* **Frontend Widget**: Component `<AiAdvisorWidget />` hiển thị nút nổi ở góc phải màn hình, hỗ trợ người dùng trò chuyện tư vấn phong cách mọi lúc mọi nơi.

---

### 2.5. Ma trận Điểm Sở thích tại Trang Cá Nhân (`ProfilePage.tsx`)
Tại tab **"Gu & Sở Thích (AI)"** (`/account/preferences`):
* Gọi API: `GET /api/v1/user-preferences/me/scores` và `GET /api/v1/behaviors/me/preferences`.
* Bảng hiển thị công thức trọng số:
  $$\text{Score}(U, C) = (N_{\text{view}} \times 1) + (N_{\text{dwell}>15s} \times 2) + (N_{\text{select\_size}} \times 3) + (N_{\text{cart}} \times 5) + (N_{\text{purchase}} \times 10) - (N_{\text{remove}} \times 2)$$
* Hiển thị chi tiết từng cột chỉ số của mỗi danh mục (Áo Sơ Mi, Polo, Quần Tây...), tổng điểm và thanh phần trăm trực quan.

---

## 3. KIỂM THỬ VÀ XÁC MINH (VERIFICATION)
* Chạy lệnh build: `npm run build`
* Kết quả: `✓ built in 415ms` với **0 lỗi TypeScript**.

