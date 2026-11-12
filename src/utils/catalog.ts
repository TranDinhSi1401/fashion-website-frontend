import type { CategoryResponse } from '../types/category';
import type { ProductFilters, ProductResponse } from '../types/product';

export function paginateCatalog<T>(items: T[], rawPage: string | null, rawPageSize: string | null) {
  const requestedSize = Number(rawPageSize);
  const pageSize = [12, 24, 48].includes(requestedSize) ? requestedSize : 12;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const requestedPage = Number(rawPage);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, pageCount) : 1;
  const offset = (page - 1) * pageSize;
  return { page, pageSize, pageCount, items: items.slice(offset, offset + pageSize),
    from: items.length ? offset + 1 : 0, to: Math.min(offset + pageSize, items.length) };
}

export function searchColors(colors: string[], query: string): string[] {
  const words = normalize(query).split(' ').filter(Boolean);
  return colors.filter(color => words.every(word => normalize(color).includes(word)));
}

export function filterCatalog(products: ProductResponse[], categories: CategoryResponse[], filters: ProductFilters,
  sizes: string[], colors: string[], now = Date.now()): ProductResponse[] {
  const categoryIds = new Set(String(filters.categoryId || filters.categoryIds || '').split(',').filter(Boolean).map(Number));
  // Include descendants for links targeting an existing parent category.
  if (categoryIds.size) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const category of categories) {
        if (category.parentId && categoryIds.has(category.parentId) && !categoryIds.has(category.id)) {
          categoryIds.add(category.id); changed = true;
        }
      }
    }
  }
  const keyword = normalize(filters.keyword || '');
  const result = products.filter(product => {
    if (product.isActive === false || (categoryIds.size && !categoryIds.has(product.categoryId))) return false;
    if (keyword && !normalize(`${product.name} ${product.slug || ''}`).includes(keyword)) return false;
    if (filters.minPrice !== undefined && product.basePrice < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && product.basePrice > filters.maxPrice) return false;
    if (filters.newWithinDays !== undefined) {
      const created = Date.parse(product.createdAt || '');
      const isNew = filters.newWithinDays === 30 && product.isNew !== undefined ? product.isNew
        : Number.isFinite(created) && created <= now && created >= now - filters.newWithinDays * 86400000;
      if (!isNew) return false;
    }
    return matchesVariantFilters(product, sizes, colors);
  });
  return result.sort((a, b) => {
    const tie = b.id - a.id;
    switch (filters.sort) {
      case 'price-asc': return a.basePrice - b.basePrice || tie;
      case 'price-desc': return b.basePrice - a.basePrice || tie;
      case 'name': return a.name.localeCompare(b.name, 'vi') || tie;
      default: return (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0) || tie;
    }
  });
}

// Adapt the current category tree without exposing demo-source groups as filters.
export function categoryFacets(category: CategoryResponse, categories: CategoryResponse[]) {
  const path: CategoryResponse[] = [];
  let current: CategoryResponse | undefined = category;
  while (current && !path.some(item => item.id === current!.id)) {
    path.push(current);
    current = categories.find(item => item.id === current!.parentId);
  }
  const audience = path.map(item => normalize(item.name)).map(name =>
    /\bunisex\b/.test(name) ? 'Unisex' : /\bnu\b/.test(name) ? 'Nữ' : /\bnam\b/.test(name) ? 'Nam' : '').find(Boolean) || '';
  const type = category.name.replace(/\bOwen\b/gi, '').replace(/\bNam\b|Nữ|Unisex/gi, '')
    .replace(/[—–-]/g, ' ').replace(/\s+/g, ' ').trim();
  return { audience, type, typeKey: normalize(type) };
}

export function matchesVariantFilters(product: ProductResponse, sizes: string[], colors: string[]) {
  if (!sizes.length && !colors.length) return true;
  // A purchasable variant must satisfy size AND color together.
  return (product.variants || []).some(variant => variant.isActive && variant.stockQuantity > 0
    && (!sizes.length || sizes.includes(normalizeSize(variant.size)))
    && (!colors.length || colors.includes(variant.color.trim())));
}

export const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Compatibility with existing Header/Home links; IDs always come from the API.
const categoryAliases: Record<string, string[]> = {
  ao: ['ao'], 't-shirt': ['ao thun', 't shirt'], polo: ['polo'], 'so-mi': ['so mi'],
  quan: ['quan'], 'quan-tay': ['quan tay'], khaki: ['khaki', 'kaki'], jeans: ['jeans', 'jean'],
  khoac: ['khoac', 'blazer', 'jacket'], phukien: ['phu kien'],
};

export function resolveCategories(key: string, categories: CategoryResponse[]): number[] {
  const words = categoryAliases[key];
  return categories.filter(category => {
    const name = normalize(category.name);
    // Navigation groups for men's clothing must not also include women's categories.
    if (words && /(^| )nu( |$)/.test(name)) return false;
    return words ? words.some(word => (` ${name} `).includes(` ${word} `))
      : normalize(category.slug || '') === normalize(key);
  }).map(category => category.id);
}

export function parsePrice(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : NaN;
}

export function normalizeSize(size: string): string {
  const value = size.trim().toUpperCase();
  return value === 'XXL' ? '2XL' : value;
}

export function mergeFilterParameters(query: string, pending: Record<string, string>, changes: Record<string, string>): string {
  const next = new URLSearchParams(query);
  Object.entries({ ...pending, ...changes }).forEach(([key, value]) => value.trim() ? next.set(key, value.trim()) : next.delete(key));
  return next.toString();
}
