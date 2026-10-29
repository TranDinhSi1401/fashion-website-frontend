# Luồng bộ lọc sản phẩm

1. Mở `/products`: tải danh mục thật và các size/màu còn hàng từ API.
2. Chọn danh mục, size, màu hoặc áp dụng giá/tìm kiếm: cập nhật query URL và gọi GET `/products`.
3. Backend lọc kết hợp, trả DTO; frontend cập nhật lưới và số kết quả.
4. Xóa lọc: quay về `/products`. Tải lại trang hoặc dùng Back/Forward giữ đúng lựa chọn trên URL.
5. Request cũ bị hủy khi đổi lọc. Lỗi API và danh sách rỗng hiển thị riêng, không dùng dữ liệu mẫu.

Danh mục + khoảng giá + size + màu + từ khóa + hàng mới có thể kết hợp (mỗi nhóm chọn một giá trị).
Chuyển nhóm lọc không xóa chế độ hàng mới; số giá/từ khóa đang nhập được lấy cùng trong lần áp dụng.
Nút Áp dụng tất cả bộ lọc gửi toàn bộ lựa chọn. Các nhãn Đang áp dụng cho phép bỏ riêng từng nhóm.
Nhãn NEW chữ trắng nền đỏ dựa trên `isNew` backend, chỉ hiện khi createdAt nằm trong 30 ngày gần nhất.

Cần chạy backend có API bộ lọc tại `VITE_API_BASE_URL=http://localhost:8080/api/v1`.
Backend trên nhánh `codex/fix-catalog-filters` bổ sung ảnh và biến thể dưới dạng DTO.
Không cần thay schema hoặc import lại dữ liệu; ảnh và biến thể phải tồn tại trong database.

URL hỗ trợ `categoryId`, `search`, `minPrice`, `maxPrice`, `size`, `color`, `sort`.
Link cũ của Header như `category=ao`, `category=polo`, `category=quan` tra ID thực từ danh mục API.
`tag=new` gọi GET `/products/new?days=30`, lấy sản phẩm tạo trong 30 ngày và mặc định mới nhất trước.
`tag=sale` báo chưa hỗ trợ; cần nối luồng khuyến mãi trước khi triển khai.
Tay áo/cổ áo/form/chất liệu chưa có dữ liệu cấu trúc, nên không hiển thị các nút lọc giả.

Kiểm tra: `node --test tests/catalog.test.mjs` (Node 22.18+), `npm run build`, `npm run lint`.
