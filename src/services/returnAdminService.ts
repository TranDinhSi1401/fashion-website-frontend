/**
 * Module dịch vụ xử lý các yêu cầu Trả hàng & Hoàn tiền phía Quản trị & Kho vận (Return Admin Service).
 * Tích hợp đủ 18 endpoint (/api/v1/admin/returns/**) phục vụ toàn bộ quy trình vận hành Bước 2 đến Bước 6,
 * giám sát quá hạn SLA, nhật ký CSKH, rà soát hồ sơ mốc 30 ngày và cấu hình ngày nghỉ lễ.
 */

import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type {
  AdminReturnSearchParams,
  ReturnRequestApproveRequest,
  ReturnRequestContactLogRequest,
  ReturnRequestExtendHandoverRequest,
  ReturnRequestHandoverRequest,
  ReturnRequestHolidayRequest,
  ReturnRequestHolidayResponse,
  ReturnRequestInspectRequest,
  ReturnRequestOverdueNoteRequest,
  ReturnRequestReceiveRequest,
  ReturnRequestRefundRequest,
  ReturnRequestRejectRequest,
  ReturnRequestResponse,
  ReturnRequestRestockRequest,
  SpringPage,
} from '../types/return';

/**
 * Đối tượng returnAdminService cung cấp các hàm gọi API cho Quản trị viên và Nhân viên kho/CSKH.
 */
export const returnAdminService = {
  /**
   * Chức năng: Tìm kiếm và lọc danh sách phiếu trả hàng theo nhiều tiêu chí (GET /api/v1/admin/returns).
   *
   * @param params Đầu vào: Tham số lọc (status, orderCode, isOverdue, page, size).
   * @returns Đầu ra: Promise chứa ApiResponse<SpringPage<ReturnRequestResponse>>.
   */
  async searchReturns(
    params: AdminReturnSearchParams = {}
  ): Promise<ApiResponse<SpringPage<ReturnRequestResponse>>> {
    const queryParams: Record<string, any> = {
      page: params.page ?? 0,
      size: params.size ?? 10,
    };

    if (params.status) {
      queryParams.status = params.status;
    }

    if (params.orderCode && params.orderCode.trim() !== '') {
      queryParams.orderCode = params.orderCode.trim();
    }

    // Chỉ truyền cờ isOverdue khi được chọn là true để tránh ép lọc sai logic
    if (params.isOverdue === true) {
      queryParams.isOverdue = true;
    }

    const response = await apiClient.get<ApiResponse<SpringPage<ReturnRequestResponse>>>(
      '/admin/returns',
      { params: queryParams }
    );
    return response.data;
  },

  /**
   * Chức năng: Xem chi tiết một phiếu trả hàng theo mã ID (GET /api/v1/admin/returns/{id}).
   *
   * @param id Đầu vào: Mã ID phiếu trả hàng (> 0).
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestResponse>.
   */
  async getReturnById(id: number): Promise<ApiResponse<ReturnRequestResponse>> {
    const response = await apiClient.get<ApiResponse<ReturnRequestResponse>>(
      `/admin/returns/${id}`
    );
    return response.data;
  },

  /**
   * Chức năng: Duyệt yêu cầu trả hàng, thiết lập hạn bàn giao 7 ngày (PATCH /api/v1/admin/returns/{id}/approve).
   *
   * @param id      Đầu vào: Mã ID phiếu trả hàng.
   * @param payload Đầu vào: Hướng dẫn đóng gói và gửi hàng cho khách (tùy chọn).
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestResponse>.
   */
  async approveReturn(
    id: number,
    payload?: ReturnRequestApproveRequest
  ): Promise<ApiResponse<ReturnRequestResponse>> {
    const response = await apiClient.patch<ApiResponse<ReturnRequestResponse>>(
      `/admin/returns/${id}/approve`,
      payload || {}
    );
    return response.data;
  },

  /**
   * Chức năng: Từ chối yêu cầu trả hàng kèm lý do bắt buộc (PATCH /api/v1/admin/returns/{id}/reject).
   *
   * @param id      Đầu vào: Mã ID phiếu trả hàng.
   * @param payload Đầu vào: DTO chứa rejectionReason bắt buộc.
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestResponse>.
   */
  async rejectReturn(
    id: number,
    payload: ReturnRequestRejectRequest
  ): Promise<ApiResponse<ReturnRequestResponse>> {
    const response = await apiClient.patch<ApiResponse<ReturnRequestResponse>>(
      `/admin/returns/${id}/reject`,
      payload
    );
    return response.data;
  },

  /**
   * Chức năng: Ghi nhận thời điểm khách bàn giao hàng cho shipper (PATCH /api/v1/admin/returns/{id}/handover).
   *
   * @param id      Đầu vào: Mã ID phiếu trả hàng.
   * @param payload Đầu vào: Thời điểm bàn giao và ghi chú vận chuyển (tùy chọn).
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestResponse>.
   */
  async confirmHandover(
    id: number,
    payload?: ReturnRequestHandoverRequest
  ): Promise<ApiResponse<ReturnRequestResponse>> {
    const response = await apiClient.patch<ApiResponse<ReturnRequestResponse>>(
      `/admin/returns/${id}/handover`,
      payload || {}
    );
    return response.data;
  },

  /**
   * Chức năng: Gia hạn thời hạn bàn giao thêm 3 ngày lịch (PATCH /api/v1/admin/returns/{id}/extend-handover).
   *
   * @param id      Đầu vào: Mã ID phiếu trả hàng.
   * @param payload Đầu vào: DTO chứa extensionReason bắt buộc.
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestResponse>.
   */
  async extendHandover(
    id: number,
    payload: ReturnRequestExtendHandoverRequest
  ): Promise<ApiResponse<ReturnRequestResponse>> {
    const response = await apiClient.patch<ApiResponse<ReturnRequestResponse>>(
      `/admin/returns/${id}/extend-handover`,
      payload
    );
    return response.data;
  },

  /**
   * Chức năng: Tiếp nhận kiện hàng hoàn tại kho và chuyển sang INSPECTING (PATCH /api/v1/admin/returns/{id}/receive).
   *
   * @param id      Đầu vào: Mã ID phiếu trả hàng.
   * @param payload Đầu vào: Thời điểm nhận và ghi chú tình trạng kiện hàng (tùy chọn).
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestResponse>.
   */
  async receiveReturn(
    id: number,
    payload?: ReturnRequestReceiveRequest
  ): Promise<ApiResponse<ReturnRequestResponse>> {
    const response = await apiClient.patch<ApiResponse<ReturnRequestResponse>>(
      `/admin/returns/${id}/receive`,
      payload || {}
    );
    return response.data;
  },

  /**
   * Chức năng: Ghi nhận kết quả kiểm định chất lượng thực tế QC tại kho (PATCH /api/v1/admin/returns/{id}/inspect).
   *
   * @param id      Đầu vào: Mã ID phiếu trả hàng.
   * @param payload Đầu vào: Danh sách kết quả duyệt từng món, cờ đổi ý, phí ship và lý do từ chối nếu có.
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestResponse>.
   */
  async inspectReturn(
    id: number,
    payload: ReturnRequestInspectRequest
  ): Promise<ApiResponse<ReturnRequestResponse>> {
    const response = await apiClient.patch<ApiResponse<ReturnRequestResponse>>(
      `/admin/returns/${id}/inspect`,
      payload
    );
    return response.data;
  },

  /**
   * Chức năng: Xác nhận đã thực hiện chuyển khoản hoàn tiền thành công (POST /api/v1/admin/returns/{id}/refund).
   *
   * @param id      Đầu vào: Mã ID phiếu trả hàng.
   * @param payload Đầu vào: Mã giao dịch ngân hàng/ủy nhiệm chi, ảnh chứng từ và ghi chú.
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestResponse>.
   */
  async refundReturn(
    id: number,
    payload: ReturnRequestRefundRequest
  ): Promise<ApiResponse<ReturnRequestResponse>> {
    const response = await apiClient.post<ApiResponse<ReturnRequestResponse>>(
      `/admin/returns/${id}/refund`,
      payload
    );
    return response.data;
  },

  /**
   * Chức năng: Phân loại và nhập lại kho bán cho sản phẩm đạt chuẩn (POST /api/v1/admin/returns/{id}/restock).
   *
   * @param id      Đầu vào: Mã ID phiếu trả hàng.
   * @param payload Đầu vào: Danh sách số lượng nhập kho của từng sản phẩm.
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestResponse>.
   */
  async restockReturn(
    id: number,
    payload: ReturnRequestRestockRequest
  ): Promise<ApiResponse<ReturnRequestResponse>> {
    const response = await apiClient.post<ApiResponse<ReturnRequestResponse>>(
      `/admin/returns/${id}/restock`,
      payload
    );
    return response.data;
  },

  /**
   * Chức năng: Giải trình nguyên nhân xử lý trễ hạn SLA và hẹn ngày xong mới (PATCH /api/v1/admin/returns/{id}/overdue-note).
   *
   * @param id      Đầu vào: Mã ID phiếu trả hàng.
   * @param payload Đầu vào: DTO chứa overdueReason và estimatedCompletionAt (bắt buộc tương lai).
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestResponse>.
   */
  async updateOverdueNote(
    id: number,
    payload: ReturnRequestOverdueNoteRequest
  ): Promise<ApiResponse<ReturnRequestResponse>> {
    const response = await apiClient.patch<ApiResponse<ReturnRequestResponse>>(
      `/admin/returns/${id}/overdue-note`,
      payload
    );
    return response.data;
  },

  /**
   * Chức năng: Ghi nhật ký liên hệ khách hàng hoặc niêm phong lưu kho riêng (PATCH /api/v1/admin/returns/{id}/contact-log).
   *
   * @param id      Đầu vào: Mã ID phiếu trả hàng.
   * @param payload Đầu vào: DTO chứa nội dung contactNote bắt buộc.
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestResponse>.
   */
  async addContactLog(
    id: number,
    payload: ReturnRequestContactLogRequest
  ): Promise<ApiResponse<ReturnRequestResponse>> {
    const response = await apiClient.patch<ApiResponse<ReturnRequestResponse>>(
      `/admin/returns/${id}/contact-log`,
      payload
    );
    return response.data;
  },

  /**
   * Chức năng: Đóng hoàn tất hồ sơ khi đã giải quyết xong toàn bộ hàng và tiền (PATCH /api/v1/admin/returns/{id}/complete).
   *
   * @param id Đầu vào: Mã ID phiếu trả hàng.
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestResponse>.
   */
  async completeReturn(id: number): Promise<ApiResponse<ReturnRequestResponse>> {
    const response = await apiClient.patch<ApiResponse<ReturnRequestResponse>>(
      `/admin/returns/${id}/complete`
    );
    return response.data;
  },

  /**
   * Chức năng: Rà soát danh sách hồ sơ treo quá 30 ngày khách chưa phản hồi (GET /api/v1/admin/returns/dormant-reviews).
   * Quyền truy cập: Chỉ dành riêng cho ROLE_ADMIN.
   *
   * @param page Đầu vào: Số trang (0-indexed, mặc định 0).
   * @param size Đầu vào: Số bản ghi mỗi trang (mặc định 10).
   * @returns Đầu ra: Promise chứa ApiResponse<SpringPage<ReturnRequestResponse>>.
   */
  async getDormantReviews(
    page: number = 0,
    size: number = 10
  ): Promise<ApiResponse<SpringPage<ReturnRequestResponse>>> {
    const response = await apiClient.get<ApiResponse<SpringPage<ReturnRequestResponse>>>(
      '/admin/returns/dormant-reviews',
      {
        params: { page, size },
      }
    );
    return response.data;
  },

  /**
   * Chức năng: Lấy danh sách ngày nghỉ lễ áp dụng tính SLA theo năm (GET /api/v1/admin/returns/holidays).
   *
   * @param year Đầu vào: Năm dương lịch cần xem (tùy chọn).
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestHolidayResponse[]>.
   */
  async getHolidays(year?: number): Promise<ApiResponse<ReturnRequestHolidayResponse[]>> {
    const params: Record<string, any> = {};
    if (typeof year === 'number') {
      params.year = year;
    }
    const response = await apiClient.get<ApiResponse<ReturnRequestHolidayResponse[]>>(
      '/admin/returns/holidays',
      { params }
    );
    return response.data;
  },

  /**
   * Chức năng: Thêm mới một ngày nghỉ lễ mở rộng (POST /api/v1/admin/returns/holidays).
   *
   * @param payload Đầu vào: Thông tin ngày nghỉ lễ (holidayDate YYYY-MM-DD, name, description?).
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestHolidayResponse>.
   */
  async createHoliday(
    payload: ReturnRequestHolidayRequest
  ): Promise<ApiResponse<ReturnRequestHolidayResponse>> {
    const response = await apiClient.post<ApiResponse<ReturnRequestHolidayResponse>>(
      '/admin/returns/holidays',
      payload
    );
    return response.data;
  },

  /**
   * Chức năng: Cập nhật thông tin ngày nghỉ lễ mở rộng (PUT /api/v1/admin/returns/holidays/{id}).
   * Lưu ý: Backend ném DEFAULT_HOLIDAY_IMMUTABLE nếu cố sửa 6 ngày lễ mặc định hệ thống.
   *
   * @param id      Đầu vào: Mã ID ngày nghỉ lễ trong DB (> 0).
   * @param payload Đầu vào: Thông tin ngày lễ mới.
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestHolidayResponse>.
   */
  async updateHoliday(
    id: number,
    payload: ReturnRequestHolidayRequest
  ): Promise<ApiResponse<ReturnRequestHolidayResponse>> {
    const response = await apiClient.put<ApiResponse<ReturnRequestHolidayResponse>>(
      `/admin/returns/holidays/${id}`,
      payload
    );
    return response.data;
  },

  /**
   * Chức năng: Xóa một ngày nghỉ lễ mở rộng khỏi DB (DELETE /api/v1/admin/returns/holidays/{id}).
   * Lưu ý: Backend cấm xóa 6 ngày lễ mặc định hệ thống.
   *
   * @param id Đầu vào: Mã ID ngày nghỉ lễ cần xóa.
   * @returns Đầu ra: Promise chứa ApiResponse<void>.
   */
  async deleteHoliday(id: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/admin/returns/holidays/${id}`
    );
    return response.data;
  },
};

export default returnAdminService;
