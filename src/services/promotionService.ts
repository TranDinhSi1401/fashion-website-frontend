import apiClient from './apiClient';
import { ApiResponse } from '../types/api';
import {
  SpecialOfferCreationRequest,
  SpecialOfferFilterParams,
  SpecialOfferProductResponse,
  SpecialOfferResponse,
  SpecialOfferUpdateRequest,
  SpringPage,
} from '../types/promotion';

function cleanParams(params: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  });
  return cleaned;
}

export const promotionService = {
  /**
   * Lấy danh sách khuyến mãi có phân trang, tìm kiếm và lọc phía server
   * GET /special-offers/page
   */
  async getOffersPage(
    params: SpecialOfferFilterParams = {},
    signal?: AbortSignal
  ): Promise<ApiResponse<SpringPage<SpecialOfferResponse>>> {
    const query = cleanParams({
      page: 0,
      size: 10,
      sort: 'createdAt,desc',
      ...params,
    });
    const res = await apiClient.get<ApiResponse<SpringPage<SpecialOfferResponse>>>(
      '/special-offers/page',
      { params: query, signal }
    );
    return res.data;
  },

  /**
   * Lấy toàn bộ danh sách khuyến mãi theo bộ lọc (không phân trang)
   * GET /special-offers
   */
  async getOffers(
    params: SpecialOfferFilterParams = {},
    signal?: AbortSignal
  ): Promise<ApiResponse<SpecialOfferResponse[]>> {
    const res = await apiClient.get<ApiResponse<SpecialOfferResponse[]>>('/special-offers', {
      params: cleanParams(params),
      signal,
    });
    return res.data;
  },

  /**
   * Lấy các khuyến mãi đang có hiệu lực
   * GET /special-offers/active
   */
  async getActiveOffers(
    offerType?: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<SpecialOfferResponse[]>> {
    const res = await apiClient.get<ApiResponse<SpecialOfferResponse[]>>('/special-offers/active', {
      params: cleanParams({ offerType }),
      signal,
    });
    return res.data;
  },

  /**
   * Lấy chi tiết 1 khuyến mãi theo ID
   * GET /special-offers/{id}
   */
  async getOfferById(
    id: number | string,
    signal?: AbortSignal
  ): Promise<ApiResponse<SpecialOfferResponse>> {
    const res = await apiClient.get<ApiResponse<SpecialOfferResponse>>(`/special-offers/${id}`, {
      signal,
    });
    return res.data;
  },

  /**
   * Tạo mới khuyến mãi (ADMIN, STAFF)
   * POST /special-offers
   */
  async createOffer(
    data: SpecialOfferCreationRequest
  ): Promise<ApiResponse<SpecialOfferResponse>> {
    const res = await apiClient.post<ApiResponse<SpecialOfferResponse>>('/special-offers', data);
    return res.data;
  },

  /**
   * Cập nhật thông tin khuyến mãi theo ID (ADMIN, STAFF)
   * PUT /special-offers/{id}
   */
  async updateOffer(
    id: number | string,
    data: SpecialOfferUpdateRequest
  ): Promise<ApiResponse<SpecialOfferResponse>> {
    const res = await apiClient.put<ApiResponse<SpecialOfferResponse>>(
      `/special-offers/${id}`,
      data
    );
    return res.data;
  },

  /**
   * Bật / tắt nhanh trạng thái khuyến mãi (ADMIN, STAFF)
   * PATCH /special-offers/{id}/active?value={boolean}
   */
  async updateOfferActive(
    id: number | string,
    value: boolean
  ): Promise<ApiResponse<SpecialOfferResponse>> {
    const res = await apiClient.patch<ApiResponse<SpecialOfferResponse>>(
      `/special-offers/${id}/active`,
      null,
      { params: { value } }
    );
    return res.data;
  },

  /**
   * Xóa mềm khuyến mãi theo ID (ADMIN, STAFF)
   * DELETE /special-offers/{id}
   */
  async deleteOffer(id: number | string): Promise<ApiResponse<null>> {
    const res = await apiClient.delete<ApiResponse<null>>(`/special-offers/${id}`);
    return res.data;
  },

  /**
   * Lấy danh sách sản phẩm đã gán vào một khuyến mãi cụ thể
   * GET /special-offer-products/offer/{offerId}
   */
  async getOfferProducts(
    offerId: number | string,
    keyword?: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<SpecialOfferProductResponse[]>> {
    const res = await apiClient.get<ApiResponse<SpecialOfferProductResponse[]>>(
      `/special-offer-products/offer/${offerId}`,
      { params: cleanParams({ keyword }), signal }
    );
    return res.data;
  },

  /**
   * Lấy danh sách sản phẩm thuộc một khuyến mãi có phân trang
   * GET /special-offer-products/offer/{offerId}/page
   */
  async getOfferProductsPage(
    offerId: number | string,
    params: { keyword?: string; page?: number; size?: number } = {},
    signal?: AbortSignal
  ): Promise<ApiResponse<SpringPage<SpecialOfferProductResponse>>> {
    const res = await apiClient.get<ApiResponse<SpringPage<SpecialOfferProductResponse>>>(
      `/special-offer-products/offer/${offerId}/page`,
      { params: cleanParams({ page: 0, size: 10, ...params }), signal }
    );
    return res.data;
  },

  /**
   * Gán hàng loạt sản phẩm vào chương trình khuyến mãi
   * POST /special-offer-products/batch
   */
  async addOfferProductsBatch(
    specialOfferId: number,
    productIds: number[]
  ): Promise<ApiResponse<SpecialOfferProductResponse[]>> {
    const res = await apiClient.post<ApiResponse<SpecialOfferProductResponse[]>>(
      '/special-offer-products/batch',
      { specialOfferId, productIds }
    );
    return res.data;
  },

  /**
   * Đồng bộ danh sách sản phẩm / biến thể của một khuyến mãi (thêm mục mới chọn, xóa mềm mục bỏ chọn)
   * PUT /special-offer-products/offer/{offerId}/sync
   */
  async syncOfferProducts(
    offerId: number,
    productIdsOrTargets:
      | number[]
      | {
          productIds?: number[];
          productTargets?: Array<{ productId: number; productVariantId?: number | null }>;
        }
  ): Promise<ApiResponse<SpecialOfferProductResponse[]>> {
    const body = Array.isArray(productIdsOrTargets)
      ? { productIds: productIdsOrTargets }
      : productIdsOrTargets;
    const res = await apiClient.put<ApiResponse<SpecialOfferProductResponse[]>>(
      `/special-offer-products/offer/${offerId}/sync`,
      body
    );
    return res.data;
  },

  /**
   * Xóa mềm 1 sản phẩm khỏi khuyến mãi theo ID liên kết
   * DELETE /special-offer-products/{id}
   */
  async deleteOfferProduct(id: number | string): Promise<ApiResponse<null>> {
    const res = await apiClient.delete<ApiResponse<null>>(`/special-offer-products/${id}`);
    return res.data;
  },

  /**
   * Xóa mềm 1 sản phẩm khỏi khuyến mãi theo cặp (offerId, productId)
   * DELETE /special-offer-products/offer/{offerId}/product/{productId}
   */
  async removeProductFromOffer(
    offerId: number | string,
    productId: number | string
  ): Promise<ApiResponse<null>> {
    const res = await apiClient.delete<ApiResponse<null>>(
      `/special-offer-products/offer/${offerId}/product/${productId}`
    );
    return res.data;
  },
};
