# Dashboard quản trị

- Đăng nhập thường hoặc Google bằng ADMIN/STAFF chuyển tới `/admin/dashboard`. Hỗ trợ cả role có tiền tố ROLE_.
- `/admin` chuyển tới `/admin/dashboard`; cả hai được bảo vệ bằng ProtectedRoute.
- Header desktop, menu tài khoản, menu mobile và sidebar AdminLayout có mục Dashboard. Các trang quản lý vẫn giữ URL hiện có.
- `AdminDashboardPage.tsx` chứa phần thống kê sản phẩm, gọi `dashboardService.getProductStatistics()` → `GET /admin/dashboard/products`.
- Loading, lỗi/thử lại, dữ liệu rỗng, làm mới và hủy request khi rời trang đã được xử lý. Không hiển thị số liệu mẫu trong ứng dụng.
- 4 thẻ tổng quan, biểu đồ thanh theo danh mục, cảnh báo hết hàng/tồn thấp và bảng phân trang toàn bộ biến thể cần bổ sung. Bảng cuộn ngang trên mobile.
- Chỉ thống kê sản phẩm trong task này. Thành viên phụ trách đơn hàng/doanh thu/người dùng có thể thêm section/component riêng ở trang Dashboard và endpoint/service riêng tương ứng.

Quy tắc tính từng chỉ số: xem `docs/PRODUCT_DASHBOARD.md` của BE. Kiểm tra FE: `npm run build`.

Dashboard hiện có chọn kỳ 7/30/90 ngày, so sánh sản phẩm tạo mới và lượng giao với kỳ liền trước. Mũi tên, dấu +/- và xanh/đỏ đi cùng nhau; không dùng màu làm dấu hiệu duy nhất. Kỳ trước 0 hiển thị “Mới phát sinh”, kỳ bằng nhau “Không đổi”. Danh mục/tồn kho vẫn là snapshot hiện tại và được ghi rõ.

Top N xếp theo lượng giao thực tế, không dùng điểm đánh giá thay thế lượng bán. Nút hành động mở `/admin/products` với `keyword`, `isActive`, `inStock`; trang quản lý khởi tạo bộ lọc từ query string.

Phần rà soát nhanh gồm một hàng 4 chỉ số có liên kết: sản phẩm hết hàng, biến thể tồn thấp, tồn kho đang ẩn và thiếu ảnh/biến thể.

`StockAlertsTable` gọi API phân trang riêng, 10/20/50 dòng, có tổng số và trang trước/sau. Ưu tiên hết hàng; xem được toàn bộ cảnh báo, không chỉ preview 10 dòng trong API tổng quan. Loading/lỗi/thử lại được xử lý độc lập.

Thẻ xanh “Bổ sung hàng” mở `/admin/products?edit=<productId>&variant=<variantId>&focus=stock`. Thẻ “Tạm ẩn” (chỉ hiện khi hết hàng) dùng `focus=status`. Form lấy lại dữ liệu từ BE, đánh dấu đúng biến thể và focus trường tồn kho hoặc checkbox trạng thái. Chỉ điều hướng, không tự thay đổi tồn kho/trạng thái; người dùng sửa và bấm Lưu thay đổi. Biến thể không còn tồn tại hiện thông báo, không tự chọn biến thể khác.

Nút “Tùy chọn” bên cạnh 7/30/90 mở Từ ngày / Đến ngày và nút Áp dụng. Hỗ trợ khoảng ngày nhiều năm, không giới hạn 365 ngày. Chặn ngày rỗng/không hợp lệ, đảo thứ tự và tương lai ở cả FE và BE. Chọn hôm nay chỉ tính đến thời điểm cập nhật; kỳ trước có cùng thời lượng thực tế. Khi sửa ngày nháp, số liệu cũ vẫn được ghi đúng kỳ đã áp dụng cho đến khi bấm Áp dụng.

Ô Top cho nhập số nguyên 1–100 rồi bấm Xem, mặc định 5. Không gửi request cho 0, âm, thập phân, rỗng hoặc >100. Danh sách dài cuộn riêng; ghi số sản phẩm thực tế / Top yêu cầu, không thêm dữ liệu mẫu khi chưa đủ N sản phẩm. Đổi Top giữ khoảng ngày đã áp dụng.
