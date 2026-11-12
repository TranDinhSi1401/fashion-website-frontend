import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { ProductFilters, ProductResponse } from '../types/product';
import { CategoryResponse } from '../types/category';
import { categoryFacets, filterCatalog, mergeFilterParameters, normalizeSize, paginateCatalog, parsePrice, resolveCategories, searchColors } from '../utils/catalog';
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
  const [isLoading, setIsLoading] = useState(true);
  const [colorSearch, setColorSearch] = useState('');
  const [metadataError, setMetadataError] = useState('');
  const [retry, setRetry] = useState(0);
  const priceForm = useRef<HTMLFormElement>(null);
  const searchForm = useRef<HTMLFormElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  const updateFilters = (changes: Record<string, string>) => {
    const pending: Record<string, string> = {};
    for (const form of [priceForm.current, searchForm.current]) {
      if (form) new FormData(form).forEach((value, key) => { pending[key] = String(value); });
    }
    setSearchParams(mergeFilterParameters(paramsKey, pending, { ...changes, page: '' }));
  };

  const toggleFilter = (key: string, value: string) => {
    const selected = (searchParams.get(key) || '').split('|').filter(Boolean);
    updateFilters({ [key]: (selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]).join('|'),
      ...(key === 'audience' || key === 'type' ? { category: '', categoryId: '' } : {}) });
  };

  const facets = useMemo(() => categories.map(category => ({ ...category, ...categoryFacets(category, categories) })), [categories]);

  useEffect(() => {
    let active = true;
    setMetadataError('');
    setIsLoading(true);
    // Keep choices stable when a combination returns no results.
    Promise.all([categoryService.getCategories(), productService.getProducts()])
      .then(([categoryResponse, productResponse]) => {
        if (!active) return;
        if (!Array.isArray(categoryResponse.data) || !Array.isArray(productResponse.data)) throw new Error('Invalid catalog response');
        setCategories(categoryResponse.data.filter(category => category.isActive !== false));
        setCatalog(productResponse.data.filter(product => product.isActive !== false));
      })
      .catch((failure: unknown) => { if (active) setMetadataError(errorMessage(failure)); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [retry]);

  const selection = useMemo(() => {
    const params = new URLSearchParams(paramsKey);
    const minPrice = parsePrice(params.get('minPrice'));
    const maxPrice = parsePrice(params.get('maxPrice'));
    const rawId = params.get('categoryId');
    const alias = params.get('category') || '';
    const audiences = (params.get('audience') || '').split('|').filter(Boolean);
    const types = (params.get('type') || '').split('|').filter(Boolean);
    const sizes = (params.get('size') || '').split('|').filter(Boolean);
    const colors = (params.get('color') || '').split('|').filter(Boolean);
    const hasFacets = audiences.length > 0 || types.length > 0;
    const ids = hasFacets ? facets.filter(category => (!audiences.length || audiences.includes(category.audience))
      && (!types.length || types.includes(category.typeKey))).map(category => category.id)
      : rawId ? [Number(rawId)] : alias ? resolveCategories(alias, categories) : [];
    const sort = params.get('sort') || 'newest';
    const invalidPrice = Number.isNaN(minPrice) || Number.isNaN(maxPrice)
      || (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice);
    let validation = invalidPrice ? 'Khoảng giá không hợp lệ. Giá từ phải nhỏ hơn hoặc bằng giá đến.' : '';
    if (rawId && (!Number.isSafeInteger(Number(rawId)) || Number(rawId) < 1)) validation = 'Danh mục không hợp lệ.';
    if (!['newest', 'price-asc', 'price-desc', 'name'].includes(sort)) validation = 'Cách sắp xếp không hợp lệ.';
    if (params.get('tag') === 'sale') validation = 'Bộ lọc ưu đãi chưa có dữ liệu áp dụng. Vui lòng chọn danh mục hoặc xóa bộ lọc.';
    if (params.get('tag') && !['sale', 'new'].includes(params.get('tag')!)) validation = 'Bộ lọc không hợp lệ.';
    const filters: ProductFilters = {
      ...(!hasFacets && rawId ? { categoryId: rawId } : ids.length ? { categoryIds: ids.join(',') } : {}),
      keyword: params.get('search')?.trim() || undefined,
      minPrice, maxPrice, sort,
      newWithinDays: params.get('tag') === 'new' ? 30 : undefined,
    };
    const missingCategory = Boolean((hasFacets || alias || rawId) && !categories.some(category => ids.includes(category.id)));
    return { filters, ids, validation, missingCategory, audiences, types, sizes, colors, hasFacets };
  }, [paramsKey, categories, facets]);

  const products = useMemo(() => selection.validation || selection.missingCategory ? []
    : filterCatalog(catalog, categories, selection.filters, selection.sizes, selection.colors), [catalog, categories, selection]);
  const pagination = paginateCatalog(products, searchParams.get('page'), searchParams.get('pageSize'));
  const pageNumbers = [...new Set([1, pagination.pageCount, pagination.page - 1, pagination.page, pagination.page + 1])]
    .filter(page => page >= 1 && page <= pagination.pageCount).sort((a, b) => a - b);
  const changePage = (page: number) => {
    // Page navigation must not submit unfinished search or price fields.
    setSearchParams(mergeFilterParameters(paramsKey, {}, { page: page === 1 ? '' : String(page) }));
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const variants = catalog.flatMap(product => product.variants || []).filter(variant => variant.isActive && variant.stockQuantity > 0);
  const sizes = [...new Set(variants.map(variant => normalizeSize(variant.size)).filter(Boolean))].sort();
  const colors = [...new Set(variants.map(variant => variant.color.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
  const visibleColors = searchColors([...new Set([...colors, ...selection.colors])], colorSearch);
  const availableFacets = facets.filter(category => catalog.some(product => product.categoryId === category.id));
  const audiences = [...new Set(availableFacets.map(category => category.audience).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
  const types = [...new Map(availableFacets.filter(category => category.typeKey).map(category => [category.typeKey, category.type])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'vi'));
  const categoryName = !selection.hasFacets && selection.ids.length === 1 ? categories.find(category => category.id === selection.ids[0])?.name : '';
  const title = searchParams.get('tag') === 'new' ? `Hàng mới về trong 30 ngày${categoryName ? ` · ${categoryName}` : ''}` : categoryName || 'Danh mục sản phẩm';
  const shownError = metadataError || selection.validation;
  const categoryTag = searchParams.get('tag') === 'new' ? 'new' : '';
  const activeFilters: { label: string; changes: Record<string, string> }[] = [];
  if (selection.ids.length && !selection.hasFacets) activeFilters.push({ label: `Danh mục: ${categories.filter(category => selection.ids.includes(category.id)).map(category => category.name).join(', ')}`, changes: { category: '', categoryId: '' } });
  for (const [key, values, prefix] of [
    ['audience', selection.audiences, 'Đối tượng'], ['type', selection.types, 'Loại'],
    ['size', selection.sizes, 'Size'], ['color', selection.colors, 'Màu'],
  ] as const) {
    for (const value of values) activeFilters.push({ label: `${prefix}: ${key === 'type' ? types.find(item => item[0] === value)?.[1] || value : value}`,
      changes: { [key]: values.filter(item => item !== value).join('|') } });
  }
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
        <div className="catalog-layout">
          <aside className="catalog-filters" aria-label="Bộ lọc sản phẩm">
            <div className="catalog-filter-heading"><h2>Bộ lọc</h2>
              <Button variant="ghost" size="sm" onClick={() => setSearchParams({})} disabled={!searchParams.size}>Xóa lọc</Button>
            </div>
            <p className="catalog-filter-hint">Có thể chọn nhiều mục trong mỗi nhóm.</p>
            <form ref={searchForm} key={`search-${searchParams.get('search') || ''}`} onSubmit={event => {
              event.preventDefault(); updateFilters({ search: String(new FormData(event.currentTarget).get('search') || '').trim() });
            }}>
              <label htmlFor="catalog-search">Tìm sản phẩm</label>
              <input id="catalog-search" name="search" type="search" defaultValue={searchParams.get('search') || ''} placeholder="Tên hoặc mã sản phẩm" />
              <Button type="submit" variant="outline" size="sm">Tìm kiếm</Button>
            </form>
            <details open><summary>Đối tượng</summary>
              {audiences.map(audience => <label key={audience} className="catalog-choice">
                <input type="checkbox" checked={selection.audiences.includes(audience)} onChange={() => toggleFilter('audience', audience)} />
                {audience}
              </label>)}
            </details>
            <details open><summary>Loại sản phẩm</summary>
              {types.map(([key, label]) => <label key={key} className="catalog-choice">
                <input type="checkbox" checked={selection.types.includes(key)} onChange={() => toggleFilter('type', key)} />
                {label}
              </label>)}
            </details>
            <details open><summary>Hàng mới</summary>
              <label className="catalog-choice"><input type="checkbox" checked={categoryTag === 'new'}
                onChange={event => updateFilters({ tag: event.target.checked ? 'new' : '' })} />Mới về trong 30 ngày</label>
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
              <div className="catalog-sizes">{[...new Set([...sizes, ...selection.sizes])].map(size => (
                <label key={size} className="catalog-size-choice">
                  <input type="checkbox" checked={selection.sizes.includes(size)} onChange={() => toggleFilter('size', size)} />
                  <span>{size}</span>
                </label>
              ))}</div>
              {!sizes.length && <p>Chưa có kích cỡ còn hàng.</p>}
            </details>
            <details open><summary>Màu sắc</summary>
              <label htmlFor="catalog-color-search" className="catalog-sr-only">Tìm màu sắc</label>
              <input id="catalog-color-search" type="search" value={colorSearch} onChange={event => setColorSearch(event.target.value)}
                placeholder="Tìm màu: đen, trắng, xanh…" aria-controls="catalog-color-choices" />
              <div id="catalog-color-choices" className="catalog-color-choices">{visibleColors.map(color => <label key={color} className="catalog-choice">
                <input type="checkbox" checked={selection.colors.includes(color)} onChange={() => toggleFilter('color', color)} />{color}
              </label>)}</div>
              {!!colors.length && !visibleColors.length && <p role="status">Không tìm thấy màu phù hợp.</p>}
              {!colors.length && <p>Chưa có màu sắc còn hàng.</p>}
            </details>
          </aside>
          <section ref={resultsRef} className="catalog-results" aria-label="Kết quả sản phẩm" aria-busy={isLoading}>
            {activeFilters.length > 0 && <div className="catalog-active-filters" aria-label="Bộ lọc đang áp dụng">
              <span>Đang áp dụng:</span>{activeFilters.map(filter => <button key={filter.label} type="button" aria-label={`Bỏ lọc ${filter.label}`}
                onClick={() => updateFilters(filter.changes)}>{filter.label} ×</button>)}
            </div>}
            <div className="catalog-toolbar">
              <p role="status">{isLoading ? 'Đang tải sản phẩm…' : shownError ? 'Chưa tải được kết quả'
                : products.length ? `Hiển thị ${pagination.from}–${pagination.to} / ${products.length} sản phẩm` : '0 sản phẩm'}</p>
              <div className="catalog-display-options">
              <label>Hiển thị<select value={pagination.pageSize} onChange={event => setSearchParams(
                mergeFilterParameters(paramsKey, {}, { pageSize: event.target.value, page: '' }))}>
                {[12, 24, 48].map(size => <option key={size} value={size}>{size} / trang</option>)}
              </select></label>
              <label>Sắp xếp<select value={selection.filters.sort} onChange={event => updateFilters({ sort: event.target.value })}>
                <option value="newest">Mới nhất</option><option value="price-asc">Giá tăng dần</option>
                <option value="price-desc">Giá giảm dần</option><option value="name">Tên A–Z</option>
              </select></label>
              </div>
            </div>
            {isLoading ? <div className="catalog-grid" aria-hidden="true">{[1, 2, 3, 4, 5, 6].map(id => <div key={id} className="catalog-skeleton" />)}</div>
              : shownError ? <div className="catalog-empty" role="alert"><p>{shownError}</p>
                <Button variant="outline" onClick={() => setRetry(value => value + 1)}>Thử lại</Button>
                <Button variant="ghost" onClick={() => setSearchParams({})}>Xóa bộ lọc</Button></div>
                : products.length ? <>
                  <div className="catalog-grid">{pagination.items.map(product => <ProductCard key={product.id} product={product} />)}</div>
                  <nav className="catalog-pagination" aria-label="Phân trang sản phẩm">
                    <p>Trang {pagination.page} / {pagination.pageCount}</p>
                    <div className="catalog-page-buttons">
                      <Button variant="outline" size="sm" disabled={pagination.page === 1} onClick={() => changePage(pagination.page - 1)} aria-label="Trang trước">Trước</Button>
                      {pageNumbers.map((page, index) => <Fragment key={page}>
                        {index > 0 && page - pageNumbers[index - 1] > 1 && <span className="catalog-page-gap" aria-hidden="true">…</span>}
                        <Button variant={page === pagination.page ? 'primary' : 'outline'} size="sm" aria-label={`Trang ${page}`}
                          aria-current={page === pagination.page ? 'page' : undefined} onClick={() => changePage(page)}>{page}</Button>
                      </Fragment>)}
                      <Button variant="outline" size="sm" disabled={pagination.page === pagination.pageCount} onClick={() => changePage(pagination.page + 1)} aria-label="Trang sau">Sau</Button>
                    </div>
                  </nav>
                </>
                  : <div className="catalog-empty"><p>Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại.</p>
                    <Button variant="outline" onClick={() => setSearchParams({})}>Xóa bộ lọc</Button></div>}
          </section>
        </div>
      </div>
    </div>
  );
}
