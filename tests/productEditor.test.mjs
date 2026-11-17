import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newVariant, generateVariantGrid, appendVariants, parseVariantTable } from '../src/utils/productEditor.ts';

test('grid creates all color-size combinations and retains existing SKU identity and values', () => {
  const saved = { ...newVariant(150000), id: 1, color: 'Đen', size: 'M', stockQuantity: 2 };
  const rows = generateVariantGrid([saved], ['Đen', 'Trắng'], ['M', 'L'], 200000, 10);
  assert.equal(rows.length, 4); assert.equal(rows[0], saved); assert.equal(rows[0].stockQuantity, 2);
  assert.equal(rows[1].price, 200000); assert.equal(rows[1].stockQuantity, 10);
});
test('grid removes only blank placeholders, normalizes aliases and skips duplicates', () => {
  const rows = generateVariantGrid([newVariant()], [' Đen ', 'Đen'], ['2XL', 'XXL'], 200000, 0);
  assert.equal(rows.length, 1); assert.equal(rows[0].size, 'XXL'); assert.equal(rows[0].color, 'Đen');
});
test('grid rejects invalid numbers and more than 100 rows without altering input', () => {
  const existing = [newVariant()];
  for (const stock of [-1, 1.5, NaN]) assert.throws(() => generateVariantGrid(existing, ['Đen'], ['M'], 100, stock));
  assert.throws(() => generateVariantGrid(existing, [], ['M'], 100, 1));
  assert.throws(() => generateVariantGrid(existing, ['Đen'], ['M'], 0, 1));
  assert.throws(() => generateVariantGrid(existing, Array.from({length: 11}, (_, i) => `Color${i}`), Array.from({length: 10}, (_, i) => `S${i}`), 100, 1));
  assert.equal(existing.length, 1); assert.equal(existing[0].color, '');
});
test('pasted spreadsheet supports tab columns, header and semicolons', () => {
  const rows = parseVariantTable('Màu\tSize\tGiá\tTồn kho\nĐen\tM\t200000\t10\nTrắng\tL\t220000\t5');
  assert.equal(rows.length, 2); assert.equal(rows[1].stockQuantity, 5);
  assert.equal(parseVariantTable('Đen;2XL;200000;0')[0].stockQuantity, 0);
  assert.equal(appendVariants([], rows).length, 2);
});
test('bad pasted rows do not partially apply', () => {
  assert.throws(() => parseVariantTable('Đen\tM\t200000\t10\nTrắng\tL\tbad\t5'));
  assert.throws(() => parseVariantTable('Đen\tM\t\t1'));
  assert.throws(() => appendVariants([], parseVariantTable('Đen;M;100;-1')));
});
