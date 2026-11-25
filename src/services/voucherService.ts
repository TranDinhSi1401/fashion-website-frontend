import apiClient from './apiClient';
import { ApiResponse } from '../types/api';
import { SpringPage } from '../types/promotion';
import {
  CreateVoucherRequest,
  UpdateVoucherRequest,
  ValidateVoucherRequest,
  VoucherCalculationResult,
  VoucherResponse,
} from '../types/voucher';

export const voucherService = {
  /**
   * Khách hàng kiểm tra voucher & tính thử giảm giá
   * POST /vouchers/validate
   */
  async validateVoucher(
    data: ValidateVoucherRequest
  ): Promise<ApiResponse<VoucherCalculationResult>> {
    const res = await apiClient.post<ApiResponse<VoucherCalculationResult>>(
      '/vouchers/validate',
      data
    );
    return res.data;
  },

  /**
   * Lấy danh sách voucher công khai khả dụng
   * GET /vouchers/available
   */
  async getAvailableVouchers(): Promise<ApiResponse<VoucherResponse[]>> {
    const res = await apiClient.get<ApiResponse<VoucherResponse[]>>(
      '/vouchers/available'
    );
    return res.data;
  },

  /**
   * Lấy danh sách voucher trong Ví cá nhân của tài khoản đang đăng nhập
   * GET /vouchers/my-vouchers
   */
  async getMyVouchers(): Promise<ApiResponse<VoucherResponse[]>> {
    const res = await apiClient.get<ApiResponse<VoucherResponse[]>>(
      '/vouchers/my-vouchers'
    );
    return res.data;
  },

  /**
   * Lưu voucher vào Ví cá nhân theo ID
   * POST /vouchers/:id/claim
   */
  async claimVoucher(id: number): Promise<ApiResponse<VoucherResponse>> {
    const res = await apiClient.post<ApiResponse<VoucherResponse>>(
      `/vouchers/${id}/claim`
    );
    return res.data;
  },

  /**
   * Nhập mã code để lưu voucher vào Ví cá nhân
   * POST /vouchers/claim-code
   */
  async claimVoucherByCode(code: string): Promise<ApiResponse<VoucherResponse>> {
    const res = await apiClient.post<ApiResponse<VoucherResponse>>(
      '/vouchers/claim-code',
      { code }
    );
    return res.data;
  },

  /**
   * Admin: Lấy danh sách voucher phân trang
   * GET /vouchers/admin
   */
  async getAdminVouchers(
    page = 0,
    size = 10
  ): Promise<ApiResponse<SpringPage<VoucherResponse>>> {
    const res = await apiClient.get<ApiResponse<SpringPage<VoucherResponse>>>(
      '/vouchers/admin',
      {
        params: { page, size },
      }
    );
    return res.data;
  },

  /**
   * Admin: Tạo voucher mới
   * POST /vouchers/admin
   */
  async createVoucher(
    data: CreateVoucherRequest
  ): Promise<ApiResponse<VoucherResponse>> {
    const res = await apiClient.post<ApiResponse<VoucherResponse>>(
      '/vouchers/admin',
      data
    );
    return res.data;
  },

  /**
   * Admin: Cập nhật thông tin voucher
   * PUT /vouchers/admin/:id
   */
  async updateVoucher(
    id: number,
    data: UpdateVoucherRequest
  ): Promise<ApiResponse<VoucherResponse>> {
    const res = await apiClient.put<ApiResponse<VoucherResponse>>(
      `/vouchers/admin/${id}`,
      data
    );
    return res.data;
  },

  /**
   * Admin: Bật/Tắt kích hoạt voucher
   * PATCH /vouchers/admin/:id/toggle
   */
  async toggleVoucherStatus(id: number): Promise<ApiResponse<VoucherResponse>> {
    const res = await apiClient.patch<ApiResponse<VoucherResponse>>(
      `/vouchers/admin/${id}/toggle`
    );
    return res.data;
  },

  /**
   * Admin: Xóa voucher
   * DELETE /vouchers/admin/:id
   */
  async deleteVoucher(id: number): Promise<ApiResponse<void>> {
    const res = await apiClient.delete<ApiResponse<void>>(
      `/vouchers/admin/${id}`
    );
    return res.data;
  },
};
