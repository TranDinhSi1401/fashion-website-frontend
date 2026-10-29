import type { ProductVariant } from '../types/product';
import { normalizeSize } from './catalog.ts';

export function availableVariants(variants: ProductVariant[]): ProductVariant[] {
  return variants.filter(variant => variant.isActive && variant.stockQuantity > 0);
}

export function findVariant(variants: ProductVariant[], color: string, size: string): ProductVariant | undefined {
  return availableVariants(variants).find(variant => variant.color.trim() === color
    && normalizeSize(variant.size) === normalizeSize(size));
}

export function quantityWithinStock(value: number, stock: number): number {
  if (stock <= 0) return 0;
  return Math.max(1, Math.min(stock, Number.isFinite(value) ? Math.trunc(value) : 1));
}
