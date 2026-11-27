# KỊCH BẢN TEST END-TO-END (E2E) TRÊN GIAO DIỆN FE — NGHIỆP VỤ TRẢ HÀNG & HOÀN TIỀN

> **Căn cứ nghiệp vụ:** [NGHIEP_VU_DOI_TRA_HANG_THUC_TE.md](./NGHIEP_VU_DOI_TRA_HANG_THUC_TE.md)  
> **Mục tiêu:** 10 kịch bản đầu–cuối (từ lúc **Khách hàng tạo đơn hàng gốc** đến khi **kết thúc hoàn toàn phiếu trả hàng**) giúp tester kiểm thử đầy đủ **8/8 trạng thái** và các tình huống thực tế thường gặp nhất trên giao diện FE.

---

## MỤC LỤC & MA TRẬN PHỦ TRẠNG THÁI

| Mã | Tên kịch bản | Luồng vận chuyển | Trạng thái đi qua |
| :---: | :--- | :--- | :--- |
| **TC01** | Khách **Đổi ý** trả toàn bộ đơn (COD) — trừ phí ship, hoàn tiền & nhập kho bán lại | GHN + thao tác Admin | `Chờ duyệt` → `Chờ nhận hàng trả` → `Đang kiểm tra hàng` → `Chờ hoàn tiền` → `Đã hoàn tiền` |
| **TC02** | Sản phẩm **Lỗi / Giao sai** — Shop chịu 100% phí ship, phân loại hàng lỗi (không nhập bán lại) | GHN + thao tác Admin | `Chờ duyệt` → `Chờ nhận hàng trả` → `Đang kiểm tra hàng` → `Chờ hoàn tiền` → `Đã hoàn tiền` |
| **TC03** | **Bất đồng ý kiến:** Khách báo Lỗi nhưng kho kiểm tra không lỗi → Chuyển sang **Đổi ý** | GHN + thao tác Admin | `Chờ duyệt` → `Chờ nhận hàng trả` → `Đang kiểm tra hàng` → `Chờ khách phản hồi` → `Chờ hoàn tiền` → `Đã hoàn tiền` |
| **TC04** | **Chấp nhận trả hàng một phần** (1 áo đạt chuẩn hoàn tiền + 1 áo bẩn gửi trả ngược qua CSKH) | GHN + Nhật ký CSKH | `Chờ duyệt` → `Chờ nhận hàng trả` → `Đang kiểm tra hàng` → `Chờ khách phản hồi` → `Chờ hoàn tiền` → `Đã hoàn tiền` (1 phần) → Đóng hồ sơ |
| **TC05** | **Trả nhiều lần** trên cùng 1 đơn có **Voucher giảm giá toàn đơn** & chặn vượt số lượng | GHN + thao tác Admin | `Chờ duyệt` → `Chờ nhận hàng trả` → `Đang kiểm tra hàng` → `Chờ hoàn tiền` → `Đã hoàn tiền` (đồng bộ 100% đơn gốc) |
| **TC06** | Khách **tự mang hàng ra cửa hàng** (Bỏ qua GHN — phí ship chiều về = 0đ) | **Bỏ qua GHN** | `Chờ duyệt` → `Chờ nhận hàng trả` → `Đang kiểm tra hàng` → `Chờ hoàn tiền` → `Đã hoàn tiền` |
| **TC07** | Khách **Chỉnh sửa phiếu** trước duyệt, **Hủy phiếu** trước bàn giao & **Khóa hủy** sau bàn giao | GHN + thao tác Admin | `Chờ duyệt` → `Chờ nhận hàng trả` → `Đã hủy` → (Tạo lại) `Chờ duyệt` → `Chờ nhận hàng trả` (Đã bàn giao) |
| **TC08** | Nhân viên **Từ chối yêu cầu** ngay tại Bước duyệt & giải phóng lại số lượng | Không phát sinh vận đơn | `Chờ duyệt` → `Bị từ chối` |
| **TC09** | **Phí ship chiều về > Giá trị sản phẩm** (Đổi ý) — Chặn hoàn tiền âm | Chưa đặt chuyến lấy hàng | `Chờ duyệt` → `Chờ khách phản hồi` → `Đã hủy` |
| **TC10** | **Gia hạn bàn giao +3 ngày** (lỗi shipper) & **Khách không phản hồi** (lưu kho, xử lý lại mã cũ) | GHN + Gia hạn + CSKH | `Chờ duyệt` → `Chờ nhận hàng trả` (Gia hạn) → `Đang kiểm tra hàng` → `Chờ khách phản hồi` (Lưu kho) → Xử lý tiếp trên mã cũ |

---

## CHUẨN BỊ CHUNG TRƯỚC KHI TEST

- [ ] **Tài khoản Khách hàng (Customer):** Đã đăng nhập trên 1 trình duyệt/tab riêng, có sẵn địa chỉ nhận hàng trong Sổ địa chỉ (đầy đủ Tỉnh/Thành phố, Phường/Xã, SĐT).
- [ ] **Tài khoản Nhân viên / Quản trị (Admin):** Đã đăng nhập trên trình duyệt/tab ẩn danh khác để thao tác duyệt đơn, xác nhận giao hàng, kiểm định kho và hoàn tiền.
- [ ] **Tệp ảnh test chuẩn bị sẵn:**
  - 2–3 ảnh hợp lệ (`JPG/PNG/WebP`, dung lượng < 5 MB) để đính kèm khi báo lỗi sản phẩm và tải ảnh chứng từ chuyển khoản hoàn tiền.
  - 1 tệp ảnh không hợp lệ (> 5 MB hoặc định dạng khác như `.pdf`/`.txt`) để test kiểm tra lỗi tải ảnh ở TC02.
- [ ] **Thông tin ngân hàng nhận hoàn tiền (test):** Tên ngân hàng, Số tài khoản, Tên chủ tài khoản.

---

## TC01: Luồng chuẩn — Khách ĐỔI Ý trả toàn bộ đơn (COD, trừ phí ship chiều về, nhập kho bán lại)

**Mục tiêu kiểm thử:** Đi trọn vẹn 6 bước quy trình chuẩn cho lý do `Đổi ý`, kiểm tra tính đúng tiền hoàn (không hoàn phí ship ban đầu, khấu trừ phí ship chiều về), tạo VietQR, bắt buộc tải ảnh chứng từ, tự sinh mã `REFUND-...`, đồng bộ đơn gốc thành `Đã trả hàng / Đã hoàn tiền` và tăng tồn kho bán lại đúng 1 lần.

### Các bước thực hiện

- [ ] **Bước 1 — [Khách hàng] Tạo đơn hàng gốc:**
  - Chọn 1 sản phẩm (VD: Áo giá `200.000đ`), ghi nhớ số lượng tồn kho hiện tại.
  - Đặt hàng với phương thức thanh toán **COD** (có phát sinh phí giao hàng ban đầu, VD: `20.000đ`, tổng đơn `220.000đ`).
  - *Kết quả kỳ vọng:* Đơn hàng được tạo thành công.

- [ ] **Bước 2 — [Admin] Giao đơn hàng gốc thành công:**
  - Mở trang quản lý đơn hàng Admin, chuyển trạng thái đơn hàng gốc lần lượt đến **Đã giao hàng thành công**.
  - *Kết quả kỳ vọng:* Đơn gốc ở trạng thái hoàn tất giao hàng; trên giao diện Khách hàng xuất hiện nút/chức năng **Yêu cầu trả hàng** (trong hạn 7 ngày).

- [ ] **Bước 3 — [Khách hàng] Gửi yêu cầu trả hàng (Lý do: Đổi ý):**
  - Vào chi tiết đơn hàng vừa giao, bấm tạo yêu cầu trả hàng cho toàn bộ sản phẩm (`1 chiếc`).
  - Chọn lý do **Đổi ý (Không ưng ý / Không vừa)**, nhập mô tả ngắn và đính kèm **tối thiểu 1 ảnh minh chứng** hợp lệ (`JPG/JPEG/PNG/WebP`, ≤ 5 MB).
  - Kiểm tra địa chỉ lấy hàng (chọn từ sổ địa chỉ hoặc giữ mặc định theo đơn gốc) và thông tin người bàn giao, nhập thông tin tài khoản ngân hàng nhận tiền hoàn (Tên ngân hàng, Số TK, Tên chủ TK), bấm gửi.
  - *Trạng thái phiếu:* **`Chờ duyệt`**.
  - *Kết quả kỳ vọng:* Tồn kho sản phẩm **chưa tăng**.

- [ ] **Bước 4 — [Admin] Duyệt yêu cầu & Tạo đơn thu gom GHN:**
  - Mở phiếu trả hàng, kiểm tra thông tin hợp lệ và bấm **Duyệt** (không tích bỏ qua GHN).
  - *Trạng thái phiếu:* **`Chờ nhận hàng trả`** *(giai đoạn trước khi bàn giao shipper)*.
  - *Kết quả kỳ vọng:* Hệ thống lưu đơn vị vận chuyển, mã vận đơn chiều hoàn (thật hoặc mô phỏng) và ghi nhận cước phí chiều về dự kiến (VD: `25.000đ` hoặc `30.000đ` nếu chạy dự phòng).

- [ ] **Bước 5 — [Admin] Xác nhận Khách đã bàn giao hàng cho Shipper:**
  - Trên trang quản trị phiếu trả hàng, thực hiện thao tác thủ công **Xác nhận đã bàn giao cho đơn vị vận chuyển**.
  - *Trạng thái phiếu:* Vẫn là **`Chờ nhận hàng trả`**, nhưng ghi nhận rõ **thời điểm bàn giao** và tiến độ **Đang vận chuyển về kho**.
  - *Kết quả kỳ vọng:* Tuyệt đối **chưa cho hoàn tiền**; bên giao diện Khách hàng nút **Hủy yêu cầu** đã bị ẩn/khóa.

- [ ] **Bước 6 — [Admin] Xác nhận Shipper đã giao hàng về kho:**
  - Thực hiện thao tác thủ công **Xác nhận hàng đã về kho**.
  - *Trạng thái phiếu:* **`Đang kiểm tra hàng`**.
  - *Kết quả kỳ vọng:* Ghi nhận thời điểm nhận kho; vẫn **chưa tự động hoàn tiền**.

- [ ] **Bước 7 — [Admin] Kiểm định chất lượng tại kho (Đạt chuẩn):**
  - Mở phiếu, ghi nhận kết quả kiểm định: sản phẩm nguyên vẹn, còn tem mác, **Đạt chuẩn**.
  - Không nhập đè phí ship chiều về để kiểm tra hệ thống **tự động kế thừa** đúng mức cước GHN đã ghi nhận ở Bước 4.
  - Kiểm tra số tiền hoàn dự kiến = `Giá sản phẩm (200.000đ) - Phí ship chiều về (VD: 25.000đ) = 175.000đ` (**không hoàn** `20.000đ` phí giao hàng ban đầu).
  - Lưu kết quả kiểm định.
  - *Trạng thái phiếu:* Chuyển sang **`Chờ hoàn tiền`** (hoặc **`Chờ khách phản hồi`** nếu luồng yêu cầu khách bấm xác nhận đồng ý mức phí trừ/tài khoản trước — khi đó sang tab Khách hàng bấm **Đồng ý** để phiếu chuyển sang **`Chờ hoàn tiền`**).

- [ ] **Bước 8 — [Admin] Thực hiện hoàn tiền (VietQR + Chứng từ chuyển khoản):**
  - Mở màn hình hoàn tiền của phiếu: kiểm tra mã **VietQR** hiển thị đúng ngân hàng, số tài khoản, đúng số tiền `175.000đ` và mã phiếu.
  - Thử bấm xác nhận hoàn tiền khi **chưa tải ảnh chứng từ** → Hệ thống phải chặn và yêu cầu bắt buộc tải ảnh.
  - Kiểm tra không có ô cho nhập tay mã giao dịch hoàn tiền.
  - Tải lên 1 ảnh chụp màn hình giao dịch hợp lệ (`JPG/PNG/WebP`, ≤ 5 MB), bấm **Xác nhận đã hoàn tiền**.
  - *Trạng thái phiếu:* **`Đã hoàn tiền`**.
  - *Kết quả kỳ vọng:*
    - Hệ thống tự sinh mã giao dịch định dạng `REFUND-<YYYYMMDD>-<RETURN_CODE_SHORT>-<RAND6>`.
    - **Đồng bộ đơn hàng gốc:** Vì đã hoàn 100% sản phẩm trong đơn, đơn hàng gốc tự động chuyển trạng thái sang **Đã trả hàng** và thanh toán sang **Đã hoàn tiền**.

- [ ] **Bước 9 — [Admin] Phân loại hàng hóa & Nhập kho bán lại:**
  - Thực hiện thao tác phân loại sản phẩm đạt chuẩn → **Nhập kho bán lại**.
  - Thử kiểm tra nút nhập kho sau khi đã nhập xong (không thể bấm nhập lặp để tăng tồn kho ảo).
  - *Kết quả kỳ vọng:* Tồn kho sản phẩm tăng thêm **đúng +1** so với sau khi mua.

---

## TC02: Luồng chuẩn — Sản phẩm LỖI / GIAO SAI (Shop chịu 100% phí ship chiều về, không nhập lại kệ bán)

**Mục tiêu kiểm thử:** Kiểm tra bắt buộc ảnh minh chứng (và validate kích thước/định dạng ảnh), chính sách shop chịu 100% phí ship chiều về (`0đ`), hoàn tiền qua chuyển khoản ngân hàng áp dụng thống nhất (kể cả đơn thanh toán online), và phân loại **Hàng lỗi** không cộng lại vào tồn kho bán.

### Các bước thực hiện

- [ ] **Bước 1 — [Khách hàng] Tạo đơn hàng gốc:**
  - Đặt 1 sản phẩm giá `300.000đ`, phí ship ban đầu `25.000đ` (có thể chọn thanh toán VNPay/Online hoặc COD). Ghi nhớ số lượng tồn kho hiện tại.

- [ ] **Bước 2 — [Admin] Chuyển đơn hàng gốc sang Đã giao hàng thành công.**

- [ ] **Bước 3 — [Khách hàng] Tạo yêu cầu trả hàng (Lý do: Sản phẩm bị lỗi / Giao sai):**
  - Chọn sản phẩm cần trả, chọn lý do **Sản phẩm bị lỗi từ nhà sản xuất** (hoặc **Cửa hàng giao sai sản phẩm**), nhập mô tả lỗi (VD: "Bung đường may tay áo").
  - **Test validate ảnh:**
    - Thử bấm gửi khi **chưa đính kèm ảnh** → Hệ thống báo lỗi bắt buộc có ảnh.
    - Thử tải 1 tệp sai định dạng hoặc > 5 MB → Hệ thống báo lỗi rõ ràng, không hiển thị như tải thành công.
  - Tải 2 ảnh lỗi hợp lệ (`JPG/PNG/WebP`, ≤ 5 MB), nhập thông tin tài khoản ngân hàng nhận tiền, bấm gửi.
  - *Trạng thái phiếu:* **`Chờ duyệt`**.

- [ ] **Bước 4 — [Admin] Duyệt yêu cầu:**
  - Xem ảnh lỗi khách gửi, bấm **Duyệt** (tạo đơn thu gom GHN mặc định).
  - *Trạng thái phiếu:* **`Chờ nhận hàng trả`**.
  - *Kết quả kỳ vọng:* Hệ thống vẫn tạo vận đơn GHN và lưu cước thực tế nội bộ, nhưng **phí vận chuyển trả hàng tính cho khách = `0 đồng`**.

- [ ] **Bước 5 — [Admin] Xác nhận đã bàn giao cho Shipper → Xác nhận đã nhận hàng về kho:**
  - Lần lượt bấm **Xác nhận bàn giao** (`Chờ nhận hàng trả` - Đang vận chuyển) rồi **Xác nhận nhận kho**.
  - *Trạng thái phiếu:* **`Đang kiểm tra hàng`**.

- [ ] **Bước 6 — [Admin] Kiểm định tại kho (Xác nhận đúng lỗi):**
  - Xác nhận sản phẩm đúng bị lỗi như khách báo (không dùng chính lỗi bung đường may để từ chối).
  - Phí ship chiều về tính cho khách giữ nguyên **`0 đồng`**.
  - Số tiền hoàn = đúng **`300.000đ`** (không hoàn `25.000đ` phí giao hàng ban đầu, không trừ phí gửi trả).
  - *Trạng thái phiếu:* **`Chờ hoàn tiền`**.

- [ ] **Bước 7 — [Admin] Hoàn tiền qua chuyển khoản ngân hàng:**
  - Kiểm tra VietQR hiển thị đúng `300.000đ`, tải ảnh chứng từ chuyển khoản, xác nhận hoàn tiền.
  - *Trạng thái phiếu:* **`Đã hoàn tiền`**; đơn gốc đồng bộ **Đã trả hàng / Đã hoàn tiền**.

- [ ] **Bước 8 — [Admin] Phân loại hàng lỗi / hỏng:**
  - Ghi nhận phân loại sản phẩm vào nhóm **Hàng lỗi / hỏng** (chuyển khu vực bảo hành/tiêu hủy, không bán lại).
  - *Kết quả kỳ vọng:* Số lượng tồn kho bán trên website **KHÔNG tăng thêm**.

---

## TC03: Bất đồng ý kiến — Khách báo HÀNG LỖI nhưng kho kiểm tra KHÔNG THẤY LỖI → Khách đồng ý chuyển sang ĐỔI Ý

**Mục tiêu kiểm thử:** Kiểm thử đúng luồng phản hồi 2 chiều qua trạng thái `Chờ khách phản hồi`: Shop gửi bằng chứng giải thích không thấy lỗi → Đề xuất chuyển diện `Đổi ý` (trừ phí ship chiều về kế thừa từ GHN) → Khách xác nhận đồng ý → Shop hoàn tiền & nhập kho bán lại.

### Các bước thực hiện

- [ ] **Bước 1 — [Khách hàng] Tạo đơn hàng gốc** (1 sản phẩm giá `250.000đ`, phí ship `20.000đ`).

- [ ] **Bước 2 — [Admin] Chuyển đơn gốc sang Đã giao hàng thành công.**

- [ ] **Bước 3 — [Khách hàng] Gửi yêu cầu trả hàng với lý do Hàng lỗi:**
  - Chọn lý do **Sản phẩm bị lỗi**, mô tả lỗi, đính kèm 1 ảnh hợp lệ, bấm gửi.
  - *Trạng thái phiếu:* **`Chờ duyệt`**.

- [ ] **Bước 4 — [Admin] Duyệt yêu cầu (Tạo đơn GHN):**
  - Bấm **Duyệt**. Vì khách chọn `Hàng lỗi`, cước GHN được lưu trên hệ thống nhưng phí tính cho khách ban đầu là `0đ`.
  - *Trạng thái phiếu:* **`Chờ nhận hàng trả`**.

- [ ] **Bước 5 — [Admin] Xác nhận bàn giao Shipper → Xác nhận nhận hàng về kho:**
  - Bấm **Xác nhận bàn giao** → Bấm **Xác nhận nhận kho**.
  - *Trạng thái phiếu:* **`Đang kiểm tra hàng`**.

- [ ] **Bước 6 — [Admin] Kho kiểm định không thấy lỗi & Gửi đề xuất chuyển sang Đổi ý:**
  - Mở form kiểm định: ghi nhận thực tế **không phát hiện lỗi**, sản phẩm còn nguyên tem mác.
  - Đính kèm ảnh/ghi chú đối chứng giải thích rõ cho khách, chọn phương án đề xuất **Chuyển sang diện Đổi ý** (hệ thống tự kế thừa cước phí chiều về từ GHN ở Bước 4, VD: `30.000đ`, tiền hoàn dự kiến còn `220.000đ`).
  - Gửi thông báo kết quả cho khách hàng.
  - *Trạng thái phiếu:* **`Chờ khách phản hồi`**.
  - *Kết quả kỳ vọng:* Tuyệt đối **chưa tự ý trừ phí hay hoàn tiền** khi khách chưa xác nhận đồng ý.

- [ ] **Bước 7 — [Khách hàng] Xem phản hồi của Shop & Xác nhận đồng ý:**
  - Vào chi tiết phiếu trả hàng, xem ảnh/lý do giải thích và mức tiền hoàn sau khi trừ cước (`220.000đ`).
  - Cung cấp/xác nhận thông tin tài khoản ngân hàng (nếu chưa có) và bấm **Đồng ý phương án chuyển sang Đổi ý**.
  - *Trạng thái phiếu:* **`Chờ hoàn tiền`**.
  - *Kết quả kỳ vọng:* Lưu lại xác nhận của khách; vẫn giữ nguyên ngày tạo yêu cầu ban đầu (không bắt khách tạo lại phiếu).

- [ ] **Bước 8 — [Admin] Thực hiện hoàn tiền & Nhập kho bán lại:**
  - Quét VietQR `220.000đ`, tải ảnh chứng từ chuyển khoản, xác nhận hoàn tiền → **`Đã hoàn tiền`**.
  - Vì sản phẩm không lỗi và còn mới nguyên mác, thực hiện **Nhập kho bán lại** (+1 tồn kho).

---

## TC04: Chấp nhận trả hàng MỘT PHẦN trong cùng 1 phiếu (1 món đạt chuẩn hoàn tiền + 1 món bẩn gửi trả ngược qua CSKH)

**Mục tiêu kiểm thử:** Kiểm tra xử lý tách bạch từng sản phẩm trong cùng 1 phiếu: hoàn tiền phần đạt chuẩn sau khi khách xác nhận, nhưng **không tự đóng toàn bộ phiếu** và **không đổi đơn gốc thành Đã trả hàng** khi món không đạt chuẩn vẫn đang giữ ở kho chờ gửi trả ngược.

### Các bước thực hiện

- [ ] **Bước 1 — [Khách hàng] Tạo đơn hàng gốc gồm 2 sản phẩm** (VD: 2 chiếc áo, mỗi chiếc `200.000đ`, tổng tiền hàng `400.000đ`).

- [ ] **Bước 2 — [Admin] Chuyển đơn gốc sang Đã giao hàng thành công.**

- [ ] **Bước 3 — [Khách hàng] Tạo 1 phiếu trả hàng cho cả 2 sản phẩm** (lý do `Đổi ý`, nhập thông tin TK ngân hàng).
  - *Trạng thái phiếu:* **`Chờ duyệt`**.

- [ ] **Bước 4 — [Admin] Duyệt → Xác nhận bàn giao → Xác nhận nhận kho:**
  - Lần lượt chuyển phiếu qua **`Chờ nhận hàng trả`** → **`Đang kiểm tra hàng`**.

- [ ] **Bước 5 — [Admin] Kiểm định: Chấp nhận 1 món, Từ chối 1 món:**
  - Ghi nhận kết quả chi tiết từng món:
    - Món 1: **Đạt chuẩn** (được hoàn tiền).
    - Món 2: **Không đạt chuẩn** (bị ố bẩn / cắt tem mác) — đính kèm ảnh chụp biên bản, đề xuất gửi trả ngược hàng cho khách (khách chịu phí gửi ngược).
  - Gửi kết quả và số tiền hoàn phần hợp lệ cho khách xác nhận.
  - *Trạng thái phiếu:* **`Chờ khách phản hồi`**.

- [ ] **Bước 6 — [Khách hàng] Xác nhận đồng ý phương án trả một phần:**
  - Xem kết quả từng món và số tiền được hoàn cho Món 1, bấm **Đồng ý**.
  - *Trạng thái phiếu:* Chuyển sang **`Chờ hoàn tiền`** cho phần hợp lệ (đồng thời vẫn theo dõi riêng Món 2 chưa gửi trả ngược).

- [ ] **Bước 7 — [Admin] Hoàn tiền cho Món 1:**
  - Tải ảnh chứng từ chuyển khoản đúng số tiền của Món 1, xác nhận hoàn tiền.
  - *Kết quả kỳ vọng:*
    - Ghi nhận khoản hoàn thành công cho Món 1 (`Đã hoàn tiền` cho phần hợp lệ).
    - **Đơn hàng gốc giữ nguyên trạng thái đã giao** (KHÔNG chuyển sang `Đã trả hàng` vì mới hoàn 1/2 đơn).
    - **Phiếu chưa kết thúc hoàn toàn** (chưa tính mốc lưu lịch sử 5 năm) vì Món 2 vẫn đang ở kho.

- [ ] **Bước 8 — [Admin] Ghi Nhật ký CSKH gửi trả ngược Món 2 & Đóng hoàn tất hồ sơ:**
  - Mở mục **Nhật ký CSKH** trên phiếu trả hàng, ghi nhận thỏa thuận phí gửi ngược, mã vận đơn gửi ngược (ngoài luồng GHN chiều hoàn tự động) và xác nhận khi khách đã nhận lại Món 2.
  - Bấm **Đóng hoàn tất hồ sơ**.
  - Thực hiện **Nhập kho bán lại** chỉ cho Món 1 (+1 tồn kho); Món 2 bị từ chối **không cộng** vào số lượng đã trả thành công.

---

## TC05: Trả hàng NHIỀU LẦN trên cùng 1 đơn có VOUCHER giảm giá toàn đơn & Kiểm soát giới hạn số lượng

**Mục tiêu kiểm thử:** Kiểm tra nguyên tắc phân bổ voucher theo tỷ lệ giá trị từng món (không chia đều cho món khác giá), cho phép gửi nhiều phiếu trả song song trong cùng đơn, chặn vượt quá số lượng đã mua, và tự động đồng bộ đơn gốc khi tổng các phiếu hoàn đạt 100%.

### Các bước thực hiện

- [ ] **Bước 1 — [Khách hàng] Tạo đơn hàng gốc có áp dụng Voucher toàn đơn:**
  - Thêm vào giỏ 2 món khác giá trị: **Món A giá `200.000đ`** (số lượng 1) và **Món B giá `100.000đ`** (số lượng 1). Tổng tiền hàng = `300.000đ`.
  - Áp dụng **Voucher giảm toàn đơn `30.000đ`** (tỷ lệ phân bổ: Món A chiếm 2/3 giảm `20.000đ` → thực trả **`180.000đ`**; Món B chiếm 1/3 giảm `10.000đ` → thực trả **`90.000đ`**).
  - Hoàn tất đặt đơn.

- [ ] **Bước 2 — [Admin] Chuyển đơn gốc sang Đã giao hàng thành công.**

- [ ] **Bước 3 — [Khách hàng] Tạo Phiếu trả số 1 cho Món A:**
  - Chọn trả **Món A** (lý do `Hàng lỗi`, kèm ảnh để miễn phí ship cho dễ đối chiếu số tiền hoàn).
  - *Trạng thái Phiếu 1:* **`Chờ duyệt`**.

- [ ] **Bước 4 — [Khách hàng] Trong lúc Phiếu 1 chưa xử lý xong, tạo tiếp Phiếu trả số 2 cho Món B:**
  - Vào lại chính đơn hàng đó, tạo yêu cầu trả **Món B** (lý do `Hàng lỗi`, kèm ảnh).
  - *Kết quả kỳ vọng:* Hệ thống **cho phép tạo độc lập** Phiếu 2 mà không bắt đợi Phiếu 1 xong.
  - *Trạng thái Phiếu 2:* **`Chờ duyệt`**.

- [ ] **Bước 5 — [Khách hàng] Kiểm tra chặn vượt số lượng đã mua:**
  - Thử bấm tạo thêm yêu cầu trả hàng lần thứ 3 cho Món A hoặc Món B trên đơn đó.
  - *Kết quả kỳ vọng:* Hệ thống **chặn / không còn sản phẩm khả dụng** vì `đã trả + đang yêu cầu trả = số lượng đã mua`.

- [ ] **Bước 6 — [Admin] Xử lý trọn vẹn Phiếu 1 (Món A):**
  - Duyệt → Xác nhận bàn giao → Xác nhận nhận kho → Kiểm định đạt → Hoàn tiền (tải chứng từ).
  - *Kết quả kỳ vọng:*
    - Số tiền hoàn Phiếu 1 là chính xác **`180.000đ`** (không phải `200.000đ` và không chia đều voucher thành `185.000đ`).
    - Món B giữ lại không bị truy thu ưu đãi.
    - Đơn hàng gốc **chưa đổi** sang `Đã trả hàng` vì Món B chưa hoàn tiền xong.

- [ ] **Bước 7 — [Admin] Xử lý trọn vẹn Phiếu 2 (Món B):**
  - Duyệt → Xác nhận bàn giao → Xác nhận nhận kho → Kiểm định đạt → Hoàn tiền (tải chứng từ).
  - *Kết quả kỳ vọng:*
    - Số tiền hoàn Phiếu 2 là chính xác **`90.000đ`**.
    - Tổng số lượng đã hoàn trên cả 2 phiếu đạt **100% đơn hàng gốc** → Đơn hàng gốc tự động đồng bộ thành **Đã trả hàng** và **Đã hoàn tiền**.

---

## TC06: Khách tự mang hàng đến trả trực tiếp tại cửa hàng (Bỏ qua GHN — Phí ship chiều về = 0đ)

**Mục tiêu kiểm thử:** Kiểm tra tùy chọn **Bỏ qua tạo đơn GHN** khi duyệt phiếu: không sinh mã vận đơn GHN, phí vận chuyển chiều về = `0đ` (kể cả khi lý do là `Đổi ý`), và toàn bộ bước bàn giao/nhận kho thực hiện bằng thao tác thủ công của nhân viên.

### Các bước thực hiện

- [ ] **Bước 1 — [Khách hàng] Tạo đơn hàng gốc** (1 sản phẩm giá `200.000đ`).

- [ ] **Bước 2 — [Admin] Chuyển đơn gốc sang Đã giao hàng thành công.**

- [ ] **Bước 3 — [Khách hàng] Gửi yêu cầu trả hàng (Lý do: Đổi ý):**
  - Ghi chú trong mô tả: "Khách tự mang hàng đến trả trực tiếp tại cửa hàng", nhập TK ngân hàng, bấm gửi.
  - *Trạng thái phiếu:* **`Chờ duyệt`**.

- [ ] **Bước 4 — [Admin] Duyệt yêu cầu & Chọn Bỏ qua GHN:**
  - Khi duyệt phiếu, tích chọn **Bỏ qua tạo đơn GHN (Khách tự mang đến shop)** và xác nhận duyệt.
  - *Trạng thái phiếu:* **`Chờ nhận hàng trả`**.
  - *Kết quả kỳ vọng:* Phiếu **không tạo mã vận đơn GHN**; phí vận chuyển trả hàng = **`0 đồng`**.

- [ ] **Bước 5 — [Admin] Khách mang hàng tới quầy → Xác nhận bàn giao & Nhận kho thủ công:**
  - Bấm **Xác nhận bàn giao thủ công** → Bấm **Xác nhận nhận kho thủ công**.
  - *Trạng thái phiếu:* **`Đang kiểm tra hàng`**.

- [ ] **Bước 6 — [Admin] Kiểm định đạt chuẩn → Hoàn tiền đủ `200.000đ` → Nhập kho bán lại:**
  - Kiểm định đạt chuẩn (phí ship chiều về vẫn giữ `0đ`), chuyển sang **`Chờ hoàn tiền`**.
  - Tải ảnh chứng từ chuyển khoản đúng **`200.000đ`**, xác nhận → **`Đã hoàn tiền`**.
  - Phân loại đạt chuẩn & **Nhập kho bán lại** (+1 tồn kho).

---

## TC07: Khách CHỈNH SỬA phiếu trước khi duyệt, HỦY phiếu trước bàn giao & KHÓA HỦY sau bàn giao

**Mục tiêu kiểm thử:** Kiểm tra đầy đủ quyền chỉnh sửa và hủy của khách hàng theo đúng mốc trạng thái, kiểm tra cơ chế giải phóng số lượng sau khi hủy, và khóa nút tự hủy ngay khi shipper đã nhận hàng.

### Các bước thực hiện

- [ ] **Bước 1 — [Khách hàng] Tạo đơn hàng gốc** (1 sản phẩm, số lượng `2 chiếc`).

- [ ] **Bước 2 — [Admin] Chuyển đơn gốc sang Đã giao hàng thành công.**

- [ ] **Bước 3 — [Khách hàng] Tạo yêu cầu trả hàng cho 1 chiếc:**
  - Chọn trả `1 chiếc`, lý do `Đổi ý`, bấm gửi.
  - *Trạng thái phiếu:* **`Chờ duyệt`**.

- [ ] **Bước 4 — [Khách hàng] Chỉnh sửa yêu cầu khi Shop chưa duyệt:**
  - Mở lại phiếu đang `Chờ duyệt`, bấm **Chỉnh sửa**: đổi số lượng thành `2 chiếc` (hoặc đổi lý do / cập nhật lại địa chỉ lấy hàng), bấm lưu.
  - *Kết quả kỳ vọng:* Hệ thống cho phép lưu thành công thông tin mới trên chính phiếu đó.

- [ ] **Bước 5 — [Admin] Duyệt yêu cầu:**
  - Bấm **Duyệt** phiếu.
  - *Trạng thái phiếu:* **`Chờ nhận hàng trả`** *(chưa bàn giao shipper)*.

- [ ] **Bước 6 — [Khách hàng] Kiểm tra khóa Chỉnh sửa & thực hiện Hủy yêu cầu trước khi bàn giao:**
  - Mở phiếu: kiểm tra nút **Chỉnh sửa** đã bị ẩn/khóa; nút **Hủy yêu cầu** vẫn hoạt động.
  - Bấm **Hủy yêu cầu** và xác nhận.
  - *Trạng thái phiếu:* **`Đã hủy`**.

- [ ] **Bước 7 — [Khách hàng] Kiểm tra giải phóng số lượng & Tạo lại phiếu mới:**
  - Quay lại đơn hàng gốc (vẫn trong hạn 7 ngày), bấm tạo yêu cầu trả hàng mới cho `2 chiếc`.
  - *Kết quả kỳ vọng:* Hệ thống đã giải phóng đủ số lượng `2 chiếc`, cho phép tạo phiếu mới thành công (`Chờ duyệt`).

- [ ] **Bước 8 — [Admin] Duyệt phiếu mới & Xác nhận đã bàn giao cho Shipper:**
  - Duyệt (`Chờ nhận hàng trả`) → Bấm **Xác nhận đã bàn giao cho shipper**.

- [ ] **Bước 9 — [Khách hàng] Kiểm tra khóa nút Hủy sau khi đã bàn giao:**
  - Mở lại phiếu mới trên giao diện Khách hàng.
  - *Kết quả kỳ vọng:* Nút **Hủy yêu cầu** đã bị **khóa/ẩn**; hệ thống hướng dẫn khách liên hệ CSKH nếu muốn hỗ trợ thêm.

---

## TC08: Nhân viên TỪ CHỐI yêu cầu ngay tại Bước duyệt & Giải phóng lại số lượng

**Mục tiêu kiểm thử:** Kiểm tra luồng đi trực tiếp tới trạng thái `Bị từ chối` khi hồ sơ không hợp lệ tại Bước 2, bắt buộc nhập lý do rõ ràng hiển thị cho khách, và giải phóng lại số lượng sản phẩm để khách tạo lại nếu còn hạn.

### Các bước thực hiện

- [ ] **Bước 1 — [Khách hàng] Tạo đơn hàng gốc** (1 sản phẩm, số lượng 1).

- [ ] **Bước 2 — [Admin] Chuyển đơn gốc sang Đã giao hàng thành công.**

- [ ] **Bước 3 — [Khách hàng] Tạo yêu cầu trả hàng:**
  - Chọn trả sản phẩm với lý do `Sản phẩm bị lỗi`, nhập mô tả sơ sài hoặc đính kèm ảnh mờ/không đúng sản phẩm.
  - *Trạng thái phiếu:* **`Chờ duyệt`**.

- [ ] **Bước 4 — [Admin] Thẩm định và Từ chối yêu cầu:**
  - Mở phiếu, chọn **Từ chối yêu cầu**.
  - Thử bấm xác nhận khi **chưa nhập lý do từ chối** → Hệ thống bắt buộc nhập lý do.
  - Nhập lý do cụ thể (VD: "Hình ảnh cung cấp không phải sản phẩm thuộc đơn hàng, vui lòng kiểm tra và gửi lại ảnh rõ vị trí lỗi"), bấm xác nhận.
  - *Trạng thái phiếu:* **`Bị từ chối`**.
  - *Kết quả kỳ vọng:* Không sinh vận đơn GHN, không phát sinh giao dịch hoàn tiền, tồn kho không đổi.

- [ ] **Bước 5 — [Khách hàng] Kiểm tra thông báo lý do từ chối & quyền tạo lại yêu cầu:**
  - Mở chi tiết phiếu: thấy rõ trạng thái **`Bị từ chối`** kèm đúng lý do nhân viên đã nhập.
  - Vào lại đơn hàng gốc: kiểm tra số lượng sản phẩm đã được **giải phóng**, khách có thể bấm tạo lại yêu cầu mới hợp lệ (nếu vẫn còn trong hạn 7 ngày).

---

## TC09: Phí ship chiều về CAO HƠN giá trị sản phẩm (Khách Đổi ý) — Chặn hoàn tiền âm

**Mục tiêu kiểm thử:** Kiểm tra quy tắc bảo vệ khách hàng không bao giờ tạo ra số tiền hoàn âm khi khách `Đổi ý` trả món hàng giá trị thấp (VD: `25.000đ` – `30.000đ`) mà cước GHN chiều về (VD: `35.000đ` – `40.000đ`) lớn hơn giá trị hàng.

### Các bước thực hiện

- [ ] **Bước 1 — [Khách hàng] Tạo đơn hàng gốc với sản phẩm giá trị nhỏ:**
  - Chọn 1 phụ kiện / sản phẩm giá thấp (VD: `25.000đ` hoặc giá nhỏ hơn mức cước GHN chiều về dự kiến). Hoàn tất đặt đơn.

- [ ] **Bước 2 — [Admin] Chuyển đơn gốc sang Đã giao hàng thành công.**

- [ ] **Bước 3 — [Khách hàng] Gửi yêu cầu trả hàng với lý do Đổi ý:**
  - Chọn sản phẩm giá nhỏ đó, lý do **Đổi ý**, bấm gửi.
  - *Trạng thái phiếu:* **`Chờ duyệt`**.

- [ ] **Bước 4 — [Admin] Kiểm tra cước dự kiến khi duyệt:**
  - Mở phiếu để thẩm định/duyệt tạo đơn thu gom GHN.
  - *Kết quả kỳ vọng:* Khi cước vận chuyển dự kiến > giá trị món hàng, hệ thống **cảnh báo rõ ràng và chặn duyệt tạo chuyến lấy hàng tự động** (tuyệt đối **không sinh số tiền hoàn âm**, VD `-10.000đ`).

- [ ] **Bước 5 — [Admin & Khách hàng] Trao đổi phương án & Khách quyết định hủy yêu cầu:**
  - Nhân viên liên hệ thông báo mức cước thực tế cho khách (hoặc gửi phản hồi trên phiếu để khách cân nhắc giữ lại hàng / tự mang ra shop).
  - Khách hàng chọn **Hủy yêu cầu** để giữ lại sản phẩm (vì không muốn chịu phí ship lớn hơn giá món đồ).
  - *Trạng thái phiếu:* **`Đã hủy`**.
  - *Kết quả kỳ vọng:* Không phát sinh vận đơn lấy hàng, không phát sinh tiền hoàn âm.

---

## TC10: Gia hạn bàn giao +3 ngày (Lỗi Shipper) & Khách không phản hồi sau kiểm định (Lưu kho, xử lý lại mã cũ)

**Mục tiêu kiểm thử:** Kiểm tra 2 tình huống vận hành thực tế hay phát sinh ở Bước 3 và Bước 4:
1. Shipper không đến lấy đúng hẹn → Shop **gia hạn thêm 3 ngày lịch** (lưu riêng hạn cũ/hạn mới/lý do, không tự đóng đơn).
2. Sau khi kiểm hàng cần khách phản hồi nhưng khách im lặng → Ghi **Nhật ký CSKH**, giữ trạng thái **`Chờ khách phản hồi`** và lưu kho bảo toàn tài sản; khi khách liên hệ lại vẫn xử lý tiếp trên **đúng mã phiếu cũ**.

### Các bước thực hiện

- [ ] **Bước 1 — [Khách hàng] Tạo đơn hàng gốc** (1 sản phẩm giá `220.000đ`).

- [ ] **Bước 2 — [Admin] Chuyển đơn gốc sang Đã giao hàng thành công.**

- [ ] **Bước 3 — [Khách hàng] Tạo yêu cầu trả hàng** (lý do `Đổi ý`, cố tình **chưa điền thông tin tài khoản ngân hàng** hoặc tạo ca cần xác nhận sau kiểm định).
  - *Trạng thái phiếu:* **`Chờ duyệt`**.

- [ ] **Bước 4 — [Admin] Duyệt yêu cầu:**
  - Bấm **Duyệt** (tạo đơn GHN). Ghi nhớ **Hạn bàn giao ban đầu** (7 ngày lịch kể từ lúc duyệt).
  - *Trạng thái phiếu:* **`Chờ nhận hàng trả`**.

- [ ] **Bước 5 — [Admin] Thực hiện Gia hạn thời gian bàn giao (+3 ngày lịch do lỗi Shipper):**
  - Giả lập tình huống shipper quá tải/mưa bão không đến lấy đúng hẹn: bấm chức năng **Gia hạn bàn giao**, nhập lý do (VD: "Bưu cục quá tải, đặt lại lịch shipper lấy hàng").
  - *Kết quả kỳ vọng:*
    - Hạn bàn giao mới = `max(Hạn cũ, Thời điểm xác nhận gia hạn) + 3 ngày lịch`.
    - Lịch sử lưu giữ nguyên cả **hạn cũ**, **hạn mới** và **lý do gia hạn** (không ghi đè mất dấu vết).
    - Phiếu giữ nguyên **`Chờ nhận hàng trả`**, không bị tự động hủy.

- [ ] **Bước 6 — [Admin] Xác nhận bàn giao Shipper → Xác nhận nhận hàng về kho:**
  - Lần lượt bấm **Xác nhận bàn giao** → **Xác nhận nhận kho**.
  - *Trạng thái phiếu:* **`Đang kiểm tra hàng`**.

- [ ] **Bước 7 — [Admin] Kiểm định xong & Gửi yêu cầu khách bổ sung/xác nhận:**
  - Cập nhật kết quả kiểm định và gửi thông báo yêu cầu khách bổ sung tài khoản ngân hàng / xác nhận phương án.
  - *Trạng thái phiếu:* **`Chờ khách phản hồi`**.

- [ ] **Bước 8 — [Admin] Ghi nhận quy trình khi khách chưa phản hồi:**
  - Mở **Nhật ký CSKH**, ghi nhận lịch sử đã gửi tin nhắn nhắc và gọi điện thoại cho khách nhưng chưa liên lạc được; đánh dấu kiện hàng đang **niêm phong lưu kho riêng**.
  - *Kết quả kỳ vọng:* Trạng thái giữ nguyên **`Chờ khách phản hồi`**; hệ thống **không tự động hủy, không tịch thu/thanh lý hàng, không tự hoàn tiền**.

- [ ] **Bước 9 — [Khách hàng & Admin] Khách liên hệ lại & Tiếp tục xử lý trên đúng mã phiếu cũ:**
  - Khách hàng mở lại chính mã phiếu cũ đó, cung cấp đủ thông tin tài khoản ngân hàng và bấm **Xác nhận**.
  - *Trạng thái phiếu:* Chuyển sang **`Chờ hoàn tiền`** (không bắt khách tạo phiếu mới, không từ chối vì quá hạn 7 ngày ban đầu).
  - Admin tải ảnh chứng từ chuyển khoản xác nhận hoàn tiền → **`Đã hoàn tiền`** → Nhập kho bán lại (nếu đạt chuẩn) và hoàn tất hồ sơ.
