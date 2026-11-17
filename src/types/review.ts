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
  verifiedPurchase?: boolean | null;
  rating: number;
  comment?: string | null;
  fitRating?: string | number | null;
  userHeight?: number | null;
  userWeight?: number | null;
  images?: ProductReviewImageResponse[];
  createdAt?: string;
  updatedAt?: string;
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
  product: { id: number };
  user?: { id: number };
  orderItem?: { id: number } | null;
  rating: number;
  comment: string;
  fitRating?: number | null;
  userHeight?: number | null;
  userWeight?: number | null;
}
