import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCategoryMenu, groupCategoryIds, groupHref, isNavigationGroupActive } from '../src/utils/categoryNavigation.ts';
import { filterCatalog } from '../src/utils/catalog.ts';

const categories = [
  { id: 1, name: 'Nam', isActive: true }, { id: 2, name: 'Nữ', isActive: true },
  { id: 12, name: 'Owen — Nam', isActive: true },
  { id: 71, name: 'Áo thun Nam', parentId: 1, isActive: true },
  { id: 94, name: 'Áo polo Nam', parentId: 1, isActive: true },
  { id: 111, name: 'Áo polo Nữ', parentId: 2, isActive: true },
  { id: 205, name: 'Áo sơ mi Owen', parentId: 12, isActive: true },
  { id: 300, name: 'Quần tây Owen', parentId: 12, isActive: true },
  { id: 301, name: 'Quần legging Nữ', parentId: 2, isActive: true },
];
test('menu names and IDs come from the API, including both audiences and brand branches', () => {
  const menu = buildCategoryMenu('ao', categories);
  const links = menu.flatMap(c => c.links);
  for (const id of [71, 94, 111, 205]) assert.ok(links.some(l => l.to === '/products?categoryId=' + id));
  assert.ok(menu.some(c => c.title === 'Áo nữ'));
  assert.ok(links.some(l => l.label === 'Áo sơ mi Owen'));
  assert.ok(!links.some(l => /blazer|khaki|jeans|may đo|bán chạy/i.test(l.label)));
  assert.ok(!links.some(l => l.to.includes('popular')));
});
test('new or renamed categories update links without modifying the menu source', () => {
  const changed = categories.map(c => c.id === 94 ? { ...c, name: 'Áo polo cotton Nam' } : c);
  changed.push({ id: 999, name: 'Áo khoác mới Nam', parentId: 1, isActive: true });
  const links = buildCategoryMenu('ao', changed).flatMap(c => c.links);
  assert.ok(links.some(l => l.label === 'Áo polo cotton Nam' && l.to.endsWith('94')));
  assert.ok(links.some(l => l.label === 'Áo khoác mới Nam' && l.to.endsWith('999')));
});
test('inactive ancestors, orphans and cyclic branches are not advertised', () => {
  const hidden = categories.map(c => c.id === 1 ? { ...c, isActive: false } : c);
  hidden.push({ id: 800, name: 'Áo orphan', parentId: 404, isActive: true });
  hidden.push({ id: 801, name: 'Áo cyclic', parentId: 802, isActive: true });
  hidden.push({ id: 802, name: 'Cycle', parentId: 801, isActive: true });
  assert.deepEqual(groupCategoryIds('ao', hidden), [111, 205]);
});
test('group inheritance supports a real Áo parent with children named without the Áo prefix', () => {
  const tree = [{ id: 40, name: 'Áo' }, { id: 41, name: 'Polo', parentId: 40 }];
  assert.deepEqual(groupCategoryIds('ao', tree), [40, 41]);
});
test('new and sale links retain their own group instead of opening all products', () => {
  const pants = buildCategoryMenu('quan', categories)[0].links;
  assert.equal(pants[1].to, '/products?group=quan&tag=new');
  assert.equal(pants[2].to, '/products?group=quan&tag=sale');
  assert.equal(groupHref('ao'), '/products?group=ao');
  assert.deepEqual(buildCategoryMenu('phukien', categories), []);
});
test('a category link and group IDs select products in the same database categories', () => {
  const products = categories.filter(c => c.parentId).map(c => ({ id:c.id,categoryId:c.id,name:c.name,basePrice:100 }));
  const ids = groupCategoryIds('quan', categories);
  assert.deepEqual(filterCatalog(products, categories, {categoryIds:ids.join(',')}, [], []).map(p=>p.id), [301,300]);
  assert.equal(isNavigationGroupActive('quan', '?categoryId=301', categories), true);
  assert.equal(isNavigationGroupActive('ao', '?categoryId=301', categories), false);
});
