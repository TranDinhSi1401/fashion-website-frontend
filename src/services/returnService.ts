/**
 * Module dịch vụ xử lý các yêu cầu Trả hàng & Hoàn tiền phía Khách hàng (Return Customer Service).
 * Tích hợp đầy đủ 10 endpoint theo controller /api/v1/returns, hỗ trợ đa hình request:
 * JSON thuần (khi không kèm ảnh) và Multipart/form-data (bọc payload vào Blob type application/json).
 */

import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type {
  ReturnRequestBankAccountRequest,
  ReturnRequestConfirmPlanRequest,
  ReturnRequestCreationRequest,
  ReturnRequestResponse,
  ReturnRequestUpdateRequest,
  SpringPage,
} from '../types/return';

/**
 * Đối tượng returnService cung cấp các hàm gọi API cho khách hàng thao tác với phiếu trả hàng.
 */
export const returnService = {
  /**
   * Chức năng: Tạo yêu cầu trả hàng mới (POST /api/v1/returns).
   * Tự động phát hiện có kèm ảnh hay không:
   * - Nếu không có ảnh: gửi request dạng application/json thuần.
   * - Nếu có kèm tệp ảnh: đóng gói FormData, bọc phần JSON 'request' vào Blob application/json
   *   và đính kèm các tệp 'images' để Spring Boot @RequestPart nhận diện chính xác.
   *
   * @param payload Đầu vào: Thông tin phiếu trả hàng cần tạo (đã qua buildCreateReturnPayload).
   * @param images  Đầu vào: Danh sách tệp ảnh minh chứng (tùy chọn, tối đa 5 ảnh).
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestResponse> của phiếu vừa tạo.
   */
  async createReturn(
    payload: ReturnRequestCreationRequest,
    images?: File[]
  ): Promise<ApiResponse<ReturnRequestResponse>> {
    // 1. Luồng gửi kèm tệp ảnh: Đóng gói multipart/form-data
    if (images && images.length > 0) {
      const formData = new FormData();
      // Bọc phần JSON vào Blob application/json để Spring Boot @RequestPart("request") parse chuẩn xác
      const jsonBlob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      formData.append('request', jsonBlob);

      images.forEach((file) => {
        formData.append('images', file);
      });

      const response = await apiClient.post<ApiResponse<ReturnRequestResponse>>('/returns', formData, {
        headers: {
          'Content-Type': undefined, // Để Axios và trình duyệt tự động gán boundary chính xác
        },
      });
      return response.data;
    }

    // 2. Luồng không kèm ảnh: Gửi JSON thuần
    const response = await apiClient.post<ApiResponse<ReturnRequestResponse>>('/returns', payload);
    return response.data;
  },

  /**
   * Chức năng: Lấy danh sách phiếu trả hàng của khách hàng đang đăng nhập kèm phân trang (GET /api/v1/returns/my-requests).
   *
   * @param page Đầu vào: Số thứ tự trang (0-indexed, mặc định 0).
   * @param size Đầu vào: Số bản ghi mỗi trang (mặc định 10).
   * @returns Đầu ra: Promise chứa ApiResponse<SpringPage<ReturnRequestResponse>>.
   */
  async getMyRequests(
    page: number = 0,
    size: number = 10
  ): Promise<ApiResponse<SpringPage<ReturnRequestResponse>>> {
    const response = await apiClient.get<ApiResponse<SpringPage<ReturnRequestResponse>>>(
      '/returns/my-requests',
      {
        params: { page, size },
      }
    );
    return response.data;
  },

  /**
   * Chức năng: Lấy thông tin chi tiết một phiếu trả hàng theo mã ID (GET /api/v1/returns/{id}).
   *
   * @param id Đầu vào: Mã ID của phiếu trả hàng (> 0).
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestResponse>.
   */
  async getMyRequestById(id: number): Promise<ApiResponse<ReturnRequestResponse>> {
    const response = await apiClient.get<ApiResponse<ReturnRequestResponse>>(`/returns/${id}`);
    return response.data;
  },

  /**
   * Chức năng: Chỉnh sửa thông tin yêu cầu trả hàng khi phiếu còn đang chờ duyệt (PUT /api/v1/returns/{id}).
   * - Nếu không chọn ảnh mới: gửi JSON thuần để Backend giữ nguyên bộ ảnh cũ trên Cloudinary.
   * - Nếu chọn upload bộ ảnh mới: gửi FormData để Backend xóa ảnh cũ và thay bằng bộ ảnh mới.
   *
   * @param id      Đầu vào: Mã ID phiếu trả hàng cần sửa.
   * @param payload Đầu vào: DTO chỉnh sửa (đã qua buildUpdateReturnPayload, không chứa orderId).
   * @param images  Đầu vào: Danh sách tệp ảnh mới (nếu muốn thay thế toàn bộ ảnh cũ).
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestResponse> đã cập nhật.
   */
  async updateReturn(
    id: number,
    payload: ReturnRequestUpdateRequest,
    images?: File[]
  ): Promise<ApiResponse<ReturnRequestResponse>> {
    if (images && images.length > 0) {
      const formData = new FormData();
      const jsonBlob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      formData.append('request', jsonBlob);

      images.forEach((file) => {
        formData.append('images', file);
      });

      const response = await apiClient.put<ApiResponse<ReturnRequestResponse>>(
        `/returns/${id}`,
        formData,
        {
          headers: {
            'Content-Type': undefined,
          },
        }
      );
      return response.data;
    }

    const response = await apiClient.put<ApiResponse<ReturnRequestResponse>>(
      `/returns/${id}`,
      payload
    );
    return response.data;
  },

  /**
   * Chức năng: Khách hàng chủ động hủy phiếu trả hàng (PATCH /api/v1/returns/{id}/cancel).
   * Chỉ cho phép khi phiếu ở PENDING_APPROVAL hoặc WAITING_FOR_RETURN_DELIVERY mà chưa bàn giao cho shipper.
   *
   * @param id Đầu vào: Mã ID phiếu trả hàng muốn hủy.
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestResponse> trạng thái CANCELLED.
   */
  async cancelReturn(id: number): Promise<ApiResponse<ReturnRequestResponse>> {
    const response = await apiClient.patch<ApiResponse<ReturnRequestResponse>>(
      `/returns/${id}/cancel`
    );
    return response.data;
  },

  /**
   * Chức năng: Khách hàng bổ sung hoặc sửa thông tin tài khoản ngân hàng nhận tiền hoàn (PATCH /api/v1/returns/{id}/bank-account).
   *
   * @param id      Đầu vào: Mã ID phiếu trả hàng.
   * @param payload Đầu vào: Thông tin số tài khoản, tên ngân hàng và chủ tài khoản.
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestResponse> đã cập nhật STK.
   */
  async updateBankAccount(
    id: number,
    payload: ReturnRequestBankAccountRequest
  ): Promise<ApiResponse<ReturnRequestResponse>> {
    const response = await apiClient.patch<ApiResponse<ReturnRequestResponse>>(
      `/returns/${id}/bank-account`,
      payload
    );
    return response.data;
  },

  /**
   * Chức năng: Bí danh (alias) tương thích cho việc cung cấp tài khoản ngân hàng (POST /api/v1/returns/{id}/bank-account).
   *
   * @param id      Đầu vào: Mã ID phiếu trả hàng.
   * @param payload Đầu vào: Thông tin tài khoản ngân hàng.
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestResponse>.
   */
  async provideBankAccount(
    id: number,
    payload: ReturnRequestBankAccountRequest
  ): Promise<ApiResponse<ReturnRequestResponse>> {
    return this.updateBankAccount(id, payload);
  },

  /**
   * Chức năng: Khách hàng phản hồi xác nhận đồng ý/từ chối phương án xử lý (PATCH /api/v1/returns/{id}/confirm-plan).
   *
   * @param id      Đầu vào: Mã ID phiếu trả hàng.
   * @param payload Đầu vào: DTO phản hồi phương án (chứa agreed, ghi chú và STK nếu có).
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestResponse>.
   */
  async confirmResolutionPlan(
    id: number,
    payload: ReturnRequestConfirmPlanRequest
  ): Promise<ApiResponse<ReturnRequestResponse>> {
    const response = await apiClient.patch<ApiResponse<ReturnRequestResponse>>(
      `/returns/${id}/confirm-plan`,
      payload
    );
    return response.data;
  },

  /**
   * Chức năng: Xác nhận phương án xử lý qua endpoint thay thế (POST /api/v1/returns/{id}/confirm-resolution).
   *
   * @param id      Đầu vào: Mã ID phiếu trả hàng.
   * @param payload Đầu vào: DTO phản hồi phương án.
   * @returns Đầu ra: Promise chứa ApiResponse<ReturnRequestResponse>.
   */
  async confirmResolution(
    id: number,
    payload: ReturnRequestConfirmPlanRequest
  ): Promise<ApiResponse<ReturnRequestResponse>> {
    const response = await apiClient.post<ApiResponse<ReturnRequestResponse>>(
      `/returns/${id}/confirm-resolution`,
      payload
    );
    return response.data;
  },
};

export default returnService;
