import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { SlidersHorizontal, X } from 'lucide-react';
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
} from '../utils/catalog';
import { GROUP_LABELS, groupCategoryIds, isCatalogGroup } from '../utils/categoryNavigation';
import MoneyInput from '../components/ui/MoneyInput';
import { formatMoneyInput } from '../utils/moneyInput';
import Breadcrumb from '../components/layout/Breadcrumb';
import {
  Button,
  Checkbox,
  FilterGroup,
  FilterSidebar,
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

interface CatalogBannerMeta {
  imageUrl: string;
  badge: string;
  subtitle: string;
  objectPosition?: string;
}

function resolveCatalogBanner(
  group?: string | null,
  tag?: string | null,
  categoryName?: string | null
): CatalogBannerMeta {
  const normCategory = (categoryName || '').toLowerCase();

  if (tag === 'sale') {
    return {
      imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1600&auto=format&fit=crop',
      badge: 'ĐẶC QUYỀN ƯU ĐÃI · PRIVILEGE SALE',
      subtitle: 'Cơ hội sở hữu những thiết kế may đo cao cấp với mức giá ưu đãi đặc quyền.',
      objectPosition: 'center 35%',
    };
  }
  if (tag === 'new') {
    return {
      imageUrl: 'https://images.unsplash.com/photo-1516826957135-700dedea698c?q=80&w=1600&auto=format&fit=crop',
      badge: 'BỘ SƯU TẬP MỚI · NEW ARRIVALS',
      subtitle: 'Cập nhật những xu hướng thời trang đương đại và chất liệu thượng hạng mới nhất.',
      objectPosition: 'center 35%',
    };
  }
  if (normCategory.includes('sơ mi') || normCategory.includes('so mi')) {
    return {
      imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?q=80&w=1600&auto=format&fit=crop',
      badge: 'ÁO SƠ MI CAO CẤP · DRESS SHIRTS',
      subtitle: 'Chất liệu Cotton Ai Cập và Linen Normandie thoáng mát, tôn vinh phong thái lịch lãm.',
      objectPosition: 'center 30%',
    };
  }
  if (normCategory.includes('polo')) {
    return {
      imageUrl: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=1600&auto=format&fit=crop',
      badge: 'ÁO POLO DỆT KIM · LUXURY POLO',
      subtitle: 'Sự giao thoa hoàn hảo giữa nét năng động hiện đại và sự chỉn chu tinh tế.',
      objectPosition: 'center 35%',
    };
  }
  if (group === 'ao' || normCategory.includes('áo') || normCategory.includes('ao')) {
    return {
      imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=1600&auto=format&fit=crop',
      badge: 'BỘ SƯU TẬP ÁO NAM · SHIRTS & POLOS',
      subtitle: 'Định hình phong cách quý ông với các thiết kế áo may đo sắc nét và êm ái.',
      objectPosition: 'center 35%',
    };
  }
  if (normCategory.includes('short')) {
    return {
      imageUrl: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?q=80&w=1600&auto=format&fit=crop',
      badge: 'QUẦN SHORT NAM · CASUAL SHORTS',
      subtitle: 'Thoải mái, phóng khoáng nhưng luôn giữ trọn nét lịch thiệp mùa hè.',
      objectPosition: 'center 45%',
    };
  }
  if (normCategory.includes('tây') || normCategory.includes('khaki') || normCategory.includes('jeans')) {
    return {
      imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1600&auto=format&fit=crop',
      badge: 'QUẦN TÂY MAY ĐO · TAILORED TROUSERS',
      subtitle: 'Đường ly phẳng phiu, phom dáng chuẩn mực nâng tầm từng bước đi đĩnh đạc.',
      objectPosition: 'center 45%',
    };
  }
  if (group === 'quan' || normCategory.includes('quần') || normCategory.includes('quan')) {
    return {
      imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1600&auto=format&fit=crop',
      badge: 'BỘ SƯU TẬP QUẦN NAM · TROUSERS & PANTS',
      subtitle: 'Sự vừa vặn hoàn hảo, tôn dáng tự nhiên và đem lại cảm giác thoải mái cả ngày.',
      objectPosition: 'center 45%',
    };
  }
  return {
    imageUrl: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?q=80&w=1600&auto=format&fit=crop',
    badge: 'FASHION WEBSITE · ĐẲNG CẤP QUÝ ÔNG',
    subtitle: 'Định hình phong cách hiện đại với những thiết kế tối giản, sắc nét và chất liệu cao cấp.',
    objectPosition: 'center 35%',
  };
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
  const [metadataError, setMetadataError] = useState('');
  const [retry, setRetry] = useState(0);
  const [offerTime, setOfferTime] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setOfferTime(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const [showFilters, setShowFilters] = useState(false);
  const filterDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = filterDialog.current;
    if (!showFilters || !dialog) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [showFilters]);
  const priceForm = useRef<HTMLFormElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  const updateFilters = (changes: Record<string, string>) => {
    const pending: Record<string, string> = {};
    for (const form of [priceForm.current]) {
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
    const group = params.get('group');
    const groupIds = isCatalogGroup(group) ? new Set(groupCategoryIds(group, categories)) : null;
    const audiences = (params.get('audience') || '').split('|').filter(Boolean);
    const types = (params.get('type') || '').split('|').filter(Boolean);
    const sizes = (params.get('size') || '').split('|').filter(Boolean);
    const colors = (params.get('color') || '').split('|').filter(Boolean);
    const hasFacets = audiences.length > 0 || types.length > 0;
    let ids = hasFacets
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
    if (groupIds) ids = (hasFacets || rawId || alias ? ids : [...groupIds]).filter(id => groupIds.has(id));
    const sort = params.get('sort') || 'newest';
    const invalidPrice =
      Number.isNaN(minPrice) ||
      Number.isNaN(maxPrice) ||
      (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice);
    let validation = invalidPrice
      ? 'Khoảng giá không hợp lệ. Giá từ phải nhỏ hơn hoặc bằng giá đến.'
      : '';
    if (group && !isCatalogGroup(group)) validation = 'Nhóm sản phẩm không hợp lệ.';
    if (rawId && (!Number.isSafeInteger(Number(rawId)) || Number(rawId) < 1)) {
      validation = 'Danh mục không hợp lệ.';
    }
    if (!['newest', 'price-asc', 'price-desc', 'name'].includes(sort)) {
      validation = 'Cách sắp xếp không hợp lệ.';
    }
    if (params.get('tag') && !['sale', 'new'].includes(params.get('tag')!)) {
      validation = 'Bộ lọc không hợp lệ.';
    }
    const filters: ProductFilters = {
      ...(!hasFacets && !group && rawId
        ? { categoryId: rawId }
        : ids.length
          ? { categoryIds: ids.join(',') }
          : {}),
      keyword: params.get('search')?.trim() || undefined,
      minPrice,
      maxPrice,
      sort,
      newWithinDays: params.get('tag') === 'new' ? 30 : undefined,
      saleOnly: params.get('tag') === 'sale',
    };
    const missingCategory = Boolean(
      (hasFacets || alias || rawId || group) &&
        !categories.some((category) => ids.includes(category.id))
    );
    return { filters, ids, validation, missingCategory, audiences, types, sizes, colors, hasFacets, group };
  }, [paramsKey, categories, facets]);

  const products = useMemo(
    () =>
      selection.validation || selection.missingCategory
        ? []
        : filterCatalog(catalog, categories, selection.filters, selection.sizes, selection.colors, offerTime),
    [catalog, categories, selection, offerTime]
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
  const visibleColors = [...new Set([...colors, ...selection.colors])];
  const availableFacets = facets.filter((category) =>
    (!isCatalogGroup(selection.group) || groupCategoryIds(selection.group, categories).includes(category.id)) && catalog.some((product) => product.categoryId === category.id)
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
    isCatalogGroup(selection.group) ? GROUP_LABELS[selection.group] :
    !selection.hasFacets && selection.ids.length === 1
      ? categories.find((category) => category.id === selection.ids[0])?.name
      : '';
  const title =
    searchParams.get('tag') === 'sale'
      ? `Ưu đãi sản phẩm${categoryName ? ` · ${categoryName}` : ''}`
      : searchParams.get('tag') === 'new'
      ? `Hàng mới về trong 30 ngày${categoryName ? ` · ${categoryName}` : ''}`
      : categoryName || 'Danh mục sản phẩm';
  const bannerMeta = resolveCatalogBanner(selection.group, searchParams.get('tag'), categoryName);
  const shownError = metadataError || selection.validation;
  const categoryTag = searchParams.get('tag') === 'new' ? 'new' : '';

  const activeFilters: { label: string; changes: Record<string, string> }[] = [];
  if (isCatalogGroup(selection.group)) activeFilters.push({ label: `Nhóm: ${GROUP_LABELS[selection.group]}`, changes: { group: '' } });
  if (selection.ids.length && !selection.hasFacets && !selection.group) {
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
      label: `Giá: ${formatMoneyInput(searchParams.get('minPrice') || '0')} – ${searchParams.has('maxPrice') ? formatMoneyInput(searchParams.get('maxPrice') || '0') : 'không giới hạn'} đ`,
      changes: { minPrice: '', maxPrice: '' },
    });
  }
  if (searchParams.get('tag') === 'sale') activeFilters.push({ label: 'Đang có ưu đãi', changes: { tag: '' } });
  if (categoryTag) {
    activeFilters.push({ label: 'Mới trong 30 ngày', changes: { tag: '' } });
  }

  const filterGroups: FilterGroup[] = [
    {
      id: 'offers', title: 'Ưu đãi', defaultOpen: true,
      content: <Checkbox label="Đang có ưu đãi" checked={searchParams.get('tag') === 'sale'}
        onChange={event => updateFilters({ tag: event.target.checked ? 'sale' : '' })} />,
    },
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
          <MoneyInput
            id="catalog-min-price"
            label="Giá từ"
            name="minPrice"
            defaultValue={searchParams.get('minPrice') || ''}
          />
          <MoneyInput
            id="catalog-max-price"
            label="Giá đến"
            name="maxPrice"
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
          {!colors.length && (
            <p className="mt-3 text-sm text-content-secondary">Chưa có màu sắc còn hàng.</p>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-surface-body text-content-primary">
      {/* Banner Ảnh Thật Editorial với Độ Sáng Rõ Nét */}
      <section className="relative overflow-hidden bg-black text-content-inverse min-h-[200px] sm:min-h-[240px] md:min-h-[280px] flex items-center">
        {/* Ảnh nền thật sáng rõ, chi tiết cao */}
        <img
          src={bannerMeta.imageUrl}
          alt={title}
          loading="eager"
          style={{ objectPosition: bannerMeta.objectPosition || 'center 35%' }}
          className="absolute inset-0 h-full w-full object-cover filter brightness-95 contrast-105 transition-transform duration-1000 hover:scale-103"
        />

        {/* Lớp phủ mờ nhẹ bên trái để giữ độ tương phản chữ, bên phải sáng rõ ảnh thật */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

        <div className="container relative z-10 py-8 sm:py-12 md:py-14">
          <div className="max-w-2xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
            <span className="inline-block text-[0.7rem] sm:text-xs font-bold uppercase tracking-[0.2em] text-accent-gold mb-2">
              {bannerMeta.badge}
            </span>
            <h1 className="my-1.5 text-2xl font-bold uppercase tracking-wider text-white sm:text-3xl md:text-[36px] leading-tight">
              {title}
            </h1>
            <p className="mt-2 text-xs sm:text-sm md:text-base leading-relaxed text-gray-100 font-normal max-w-xl">
              {bannerMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Đường viền vàng mảnh tinh tế dưới đáy banner */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent-gold/60 to-transparent" />
      </section>

      <div className="container">
        <Breadcrumb
          items={
            searchParams.size > 0
              ? [{ label: 'Sản phẩm', to: '/products' }, { label: title }]
              : [{ label: 'Sản phẩm' }]
          }
        />

        <div className="pb-20 pt-4">
          <dialog
            ref={filterDialog}
            id="catalog-filter-drawer"
            aria-labelledby="catalog-filter-title"
            className={styles.filterDrawer}
            onCancel={(event) => { event.preventDefault(); setShowFilters(false); }}
            onClose={() => setShowFilters(false)}
            onClick={(event) => { if (event.target === event.currentTarget) setShowFilters(false); }}
          >
            <div className={styles.filterPanel}>
              <div className={styles.filterHeader}>
                <h2 id="catalog-filter-title" className="text-base font-bold uppercase tracking-wide">Bộ lọc sản phẩm</h2>
                <button type="button" onClick={() => setShowFilters(false)} aria-label="Đóng bộ lọc" className={styles.closeFilters}>
                  <X size={20} />
                </button>
              </div>
              <div className={styles.filterBody}>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <p className="text-xs text-content-secondary">Có thể chọn nhiều mục trong mỗi nhóm.</p>
                  <Button variant="ghost" size="sm" onClick={() => setSearchParams({}, { state: { keepScroll: true } })} disabled={!searchParams.size}>
                    Xóa lọc
                  </Button>
                </div>
                <FilterSidebar groups={filterGroups} className="max-w-none" />
              </div>
              <div className={styles.filterFooter}>
                <Button variant="primary" className="w-full" onClick={() => { priceForm.current?.requestSubmit(); setShowFilters(false); }}>
                  Xem kết quả
                </Button>
              </div>
            </div>
          </dialog>

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
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="secondary" icon={SlidersHorizontal} onClick={() => setShowFilters(true)} aria-haspopup="dialog" aria-controls="catalog-filter-drawer" aria-expanded={showFilters}>
                  Bộ lọc{activeFilters.length > 0 ? ` (${activeFilters.length})` : ''}
                </Button>
              <p role="status" className="text-content-secondary">
                {isLoading
                  ? 'Đang tải sản phẩm…'
                  : shownError
                    ? 'Chưa tải được kết quả'
                    : products.length
                      ? `Hiển thị ${pagination.from}–${pagination.to} / ${products.length} sản phẩm`
                      : '0 sản phẩm'}
              </p>
              </div>

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
