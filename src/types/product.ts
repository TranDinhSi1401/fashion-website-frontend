export interface ProductImage {
  id: number;
  imageUrl: string;
  isMain?: boolean;
  displayOrder?: number;
  variantId?: number | null;
}

export interface ProductColor {
  name: string;
  hex?: string;
  imageUrl?: string;
}

export interface ProductOffer {
  variantId?: number | null;
  id: number;
  title: string;
  originalPrice: number;
  discountAmount: number;
  discountedPrice: number;
  endDate: string;
}
export interface ProductPage {
  content: ProductResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
export interface ProductVariantInput {
  clientId?: string;
  id?: number;
  isActive?: boolean;
  color: string;
  size: string;
  price: number;
  stockQuantity: number;
  packageWeight?: number;
  packageLength?: number;
  packageWidth?: number;
  packageHeight?: number;
}
export interface ProductImageInput { id?: number; imageUrl: string; variantIndex?: number; }

export interface ProductResponse {
  bestOffer?: ProductOffer | null;
  discountedPrice?: number;
  id: number;
  name: string;
  slug?: string;
  description?: string;
  basePrice: number;
  averageRating?: number;
  reviewCount?: number;
  isActive?: boolean;
  isNew?: boolean;
  categoryId: number;
  productImages?: ProductImage[];
  imageUrl?: string;
  image?: string;
  thumbnail?: string;
  images?: string[];
  colors?: ProductColor[];
  variants?: ProductVariant[];
  createdAt?: string;
}

export interface ProductVariant {
  packageWeight?: number;
  packageLength?: number;
  packageWidth?: number;
  packageHeight?: number;
  sku?: string;
  bestOffer?: ProductOffer | null;
  discountedPrice?: number;
  id: number;
  size: string;
  color: string;
  price: number;
  stockQuantity: number;
  isActive: boolean;
}

export interface ProductFilters {
  saleOnly?: boolean;
  isActive?: boolean;
  inStock?: boolean;
  newWithinDays?: number;
  categoryId?: number | string;
  categoryIds?: string;
  keyword?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  color?: string;
  sort?: string;
}

export interface ProductRequest {
  variants?: ProductVariantInput[];
  images?: ProductImageInput[];
  name: string;
  slug?: string;
  description?: string;
  basePrice: number;
  categoryId: number;
  isActive?: boolean;
  imageUrl?: string;
}
