import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { productService } from '../services/productService';
import { ProductResponse } from '../types/product';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Breadcrumb from '../components/layout/Breadcrumb';
import QuantityStepper from '../components/product/QuantityStepper';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { formatCurrencyVND, extractAllProductImages } from '../utils/format';
import { normalizeSize } from '../utils/catalog';
import { availableVariants, findVariant, quantityWithinStock } from '../utils/variants';
import './ProductDetailPage.css';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isCustomer, isLoading: authLoading } = useAuth();
  const { addItem, busy, cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selection, setSelection] = useState({ color: '', size: '' });
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setIsLoading(true); setError(''); setProduct(null); setNotice(''); setActionError('');
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

  const changeSelection = (color: string, size: string) => {
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
        <div><p className="product-detail-label">Số lượng</p><QuantityStepper value={chosenQuantity} min={remaining ? 1 : 0} max={remaining}
          disabled={!remaining || busy} onChange={value => { setQuantity(value); setNotice(''); setActionError(''); }} /></div>
        {stock > 0 && !remaining && <p role="status">Bạn đã thêm đủ số lượng còn lại vào giỏ hàng.</p>}
        <div className="product-detail-actions"><Button size="lg" loading={busy}
          disabled={authLoading || !selectedVariant || !remaining || chosenQuantity > remaining || (isAuthenticated && !isCustomer)}
          onClick={() => void handleAddToCart()}>{isAuthenticated ? 'Thêm vào giỏ hàng' : 'Đăng nhập để thêm vào giỏ'}</Button>
          <Link to="/cart" className="product-detail-cart-link">Xem giỏ hàng</Link></div>
        {isAuthenticated && !isCustomer && <p role="status">Giỏ hàng dành cho tài khoản khách hàng.</p>}
        {notice && <p role="status" className="product-detail-success">{notice} <Link to="/cart">Đến giỏ hàng</Link></p>}
        {actionError && <p role="alert" className="product-detail-error">{actionError}</p>}
      </section>
    </div>
  </div>;
}
