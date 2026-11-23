/**
 * Module định nghĩa toàn bộ kiểu dữ liệu (TypeScript Types & Interfaces) cho phân hệ Trả hàng & Hoàn tiền (Return & Refund).
 * Bao gồm 8 trạng thái vòng đời, 3 lý do trả hàng, cấu trúc phân trang Spring Data,
 * các Response DTOs nhận từ Backend và Request DTOs gửi lên Backend.
 */

// ============================================================================
// 1. ENUMS VÀ HẰNG SỐ NGHIỆP VỤ
// ============================================================================

/**
 * 8 trạng thái chuẩn trong vòng đời của một phiếu yêu cầu trả hàng & hoàn tiền.
 */
export type ReturnRequestStatus =
  | 'PENDING_APPROVAL'             // Chờ duyệt
  | 'WAITING_FOR_RETURN_DELIVERY'  // Chờ nhận hàng trả
  | 'INSPECTING'                   // Đang kiểm tra hàng
  | 'WAITING_CUSTOMER_FEEDBACK'    // Chờ khách phản hồi
  | 'WAITING_REFUND'               // Chờ hoàn tiền
  | 'REFUNDED'                     // Đã hoàn tiền
  | 'REJECTED'                     // Bị từ chối
  | 'CANCELLED';                   // Đã hủy

/**
 * 3 lý do hợp lệ khi khách hàng gửi yêu cầu trả hàng.
 */
export type ReturnReason =
  | 'CHANGE_OF_MIND'  // Đổi ý, không còn nhu cầu
  | 'DEFECTIVE'       // Sản phẩm có lỗi do nhà sản xuất
  | 'WRONG_ITEM';     // Shop giao sai mẫu mã/kích thước/màu sắc

// ============================================================================
// 2. CẤU TRÚC PHÂN TRANG SPRING DATA
// ============================================================================

/**
 * Cấu trúc phân trang chuẩn của Spring Data trả về từ Backend (0-indexed).
 */
export interface SpringPage<T> {
  /** Danh sách dữ liệu của trang hiện tại */
  content: T[];
  /** Số thứ tự trang hiện tại (0-indexed: trang đầu tiên là 0) */
  number: number;
  /** Số bản ghi trên mỗi trang */
  size: number;
  /** Tổng số bản ghi thỏa điều kiện trên toàn bộ hệ thống */
  totalElements: number;
  /** Tổng số trang tương ứng */
  totalPages: number;
  /** Cờ đánh dấu đây có phải là trang đầu tiên hay không */
  first: boolean;
  /** Cờ đánh dấu đây có phải là trang cuối cùng hay không */
  last: boolean;
}

// ============================================================================
// 3. DTO PHẢN HỒI (RESPONSE DTOS)
// ============================================================================

/**
 * DTO trả về thông tin một ảnh minh chứng đính kèm trong phiếu trả hàng.
 */
export interface ReturnRequestImageResponse {
  /** Mã định danh ảnh trong DB */
  id: number;
  /** Đường dẫn URL hiển thị ảnh (đã upload trên Cloudinary hoặc máy chủ ảnh) */
  imageUrl: string;
  /** Thời điểm tạo ảnh */
  createdAt?: string;
  /** Thời điểm cập nhật ảnh */
  updatedAt?: string;
}

/**
 * DTO trả về thông tin chi tiết từng dòng sản phẩm trong phiếu trả hàng.
 */
export interface ReturnRequestItemResponse {
  /** Mã định danh dòng yêu cầu trả hàng trong bảng return_request_items */
  id: number;
  /** Mã dòng chi tiết trong đơn hàng gốc (liên kết với OrderItem) */
  orderItemId: number;
  /** Mã biến thể sản phẩm */
  productVariantId: number;
  /** Tên sản phẩm hiển thị */
  productName: string;
  /** Thông tin mô tả biến thể (kích thước, màu sắc...) */
  variantInfo?: string;
  /** Số lượng sản phẩm khách hàng yêu cầu trả */
  quantity: number;
  /** Số lượng sản phẩm được nhân viên QC chấp nhận hoàn tiền sau kiểm định */
  acceptedQuantity?: number | null;
  /** Số lượng sản phẩm đạt chuẩn được phân loại nhập lại kho bán */
  restockedQuantity?: number | null;
  /** Cờ đánh dấu dòng sản phẩm này đã được hoàn tất nhập kho bán lại hay chưa */
  isRestocked?: boolean;
  /** Ghi chú kiểm định chất lượng của nhân viên QC */
  inspectionNote?: string | null;
  /** Số tiền hoàn tính riêng cho dòng sản phẩm này (VND) */
  itemRefundAmount?: number | null;
  /** Thời điểm tạo bản ghi */
  createdAt?: string;
  /** Thời điểm cập nhật bản ghi */
  updatedAt?: string;
}

/**
 * DTO trả về thông tin chi tiết đầy đủ của một phiếu yêu cầu trả hàng & hoàn tiền.
 */
export interface ReturnRequestResponse {
  /** Mã định danh phiếu trả hàng */
  id: number;
  /** Mã phiếu trả hàng hiển thị (ví dụ: RET-20261115-001) */
  returnCode: string;
  /** Mã tài khoản khách hàng tạo phiếu */
  userId: number;
  /** Mã đơn hàng gốc */
  orderId: number;
  /** Mã đơn hàng hiển thị (ví dụ: ORD-20261115-001) */
  orderCode: string;
  /** Lý do trả hàng (CHANGE_OF_MIND, DEFECTIVE, WRONG_ITEM) */
  reason: ReturnReason | string;
  /** Mô tả chi tiết nguyên nhân trả hàng do khách nhập */
  reasonDetail: string;
  /** Trạng thái hiện tại của phiếu trả hàng */
  status: ReturnRequestStatus;

  // --- Các mốc thời gian xử lý vòng đời ---
  /** Thời điểm nhân viên duyệt yêu cầu */
  approvedAt?: string | null;
  /** Thời hạn khách phải bàn giao hàng cho shipper (mặc định 7 ngày sau khi duyệt) */
  handoverDeadline?: string | null;
  /** Thời hạn bàn giao cũ trước khi gia hạn */
  previousHandoverDeadline?: string | null;
  /** Lý do xin gia hạn thời hạn bàn giao */
  extensionReason?: string | null;
  /** Thời điểm khách xác nhận đã bàn giao hàng cho đơn vị vận chuyển */
  handedOverAt?: string | null;
  /** Ghi chú khi bàn giao hàng cho đơn vị vận chuyển */
  handoverNote?: string | null;
  /** Thời điểm bàn giao cho shipper (trường tương thích) */
  handedOverToShipperAt?: string | null;
  /** Thời điểm gửi thông báo nhắc bàn giao */
  handoverReminderSentAt?: string | null;
  /** Thời điểm kho tiếp nhận kiện hàng trả */
  receivedAt?: string | null;
  /** Ghi chú tình trạng kiện hàng khi kho nhận hàng */
  receiveNote?: string | null;
  /** Thời điểm nhân viên kho kiểm định chất lượng sản phẩm xong */
  inspectedAt?: string | null;
  /** Thời điểm gửi kết quả kiểm định cho khách */
  inspectionResultSentAt?: string | null;
  /** Thời điểm khách phản hồi xác nhận phương án */
  customerRespondedAt?: string | null;
  /** Thời điểm gửi nhắc nhở phản hồi phương án */
  feedbackReminderSentAt?: string | null;
  /** Thời điểm hệ thống ghi nhận hồ sơ chạm mốc treo 30 ngày cần rà soát */
  dormantReviewNotifiedAt?: string | null;
  /** Chuỗi nhật ký liên hệ CSKH và niêm phong lưu kho riêng */
  staffContactLog?: string | null;
  /** Thời điểm phiếu đủ điều kiện hoàn tiền */
  refundEligibleAt?: string | null;
  /** Thời điểm kế toán xác nhận đã chuyển khoản hoàn tiền cho khách */
  refundedAt?: string | null;
  /** Thời điểm phương án trả hàng được giải quyết xong */
  resolvedAt?: string | null;
  /** Thời điểm hồ sơ trả hàng được đóng hoàn tất */
  completedAt?: string | null;

  // --- Giám sát quá hạn SLA ---
  /** Cờ đánh dấu phiếu có bị quá hạn cam kết SLA (2 ngày làm việc) hay không */
  isOverdue?: boolean;
  /** Lý do nhân viên giải trình khi xử lý trễ hạn SLA */
  overdueReason?: string | null;
  /** Thời điểm dự kiến hoàn thành mới do nhân viên cam kết lại khi trễ hạn */
  estimatedCompletionAt?: string | null;

  // --- Vận chuyển chiều hoàn & Địa chỉ lấy hàng (GHN) ---
  /** Đơn vị vận chuyển chiều hoàn (ví dụ: GHN; null nếu khách tự gửi) */
  returnShippingProvider?: 'GHN' | string | null;
  /** Mã vận đơn chiều hoàn do GHN cấp */
  returnTrackingCode?: string | null;
  /** Tên người liên hệ khi shipper tới lấy hàng trả */
  pickupContactName?: string | null;
  /** Số điện thoại người liên hệ khi lấy hàng trả */
  pickupPhone?: string | null;
  /** Địa chỉ chi tiết nơi lấy hàng trả */
  pickupAddress?: string | null;
  /** Tên tỉnh/thành phố nơi lấy hàng trả */
  pickupProvinceName?: string | null;
  /** Tên phường/xã nơi lấy hàng trả */
  pickupWardName?: string | null;

  // --- Tài chính & Tài khoản ngân hàng ---
  /** Tổng tiền hoàn của các sản phẩm được duyệt (chưa trừ phí ship nếu có) (VND) */
  itemsRefundAmount?: number | null;
  /** Phí vận chuyển gửi trả hàng do khách chịu (nếu đổi ý) (VND) */
  returnShippingFee?: number | null;
  /** Số tiền thực tế hoàn về tài khoản cho khách (itemsRefundAmount - returnShippingFee) (VND) */
  refundAmount?: number | null;
  /** Tên ngân hàng nhận tiền hoàn */
  bankName?: string | null;
  /** Số tài khoản ngân hàng nhận tiền hoàn */
  accountNumber?: string | null;
  /** Tên trường số tài khoản tương thích ngược */
  bankAccountNumber?: string | null;
  /** Tên chủ tài khoản ngân hàng nhận hoàn tiền */
  accountHolderName?: string | null;
  /** Tên trường chủ tài khoản tương thích ngược */
  bankAccountHolder?: string | null;
  /** Mã giao dịch ngân hàng / số ủy nhiệm chi khi kế toán chuyển khoản */
  refundTransactionCode?: string | null;
  /** Đường dẫn ảnh biên lai chuyển khoản thành công */
  refundProofImageUrl?: string | null;
  /** Đường dẫn ảnh mã VietQR chuyển khoản hoàn tiền cho kế toán quét */
  refundVietQrUrl?: string | null;

  // --- Kết quả thẩm định & Dấu vết nhân sự ---
  /** Lý do từ chối yêu cầu trả hàng (nếu bị REJECTED) */
  rejectionReason?: string | null;
  /** Khách hàng đã xác nhận đồng ý với phương án hay chưa (true: đồng ý, false: không đồng ý) */
  customerConfirmedPlan?: boolean | null;
  /** Cờ đề xuất phân loại lại sang lý do đổi ý (chịu phí ship) sau kiểm định */
  proposedChangeOfMind?: boolean | null;
  /** Ghi chú của khách hàng khi phản hồi phương án */
  customerNote?: string | null;
  /** Thời điểm hoàn tất nhập lại kho bán */
  restockedAt?: string | null;
  /** ID nhân viên duyệt yêu cầu */
  approvedBy?: number | null;
  /** ID nhân viên kiểm định QC */
  inspectedBy?: number | null;
  /** ID nhân viên thực hiện hoàn tiền */
  refundedBy?: number | null;
  /** ID nhân viên nhập kho */
  restockedBy?: number | null;

  // --- Danh sách con & Metadata ---
  /** Danh sách chi tiết các dòng sản phẩm trong phiếu */
  items: ReturnRequestItemResponse[];
  /** Danh sách ảnh minh chứng đính kèm */
  images: ReturnRequestImageResponse[];
  /** Thời điểm tạo yêu cầu (ISO 8601) */
  createdAt: string;
  /** Thời điểm cập nhật yêu cầu gần nhất (ISO 8601) */
  updatedAt: string;
}

/**
 * DTO trả về thông tin một ngày nghỉ lễ áp dụng tính SLA cho giao diện Quản trị.
 */
export interface ReturnRequestHolidayResponse {
  /** Mã ID trong DB (null nếu là 1 trong 6 ngày lễ mặc định hệ thống tự tính) */
  id: number | null;
  /** Ngày nghỉ lễ dương lịch (định dạng YYYY-MM-DD) */
  holidayDate: string;
  /** Tên ngày nghỉ lễ */
  name: string;
  /** Mô tả chi tiết hoặc căn cứ nghỉ lễ */
  description?: string | null;
  /** Cờ đánh dấu ngày lễ mặc định của hệ thống (true = không cho phép sửa/xóa) */
  isDefault: boolean;
}

// ============================================================================
// 4. DTO YÊU CẦU PHÍA KHÁCH HÀNG (CUSTOMER REQUEST DTOS)
// ============================================================================

/**
 * DTO biểu diễn một dòng sản phẩm yêu cầu trả trong payload tạo/sửa phiếu.
 */
export interface ReturnRequestItemRequest {
  /** Mã định danh dòng sản phẩm trong đơn hàng gốc (OrderItem.id) */
  orderItemId: number;
  /** Số lượng sản phẩm khách hàng muốn trả (>= 1) */
  quantity: number;
}

/**
 * DTO gửi lên khi khách hàng tạo mới yêu cầu trả hàng (POST /api/v1/returns).
 */
export interface ReturnRequestCreationRequest {
  /** Mã ID đơn hàng cần trả */
  orderId: number;
  /** Lý do trả hàng (CHANGE_OF_MIND, DEFECTIVE, WRONG_ITEM) */
  reason: ReturnReason | string;
  /** Mô tả chi tiết lý do trả hàng (tối đa 1000 ký tự) */
  reasonDetail: string;
  /** Danh sách sản phẩm muốn trả */
  items: ReturnRequestItemRequest[];
  /** Tên ngân hàng nhận hoàn tiền (tùy chọn) */
  bankName?: string;
  /** Số tài khoản ngân hàng (tùy chọn, nếu có phải gồm 6-30 chữ số) */
  accountNumber?: string;
  /** Tên chủ tài khoản ngân hàng (tùy chọn) */
  accountHolderName?: string;
  /** Mã địa chỉ lấy hàng trong sổ địa chỉ của khách (tùy chọn; bỏ trống sẽ lấy từ đơn gốc) */
  pickupAddressId?: number;
  /** Tên người liên hệ khi lấy hàng (tùy chọn) */
  pickupContactName?: string;
  /** Số điện thoại liên hệ khi lấy hàng (tùy chọn, định dạng SĐT Việt Nam) */
  pickupPhone?: string;
}

/**
 * DTO gửi lên khi khách hàng chỉnh sửa yêu cầu trả hàng (PUT /api/v1/returns/{id}).
 * Lưu ý: Tuyệt đối không có trường orderId để tránh lỗi 400 UNSUPPORTED_FIELD.
 */
export interface ReturnRequestUpdateRequest {
  /** Lý do trả hàng mới */
  reason: ReturnReason | string;
  /** Mô tả chi tiết lý do mới */
  reasonDetail: string;
  /** Danh sách sản phẩm muốn trả sau khi sửa */
  items: ReturnRequestItemRequest[];
  /** Tên ngân hàng nhận hoàn tiền (tùy chọn) */
  bankName?: string;
  /** Số tài khoản ngân hàng (tùy chọn) */
  accountNumber?: string;
  /** Tên chủ tài khoản ngân hàng (tùy chọn) */
  accountHolderName?: string;
  /** Mã địa chỉ lấy hàng trong sổ địa chỉ (tùy chọn) */
  pickupAddressId?: number;
  /** Tên người liên hệ khi lấy hàng (tùy chọn) */
  pickupContactName?: string;
  /** Số điện thoại liên hệ khi lấy hàng (tùy chọn, định dạng SĐT Việt Nam) */
  pickupPhone?: string;
}

/**
 * DTO gửi lên khi khách hàng bổ sung hoặc cập nhật thông tin ngân hàng nhận tiền hoàn.
 */
export interface ReturnRequestBankAccountRequest {
  /** Tên ngân hàng (bắt buộc) */
  bankName: string;
  /** Số tài khoản ngân hàng (bắt buộc, 6-30 chữ số) */
  accountNumber: string;
  /** Tên chủ tài khoản ngân hàng (bắt buộc) */
  accountHolderName: string;
}

/**
 * DTO gửi lên khi khách hàng xác nhận đồng ý hoặc từ chối phương án xử lý sau kiểm định.
 */
export interface ReturnRequestConfirmPlanRequest {
  /** Lựa chọn của khách hàng: true là đồng ý phương án, false là từ chối */
  agreed: boolean;
  /** Ghi chú hoặc lý do phản hồi của khách hàng */
  customerNote?: string;
  /** Tên ngân hàng nhận hoàn tiền (nếu bổ sung khi đồng ý) */
  bankName?: string;
  /** Số tài khoản ngân hàng nhận hoàn tiền */
  accountNumber?: string;
  /** Tên chủ tài khoản ngân hàng nhận hoàn tiền */
  accountHolderName?: string;
}

// ============================================================================
// 5. DTO YÊU CẦU PHÍA QUẢN TRỊ / KHO (ADMIN & STAFF REQUEST DTOS)
// ============================================================================

/**
 * Tham số tìm kiếm và lọc danh sách phiếu trả hàng phía Quản trị (GET /api/v1/admin/returns).
 */
export interface AdminReturnSearchParams {
  /** Lọc theo trạng thái cụ thể */
  status?: ReturnRequestStatus | '';
  /** Tìm kiếm gần đúng theo mã đơn hàng */
  orderCode?: string;
  /** Cờ lọc chỉ hiển thị các phiếu bị trễ hạn SLA */
  isOverdue?: boolean;
  /** Số trang (0-indexed) */
  page?: number;
  /** Kích thước trang */
  size?: number;
}

/**
 * DTO gửi lên khi nhân viên duyệt yêu cầu trả hàng (PATCH /api/v1/admin/returns/{id}/approve).
 */
export interface ReturnRequestApproveRequest {
  /** Ghi chú hướng dẫn đóng gói và gửi hàng cho khách (tùy chọn) */
  instructionNote?: string;
  /** Cờ tự động tạo đơn lấy hàng GHN (mặc định true; false nếu khách tự mang tới shop) */
  autoCreateShippingOrder?: boolean;
}

/**
 * DTO gửi lên khi nhân viên từ chối yêu cầu trả hàng (PATCH /api/v1/admin/returns/{id}/reject).
 */
export interface ReturnRequestRejectRequest {
  /** Lý do từ chối yêu cầu (bắt buộc) */
  rejectionReason: string;
}

/**
 * DTO gửi lên khi ghi nhận thời điểm khách bàn giao hàng cho shipper (PATCH /api/v1/admin/returns/{id}/handover).
 */
export interface ReturnRequestHandoverRequest {
  /** Thời điểm bàn giao thực tế (ISO string, nếu để trống Backend tự gán thời điểm hiện tại) */
  handedOverAt?: string;
  /** Ghi chú thêm về quá trình bàn giao */
  note?: string;
}

/**
 * DTO gửi lên khi gia hạn thời hạn bàn giao hàng thêm 3 ngày (PATCH /api/v1/admin/returns/{id}/extend-handover).
 */
export interface ReturnRequestExtendHandoverRequest {
  /** Lý do gia hạn thời hạn bàn giao (bắt buộc) */
  extensionReason: string;
}

/**
 * DTO gửi lên khi kho xác nhận đã nhận kiện hàng hoàn (PATCH /api/v1/admin/returns/{id}/receive).
 */
export interface ReturnRequestReceiveRequest {
  /** Thời điểm nhận hàng thực tế tại kho (ISO string, nếu để trống Backend tự gán hiện tại) */
  receivedAt?: string;
  /** Ghi chú tình trạng kiện hàng lúc mở nhận */
  note?: string;
}

/**
 * DTO biểu diễn kết quả kiểm định QC của từng sản phẩm trong phiếu trả hàng.
 */
export interface ReturnRequestInspectItemRequest {
  /** Mã định danh dòng sản phẩm trong phiếu trả (ReturnRequestItem.id) */
  returnRequestItemId: number;
  /** Số lượng sản phẩm đạt chuẩn được chấp nhận hoàn tiền (>= 0) */
  acceptedQuantity: number;
  /** Ghi chú chi tiết kết quả kiểm định cho sản phẩm này */
  inspectionNote?: string;
}

/**
 * DTO gửi lên khi nhân viên kho ghi nhận kết quả kiểm định QC (PATCH /api/v1/admin/returns/{id}/inspect).
 */
export interface ReturnRequestInspectRequest {
  /** Danh sách kết quả kiểm định cho toàn bộ các sản phẩm trong phiếu */
  items: ReturnRequestInspectItemRequest[];
  /** Đề xuất phân loại lại sang lý do đổi ý (để khách chịu phí ship) */
  reclassifyToChangeOfMind?: boolean;
  /** Phí vận chuyển gửi trả khấu trừ vào tiền hoàn của khách (null để giữ nguyên phí GHN đã tính) */
  returnShippingFee?: number | null;
  /** Lý do từ chối (bắt buộc nếu toàn bộ sản phẩm có acceptedQuantity = 0) */
  rejectionReason?: string;
}

/**
 * DTO gửi lên trong part JSON `request` của multipart/form-data khi kế toán xác nhận hoàn tiền
 * (POST /api/v1/admin/returns/{id}/refund).
 * Backend tự sinh mã giao dịch REFUND-... và nhận ảnh biên lai qua part `proofImage`.
 */
export interface ReturnRequestRefundRequest {
  /** Ghi chú hoàn tiền (tùy chọn, tối đa 500 ký tự) */
  note?: string;
}

/**
 * DTO biểu diễn số lượng nhập kho bán lại cho từng sản phẩm.
 */
export interface ReturnRequestRestockItemRequest {
  /** Mã định danh dòng sản phẩm trong phiếu trả (ReturnRequestItem.id) */
  returnRequestItemId: number;
  /** Số lượng sản phẩm đủ điều kiện nhập lại kho bán (0 <= restockQuantity <= acceptedQuantity) */
  restockQuantity: number;
  /** Ghi chú phân loại hàng nhập kho */
  note?: string;
}

/**
 * DTO gửi lên khi nhân viên kho phân loại và nhập hàng đạt chuẩn lại vào tồn kho bán (POST /api/v1/admin/returns/{id}/restock).
 */
export interface ReturnRequestRestockRequest {
  /** Danh sách sản phẩm và số lượng phân loại nhập kho */
  items: ReturnRequestRestockItemRequest[];
}

/**
 * DTO gửi lên khi nhân viên giải trình lý do trễ hạn SLA (PATCH /api/v1/admin/returns/{id}/overdue-note).
 */
export interface ReturnRequestOverdueNoteRequest {
  /** Nguyên nhân dẫn đến việc xử lý bị quá thời hạn SLA 2 ngày làm việc (bắt buộc) */
  overdueReason: string;
  /** Mốc thời gian dự kiến hoàn thành mới (bắt buộc phải ở thời điểm tương lai) */
  estimatedCompletionAt: string;
}

/**
 * DTO gửi lên khi nhân viên ghi nhật ký liên hệ khách hàng (PATCH /api/v1/admin/returns/{id}/contact-log).
 */
export interface ReturnRequestContactLogRequest {
  /** Nội dung nhật ký gọi điện, nhắn tin hoặc niêm phong lưu kho riêng (bắt buộc) */
  contactNote: string;
}

/**
 * DTO gửi lên khi Quản trị viên thêm mới hoặc cập nhật ngày nghỉ lễ SLA (POST/PUT /api/v1/admin/returns/holidays).
 */
export interface ReturnRequestHolidayRequest {
  /** Ngày nghỉ lễ dương lịch (định dạng YYYY-MM-DD, bắt buộc) */
  holidayDate: string;
  /** Tên ngày nghỉ lễ (bắt buộc) */
  name: string;
  /** Mô tả chi tiết hoặc lý do nghỉ lễ (tùy chọn) */
  description?: string;
}
