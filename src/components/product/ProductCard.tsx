import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ImageOff } from 'lucide-react';
import { ProductResponse } from '../../types/product';
import { formatCurrencyVND, extractAllProductImages } from '../../utils/format';

export interface ProductCardProps {
  product: ProductResponse;
  onQuickBuy?: (product: ProductResponse) => void;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);
  const [imageError, setImageError] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  if (!product) return null;

  const { id, name, basePrice, slug, colors } = product;

  // Extract all images dynamically from backend data (prioritizing `productImages`)
  const dataImages = extractAllProductImages(product);

  // If hovered and product has multiple angles (e.g. front & back in productImages), show 2nd angle on hover!
  const currentDisplayImage =
    isHovered && dataImages.length > 1 && activeImageIdx === 0
      ? dataImages[1]
      : dataImages[activeImageIdx] || dataImages[0] || null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backgroundColor: '#FFFFFF',
        transition: 'transform 0.2s ease',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image Frame */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1.15',
          backgroundColor: '#F5F5F7',
          borderRadius: '4px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Link
          to={`/products/${id}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            padding: '14px',
            textDecoration: 'none',
          }}
        >
          {currentDisplayImage && !imageError ? (
            <img
              src={currentDisplayImage}
              alt={name}
              loading="lazy"
              onError={() => setImageError(true)}
              style={{
                maxHeight: '100%',
                maxWidth: '100%',
                objectFit: 'contain',
                transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                transition: 'transform 0.35s ease-out',
              }}
            />
          ) : (
            /* Clean modern placeholder if data has no image */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#999999',
                textAlign: 'center',
                width: '100%',
                height: '100%',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#EBEBEB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666666',
                }}
              >
                <ImageOff size={24} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {name}
              </span>
            </div>
          )}
        </Link>

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setIsFavorite(!isFavorite);
          }}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: isFavorite ? '#D0021B' : '#777777',
            transition: 'transform 0.15s, color 0.15s',
            zIndex: 2,
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          aria-label="Yêu thích"
        >
          <Heart size={16} fill={isFavorite ? '#D0021B' : 'none'} />
        </button>

        {/* Small badge if multiple photos exist in productImages */}
        {dataImages.length > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              right: '10px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: '#FFFFFF',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '3px',
              pointerEvents: 'none',
            }}
          >
            +{dataImages.length} ảnh
          </div>
        )}
      </div>

      {/* Info Section Under Image */}
      <div style={{ paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* If product has multiple angle thumbnail dots */}
        {dataImages.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            {dataImages.map((imgUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImageIdx(idx)}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: activeImageIdx === idx ? '2px solid #000000' : '1px solid #CCCCCC',
                  padding: 0,
                  cursor: 'pointer',
                  backgroundColor: '#EBEBEB',
                }}
                title={`Ảnh ${idx + 1}`}
              >
                <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>
        )}

        {/* Or if colors are defined */}
        {Array.isArray(colors) && colors.length > 0 && dataImages.length <= 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            {colors.map((c, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (c.imageUrl) {
                    const foundIdx = dataImages.indexOf(c.imageUrl);
                    if (foundIdx >= 0) setActiveImageIdx(foundIdx);
                  }
                }}
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: c.hex || '#333333',
                  border: '1px solid rgba(0,0,0,0.15)',
                  outline: activeImageIdx === idx ? '2px solid #000000' : 'none',
                  outlineOffset: '2px',
                  cursor: 'pointer',
                  padding: 0,
                }}
                title={c.name}
              />
            ))}
          </div>
        )}

        {/* Product Title / Slug from Data */}
        <Link
          to={`/products/${id}`}
          style={{
            fontSize: '0.82rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#111111',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={name}
        >
          {slug ? slug.toUpperCase().replace(/-/g, ' ') : name}
        </Link>

        {/* Price from Data */}
        <div
          style={{
            fontSize: '0.95rem',
            fontWeight: 800,
            color: '#111111',
            letterSpacing: '0.02em',
          }}
        >
          {formatCurrencyVND(basePrice)}
        </div>
      </div>
    </div>
  );
}
