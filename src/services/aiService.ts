import apiClient from './apiClient';
import { AiAdviseRequest, AiAdviseResponse } from '../types/ai';

export const aiService = {
  /**
   * Hỏi AI Tư Vấn Thời Trang (Google Gemini qua Spring AI)
   * Tự động đính kèm Header Authorization: Bearer <token>
   * Backend tự động trích xuất hồ sơ sở thích từ Feature Store
   */
  async advise(question: string): Promise<string> {
    const res = await apiClient.post<AiAdviseResponse>('/ai/advise', { question } as AiAdviseRequest);
    return res.data?.answer || '';
  },

  /**
   * Tư vấn dạng Streaming (SSE Server-Sent Events)
   */
  async adviseStream(
    question: string,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const token = localStorage.getItem('fashion_access_token');
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

    const response = await fetch(`${baseUrl}/ai/advise-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ question }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`AI Streaming thất bại (Mã lỗi: ${response.status})`);
    }

    if (!response.body) {
      return '';
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      onChunk(chunk);
    }

    return fullText;
  },
};

