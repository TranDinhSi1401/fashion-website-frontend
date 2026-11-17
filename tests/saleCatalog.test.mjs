import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterCatalog } from '../src/utils/catalog.ts';
import { hasSaleOffer, isCurrentOffer } from '../src/utils/productOffers.ts';
const now = Date.parse('2026-11-17T12:00:00Z');
const offer = { id: 1, originalPrice: 200000, discountAmount: 40000, discountedPrice: 160000, endDate: '2026-12-01T00:00:00Z' };
const variant = { id: 10, size: 'M', color: 'Đen', price: 200000, stockQuantity: 3, isActive: true, bestOffer: offer };
const product = { id: 1, name: 'Áo', basePrice: 200000, categoryId: 2, isActive: true, variants: [variant], bestOffer: offer };

test('sale combines category, price, color, size and normal pagination input', () => {
  const normal = { ...product, id: 2, variants: [{ ...variant, bestOffer: null }], bestOffer: null };
  const result = filterCatalog([product, normal], [], { saleOnly: true, categoryId: 2, maxPrice: 250000 }, ['M'], ['Đen'], now);
  assert.deepEqual(result.map(p => p.id), [1]);
  assert.equal(filterCatalog([product], [], { saleOnly: true, maxPrice: 100000 }, [], [], now).length, 0);
});
test('an offer on a different or unavailable variant cannot satisfy selected filters', () => {
  const p = { ...product, bestOffer: { ...offer, variantId: 10 }, variants: [variant, { ...variant, id: 11, color: 'Trắng', bestOffer: null }] };
  assert.equal(hasSaleOffer(p, [], ['Trắng'], now), false);
  assert.equal(hasSaleOffer({ ...p, variants: [{ ...variant, stockQuantity: 0 }] }, [], [], now), false);
  assert.equal(hasSaleOffer({ ...p, variants: [{ ...variant, isActive: false }] }, [], [], now), false);
});
test('expired and invalid offers are hidden; a full discount remains valid', () => {
  assert.equal(isCurrentOffer({ ...offer, endDate: '2026-01-01T00:00:00Z' }, now), false);
  assert.equal(isCurrentOffer({ ...offer, discountedPrice: -1 }, now), false);
  assert.equal(isCurrentOffer({ ...offer, discountAmount: 0 }, now), false);
  assert.equal(isCurrentOffer({ ...offer, discountedPrice: 0, discountAmount: 200000 }, now), true);
});

test('sale card price follows the selected color rather than a better offer on another color', () => {
  const whiteOffer = { ...offer, id: 2, discountAmount: 10000, discountedPrice: 190000, variantId: 11 };
  const p = { ...product, bestOffer: { ...offer, variantId: 10 }, variants: [variant, { ...variant, id: 11, color: 'Trắng', bestOffer: whiteOffer }] };
  const result = filterCatalog([p], [], { saleOnly: true }, [], ['Trắng'], now);
  assert.equal(result[0].bestOffer.id, 2);
  assert.equal(result[0].discountedPrice, 190000);
  assert.equal(p.bestOffer.id, 1);
});
