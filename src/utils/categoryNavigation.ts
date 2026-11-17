import type { CategoryResponse } from '../types/category';
import { categoryFacets, normalize, resolveCategories } from './catalog.ts';

export type CatalogGroup = 'ao' | 'quan' | 'phukien';
export const GROUP_LABELS: Record<CatalogGroup, string> = { ao: 'Áo', quan: 'Quần', phukien: 'Phụ kiện' };
export function isCatalogGroup(value: string | null): value is CatalogGroup {
  return value === 'ao' || value === 'quan' || value === 'phukien';
}

function categoryPath(category: CategoryResponse, categories: CategoryResponse[]): CategoryResponse[] | null {
  const byId = new Map(categories.map(c => [c.id, c]));
  const seen = new Set<number>();
  const path: CategoryResponse[] = [];
  let current: CategoryResponse | undefined = category;
  while (current) {
    if (seen.has(current.id) || current.isActive === false) return null;
    seen.add(current.id); path.push(current);
    if (current.parentId == null) return path;
    current = byId.get(current.parentId);
  }
  return null; // Do not advertise orphaned or partially hidden category branches.
}

export function categoryGroup(category: CategoryResponse, categories: CategoryResponse[]): CatalogGroup | null {
  const path = categoryPath(category, categories);
  if (!path) return null;
  for (const node of path) {
    const name = normalize(node.name);
    if (/^ao(?: |$)/.test(name)) return 'ao';
    if (/^quan(?: |$)/.test(name)) return 'quan';
    if (/^phu kien(?: |$)/.test(name)) return 'phukien';
  }
  return null;
}

export function groupCategoryIds(group: CatalogGroup, categories: CategoryResponse[]): number[] {
  return categories.filter(c => categoryGroup(c, categories) === group).map(c => c.id);
}

export function groupHref(group: CatalogGroup, tag?: 'new' | 'sale') {
  const params = new URLSearchParams({ group });
  if (tag) params.set('tag', tag);
  return '/products?' + params.toString();
}

export function buildCategoryMenu(group: CatalogGroup, categories: CategoryResponse[]) {
  const matching = categories.filter(c => categoryGroup(c, categories) === group);
  if (!matching.length) return [];
  const label = GROUP_LABELS[group];
  const columns = [{ title: 'Khám phá ' + label.toLocaleLowerCase('vi'), links: [
    { label: 'Tất cả ' + label.toLocaleLowerCase('vi'), to: groupHref(group) },
    { label: 'Hàng mới về', to: groupHref(group, 'new') },
    { label: 'Đang có ưu đãi', to: groupHref(group, 'sale') },
  ] }];
  const audiences = ['Nam', 'Nữ', 'Unisex', ''];
  for (const audience of audiences) {
    const items = matching.filter(c => categoryFacets(c, categories).audience === audience)
      .sort((a, b) => a.name.localeCompare(b.name, 'vi') || a.id - b.id);
    if (items.length) columns.push({
      title: audience ? label + ' ' + audience.toLocaleLowerCase('vi') : 'Danh mục ' + label.toLocaleLowerCase('vi'),
      links: items.map(c => ({ label: c.name, to: '/products?categoryId=' + c.id })),
    });
  }
  return columns;
}

export function isNavigationGroupActive(group: CatalogGroup, query: string, categories: CategoryResponse[]) {
  const params = new URLSearchParams(query);
  if (params.has('group')) return params.get('group') === group;
  const ids = new Set(groupCategoryIds(group, categories));
  if (params.has('categoryId')) return ids.has(Number(params.get('categoryId')));
  if (params.has('category')) return resolveCategories(params.get('category') || '', categories).some(id => ids.has(id));
  return false;
}
