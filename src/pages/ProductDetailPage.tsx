import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { aiService } from '../services/aiService';
import { productService } from '../services/productService';
import { ProductResponse } from '../types/product';
import { SizeOption } from '../types/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Breadcrumb from '../components/layout/Breadcrumb';
import BackButton from '../components/common/BackButton';
import {
  Badge,
  Button,
  Modal,
  ProductCard,
  QuantityStepper,
  SizeSelector,
} from '../components/ui';
import { formatCurrencyVND, extractAllProductImages } from '../utils/format';
import { normalizeSize } from '../utils/catalog';
import { availableVariants, findVariant, quantityWithinStock } from '../utils/variants';
import { trackBehavior } from '../services/behaviorService';
import { cn } from '../utils/cn';
import styles from './ProductDetailPage.module.css';

const EMPTY_RECOMMENDATIONS: ProductResponse[] = [];

const SIZE_GUIDE_ROWS = [
  { size: 'S', height: '1m62 – 1m68', weight: '54 – 61 kg', chest: '88 – 92 cm' },
  { size: 'M', height: '1m68 – 1m74', weight: '62 – 68 kg', chest: '92 – 96 cm' },
  { size: 'L', height: '1m74 – 1m79', weight: '69 – 76 kg', chest: '96 – 102 cm' },
  { size: 'XL', height: '1m79 – 1m85', weight: '77 – 84 kg', chest: '102 – 108 cm' },
];

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
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
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
    productService
      .getProductById(id, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        if (!response.data) throw new Error('Missing product');
        const next = response.data;
        setProduct(next);
        setError('');
        const first = availableVariants(next.variants || [])[0];
        setSelection({
          color: first?.color.trim() || '',
          size: first ? normalizeSize(first.size) : '',
        });
        setQuantity(1);
        setSelectedImage(null);
        setFailedImage(null);
        setNotice('');
        setActionError('');
        setQuantityError('');
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setProduct(null);
          setError(
            axios.isAxiosError(failure) && failure.response?.status === 404
              ? 'Không tìm thấy sản phẩm trong dữ liệu hệ thống.'
              : 'Không thể tải sản phẩm. Vui lòng thử lại.'
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [id, retry]);

  useEffect(() => {
    if (!product || !user?.id || !isCustomer) return;

    const controller = new AbortController();
    const key = `${user.id}:${product.id}`;
    aiService
      .getRecommendations(user.id, 8, controller.signal)
      .then((products) => {
        if (!controller.signal.aborted) {
          setRecommendationResult({
            key,
            products: products.filter((item) => item.id !== product.id),
            error: '',
          });
        }
      })
      .catch(() => {
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

  const recommendationKey =
    product && user?.id && isCustomer ? `${user.id}:${product.id}` : null;
  const currentRecommendationResult =
    recommendationResult?.key === recommendationKey ? recommendationResult : null;
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
    const firstCard = viewport?.querySelector<HTMLElement>('[data-recommendation-card]');
    if (!viewport || !firstCard) return;

    const gap = Number.parseFloat(window.getComputedStyle(viewport).columnGap) || 0;
    viewport.scrollBy({
      left: direction * (firstCard.getBoundingClientRect().width + gap),
      behavior: 'smooth',
    });
  };

  const variants = (product?.variants || []).filter((variant) => variant.isActive);
  const sellable = availableVariants(variants);
  const selectedVariant = findVariant(variants, selection.color, selection.size);
  const stock = selectedVariant?.stockQuantity || 0;
  const alreadyInCart =
    cart?.items.find((item) => item.variantId === selectedVariant?.id)?.quantity || 0;
  const remaining = Math.max(0, stock - alreadyInCart);
  const chosenQuantity = quantityWithinStock(quantity, remaining);
  const colors = [...new Set(variants.map((variant) => variant.color.trim()))];
  const sizes = [...new Set(variants.map((variant) => normalizeSize(variant.size)))];
  const images = extractAllProductImages(product);
  const variantImage = product?.productImages?.find(
    (image) => image.variantId === selectedVariant?.id && image.imageUrl
  )?.imageUrl;
  const activeImage = selectedImage || variantImage || images[0];

  useEffect(() => {
    if (!product || !isAuthenticated || !isCustomer) return;

    if (viewedProductId.current !== product.id) {
      viewedProductId.current = product.id;
      trackBehavior({ productId: product.id, variantId: null, type: 'VIEW' });
    }

    const dwellTimer = window.setTimeout(() => {
      trackBehavior({ productId: product.id, variantId: null, type: 'DWELL_15S' });
    }, 15000);

    return () => window.clearTimeout(dwellTimer);
  }, [product, isAuthenticated, isCustomer]);

  useEffect(() => () => window.clearTimeout(selectTimer.current), []);

  const changeSelection = (color: string, size: string) => {
    if (product && isAuthenticated && isCustomer) {
      const payload = {
        productId: product.id,
        variantId: findVariant(variants, color, size)?.id ?? null,
        type: 'SELECT_VARIANT' as const,
      };
      window.clearTimeout(selectTimer.current);
      selectTimer.current = window.setTimeout(() => trackBehavior(payload), 300);
    }
    setQuantityError('');
    setSelection({ color, size });
    setQuantity(1);
    setNotice('');
    setActionError('');
    setSelectedImage(null);
    setFailedImage(null);
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (!isCustomer) {
      setActionError('Chỉ tài khoản khách hàng có thể thêm sản phẩm vào giỏ.');
      return;
    }
    if (!selectedVariant || chosenQuantity < 1 || chosenQuantity > remaining) return;
    setActionError('');
    setNotice('');
    try {
      await addItem(selectedVariant.id, chosenQuantity);
      setNotice(`Đã thêm ${chosenQuantity} sản phẩm vào giỏ hàng.`);
    } catch (failure) {
      setActionError(
        failure instanceof Error ? failure.message : 'Không thể thêm sản phẩm vào giỏ.'
      );
      if (id) {
        try {
          const response = await productService.getProductById(id);
          setProduct(response.data);
        } catch {
          /* Keep previous product and error */
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div
        className="container flex flex-col items-center gap-6 px-5 py-20 text-center text-base text-content-secondary"
        role="status"
      >
        Đang tải thông tin sản phẩm…
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container flex flex-col items-center gap-6 px-5 py-20 text-center">
        <h1 className="text-xl font-bold uppercase tracking-wide text-content-primary">
          Thông tin sản phẩm chưa khả dụng
        </h1>
        <p role="alert" className="text-base text-status-error">
          {error || 'Không tìm thấy sản phẩm.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button
            variant="secondary"
            onClick={() => {
              setIsLoading(true);
              setError('');
              setRetry((value) => value + 1);
            }}
          >
            Thử lại
          </Button>
          <Link to="/products" className="text-sm font-medium underline underline-offset-4">
            Quay lại sản phẩm
          </Link>
        </div>
      </div>
    );
  }

  const sizeOptions: SizeOption[] = sizes.map((size) => ({
    label: size,
    value: size,
    disabled: !findVariant(variants, selection.color, size),
  }));

  return (
    <div className="container pb-16">
      <Breadcrumb items={[{ label: 'Sản phẩm', to: '/products' }, { label: product.name }]} />
      <BackButton />

      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
        <section aria-label="Hình ảnh sản phẩm">
          <div className="grid aspect-[3/4] place-items-center overflow-hidden border border-line-light bg-surface text-content-secondary">
            {activeImage && failedImage !== activeImage ? (
              <img
                src={activeImage}
                alt={product.name}
                className="h-full w-full object-cover"
                onError={() => setFailedImage(activeImage)}
              />
            ) : (
              <p className="text-sm text-content-muted">Chưa có hình ảnh sản phẩm</p>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto py-3.5">
              {images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  aria-label={`Xem ảnh ${index + 1}`}
                  aria-pressed={activeImage === image}
                  onClick={() => {
                    setSelectedImage(image);
                    setFailedImage(null);
                  }}
                  className={cn(
                    'aspect-[3/4] w-16 shrink-0 overflow-hidden bg-surface',
                    activeImage === image ? 'border-2 border-primary' : 'border border-line'
                  )}
                >
                  <img src={image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section
          className="flex flex-col items-start gap-6"
          aria-label="Thông tin sản phẩm"
        >
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant={sellable.length ? 'success' : 'error'}>
                {sellable.length ? 'Còn hàng' : 'Tạm hết hàng'}
              </Badge>
              {product.isNew && <Badge variant="new">NEW</Badge>}
            </div>

            <h1 className="mb-3 text-lg font-bold tracking-wide text-content-primary md:text-2xl">
              {product.name}
            </h1>

            <p className="mb-2 text-[22px] font-bold text-content-primary">
              {formatCurrencyVND(selectedVariant?.price ?? product.basePrice)}
            </p>

            <p className="text-sm text-content-secondary">
              {product.reviewCount || 0} đánh giá
              {product.averageRating != null
                ? ` · ${Number(product.averageRating).toFixed(1)}/5`
                : ''}
            </p>
          </div>

          <p className="whitespace-pre-line text-base leading-relaxed text-content-secondary">
            {product.description || 'Chưa có mô tả sản phẩm.'}
          </p>

          <fieldset disabled={busy} className="w-full border-0">
            <legend className="mb-3 text-sm font-bold uppercase tracking-wide text-content-primary">
              Màu sắc: {selection.color || 'Chưa chọn'}
            </legend>
            <div className="flex flex-wrap gap-2.5">
              {colors.map((color) => {
                const available = sellable.some((variant) => variant.color.trim() === color);
                const isSelected = selection.color === color;
                const matchedHex = product.colors?.find(
                  (c) => c.name.toLowerCase() === color.toLowerCase()
                )?.hex;

                return (
                  <button
                    key={color}
                    type="button"
                    disabled={!available}
                    aria-pressed={isSelected}
                    onClick={() => {
                      const variant =
                        findVariant(variants, color, selection.size) ||
                        sellable.find((item) => item.color.trim() === color);
                      if (variant) changeSelection(color, normalizeSize(variant.size));
                    }}
                    className={cn(
                      'inline-flex min-h-[38px] min-w-[44px] items-center gap-2 rounded-sm border px-3 text-sm font-medium transition-colors',
                      !available
                        ? 'cursor-not-allowed border-line bg-surface text-content-disabled line-through'
                        : isSelected
                          ? 'border-primary bg-primary font-semibold text-content-inverse'
                          : 'border-line bg-surface-body text-content-primary hover:border-primary'
                    )}
                  >
                    {matchedHex && (
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-line"
                        style={{ backgroundColor: matchedHex }}
                      />
                    )}
                    <span>
                      {color}
                      {available ? '' : ' — Hết hàng'}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset disabled={busy} className="w-full border-0">
            <div className="mb-3 flex items-center justify-between gap-4">
              <legend className="text-sm font-bold uppercase tracking-wide text-content-primary">
                Kích cỡ: {selection.size || 'Chưa chọn'}
              </legend>
              <Button
                variant="ghost"
                className="italic"
                onClick={() => setSizeGuideOpen(true)}
              >
                Hướng dẫn chọn size
              </Button>
            </div>

            <SizeSelector
              options={sizeOptions}
              value={selection.size}
              onChange={(option) => changeSelection(selection.color, option.value)}
            />
          </fieldset>

          {selectedVariant ? (
            <p role="status" className="text-sm text-content-secondary">
              Còn {stock} sản phẩm với màu {selection.color}, size {selection.size}.
              {alreadyInCart > 0 && ` Bạn đã có ${alreadyInCart} sản phẩm này trong giỏ.`}
            </p>
          ) : (
            <p role="status" className="text-sm text-content-secondary">
              Chưa có biến thể còn hàng để chọn mua.
            </p>
          )}

          <div>
            <p className="mb-2.5 text-sm font-bold uppercase tracking-wide text-content-primary">
              Số lượng
            </p>
            <QuantityStepper
              key={selectedVariant?.id}
              value={chosenQuantity}
              min={remaining ? 1 : 0}
              max={remaining}
              onValidationChange={setQuantityError}
              disabled={!remaining || busy}
              onChange={(value) => {
                setQuantity(value);
                setNotice('');
                setActionError('');
              }}
            />
          </div>

          {stock > 0 && !remaining && (
            <p role="status" className="text-sm text-status-warning">
              Bạn đã thêm đủ số lượng còn lại vào giỏ hàng.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-6">
            <Button
              size="lg"
              loading={busy}
              disabled={
                authLoading ||
                Boolean(quantityError) ||
                !selectedVariant ||
                !remaining ||
                chosenQuantity > remaining ||
                (isAuthenticated && !isCustomer)
              }
              onClick={() => void handleAddToCart()}
            >
              {isAuthenticated ? 'Thêm vào giỏ hàng' : 'Đăng nhập để thêm vào giỏ'}
            </Button>

            <Link
              to="/cart"
              className="text-sm font-medium text-content-secondary underline underline-offset-4 hover:text-content-primary"
            >
              Xem giỏ hàng
            </Link>
          </div>

          {isAuthenticated && !isCustomer && (
            <p role="status" className="text-sm text-content-secondary">
              Giỏ hàng dành cho tài khoản khách hàng.
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm font-medium text-status-success">
              {notice}{' '}
              <Link to="/cart" className="underline underline-offset-4">
                Đến giỏ hàng
              </Link>
            </p>
          )}
          {actionError && (
            <p role="alert" className="text-sm text-status-error">
              {actionError}
            </p>
          )}
        </section>
      </div>

      {isCustomer &&
        (recommendationsLoading || recommendationsError || recommendations.length > 0) && (
          <section className="mt-14" aria-labelledby="product-recommendations-title">
            <div className="mb-6 flex items-center justify-between gap-5">
              <h2
                id="product-recommendations-title"
                className="text-xl font-bold uppercase tracking-wider text-content-primary"
              >
                Sản phẩm có thể bạn sẽ thích
              </h2>
              {(canScrollRecommendationsLeft || canScrollRecommendationsRight) && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label="Xem sản phẩm trước"
                    aria-controls="product-recommendations-carousel"
                    disabled={!canScrollRecommendationsLeft}
                    onClick={() => scrollRecommendations(-1)}
                    className="grid h-10 w-10 place-items-center border border-line bg-surface-body text-content-primary transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={20} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Xem sản phẩm tiếp theo"
                    aria-controls="product-recommendations-carousel"
                    disabled={!canScrollRecommendationsRight}
                    onClick={() => scrollRecommendations(1)}
                    className="grid h-10 w-10 place-items-center border border-line bg-surface-body text-content-primary transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight size={20} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>

            {recommendationsLoading && (
              <p role="status" className="text-base text-content-secondary">
                Đang tải sản phẩm gợi ý…
              </p>
            )}
            {recommendationsError && (
              <p className="text-base text-status-error" role="alert">
                {recommendationsError}
              </p>
            )}
            {recommendations.length > 0 && (
              <div
                className={styles.viewport}
                ref={recommendationsViewport}
                id="product-recommendations-carousel"
                aria-label="Sản phẩm được đề xuất"
              >
                {recommendations.map((recommendedProduct) => (
                  <div
                    className={styles.recommendationCard}
                    data-recommendation-card
                    key={recommendedProduct.id}
                  >
                    <ProductCard product={recommendedProduct} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

      <Modal
        isOpen={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        title="Bảng quy đổi kích cỡ"
        size="size-guide"
      >
        <p className="mb-4 text-sm italic text-content-secondary">
          Gợi ý: Nếu bạn thích mặc ôm vừa vặn, hãy chọn đúng theo cân nặng; nếu thích thoải mái,
          hãy tăng 1 size.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-primary bg-surface text-xs font-bold uppercase tracking-wide text-content-primary">
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Chiều cao</th>
                <th className="px-4 py-3">Cân nặng</th>
                <th className="px-4 py-3">Vòng ngực</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-light">
              {SIZE_GUIDE_ROWS.map((row) => (
                <tr key={row.size} className="text-content-primary">
                  <td className="px-4 py-3 font-bold">{row.size}</td>
                  <td className="px-4 py-3 text-content-secondary">{row.height}</td>
                  <td className="px-4 py-3 text-content-secondary">{row.weight}</td>
                  <td className="px-4 py-3 text-content-secondary">{row.chest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
