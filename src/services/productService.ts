import apiClient from './apiClient';
import { ApiResponse } from '../types/api';
import { ProductResponse, ProductRequest, ProductFilters } from '../types/product';

export const productService = {
  /**
   * Get list of products (Public)
   */
  async getProducts(params: ProductFilters = {}, signal?: AbortSignal): Promise<ApiResponse<ProductResponse[]>> {
    const { newWithinDays, ...filters } = params;
    const endpoint = newWithinDays === undefined ? '/products' : '/products/new';
    const query = newWithinDays === undefined ? filters : { ...filters, days: newWithinDays };
    const res = await apiClient.get<ApiResponse<ProductResponse[]>>(endpoint, { params: query, signal });
    return res.data;
  },

  /**
   * Get single product details by id (Public)
   */
  async getProductById(id: number | string, signal?: AbortSignal): Promise<ApiResponse<ProductResponse>> {
    const res = await apiClient.get<ApiResponse<ProductResponse>>(`/products/${id}`, { signal });
    return res.data;
  },

  /**
   * Create product (Admin)
   */
  async createProduct(data: ProductRequest): Promise<ApiResponse<ProductResponse>> {
    const res = await apiClient.post<ApiResponse<ProductResponse>>('/products', data);
    return res.data;
  },

  /**
   * Update product (Admin)
   */
  async updateProduct(id: number | string, data: Partial<ProductRequest>): Promise<ApiResponse<ProductResponse>> {
    const res = await apiClient.put<ApiResponse<ProductResponse>>(`/products/${id}`, data);
    return res.data;
  },

  /**
   * Delete product (Admin)
   */
  async deleteProduct(id: number | string): Promise<ApiResponse<null>> {
    const res = await apiClient.delete<ApiResponse<null>>(`/products/${id}`);
    return res.data;
  },
};

