import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestAuthorization } from '../src/utils/requestAuth.ts';

test('management product paging sends bearer authentication instead of being treated as anonymous catalog', () => {
  assert.deepEqual(requestAuthorization('/products/paged?page=0&pageSize=10', 'session-token'), { Authorization: 'Bearer session-token' });
});
test('signed-in catalog and product detail requests preserve the manager identity', () => {
  for (const url of ['/products', '/products/new', '/products/5', '/categories', '/users/info', '/products/images/upload']) {
    assert.deepEqual(requestAuthorization(url, 'session-token'), { Authorization: 'Bearer session-token' });
  }
});
test('anonymous browsing does not invent an authorization header', () => {
  assert.deepEqual(requestAuthorization('/products', null), {});
});
test('login, refresh and other auth endpoints omit bearer headers', () => {
  for (const url of ['/auth/login', '/auth/refresh', '/auth/google', 'http://localhost:8080/api/v1/auth/logout']) {
    assert.deepEqual(requestAuthorization(url, 'session-token'), {});
  }
});
test('auth text in catalog query does not strip the bearer header', () => {
  assert.deepEqual(requestAuthorization('/products?keyword=/auth/login', 'session-token'), { Authorization: 'Bearer session-token' });
});
