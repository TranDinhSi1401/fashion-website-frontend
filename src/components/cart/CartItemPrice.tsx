import { CartItem } from '../../types/cart';
import { formatCurrencyVND } from '../../utils/format';

export default function CartItemPrice({ item }: { item: CartItem }) {
  const discounted = item.originalPrice != null && item.originalPrice > item.unitPrice;
  return (
    <span className="inline-flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
      {discounted && (
        <del aria-label="Giá gốc" className="text-xs font-normal text-content-muted">
          {formatCurrencyVND(item.originalPrice!)}
        </del>
      )}
      <span aria-label={discounted ? 'Giá khuyến mãi' : 'Đơn giá'} className={discounted ? 'font-bold text-red-600' : ''}>
        {formatCurrencyVND(item.unitPrice)}
      </span>
    </span>
  );
}
