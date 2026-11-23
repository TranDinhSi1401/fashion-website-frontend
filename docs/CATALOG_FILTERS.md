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
`tag=sale` hiển thị sản phẩm có ưu đãi PRODUCT hợp lệ từ `bestOffer` của backend. Kết hợp với danh mục, giá, màu, size và phân trang; sản phẩm hết hàng hoặc ưu đãi hết hạn không được tính. Khi chọn màu/size, giá trên thẻ lấy ưu đãi của biến thể phù hợp, không lấy mức giảm ở biến thể khác.

Ô “Tìm trong kết quả” ở sidebar là tìm kiếm phụ, giữ các bộ lọc đang chọn; nhấn Enter hoặc nút kính lúp để áp dụng. Ô tìm kiếm chính vẫn nằm ở header.
Tay áo/cổ áo/form/chất liệu chưa có dữ liệu cấu trúc, nên không hiển thị các nút lọc giả.

Kiểm tra: `node --test tests/catalog.test.mjs` (Node 22.18+), `npm run build`, `npm run lint`.


## Điều hướng Áo/Quần từ danh mục thật

Menu desktop và mobile lấy tên/ID từ `GET /categories`, nhóm theo cây danh mục Áo/Quần và đối tượng Nam/Nữ/Unisex. Từng mục dẫn tới `categoryId` thật. Các tên marketing không tồn tại trong database và `sort=popular` chưa được hỗ trợ không xuất hiện trong menu.

`group=ao`, `group=quan`, `group=phukien` giới hạn kết quả vào các danh mục tương ứng. `tag=new` và `tag=sale` trong menu giữ nguyên group; chọn thêm đối tượng/loại sản phẩm sẽ giao với group hiện tại. Nhánh danh mục bị tắt, thiếu cha hoặc vòng lặp không được quảng bá. Menu đọc lại dữ liệu khi đổi trang hoặc quay lại cửa sổ.


Ô lọc giá ở trang khách và quản lý hiển thị nhóm hàng nghìn bằng dấu cách (`2 000 000`), đơn vị `đ` riêng bên phải. Form/URL/API nhận số không phân cách (`2000000`). Ô trống và giá 0 được phân biệt; số âm, phần thập phân và số vượt giới hạn chính xác bị từ chối. Có thể dán số có phân cách hàng nghìn thông dụng hoặc ký hiệu đ/₫.

## Bộ lọc và mác hàng mới

- Khung bộ lọc ẩn mặc định trên mọi kích thước màn hình; nút Bộ lọc mở bảng trượt bên trái. Các nhóm bên trong mở sẵn và vẫn có thể thu gọn.
- Không còn ô tìm kiếm trong bộ lọc. Đóng bảng bằng X, Esc, bấm nền hoặc Xem kết quả; lựa chọn lọc được giữ trong query string.
- Mác NEW trên ProductCard dùng màu đỏ theo token accent-red, dạng tia nhọn; dựa vào cờ isNew do API cung cấp. Chỉ thay mác NEW của thẻ bán hàng; NEW và SALE có thể xuất hiện đồng thời.
