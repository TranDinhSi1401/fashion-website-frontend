import apiClient from './apiClient';
import { ApiResponse } from '../types/api';
import { CategoryResponse } from '../types/category';

export const categoryService = {
  async getCategories(): Promise<ApiResponse<CategoryResponse[]>> {
    const res = await apiClient.get<ApiResponse<CategoryResponse[]>>('/categories');
    return res.data;
  },
};
