import { useEffect, useRef } from 'react';
import { stompService } from './stompService';

export function useStompSubscription<T = any>(
  destination: string | null | undefined,
  handler: (body: T) => void,
  enabled = true
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled || !destination) return undefined;
    return stompService.subscribe<T>(destination, (body) => handlerRef.current(body));
  }, [destination, enabled]);
}
