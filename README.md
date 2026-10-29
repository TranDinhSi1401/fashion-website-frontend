# 🛍️ Fashion Website Frontend

Dự án Frontend cho nền tảng thương mại điện tử bán thời trang/quần áo, được xây dựng bằng **React**, **TypeScript** và **Vite**, kết nối RESTful API với **Spring Boot** Backend.

---

## 🛠️ 1. Công nghệ sử dụng

| Công nghệ / Thư viện | Phiên bản | Mục đích sử dụng |
| :--- | :--- | :--- |
| **React** | ^18.x / ^19.x | Thư viện xây dựng giao diện người dùng (UI) |
| **TypeScript** | ^5.x | Ngôn ngữ lập trình có kiểu dữ liệu tĩnh (Static Typing) |
| **Vite** | ^5.x / ^6.x | Build tool & Dev Server tốc độ cao |
| **React Router DOM** | ^6.x | Định tuyến trang (Routing) |
| **Axios** | ^1.x | Client HTTP gọi REST API tới Spring Boot Backend |
| **Tailwind CSS** | ^3.x / ^4.x | Utility-first CSS framework thiết kế giao diện |
| **Zustand** / **Redux Toolkit** | Latest | Quản lý State toàn cục (Giỏ hàng, Auth, User) |
| **TanStack Query (React Query)**| ^5.x | Quản lý Async State, Caching API và Auto-refetch |
| **Lucide React** | Latest | Bộ Icon giao diện |

---

## 📁 2. Cấu trúc dự án (Feature-based Architecture)

Dự án được tổ chức theo kiến trúc **Feature-based**, giúp đóng gói logic theo từng module nghiệp vụ:

```text
src/
├── app/                    # Cấu hình cấp ứng dụng (Providers, Store, Routes)
│   ├── routes/             # Cấu hình React Router (AppRoutes, ProtectedRoute)
│   └── store/              # Global state management (Zustand/Redux)
│
├── assets/                 # Tài nguyên tĩnh (Hình ảnh, Logo, Icons, Fonts)
│
├── components/             # Reusable UI Components (Dùng chung cho toàn ứng dụng)
│   ├── ui/                 # Component nền tảng (Button, Input, Modal, Badge, Spinner)
│   ├── form/               # Form fields bọc sẵn validation
│   └── layout/             # Component khung trang (Header, Footer, Sidebar, Navbar)
│
├── features/               # Module hóa theo từng nghiệp vụ kinh doanh
│   ├── auth/               # Đăng nhập, Đăng ký, Quên mật khẩu
│   ├── products/           # Danh sách sản phẩm, Lọc/Tìm kiếm, Chi tiết sản phẩm
│   ├── cart/               # Quản lý giỏ hàng
│   ├── checkout/           # Thanh toán, Tính phí vận chuyển (GHN), VietQR/MoMo
│   └── user-profile/       # Thông tin cá nhân, Lịch sử đơn hàng
│
├── services/               # Cấu hình API Client & Interceptors
│   ├── api/                # Axios instance root & interceptors chèn JWT Token
│   └── storage/            # Quản lý LocalStorage/Cookies (Tokens)
│
├── hooks/                  # Custom Hooks toàn cục (useDebounce, useLocalStorage,...)
├── types/                  # TypeScript interfaces/types toàn cục (ApiResponse, PageResponse)
├── utils/                  # Utility functions (formatCurrency, formatDate, validateRules)
└── constants/              # Hằng số hệ thống (API endpoints, OrderStatus, Roles)
```

---

## 🏷️ 3. Quy tắc đặt tên (Naming Conventions)

Để duy trì mã nguồn nhất quán và dễ đọc, dự án tuân thủ chặt chẽ các quy tắc sau:

### Tên File & Thư mục
* **React Component Files:** Dùng **PascalCase**  
  *Ví dụ:* `ProductCard.tsx`, `Header.tsx`, `LoginForm.tsx`
* **Custom Hooks:** Dùng **camelCase** bắt đầu bằng từ `use`  
  *Ví dụ:* `useAuth.ts`, `useCart.ts`, `useProductFilter.ts`
* **Utility Files / Services / APIs:** Dùng **camelCase**  
  *Ví dụ:* `axiosClient.ts`, `formatCurrency.ts`, `productApi.ts`
* **Style Files / CSS Modules:** Dùng **kebab-case**  
  *Ví dụ:* `product-card.module.css`

### Code Conventions (TypeScript / JavaScript)
* **Variables & Functions:** Dùng **camelCase** (`productList`, `calculateTotal()`)
* **Components & Interfaces / Types:** Dùng **PascalCase** (`Product`, `ApiResponse<T>`, `CartItem`)
* **Constants:** Dùng **UPPER_SNAKE_CASE** (`API_BASE_URL`, `MAX_FILE_SIZE`)

---

## 🚀 4. Hướng dẫn chạy dự án

### Yêu cầu

- **Node.js:** phiên bản `20.19+` hoặc `22.12+`
- **npm:** được cài kèm với Node.js

### Cài đặt và chạy ở môi trường phát triển

Mở terminal tại thư mục gốc của dự án, sau đó chạy:

```bash
npm ci
npm run dev
```

Vite sẽ hiển thị địa chỉ truy cập trong terminal (thường là `http://localhost:5173`). Mở địa chỉ đó bằng trình duyệt để xem ứng dụng. Nhấn `Ctrl+C` trong terminal để dừng máy chủ.

### Cấu hình Backend API

Mặc định, ứng dụng gọi API tại `http://localhost:8080/api/v1`. Để sử dụng địa chỉ khác, tạo file `.env.local` ở thư mục gốc dự án và khai báo:

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

Thay giá trị trên bằng URL API của môi trường bạn muốn kết nối. Khởi động lại máy chủ phát triển sau khi thay đổi biến môi trường.

### Các lệnh thường dùng

```bash
npm run dev      # Chạy máy chủ phát triển
npm run lint     # Kiểm tra mã nguồn bằng Oxlint
npm run build    # Kiểm tra TypeScript và tạo bản build production trong dist/
npm run preview  # Xem thử bản build production (chạy npm run build trước)
```
