import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCategories, normalizeSize, parsePrice, mergeFilterParameters } from '../src/utils/catalog.ts';

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
