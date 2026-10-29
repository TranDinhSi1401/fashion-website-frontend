import { test } from 'node:test';
import assert from 'node:assert/strict';
import { availableVariants, findVariant, quantityWithinStock } from '../src/utils/variants.ts';

const variants = [
  {id:71,color:'Đen',size:'M',stockQuantity:3,isActive:true},
  {id:72,color:'Trắng',size:'L',stockQuantity:5,isActive:true},
  {id:73,color:'Đen',size:'XL',stockQuantity:0,isActive:true},
  {id:74,color:'Đen',size:'S',stockQuantity:5,isActive:false},
  {id:75,color:'Đen',size:'XXL',stockQuantity:2,isActive:true},
];
test('color and size select the same available variant, including XXL alias', () => {
  assert.equal(findVariant(variants,'Đen','M')?.id,71);
  assert.equal(findVariant(variants,'Đen','L'),undefined);
  assert.equal(findVariant(variants,'Đen','XL'),undefined);
  assert.equal(findVariant(variants,'Đen','S'),undefined);
  assert.equal(findVariant(variants,'Đen','2XL')?.id,75);
  assert.equal(availableVariants(variants).length,3);
});
test('quantity stays integer and within remaining inventory', () => {
  assert.equal(quantityWithinStock(99,3),3);
  assert.equal(quantityWithinStock(0,3),1);
  assert.equal(quantityWithinStock(2.9,3),2);
  assert.equal(quantityWithinStock(1,0),0);
  assert.equal(quantityWithinStock(NaN,3),1);
});
