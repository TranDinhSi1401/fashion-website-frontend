export interface CartItem {
  id: number;
  variantId: number;
  productId: number;
  productName: string;
  sku?: string;
  color: string;
  size: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  imageUrl?: string | null;
  stockQuantity: number;
  available: boolean;
}

export interface CartResponse {
  id: number | null;
  userId: number;
  items: CartItem[];
  totalQuantity: number;
  totalPrice: number;
}
