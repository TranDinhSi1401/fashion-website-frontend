// src/types/behavior.ts

// Client chỉ được phép gửi VIEW, SELECT_VARIANT, DWELL_15S; ADD_TO_CART, REMOVE_FROM_CART, PURCHASE do backend tự ghi
export type BehaviorType = 'VIEW' | 'SELECT_VARIANT' | 'DWELL_15S';
export type ClientBehaviorType = BehaviorType;

export interface TrackBehaviorRequest {
  productId: number;
  variantId?: number | null;
  type: BehaviorType;
}

export type TrackBehaviorPayload = TrackBehaviorRequest;

// Ma trận điểm sở thích theo danh mục (Feature Store Category Score)
export interface CategoryPreferenceScore {
  categoryId: number;
  categoryName: string;
  viewCount: number;
  dwellCount: number;
  selectSizeCount: number;
  cartCount: number;
  score: number;
}

export interface UserPreferenceScoreResponse {
  userId: number;
  categoryScores: CategoryPreferenceScore[];
  totalScore: number;
}

// Hồ sơ sở thích đa chiều (Multi-dimensional Preference Profile)
export interface ProductScore {
  productId: number;
  score: number;
}

export interface CategoryScoreMetric {
  categoryId: number;
  categoryName: string;
  score: number;
}

export interface UserPreferenceProfileResponse {
  topProducts: ProductScore[];
  topCategories: CategoryScoreMetric[];
  topColors: string[];
  topSizes: string[];
}
