// src/types/ai.ts

export interface AiAdviseRequest {
  question: string;
}

export interface AiAdviseResponse {
  answer: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

