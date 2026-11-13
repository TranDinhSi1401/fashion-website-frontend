import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { ProductFilters, ProductResponse } from '../types/product';
import { CategoryResponse } from '../types/category';
import {
  categoryFacets,
  filterCatalog,
  mergeFilterParameters,
  normalizeSize,
  paginateCatalog,
  parsePrice,
  resolveCategories,
  searchColors,
} from '../utils/catalog';
import Breadcrumb from '../components/layout/Breadcrumb';
import {
  Button,
  Checkbox,
  FilterGroup,
  FilterSidebar,
  Input,
  Pagination,
  ProductCard,
  Select,
} from '../components/ui';
import { cn } from '../utils/cn';
import styles from './ProductsPage.module.css';

const errorMessage = (error: unknown) =>
  axios.isAxiosError(error)
    ? error.response?.data?.message ||
      'Không thể tải sản phẩm. Vui lòng kiểm tra kết nối và thử lại.'
    : 'Không thể tải sản phẩm. Vui lòng thử lại.';

const PAGE_SIZE_OPTIONS = [
  { value: 12, label: '12 / trang' },
  { value: 24, label: '24 / trang' },
  { value: 48, label: '48 / trang' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price-asc', label: 'Giá tăng dần' },
  { value: 'price-desc', label: 'Giá giảm dần' },
  { value: 'name', label: 'Tên A–Z' },
];

const CATALOG_CACHE_KEY = 'fashion_catalog_cache_v1';

interface CatalogCacheSnapshot {
  categories: CategoryResponse[];
  catalog: ProductResponse[];
}

let memoryCatalogCache: CatalogCacheSnapshot | null = null;

function readCatalogCache(): CatalogCacheSnapshot | null {
  if (memoryCatalogCache) return memoryCatalogCache;
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogCacheSnapshot;
    if (Array.isArray(parsed?.categories) && Array.isArray(parsed?.catalog)) {
      memoryCatalogCache = parsed;
      return parsed;
    }
  } catch {
    // Ignore storage read errors
  }
  return null;
}

function writeCatalogCache(snapshot: CatalogCacheSnapshot): void {
  memoryCatalogCache = snapshot;
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota errors
  }
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramsKey = searchParams.toString();
  const initialCache = readCatalogCache();
  const [categories, setCategories] = useState<CategoryResponse[]>(
    () => initialCache?.categories || []
  );
  const [catalog, setCatalog] = useState<ProductResponse[]>(
    () => initialCache?.catalog || []
  );
  const [isLoading, setIsLoading] = useState(() => !initialCache);
  const [colorSearch, setColorSearch] = useState('');
  const [metadataError, setMetadataError] = useState('');
  const [retry, setRetry] = useState(0);
  const priceForm = useRef<HTMLFormElement>(null);
  const searchForm = useRef<HTMLFormElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  const updateFilters = (changes: Record<string, string>) => {
    const pending: Record<string, string> = {};
    for (const form of [priceForm.current, searchForm.current]) {
      if (form) {
        new FormData(form).forEach((value, key) => {
          pending[key] = String(value);
        });
      }
    }
    setSearchParams(mergeFilterParameters(paramsKey, pending, { ...changes, page: '' }), {
      state: { keepScroll: true },
    });
  };

  const toggleFilter = (key: string, value: string) => {
    const selected = (searchParams.get(key) || '').split('|').filter(Boolean);
    updateFilters({
      [key]: (selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
      ).join('|'),
      ...(key === 'audience' || key === 'type' ? { category: '', categoryId: '' } : {}),
    });
  };

  const facets = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        ...categoryFacets(category, categories),
      })),
    [categories]
  );

  useEffect(() => {
    let active = true;
    Promise.all([categoryService.getCategories(), productService.getProducts()])
      .then(([categoryResponse, productResponse]) => {
        if (!active) return;
        if (!Array.isArray(categoryResponse.data) || !Array.isArray(productResponse.data)) {
          throw new Error('Invalid catalog response');
        }
        const nextCategories = categoryResponse.data.filter(
          (category) => category.isActive !== false
        );
        const nextCatalog = productResponse.data.filter(
          (product) => product.isActive !== false
        );
        setCategories(nextCategories);
        setCatalog(nextCatalog);
        writeCatalogCache({ categories: nextCategories, catalog: nextCatalog });
        setMetadataError('');
      })
      .catch((failure: unknown) => {
        if (active && !readCatalogCache()) {
          setMetadataError(errorMessage(failure));
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
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
    const ids = hasFacets
      ? facets
          .filter(
            (category) =>
              (!audiences.length || audiences.includes(category.audience)) &&
              (!types.length || types.includes(category.typeKey))
          )
          .map((category) => category.id)
      : rawId
        ? [Number(rawId)]
        : alias
          ? resolveCategories(alias, categories)
          : [];
    const sort = params.get('sort') || 'newest';
    const invalidPrice =
      Number.isNaN(minPrice) ||
      Number.isNaN(maxPrice) ||
      (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice);
    let validation = invalidPrice
      ? 'Khoảng giá không hợp lệ. Giá từ phải nhỏ hơn hoặc bằng giá đến.'
      : '';
    if (rawId && (!Number.isSafeInteger(Number(rawId)) || Number(rawId) < 1)) {
      validation = 'Danh mục không hợp lệ.';
    }
    if (!['newest', 'price-asc', 'price-desc', 'name'].includes(sort)) {
      validation = 'Cách sắp xếp không hợp lệ.';
    }
    if (params.get('tag') === 'sale') {
      validation =
        'Bộ lọc ưu đãi chưa có dữ liệu áp dụng. Vui lòng chọn danh mục hoặc xóa bộ lọc.';
    }
    if (params.get('tag') && !['sale', 'new'].includes(params.get('tag')!)) {
      validation = 'Bộ lọc không hợp lệ.';
    }
    const filters: ProductFilters = {
      ...(!hasFacets && rawId
        ? { categoryId: rawId }
        : ids.length
          ? { categoryIds: ids.join(',') }
          : {}),
      keyword: params.get('search')?.trim() || undefined,
      minPrice,
      maxPrice,
      sort,
      newWithinDays: params.get('tag') === 'new' ? 30 : undefined,
    };
    const missingCategory = Boolean(
      (hasFacets || alias || rawId) &&
        !categories.some((category) => ids.includes(category.id))
    );
    return { filters, ids, validation, missingCategory, audiences, types, sizes, colors, hasFacets };
  }, [paramsKey, categories, facets]);

  const products = useMemo(
    () =>
      selection.validation || selection.missingCategory
        ? []
        : filterCatalog(catalog, categories, selection.filters, selection.sizes, selection.colors),
    [catalog, categories, selection]
  );

  const pagination = paginateCatalog(products, searchParams.get('page'), searchParams.get('pageSize'));

  const changePage = (page: number) => {
    setSearchParams(
      mergeFilterParameters(paramsKey, {}, { page: page === 1 ? '' : String(page) }),
      { state: { keepScroll: true } }
    );
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const variants = catalog
    .flatMap((product) => product.variants || [])
    .filter((variant) => variant.isActive && variant.stockQuantity > 0);
  const sizes = [...new Set(variants.map((variant) => normalizeSize(variant.size)).filter(Boolean))].sort();
  const colors = [
    ...new Set(variants.map((variant) => variant.color.trim()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, 'vi'));
  const visibleColors = searchColors([...new Set([...colors, ...selection.colors])], colorSearch);
  const availableFacets = facets.filter((category) =>
    catalog.some((product) => product.categoryId === category.id)
  );
  const audiences = [
    ...new Set(availableFacets.map((category) => category.audience).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, 'vi'));
  const types = [
    ...new Map(
      availableFacets
        .filter((category) => category.typeKey)
        .map((category) => [category.typeKey, category.type])
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1], 'vi'));

  const categoryName =
    !selection.hasFacets && selection.ids.length === 1
      ? categories.find((category) => category.id === selection.ids[0])?.name
      : '';
  const title =
    searchParams.get('tag') === 'new'
      ? `Hàng mới về trong 30 ngày${categoryName ? ` · ${categoryName}` : ''}`
      : categoryName || 'Danh mục sản phẩm';
  const shownError = metadataError || selection.validation;
  const categoryTag = searchParams.get('tag') === 'new' ? 'new' : '';

  const activeFilters: { label: string; changes: Record<string, string> }[] = [];
  if (selection.ids.length && !selection.hasFacets) {
    activeFilters.push({
      label: `Danh mục: ${categories
        .filter((category) => selection.ids.includes(category.id))
        .map((category) => category.name)
        .join(', ')}`,
      changes: { category: '', categoryId: '' },
    });
  }
  for (const [key, values, prefix] of [
    ['audience', selection.audiences, 'Đối tượng'],
    ['type', selection.types, 'Loại'],
    ['size', selection.sizes, 'Size'],
    ['color', selection.colors, 'Màu'],
  ] as const) {
    for (const value of values) {
      activeFilters.push({
        label: `${prefix}: ${key === 'type' ? types.find((item) => item[0] === value)?.[1] || value : value}`,
        changes: { [key]: values.filter((item) => item !== value).join('|') },
      });
    }
  }
  if (searchParams.get('search')) {
    activeFilters.push({
      label: `Tìm: ${searchParams.get('search')}`,
      changes: { search: '' },
    });
  }
  if (searchParams.has('minPrice') || searchParams.has('maxPrice')) {
    activeFilters.push({
      label: `Giá: ${searchParams.get('minPrice') || '0'} – ${searchParams.get('maxPrice') || 'không giới hạn'} ₫`,
      changes: { minPrice: '', maxPrice: '' },
    });
  }
  if (categoryTag) {
    activeFilters.push({ label: 'Mới trong 30 ngày', changes: { tag: '' } });
  }

  const filterGroups: FilterGroup[] = [
    {
      id: 'audience',
      title: 'Đối tượng',
      defaultOpen: true,
      content: (
        <div className="flex flex-col gap-3">
          {audiences.map((audience) => (
            <Checkbox
              key={audience}
              label={audience}
              checked={selection.audiences.includes(audience)}
              onChange={() => toggleFilter('audience', audience)}
            />
          ))}
        </div>
      ),
    },
    {
      id: 'type',
      title: 'Loại sản phẩm',
      defaultOpen: true,
      content: (
        <div className="flex flex-col gap-3">
          {types.map(([key, label]) => (
            <Checkbox
              key={key}
              label={label}
              checked={selection.types.includes(key)}
              onChange={() => toggleFilter('type', key)}
            />
          ))}
        </div>
      ),
    },
    {
      id: 'new',
      title: 'Hàng mới',
      defaultOpen: true,
      content: (
        <Checkbox
          label="Mới về trong 30 ngày"
          checked={categoryTag === 'new'}
          onChange={(event) => updateFilters({ tag: event.target.checked ? 'new' : '' })}
        />
      ),
    },
    {
      id: 'price',
      title: 'Khoảng giá',
      defaultOpen: true,
      content: (
        <form
          ref={priceForm}
          key={`prices-${searchParams.get('minPrice')}-${searchParams.get('maxPrice')}`}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            updateFilters({
              minPrice: String(data.get('minPrice') || ''),
              maxPrice: String(data.get('maxPrice') || ''),
            });
          }}
          className="flex flex-col gap-3"
        >
          <Input
            id="catalog-min-price"
            label="Giá từ (₫)"
            name="minPrice"
            type="number"
            min="0"
            step="any"
            defaultValue={searchParams.get('minPrice') || ''}
          />
          <Input
            id="catalog-max-price"
            label="Giá đến (₫)"
            name="maxPrice"
            type="number"
            min="0"
            step="any"
            defaultValue={searchParams.get('maxPrice') || ''}
          />
          <Button type="submit" variant="secondary" size="sm">
            Áp dụng giá
          </Button>
        </form>
      ),
    },
    {
      id: 'size',
      title: 'Kích cỡ',
      defaultOpen: true,
      content: (
        <>
          <div className="flex flex-wrap gap-2.5">
            {[...new Set([...sizes, ...selection.sizes])].map((size) => (
              <label key={size} className={cn('relative cursor-pointer', styles.sizePill)}>
                <input
                  type="checkbox"
                  checked={selection.sizes.includes(size)}
                  onChange={() => toggleFilter('size', size)}
                  className="sr-only"
                />
                <span className="inline-flex h-[38px] min-w-[44px] items-center justify-center rounded-sm border border-line bg-surface-body px-2.5 text-sm font-medium uppercase text-content-primary transition-colors hover:border-primary">
                  {size}
                </span>
              </label>
            ))}
          </div>
          {!sizes.length && (
            <p className="mt-3 text-sm text-content-secondary">Chưa có kích cỡ còn hàng.</p>
          )}
        </>
      ),
    },
    {
      id: 'color',
      title: 'Màu sắc',
      defaultOpen: true,
      content: (
        <>
          <label htmlFor="catalog-color-search" className="sr-only">
            Tìm màu sắc
          </label>
          <Input
            id="catalog-color-search"
            type="search"
            value={colorSearch}
            onChange={(event) => setColorSearch(event.target.value)}
            placeholder="Tìm màu: đen, trắng, xanh…"
            aria-controls="catalog-color-choices"
            className="mb-3"
          />
          <div
            id="catalog-color-choices"
            className="flex max-h-60 flex-col gap-3 overflow-y-auto px-1"
          >
            {visibleColors.map((color) => (
              <Checkbox
                key={color}
                label={color}
                checked={selection.colors.includes(color)}
                onChange={() => toggleFilter('color', color)}
              />
            ))}
          </div>
          {!!colors.length && !visibleColors.length && (
            <p role="status" className="mt-3 text-sm text-content-secondary">
              Không tìm thấy màu phù hợp.
            </p>
          )}
          {!colors.length && (
            <p className="mt-3 text-sm text-content-secondary">Chưa có màu sắc còn hàng.</p>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-surface-body text-content-primary">
      <section className="bg-surface-dark py-12 text-content-inverse md:py-16">
        <div className="container">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-gold">
            FASHION WEBSITE
          </p>
          <h1 className="my-4 text-2xl font-bold uppercase tracking-wide text-content-inverse md:text-[36px]">
            {title}
          </h1>
          <p className="text-base text-content-disabled">
            Khám phá bộ sưu tập và tìm sản phẩm phù hợp với bạn.
          </p>
        </div>
      </section>

      <div className="container">
        <Breadcrumb
          items={
            searchParams.size > 0
              ? [{ label: 'Sản phẩm', to: '/products' }, { label: title }]
              : [{ label: 'Sản phẩm' }]
          }
        />

        <div className="grid grid-cols-1 items-start gap-9 pb-20 pt-4 md:grid-cols-[260px_minmax(0,1fr)]">
          <div aria-label="Bộ lọc sản phẩm" className="md:border-r md:border-line-light md:pr-5">
            <div className="flex items-center justify-between gap-2 pb-2">
              <h2 className="text-base font-bold uppercase tracking-wide text-content-primary">
                Bộ lọc
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchParams({}, { state: { keepScroll: true } })}
                disabled={!searchParams.size}
              >
                Xóa lọc
              </Button>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-content-secondary">
              Có thể chọn nhiều mục trong mỗi nhóm.
            </p>

            <form
              ref={searchForm}
              key={`search-${searchParams.get('search') || ''}`}
              onSubmit={(event) => {
                event.preventDefault();
                updateFilters({
                  search: String(new FormData(event.currentTarget).get('search') || '').trim(),
                });
              }}
              className="flex flex-col gap-3 border-b border-line-light pb-5"
            >
              <Input
                id="catalog-search"
                label="Tìm sản phẩm"
                name="search"
                type="search"
                defaultValue={searchParams.get('search') || ''}
                placeholder="Tên hoặc mã sản phẩm"
              />
              <Button type="submit" variant="secondary" size="sm">
                Tìm kiếm
              </Button>
            </form>

            <div className="pt-4">
              <FilterSidebar groups={filterGroups} />
            </div>
          </div>

          <section
            ref={resultsRef}
            className={cn('min-w-0', styles.results)}
            aria-label="Kết quả sản phẩm"
            aria-busy={isLoading}
          >
            {activeFilters.length > 0 && (
              <div
                className="mb-5 flex flex-wrap items-center gap-2 text-xs"
                aria-label="Bộ lọc đang áp dụng"
              >
                <span className="font-semibold text-content-secondary">Đang áp dụng:</span>
                {activeFilters.map((filter) => (
                  <button
                    key={filter.label}
                    type="button"
                    aria-label={`Bỏ lọc ${filter.label}`}
                    onClick={() => updateFilters(filter.changes)}
                    className="rounded-sm border border-line bg-surface px-2.5 py-1.5 text-left text-content-primary transition-colors hover:border-primary"
                  >
                    {filter.label} ×
                  </button>
                ))}
              </div>
            )}

            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-line-light pb-4 text-sm">
              <p role="status" className="text-content-secondary">
                {isLoading
                  ? 'Đang tải sản phẩm…'
                  : shownError
                    ? 'Chưa tải được kết quả'
                    : products.length
                      ? `Hiển thị ${pagination.from}–${pagination.to} / ${products.length} sản phẩm`
                      : '0 sản phẩm'}
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2.5">
                  <label htmlFor="catalog-page-size" className="text-sm text-content-secondary">
                    Hiển thị
                  </label>
                  <Select
                    id="catalog-page-size"
                    value={pagination.pageSize}
                    options={PAGE_SIZE_OPTIONS}
                    onChange={(event) =>
                      setSearchParams(
                        mergeFilterParameters(paramsKey, {}, {
                          pageSize: event.target.value,
                          page: '',
                        }),
                        { state: { keepScroll: true } }
                      )
                    }
                    className="w-[130px]"
                  />
                </div>

                <div className="flex items-center gap-2.5">
                  <label htmlFor="catalog-sort" className="text-sm text-content-secondary">
                    Sắp xếp
                  </label>
                  <Select
                    id="catalog-sort"
                    value={selection.filters.sort}
                    options={SORT_OPTIONS}
                    onChange={(event) => updateFilters({ sort: event.target.value })}
                    className="w-[180px]"
                  />
                </div>
              </div>
            </div>

            {isLoading ? (
              <div
                className="grid grid-cols-2 gap-3 sm:gap-[var(--grid-gap)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                aria-hidden="true"
              >
                {[1, 2, 3, 4, 5, 6].map((id) => (
                  <div key={id} className="aspect-[3/4] bg-surface" />
                ))}
              </div>
            ) : shownError ? (
              <div className="px-5 py-16 text-center text-content-secondary" role="alert">
                <p className="mb-6 text-base leading-relaxed">{shownError}</p>
                <div className="flex justify-center gap-4">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setMetadataError('');
                      setIsLoading(true);
                      setRetry((value) => value + 1);
                    }}
                  >
                    Thử lại
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setSearchParams({}, { state: { keepScroll: true } })}
                  >
                    Xóa bộ lọc
                  </Button>
                </div>
              </div>
            ) : products.length ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-[var(--grid-gap)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {pagination.items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                <div className="mt-6 flex flex-col items-center gap-2">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.pageCount}
                    onPageChange={changePage}
                  />
                  <p className="text-xs text-content-secondary">
                    Trang {pagination.page} / {pagination.pageCount}
                  </p>
                </div>
              </>
            ) : (
              <div className="px-5 py-16 text-center text-content-secondary">
                <p className="mb-6 text-base leading-relaxed">
                  Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => setSearchParams({}, { state: { keepScroll: true } })}
                >
                  Xóa bộ lọc
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
