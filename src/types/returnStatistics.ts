import type { ReturnReason, ReturnRequestStatus } from './return';

export interface ReturnStatisticsRange {
  from?: string;
  to?: string;
}

export type ReturnFinancialPeriod = 'day' | 'week' | 'month';

export interface ReturnOverviewStatistics {
  from: string;
  to: string;
  totalReturnRequests: number;
  orderReturnRate: number;
  returnedOrderCount: number;
  deliveredOrderCount: number;
  totalRefundedAmount: number;
  refundedRequestCount: number;
  activeOverdueCount: number;
  pendingApprovalCount: number;
  waitingDeliveryCount: number;
  inspectingCount: number;
  waitingCustomerFeedbackCount: number;
  waitingRefundCount: number;
  dormantOver30DaysCount: number;
}

export interface ReturnFinancialPoint {
  label: string;
  refundAmount: number;
  itemsRefundAmount: number;
  shopSubsidizedShippingFee: number;
  customerShippingFeeDeducted: number;
  ghnReturnShippingFee?: number;
  grossDeliveredRevenue: number;
  refundedRequestCount: number;
}

export interface ReturnFinancialStatistics {
  from: string;
  to: string;
  period: ReturnFinancialPeriod;
  totalRefundAmount: number;
  totalItemsRefundAmount: number;
  totalShopSubsidizedShippingFee: number;
  totalGhnReturnShippingFee: number;
  totalCustomerShippingFeeDeducted: number;
  netRevenueAfterRefund: number;
  grossDeliveredRevenue: number;
  refundToRevenueRatio: number;
  points: ReturnFinancialPoint[];
}

export interface ReturnReasonStat {
  reason: ReturnReason;
  reasonDisplayName: string;
  requestCount: number;
  percentage: number;
  refundedCount: number;
  totalRefundAmount: number;
}

export interface ReturnReasonStatistics {
  from: string;
  to: string;
  totalRequests: number;
  reasons: ReturnReasonStat[];
  pendingReclassifyToChangeOfMindCount: number;
  partialAcceptanceCount: number;
  rejectedAfterInspectionCount: number;
  rejectedBeforeInspectionCount: number;
}

export interface ReturnedVariantStat {
  productId: number;
  productName: string;
  variantId?: number;
  sku: string | null;
  color: string;
  size: string;
  returnRequestCount: number;
  returnedUnits: number;
  soldUnitsInPeriod: number;
  variantReturnRate: number;
  topReason: ReturnReason | null;
  totalItemRefundAmount: number;
}

export interface ReturnProductStatistics {
  from: string;
  to: string;
  topLimit?: number;
  totalRequestedUnits: number;
  totalAcceptedUnits: number;
  totalRestockedUnits: number;
  confirmedWriteOffUnits: number;
  pendingRestockUnits: number;
  restockRecoveryRate: number;
  estimatedWriteOffValue: number;
  topReturnedVariants: ReturnedVariantStat[];
}

export interface ReturnStatusBreakdownItem {
  status: ReturnRequestStatus;
  displayName: string;
  count: number;
  percentage: number;
}

export interface ReturnSlaStatistics {
  from: string;
  to: string;
  totalRequests: number;
  slaComplianceRate: number;
  totalSlaBreachedRequests: number;
  currentlyOverdueCount: number;
  handoverExtendedCount: number;
  avgApprovalHours: number;
  breachedApprovalSlaCount: number;
  avgReturnDeliveryHours: number;
  avgInspectionHours: number;
  breachedInspectionSlaCount: number;
  avgRefundExecutionHours: number;
  breachedRefundSlaCount: number;
  avgEndToEndResolutionHours: number;
  statusBreakdown: ReturnStatusBreakdownItem[];
}

export interface CustomerRiskItem {
  userId: number;
  username: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  totalReturnRequests: number;
  deliveredOrderCount: number;
  personalReturnRate: number;
  discrepancyCount: number;
  rejectedRequestCount: number;
  cancelledRequestCount: number;
  refundedRequestCount: number;
  totalRefundedAmount: number;
}

export interface CustomerRiskStatistics {
  from: string;
  to: string;
  minReturns: number;
  topLimit: number;
  flaggedCustomerCount: number;
  customers: CustomerRiskItem[];
}
