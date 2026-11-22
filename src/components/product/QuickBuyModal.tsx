import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Check, AlertCircle, Sparkles } from 'lucide-react';
import { ProductResponse, ProductVariant } from '../../types/product';
import { productService } from '../../services/productService';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { Button, Modal, QuantityStepper, SizeSelector } from '../ui';
import ProductPrice from './ProductPrice';
import ColorSwatches from '../ui/ColorSwatches';
import { extractAllProductImages, formatCurrencyVND } from '../../utils/format';
import { normalizeSize } from '../../utils/catalog';
import { availableVariants, findVariant, quantityWithinStock } from '../../utils/variants';
import { ColorSwatchOption, SizeOption } from '../../types/ui';
import { cn } from '../../utils/cn';

export interface QuickBuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductResponse | null;
}

export default function QuickBuyModal({ isOpen, onClose, product }: QuickBuyModalProps) {
  const navigate = useNavigate();
  const { isAuthenticated, isCustomer } = useAuth();
  const { addItem, cart } = useCart();

  const [detailedProduct, setDetailedProduct] = useState<ProductResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [selection, setSelection] = useState<{ color: string; size: string }>({ color: '', size: '' });
  const [quantity, setQuantity] = useState<number>(1);
  const [buyingNow, setBuyingNow] = useState<boolean>(false);
  const [addingToCart, setAddingToCart] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Load full product details if variants are missing or on modal open
  useEffect(() => {
    if (!isOpen || !product) {
      setDetailedProduct(null);
      setSelection({ color: '', size: '' });
      setQuantity(1);
      setErrorMsg('');
      setSuccessMsg('');
      setSelectedImage(null);
      return;
    }

    if (product.variants && product.variants.length > 0) {
      setDetailedProduct(product);
      initSelection(product);
    } else {
      setLoadingDetails(true);
      setErrorMsg('');
      productService
        .getProductById(product.id)
        .then((res) => {
          if (res.data) {
            setDetailedProduct(res.data);
            initSelection(res.data);
          }
        })
        .catch(() => {
          setErrorMsg('Không thể tải chi tiết sản phẩm. Vui lòng thử lại sau.');
        })
        .finally(() => {
          setLoadingDetails(false);
        });
    }
  }, [isOpen, product]);

  const initSelection = (prod: ProductResponse) => {
    const activeVariants = (prod.variants || []).filter((v) => v.isActive);
    const inStockVariant = activeVariants.find((v) => (v.stockQuantity || 0) > 0) || activeVariants[0];
    if (inStockVariant) {
      setSelection({
        color: inStockVariant.color.trim(),
        size: normalizeSize(inStockVariant.size),
      });
    }
  };

  const activeProduct = detailedProduct || product;
  const variants = useMemo(
    () => (activeProduct?.variants || []).filter((v) => v.isActive),
    [activeProduct?.variants]
  );

  const colors = useMemo(
    () => [...new Set(variants.map((v) => v.color.trim()))],
    [variants]
  );

  const sizes = useMemo(
    () => [...new Set(variants.map((v) => normalizeSize(v.size)))],
    [variants]
  );

  const selectedVariant = useMemo(
    () => findVariant(variants, selection.color, selection.size),
    [variants, selection.color, selection.size]
  );

  const stock = selectedVariant?.stockQuantity ?? 0;
  const alreadyInCart =
    cart?.items.find((item) => item.variantId === selectedVariant?.id)?.quantity || 0;
  const remaining = Math.max(0, stock - alreadyInCart);
  const chosenQuantity = quantityWithinStock(quantity, remaining);

  const images = useMemo(
    () => (activeProduct ? extractAllProductImages(activeProduct) : []),
    [activeProduct]
  );

  const variantImage = activeProduct?.productImages?.find(
    (img) => img.variantId === selectedVariant?.id && img.imageUrl
  )?.imageUrl;

  const currentImage = selectedImage || variantImage || images[0];

  const swatchOptions: ColorSwatchOption[] = useMemo(() => {
    return colors.map((cName) => {
      const matched = activeProduct?.colors?.find((c) => c.name.toLowerCase() === cName.toLowerCase());
      return {
        name: cName,
        value: cName,
        hex: matched?.hex || '#1a1a1a',
      };
    });
  }, [colors, activeProduct?.colors]);

  const sizeOptions: SizeOption[] = useMemo(() => {
    return sizes.map((s) => {
      const v = findVariant(variants, selection.color, s);
      const inStock = v ? v.stockQuantity > 0 : false;
      return {
        label: s,
        value: s,
        disabled: !inStock,
      };
    });
  }, [sizes, variants, selection.color]);

  const handleColorChange = (opt: ColorSwatchOption) => {
    setSelection((prev) => ({ ...prev, color: opt.value }));
    setErrorMsg('');
    setSuccessMsg('');
    const matched = activeProduct?.colors?.find((c) => c.name.toLowerCase() === opt.value.toLowerCase());
    if (matched?.imageUrl) {
      setSelectedImage(matched.imageUrl);
    }
  };

  const handleSizeChange = (opt: SizeOption) => {
    setSelection((prev) => ({ ...prev, size: opt.value }));
    setErrorMsg('');
    setSuccessMsg('');
  };

  // MUA NGAY: Thêm vào giỏ và chuyển thẳng sang /checkout
  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      onClose();
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
      return;
    }
    if (!isCustomer) {
      setErrorMsg('Chỉ tài khoản khách hàng mới có thể mua hàng.');
      return;
    }
    if (!selectedVariant) {
      setErrorMsg('Vui lòng chọn màu sắc và kích cỡ sản phẩm.');
      return;
    }
    if (remaining <= 0) {
      setErrorMsg('Sản phẩm đã hết hàng hoặc bạn đã thêm tối đa số lượng vào giỏ.');
      return;
    }

    setBuyingNow(true);
    setErrorMsg('');
    try {
      await addItem(selectedVariant.id, chosenQuantity);
      onClose();
      navigate('/checkout');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể thực hiện mua nhanh. Vui lòng thử lại.');
    } finally {
      setBuyingNow(false);
    }
  };

  // THÊM VÀO GIỎ HÀNG
  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      onClose();
      navigate('/login', { state: { from: { pathname: `/products/${activeProduct?.id}` } } });
      return;
    }
    if (!isCustomer) {
      setErrorMsg('Chỉ tài khoản khách hàng mới có thể thêm vào giỏ hàng.');
      return;
    }
    if (!selectedVariant) {
      setErrorMsg('Vui lòng chọn màu sắc và kích cỡ sản phẩm.');
      return;
    }
    if (remaining <= 0) {
      setErrorMsg('Sản phẩm đã hết hàng hoặc bạn đã thêm tối đa số lượng vào giỏ.');
      return;
    }

    setAddingToCart(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await addItem(selectedVariant.id, chosenQuantity);
      setSuccessMsg(`Đã thêm ${chosenQuantity} sản phẩm vào giỏ hàng thành công!`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể thêm sản phẩm vào giỏ.');
    } finally {
      setAddingToCart(false);
    }
  };

  if (!isOpen || !activeProduct) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mua Nhanh Sản Phẩm"
      size="quick-view"
      maxWidth="840px"
    >
      {loadingDetails ? (
        <div className="py-12 text-center text-sm font-semibold uppercase tracking-wider text-content-secondary">
          Đang tải thông tin chi tiết…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
          {/* Cột trái: Ảnh sản phẩm */}
          <div className="flex flex-col gap-3">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-surface border border-line-light shadow-xs">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={activeProduct.name}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-content-muted">
                  <ShoppingBag size={48} />
                </div>
              )}

              {activeProduct.isNew && (
                <span className="absolute top-2 left-2 bg-primary text-content-inverse text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
                  NEW
                </span>
              )}
            </div>

            <Link
              to={`/products/${activeProduct.id}`}
              onClick={onClose}
              className="text-xs text-center font-medium text-content-secondary hover:text-content-primary underline underline-offset-4"
            >
              Xem trang chi tiết đầy đủ &rarr;
            </Link>
          </div>

          {/* Cột phải: Thông tin & Lựa chọn mua */}
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-content-primary mb-1.5 leading-snug">
                {activeProduct.name}
              </h2>

              <div className="mt-1">
                <ProductPrice
                  price={selectedVariant?.price ?? activeProduct.basePrice}
                  offer={selectedVariant?.bestOffer ?? activeProduct.bestOffer}
                />
              </div>
            </div>

            {/* Chọn màu sắc */}
            {swatchOptions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-content-primary">
                    Màu sắc: <span className="font-normal text-content-secondary capitalize">{selection.color}</span>
                  </span>
                </div>
                <ColorSwatches
                  options={swatchOptions}
                  value={selection.color}
                  onChange={handleColorChange}
                  size="lg"
                />
              </div>
            )}

            {/* Chọn kích cỡ */}
            {sizes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-content-primary">
                    Kích cỡ: <span className="font-normal text-content-secondary">{selection.size || 'Chưa chọn'}</span>
                  </span>
                  {selectedVariant && (
                    <span className="text-[11px] text-content-muted">
                      {stock > 0 ? `Còn ${stock} sản phẩm` : 'Hết hàng'}
                    </span>
                  )}
                </div>
                <SizeSelector
                  options={sizeOptions}
                  value={selection.size}
                  onChange={handleSizeChange}
                />
              </div>
            )}

            {/* Chọn số lượng */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-content-primary block mb-2">
                Số lượng
              </span>
              <QuantityStepper
                value={chosenQuantity}
                min={remaining > 0 ? 1 : 0}
                max={remaining}
                disabled={remaining <= 0 || buyingNow || addingToCart}
                onChange={(val) => {
                  setQuantity(val);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
              />
            </div>

            {/* Thông báo lỗi / thành công */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-2.5 rounded bg-status-error/10 border border-status-error/20 text-status-error text-xs">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded bg-status-success/10 border border-status-success/20 text-status-success text-xs font-medium">
                <div className="flex items-center gap-2">
                  <Check size={15} className="shrink-0" />
                  <span>{successMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/cart');
                  }}
                  className="underline hover:opacity-80 text-[11px] font-bold"
                >
                  Xem giỏ
                </button>
              </div>
            )}

            {/* Các nút hành động chính */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5 pt-2">
              <Button
                variant="primary"
                size="lg"
                loading={buyingNow}
                disabled={
                  buyingNow ||
                  addingToCart ||
                  !selectedVariant ||
                  remaining <= 0 ||
                  chosenQuantity < 1
                }
                onClick={handleBuyNow}
                className="flex-1 font-bold shadow-md uppercase tracking-wider text-xs sm:text-sm py-3"
              >
                {isAuthenticated ? 'MUA NGAY (THANH TOÁN)' : 'ĐĂNG NHẬP ĐỂ MUA NGAY'}
              </Button>

              <Button
                variant="secondary"
                size="lg"
                loading={addingToCart}
                disabled={
                  buyingNow ||
                  addingToCart ||
                  !selectedVariant ||
                  remaining <= 0 ||
                  chosenQuantity < 1
                }
                onClick={handleAddToCart}
                className="flex-1 text-xs sm:text-sm py-3"
              >
                Thêm vào giỏ
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
