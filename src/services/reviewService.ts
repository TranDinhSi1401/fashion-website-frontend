import apiClient from './apiClient';
import { ApiResponse } from '../types/api';
import {
  ProductReviewImageResponse,
  ProductReviewResponse,
  ProductReviewUpsertPayload,
  ReviewPageResponse,
  ReviewSummaryResponse,
  ReviewableOrderItemResponse,
} from '../types/review';

export interface ReviewListQuery {
  rating?: number | null;
  page?: number;
  size?: number;
  sort?: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));
    reader.readAsDataURL(file);
  });
}

export const reviewService = {
  /**
   * Lấy danh sách đánh giá theo sản phẩm (Công khai - hỗ trợ lọc sao, sắp xếp, phân trang)
   */
  async getProductReviews(
    productId: number | string,
    query: ReviewListQuery = {},
    signal?: AbortSignal
  ): Promise<ApiResponse<ReviewPageResponse<ProductReviewResponse>>> {
    const params: Record<string, string | number> = {
      page: query.page ?? 0,
      size: query.size ?? 5,
      sort: query.sort || 'createdAt,desc',
    };
    if (query.rating != null && query.rating >= 1 && query.rating <= 5) {
      params.rating = query.rating;
    }
    const res = await apiClient.get<ApiResponse<ReviewPageResponse<ProductReviewResponse>>>(
      `/products/${productId}/reviews`,
      { params, signal }
    );
    return res.data;
  },

  /**
   * Lấy thống kê tổng hợp đánh giá của sản phẩm (Công khai)
   */
  async getProductReviewSummary(
    productId: number | string,
    signal?: AbortSignal
  ): Promise<ApiResponse<ReviewSummaryResponse>> {
    const res = await apiClient.get<ApiResponse<ReviewSummaryResponse>>(
      `/products/${productId}/reviews/summary`,
      { signal }
    );
    return res.data;
  },

  /**
   * Lấy danh sách đánh giá của người dùng đang đăng nhập
   */
  async getMyReviews(signal?: AbortSignal): Promise<ApiResponse<ProductReviewResponse[]>> {
    const res = await apiClient.get<ApiResponse<ProductReviewResponse[]>>('/product-reviews/me', {
      signal,
    });
    return res.data;
  },

  /**
   * Lấy danh sách dòng sản phẩm trong các đơn đã giao thành công (DELIVERED) kèm trạng thái đánh giá
   * phục vụ hiển thị đồng bộ tại mục "Đơn hàng của tôi"
   */
  async getMyReviewableOrderItems(
    orderId?: number,
    signal?: AbortSignal
  ): Promise<ApiResponse<ReviewableOrderItemResponse[]>> {
    const res = await apiClient.get<ApiResponse<ReviewableOrderItemResponse[]>>(
      '/product-reviews/my-order-items',
      {
        params: orderId != null ? { orderId } : undefined,
        signal,
      }
    );
    return res.data;
  },

  /**
   * Tạo đánh giá mới (Yêu cầu đăng nhập)
   */
  async createReview(
    payload: ProductReviewUpsertPayload
  ): Promise<ApiResponse<ProductReviewResponse>> {
    const res = await apiClient.post<ApiResponse<ProductReviewResponse>>(
      '/product-reviews',
      payload
    );
    return res.data;
  },

  /**
   * Cập nhật đánh giá theo ID (Chính chủ hoặc Admin)
   */
  async updateReview(
    reviewId: number,
    payload: ProductReviewUpsertPayload
  ): Promise<ApiResponse<ProductReviewResponse>> {
    const res = await apiClient.put<ApiResponse<ProductReviewResponse>>(
      `/product-reviews/${reviewId}`,
      payload
    );
    return res.data;
  },

  /**
   * Xóa đánh giá theo ID (Chính chủ hoặc Admin)
   */
  async deleteReview(reviewId: number): Promise<ApiResponse<void>> {
    const res = await apiClient.delete<ApiResponse<void>>(`/product-reviews/${reviewId}`);
    return res.data;
  },

  /**
   * Tải ảnh đính kèm cho đánh giá (ưu tiên multipart /upload, fallback sang JSON nếu cần)
   */
  async uploadReviewImage(
    reviewId: number,
    file: File,
    displayOrder: number
  ): Promise<ApiResponse<ProductReviewImageResponse>> {
    try {
      const formData = new FormData();
      formData.append('reviewId', String(reviewId));
      formData.append('file', file);
      formData.append('displayOrder', String(displayOrder));
      const res = await apiClient.post<ApiResponse<ProductReviewImageResponse>>(
        '/product-review-images/upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      return res.data;
    } catch {
      const dataUrl = await fileToDataUrl(file);
      const res = await apiClient.post<ApiResponse<ProductReviewImageResponse>>(
        '/product-review-images',
        {
          productReviewId: reviewId,
          imageUrl: dataUrl,
          mediaType: 'IMAGE',
          displayOrder,
        }
      );
      return res.data;
    }
  },

  /**
   * Xóa một ảnh đánh giá theo ID
   */
  async deleteReviewImage(imageId: number): Promise<ApiResponse<void>> {
    const res = await apiClient.delete<ApiResponse<void>>(`/product-review-images/${imageId}`);
    return res.data;
  },
};
