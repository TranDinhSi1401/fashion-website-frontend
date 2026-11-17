import type { ProductOffer, ProductResponse, ProductVariant } from '../types/product';
const normalizeSize = (value: string) => value.trim().toUpperCase().replace(/^2XL$/, 'XXL');

export function isCurrentOffer(offer: ProductOffer | null | undefined, now = Date.now()): offer is ProductOffer {
  return Boolean(offer && Number.isFinite(Number(offer.originalPrice)) && Number(offer.originalPrice) > 0 &&
    Number.isFinite(Number(offer.discountAmount)) && Number(offer.discountAmount) > 0 &&
    Number.isFinite(Number(offer.discountedPrice)) && Number(offer.discountedPrice) >= 0 &&
    Number(offer.discountedPrice) < Number(offer.originalPrice) && Date.parse(offer.endDate) >= now);
}

export function saleVariantMatches(variant: ProductVariant, sizes: string[], colors: string[]) {
  return variant.isActive && variant.stockQuantity > 0 &&
    (!sizes.length || sizes.some(s => normalizeSize(s) === normalizeSize(variant.size))) &&
    (!colors.length || colors.some(c => c.trim().toLocaleLowerCase('vi') === variant.color.trim().toLocaleLowerCase('vi')));
}

export function saleOfferForSelection(product: ProductResponse, sizes: string[], colors: string[], now = Date.now()): ProductOffer | null {
  if (!product.variants?.length) return !sizes.length && !colors.length && !product.bestOffer?.variantId && isCurrentOffer(product.bestOffer, now) ? product.bestOffer : null;
  let best: ProductOffer | null = null;
  for (const v of product.variants) {
    if (!saleVariantMatches(v, sizes, colors)) continue;
    const offer = isCurrentOffer(v.bestOffer, now) ? v.bestOffer : isCurrentOffer(product.bestOffer, now) &&
      (product.bestOffer.variantId === v.id || (!product.bestOffer.variantId && Number(product.bestOffer.originalPrice) === Number(v.price))) ? product.bestOffer : null;
    if (offer && (!best || Number(offer.discountAmount) > Number(best.discountAmount))) best = offer;
  }
  return best;
}

export function hasSaleOffer(product: ProductResponse, sizes: string[], colors: string[], now = Date.now()) {
  return Boolean(saleOfferForSelection(product, sizes, colors, now));
}
