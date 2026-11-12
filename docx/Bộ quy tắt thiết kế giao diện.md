# BỘ QUY TẮC THIẾT KẾ GIAO DIỆN (UI DESIGN SYSTEM)
**Dự án:** Hệ thống Website Thương mại Điện tử Thời trang (Fashion E-Commerce)  
**Nền tảng & Công nghệ:** Desktop Web Application — **React + TypeScript + Tailwind CSS + CSS Modules**  
**Phong cách chủ đạo:** Hiện đại, Tối giản, Sắc nét (Minimalist & Sharp Editorial)

---

## 1. Mục đích & Nguyên tắc Kiến trúc Giao diện (Core Principles)

Tài liệu này là tiêu chuẩn thiết kế giao diện (Single Source of Truth) cho toàn bộ thành viên trong nhóm phát triển. Mọi màn hình chức năng (Trang chủ, Danh mục, Chi tiết sản phẩm, Giỏ hàng, Thanh toán, Tài khoản...) khi code mới đều **bắt buộc** tuân thủ bộ quy tắc này nhằm đảm bảo:

1. **Tính đồng bộ tuyệt đối:** Mọi nút bấm, ô nhập liệu, thẻ sản phẩm, cỡ chữ và màu sắc trên tất cả các màn hình đều nhất quán.
2. **Quản lý tập trung bằng biến (Design Tokens):** Tuyệt đối **KHÔNG** gõ trực tiếp mã màu cứng (ví dụ `#111111`, `#D0021B` hay class màu mặc định của Tailwind như `bg-red-600`, `text-gray-500`) vào file `.tsx` hoặc `.module.css`. Toàn bộ thông số phải gọi qua biến trong `src/styles/tokens.css` hoặc thông qua bộ class Tailwind đã được ánh xạ vào `tokens.css`.
3. **Phân tách rõ vai trò của Tailwind CSS, CSS Modules và TypeScript:**
   * **Tailwind CSS:** Dùng cho bố cục nhanh (Flexbox, Grid, Container, Margin/Padding, vị trí) và các utility class đã kết nối với biến toàn cục (`bg-primary`, `text-accent-red`, `rounded-btn`...).
   * **CSS Modules (`*.module.css`):** Dùng cho các hiệu ứng phức tạp, trạng thái lồng nhau (ví dụ: hover vào `ProductCard` thì nút "Mua nhanh" trượt lên và ảnh zoom nhẹ, hiệu ứng gạch chân chạy ngang trên `Header`, thanh trượt `MiniCartDrawer`...) để giữ JSX trong file `.tsx` luôn sạch sẽ.
   * **TypeScript (`*.tsx`, `*.ts`):** Mọi Component bắt buộc phải khai báo `interface` hoặc `type` tường minh cho Props, hỗ trợ gợi ý code (IntelliSense) và kiểm tra lỗi ngay lúc biên dịch.

---

## 2. Hệ thống Biến Toàn cục & Cấu hình Tailwind CSS

### 2.1. File Biến Toàn cục (`src/styles/tokens.css`)
Đảm bảo file `src/styles/tokens.css` được import đầu tiên trong `src/styles/global.css` (và `global.css` được import vào `main.tsx`). Khi nhóm muốn đổi tông màu chủ đạo hoặc độ bo góc của toàn website, chỉ cần sửa giá trị tại file này.

```css
/* src/styles/tokens.css */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');

:root {
  /* ================= 1. BẢNG MÀU (COLOR PALETTE) ================= */
  /* Màu chủ đạo & Hành động chính (Đen Carbon) */
  --color-primary: #111111;
  --color-primary-hover: #333333;
  --color-primary-active: #000000;

  /* Màu điểm nhấn thương mại (Đỏ Khuyến mãi / Vàng Đồng Hạng Thành viên) */
  --color-accent-red: #D0021B;
  --color-accent-red-hover: #A80015;
  --color-accent-gold: #C5A059;

  /* Màu nền (Backgrounds) */
  --bg-body: #FFFFFF;                /* Nền chính toàn trang */
  --bg-surface: #F6F6F6;             /* Nền khối phụ, ô tìm kiếm, hover phụ */
  --bg-elevated: #FFFFFF;            /* Nền Modal, Dropdown, Drawer, Card */
  --bg-dark: #111111;                /* Nền Topbar, Footer */
  --bg-overlay: rgba(0, 0, 0, 0.55); /* Lớp phủ mờ khi mở Modal/Drawer */
  --bg-disabled: #EAEAEA;            /* Nền nút/input khi bị vô hiệu hóa */

  /* Màu chữ (Typography Colors) */
  --text-primary: #111111;           /* Chữ chính, tiêu đề, tên sản phẩm */
  --text-secondary: #555555;         /* Chữ mô tả phụ, thuộc tính */
  --text-muted: #888888;             /* Giá gốc gạch ngang, placeholder, ngày tháng */
  --text-inverse: #FFFFFF;           /* Chữ trên nền tối (Button chính, Footer) */
  --text-disabled: #AAAAAA;          /* Chữ khi bị khóa (Disabled) */

  /* Màu viền (Borders) */
  --border-light: #EBEBEB;           /* Viền chia ô nhạt, đường kẻ ngang */
  --border-default: #CCCCCC;         /* Viền Input, nút Secondary, ô chọn Size */
  --border-focus: #111111;           /* Viền khi Focus/Active */
  --border-error: #D0021B;           /* Viền khi nhập sai dữ liệu */

  /* Màu trạng thái hệ thống (Feedback States) */
  --status-success: #1F8B4C;         /* Còn hàng, Đặt hàng thành công */
  --status-warning: #E67E22;         /* Sắp hết hàng */
  --status-error: #D0021B;           /* Hết hàng, Lỗi biểu mẫu */

  /* ================= 2. PHÔNG CHỮ & CỠ CHỮ (TYPOGRAPHY) ================= */
  --font-primary: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;

  /* Cỡ chữ chuẩn Desktop */
  --fs-xs: 12px;     /* Badge, chú thích nhỏ, breadcrumb, báo lỗi */
  --fs-sm: 13px;     /* Menu phụ, giá gốc, nhãn thuộc tính, bảng size */
  --fs-base: 14px;   /* Chữ mặc định toàn trang, tên SP trên Card, nút bấm, input */
  --fs-md: 16px;     /* Giá bán trên Card, tiêu đề khối nhỏ, tiêu đề Drawer */
  --fs-lg: 20px;     /* Tên SP ở trang Chi tiết, tiêu đề Modal, tổng tiền */
  --fs-xl: 24px;     /* Tiêu đề phân khu lớn (Section Heading) */
  --fs-2xl: 32px;    /* Tiêu đề Banner / Trang lớn */

  /* Độ đậm chữ (Font Weight) */
  --fw-regular: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  --fw-bold: 700;

  /* Chiều cao dòng & Giãn chữ */
  --lh-tight: 1.25;
  --lh-base: 1.5;
  --tracking-wide: 0.05em;   /* Bắt buộc dùng khi chữ IN HOA (Menu, Button) */
  --tracking-wider: 0.08em;  /* Dùng cho Section Heading IN HOA */

  /* ================= 3. ĐỘ BO GÓC (BORDER RADIUS) ================= */
  --radius-none: 0px;
  --radius-sm: 2px;          /* Ô chọn size, badge, phân trang */
  --radius-btn: 0px;         /* Bo góc chuẩn cho mọi Button */
  --radius-input: 0px;       /* Bo góc chuẩn cho mọi Input / Select */
  --radius-card: 0px;        /* Bo góc cho Card sản phẩm */
  --radius-modal: 4px;       /* Bo góc cho Popup / Modal */
  --radius-full: 9999px;     /* Hình tròn tuyệt đối (chấm màu, badge số lượng) */

  /* ================= 4. BỐ CỤC & KHOẢNG CÁCH (LAYOUT & SPACING) ================= */
  --container-max-width: 1320px;
  --container-padding: 24px;
  --grid-gap: 24px;          /* Khoảng cách giữa các cột sản phẩm */
  --header-height: 76px;
  --topbar-height: 36px;
  --btn-height: 44px;
  --btn-height-lg: 48px;
  --input-height: 44px;

  /* ================= 5. ĐỔ BÓNG & HIỆU ỨNG (SHADOWS & TRANSITIONS) ================= */
  --shadow-header: 0 2px 10px rgba(0, 0, 0, 0.06);
  --shadow-dropdown: 0 8px 24px rgba(0, 0, 0, 0.12);
  --shadow-modal: 0 16px 40px rgba(0, 0, 0, 0.2);
  --transition-fast: all 0.2s ease-in-out;
  --transition-smooth: all 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
}
```

### 2.2. Kết nối Biến CSS vào `tailwind.config.ts`
Để sử dụng các class Tailwind ngắn gọn mà vẫn ăn theo biến `:root` trong `tokens.css`, cấu hình file `tailwind.config.ts` như sau:

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        primary: ['var(--font-primary)'],
      },
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          active: 'var(--color-primary-active)',
        },
        accent: {
          red: 'var(--color-accent-red)',
          'red-hover': 'var(--color-accent-red-hover)',
          gold: 'var(--color-accent-gold)',
        },
        surface: {
          body: 'var(--bg-body)',
          DEFAULT: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          dark: 'var(--bg-dark)',
          disabled: 'var(--bg-disabled)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
          disabled: 'var(--text-disabled)',
        },
        line: {
          light: 'var(--border-light)',
          DEFAULT: 'var(--border-default)',
          focus: 'var(--border-focus)',
          error: 'var(--border-error)',
        },
        status: {
          success: 'var(--status-success)',
          warning: 'var(--status-warning)',
          error: 'var(--status-error)',
        },
      },
      fontSize: {
        xs: 'var(--fs-xs)',
        sm: 'var(--fs-sm)',
        base: 'var(--fs-base)',
        md: 'var(--fs-md)',
        lg: 'var(--fs-lg)',
        xl: 'var(--fs-xl)',
        '2xl': 'var(--fs-2xl)',
      },
      borderRadius: {
        none: 'var(--radius-none)',
        sm: 'var(--radius-sm)',
        btn: 'var(--radius-btn)',
        input: 'var(--radius-input)',
        card: 'var(--radius-card)',
        modal: 'var(--radius-modal)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        header: 'var(--shadow-header)',
        dropdown: 'var(--shadow-dropdown)',
        modal: 'var(--shadow-modal)',
      },
      letterSpacing: {
        wide: 'var(--tracking-wide)',
        wider: 'var(--tracking-wider)',
      },
      maxWidth: {
        container: 'var(--container-max-width)',
      },
      height: {
        topbar: 'var(--topbar-height)',
        header: 'var(--header-height)',
        btn: 'var(--btn-height)',
        'btn-lg': 'var(--btn-height-lg)',
        input: 'var(--input-height)',
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 3. Quy tắc Định dạng Văn bản (Typography Rules)

Để tránh việc mỗi thành viên dùng chữ đậm, chữ nghiêng, chữ hoa tùy ý trên các màn hình khác nhau, toàn nhóm thống nhất 4 quy tắc hiển thị chữ sau:

1. **Chữ IN HOA (`uppercase`) + In đậm (`font-semibold` / `font-bold`) + Giãn chữ (`tracking-wide`):**
   * **Áp dụng cho:** Menu điều hướng chính, tất cả các Nút bấm (`Primary`/`Secondary`), Tiêu đề các phân khu lớn (`Section Heading`), Tiêu đề cột Bộ lọc/Footer, và Nhãn trạng thái (`NEW`, `SALE`, `BEST SELLER`).
   * **Tuyệt đối không dùng** chữ IN HOA cho đoạn văn mô tả dài hoặc tên sản phẩm dài.
2. **Chữ In đậm (`font-semibold` / `font-bold`) nhưng KHÔNG viết hoa toàn bộ:**
   * **Áp dụng cho:** Giá bán hiện tại của sản phẩm, Tổng tiền thanh toán, Tên sản phẩm tại trang Chi tiết sản phẩm, và Nhãn (`Label`) đứng trên các ô nhập liệu.
3. **Chữ Thường (`font-normal` `400` - `font-medium` `500`):**
   * **Áp dụng cho:** Tên sản phẩm trên Card (`font-medium`), Nội dung mô tả chất liệu/hướng dẫn bảo quản (`font-normal`), Các mục con trong Mega Menu/Footer (`font-normal`), và Nội dung người dùng nhập vào ô Input (`font-normal`).
4. **Chữ In nghiêng (`italic`):**
   * **Hạn chế tối đa** để giữ nét vuông vức, hiện đại. Chỉ dùng cho: Gợi ý thông số người mẫu (*Ví dụ: Mẫu cao 1m78, nặng 70kg mặc size L*), Link phụ (*Hướng dẫn chọn size*), hoặc dòng thông báo lỗi nhỏ nằm ngay dưới ô Input.

---

## 4. Bảng Quy chuẩn 26 Thành phần Giao diện Dùng chung (Component Specs)

Mọi thành viên khi xây dựng hoặc tái sử dụng Component phải đối chiếu đúng các thông số kích thước, màu sắc và 4 trạng thái tương tác (**Default / Hover / Active / Disabled**) dưới đây:

| STT | Thành phần (Component) | Bố cục & Kích thước (Tailwind / CSS Modules) | Chữ & Bo góc (Typography & Radius) | Màu sắc & Trạng thái (Default / Hover / Active / Disabled) | Ghi chú kỹ thuật (TypeScript / React UX) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Topbar** (`Topbar.tsx`) | Rộng `w-full`, cao `h-topbar` (`36px`). Chia 2 hoặc 3 cột trong khung `max-w-container` (Hotline trái, Khuyến mãi giữa, Link phụ phải). | Cỡ chữ `text-xs` (`12px`), `font-medium` (`500`). Không bo góc (`rounded-none`). | **Default:** Nền `bg-surface-dark`, chữ `text-content-inverse` (`#FFF`).<br>**Hover (Link):** Chữ chuyển sang `hover:text-accent-gold`. | Dùng hiển thị ưu đãi miễn phí vận chuyển hoặc hotline. |
| **2** | **Header chính** (`Header.tsx` + `Header.module.css`) | Rộng `w-full`, nội dung gói trong `max-w-container` (`1320px`), cao `h-header` (`76px`). Flexbox 3 khối: Logo (`160px`) - Menu chính (giữa, `gap-8`) - Cụm tìm kiếm & Icon (phải). | Menu chính: Cỡ `text-base` (`14px`), `uppercase`, `font-semibold` (`600`), `tracking-wide`. Không bo góc. | **Default:** Nền `bg-surface-body`, chữ `text-content-primary`, viền dưới `border-b border-line-light`.<br>**Hover (Menu item):** Hiện gạch chân `2px solid var(--color-primary)` chạy từ trái sang phải (viết trong `Header.module.css`).<br>**Active:** Gạch chân cố định `2px solid var(--color-primary)`.<br>**Mục Sale:** Chữ màu `text-accent-red`. | Đặt `sticky top-0 z-50`. Thêm `shadow-header` khi `window.scrollY > 50`. |
| **3** | **Mega Menu** (`MegaMenu.tsx` + `MegaMenu.module.css`) | Rộng `w-full` hoặc `1100px` căn giữa dưới Header, `p-8`, chia 4-5 cột (`grid-cols-4` hoặc `grid-cols-5`). | Tiêu đề cột: `text-base` (`14px`), `uppercase`, `font-bold`.<br>Mục con: `text-base` (`14px`), `font-normal`, `leading-[2.2]`. Bo góc dưới `rounded-b-sm`. | **Default:** Nền `bg-surface-elevated`, bóng đổ `shadow-dropdown`, chữ mục con `text-content-secondary`.<br>**Hover (Mục con):** Chữ đổi sang `text-content-primary`, `font-medium`, dịch sang phải `translate-x-1`. | Dùng CSS Modules để kiểm soát hiệu ứng đóng/mở (`opacity`, `visibility`, `var(--transition-fast)`). |
| **4** | **Thanh tìm kiếm** (`SearchInput.tsx`) | Rộng `w-[220px]` (mở rộng `focus-within:w-[280px]`), cao `h-[38px]`, `pl-3.5 pr-9` (chừa icon kính lúp). | Cỡ chữ `text-sm` (`13px`), `font-normal`. Bo góc `rounded-input` (`0px`). | **Default:** Nền `bg-surface`, viền `border border-transparent`, chữ `text-content-primary`, placeholder `placeholder:text-content-muted`.<br>**Hover:** Viền `hover:border-line`.<br>**Focus:** Nền `bg-surface-body`, viền `border-line-focus`. | Kết hợp custom hook `useDebounce<string>(query, 300)` bằng TypeScript. |
| **5** | **Breadcrumb** (`Breadcrumb.tsx`) | Nằm dưới Header, cao `h-11` (`44px`), căn trái theo `max-w-container`. Các mục cách nhau dấu `/` (`gap-2`). | Cỡ chữ `text-xs` (`12px`), `font-normal`. Mục cuối cùng `font-medium`. | **Default (Cấp trước):** Chữ `text-content-muted`.<br>**Hover (Cấp trước):** Chữ `hover:text-content-primary hover:underline`.<br>**Active (Trang hiện tại):** Chữ `text-content-primary`, `aria-current="page"`. | Khai báo kiểu `BreadcrumbItem { label: string; href?: string }`. |
| **6** | **Button Chính** (`Button.tsx` + `Button.module.css`) | Cao chuẩn `h-btn` (`44px`, cỡ lớn `h-btn-lg` `48px`), `px-6`, căn giữa chữ & icon (`inline-flex items-center justify-center gap-2`). | Cỡ chữ `text-base` (`14px`), `uppercase`, `font-semibold` (`600`), `tracking-wide`. Bo góc `rounded-btn` (`0px`). | **Default:** Nền `bg-primary`, chữ `text-content-inverse`, viền `border border-primary`.<br>**Hover:** Nền `hover:bg-primary-hover`.<br>**Active:** Nền `active:bg-primary-active`, `active:scale-[0.99]`.<br>**Disabled:** Nền `bg-surface-disabled`, chữ `text-content-disabled`, `cursor-not-allowed`. | Kế thừa `React.ButtonHTMLAttributes<HTMLButtonElement>`, dùng `variant="primary"`. |
| **7** | **Button Phụ** (`Button.tsx` - `variant="secondary"`) | Cao chuẩn `h-btn` (`44px`) hoặc `h-btn-lg` (`48px`), `px-6`, `border`. | Cỡ chữ `text-base` (`14px`), `uppercase`, `font-semibold` (`600`), `tracking-wide`. Bo góc `rounded-btn` (`0px`). | **Default:** Nền `bg-surface-body`, chữ `text-content-primary`, viền `border-primary`.<br>**Hover:** Đảo màu — Nền chuyển sang `var(--color-primary)`, chữ chuyển sang `var(--text-inverse)`.<br>**Active:** Nền `#000`, chữ `#FFF`.<br>**Disabled:** Nền `bg-surface-body`, viền `border-line-light`, chữ `text-content-disabled`. | Class `.secondary` trong `Button.module.css` quản lý hiệu ứng đảo màu mượt mà. |
| **8** | **Button Văn bản** (`Button.tsx` - `variant="ghost"`) | Chiều cao tự động theo dòng chữ, `py-1 px-0`, có gạch chân dưới chữ. | Cỡ chữ `text-sm` (`13px`), `font-medium` (`500`), chữ thường hoặc `italic` (với link "Hướng dẫn chọn size"). | **Default:** Nền `bg-transparent`, chữ `text-content-secondary`, gạch chân `border-b border-line`.<br>**Hover:** Chữ `text-content-primary`, gạch chân `border-content-primary`.<br>**Disabled:** Chữ `text-content-disabled`, bỏ gạch chân. | Dùng cho các hành động phụ như "Xóa bộ lọc", "Xem bảng size". |
| **9** | **Icon Button & Badge đếm** (`IconButton.tsx`) | Khung vuông `w-10 h-10`, icon `w-5 h-5` căn giữa. Badge số lượng nằm góc trên phải (`w-[18px] h-[18px]`). | Số trên Badge: Cỡ `text-[10px]`, `font-bold`. Bo góc Badge `rounded-full`. | **Default:** Icon màu `text-content-primary`, Badge nền `bg-primary` (hoặc `bg-accent-red`), chữ `text-content-inverse`.<br>**Hover:** Nền nút hiện tròn mờ `hover:bg-surface`, icon phóng nhẹ `scale-105`. | Nhận prop `badgeCount?: number` trong TypeScript. |
| **10** | **Tiêu đề Phân khu** (`SectionHeader.tsx`) | Căn giữa toàn khối hoặc căn trái kèm nút "Xem tất cả" bên phải. Margin dưới `mb-8` (`32px`). | Cỡ chữ `text-xl` (`24px`), `uppercase`, `font-bold` (`700`), `tracking-wider`. Không bo góc. | **Default:** Chữ `text-content-primary`. Có gạch ngang ngắn `w-10 h-0.5 bg-primary` dưới tiêu đề. | Dùng chung `<SectionHeader title="..." action={...} />`. |
| **11** | **Khung Card Sản phẩm** (`ProductCard.tsx` + `ProductCard.module.css`) | Bố cục Grid 4 cột trên Desktop (`grid-cols-4`), `gap-[var(--grid-gap)]` (`24px`). Nội dung xếp dọc: Khung ảnh → Chấm màu → Tên SP → Giá. | Bo góc toàn khung `rounded-card` (`0px`). Khoảng cách từ ảnh xuống thông tin là `mt-3` (`12px`). | **Default:** Nền `bg-transparent`, không viền.<br>**Hover (Toàn Card):** Kích hoạt `.card:hover` trong `ProductCard.module.css` để zoom nhẹ ảnh và đẩy nút "Mua nhanh" lên. | Tỷ lệ khung ảnh bắt buộc là **3:4** (`aspect-[3/4]`) trên mọi màn hình. |
| **12** | **Ảnh Sản phẩm & Nút Mua nhanh** (Trong `ProductCard.tsx`) | Khung `aspect-[3/4] overflow-hidden relative`. Nút "MUA NHANH" cao `h-10` (`40px`), rộng `w-full` nằm sát đáy ảnh. | Chữ nút Mua nhanh: `text-xs` (`12px`), `uppercase`, `font-semibold`. Không bo góc. | **Default:** Hiển thị ảnh chính, nút Mua nhanh ẩn (`translateY(100%)`).<br>**Hover Card:** Nút Mua nhanh trượt lên (`translateY(0)`), nền `rgba(17, 17, 17, 0.85)`, chữ `#FFF`.<br>**Hover Nút Mua nhanh:** Nền đặc `var(--color-primary)`. | Luôn gắn `loading="lazy"` và `object-cover` cho thẻ `<img>`. |
| **13** | **Nhãn Sản phẩm** (`Badge.tsx` + `Badge.module.css`) | Đặt `absolute top-2.5 left-2.5` trên khung ảnh. Cao `h-[22px]`, `px-2`. Các nhãn xếp dọc cách nhau `gap-1`. | Cỡ chữ `text-[11px]`, `uppercase`, `font-bold`. Bo góc `rounded-sm` (`2px`). | **Badge `sale`:** Nền `bg-accent-red`, chữ `text-content-inverse`.<br>**Badge `new`:** Nền `bg-primary`, chữ `text-content-inverse`.<br>**Badge `best-seller` / `vip`:** Nền `bg-accent-gold`, chữ `text-content-inverse`. | Khai báo `type BadgeVariant = 'new' \| 'sale' \| 'best-seller' \| 'vip'`. |
| **14** | **Tên Sản phẩm trên Card** (Trong `ProductCard.tsx`) | Giới hạn tối đa 1 dòng (`line-clamp-1 overflow-hidden text-ellipsis`). Margin dưới `mb-1.5`. | Cỡ chữ `text-base` (`14px`), chữ thường, độ đậm `font-medium` (`500`). | **Default:** Chữ `text-content-primary`.<br>**Hover:** Chữ chuyển sang `hover:text-content-secondary`. | Hỗ trợ truyền `LinkComponent` (như `Link` của `react-router-dom`) qua props. |
| **15** | **Cụm Giá Sản phẩm** (Trong `ProductCard.tsx`) | Flexbox ngang, căn dòng `flex items-baseline gap-2`. | **Giá bán hiện tại:** Cỡ `text-md` (`16px` trên Card, `22px` ở Chi tiết SP), `font-bold`.<br>**Giá gốc:** Cỡ `text-sm` (`13px`), `font-normal`, `line-through`. | **Không giảm giá:** Giá bán màu `text-content-primary`.<br>**Có giảm giá:** Giá bán màu `text-accent-red`, giá gốc màu `text-content-muted`. | Sử dụng hàm `formatCurrencyVND(price: number): string` chung toàn dự án. |
| **16** | **Bộ chọn Màu sắc** (`ColorSwatches.tsx` + `ColorSwatches.module.css`) | Flexbox ngang, `gap-2`. Trên Card: ô tròn `w-4 h-4` (`16px`). Ở trang Chi tiết SP (`large`): ô tròn `w-7 h-7` (`28px`). | Bo góc `rounded-full` (hình tròn `50%`). | **Default:** Nền truyền qua biến `--swatch-color`, viền `1px solid var(--border-default)`.<br>**Hover:** Phóng nhẹ `scale(1.1)`.<br>**Active:** Viền kép (`box-shadow: 0 0 0 2px var(--bg-body), 0 0 0 3.5px var(--border-focus)`).<br>**Disabled:** `opacity: 0.35`, có gạch chéo. | Dùng CSS variable `--swatch-color` để truyền mã màu động từ API sản phẩm. |
| **17** | **Bộ chọn Kích cỡ** (`SizeSelector.tsx` + `SizeSelector.module.css`) | Flexbox ngang, `gap-2.5`. Mỗi ô rộng tối thiểu `min-w-[44px]`, cao `h-[38px]`, căn giữa chữ. | Cỡ chữ `text-sm` (`13px`), `uppercase`, `font-medium`. Bo góc `rounded-sm` (`2px`). | **Default:** Nền `bg-surface-body`, chữ `text-content-primary`, viền `border border-line`.<br>**Hover:** Viền đổi sang `border-primary`.<br>**Active:** Nền `bg-primary`, chữ `text-content-inverse`, `font-semibold`.<br>**Disabled (Hết size):** Nền `bg-surface`, chữ `text-content-disabled`, gạch chéo qua ô, `cursor-not-allowed`. | Kiểm tra tồn kho theo cặp `(colorValue, sizeValue)` để bật/tắt `disabled`. |
| **18** | **Bộ chọn Số lượng** (`QuantityStepper.tsx` + `QuantityStepper.module.css`) | Khung ngang gồm 3 phần ghép liền: Nút `-` (`38px x 42px`) + Ô số (`50px x 42px`) + Nút `+` (`38px x 42px`). Tổng rộng `126px`. | Số ở giữa: Cỡ `text-base` (`14px`), `font-semibold`, căn giữa. Bo góc ngoài `rounded-input` (`0px`). | **Default:** Nền `bg-surface-body`, viền chung `border border-line`, chữ `text-content-primary`.<br>**Hover (Nút `-` / `+`):** Nền ô nút chuyển sang `bg-surface`.<br>**Disabled:** Dấu mờ đi (`text-content-disabled`), `cursor-not-allowed`. | Ép kiểu `number` chặt chẽ trong khoảng `[min, max]` bằng TypeScript. |
| **19** | **Ô nhập liệu Biểu mẫu** (`Input.tsx` + `Input.module.css`) | Rộng `w-full`, cao `h-input` (`44px`), `px-3.5`. Nhãn (`Label`) nằm phía trên, cách input `mb-1.5` (`6px`). | Label: `text-sm` (`13px`), `font-semibold`.<br>Input: `text-base` (`14px`), `font-normal`.<br>Thông báo lỗi: `text-xs` (`12px`), `italic`. Bo góc `rounded-input` (`0px`). | **Default:** Nền `bg-surface-body`, viền `border border-line`, chữ `text-content-primary`, placeholder `placeholder:text-content-muted`.<br>**Focus:** Viền `border-line-focus`, `outline-none`.<br>**Error:** Viền `border-line-error`, chữ báo lỗi màu `text-status-error`.<br>**Disabled:** Nền `bg-surface-disabled`, chữ `text-content-disabled`. | Hỗ trợ `forwardRef<HTMLInputElement \| HTMLTextAreaElement, InputProps>` để tích hợp mượt với `react-hook-form`. |
| **20** | **Hộp chọn & Sắp xếp** (`Select.tsx` + `Select.module.css`) | Rộng `w-[200px]` - `w-[240px]`, cao `h-10` (`40px`), `pl-3 pr-8` (chừa icon mũi tên `▾`). | Cỡ chữ `text-base` (`14px`), `font-normal`. Bo góc `rounded-input` (`0px`). | **Default:** Nền `bg-surface-body`, viền `border border-line`, chữ `text-content-primary`.<br>**Hover / Focus:** Viền `border-line-focus`. | Nhận mảng `options: SelectOption[]` đã định nghĩa kiểu TypeScript. |
| **21** | **Checkbox & Radio** (`Checkbox.tsx` / `Radio.tsx`) | Khung vuông (`w-[18px] h-[18px]` cho Checkbox) hoặc tròn (`w-[18px] h-[18px]` cho Radio), cách nhãn chữ `gap-2.5`. | Nhãn đi kèm: Cỡ `text-base` (`14px`), `font-normal`. Bo góc Checkbox `rounded-sm` (`2px`), Radio `rounded-full`. | **Default:** Nền `bg-surface-body`, viền `border-[1.5px] border-line`.<br>**Checked (Active):** Nền `bg-primary`, dấu tích trắng `#FFF` bên trong.<br>**Disabled:** Nền `bg-surface-disabled`, chữ `text-content-disabled`. | Dùng `accent-[var(--color-primary)]` hoặc custom SVG trong CSS Modules. |
| **22** | **Sidebar Bộ lọc Danh mục** (`FilterSidebar.tsx`) | Cột trái rộng `w-[260px]` - `w-[280px]`. Chia thành từng khối ngăn cách bởi `border-b border-line-light`, `py-5`. | Tiêu đề nhóm lọc: `text-base` (`14px`), `uppercase`, `font-bold`, kèm dấu `+`/`-` bên phải. | **Default:** Nền `bg-transparent`, chữ `text-content-primary`.<br>**Hover (Tiêu đề nhóm):** Chữ đổi sang `text-content-secondary`. | Cho phép đóng/mở (Collapse/Expand) từng nhóm tiêu chí. |
| **23** | **Ngăn kéo Giỏ hàng nhanh** (`MiniCartDrawer.tsx` + `MiniCartDrawer.module.css`) | Trượt từ cạnh phải màn hình (`w-[420px] h-screen fixed right-0 top-0 z-50`). Chia 3 phần: Header (`60px`) - Danh sách SP cuộn dọc (`flex-1`) - Footer (`160px`). | Tiêu đề Drawer: `text-md` (`16px`), `uppercase`, `font-bold`.<br>Tổng tiền: `text-lg` (`20px`), `font-bold`. Không bo góc. | **Lớp nền mờ (Backdrop):** `var(--bg-overlay)`.<br>**Khung Drawer:** Nền `bg-surface-elevated`, bóng đổ `shadow-modal`. Tổng tiền màu `text-accent-red`. | Khóa cuộn trang chính (`document.body.style.overflow = 'hidden'`) khi Drawer đang mở. |
| **24** | **Popup / Modal** (`Modal.tsx` + `Modal.module.css`) | Căn giữa màn hình (`max-w-[720px]` cho Bảng size, `max-w-[920px]` cho Quick View), `p-8`, nút đóng `✕` (`w-9 h-9`) ở góc trên phải. | Tiêu đề Modal: `text-lg` (`20px`), `uppercase`, `font-bold`, căn giữa. Bo góc khung `rounded-modal` (`4px`). | **Default:** Nền `bg-surface-elevated`, bóng đổ `shadow-modal`, lớp phủ sau lưng `var(--bg-overlay)`.<br>**Nút đóng `✕` Hover:** Nền `bg-surface`, chữ `text-content-primary`. | Dùng thẻ `<dialog>` chuẩn HTML5 kết hợp TypeScript `HTMLDialogElement`. |
| **25** | **Phân trang** (`Pagination.tsx` + `Pagination.module.css`) | Căn giữa bên dưới lưới sản phẩm, `mt-12` (`48px`). Flexbox ngang, `gap-2`. Mỗi ô vuông `w-[38px] h-[38px]`. | Cỡ chữ `text-base` (`14px`), `font-medium` (`500`). Bo góc `rounded-sm` (`2px`). | **Default:** Nền `bg-surface-body`, chữ `text-content-primary`, viền `border border-line-light`.<br>**Hover:** Viền `border-primary`.<br>**Active:** Nền `bg-primary`, chữ `text-content-inverse`, `font-semibold`.<br>**Disabled:** Chữ `text-content-disabled`, `cursor-not-allowed`. | Tự động cuộn mượt lên đầu danh sách sản phẩm khi chuyển trang. |
| **26** | **Footer** (`Footer.tsx`) | Rộng `w-full`, `pt-16 pb-8`. Nội dung trong `max-w-container` chia 4 cột (`grid-cols-4 gap-8`). | Tiêu đề cột: `text-base` (`14px`), `uppercase`, `font-semibold`, `mb-5`.<br>Link mục con: `text-sm` (`13px`), `font-normal`, `leading-[2.2]`. | **Default:** Nền `bg-surface-dark`, tiêu đề cột màu `text-content-inverse`, chữ mục con màu `text-content-disabled`.<br>**Hover (Link):** Chữ sáng lên `text-content-inverse` và dịch nhẹ sang phải (`translate-x-1`). | Giữ độ tương phản cao với phần thân trang nền trắng. |

---

## 5. Quy ước Cấu trúc Thư mục (TypeScript + Tailwind + CSS Modules)

Để tránh việc mỗi thành viên tự tạo lại nút bấm hay ô nhập liệu riêng ở từng trang, nhóm thống nhất cấu trúc thư mục UI dùng chung như sau:

```text
src/
├── styles/
│   ├── tokens.css                  # Chứa toàn bộ biến :root (Single Source of Truth)
│   └── global.css                  # @tailwind base/components/utilities + import tokens.css
├── types/
│   └── ui.ts                       # Khai báo các interface dùng chung (Product, Badge, Option...)
├── utils/
│   ├── cn.ts                       # Hàm ghép class Tailwind + CSS Modules an toàn
│   └── formatCurrencyVND.ts        # Hàm định dạng tiền tệ VNĐ có kiểu TypeScript
├── components/
│   ├── ui/                         # Các thành phần dùng chung (kèm CSS Modules riêng)
│   │   ├── Button.tsx
│   │   ├── Button.module.css
│   │   ├── Input.tsx
│   │   ├── Input.module.css
│   │   ├── Select.tsx
│   │   ├── Select.module.css
│   │   ├── Badge.tsx
│   │   ├── Badge.module.css
│   │   ├── Modal.tsx
│   │   ├── Modal.module.css
│   │   ├── Pagination.tsx
│   │   ├── Pagination.module.css
│   │   ├── SectionHeader.tsx
│   │   ├── SectionHeader.module.css
│   │   ├── ProductCard.tsx
│   │   ├── ProductCard.module.css
│   │   ├── ColorSwatches.tsx
│   │   ├── ColorSwatches.module.css
│   │   ├── SizeSelector.tsx
│   │   ├── SizeSelector.module.css
│   │   ├── QuantityStepper.tsx
│   │   ├── QuantityStepper.module.css
│   │   └── index.ts                # Barrel file xuất toàn bộ component và types
│   └── layout/                     # Khung bố cục chung toàn trang
│       ├── Topbar.tsx
│       ├── Header.tsx
│       ├── Header.module.css
│       ├── MegaMenu.tsx
│       ├── MiniCartDrawer.tsx
│       ├── Breadcrumb.tsx
│       └── Footer.tsx
```

### Checklist trước khi tạo Pull Request (PR) giao diện:
- [ ] Không có lỗi biên dịch TypeScript (`tsc --noEmit` chạy sạch, không lạm dụng kiểu `any`).
- [ ] Không có mã màu HEX cứng (`#...`) hay class màu mặc định của Tailwind (`bg-red-500`, `text-blue-600`) nằm ngoài file `tokens.css`.
- [ ] Các trạng thái tương tác phức tạp (`:hover`, `:focus-visible`, `:disabled`, pseudo-elements `::after`) được đóng gói gọn gàng trong file `*.module.css` tương ứng.
- [ ] Khung ảnh sản phẩm tuân thủ đúng tỷ lệ `aspect-[3/4]`, không bị méo ảnh khi kích thước ảnh gốc khác nhau.
- [ ] Các tiêu đề phân khu và nút bấm chính đã áp dụng `uppercase` kèm `tracking-wide`.
- [ ] Khoảng cách hai bên lề trang nằm gọn trong khung `max-w-container` (`1320px`).