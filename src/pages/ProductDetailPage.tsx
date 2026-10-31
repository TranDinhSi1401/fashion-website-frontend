import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { aiService } from '../services/aiService';
import { productService } from '../services/productService';
import { ProductResponse } from '../types/product';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Breadcrumb from '../components/layout/Breadcrumb';
import QuantityStepper from '../components/product/QuantityStepper';
import ProductCard from '../components/product/ProductCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import NewBadge from '../components/product/NewBadge';
import BackButton from '../components/common/BackButton';
import { formatCurrencyVND, extractAllProductImages } from '../utils/format';
import { normalizeSize } from '../utils/catalog';
import { availableVariants, findVariant, quantityWithinStock } from '../utils/variants';
import { trackBehavior } from '../services/behaviorService';
import './ProductDetailPage.css';

const EMPTY_RECOMMENDATIONS: ProductResponse[] = [];

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated, isCustomer, isLoading: authLoading } = useAuth();
  const { addItem, busy, cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selection, setSelection] = useState({ color: '', size: '' });
  const [quantity, setQuantity] = useState(1);
  const [quantityError, setQuantityError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [retry, setRetry] = useState(0);
  const [recommendationResult, setRecommendationResult] = useState<{
    key: string;
    products: ProductResponse[];
    error: string;
  } | null>(null);
  const [canScrollRecommendationsLeft, setCanScrollRecommendationsLeft] = useState(false);
  const [canScrollRecommendationsRight, setCanScrollRecommendationsRight] = useState(false);
  const recommendationsViewport = useRef<HTMLDivElement>(null);
  const viewedProductId = useRef<number | null>(null);
  const selectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setIsLoading(true); setError(''); setProduct(null); setNotice(''); setActionError(''); setQuantityError('');
    productService.getProductById(id, controller.signal).then(response => {
      if (controller.signal.aborted) return;
      if (!response.data) throw new Error('Missing product');
      const next = response.data;
      setProduct(next);
      const first = availableVariants(next.variants || [])[0];
      setSelection({ color: first?.color.trim() || '', size: first ? normalizeSize(first.size) : '' });
      setQuantity(1); setSelectedImage(null); setFailedImage(null);
    }).catch(failure => {
      if (!controller.signal.aborted) setError(axios.isAxiosError(failure) && failure.response?.status === 404
        ? 'Không tìm thấy sản phẩm trong dữ liệu hệ thống.' : 'Không thể tải sản phẩm. Vui lòng thử lại.');
    }).finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [id, retry]);

  useEffect(() => {
    if (!product || !user?.id || !isCustomer) return;

    const controller = new AbortController();
    const key = `${user.id}:${product.id}`;
    aiService.getRecommendations(user.id, 8, controller.signal).then(products => {
      if (!controller.signal.aborted) {
        setRecommendationResult({
          key,
          products: products.filter(item => item.id !== product.id),
          error: '',
        });
      }
    }).catch(() => {
      if (!controller.signal.aborted) {
        setRecommendationResult({
          key,
          products: EMPTY_RECOMMENDATIONS,
          error: 'Không thể tải sản phẩm gợi ý. Vui lòng thử lại sau.',
        });
      }
    });

    return () => controller.abort();
  }, [product, user?.id, isCustomer]);

  const recommendationKey = product && user?.id && isCustomer ? `${user.id}:${product.id}` : null;
  const currentRecommendationResult = recommendationResult?.key === recommendationKey
    ? recommendationResult
    : null;
  const recommendations = currentRecommendationResult?.products || EMPTY_RECOMMENDATIONS;
  const recommendationsLoading = Boolean(recommendationKey && !currentRecommendationResult);
  const recommendationsError = currentRecommendationResult?.error || '';

  useEffect(() => {
    const viewport = recommendationsViewport.current;
    if (!viewport) return;

    viewport.scrollLeft = 0;
    const updateScrollControls = () => {
      setCanScrollRecommendationsLeft(viewport.scrollLeft > 1);
      setCanScrollRecommendationsRight(
        viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 1
      );
    };

    updateScrollControls();
    viewport.addEventListener('scroll', updateScrollControls);
    window.addEventListener('resize', updateScrollControls);
    return () => {
      viewport.removeEventListener('scroll', updateScrollControls);
      window.removeEventListener('resize', updateScrollControls);
    };
  }, [recommendations]);

  const scrollRecommendations = (direction: -1 | 1) => {
    const viewport = recommendationsViewport.current;
    const firstCard = viewport?.querySelector<HTMLElement>('.recommendation-card');
    if (!viewport || !firstCard) return;

    const gap = Number.parseFloat(window.getComputedStyle(viewport).columnGap) || 0;
    viewport.scrollBy({
      left: direction * (firstCard.getBoundingClientRect().width + gap),
      behavior: 'smooth',
    });
  };

  const variants = (product?.variants || []).filter(variant => variant.isActive);
  const sellable = availableVariants(variants);
  const selectedVariant = findVariant(variants, selection.color, selection.size);
  const stock = selectedVariant?.stockQuantity || 0;
  const alreadyInCart = cart?.items.find(item => item.variantId === selectedVariant?.id)?.quantity || 0;
  const remaining = Math.max(0, stock - alreadyInCart);
  const chosenQuantity = quantityWithinStock(quantity, remaining);
  const colors = [...new Set(variants.map(variant => variant.color.trim()))];
  const sizes = [...new Set(variants.map(variant => normalizeSize(variant.size)))];
  const images = extractAllProductImages(product);
  const variantImage = product?.productImages?.find(image => image.variantId === selectedVariant?.id && image.imageUrl)?.imageUrl;
  const activeImage = selectedImage || variantImage || images[0];

  // 1. Gửi VIEW ngay khi vào trang & 2. Dwell time: Sau 15 giây nếu khách vẫn đang ở trang này, gửi DWELL_15S (+2 điểm)
  useEffect(() => {
    if (!product || !isAuthenticated || !isCustomer) return;

    // 1. Gửi VIEW ngay (dùng useRef chặn gửi đôi do React StrictMode)
    if (viewedProductId.current !== product.id) {
      viewedProductId.current = product.id;
      trackBehavior({ productId: product.id, variantId: null, type: 'VIEW' });
    }

    // 2. Dwell time: Sau 15 giây nếu khách vẫn đang đọc thông tin trên trang này, gửi DWELL_15S (+2 điểm ma trận sở thích)
    const dwellTimer = setTimeout(() => {
      trackBehavior({ productId: product.id, variantId: null, type: 'DWELL_15S' });
    }, 15000);

    // Xóa timer nếu khách chuyển trang trước 15s
    return () => clearTimeout(dwellTimer);
  }, [product, isAuthenticated, isCustomer]);

  useEffect(() => () => clearTimeout(selectTimer.current), []);

  const changeSelection = (color: string, size: string) => {
    if (product && isAuthenticated && isCustomer) {
      // debounce 300ms: bấm liên tục chỉ gửi lựa chọn cuối cùng
      const payload = { productId: product.id, variantId: findVariant(variants, color, size)?.id ?? null, type: 'SELECT_VARIANT' as const };
      clearTimeout(selectTimer.current);
      selectTimer.current = setTimeout(() => trackBehavior(payload), 300);
    }
    setQuantityError('');
    setSelection({ color, size }); setQuantity(1); setNotice(''); setActionError(''); setSelectedImage(null); setFailedImage(null);
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) { navigate('/login', { state: { from: location } }); return; }
    if (!isCustomer) { setActionError('Chỉ tài khoản khách hàng có thể thêm sản phẩm vào giỏ.'); return; }
    if (!selectedVariant || chosenQuantity < 1 || chosenQuantity > remaining) return;
    setActionError(''); setNotice('');
    try {
      await addItem(selectedVariant.id, chosenQuantity);
      setNotice(`Đã thêm ${chosenQuantity} sản phẩm vào giỏ hàng.`);
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : 'Không thể thêm sản phẩm vào giỏ.');
      // Re-read inventory after a rejected write; never turn a failed request into success.
      if (id) {
        try { const response = await productService.getProductById(id); setProduct(response.data); } catch { /* Keep the previous product and the error. */ }
      }
    }
  };

  if (isLoading) return <div className="container product-detail-state" role="status">Đang tải thông tin sản phẩm…</div>;
  if (error || !product) return <div className="container product-detail-state"><h1>Thông tin sản phẩm chưa khả dụng</h1>
    <p role="alert">{error || 'Không tìm thấy sản phẩm.'}</p><Button variant="outline" onClick={() => setRetry(value => value + 1)}>Thử lại</Button>
    <Link to="/products">Quay lại sản phẩm</Link></div>;

  return <div className="container product-detail">
    <Breadcrumb items={[{ label: 'Sản phẩm', to: '/products' }, { label: product.name }]} />
    <BackButton />
    <div className="product-detail-layout">
      <section aria-label="Hình ảnh sản phẩm">
        <div className="product-detail-image">{activeImage && failedImage !== activeImage
          ? <img src={activeImage} alt={product.name} onError={() => setFailedImage(activeImage)} />
          : <p>Chưa có hình ảnh sản phẩm</p>}</div>
        {images.length > 1 && <div className="product-detail-thumbnails">{images.map((image, index) => <button key={image} type="button"
          aria-label={`Xem ảnh ${index + 1}`} aria-pressed={activeImage === image}
          onClick={() => { setSelectedImage(image); setFailedImage(null); }}><img src={image} alt="" /></button>)}</div>}
      </section>
      <section className="product-detail-info" aria-label="Thông tin sản phẩm">
        <div><Badge variant={sellable.length ? 'success' : 'error'}>{sellable.length ? 'Còn hàng' : 'Tạm hết hàng'}</Badge>
          {product.isNew && <> <NewBadge /></>}
          <h1>{product.name}</h1>
          <p className="product-detail-price">{formatCurrencyVND(selectedVariant?.price ?? product.basePrice)}</p>
          <p>{product.reviewCount || 0} đánh giá{product.averageRating != null ? ` · ${Number(product.averageRating).toFixed(1)}/5` : ''}</p>
        </div>
        <p className="product-detail-description">{product.description || 'Chưa có mô tả sản phẩm.'}</p>
        <fieldset disabled={busy}><legend>Màu sắc: {selection.color || 'Chưa chọn'}</legend>
          <div className="product-detail-options">{colors.map(color => {
            const available = sellable.some(variant => variant.color.trim() === color);
            return <button key={color} type="button" disabled={!available} aria-pressed={selection.color === color}
              onClick={() => {
                const variant = findVariant(variants, color, selection.size) || sellable.find(item => item.color.trim() === color);
                if (variant) changeSelection(color, normalizeSize(variant.size));
              }}>{color}{available ? '' : ' — Hết hàng'}</button>;
          })}</div>
        </fieldset>
        <fieldset disabled={busy}><legend>Kích cỡ: {selection.size || 'Chưa chọn'}</legend>
          <div className="product-detail-options">{sizes.map(size => <button key={size} type="button"
            disabled={!findVariant(variants, selection.color, size)} aria-pressed={selection.size === size}
            onClick={() => changeSelection(selection.color, size)}>{size}</button>)}</div>
        </fieldset>
        {selectedVariant ? <p role="status">Còn {stock} sản phẩm với màu {selection.color}, size {selection.size}.
          {alreadyInCart > 0 && ` Bạn đã có ${alreadyInCart} sản phẩm này trong giỏ.`}</p>
          : <p role="status">Chưa có biến thể còn hàng để chọn mua.</p>}
        <div><p className="product-detail-label">Số lượng</p><QuantityStepper key={selectedVariant?.id} value={chosenQuantity} min={remaining ? 1 : 0} max={remaining} onValidationChange={setQuantityError}
          disabled={!remaining || busy} onChange={value => { setQuantity(value); setNotice(''); setActionError(''); }} /></div>
        {stock > 0 && !remaining && <p role="status">Bạn đã thêm đủ số lượng còn lại vào giỏ hàng.</p>}
        <div className="product-detail-actions"><Button size="lg" loading={busy}
          disabled={authLoading || !!quantityError || !selectedVariant || !remaining || chosenQuantity > remaining || (isAuthenticated && !isCustomer)}
          onClick={() => void handleAddToCart()}>{isAuthenticated ? 'Thêm vào giỏ hàng' : 'Đăng nhập để thêm vào giỏ'}</Button>
          <Link to="/cart" className="product-detail-cart-link">Xem giỏ hàng</Link></div>
        {isAuthenticated && !isCustomer && <p role="status">Giỏ hàng dành cho tài khoản khách hàng.</p>}
        {notice && <p role="status" className="product-detail-success">{notice} <Link to="/cart">Đến giỏ hàng</Link></p>}
        {actionError && <p role="alert" className="product-detail-error">{actionError}</p>}
      </section>
    </div>
    {isCustomer && (recommendationsLoading || recommendationsError || recommendations.length > 0) && (
      <section className="product-recommendations" aria-labelledby="product-recommendations-title">
        <div className="product-recommendations-heading">
          <h2 id="product-recommendations-title">Sản phẩm có thể bạn sẽ thích</h2>
          {(canScrollRecommendationsLeft || canScrollRecommendationsRight) && (
            <div className="product-recommendations-controls">
              <button type="button" aria-label="Xem sản phẩm trước" aria-controls="product-recommendations-carousel"
                disabled={!canScrollRecommendationsLeft}
                onClick={() => scrollRecommendations(-1)}>
                <ChevronLeft size={20} aria-hidden="true" />
              </button>
              <button type="button" aria-label="Xem sản phẩm tiếp theo" aria-controls="product-recommendations-carousel"
                disabled={!canScrollRecommendationsRight}
                onClick={() => scrollRecommendations(1)}>
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
        {recommendationsLoading && <p role="status">Đang tải sản phẩm gợi ý…</p>}
        {recommendationsError && <p className="product-recommendations-error" role="alert">{recommendationsError}</p>}
        {recommendations.length > 0 && (
          <div className="product-recommendations-viewport" ref={recommendationsViewport}
            id="product-recommendations-carousel" aria-label="Sản phẩm được đề xuất">
            {recommendations.map(recommendedProduct => (
              <div className="recommendation-card" key={recommendedProduct.id}>
                <ProductCard product={recommendedProduct} />
              </div>
            ))}
          </div>
        )}
      </section>
    )}
  </div>;
}
