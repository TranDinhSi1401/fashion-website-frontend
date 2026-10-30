import type { CategoryResponse } from '../types/category';

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
