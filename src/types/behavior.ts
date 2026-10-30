// Chỉ các hành vi client được phép gửi; ADD_TO_CART, REMOVE_FROM_CART, PURCHASE do backend tự ghi
export type ClientBehaviorType = 'VIEW' | 'SELECT_VARIANT';

export interface TrackBehaviorPayload {
  productId: number;
  variantId: number | null;
  type: ClientBehaviorType;
}
