import apiClient from './apiClient';
import { ApiResponse } from '../types/api';
import { ProductResponse, ProductRequest, ProductFilters, ProductPage } from '../types/product';

export const productService = {
  async getOptions(): Promise<ApiResponse<{ colors: string[]; sizes: string[] }>> {
    return (await apiClient.get('/products/options')).data;
  },
  async getProductsPage(params: ProductFilters & { page: number; pageSize: number }, signal?: AbortSignal): Promise<ApiResponse<ProductPage>> {
    return (await apiClient.get<ApiResponse<ProductPage>>('/products/paged', { params, signal })).data;
  },
  async uploadImage(file: File): Promise<string> {
    const data = new FormData();
    data.append('file', file);
    const response = await apiClient.post<ApiResponse<{ imageUrl: string }>>('/products/images/upload', data,
      { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data.data.imageUrl;
  },
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

