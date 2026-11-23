export interface CartItem {
  id: number;
  variantId: number;
  productId: number;
  productName: string;
  sku?: string;
  color: string;
  size: string;
  originalPrice?: number;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  imageUrl?: string | null;
  stockQuantity: number;
  available: boolean;
}

export interface CartResponse {
  items: CartItem[];
  totalQuantity: number;
  totalPrice: number;
}
