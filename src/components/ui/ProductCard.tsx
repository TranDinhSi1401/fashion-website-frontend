import { ComponentType, ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ImageOff } from 'lucide-react';
import { ProductResponse } from '../../types/product';
import { BadgeVariant, ColorSwatchOption } from '../../types/ui';
import { cn } from '../../utils/cn';
import { extractAllProductImages, formatCurrencyVND } from '../../utils/format';
import Badge from './Badge';
import ColorSwatches from './ColorSwatches';
import styles from './ProductCard.module.css';

export interface ProductCardLinkProps {
  to: string;
  className?: string;
  title?: string;
  children: ReactNode;
}

export interface ProductCardProps {
  product: ProductResponse;
  onQuickBuy?: (product: ProductResponse) => void;
  originalPrice?: number;
  badges?: BadgeVariant[];
  LinkComponent?: ComponentType<ProductCardLinkProps>;
  className?: string;
}

const BADGE_LABEL_MAP: Record<BadgeVariant, string> = {
  new: 'NEW',
  sale: 'SALE',
  'best-seller': 'BEST SELLER',
  vip: 'VIP',
};

export default function ProductCard({
  product,
  onQuickBuy,
  originalPrice,
  badges,
  LinkComponent = Link,
  className = '',
}: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [imageError, setImageError] = useState<boolean>(false);

  if (!product) return null;

  const { id, name, basePrice, colors, isNew } = product;
  const dataImages = extractAllProductImages(product);
  const primaryImage = dataImages[activeImageIdx] || dataImages[0] || null;
  const hoverImage = dataImages.length > 1 && activeImageIdx === 0 ? dataImages[1] : null;
  const hasDiscount = typeof originalPrice === 'number' && originalPrice > basePrice;

  const resolvedBadges: BadgeVariant[] = badges?.length
    ? badges
    : [
        ...(isNew ? (['new'] as BadgeVariant[]) : []),
        ...(hasDiscount ? (['sale'] as BadgeVariant[]) : []),
      ];

  const swatchOptions: ColorSwatchOption[] = Array.isArray(colors)
    ? colors.map((color, idx) => ({
        name: color.name,
        value: `${color.name}-${idx}`,
        hex: color.hex || 'var(--color-primary)',
      }))
    : [];

  const handleSelectColor = (option: ColorSwatchOption) => {
    setSelectedColor(option.value);
    const matchedColor = colors?.find((c, idx) => `${c.name}-${idx}` === option.value);
    if (matchedColor?.imageUrl) {
      const foundIdx = dataImages.indexOf(matchedColor.imageUrl);
      if (foundIdx >= 0) {
        setActiveImageIdx(foundIdx);
        setImageError(false);
      }
    }
  };

  return (
    <article className={cn('rounded-card bg-transparent', styles.card, className)}>
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-card bg-surface">
        <LinkComponent
          to={`/products/${id}`}
          title={name}
          className="block h-full w-full"
        >
          {primaryImage && !imageError ? (
            <>
              <img
                src={primaryImage}
                alt={name}
                loading="lazy"
                onError={() => setImageError(true)}
                className={cn('h-full w-full object-cover', styles.image)}
              />
              {hoverImage && (
                <img
                  src={hoverImage}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className={cn(
                    'pointer-events-none absolute inset-0 h-full w-full object-cover',
                    styles.secondaryImage
                  )}
                />
              )}
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-content-muted">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-disabled text-content-secondary">
                <ImageOff size={22} />
              </div>
              <span className="text-xs font-medium">{name}</span>
            </div>
          )}
        </LinkComponent>

        {resolvedBadges.length > 0 && (
          <div className="pointer-events-none absolute left-2.5 top-2.5 z-[2] flex flex-col items-start gap-1">
            {resolvedBadges.map((badge) => (
              <Badge key={badge} variant={badge}>
                {BADGE_LABEL_MAP[badge]}
              </Badge>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setIsFavorite((prev) => !prev);
          }}
          aria-label="Yêu thích"
          aria-pressed={isFavorite}
          className={cn(
            'absolute right-2.5 top-2.5 z-[2] flex h-8 w-8 items-center justify-center rounded-full',
            isFavorite ? 'text-accent-red' : 'text-content-secondary',
            styles.wishlist
          )}
        >
          <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>

        {onQuickBuy ? (
          <button
            type="button"
            onClick={() => onQuickBuy(product)}
            className={styles.quickBuy}
          >
            MUA NHANH
          </button>
        ) : (
          <LinkComponent to={`/products/${id}`} className={styles.quickBuy}>
            MUA NHANH
          </LinkComponent>
        )}
      </div>

      <div className="mt-3 flex flex-col">
        {swatchOptions.length > 0 && (
          <ColorSwatches
            options={swatchOptions}
            value={selectedColor || swatchOptions[0]?.value}
            onChange={handleSelectColor}
            size="sm"
            className="mb-2"
          />
        )}

        <LinkComponent
          to={`/products/${id}`}
          title={name}
          className="mb-1.5 line-clamp-1 overflow-hidden text-ellipsis text-base font-medium text-content-primary hover:text-content-secondary"
        >
          {name}
        </LinkComponent>

        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-md font-bold',
              hasDiscount ? 'text-accent-red' : 'text-content-primary'
            )}
          >
            {formatCurrencyVND(basePrice)}
          </span>
          {hasDiscount && (
            <span className="text-sm font-normal text-content-muted line-through">
              {formatCurrencyVND(originalPrice)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
