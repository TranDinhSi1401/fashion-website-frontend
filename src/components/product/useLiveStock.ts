import { useCallback, useState } from 'react';
import { useStompSubscription } from '../../ws/useStompSubscription';
import { StockUpdateResponse } from '../../types/realtime';

/**
 * Trả về map variantId -> tồn kho mới nhất từ server qua WebSocket STOMP (/topic/products/{productId}/stock)
 */
export function useLiveStock(productId?: number | null): Record<number, number> {
  const [stocks, setStocks] = useState<Record<number, number>>({});

  useStompSubscription<StockUpdateResponse>(
    productId ? `/topic/products/${productId}/stock` : null,
    useCallback((d: StockUpdateResponse) => {
      if (d && typeof d.variantId === 'number' && typeof d.stock === 'number') {
        setStocks((p) => ({ ...p, [d.variantId]: d.stock }));
      }
    }, []),
    Boolean(productId)
  );

  return stocks;
}
