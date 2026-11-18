export interface ProductReviewImageResponse {
  id: number;
  productReviewId: number;
  imageUrl: string;
  mediaType?: string;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductReviewResponse {
  id: number;
  productId: number;
  userId: number;
  userName?: string | null;
  fullName?: string | null;
  orderItemId?: number | null;
  variantInfo?: string | null;
  verifiedPurchase?: boolean | null;
  rating: number;
  comment?: string | null;
  fitRating?: string | number | null;
  images?: ProductReviewImageResponse[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewableOrderItemResponse {
  orderId: number;
  orderCode?: string | null;
  deliveredAt?: string | null;
  reviewDeadline?: string | null;
  orderItemId: number;
  productId: number;
  productVariantId?: number | null;
  productName: string;
  variantInfo?: string | null;
  productImageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  reviewed: boolean;
  review?: ProductReviewResponse | null;
}

export interface ReviewSummaryResponse {
  averageRating: number;
  totalReviews: number;
  countByStar: Record<number, number>;
}

export interface ReviewPageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

export interface ProductReviewUpsertPayload {
  productId?: number;
  orderItemId?: number | null;
  rating: number;
  comment?: string;
  fitRating?: number | null;
}
