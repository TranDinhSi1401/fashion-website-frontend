import { ChatMessageResponse } from '../types/realtime';

export const mergeById = (
  a: ChatMessageResponse[],
  b: ChatMessageResponse[]
): ChatMessageResponse[] => {
  const map = new Map<number, ChatMessageResponse>();
  [...(a || []), ...(b || [])].forEach((m) => {
    if (m && typeof m.id === 'number') {
      map.set(m.id, m);
    }
  });
  return [...map.values()].sort((x, y) => x.id - y.id);
};
