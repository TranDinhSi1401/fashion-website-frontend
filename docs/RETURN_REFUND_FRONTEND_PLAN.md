# KẾ HOẠCH TRIỂN KHAI FRONTEND — MODULE TRẢ HÀNG & HOÀN TIỀN (RETURN & REFUND)

> **Dự án:** `fashion-website-frontend` (React 19 + TypeScript + Tailwind CSS + CSS Modules)  
> **Quy chuẩn giao diện bắt buộc:** [Bộ quy tắt thiết kế giao diện.md](../docx/B%E1%BB%99%20quy%20t%E1%BA%AFt%20thi%E1%BA%BFt%20k%E1%BA%BF%20giao%20di%E1%BB%87n.md) & [Hướng dẫn áp dụng bộ quy tắc giao diện.md](../docx/H%C6%B0%E1%BB%9Bng%20d%E1%BA%ABn%20%C3%A1p%20d%E1%BB%A5ng%20b%E1%BB%99%20quy%20t%E1%BA%AFc%20giao%20di%E1%BB%87n.md)  
> **Base URL Backend mục tiêu:** `http://localhost:8081/api/v1`

---

## 1. TÓM TẮT QUYẾT ĐỊNH KIẾN TRÚC ĐÃ THỐNG NHẤT

| Hạng mục | Quyết định chốt | Ghi chú triển khai |
| :--- | :--- | :--- |
| **Phạm vi đợt này** | **Sprint 1 (Khách hàng C1–C5)** & **Sprint 2 (Quản trị/Kho A1–A4)** | **Tạm hoãn S1 (Notification Bell & WebSocket STOMP)** sang đợt sau. |
| **Điều hướng Khách hàng (C1–C4)** | • **C1** (`/account/orders`) & **C3** (`/account/returns`) tích hợp vào Sidebar của `ProfilePage.tsx`<br>• **C2** (`/account/returns/new`) & **C4** (`/account/returns/:id`) là trang độc lập toàn khung có `Breadcrumb` | Giữ đồng bộ với các tab hiện tại `/account/profile`, `/account/addresses`, `/account/password`, `/account/preferences`. |
| **Blocker `orderItems` ở C1/C2** | Frontend dùng **Adapter trong `orderService.ts`**: ưu tiên dùng `orderItems` thật nếu API `GET /orders/my-orders` có trả, fallback sang dữ liệu mock khi API chưa trả | Không đụng code Backend Order; hiển thị badge/banner nhỏ báo trạng thái dữ liệu mẫu khi đang fallback. |
| **Điều hướng Admin/Staff (A1–A4)** | • Thêm link **"Quản lý trả hàng"** vào dropdown Quản trị trên `Header.tsx`<br>• Dùng **Sub-nav Tab chung** đầu khu vực `/admin/returns*` chuyển qua lại giữa **A1**, **A3** *(ẩn với `STAFF`)*, **A4**<br>• **A2** (`/admin/returns/:id`) là trang chi tiết độc lập | `A3` (`/admin/returns/dormant`) bọc bởi `<ProtectedRoute requiredRoles={['ADMIN']}>`. |
| **Bố trí Form tác nghiệp A2** | • 8 thao tác form ngắn (`Duyệt`, `Từ chối`, `Bàn giao`, `Gia hạn`, `Nhận kho`, `Hoàn tiền`, `Giải trình SLA`, `Ghi nhật ký`) dùng `Modal` chuẩn (`src/components/ui/Modal.tsx`)<br>• 2 thao tác bảng nhiều dòng (**Kiểm định QC `inspect`** & **Phân loại nhập kho `restock`**) dùng Panel/Modal rộng (`size="quick-view"`, `920px`) có bảng đối chiếu song song với ảnh minh chứng | Đóng hồ sơ (`complete`) dùng hộp thoại xác nhận trước khi gọi `PATCH /complete`. |
| **Cấu hình API** | Cập nhật `VITE_API_BASE_URL=http://localhost:8081/api/v1` trong `src/.env` | Lưu ý `apiClient.ts` có fallback mặc định `http://localhost:8080/api/v1` nên bắt buộc giữ `src/.env` đúng port `8081`. |

---

## 2. CẤU TRÚC THƯ MỤC & FILE CẦN TẠO / CẬP NHẬT

```text
src/
├── .env                                            # [UPDATE] VITE_API_BASE_URL=http://localhost:8081/api/v1
├── App.tsx                                         # [UPDATE] Thêm routes C1-C4, A1-A4
├── types/
│   ├── order.ts                                    # [NEW] OrderResponse, OrderItemResponse (kèm adapter fallback)
│   └── return.ts                                   # [NEW] Toàn bộ Enum, Response DTO, Request DTO, SpringPage<T>
├── constants/
│   └── returnMeta.ts                               # [NEW] Map 8 ReturnRequestStatus -> label, BadgeVariant; 3 ReturnReason -> label
├── services/
│   ├── orderService.ts                             # [NEW] getMyOrders() + normalizeOrderWithItems() fallback mock
│   ├── returnService.ts                            # [NEW] 10 API nhóm Khách hàng (/returns/**)
│   └── returnAdminService.ts                       # [NEW] 18 API nhóm Admin/Staff (/admin/returns/**)
├── components/
│   ├── layout/
│   │   └── Header.tsx                              # [UPDATE] Thêm link Đơn hàng/Trả hàng cho Customer & Quản lý trả hàng cho Admin/Staff
│   └── returns/
│       ├── ReturnStatusBadge.tsx                   # [NEW] Wrapper dùng src/components/ui/Badge cho 8 trạng thái
│       ├── ReturnTimeline.tsx                      # [NEW] Tiến trình 6 bước + bộ mốc thời gian + cảnh báo SLA
│       ├── ReturnTimeline.module.css               # [NEW] Style đường nối timeline & banner SLA bằng tokens.css
│       ├── ReturnImageUploader.tsx                 # [NEW] Chọn 1–5 ảnh (JPG/JPEG/PNG/WebP <= 5MB), preview & xóa
│       ├── ReturnImageGallery.tsx                  # [NEW] Hiển thị ảnh minh chứng + lightbox xem ảnh lớn qua Modal
│       ├── ReturnActionModals.tsx                  # [NEW] Nhóm Modal C5a (Sửa phiếu), C5b (STK), C5c (Xác nhận phương án)
│       ├── AdminReturnSubNav.tsx                   # [NEW] Sub-nav Tab chung cho A1 / A3 (ADMIN only) / A4
│       ├── AdminActionModals.tsx                   # [NEW] 8 Modal thao tác ngắn trên A2
│       └── AdminInspectRestockModals.tsx           # [NEW] 2 Modal rộng (920px) Kiểm định QC & Nhập lại kho
└── pages/
    ├── ProfilePage.tsx                             # [UPDATE] Thêm tab 'orders' (C1) và 'returns' (C3) vào Sidebar
    ├── CustomerOrdersTab.tsx                       # [NEW] Nội dung tab C1: Danh sách đơn hàng + nút Yêu cầu trả hàng
    ├── CustomerReturnsTab.tsx                      # [NEW] Nội dung tab C3: Danh sách phiếu trả hàng + phân trang
    ├── ReturnCreatePage.tsx                        # [NEW] Màn C2: Form tạo yêu cầu trả hàng (/account/returns/new)
    ├── ReturnDetailPage.tsx                        # [NEW] Màn C4: Chi tiết phiếu trả hàng Khách hàng (/account/returns/:id)
    ├── ReturnPages.module.css                      # [NEW] Alert/banner/row hover CSS Modules dùng tokens.css & rgba(...)
    ├── AdminReturnsPage.tsx                        # [NEW] Màn A1: Dashboard lọc & danh sách phiếu (/admin/returns)
    ├── AdminReturnDetailPage.tsx                   # [NEW] Màn A2: Chi tiết & điều phối Bước 2–6 (/admin/returns/:id)
    ├── AdminDormantReviewsPage.tsx                 # [NEW] Màn A3: Hồ sơ treo >30 ngày (/admin/returns/dormant - ADMIN only)
    ├── AdminReturnHolidaysPage.tsx                 # [NEW] Màn A4: Cấu hình ngày nghỉ lễ SLA (/admin/returns/holidays)
    └── AdminPages.module.css                       # [UPDATE] Tái sử dụng & bổ sung class trạng thái/cảnh báo nếu cần
```

---

## 3. HỆ THỐNG ĐỊNH TUYẾN (ROUTING) & PHÂN QUYỀN

Cấu hình bổ sung trong [src/App.tsx](../src/App.tsx), bọc bằng `ProtectedRoute`:

| Màn hình | Route Path | Role cho phép | Component |
| :--- | :--- | :--- | :--- |
| **C1** | `/account/orders` | Authenticated (`CUSTOMER`, hoặc user đã đăng nhập) | `ProfilePage` (tab `orders`) |
| **C2** | `/account/returns/new` | `CUSTOMER` | `ReturnCreatePage` *(nhận `?orderId=<id>`)* |
| **C3** | `/account/returns` | `CUSTOMER` | `ProfilePage` (tab `returns`) |
| **C4** | `/account/returns/:id` | `CUSTOMER` | `ReturnDetailPage` |
| **A1** | `/admin/returns` | `ADMIN`, `STAFF` | `AdminReturnsPage` |
| **A2** | `/admin/returns/:id` | `ADMIN`, `STAFF` | `AdminReturnDetailPage` |
| **A3** | `/admin/returns/dormant` | **Chỉ `ADMIN`** | `AdminDormantReviewsPage` |
| **A4** | `/admin/returns/holidays` | `ADMIN`, `STAFF` | `AdminReturnHolidaysPage` |

---

## 4. HỢP ĐỒNG DỮ LIỆU (TYPESCRIPT) & QUY TẮC CHỐNG LỖI BACKEND

### 4.1. Enum & Mapping Giao diện (`src/types/return.ts`, `src/constants/returnMeta.ts`)

```ts
export type ReturnRequestStatus =
  | 'PENDING_APPROVAL'
  | 'WAITING_FOR_RETURN_DELIVERY'
  | 'INSPECTING'
  | 'WAITING_CUSTOMER_FEEDBACK'
  | 'WAITING_REFUND'
  | 'REFUNDED'
  | 'REJECTED'
  | 'CANCELLED';

export type ReturnReason = 'CHANGE_OF_MIND' | 'DEFECTIVE' | 'WRONG_ITEM';

export interface SpringPage<T> {
  content: T[];
  number: number;         // 0-indexed page từ Spring Data
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
```

**Ánh xạ 8 trạng thái sang `Badge` (`src/components/ui/Badge.tsx`):**
- `PENDING_APPROVAL` (*Chờ duyệt*) ➔ `warning`
- `WAITING_FOR_RETURN_DELIVERY` (*Chờ nhận hàng trả*) ➔ `dark`
- `INSPECTING` (*Đang kiểm tra hàng*) ➔ `vip`
- `WAITING_CUSTOMER_FEEDBACK` (*Chờ khách phản hồi*) ➔ `warning`
- `WAITING_REFUND` (*Chờ hoàn tiền*) ➔ `new`
- `REFUNDED` (*Đã hoàn tiền*) ➔ `success`
- `REJECTED` (*Bị từ chối*) ➔ `error`
- `CANCELLED` (*Đã hủy*) ➔ `default`

### 4.2. Quy tắc "Không thừa Field" (`@JsonAnySetter` -> `400 UNSUPPORTED_FIELD`) & Payload Edge Cases

Toàn bộ Request DTO ở Backend gắn `@JsonAnySetter`, chỉ cần thừa **1 key không khai báo** hoặc sai định dạng sẽ trả `400`. Team FE phải dùng **hàm build payload tường minh** cho từng API:

1. **Không truyền các trường read-only/system:** Tuyệt đối không gửi `id`, `status`, `refundAmount`, `itemsRefundAmount`, `approvedBy`, `isOverdue`, `isDefault`, `imageUrls`, hoặc `orderId` (khi gọi `PUT /returns/{id}`).
2. **Xử lý chuỗi rỗng cho field Optional có `@Pattern`:**
   - Trong `ReturnRequestCreationRequest`, `ReturnRequestUpdateRequest` và `ReturnRequestConfirmPlanRequest`, trường `accountNumber` gắn `@Pattern(regexp = "^[0-9]{6,30}$")`.
   - Trong Bean Validation, chuỗi `""` vẫn bị kiểm tra `@Pattern` và báo lỗi `400`. Vì vậy khi người dùng bỏ trống ngân hàng, helper build payload **phải lược bỏ hoàn toàn (hoặc đặt `undefined`)** `bankName`, `accountNumber`, `accountHolderName` trước khi `JSON.stringify`.
3. **Upload Multipart (`POST /api/v1/returns` & `PUT /api/v1/returns/{id}`):**
   - `apiClient.ts` đặt mặc định `headers: { 'Content-Type': 'application/json' }`.
   - Khi gửi kèm ảnh qua `FormData`, cần:
     - Đóng gói part JSON `"request"` bằng `Blob` có MIME type `application/json`:
       ```ts
       const formData = new FormData();
       formData.append(
         'request',
         new Blob([JSON.stringify(cleanPayload)], { type: 'application/json' })
       );
       files.forEach((file) => formData.append('images', file));
       ```
     - Truyền `headers: { 'Content-Type': undefined }` (hoặc `'multipart/form-data'`) để trình duyệt/Axios tự sinh `boundary` hợp lệ cho Spring `@RequestPart("request")` & `@RequestPart("images")`.
4. **Quy tắc `PUT /api/v1/returns/{id}` (C5a):**
   - Nếu khách **không chọn ảnh mới**, chỉ gửi `application/json` (giữ nguyên ảnh cũ trên Cloudinary).
   - Nếu khách **upload bộ ảnh mới**, gửi `multipart/form-data` — Backend sẽ **thay thế toàn bộ bộ ảnh cũ**, nên trên UI phải hiển thị cảnh báo rõ ràng cho khách trước khi lưu.
5. **Quy tắc ngày giờ (`LocalDateTime` & `LocalDate`):**
   - `handover` (`handedOverAt`) & `receive` (`receivedAt`): Nếu người dùng không nhập, **không gửi field** (hoặc gửi `undefined`) để Backend tự lấy giờ hiện tại. Nếu nhập từ `<input type="datetime-local">`, chuẩn hóa về ISO `YYYY-MM-DDTHH:mm:ss`.
   - `overdue-note` (`estimatedCompletionAt`): Bắt buộc lớn hơn thời điểm hiện tại (`ESTIMATED_COMPLETION_MUST_BE_FUTURE`).
   - `holidays` (`holidayDate`): Bắt buộc định dạng `YYYY-MM-DD`.

---

## 5. ĐẶC TẢ CHI TIẾT CÁC MÀN HÌNH & VALIDATION

### Phần A — Phía Khách Hàng (`ROLE_CUSTOMER`)

#### Màn hình C1: Danh sách Đơn hàng của tôi (`/account/orders` — Tab trong `ProfilePage`)
- **API:** `GET /api/v1/orders/my-orders`
- **Hiển thị:** Bảng / danh sách thẻ đơn hàng gồm: Mã đơn (`orderCode`), Ngày đặt (`createdAt`), Trạng thái đơn (`orderStatus`), Trạng thái thanh toán (`paymentStatus`), Tổng tiền (`formatCurrencyVND(totalAmount)`), Ngày giao (`deliveredAt`).
- **Điều kiện hiện nút "Yêu cầu trả hàng / Hoàn tiền":**
  - `order.orderStatus === 'DELIVERED'`
  - Có `deliveredAt` và `Date.now() <= new Date(deliveredAt).getTime() + 7 * 24 * 60 * 60 * 1000` *(7 ngày lịch)*.
  - Nếu quá 7 ngày, hiển thị text ghi chú mờ: *"Đã quá hạn 7 ngày yêu cầu trả hàng"* (hoặc disabled tooltip).
- **Xử lý Blocker `orderItems`:**
  - `orderService.getMyOrders()` kiểm tra trường `orderItems` / `items` từ response Backend. Nếu Backend chưa trả về, adapter tự gắn danh sách `orderItems` mẫu (đặt flag `isMockItems: true`) để khi bấm nút chuyển sang `/account/returns/new?orderId=<id>` (truyền kèm `state: { order }`), màn C2 vẫn hiển thị được danh sách sản phẩm chọn trả.

#### Màn hình C2: Form Tạo yêu cầu trả hàng (`/account/returns/new`)
- **Layout:** Trang toàn khung có `Breadcrumb` (`Trang chủ / Tài khoản / Đơn hàng / Tạo yêu cầu trả hàng`) + `SectionHeader`.
- **Nếu vào trực tiếp URL không có `state.order`:** Gọi `orderService.getMyOrders()` tìm đơn theo `?orderId=...`; nếu không tìm thấy hoặc đơn chưa đủ điều kiện trả, hiện cảnh báo lỗi và nút quay lại `/account/orders`.
- **Các khối nhập liệu:**
  1. **Chọn sản phẩm cần trả:** Danh sách item của đơn với `Checkbox` chọn dòng + `QuantityStepper` (`min={1}`, `max={item.quantity}`).
  2. **Lý do & Mô tả:** `Select` hoặc `Radio` chọn `reason` (`CHANGE_OF_MIND`, `DEFECTIVE`, `WRONG_ITEM`) + `Input multiline` cho `reasonDetail` (bắt buộc, `<= 1000` ký tự).
  3. **Ảnh minh chứng (`ReturnImageUploader`):**
     - Khi `reason === 'DEFECTIVE' || reason === 'WRONG_ITEM'`: **bắt buộc 1–5 ảnh**, mỗi ảnh `JPG/JPEG/PNG/WebP`, dung lượng `<= 5 MB` (validate ngay phía client trước khi submit).
     - Khi `reason === 'CHANGE_OF_MIND'`: ảnh là tùy chọn.
     - Nếu `files.length === 0` ➔ gọi `POST /api/v1/returns` dạng JSON; nếu `files.length > 0` ➔ gọi `POST /api/v1/returns` dạng `multipart/form-data`.
  4. **Thông tin ngân hàng nhận hoàn tiền (Tùy chọn khi tạo):** `bankName`, `accountNumber` (regex `^[0-9]{6,30}$`), `accountHolderName`.

#### Màn hình C3: Danh sách Phiếu trả hàng của tôi (`/account/returns` — Tab trong `ProfilePage`)
- **API:** `GET /api/v1/returns/my-requests?page={page}&size=10` (chú ý `Pagination.tsx` dùng 1-based page nên cần chuyển đổi `currentPage - 1` ↔ `SpringPage.number + 1`).
- **Hiển thị từng dòng:** `returnCode`, `orderCode`, ngày tạo `createdAt`, `ReturnStatusBadge`, tổng tiền hoàn dự kiến/thực tế `formatCurrencyVND(refundAmount)`, badge cảnh báo nhỏ nếu `isOverdue === true` (kèm `estimatedCompletionAt` nếu có).
- **Tương tác:** Bấm vào từng phiếu điều hướng sang `/account/returns/${item.id}` (C4).

#### Màn hình C4: Chi tiết Phiếu trả hàng (`/account/returns/:id`) & Nhóm Modal C5
- **API:** `GET /api/v1/returns/{id}`
- **Các phân khu trên trang C4:**
  1. **Header & Thanh hành động nhanh:** Mã phiếu `returnCode`, `ReturnStatusBadge`, mã đơn `orderCode`, các nút tác vụ bật/tắt theo đúng state machine:
     - **Chỉnh sửa phiếu (C5a):** Chỉ hiện khi `status === 'PENDING_APPROVAL'`.
     - **Hủy yêu cầu (`PATCH /api/v1/returns/{id}/cancel`):** Chỉ hiện khi `status === 'PENDING_APPROVAL'` hoặc `(status === 'WAITING_FOR_RETURN_DELIVERY' && handedOverAt === null)`. Có confirm dialog trước khi gọi.
     - **Bổ sung / Sửa STK ngân hàng (C5b):** Hiện khi `status` **không** thuộc `REFUNDED`, `REJECTED`, `CANCELLED`.
     - **Xác nhận phương án xử lý (C5c):** Hiện nổi bật (banner cảnh báo) khi `status === 'WAITING_CUSTOMER_FEEDBACK' && customerConfirmedPlan === false`.
  2. **Tiến trình 6 bước (`ReturnTimeline`):** Hiển thị 6 mốc vòng đời + toàn bộ mốc thời gian có dữ liệu (`approvedAt`, `handoverDeadline`, `previousHandoverDeadline`, `extensionReason`, `handedOverAt`, `receivedAt`, `inspectedAt`, `refundedAt`, `completedAt`) + cảnh báo trễ SLA (`isOverdue`, `overdueReason`, `estimatedCompletionAt`) + lý do từ chối (`rejectionReason` nếu `REJECTED`).
  3. **Bảng chi tiết sản phẩm trả:** Tên SP (`productName`), biến thể (`variantInfo`), SL yêu cầu (`quantity`), SL duyệt (`acceptedQuantity`), ghi chú QC (`inspectionNote`), tiền hoàn từng dòng (`formatCurrencyVND(itemRefundAmount)`).
  4. **Bảng đối soát tài chính & Thông tin hoàn tiền:**
     - `itemsRefundAmount` − `returnShippingFee` = **`refundAmount`**
     - Hiển thị STK ngân hàng (`bankName`, `accountNumber ?? bankAccountNumber`, `accountHolderName ?? bankAccountHolder`), mã giao dịch hoàn tiền (`refundTransactionCode`) và ảnh chứng từ (`refundProofImageUrl` nếu có).
  5. **Thư viện ảnh minh chứng (`ReturnImageGallery`):** Lưới thumbnail `images`, bấm để phóng to bằng `Modal`.
- **Chi tiết Nhóm Modal C5 (`ReturnActionModals.tsx`):**
  - **C5a (`PUT /api/v1/returns/{id}`):** Pre-fill `reason`, `reasonDetail`, `items`, thông tin ngân hàng; cho phép giữ nguyên ảnh cũ (gửi JSON) hoặc chọn bộ ảnh mới thay thế toàn bộ ảnh cũ (gửi `multipart/form-data`). Không gửi `orderId`.
  - **C5b (`PATCH /api/v1/returns/{id}/bank-account`):** 3 trường `bankName`, `accountNumber` (`^[0-9]{6,30}$`), `accountHolderName` đều **bắt buộc**.
  - **C5c (`PATCH /api/v1/returns/{id}/confirm-plan` hoặc `POST /api/v1/returns/{id}/confirm-resolution`):** Hiển thị rõ phần bị cắt giảm (`acceptedQuantity < quantity`), cờ `proposedChangeOfMind`, phí ship `returnShippingFee` và số tiền hoàn cuối `refundAmount`. Khách chọn Đồng ý (`agreed: true`) hoặc Không đồng ý (`agreed: false`), nhập `customerNote` (tùy chọn) và có thể điền/bổ sung STK nếu đồng ý.

---

### Phần B — Phía Quản Trị / Kho / Kế Toán (`ROLE_STAFF` & `ROLE_ADMIN`)

#### Thành phần dùng chung: `AdminReturnSubNav`
Thanh tab ngang đặt đầu màn A1, A3, A4 (cách `SectionHeader` phía dưới):
- **Danh sách phiếu trả hàng** (`/admin/returns`) — `ADMIN`, `STAFF`
- **Hồ sơ treo > 30 ngày** (`/admin/returns/dormant`) — **Chỉ render tab này khi `isAdmin === true`**
- **Ngày nghỉ lễ SLA** (`/admin/returns/holidays`) — `ADMIN`, `STAFF`

#### Màn hình A1: Dashboard Danh sách & Lọc Phiếu trả hàng (`/admin/returns`)
- **API:** `GET /api/v1/admin/returns?status=&orderCode=&isOverdue=&page=0&size=10`
- **Bộ lọc:**
  - `Select` trạng thái (`''` = Tất cả + 8 giá trị `ReturnRequestStatus`)
  - `Input` tìm kiếm theo `orderCode` (kèm `useDebounce` từ `src/hooks/useDebounce.ts`)
  - `Checkbox` **"Chỉ xem phiếu quá hạn SLA"** (`isOverdue=true` hoặc bỏ chọn thì không truyền `isOverdue`)
  - Nút **"Làm mới"** & **"Xóa bộ lọc"**
- **Bảng dữ liệu:** `returnCode`, `orderCode`, Lý do, `ReturnStatusBadge`, Tiền hoàn (`formatCurrencyVND`), Cờ SLA (`Quá hạn` badge `error` nếu `isOverdue`), Ngày tạo `createdAt`, Nút **"Xử lý"** mở `/admin/returns/${id}`. Phân trang bằng `Pagination`.

#### Màn hình A2: Chi tiết & Bảng điều phối Xử lý Phiếu (`/admin/returns/:id`)
- **API:** `GET /api/v1/admin/returns/{id}`
- **Hiển thị:** Giống cấu trúc chi tiết ở C4 nhưng bổ sung thêm:
  - Dấu vết nhân sự (`approvedBy`, `inspectedBy`, `refundedBy`, `restockedBy`, `restockedAt`).
  - Lịch sử nhật ký CSKH (`staffContactLog`) hiển thị dạng block log dễ đọc.
  - Cờ `isOverdue`, `overdueReason`, `estimatedCompletionAt` + nút giải trình SLA.
- **Bảng ánh xạ 11 nút hành động & Điều kiện bật/tắt chặt chẽ:**

| Bước | Nút hành động | Điều kiện hiển thị | Kiểu UI | API & Lưu ý Validation |
| :--- | :--- | :--- | :--- | :--- |
| **B2** | **Duyệt yêu cầu** | `status === 'PENDING_APPROVAL'` | Modal (560px) | `PATCH /admin/returns/{id}/approve` — `{ instructionNote? }` |
| **B2/B4** | **Từ chối yêu cầu** | `status` thuộc `PENDING_APPROVAL \| INSPECTING \| WAITING_CUSTOMER_FEEDBACK` | Modal (560px) | `PATCH /admin/returns/{id}/reject` — `{ rejectionReason }` (bắt buộc) |
| **B3** | **Xác nhận bàn giao VC** | `status === 'WAITING_FOR_RETURN_DELIVERY' && handedOverAt === null` | Modal (560px) | `PATCH /admin/returns/{id}/handover` — `{ handedOverAt?, note? }` |
| **B3** | **Gia hạn bàn giao (+3 ngày)** | `status === 'WAITING_FOR_RETURN_DELIVERY' && handedOverAt === null` | Modal (560px) | `PATCH /admin/returns/{id}/extend-handover` — `{ extensionReason }` (bắt buộc) |
| **B4** | **Xác nhận hàng về kho** | `status === 'WAITING_FOR_RETURN_DELIVERY'` | Modal (560px) | `PATCH /admin/returns/{id}/receive` — `{ receivedAt?, note? }` |
| **B4** | **Kiểm định QC** | `status === 'INSPECTING'` | Modal rộng (920px) | `PATCH /admin/returns/{id}/inspect` — Bắt buộc gửi đủ mọi item; `0 <= acceptedQuantity <= item.quantity`; nếu tổng `acceptedQuantity === 0` bắt buộc `rejectionReason`; chỉ cho nhập `returnShippingFee > 0` khi `reason === 'CHANGE_OF_MIND'` hoặc tích `reclassifyToChangeOfMind = true`. |
| **B5** | **Xác nhận hoàn tiền** | `status === 'WAITING_REFUND'` | Modal (560px) | `POST /admin/returns/{id}/refund` — `{ refundTransactionCode, refundProofImageUrl?, note? }`. Kiểm tra hiển thị sẵn STK khách để đối soát; cảnh báo nếu thiếu STK. |
| **B6** | **Phân loại & Nhập kho** | `inspectedAt !== null && restockedAt === null` và `status` thuộc `WAITING_CUSTOMER_FEEDBACK \| WAITING_REFUND \| REFUNDED` | Modal rộng (920px) | `POST /admin/returns/{id}/restock` — `{ items: [{ returnRequestItemId, restockQuantity, note? }] }`, ràng buộc `0 <= restockQuantity <= acceptedQuantity`. |
| **SLA** | **Giải trình trễ SLA** | `status` chưa thuộc `REFUNDED \| REJECTED \| CANCELLED` | Modal (560px) | `PATCH /admin/returns/{id}/overdue-note` — `{ overdueReason, estimatedCompletionAt }` (cả 2 bắt buộc, thời gian dự kiến phải ở tương lai). |
| **CSKH** | **Ghi nhật ký liên hệ** | `completedAt === null` và `(status === 'WAITING_CUSTOMER_FEEDBACK' \|\| (status === 'REJECTED' && receivedAt !== null))` | Modal (560px) | `PATCH /admin/returns/{id}/contact-log` — `{ contactNote }` (bắt buộc). |
| **Đóng** | **Đóng hoàn tất hồ sơ** | `completedAt === null && (status === 'REFUNDED' || status === 'REJECTED')` | Confirm Modal | `PATCH /admin/returns/{id}/complete` (không body). |

#### Màn hình A3: Rà soát Hồ sơ Treo Quá 30 Ngày (`/admin/returns/dormant` — Chỉ `ROLE_ADMIN`)
- **API:** `GET /api/v1/admin/returns/dormant-reviews?page=0&size=10`
- **Hiển thị:** Danh sách phiếu quá 30 ngày khách chưa phản hồi đang niêm phong lưu kho riêng (`returnCode`, `orderCode`, `dormantReviewNotifiedAt`, tóm tắt `staffContactLog`), bấm **"Xem & Ghi nhật ký"** để chuyển thẳng sang **A2** (`/admin/returns/${id}`).

#### Màn hình A4: Cấu hình Ngày nghỉ lễ tính SLA (`/admin/returns/holidays`)
- **API:**
  - `GET /api/v1/admin/returns/holidays?year={year}`
  - `POST /api/v1/admin/returns/holidays` (`{ holidayDate, name, description? }`)
  - `PUT /api/v1/admin/returns/holidays/{id}` (`{ holidayDate, name, description? }`)
  - `DELETE /api/v1/admin/returns/holidays/{id}`
- **Hiển thị & Quy tắc UI:**
  - Bộ lọc chọn năm (`Select` các năm quanh năm hiện tại).
  - Bảng ngày lễ hiển thị badge **"Mặc định hệ thống"** (`dark`) nếu `isDefault === true` và **"Mở rộng"** (`vip`) nếu `isDefault === false`.
  - Khi `isDefault === true` (`id === null`): **ẩn/khóa hoàn toàn** nút Sửa và Xóa.
  - Khi `isDefault === false`: cho phép mở Modal Sửa hoặc xác nhận Xóa.

---

## 6. QUY CHUẨN GIAO DIỆN, CHÚ THÍCH MÃ NGUỒN & KIỂM TRA CHẤT LƯỢNG (QUALITY GATES)

### 6.1. Quy chuẩn Giao diện (Design System)
Mọi file mới viết trong `d:\fashion-website-frontend` bắt buộc tuân thủ:
1. **Không hardcode mã HEX** (`#...`) ngoài `src/styles/tokens.css`.
2. **Không dùng class màu mặc định Tailwind** (`bg-red-500`, `text-gray-600`, `text-white`, `bg-black`...) và **không dùng opacity modifier** (`/10`, `/50`...) trên CSS variable Tailwind.
3. **Dùng CSS Modules (`*.module.css`)** cho nền alert nhạt (`rgba(31, 139, 76, 0.08)`, `rgba(208, 2, 27, 0.08)`, `rgba(230, 126, 34, 0.08)`), thanh timeline, và hiệu ứng hover phức tạp.
4. **Dùng chung component & helper sẵn có:** `Button`, `Input`, `Select`, `Checkbox`, `Radio`, `Badge`, `Modal`, `Pagination`, `SectionHeader`, `Breadcrumb`, `formatCurrencyVND`, `extractErrorMessage`, `cn`.

### 6.2. Quy chuẩn Giải thích & Chú thích Mã nguồn (Bắt buộc bằng Tiếng Việt)
Nhằm giúp sinh viên đọc hiểu và bảo trì hệ thống dễ dàng, toàn bộ code viết mới phải tuân thủ 3 quy tắc chú thích sau:
1. **100% chú thích bằng Tiếng Việt rõ ràng, mạch lạc.**
2. **Đầu mỗi module / component / hàm (JSDoc `/** ... */`):** Bắt buộc nêu rõ 3 phần:
   - **Chức năng:** Module/hàm này làm nhiệm vụ gì trong quy trình Trả hàng & Hoàn tiền.
   - **Đầu vào (`@param`):** Từng tham số/prop nhận vào là gì, kiểu dữ liệu hoặc ràng buộc cần lưu ý.
   - **Đầu ra (`@returns`):** Hàm trả về dữ liệu hoặc giao diện gì.
   ```ts
   /**
    * Chức năng: Chuẩn hóa payload tạo phiếu trả hàng trước khi gửi lên Backend,
    * tự động loại bỏ các trường ngân hàng rỗng để tránh lỗi @Pattern và @JsonAnySetter.
    *
    * @param formState Đầu vào: Dữ liệu thô người dùng đang nhập trên form C2.
    * @returns Đầu ra: Object JSON sạch chỉ chứa đúng các trường được Backend cho phép.
    */
   export function buildCreateReturnPayload(formState: ReturnCreateFormValues): ReturnRequestCreationPayload { ... }
   ```
3. **Các dòng xử lý logic cốt lõi (Inline comment `// ...`):** Bắt buộc giải thích **tại sao** lại viết như vậy (không chỉ dịch lại cú pháp code), ví dụ:
   - Tại sao phải bỏ qua `accountNumber` nếu chuỗi rỗng (`// Bỏ trường nếu rỗng vì @Pattern ở Backend từ chối chuỗi ""`).
   - Tại sao phải bọc phần `"request"` vào `Blob` kiểu `application/json` khi gửi `FormData` (`// Spring @RequestPart("request") yêu cầu từng part JSON có Content-Type application/json riêng`).
   - Tại sao ẩn nút Hủy khi `handedOverAt !== null` (`// Khóa quyền tự hủy vì kiện hàng đã bàn giao đơn vị vận chuyển`).
   - Tại sao chuyển đổi `page - 1` giữa `Pagination.tsx` và API Spring Data (`// UI Pagination đếm từ 1, còn Spring Pageable đếm từ 0`).

### 6.3. Bộ lệnh kiểm tra chất lượng sau khi hoàn thành mỗi Sprint
   ```powershell
   npx.cmd tsc -p tsconfig.app.json --noEmit
   npm.cmd run build
   npm.cmd run lint
   Select-String -Path (Get-ChildItem -Path 'src' -Recurse -Include *.ts,*.tsx,*.css -Exclude 'tokens.css').FullName -Pattern '#[0-9a-fA-F]{3,8}'
   Select-String -Path (Get-ChildItem -Path 'src' -Recurse -Include *.ts,*.tsx).FullName -Pattern 'style=\{\{|(bg|text|border|ring|from|to|via)-(red|blue|green|yellow|amber|emerald|slate|gray|zinc|neutral|stone|orange|purple|pink|indigo|teal|cyan)-|(bg|text|border)-(white|black)(/|\b)'
   ```

---

## 7. LỘ TRÌNH TRIỂN KHAI THEO SPRINT

1. **Bước chuẩn bị (Foundation):** Cập nhật `src/.env` (`8081`), tạo `src/types/order.ts`, `src/types/return.ts`, `src/constants/returnMeta.ts`, `src/services/orderService.ts`, `src/services/returnService.ts`, `src/services/returnAdminService.ts`.
2. **Sprint 1 — Khách hàng (C1–C5):**
   - `ReturnStatusBadge`, `ReturnTimeline`, `ReturnImageUploader`, `ReturnImageGallery`, `ReturnActionModals`.
   - `CustomerOrdersTab` (C1), `CustomerReturnsTab` (C3), `ReturnCreatePage` (C2), `ReturnDetailPage` (C4).
   - Cập nhật `ProfilePage.tsx`, `Header.tsx`, `App.tsx`.
3. **Sprint 2 — Quản trị / Kho / Kế toán (A1–A4):**
   - `AdminReturnSubNav`, `AdminActionModals`, `AdminInspectRestockModals`.
   - `AdminReturnsPage` (A1), `AdminReturnDetailPage` (A2), `AdminDormantReviewsPage` (A3), `AdminReturnHolidaysPage` (A4).
   - Cập nhật `Header.tsx`, `App.tsx`.
4. **Giai đoạn sau (Deferred):** Tích hợp Chuông thông báo Realtime **S1** (`@stomp/stompjs` + REST `/api/v1/notifications`) sau khi Backend tách/lọc xong 4 event nội bộ tại `RealtimeEventListener.java`.
