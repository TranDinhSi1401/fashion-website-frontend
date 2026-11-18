import test from 'node:test';
import assert from 'node:assert/strict';
import { isOrderEligibleForReview, REVIEW_WINDOW_MS } from '../src/utils/reviewHelpers.ts';

test('isOrderEligibleForReview enforces DELIVERED + PAID + 14-day window', () => {
  const deliveredIso = '2026-11-01T10:00:00';
  const deliveredMs = new Date(deliveredIso).getTime();

  // Hợp lệ: DELIVERED + PAID + trong 5 ngày
  assert.equal(
    isOrderEligibleForReview(
      { orderStatus: 'DELIVERED', paymentStatus: 'PAID', deliveredAt: deliveredIso },
      deliveredMs + 5 * 24 * 60 * 60 * 1000
    ),
    true
  );

  // Hợp lệ đúng mốc 14 ngày (14 * 24 giờ)
  assert.equal(
    isOrderEligibleForReview(
      { orderStatus: 'DELIVERED', paymentStatus: 'PAID', deliveredAt: deliveredIso },
      deliveredMs + REVIEW_WINDOW_MS
    ),
    true
  );

  // Quá hạn 14 ngày (+1ms) -> false (ẩn phần đánh giá)
  assert.equal(
    isOrderEligibleForReview(
      { orderStatus: 'DELIVERED', paymentStatus: 'PAID', deliveredAt: deliveredIso },
      deliveredMs + REVIEW_WINDOW_MS + 1
    ),
    false
  );

  // Chưa thanh toán (PENDING_COD / PENDING) -> false
  assert.equal(
    isOrderEligibleForReview(
      { orderStatus: 'DELIVERED', paymentStatus: 'PENDING_COD', deliveredAt: deliveredIso },
      deliveredMs + 1000
    ),
    false
  );

  // Chưa giao (SHIPPING / PROCESSING) -> false
  assert.equal(
    isOrderEligibleForReview(
      { orderStatus: 'SHIPPING', paymentStatus: 'PAID', deliveredAt: deliveredIso },
      deliveredMs + 1000
    ),
    false
  );

  // Thiếu deliveredAt hoặc ở tương lai -> false
  assert.equal(
    isOrderEligibleForReview(
      { orderStatus: 'DELIVERED', paymentStatus: 'PAID', deliveredAt: null },
      deliveredMs + 1000
    ),
    false
  );
  assert.equal(
    isOrderEligibleForReview(
      { orderStatus: 'DELIVERED', paymentStatus: 'PAID', deliveredAt: deliveredIso },
      deliveredMs - 1000
    ),
    false
  );
});
