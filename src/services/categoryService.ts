import apiClient from './apiClient';
import { ApiResponse } from '../types/api';
import { CategoryCreationRequest, CategoryResponse } from '../types/category';

export const categoryService = {
  async createCategory(request: CategoryCreationRequest): Promise<ApiResponse<CategoryResponse>> {
    const res = await apiClient.post<ApiResponse<CategoryResponse>>('/categories', request);
    return res.data;
  },

  async getCategories(): Promise<ApiResponse<CategoryResponse[]>> {
    const res = await apiClient.get<ApiResponse<CategoryResponse[]>>('/categories');
    return res.data;
  },
};
