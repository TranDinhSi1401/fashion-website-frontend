# 🛍️ Fashion Website Frontend (React 19 + TypeScript + Vite)

Dự án Frontend cho nền tảng thương mại điện tử thời trang nam cao cấp **FASHION WEBSITE**, được xây dựng bằng **React 19**, **TypeScript**, **Vite** và kết nối trực tiếp với **Spring Boot** RESTful API (Backend).

---

## 🚀 1. Hướng Dẫn Bắt Đầu Nhanh (Quickstart cho Thành viên mới)

### Yêu cầu môi trường
* **Node.js**: Phiên bản **>= 18.x** (khuyên dùng Node.js 20 LTS).
* **Git** & trình duyệt web hiện đại.

### Các bước cài đặt:
1. **Clone repository**:
   ```bash
   git clone <URL_REPO_FRONTEND>
   cd fashion-website-frontend
   ```

2. **Cài đặt thư viện**:
   ```bash
   npm install
   ```

3. **Cấu hình môi trường (`.env`)**:
   Tạo file `.env` tại thư mục gốc của dự án:
   ```env
   # Base URL của Backend Spring Boot
   VITE_API_BASE_URL=http://localhost:8080/api/v1

   # Google Client ID (dùng cho nút Đăng nhập Google)
   VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

   # Tên ứng dụng
   VITE_APP_NAME=FASHION WEBSITE
   ```

4. **Khởi chạy ứng dụng**:
   ```bash
   npm run dev
   ```
   Truy cập trên trình duyệt: `http://localhost:5173`

5. **Kiểm tra lỗi & Build**:
   ```bash
   npm run build
   ```

> 📖 **Tài liệu hướng dẫn chi tiết từng bước cho nhóm**: Xem tại [docs/HUONG_DAN_CHO_NHOM_FRONTEND.md](file:///e:/fashion-website-frontend/docs/HUONG_DAN_CHO_NHOM_FRONTEND.md).

---

## 🛠️ 2. Công Nghệ Sử Dụng

| Công nghệ | Phiên bản | Mô tả |
| :--- | :---: | :--- |
| **React** | ^19.x | Thư viện UI hiện đại |
| **TypeScript** | ^7.x / 5.x | Kiểm soát kiểu tĩnh, loại bỏ lỗi runtime |
| **Vite** | ^8.x | Dev Server và Bundler tốc độ cao |
| **React Router** | ^7.x | Quản lý định tuyến trang (Routing) |
| **Axios** | ^1.x | Gọi API với Refresh Token Rotation tự động |
| **Lucide React** | ^1.x | Hệ thống icon tối giản chuẩn thiết kế |
| **@react-oauth/google** | ^0.13.x | Đăng nhập Google một chạm |

---

## 📁 3. Cấu Trúc Mã Nguồn (`src/`)

```
src/
├── components/              # Các UI Component dùng chung
│   ├── common/              # ProtectedRoute, LoadingSpinner...
│   ├── layout/              # Topbar, Header, Footer
│   ├── product/             # ProductCard, ProductGallery...
│   └── ui/                  # Button, Input, Modal, Badge...
├── context/                 # Quản lý trạng thái toàn cục
│   └── AuthContext.tsx      # Quản lý đăng nhập, Token, Role (ADMIN/STAFF/CUSTOMER)
├── pages/                   # Các màn hình chính
│   ├── HomePage.tsx         # Trang chủ (Hero banner slider, BST mới, Cam kết, Story)
│   ├── ProductsPage.tsx     # Trang danh mục (Bộ lọc bên trái, capsule tags, lưới SP)
│   ├── ProductDetailPage.tsx# Chi tiết sản phẩm, đổi ảnh thumbnail, chọn size
│   ├── LoginPage.tsx        # Màn hình đăng nhập (Form + Google Login)
│   ├── RegisterPage.tsx     # Đăng ký tài khoản
│   ├── ForgotPasswordPage.tsx # Quên mật khẩu (Gửi email + Đặt lại mật khẩu)
│   ├── ProfilePage.tsx      # Thông tin cá nhân & Sổ địa chỉ nhận hàng
│   ├── AdminProductsPage.tsx# Quản lý sản phẩm (ADMIN/STAFF)
│   └── AdminUsersPage.tsx   # Quản lý người dùng (ADMIN)
├── services/                # Tầng kết nối API Backend
│   ├── apiClient.ts         # Axios instance, chèn JWT Token, Auto Refresh Token Rotation
│   ├── authService.ts       # API Auth (/auth/login, /auth/google, /auth/refresh...)
│   ├── userService.ts       # API Người dùng & Sổ địa chỉ (/users/...)
│   └── productService.ts    # API Sản phẩm (/products/...)
├── styles/                  # Định nghĩa CSS & Theme
│   ├── tokens.css           # Biến màu (Đen, Trắng, Vàng Gold #C5A059), Font Montserrat
│   └── global.css           # Reset CSS, Container, Helper styles
├── types/                   # Định nghĩa Interface TypeScript (Product, User, Auth, Api)
├── utils/                   # Hàm tiện ích (formatCurrency, extractProductImage, storage)
├── App.tsx                  # Khai báo Routes toàn ứng dụng
└── main.tsx                 # Điểm khởi động ứng dụng React
```

---

## 🔐 4. Cơ Chế Xác Thực & Phân Quyền (Auth Flow)

1. **Lưu trữ Token**: Token được quản lý qua `src/utils/storage.ts` (`fashion_access_token`, `fashion_refresh_token`).
2. **Refresh Token Rotation tự động**:
   - Trong `src/services/apiClient.ts`, khi bất kỳ request nào trả về `401 Unauthorized`, interceptor sẽ tự động giữ lại request, gọi `POST /auth/refresh` để lấy cặp Token mới, lưu đè vào storage và thử lại request ban đầu.
3. **Phân quyền Route**:
   - Sử dụng `<ProtectedRoute requiredRoles={['ADMIN', 'STAFF']}>` trong `App.tsx` để bảo vệ các trang quản trị.

---

## 🎨 5. Quy Chuẩn Giao Diện (Design System)

Luồng bộ lọc và cách kiểm tra: [docs/CATALOG_FILTERS.md](docs/CATALOG_FILTERS.md).
Luồng chi tiết sản phẩm và giỏ hàng: [docs/PRODUCT_CART_FLOW.md](docs/PRODUCT_CART_FLOW.md).

* **Phong cách**: Minimalist Luxury Fashion (Thời trang cao cấp tối giản, sắc nét).
* **Màu chủ đạo**:
  - Đen (`#000000`, `#111111`) & Trắng (`#FFFFFF`).
  - Màu nhấn (Accent Gold): `#C5A059`.
  - Màu cảnh báo / Sale: `#D0021B`.
* **Ảnh sản phẩm**: Luôn lấy từ dữ liệu thực qua `extractProductImage(product)` hoặc `product.productImages`. Không chèn ảnh tĩnh không rõ nguồn gốc.
* **Tiền tệ**: Luôn format bằng hàm `formatCurrency(amount)` (VD: `450.000 ₫`).

---

## 👥 6. Quy Trình Phối Hợp Trong Nhóm (Git Workflow)

1. Tạo nhánh mới từ `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/<ten-tinh-nang>
   ```
2. Viết mã nguồn & kiểm tra build trước khi commit:
   ```bash
   npm run build
   ```
3. Commit và đẩy lên GitHub:
   ```bash
   git add .
   git commit -m "feat: <mô tả tính năng ngắn gọn>"
   git push origin feature/<ten-tinh-nang>
   ```
4. Tạo **Pull Request** trên GitHub để trưởng nhóm review.
