# Hướng Dẫn Áp Dụng Bộ Quy Tắc Thiết Kế Giao Diện (Dành Cho Lập Trình Viên)

Tài liệu này hướng dẫn lập trình viên cách xây dựng trang và component mới trong dự án `fashion-website-frontend` tuân thủ đúng bộ quy tắc tại [Bộ quy tắt thiết kế giao diện.md](./Bộ%20quy%20tắt%20thiết%20kế%20giao%20diện.md).

---

## 1. Kiến trúc Styling của dự án

Hệ thống giao diện được tổ chức theo **3 lớp**, lấy `tokens.css` làm nguồn chân lý duy nhất (*Single Source of Truth*):

1. **Design Tokens** — `src/styles/tokens.css`: Khai báo toàn bộ biến CSS `:root` (màu sắc, font chữ, cỡ chữ, bo góc, chiều cao chuẩn, đổ bóng, transition).
2. **Tailwind Theme + Global Base** — `tailwind.config.ts` & `src/styles/global.css`: Ánh xạ biến CSS sang utility class của Tailwind, thiết lập `html { font-size: 16px; }`, class `.container` (`max-width: 1320px`) và các `@keyframes`.
3. **Thư viện UI dùng chung** — `src/components/ui/`: Gồm các component chuẩn hóa đi kèm CSS Modules (`*.module.css`), ghép class bằng `cn()` từ `src/utils/cn.ts` và types từ `src/types/ui.ts`.

---

## 2. Quy tắc bắt buộc khi viết code UI

1. **Không hardcode mã màu HEX (`#...`) ngoài `src/styles/tokens.css`:**
   - Trong `.tsx`: dùng class Tailwind đã map (ví dụ `bg-primary`, `text-content-primary`, `border-line-light`).
   - Trong `*.module.css`: dùng `var(--...)` (hoặc `rgba(...)` / `rgb(...)` cho các nền bán trong suốt, gradient).
2. **Không dùng class màu mặc định của Tailwind:**
   - Cấm `bg-red-500`, `text-gray-600`, `text-white`, `bg-black`, `border-slate-200`, v.v.
3. **Không dùng opacity modifier (`/10`, `/50`, `/80`) lên màu CSS variable của Tailwind:**
   - Do `tokens.css` định nghĩa biến màu ở dạng HEX (ví dụ `--color-primary: #111111`), các class như `bg-primary/10` hay `text-content-inverse/70` **không hợp lệ** trong Tailwind CSS v3.
   - Khi cần màu trong suốt hoặc gradient, hãy đặt vào `*.module.css` bằng `rgba(...)`.
4. **Không lạm dụng inline `style={{ ... }}`:**
   - Mọi màu sắc, spacing, viền, font-size, hover/focus phải viết bằng Tailwind hoặc `*.module.css`.
   - Chỉ cho phép `style={{ ... }}` đối với **giá trị động tính ở runtime** (ví dụ: `style={{ width: `${percent}%` }}`, `style={{ backgroundImage: `url(${slide.image})` }}`, hoặc `style={{ '--swatch-color': hex }}`).
5. **Tuân thủ tỷ lệ ảnh & typography thương hiệu:**
   - Khung ảnh sản phẩm dùng `aspect-[3/4]`, `object-cover`, `loading="lazy"`.
   - Tiêu đề phân khu và nút chính áp dụng `uppercase` kèm `tracking-wide` / `tracking-wider`.
   - Tiền tệ VNĐ luôn import `formatCurrencyVND` từ `src/utils/format.ts`.

---

## 3. Bảng tra cứu nhanh Token → Tailwind Class

| Nhóm | Token trong `tokens.css` | Class Tailwind tương ứng | Ghi chú sử dụng |
| --- | --- | --- | --- |
| **Chính (Primary)** | `--color-primary`, `--color-primary-hover`, `--color-primary-active` | `bg-primary`, `text-primary`, `border-primary`, `hover:bg-primary-hover` | Đen Carbon `#111111` |
| **Điểm nhấn (Accent)** | `--color-accent-red`, `--color-accent-gold` | `bg-accent-red`, `text-accent-red`, `text-accent-gold`, `border-accent-gold` | Giá giảm / Nhãn Sale / Hạng VIP & AI |
| **Nền (Surface)** | `--bg-body`, `--bg-surface`, `--bg-elevated`, `--bg-dark`, `--bg-disabled` | `bg-surface-body`, `bg-surface`, `bg-surface-elevated`, `bg-surface-dark`, `bg-surface-disabled` | Không có `bg-page` — dùng `bg-surface-body` |
| **Chữ (Content)** | `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse`, `--text-disabled` | `text-content-primary`, `text-content-secondary`, `text-content-muted`, `text-content-inverse`, `text-content-disabled` | Chữ trên nền tối dùng `text-content-inverse` |
| **Viền (Line)** | `--border-light`, `--border-default`, `--border-focus`, `--border-error` | `border-line-light`, `border-line`, `focus:border-line-focus`, `border-line-error` | Chia hàng dùng `border-line-light` |
| **Trạng thái (Status)** | `--status-success`, `--status-warning`, `--status-error` | `text-status-success`, `text-status-warning`, `text-status-error`, `border-status-error` | Nền alert nhạt viết bằng `rgba(...)` trong `.module.css` |
| **Cỡ chữ** | `--fs-xs` .. `--fs-2xl` | `text-xs` (`12px`), `text-sm` (`13px`), `text-base` (`14px`), `text-md` (`16px`), `text-lg` (`20px`), `text-xl` (`24px`), `text-2xl` (`32px`) | `1rem = 16px` |
| **Bo góc** | `--radius-none` .. `--radius-full` | `rounded-none`, `rounded-sm` (`2px`), `rounded-btn` (`0px`), `rounded-input` (`0px`), `rounded-card` (`0px`), `rounded-modal` (`4px`), `rounded-full` | Nút, input, card đều vuông sắc `0px` |
| **Đổ bóng** | `--shadow-header`, `--shadow-dropdown`, `--shadow-modal` | `shadow-header`, `shadow-dropdown`, `shadow-modal` | Không dùng `shadow-card` |
| **Kích thước & Khung** | `--container-max-width`, `--header-height`, `--btn-height`, `--input-height` | `.container`, `max-w-container`, `h-header`, `h-topbar`, `h-btn`, `h-btn-lg`, `h-input` | Luôn bọc nội dung trang trong `.container` |

---

## 4. Thư viện Component dùng chung (`src/components/ui`)

Luôn ưu tiên import từ barrel file `src/components/ui/index.ts` thay vì tự viết `<button>`, `<input>`, `<select>`, hay popup thủ công:

```tsx
import {
  Badge,
  Button,
  Checkbox,
  ColorSwatches,
  FilterSidebar,
  IconButton,
  Input,
  Modal,
  Pagination,
  ProductCard,
  QuantityStepper,
  Radio,
  SearchInput,
  SectionHeader,
  Select,
  SizeSelector,
} from '../components/ui';
```

### Danh sách & Props chính

- **`Button`**: `variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'`, `size?: 'sm' | 'md' | 'lg'`, `loading?: boolean`, `icon?: ElementType`.
- **`IconButton`**: Nút chỉ chứa icon (Header, đóng Drawer...), kích thước chuẩn vuông.
- **`Input`**: Hỗ trợ `forwardRef`, `label`, `error`, `helperText`, `icon`, `rightElement`, `multiline?: boolean` (kèm `rows` cho `<textarea>`).
- **`Select`**: Hỗ trợ `forwardRef`, `label`, `error`, `helperText`, `options?: SelectOption[]` hoặc `children`.
- **`Checkbox` / `Radio`**: Nhận `label?: string` và props chuẩn `<input>`.
- **`SearchInput`**: Ô tìm kiếm Header tích hợp `useDebounce`.
- **`Badge`**: `variant?: 'new' | 'sale' | 'best-seller' | 'vip' | 'default' | 'success' | 'error' | 'warning' | 'dark'`.
- **`SectionHeader`**: Tiêu đề phân khu `uppercase tracking-wider`, thanh gạch nhấn và slot `action`.
- **`Modal`**: Dùng thẻ `<dialog>` HTML5; `isOpen`, `onClose`, `title`, `size?: 'size-guide' | 'quick-view'`, `maxWidth?: string`.
- **`Pagination`**: `currentPage`, `totalPages`, `onPageChange`, tự động cuộn mượt lên đầu khi chuyển trang.
- **`ProductCard`**: Khung ảnh `aspect-[3/4]` tự động zoom khi hover và trượt nút **MUA NHANH**.
- **`ColorSwatches` / `SizeSelector` / `QuantityStepper`**: Bộ chọn biến thể & số lượng trong khoảng `[min, max]`.
- **`FilterSidebar`**: Nhận `groups: FilterGroup[]` hỗ trợ đóng/mở từng nhóm lọc.

### Layout dùng chung (`src/components/layout`)

- `Topbar`, `Header`, `MegaMenu`, `MiniCartDrawer`, `Footer` (đã gắn sẵn trong `App.tsx`).
- `Breadcrumb`: Dùng ở đầu các trang con (`items: BreadcrumbItem[]` gồm `{ label, to? }`).

---

## 5. Quy trình tạo một trang hoặc tính năng mới

### Bước 1: Tạo CSS Module (nếu cần)
Chỉ tạo `<ComponentName>.module.css` khi có:
- Trạng thái phức tạp (`:hover` tác động phần tử con, `::after`, animation `@keyframes`).
- Màu bán trong suốt (`rgba(...)`), gradient, hoặc `backdrop-filter`.

Ví dụ `src/pages/OrderHistoryPage.module.css`:
```css
.statusBanner {
  padding: 12px 16px;
  background-color: rgba(31, 139, 76, 0.08);
  border-left: 3px solid var(--status-success);
  color: var(--status-success);
  font-size: var(--fs-base);
}

.rowItem {
  border-bottom: 1px solid var(--border-light);
  transition: background-color var(--transition-fast);
}

.rowItem:hover {
  background-color: var(--bg-surface);
}
```

### Bước 2: Viết Component TSX với `cn()` và `src/components/ui`
```tsx
import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import Breadcrumb from '../components/layout/Breadcrumb';
import { Badge, Button, Input, Modal, SectionHeader } from '../components/ui';
import { cn } from '../utils/cn';
import { formatCurrencyVND } from '../utils/format';
import styles from './OrderHistoryPage.module.css';

export default function OrderHistoryPage() {
  const [keyword, setKeyword] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-body pb-20 pt-8 text-content-primary">
      <div className="container">
        <Breadcrumb items={[{ label: 'Đơn hàng của tôi' }]} />

        <SectionHeader
          title="Lịch Sử Đơn Hàng"
          align="left"
          action={
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsOpen(true)}>
              Tạo Yêu Cầu
            </Button>
          }
        />

        <div className="mb-6 max-w-[400px]">
          <Input
            label="Tìm đơn hàng"
            placeholder="Nhập mã đơn..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            icon={Search}
          />
        </div>

        <div className="border border-line-light bg-surface-body">
          <div className={cn('flex items-center justify-between p-4', styles.rowItem)}>
            <div>
              <span className="font-bold text-content-primary">#DH-1024</span>
              <span className="ml-3 text-sm text-content-secondary">{formatCurrencyVND(850000)}</span>
            </div>
            <Badge variant="success">Hoàn thành</Badge>
          </div>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Chi Tiết Yêu Cầu">
        <p className="text-base text-content-secondary">Nội dung modal...</p>
      </Modal>
    </div>
  );
}
```

---

## 6. Kiểm tra trước khi Commit / Tạo Pull Request

Chạy toàn bộ các lệnh kiểm tra sau tại thư mục `d:\fashion-website-frontend` (trên PowerShell dùng `npm.cmd` / `npx.cmd` nếu bị chặn script `.ps1`):

1. **Kiểm tra TypeScript & Build Production:**
   ```powershell
   npx.cmd tsc -p tsconfig.app.json --noEmit
   npm.cmd run build
   ```
2. **Kiểm tra Lint & Unit Tests:**
   ```powershell
   npm.cmd run lint
   node --test tests/*.test.mjs
   ```
3. **Quét mã màu HEX cứng ngoài `tokens.css` (kết quả phải trống hoặc chỉ có anchor link `#...`):**
   ```powershell
   Select-String -Path (Get-ChildItem -Path 'src' -Recurse -Include *.ts,*.tsx,*.css -Exclude 'tokens.css').FullName -Pattern '#[0-9a-fA-F]{3,8}'
   ```
4. **Quét class màu mặc định của Tailwind & inline `style={{`:**
   ```powershell
   Select-String -Path (Get-ChildItem -Path 'src' -Recurse -Include *.ts,*.tsx).FullName -Pattern 'style=\{\{|(bg|text|border|ring|from|to|via)-(red|blue|green|yellow|amber|emerald|slate|gray|zinc|neutral|stone|orange|purple|pink|indigo|teal|cyan)-|(bg|text|border)-(white|black)(/|\b)'
   ```

### Checklist tự rà soát trước khi gửi PR
- [ ] `tsc --noEmit`, `npm.cmd run build`, `npm.cmd run lint` và unit tests đều pass không lỗi.
- [ ] Không còn mã màu HEX (`#...`) ngoài `src/styles/tokens.css`.
- [ ] Không dùng class màu mặc định của Tailwind hoặc opacity modifier (`/10`, `/50`...) trên CSS variable.
- [ ] Không viết inline `style={{ ... }}` cho style tĩnh.
- [ ] Tận dụng tối đa component từ `src/components/ui`, layout từ `src/components/layout` và `formatCurrencyVND` từ `src/utils/format.ts`.
- [ ] Kiểm tra hiển thị trực quan trên cả Desktop và Mobile (đảm bảo đã tắt Dark Mode tự động của trình duyệt khi kiểm tra màu).
