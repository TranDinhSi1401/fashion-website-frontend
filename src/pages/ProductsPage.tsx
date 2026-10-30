import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { ProductFilters, ProductResponse } from '../types/product';
import { CategoryResponse } from '../types/category';
import { mergeFilterParameters, normalizeSize, parsePrice, resolveCategories } from '../utils/catalog';
import ProductCard from '../components/product/ProductCard';
import Button from '../components/ui/Button';
import './ProductsPage.css';

const errorMessage = (error: unknown) => axios.isAxiosError(error)
  ? error.response?.data?.message || 'Không thể tải sản phẩm. Vui lòng kiểm tra kết nối và thử lại.'
  : 'Không thể tải sản phẩm. Vui lòng thử lại.';

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramsKey = searchParams.toString();
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [catalog, setCatalog] = useState<ProductResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [ready, setReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [metadataError, setMetadataError] = useState('');
  const [retry, setRetry] = useState(0);
  const priceForm = useRef<HTMLFormElement>(null);
  const searchForm = useRef<HTMLFormElement>(null);

  const updateFilters = (changes: Record<string, string>) => {
    const pending: Record<string, string> = {};
    for (const form of [priceForm.current, searchForm.current]) {
      if (form) new FormData(form).forEach((value, key) => { pending[key] = String(value); });
    }
    setSearchParams(mergeFilterParameters(paramsKey, pending, changes));
  };

  useEffect(() => {
    let active = true;
    setReady(false);
    setMetadataError('');
    setIsLoading(true);
    // Keep choices stable when a combination returns no results.
    Promise.all([categoryService.getCategories(), productService.getProducts()])
      .then(([categoryResponse, productResponse]) => {
        if (!active) return;
        if (!Array.isArray(categoryResponse.data) || !Array.isArray(productResponse.data)) throw new Error('Invalid catalog response');
        setCategories(categoryResponse.data.filter(category => category.isActive !== false));
        setCatalog(productResponse.data.filter(product => product.isActive !== false));
        setReady(true);
      })
      .catch((failure: unknown) => { if (active) { setMetadataError(errorMessage(failure)); setIsLoading(false); } });
    return () => { active = false; };
  }, [retry]);

  const selection = useMemo(() => {
    const params = new URLSearchParams(paramsKey);
    const minPrice = parsePrice(params.get('minPrice'));
    const maxPrice = parsePrice(params.get('maxPrice'));
    const rawId = params.get('categoryId');
    const alias = params.get('category') || '';
    const ids = rawId ? [Number(rawId)] : alias ? resolveCategories(alias, categories) : [];
    const sort = params.get('sort') || 'newest';
    const invalidPrice = Number.isNaN(minPrice) || Number.isNaN(maxPrice)
      || (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice);
    let validation = invalidPrice ? 'Khoảng giá không hợp lệ. Giá từ phải nhỏ hơn hoặc bằng giá đến.' : '';
    if (rawId && (!Number.isSafeInteger(Number(rawId)) || Number(rawId) < 1)) validation = 'Danh mục không hợp lệ.';
    if (!['newest', 'price-asc', 'price-desc', 'name'].includes(sort)) validation = 'Cách sắp xếp không hợp lệ.';
    if (params.get('tag') === 'sale') validation = 'Bộ lọc ưu đãi chưa có dữ liệu áp dụng. Vui lòng chọn danh mục hoặc xóa bộ lọc.';
    if (params.get('tag') && !['sale', 'new'].includes(params.get('tag')!)) validation = 'Bộ lọc không hợp lệ.';
    const filters: ProductFilters = {
      ...(rawId ? { categoryId: rawId } : ids.length ? { categoryIds: ids.join(',') } : {}),
      keyword: params.get('search')?.trim() || undefined,
      size: params.get('size') || undefined, color: params.get('color') || undefined,
      minPrice, maxPrice, sort,
      newWithinDays: params.get('tag') === 'new' ? 30 : undefined,
    };
    const missingCategory = Boolean((alias || rawId) && !categories.some(category => ids.includes(category.id)));
    return { filters, ids, validation, missingCategory };
  }, [paramsKey, categories]);

  useEffect(() => {
    if (!ready) return;
    if (selection.validation || selection.missingCategory) {
      setProducts([]); setError(selection.validation); setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    setError('');
    productService.getProducts(selection.filters, controller.signal)
      .then(response => {
        if (!controller.signal.aborted) {
          if (!Array.isArray(response.data)) throw new Error('Invalid product response');
          setProducts(response.data.filter(product => product.isActive !== false));
        }
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) { setProducts([]); setError(errorMessage(failure)); }
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [ready, selection, retry]);

  const variants = catalog.flatMap(product => product.variants || []).filter(variant => variant.isActive && variant.stockQuantity > 0);
  const sizes = [...new Set(variants.map(variant => normalizeSize(variant.size)).filter(Boolean))].sort();
  const colors = [...new Set(variants.map(variant => variant.color.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
  const selectedSize = searchParams.get('size') || '';
  const selectedColor = searchParams.get('color') || '';
  const categoryName = selection.ids.length === 1 ? categories.find(category => category.id === selection.ids[0])?.name : '';
  const title = searchParams.get('tag') === 'new' ? `Hàng mới về trong 30 ngày${categoryName ? ` · ${categoryName}` : ''}` : categoryName || 'Danh mục sản phẩm';
  const shownError = metadataError || error;
  const categoryTag = searchParams.get('tag') === 'new' ? 'new' : '';
  const activeFilters: { label: string; changes: Record<string, string> }[] = [];
  if (selection.ids.length) activeFilters.push({ label: `Danh mục: ${categories.filter(category => selection.ids.includes(category.id)).map(category => category.name).join(', ')}`, changes: { category: '', categoryId: '' } });
  if (selectedSize) activeFilters.push({ label: `Size: ${selectedSize}`, changes: { size: '' } });
  if (selectedColor) activeFilters.push({ label: `Màu: ${selectedColor}`, changes: { color: '' } });
  if (searchParams.get('search')) activeFilters.push({ label: `Tìm: ${searchParams.get('search')}`, changes: { search: '' } });
  if (searchParams.has('minPrice') || searchParams.has('maxPrice')) activeFilters.push({ label: `Giá: ${searchParams.get('minPrice') || '0'} – ${searchParams.get('maxPrice') || 'không giới hạn'} ₫`, changes: { minPrice: '', maxPrice: '' } });
  if (categoryTag) activeFilters.push({ label: 'Mới trong 30 ngày', changes: { tag: '' } });

  return (
    <div className="catalog-page">
      <section className="catalog-banner"><div className="container">
        <p>FASHION WEBSITE</p><h1>{title}</h1><p>Khám phá bộ sưu tập và tìm sản phẩm phù hợp với bạn.</p>
      </div></section>
      <div className="container">
        <nav className="catalog-breadcrumb" aria-label="Đường dẫn">
          <Link to="/">Trang chủ</Link><span>/</span><Link to="/products">Sản phẩm</Link>
          {searchParams.size > 0 && <><span>/</span><span>{title}</span></>}
        </nav>
        <div className="catalog-categories" aria-label="Danh mục sản phẩm">
          <button type="button" aria-pressed={!searchParams.has('categoryId') && !searchParams.has('category') && !searchParams.has('tag')}
            onClick={() => updateFilters({ category: '', categoryId: '', tag: '' })}>Tất cả sản phẩm</button>
          <button type="button" aria-pressed={searchParams.get('tag') === 'new'}
            onClick={() => updateFilters({ tag: 'new', sort: 'newest' })}>Hàng mới về</button>
          {categories.filter(category => !category.parentId).map(category => (
            <button key={category.id} type="button" aria-pressed={selection.ids.includes(category.id)}
              onClick={() => updateFilters({ category: '', categoryId: String(category.id), tag: categoryTag })}>{category.name}</button>
          ))}
        </div>
        <div className="catalog-layout">
          <aside className="catalog-filters" aria-label="Bộ lọc sản phẩm">
            <div className="catalog-filter-heading"><h2>Bộ lọc</h2>
              <Button variant="ghost" size="sm" onClick={() => setSearchParams({})} disabled={!searchParams.size}>Xóa lọc</Button>
            </div>
            <form ref={searchForm} key={`search-${searchParams.get('search') || ''}`} onSubmit={event => {
              event.preventDefault(); updateFilters({ search: String(new FormData(event.currentTarget).get('search') || '').trim() });
            }}>
              <label htmlFor="catalog-search">Tìm sản phẩm</label>
              <input id="catalog-search" name="search" type="search" defaultValue={searchParams.get('search') || ''} placeholder="Tên hoặc mã sản phẩm" />
              <Button type="submit" variant="outline" size="sm">Tìm kiếm</Button>
            </form>
            <details open><summary>Danh mục</summary>
              <label className="catalog-choice"><input type="radio" name="catalog-category" checked={!searchParams.has('categoryId') && !searchParams.has('category')}
                onChange={() => updateFilters({ categoryId: '', category: '', tag: categoryTag })} />Tất cả</label>
              {categories.map(category => <label key={category.id} className="catalog-choice">
                <input type="radio" name="catalog-category" checked={selection.ids.length === 1 && selection.ids[0] === category.id}
                  onChange={() => updateFilters({ categoryId: String(category.id), category: '', tag: categoryTag })} />
                {category.parentId ? '— ' : ''}{category.name}
              </label>)}
            </details>
            <details open><summary>Khoảng giá</summary>
              <form ref={priceForm} key={`prices-${searchParams.get('minPrice')}-${searchParams.get('maxPrice')}`} onSubmit={event => {
                event.preventDefault(); const data = new FormData(event.currentTarget);
                updateFilters({ minPrice: String(data.get('minPrice') || ''), maxPrice: String(data.get('maxPrice') || '') });
              }}>
                <label htmlFor="catalog-min-price">Giá từ (₫)</label>
                <input id="catalog-min-price" name="minPrice" type="number" min="0" step="any" defaultValue={searchParams.get('minPrice') || ''} />
                <label htmlFor="catalog-max-price">Giá đến (₫)</label>
                <input id="catalog-max-price" name="maxPrice" type="number" min="0" step="any" defaultValue={searchParams.get('maxPrice') || ''} />
                <Button type="submit" variant="outline" size="sm">Áp dụng giá</Button>
              </form>
            </details>
            <details open><summary>Kích cỡ</summary>
              <div className="catalog-sizes">{[...new Set([...sizes, ...(selectedSize ? [selectedSize] : [])])].map(size => (
                <button key={size} type="button" aria-pressed={selectedSize === size}
                  onClick={() => updateFilters({ size: selectedSize === size ? '' : size })}>{size}</button>
              ))}</div>
              {!sizes.length && <p>Chưa có kích cỡ còn hàng.</p>}
            </details>
            <details open><summary>Màu sắc</summary>
              <label htmlFor="catalog-color" className="catalog-sr-only">Chọn màu sắc</label>
              <select id="catalog-color" value={selectedColor} onChange={event => updateFilters({ color: event.target.value })}>
                <option value="">Tất cả màu</option>
                {[...new Set([...colors, ...(selectedColor ? [selectedColor] : [])])].map(color => <option key={color} value={color}>{color}</option>)}
              </select>
              {!colors.length && <p>Chưa có màu sắc còn hàng.</p>}
            </details>
            <Button onClick={() => updateFilters({})}>Áp dụng tất cả bộ lọc</Button>
          </aside>
          <section className="catalog-results" aria-label="Kết quả sản phẩm" aria-busy={isLoading}>
            {activeFilters.length > 0 && <div className="catalog-active-filters" aria-label="Bộ lọc đang áp dụng">
              <span>Đang áp dụng:</span>{activeFilters.map(filter => <button key={filter.label} type="button" aria-label={`Bỏ lọc ${filter.label}`}
                onClick={() => updateFilters(filter.changes)}>{filter.label} ×</button>)}
            </div>}
            <div className="catalog-toolbar">
              <p role="status">{isLoading ? 'Đang tải sản phẩm…' : shownError ? 'Chưa tải được kết quả' : `${products.length} sản phẩm`}</p>
              <label>Sắp xếp<select value={selection.filters.sort} onChange={event => updateFilters({ sort: event.target.value })}>
                <option value="newest">Mới nhất</option><option value="price-asc">Giá tăng dần</option>
                <option value="price-desc">Giá giảm dần</option><option value="name">Tên A–Z</option>
              </select></label>
            </div>
            {isLoading ? <div className="catalog-grid" aria-hidden="true">{[1, 2, 3, 4, 5, 6].map(id => <div key={id} className="catalog-skeleton" />)}</div>
              : shownError ? <div className="catalog-empty" role="alert"><p>{shownError}</p>
                <Button variant="outline" onClick={() => setRetry(value => value + 1)}>Thử lại</Button>
                <Button variant="ghost" onClick={() => setSearchParams({})}>Xóa bộ lọc</Button></div>
                : products.length ? <div className="catalog-grid">{products.map(product => <ProductCard key={product.id} product={product} />)}</div>
                  : <div className="catalog-empty"><p>Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại.</p>
                    <Button variant="outline" onClick={() => setSearchParams({})}>Xóa bộ lọc</Button></div>}
          </section>
        </div>
      </div>
    </div>
  );
}
