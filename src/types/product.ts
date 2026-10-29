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

export interface ProductResponse {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  basePrice: number;
  averageRating?: number;
  reviewCount?: number;
  isActive?: boolean;
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
  id: number;
  size: string;
  color: string;
  price: number;
  stockQuantity: number;
  isActive: boolean;
}

export interface ProductFilters {
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
  name: string;
  slug?: string;
  description?: string;
  basePrice: number;
  categoryId: number;
  isActive?: boolean;
  imageUrl?: string;
}
