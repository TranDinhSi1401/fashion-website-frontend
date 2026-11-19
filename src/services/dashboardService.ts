import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';

export interface StockAlert {
  productId: number; productName: string; variantId: number; sku: string | null;
  color: string; size: string; stockQuantity: number;
}
export interface StockAlertPage {
  content: StockAlert[]; totalElements: number; totalPages: number; number: number; size: number;
}
export interface StatisticsOptions { topLimit?: number; from?: string; to?: string; }

export interface ProductStatistics {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  newProducts: number;
  totalStock: number;
  outOfStockProducts: number;
  lowStockVariants: number;
  lowStockThreshold: number;
  generatedAt: string;
  categories: { categoryId: number | null; categoryName: string; productCount: number }[];
  stockAlerts: StockAlert[];
  insights: {
    periodDays: number; periodStart: string; previousPeriodStart: string; periodEnd: string;
    newProducts: number; previousNewProducts: number;
    deliveredUnits: number; previousDeliveredUnits: number;
    activeVariants: number; hiddenStock: number; productsMissingImages: number; productsWithoutVariants: number;
    topLimit: number; customRange: boolean; fromDate: string | null; toDate: string | null;
    bestSellers: { productId: number; productName: string; units: number; previousUnits: number }[];
  };
}

export const dashboardService = {
  async getStockAlerts(page: number, pageSize: number, signal?: AbortSignal): Promise<StockAlertPage> {
    const response = await apiClient.get<ApiResponse<StockAlertPage>>('/admin/dashboard/products/stock-alerts', { signal, params: { page, pageSize } });
    return response.data.data;
  },
  async getProductStatistics(signal?: AbortSignal, days = 30, options: StatisticsOptions = {}): Promise<ProductStatistics> {
    const response = await apiClient.get<ApiResponse<ProductStatistics>>('/admin/dashboard/products', { signal, params: { days, topLimit: options.topLimit ?? 5, from: options.from, to: options.to } });
    return response.data.data;
  },
};
