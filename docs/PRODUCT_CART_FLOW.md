# Luồng chi tiết sản phẩm và giỏ hàng

## Cách chạy thử

1. Chạy MariaDB và backend tại `http://localhost:8080/api/v1`.
2. Chạy `npm run dev`, mở `/products`, chọn sản phẩm.
3. Chọn màu và size từ biến thể thật. Size hết hàng của màu đang chọn bị khóa.
4. Nhập số lượng trong giới hạn tồn kho; số đã có trong giỏ được trừ khỏi mức có thể thêm.
5. Khi chưa đăng nhập, nút thêm đưa đến login và quay về chi tiết sau khi đăng nhập CUSTOMER.
6. Thêm thành công cập nhật badge Header. Chỉ hiện thông báo thành công sau khi API trả kết quả.
7. Mở `/cart` từ Header: xem ảnh, màu/size, đơn giá, số lượng, thành tiền và tổng tiền từ backend.
8. Nút +/- cập nhật ngay; nhập số trực tiếp cập nhật khi rời ô hoặc nhấn Enter. Đang lưu thì khóa thao tác lặp.
9. Có thể xóa một dòng hoặc xác nhận xóa toàn bộ. Refresh trang vẫn giữ giỏ trong database.
10. Đăng xuất/đổi tài khoản không hiển thị giỏ của tài khoản trước.

Giỏ chỉ dành cho CUSTOMER, ADMIN/STAFF không gọi được API giỏ hàng. Chưa triển khai checkout trong luồng này.

## Cấu trúc

- `types/cart.ts`: contract khớp DTO backend.
- `services/cartService.ts`: dùng `apiClient` chung để gửi token và xử lý refresh token.
- `context/CartContext.tsx`: đồng bộ giỏ/badge, ngăn thao tác lặp và phản hồi cũ ghi đè dữ liệu mới.
- `pages/ProductDetailPage.tsx`: màu/size, ảnh theo biến thể và thêm giỏ thật.
- `pages/CartPage.tsx`: trang được bảo vệ, sửa/xóa/xóa hết và xử lý trạng thái rỗng/lỗi/đang tải.
- `utils/variants.ts`: tìm đúng cặp màu/size, chuẩn hóa XXL/2XL và giới hạn số lượng.

Sử dụng CSS token và component Button, Badge, Breadcrumb, QuantityStepper, Modal có sẵn.
Ảnh lấy từ API; không thay lỗi API bằng dữ liệu mẫu. Các thao tác từ chối do tồn kho hiển thị lỗi và tải lại dữ liệu.
Tổng tiền là tiền sản phẩm, chưa có phí giao hàng. Các thay đổi trong giỏ không tạo đơn hàng.

Kiểm tra trước khi push:

```sh
node --test tests/catalog.test.mjs tests/variants.test.mjs
npm run build
npm run lint
```

Các unit test Node sử dụng Node 22.18+. Backend phải có các trường CartItemResponse mới để hiển thị tồn kho.
Giữ `.env` cục bộ theo `.env.example`; không commit hoặc push thông tin kết nối thật.
