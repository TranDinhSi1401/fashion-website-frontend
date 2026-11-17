import { isCurrentOffer } from '../../utils/productOffers';
import { ProductOffer } from '../../types/product';
import { formatCurrencyVND } from '../../utils/format';

export default function ProductPrice({ price, offer }: { price: number; offer?: ProductOffer | null }) {
  const original = offer?.originalPrice ?? price;
  const discounted = isCurrentOffer(offer) && Number(offer.discountedPrice) < Number(original);
  return <span>
    <span className="font-bold">{formatCurrencyVND(discounted ? offer.discountedPrice : price)}</span>
    {discounted && <>
      {' '}<del className="text-sm font-normal text-content-muted">{formatCurrencyVND(original)}</del>
      <span className="block text-sm font-normal text-red-600">{offer.title} · Giảm {formatCurrencyVND(offer.discountAmount)}{offer.variantId ? " · Theo biến thể" : ""}</span>
    </>}
  </span>;
}
