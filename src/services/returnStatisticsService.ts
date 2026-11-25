import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type {
  CustomerRiskStatistics,
  ReturnFinancialPeriod,
  ReturnFinancialStatistics,
  ReturnOverviewStatistics,
  ReturnProductStatistics,
  ReturnReasonStatistics,
  ReturnSlaStatistics,
  ReturnStatisticsRange,
} from '../types/returnStatistics';

function buildParams(extra: Record<string, string | number | undefined>) {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && value !== '') {
      params[key] = value;
    }
  }
  return params;
}

export const returnStatisticsService = {
  async getOverview(
    range: ReturnStatisticsRange = {},
    signal?: AbortSignal
  ): Promise<ReturnOverviewStatistics> {
    const response = await apiClient.get<ApiResponse<ReturnOverviewStatistics>>(
      '/admin/returns/statistics/overview',
      { signal, params: buildParams({ from: range.from, to: range.to }) }
    );
    return response.data.data;
  },

  async getFinancial(
    period: ReturnFinancialPeriod = 'day',
    range: ReturnStatisticsRange = {},
    signal?: AbortSignal
  ): Promise<ReturnFinancialStatistics> {
    const response = await apiClient.get<ApiResponse<ReturnFinancialStatistics>>(
      '/admin/returns/statistics/financial',
      { signal, params: buildParams({ period, from: range.from, to: range.to }) }
    );
    return response.data.data;
  },

  async getReasons(
    range: ReturnStatisticsRange = {},
    signal?: AbortSignal
  ): Promise<ReturnReasonStatistics> {
    const response = await apiClient.get<ApiResponse<ReturnReasonStatistics>>(
      '/admin/returns/statistics/reasons',
      { signal, params: buildParams({ from: range.from, to: range.to }) }
    );
    return response.data.data;
  },

  async getProducts(
    range: ReturnStatisticsRange = {},
    topLimit = 10,
    signal?: AbortSignal
  ): Promise<ReturnProductStatistics> {
    const response = await apiClient.get<ApiResponse<ReturnProductStatistics>>(
      '/admin/returns/statistics/products',
      { signal, params: buildParams({ topLimit, from: range.from, to: range.to }) }
    );
    return response.data.data;
  },

  async getSlaPerformance(
    range: ReturnStatisticsRange = {},
    signal?: AbortSignal
  ): Promise<ReturnSlaStatistics> {
    const response = await apiClient.get<ApiResponse<ReturnSlaStatistics>>(
      '/admin/returns/statistics/sla-performance',
      { signal, params: buildParams({ from: range.from, to: range.to }) }
    );
    return response.data.data;
  },

  async getCustomerRisks(
    range: ReturnStatisticsRange = {},
    options: { minReturns?: number; topLimit?: number } = {},
    signal?: AbortSignal
  ): Promise<CustomerRiskStatistics> {
    const response = await apiClient.get<ApiResponse<CustomerRiskStatistics>>(
      '/admin/returns/statistics/customer-risks',
      {
        signal,
        params: buildParams({
          minReturns: options.minReturns ?? 2,
          topLimit: options.topLimit ?? 10,
          from: range.from,
          to: range.to,
        }),
      }
    );
    return response.data.data;
  },
};
