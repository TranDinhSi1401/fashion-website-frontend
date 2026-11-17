import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moneyDigits, formatMoneyInput, moneyCaretPosition } from '../src/utils/moneyInput.ts';

test('groups VND using ordinary spaces and keeps zero and empty distinct', () => {
  assert.equal(formatMoneyInput('2000000'), '2 000 000');
  assert.equal(formatMoneyInput('123456789'), '123 456 789');
  assert.equal(formatMoneyInput('0'), '0'); assert.equal(formatMoneyInput(''), '');
});
test('pasted grouping and currency symbols become plain digits for filtering', () => {
  for (const text of ['2 000 000', '2\u00a0000\u00a0000 đ', '2.000.000 ₫', '2,000,000']) assert.equal(moneyDigits(text), '2000000');
  assert.equal(moneyDigits('0002000'), '2000');
});
test('rejects negative, fractional, nonnumeric and unsafe prices without changing their meaning', () => {
  for (const text of ['-2000', '2.5', '2,5', '1e6', 'abc', 'Infinity', '99999999999999999999']) assert.equal(moneyDigits(text), null);
});
test('caret remains next to the edited digit when separators are inserted', () => {
  assert.equal(moneyCaretPosition('2 000 000', 7), 9);
  assert.equal(moneyCaretPosition('2 000 000', 2), 3);
  assert.equal(moneyCaretPosition('2 000 000', 0), 0);
});
