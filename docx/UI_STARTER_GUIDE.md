# Hướng dẫn dùng bộ UI React

Quy chuẩn giao diện: [UI_DESIGN_SYSTEM.md](UI_DESIGN_SYSTEM.md).

Repo hiện tại là backend Spring Boot/Maven, chưa có ứng dụng React, `package.json`
hoặc entry point frontend. Các file mới là bộ component JSX để nhóm đưa vào ứng
dụng React đang phát triển. Không chạy bằng `mvn spring-boot:run`.

## 1. Tích hợp vào ứng dụng React

Yêu cầu React và React DOM phiên bản 18 trở lên, công cụ build hỗ trợ JSX/CSS
(ví dụ dự án Vite React có sẵn), trình duyệt hiện đại hỗ trợ `<dialog>.showModal()`.
Không cần thư viện UI, icon hoặc router bổ sung.

Chép các thư mục sau sang `src` của ứng dụng React:

```text
src/styles/          # tokens.css + global.css
src/components/ui/   # Component + ui.css + index.js
src/utils/           # formatCurrencyVND.js
src/examples/        # Demo tùy chọn
```

Để chạy demo, chép thêm `public/images/demo-shirt.svg` vào `public/images` của
ứng dụng React. Ảnh minh họa cục bộ này có thể thay bằng ảnh sản phẩm thật.

Import CSS một lần trong `main.jsx` hoặc `index.jsx`:

```jsx
import './styles/global.css'; // Tự import tokens.css trước các style khác
import UIShowcase from './examples/UIShowcase';

// Trong entry point React hiện có:
// createRoot(document.getElementById('root')).render(<UIShowcase />);
```

Trong trang cần dùng:

```jsx
import { Button, Input, Modal, ProductCard } from './components/ui';
```

`index.js` tự import `ui.css`. Nếu import trực tiếp từng file component, cần thêm
`import './components/ui/ui.css'` tại entry point. Mọi kích thước và màu sắc tĩnh
được khai báo ở `tokens.css`; màu biến thể sản phẩm là dữ liệu động truyền qua
CSS variable `--swatch-color`. Font Montserrat tải từ Google Fonts, có font hệ
thống dự phòng nếu mất mạng; nhóm có thể tự host font khi triển khai.

## 2. API component

| Component | Props chính | Cách dùng |
| --- | --- | --- |
| `Button` | `variant`: `primary`, `secondary`, `ghost`; `size`: `default`, `large`; `loading`, `disabled` | Mặc định `type="button"`; đặt `type="submit"` khi gửi form. Hỗ trợ ref và props button gốc. |
| `Input` | `label`, `error`, `hint`, `multiline` và props input gốc | Có label, thông báo lỗi và liên kết ARIA tự động; `multiline` render textarea. |
| `Select` | `label`, `error`, `options: [{value, label, disabled}]` | Nhận `value`, `onChange` như select gốc; có thể truyền các option qua children. |
| `Badge` | `variant`: `new`, `sale`, `best-seller`, `vip` | Nội dung nhãn qua children. |
| `Modal` | `open`, `onClose`, `title`, `size`: `default`, `wide` | Cha quản lý open; có Escape, click backdrop, focus trap, khôi phục focus và khóa cuộn body. Mẫu dùng một modal tại một thời điểm. |
| `ProductCard` | `product`, `selectedColor`, `onColorChange`, `onQuickAdd`, `LinkComponent` | Bấm mua nhanh gọi `onQuickAdd(product, selectedColor)`; khi thiếu callback sẽ không hiện nút. |
| `ColorSwatches` | `options: [{value, label, color, image?, disabled?}]`, `value`, `onChange`, `large`, `disabled` | Giá trị màu do dữ liệu sản phẩm cung cấp; `onChange(value)`. |
| `SizeSelector` | `options: [{value, label, disabled?}]`, `value`, `onChange`, `disabled` | Cha tính `disabled` dựa trên tồn kho từng cặp màu/size. |
| `QuantityStepper` | `value`, `onChange`, `min=1`, `max=99`, `disabled`, `name` | Chỉ nhận số nguyên trong khoảng min/max; truyền max theo tồn kho. Giữ value hợp lệ và min ≤ max. |
| `Pagination` | `page`, `totalPages`, `onPageChange`, `disabled` | Trang bắt đầu từ 1; render trang đầu/cuối và trang lân cận. Cha tải dữ liệu, cuộn tới danh sách. |
| `SectionHeader` | `title`, `action`, `centered` | Tiêu đề phân khu; action nhận React node. |

Các thành phần có trạng thái phải lưu ở trang cha bằng `useState`; xem
`src/examples/UIShowcase.jsx` để có mẫu đầy đủ. Nút demo “Thêm vào giỏ” và bộ sắp
xếp chỉ minh họa giao diện; nhóm gắn hành động và API theo trang nghiệp vụ.

## 3. Dữ liệu ProductCard

```jsx
const product = {
  id: 'shirt-01',
  name: 'Áo sơ mi Oxford',
  href: '/san-pham/shirt-01',
  image: '/images/demo-shirt.svg',
  price: 450000,
  originalPrice: 600000,
  soldOut: false,
  badges: [{ variant: 'sale', label: '-25%' }],
  colors: [{ value: 'black', label: 'Đen', color: 'var(--color-primary)', image: '/images/demo-shirt.svg' }],
};
```

Giá là số VND, không truyền chuỗi đã định dạng. Dùng chung
`formatCurrencyVND(price)` trong `src/utils/formatCurrencyVND.js`. Giá gốc chỉ
hiện khi lớn hơn giá bán. Cha giữ màu đang chọn và truyền lại `selectedColor`
để card đổi ảnh theo trường `image` của màu.

Nếu ứng dụng đã dùng React Router:

```jsx
import { Link } from 'react-router-dom';
<ProductCard product={product} LinkComponent={Link} />
```

Mặc định card dùng thẻ `a`. Nút mua nhanh và bộ chọn màu nằm ngoài link để tránh
lồng phần tử tương tác. Không đưa thông tin tồn kho hoặc giá demo vào thanh toán;
backend cần xác nhận giá và tồn kho khi thực hiện nghiệp vụ.

## 4. Phạm vi bộ khung

Theo yêu cầu, tất cả 11 component được đặt trong `src/components/ui`, kể cả
ProductCard và các bộ chọn sản phẩm. Tài liệu gốc đề xuất tách `product/` và
`layout/`; có thể tách sau và giữ export cũ khi nhóm mở rộng. Header, MegaMenu,
Drawer, Footer và các trang nghiệp vụ trong bảng 26 thành phần chưa được triển
khai trong bộ khung này.

Tài liệu nguồn được giữ đầy đủ và chỉ sửa URL import font bị bọc cú pháp Markdown.
Các token bổ sung nằm cuối `tokens.css`, lấy từ bảng Component Specs để tránh
đặt kích thước trực tiếp trong từng component.

Trước khi ghép vào trang thật, kiểm tra Tab/Shift+Tab, Escape, click backdrop,
focus sau khi đóng modal, nút disabled/loading, lỗi form, số lượng min/max,
chọn màu đổi ảnh và chuyển trang. Chỉ mở một modal tại một thời điểm trong mẫu này.
