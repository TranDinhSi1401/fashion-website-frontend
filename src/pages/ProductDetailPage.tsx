import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { Star, ShieldCheck, Truck, RefreshCw, Check } from 'lucide-react';
import { productService } from '../services/productService';
import { ProductResponse } from '../types/product';
import Breadcrumb from '../components/layout/Breadcrumb';
import QuantityStepper from '../components/product/QuantityStepper';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { formatCurrencyVND, extractProductImage, extractAllProductImages } from '../utils/format';

const SIZES = ['S', 'M', 'L', 'XL'];

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [quantity, setQuantity] = useState<number>(1);
  const [addedNotice, setAddedNotice] = useState<boolean>(false);
  const [selectedImgIdx, setSelectedImgIdx] = useState<number>(0);
  const [imgError, setImgError] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      setIsLoading(true);
      setError('');
      setProduct(null);
      setSelectedImgIdx(0);
      setImgError(false);
      try {
        const res = await productService.getProductById(id);
        if (res && res.data) {
          setProduct(res.data);
        } else {
          setError('Không tìm thấy sản phẩm trong dữ liệu hệ thống.');
        }
      } catch (err) {
        setError(axios.isAxiosError(err) && err.response?.status === 404
          ? 'Không tìm thấy sản phẩm trong dữ liệu hệ thống.'
          : 'Không thể tải thông tin sản phẩm. Vui lòng kiểm tra kết nối và thử lại.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Đang tải thông tin sản phẩm...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h2>Thông tin sản phẩm chưa khả dụng</h2>
        <p role="alert" style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>{error || 'Không tìm thấy sản phẩm trong dữ liệu hệ thống.'}</p>
        <Link to="/products" style={{ marginTop: '16px', display: 'inline-block' }}>
          <Button variant="primary">Quay Lại Cửa Hàng</Button>
        </Link>
      </div>
    );
  }

  const dataImages = extractAllProductImages(product);

  const activeImage = dataImages[selectedImgIdx] || extractProductImage(product);

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div className="container">
        <Breadcrumb
          items={[
            { label: 'Sản Phẩm', to: '/products' },
            { label: product.name },
          ]}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '48px',
            marginTop: '20px',
          }}
        >
          {/* Image Gallery Column - with Thumbnail selector for productImages */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                width: '100%',
                aspectRatio: '1 / 1.15',
                backgroundColor: '#F5F5F7',
                overflow: 'hidden',
                borderRadius: 'var(--radius-card)',
                border: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {activeImage && !imgError ? (
                <img
                  src={activeImage}
                  alt={product.name}
                  onError={() => setImgError(true)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    padding: '20px',
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase' }}>
                    {product.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Chưa có hình ảnh sản phẩm</div>
                </div>
              )}
            </div>

            {/* Clickable Multi-Angle Thumbnails from `productImages` */}
            {dataImages.length > 1 && (
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                {dataImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedImgIdx(idx);
                      setImgError(false);
                    }}
                    style={{
                      width: '64px',
                      height: '72px',
                      borderRadius: '4px',
                      backgroundColor: '#F5F5F7',
                      border: selectedImgIdx === idx ? '2px solid #000000' : '1px solid #E0E0E0',
                      padding: '4px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Badge variant={product.isActive ? 'success' : 'error'}>
                  {product.isActive ? 'Còn hàng' : 'Tạm hết'}
                </Badge>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <Star size={14} fill="var(--color-accent-gold)" color="var(--color-accent-gold)" />
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {product.averageRating ? Number(product.averageRating).toFixed(1) : '5.0'}
                  </span>
                  <span>({product.reviewCount || 0} đánh giá)</span>
                </div>
              </div>

              <h1
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                  lineHeight: 1.3,
                  marginBottom: '12px',
                }}
              >
                {product.name}
              </h1>

              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                {formatCurrencyVND(product.basePrice)}
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: 'var(--border-light)' }} />

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {product.description || 'Chất lượng vải thượng hạng, đường may tỉ mỉ, form dáng tôn vinh phong thái hiện đại.'}
            </p>

            <div>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '10px',
                }}
              >
                Kích Cỡ: <span style={{ color: 'var(--color-accent-gold)' }}>{selectedSize}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: 'var(--radius-btn)',
                      border: '1px solid',
                      borderColor: selectedSize === size ? 'var(--color-primary)' : 'var(--border-default)',
                      backgroundColor: selectedSize === size ? 'var(--color-primary)' : 'transparent',
                      color: selectedSize === size ? 'var(--text-inverse)' : 'var(--text-primary)',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '10px',
                }}
              >
                Số Lượng
              </div>
              <QuantityStepper value={quantity} onChange={setQuantity} min={1} max={99} />
            </div>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '10px' }}>
              <Button
                variant="primary"
                size="lg"
                style={{ flex: 1, minWidth: '180px' }}
                onClick={handleAddToCart}
              >
                {addedNotice ? (
                  <>
                    <Check size={18} />
                    <span>Đã Thêm Vào Giỏ</span>
                  </>
                ) : (
                  'Thêm Vào Giỏ Hàng'
                )}
              </Button>

              <Button
                variant="outline"
                size="lg"
                style={{ flex: 1, minWidth: '180px' }}
                onClick={() => alert(`Mua ngay ${quantity} sản phẩm với kích cỡ ${selectedSize}`)}
              >
                Mua Ngay
              </Button>
            </div>

            <div
              style={{
                marginTop: '16px',
                padding: '20px',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-card)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '0.82rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Truck size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Giao hàng toàn quốc trong 2 - 4 ngày làm việc</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <RefreshCw size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Hỗ trợ đổi size miễn phí trong 30 ngày tận nơi</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Bảo hành chính hãng, hoàn tiền 100% nếu phát hiện lỗi</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

