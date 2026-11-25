export type VoucherDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type VoucherStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED';

export interface VoucherResponse {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  discountType: VoucherDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount: number;
  totalQuantity: number;
  usedQuantity: number;
  remainingQuantity: number;
  maxUsesPerUser: number;
  userUsedCount?: number | null;
  remainingUserUses?: number | null;
  startDate: string;
  endDate: string;
  status: VoucherStatus;
  isValid: boolean;
  createdAt?: string;
}

export interface CreateVoucherRequest {
  code: string;
  name: string;
  description?: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number;
  totalQuantity: number;
  maxUsesPerUser?: number;
  startDate: string;
  endDate: string;
  status?: VoucherStatus;
}

export interface UpdateVoucherRequest {
  name: string;
  description?: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number;
  totalQuantity: number;
  maxUsesPerUser?: number;
  startDate: string;
  endDate: string;
  status?: VoucherStatus;
}

export interface ValidateVoucherRequest {
  code: string;
  subtotal: number;
}

export interface VoucherCalculationResult {
  voucherId: number;
  code: string;
  name: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  discountAmount: number;
  subtotal: number;
  finalAmount: number;
  maxUsesPerUser?: number;
  userUsedCount?: number;
  remainingUserUses?: number;
}
