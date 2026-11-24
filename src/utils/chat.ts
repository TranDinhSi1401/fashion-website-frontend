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
  return [...map.values()].sort((x, y) => {
    const timeA = x.createdAt ? new Date(x.createdAt).getTime() : 0;
    const timeB = y.createdAt ? new Date(y.createdAt).getTime() : 0;
    if (timeA !== timeB && !Number.isNaN(timeA) && !Number.isNaN(timeB)) {
      return timeA - timeB;
    }
    return x.id - y.id;
  });
};
