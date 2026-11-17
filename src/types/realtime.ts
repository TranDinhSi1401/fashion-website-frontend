export type NotificationType = 'ORDER_STATUS' | 'RETURN_REQUEST' | 'PROMOTION' | 'SYSTEM';

export type ChatRole = 'CUSTOMER' | 'ADMIN';

export type WsConnectionStatus = 'CONNECTED' | 'DISCONNECTED';

export interface NotificationResponse {
  id: number;
  type: NotificationType;
  title: string;
  content: string;
  referenceId?: number | null;
  seen: boolean;
  createdAt: string;
}

export interface NotificationPageResponse {
  content: NotificationResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface ChatMessageResponse {
  id: number;
  customerUsername: string;
  senderUsername: string;
  senderRole: ChatRole;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
}

export interface StockUpdateResponse {
  productId: number;
  variantId: number;
  stock: number;
}

export interface WsErrorResponse {
  message: string;
}
