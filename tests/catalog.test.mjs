import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoryFacets, filterCatalog, paginateCatalog, searchColors, matchesVariantFilters, resolveCategories, normalizeSize, parsePrice, mergeFilterParameters } from '../src/utils/catalog.ts';

test('pagination covers every result once, including the partial last page', () => {
  const products = Array.from({length: 68}, (_, id) => id + 1);
  const pages = Array.from({length: 6}, (_, index) => paginateCatalog(products, String(index + 1), '12'));
  assert.deepEqual(pages.flatMap(page => page.items), products);
  assert.deepEqual([pages[5].from, pages[5].to, pages[5].pageCount], [61, 68, 6]);
  assert.equal(paginateCatalog(products, '2', '24').from, 25);
  assert.equal(paginateCatalog(products, '2', '48').items.length, 20);
});

test('pagination handles invalid links, shrinking result sets and zero results', () => {
  const products = Array.from({length: 25}, (_, id) => id);
  for (const value of [null, '0', '-1', '1.5', 'abc', 'Infinity']) assert.equal(paginateCatalog(products, value, '12').page, 1);
  assert.equal(paginateCatalog(products, '999', '12').page, 3);
  assert.equal(paginateCatalog(products.slice(0, 2), '3', '12').page, 1);
  assert.equal(paginateCatalog(products, '1', '99999').pageSize, 12);
  assert.deepEqual(paginateCatalog([], '2', '12'), {page: 1, pageSize: 12, pageCount: 1, items: [], from: 0, to: 0});
});

test('color search accepts accents, case and multiple words without changing the original options', () => {
  const colors = ['Đen', 'Trắng', 'XANH NAVY', 'Xanh đen', 'Be', 'BE'];
  assert.deepEqual(searchColors(colors, 'den'), ['Đen', 'Xanh đen']);
  assert.deepEqual(searchColors(colors, ' DEN xanh '), ['Xanh đen']);
  assert.deepEqual(searchColors(colors, 'be'), ['Be', 'BE']);
  assert.deepEqual(searchColors(colors, ''), colors);
  assert.deepEqual(searchColors(colors, 'tim'), []);
});

test('local filtering combines category descendants, search, price and purchasable variants without mutating catalog', () => {
  const categories = [{id: 1, name: 'Nam'}, {id: 2, name: 'Áo polo', parentId: 1}, {id: 3, name: 'Nữ'}];
  const variant = {size: 'M', color: 'Đen', isActive: true, stockQuantity: 3};
  const products = [
    {id: 1, name: 'Áo polo A', categoryId: 2, basePrice: 200, variants: [variant]},
    {id: 2, name: 'Áo polo B', categoryId: 2, basePrice: 300, variants: [variant]},
    {id: 3, name: 'Áo polo C', categoryId: 3, basePrice: 250, variants: [variant]},
  ];
  const filters = {categoryId: 1, keyword: 'ao polo', minPrice: 200, maxPrice: 300, sort: 'price-desc'};
  assert.deepEqual(filterCatalog(products, categories, filters, ['M', 'L'], ['Đen']).map(p => p.id), [2, 1]);
  assert.deepEqual(filterCatalog(products, categories, filters, ['M'], ['Trắng']), []);
  assert.deepEqual(products.map(p => p.id), [1, 2, 3]);
});

test('new arrivals honor API flag and fall back to a bounded creation date', () => {
  const now = Date.parse('2026-11-12T12:00:00Z');
  const products = [
    {id: 1, name: 'A', categoryId: 1, basePrice: 1, isNew: true},
    {id: 2, name: 'B', categoryId: 1, basePrice: 1, isNew: false},
    {id: 3, name: 'C', categoryId: 1, basePrice: 1, createdAt: '2026-11-11T12:00:00Z'},
    {id: 4, name: 'D', categoryId: 1, basePrice: 1, createdAt: '2026-11-13T12:00:00Z'},
  ];
  assert.deepEqual(filterCatalog(products, [], {newWithinDays: 30}, [], [], now).map(p => p.id), [3, 1]);
});

test('product types merge across audiences and demo sources; audience follows ancestors', () => {
  const tree = [{ id: 1, name: 'Nam' }, { id: 2, name: 'Nữ' }, { id: 3, name: 'Owen — Nam' },
    { id: 4, name: 'Áo polo Nam', parentId: 1 }, { id: 5, name: 'Áo polo Nữ', parentId: 2 },
    { id: 6, name: 'Áo polo Owen', parentId: 3 }];
  assert.deepEqual(tree.slice(3).map(item => categoryFacets(item, tree).typeKey), ['ao polo', 'ao polo', 'ao polo']);
  assert.deepEqual(tree.slice(3).map(item => categoryFacets(item, tree).audience), ['Nam', 'Nữ', 'Nam']);
  assert.equal(categoryFacets(tree[2], tree).typeKey, '');
});

test('multi-select accepts alternatives in a group but requires size and color on one available variant', () => {
  const product = { variants: [
    { size: 'M', color: 'Đen', isActive: true, stockQuantity: 1 },
    { size: 'L', color: 'Trắng', isActive: true, stockQuantity: 2 },
    { size: 'XL', color: 'Đen', isActive: true, stockQuantity: 0 },
    { size: 'S', color: 'Đen', isActive: false, stockQuantity: 3 },
  ] };
  assert.equal(matchesVariantFilters(product, ['M', 'L'], ['Trắng']), true);
  assert.equal(matchesVariantFilters(product, ['M'], ['Trắng']), false);
  assert.equal(matchesVariantFilters(product, ['XL', 'S'], ['Đen']), false);
  assert.equal(matchesVariantFilters(product, [], []), true);
});

const categories = [
  { id: 71, name: 'Áo thun Nam' }, { id: 94, name: 'Áo polo Nam' },
  { id: 111, name: 'Áo polo Nữ' }, { id: 205, name: 'Áo sơ mi Owen' },
  { id: 300, name: 'Quần tây Owen' },
];
test('navigation resolves real IDs instead of fixed IDs and excludes womenswear from menswear groups', () => {
  assert.deepEqual(resolveCategories('ao', categories), [71, 94, 205]);
  assert.deepEqual(resolveCategories('polo', categories), [94]);
  assert.deepEqual(resolveCategories('so-mi', categories), [205]);
  assert.deepEqual(resolveCategories('quan-tay', categories), [300]);
  assert.deepEqual(resolveCategories('unknown', categories), []);
});
test('prices preserve zero and reject invalid or negative values', () => {
  assert.equal(parsePrice(null), undefined);
  assert.equal(parsePrice(''), undefined);
  assert.equal(parsePrice('0'), 0);
  for (const value of ['-1', 'abc', 'Infinity']) assert.ok(Number.isNaN(parsePrice(value)));
});
test('equivalent size labels use a single canonical choice', () => {
  assert.equal(normalizeSize(' xxl '), '2XL');
  assert.equal(normalizeSize('2xl'), '2XL');
  assert.equal(normalizeSize('m'), 'M');
});

test('combining groups also applies pending price/search and retains new-arrivals mode', () => {
  const result=new URLSearchParams(mergeFilterParameters('tag=new&categoryId=71&size=M',
    {minPrice:'100000',maxPrice:'400000',search:'polo'}, {color:'Đen'}));
  for(const [key,value] of Object.entries({tag:'new',categoryId:'71',size:'M',minPrice:'100000',maxPrice:'400000',search:'polo',color:'Đen'})) assert.equal(result.get(key),value);
  const cleared=new URLSearchParams(mergeFilterParameters(result.toString(), {search:'polo'}, {color:''}));
  assert.equal(cleared.has('color'),false);assert.equal(cleared.get('size'),'M');assert.equal(cleared.get('tag'),'new');
});
