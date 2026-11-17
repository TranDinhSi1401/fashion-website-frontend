export type OfferType = 'ORDER' | 'PRODUCT';

export type OfferStatusFilter = '' | 'ACTIVE' | 'UPCOMING' | 'EXPIRED' | 'INACTIVE';

export type DiscountTypeFilter = '' | 'PERCENT' | 'AMOUNT';

export interface OfferProductTarget {
  productId: number;
  productVariantId?: number | null;
  productName?: string;
  productBasePrice?: number;
  productImageUrl?: string | null;
  variantSku?: string | null;
  variantColor?: string | null;
  variantSize?: string | null;
  variantPrice?: number | null;
}

export interface SpecialOfferResponse {
  id: number;
  title: string;
  offerType: OfferType | string;
  discountPercent?: number | null;
  discountAmount?: number | null;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  productIds?: number[];
  productCount?: number;
  variantCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SpecialOfferProductResponse {
  id: number;
  specialOfferId: number;
  offerTitle?: string;
  productId: number;
  productName?: string;
  productSlug?: string;
  productBasePrice?: number;
  productImageUrl?: string | null;
  productVariantId?: number | null;
  variantSku?: string | null;
  variantColor?: string | null;
  variantSize?: string | null;
  variantPrice?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SpecialOfferCreationRequest {
  title: string;
  offerType: OfferType | string;
  discountPercent?: number | null;
  discountAmount?: number | null;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  productIds?: number[];
  productTargets?: Array<{
    productId: number;
    productVariantId?: number | null;
  }>;
}

export interface SpecialOfferUpdateRequest {
  title?: string;
  offerType?: OfferType | string;
  discountPercent?: number | null;
  discountAmount?: number | null;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  productIds?: number[];
  productTargets?: Array<{
    productId: number;
    productVariantId?: number | null;
  }>;
}

export interface SpecialOfferFilterParams {
  keyword?: string;
  offerType?: OfferType | string;
  status?: OfferStatusFilter;
  discountType?: DiscountTypeFilter;
  isActive?: boolean;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}
