# HƯỚNG DẪN DÀNH CHO THÀNH VIÊN NHÓM PHÁT TRIỂN FRONTEND
**Dự án**: FASHION WEBSITE FRONTEND  
**Công nghệ**: React 19 + TypeScript + Vite + Axios + React Router v7  
**Design Concept**: Minimalist Luxury Fashion (Gam màu Đen - Trắng - Vàng Gold)

---

## 1. TỔNG QUAN DỰ ÁN & CÔNG NGHỆ SỬ DỤNG

| Công nghệ / Thư viện | Phiên bản | Mục đích sử dụng |
| :--- | :---: | :--- |
| **React** | 19.x | Thư viện UI hiện đại |
| **TypeScript** | 7.x / 5.x | Kiểm soát kiểu dữ liệu nghiêm ngặt, chống lỗi runtime |
| **Vite** | 8.x | Bundler siêu tốc, Hot Module Replacement (HMR) cực nhanh |
| **Axios** | 1.x | Gọi API, cấu hình Interceptor tự động Refresh Token |
| **React Router** | 7.x | Định tuyến trang (Single Page Application) |
| **Lucide React** | 1.x | Hệ thống icon tối giản, sắc nét |
| **@react-oauth/google** | 0.13.x | Đăng nhập bằng tài khoản Google (OAuth2/OIDC) |

---

## 2. HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN (DÀNH CHO NGƯỜI MỚI)

### Bước 1: Yêu cầu môi trường máy tính
- Cài đặt **Node.js**: Phiên bản **>= 18.x** (khuyến nghị Node 20 LTS). Kiểm tra bằng lệnh:
  ```bash
  node -v
  npm -v
  ```
- Cài đặt **Git** và trình soạn thảo mã nguồn **VS Code** (khuyên dùng các extension: *ESLint*, *Prettier*, *TypeScript React*).

### Bước 2: Clone repository & Cài đặt gói thư viện
Mở Terminal tại thư mục muốn lưu dự án:
```bash
git clone <URL_REPO_FRONTEND>
cd fashion-website-frontend
npm install
```

### Bước 3: Cấu hình biến môi trường (`.env`)
Tạo file `.env` tại thư mục gốc của dự án (ngang hàng với `package.json`):
```env
# URL của Backend Spring Boot
VITE_API_BASE_URL=http://localhost:8080/api/v1

# Client ID đăng nhập Google (Lấy từ Google Cloud Console)
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Tên ứng dụng hiển thị
VITE_APP_NAME=FASHION WEBSITE
```

### Bước 4: Khởi chạy dự án ở chế độ lập trình (Dev Mode)
```bash
npm run dev
```
Mở trình duyệt truy cập: `http://localhost:5173`.

### Bước 5: Kiểm tra lỗi TypeScript & Build sản phẩm
**Bắt buộc chạy trước khi commit code lên Git:**
```bash
npm run build
```
Nếu lệnh này báo lỗi TypeScript hoặc lỗi cú pháp, thành viên phải sửa sạch lỗi trước khi đẩy code lên repository.

---

## 3. CẤU TRÚC THƯ MỤC DỰ ÁN (`src/`)

```
src/
├── assets/                  # Ảnh tĩnh, icon nội bộ
├── components/              # Các UI Component tái sử dụng
│   ├── common/              # ProtectedRoute, LoadingSpinner...
│   ├── layout/              # Topbar, Header, Footer
│   ├── product/             # ProductCard, ProductGallery...
│   └── ui/                  # Button, Input, Modal, Badge...
├── context/                 # Quản lý State toàn cục
│   └── AuthContext.tsx      # Quản lý đăng nhập, Token, Role (ADMIN/STAFF/CUSTOMER)
├── pages/                   # Các màn hình chính (Tương ứng với URL)
│   ├── HomePage.tsx         # Trang chủ (Hero slider, BST mới, cam kết, câu chuyện)
│   ├── ProductsPage.tsx     # Danh mục sản phẩm (Bộ lọc, danh mục động, lưới sản phẩm)
│   ├── ProductDetailPage.tsx# Chi tiết sản phẩm, chọn size/màu, thêm vào giỏ
│   ├── LoginPage.tsx        # Trang đăng nhập (Username/Pass & Google OAuth)
│   ├── RegisterPage.tsx     # Trang đăng ký tài khoản mới
│   ├── ForgotPasswordPage.tsx # Quên mật khẩu (2 bước: gửi mail & nhập pass tạm)
│   ├── ProfilePage.tsx      # Thông tin cá nhân & Sổ địa chỉ giao hàng
│   ├── AdminProductsPage.tsx# Quản lý thêm/sửa/xóa sản phẩm (Admin/Staff)
│   └── AdminUsersPage.tsx   # Quản lý danh sách người dùng (Admin)
├── services/                # Tầng gọi API Backend (Axios)
│   ├── apiClient.ts         # Cấu hình Axios Base URL, Refresh Token Rotation
│   ├── authService.ts       # API Login, Register, Google, Refresh, Logout
│   ├── userService.ts       # API Thông tin user, Đổi mật khẩu, Sổ địa chỉ
│   └── productService.ts    # API Lấy/Thêm/Sửa/Xóa sản phẩm
├── styles/                  # Định nghĩa màu sắc, biến CSS tokens
│   ├── tokens.css           # Biến màu: đen, vàng gold, font chữ Montserrat
│   └── global.css           # Reset CSS, container, utility classes
├── types/                   # Định nghĩa TypeScript Types / Interfaces
│   ├── api.ts               # ApiResponse<T> chuẩn backend
│   ├── auth.ts              # LoginRequest, RegisterRequest, AuthResponse
│   ├── user.ts              # UserResponse, AddressRequest, AddressResponse
│   └── product.ts           # ProductResponse, ProductImage, ProductRequest
├── utils/                   # Các hàm bổ trợ
│   ├── format.ts            # Định dạng tiền tệ VND, trích xuất ảnh sản phẩm
│   └── storage.ts           # Lưu/Đọc Token an toàn từ localStorage
├── App.tsx                  # Khai báo Routes toàn hệ thống
└── main.tsx                 # Điểm khởi chạy của React App
```

---

## 4. QUY TRÌNH PHÁT TRIỂN TÍNH NĂNG MỚI (DEVELOPMENT WORKFLOW)

Khi được phân công làm 1 chức năng mới (Ví dụ: *Giỏ hàng*, *Đánh giá sản phẩm*, hay *Đơn hàng*), thành viên làm theo đúng 4 bước chuẩn sau:

### Bước 1: Định nghĩa Typescript Interface trong `src/types/`
Ví dụ tạo file `src/types/cart.ts`:
```typescript
export interface CartItem {
  id: number;
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  size: string;
  color: string;
  imageUrl: string;
}
```

### Bước 2: Viết Service gọi API trong `src/services/`
Sử dụng `apiClient` đã được cấu hình sẵn Token tự động:
```typescript
import apiClient from './apiClient';
import { ApiResponse } from '../types/api';
import { CartItem } from '../types/cart';

export const cartService = {
  async getCart(): Promise<ApiResponse<CartItem[]>> {
    const res = await apiClient.get<ApiResponse<CartItem[]>>('/cart');
    return res.data;
  },
  async addToCart(productId: number, quantity: number, size: string): Promise<ApiResponse<CartItem>> {
    const res = await apiClient.post<ApiResponse<CartItem>>('/cart', { productId, quantity, size });
    return res.data;
  }
};
```

### Bước 3: Viết Component / Page hiển thị
- Luôn hiển thị trạng thái **Loading** khi đang chờ API.
- Luôn có khối **Try / Catch** và hiển thị thông báo lỗi khi API thất bại.
- Định dạng tiền tệ bằng hàm có sẵn: `formatCurrency(price)` từ `src/utils/format.ts`.

### Bước 4: Đăng ký Route trong `src/App.tsx`
Nếu là trang công khai:
```tsx
<Route path="/cart" element={<CartPage />} />
```
Nếu là trang yêu cầu người dùng phải đăng nhập:
```tsx
<Route path="/cart" element={
  <ProtectedRoute>
    <CartPage />
  </ProtectedRoute>
} />
```

---

## 5. CÁC QUY TẮC BẮT BUỘC (CODING CONVENTIONS)

1. **Không áp cứng (Hardcode) ảnh sản phẩm**:
   - Mọi ảnh sản phẩm phải lấy qua hàm `extractProductImage(product)` hoặc mảng `product.productImages`.
   - Backend trả về mảng ảnh có dạng:
     ```json
     "productImages": [
       { "id": 1, "imageUrl": "https://...", "isMain": true, "displayOrder": 1 }
     ]
     ```
2. **Quy chuẩn màu sắc & Bố cục**:
   - Sử dụng các biến màu có sẵn trong `tokens.css`:
     - Màu nền chính: Trắng `#FFFFFF` hoặc Dark `#111111`
     - Màu điểm nhấn vàng kim: `var(--color-accent-gold)` (`#C5A059`)
     - Màu chữ chính: `#111111`, màu phụ: `#666666`
     - Bán kính góc: Tối giản sắc nét (bo góc `0px` - `2px`, không bo tròn quá mức)
3. **Định dạng tiền tệ**:
   - Không tự viết `100.000 đ`. Luôn import `formatCurrency` từ `src/utils/format.ts`.
4. **Không lưu Token trực tiếp một cách tùy tiện**:
   - Dùng `storage.setTokens({ token, refreshToken })` và `useAuth()` để lấy thông tin đăng nhập của người dùng.

---

## 6. PHÂN CHIA NHIỆM VỤ GỢI Ý CHO CÁC THÀNH VIÊN TRONG NHÓM

| Thành viên | Trách nhiệm chính | Các trang & tính năng phụ trách |
| :--- | :--- | :--- |
| **Thành viên A (Lead / Core)** | Kiến trúc & Xác thực (Auth) | Quản lý Token, Login, Register, Forgot Password, Profile & Sổ địa chỉ |
| **Thành viên B** | Trang chủ & Danh mục sản phẩm | `HomePage`, `ProductsPage`, Bộ lọc bên trái, Tìm kiếm sản phẩm |
| **Thành viên C** | Chi tiết sản phẩm & Tương tác | `ProductDetailPage`, Chọn Size/Màu, Đánh giá sản phẩm (Reviews), Gallery ảnh |
| **Thành viên D** | Giỏ hàng & Thanh toán (Checkout) | Giỏ hàng mini (Cart Drawer), Trang giỏ hàng, Trang thanh toán, chọn địa chỉ nhận hàng |
| **Thành viên E** | Quản trị Admin & Staff | `AdminProductsPage` (Thêm/Sửa/Xóa sản phẩm, Upload ảnh), Quản lý người dùng, Quản lý đơn hàng |

---

## 7. QUY TRÌNH LÀM VIỆC VỚI GIT (TEAM GIT FLOW)

1. **Kéo code mới nhất từ nhánh chính trước khi làm việc**:
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Tạo nhánh tính năng riêng**:
   ```bash
   git checkout -b feature/cart-page
   ```
3. **Sau khi hoàn thành, kiểm tra build**:
   ```bash
   npm run build
   ```
4. **Commit và đẩy lên remote**:
   ```bash
   git add .
   git commit -m "feat: implement shopping cart page"
   git push origin feature/cart-page
   ```
5. **Tạo Pull Request (PR)** trên GitHub để trưởng nhóm duyệt vào `main`.

