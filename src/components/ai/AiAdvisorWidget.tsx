import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, RefreshCw } from 'lucide-react';
import { aiService } from '../../services/aiService';
import { ChatMessage } from '../../types/ai';
import { useAuth } from '../../context/AuthContext';
import styles from './AiAdvisorWidget.module.css';

const SUGGESTED_PROMPTS = [
  'Tư vấn cho tôi một set đồ công sở lịch sự theo gu của tôi?',
  'Gợi ý trang phục đi hẹn hò / tiệc tối cuối tuần?',
  'Dựa trên sở thích của tôi, tôi hợp với tông màu và phom dáng nào?',
  'Phối đồ với Áo sơ mi và Quần tây sao cho trẻ trung?'
];

export default function AiAdvisorWidget() {
  const { isAuthenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: isAuthenticated
        ? `Xin chào ${user?.fullname || 'bạn'}! Tôi là Trợ Lý Thời Trang AI của Fashion Website. Tôi đã đồng bộ Ma trận sở thích và gu thời trang của bạn từ hệ thống. Bạn cần tôi tư vấn set đồ hoặc phong cách nào hôm nay?`
        : 'Xin chào bạn! Tôi là Trợ Lý Thời Trang AI. Hãy cho tôi biết nhu cầu hoặc sự kiện sắp tới để tôi gợi ý trang phục hoàn hảo nhất cho bạn nhé!',
      timestamp: new Date()
    }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (questionToSend?: string) => {
    const text = (questionToSend || inputQuestion).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!questionToSend) setInputQuestion('');
    setIsLoading(true);

    try {
      const answer = await aiService.advise(text);
      const aiMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: answer || 'Rất tiếc, tôi chưa có câu trả lời phù hợp lúc này. Bạn thử hỏi câu khác nhé!',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: 'Xin lỗi bạn, kết nối tới dịch vụ AI đang bận. Vui lòng thử lại sau ít giây.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Nút bấm mở Floating AI Stylist */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={styles.launcherBtn}
          aria-label="Tư vấn thời trang AI"
        >
          <div className="w-7 h-7 rounded-full bg-accent-gold flex items-center justify-center text-content-inverse shrink-0">
            <Sparkles size={16} />
          </div>
          <span className={styles.launcherText}>
            AI Stylist Tư Vấn
          </span>
        </button>
      )}

      {/* Hộp Chat AI Styling Modal */}
      {isOpen && (
        <div className={styles.widgetShell}>
          {/* Header */}
          <div className="bg-primary text-content-inverse px-5 py-4 flex items-center justify-between border-b-2 border-accent-gold">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-accent-gold flex items-center justify-center text-content-inverse">
                <Sparkles size={18} />
              </div>
              <div>
                <h4 className="m-0 text-[0.92rem] font-extrabold tracking-[0.04em]">
                  AI STYLIST TƯ VẤN
                </h4>
                <p className="m-0 text-[0.72rem] text-accent-gold">
                  {isAuthenticated ? 'Đã kích hoạt Ma trận sở thích của bạn' : 'Tư vấn thời trang thông minh'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="bg-transparent border-0 text-content-muted hover:text-content-inverse cursor-pointer p-1 transition-colors"
              aria-label="Đóng chat"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 bg-surface-elevated">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={
                  msg.sender === 'user'
                    ? 'flex gap-2 self-end max-w-[85%]'
                    : 'flex gap-2 self-start max-w-[85%]'
                }
              >
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-primary text-accent-gold flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={16} />
                  </div>
                )}

                <div className={msg.sender === 'user' ? styles.userBubble : styles.aiBubble}>
                  {msg.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 self-start">
                <div className="w-7 h-7 rounded-full bg-primary text-accent-gold flex items-center justify-center shrink-0">
                  <Bot size={16} />
                </div>
                <div className="bg-surface-body px-4 py-2.5 rounded-modal border border-line-light flex items-center gap-1.5 text-content-secondary text-[0.82rem]">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>AI đang phân tích sở thích &amp; soạn tư vấn...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts (Gợi ý câu hỏi) */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 bg-surface-body border-t border-line-light flex flex-col gap-1.5">
              <span className="text-[0.7rem] font-bold text-content-muted uppercase">
                Gợi ý câu hỏi nhanh:
              </span>
              <div className="flex flex-col gap-1">
                {SUGGESTED_PROMPTS.slice(0, 2).map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className={styles.suggestedBtn}
                  >
                    💡 {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Box */}
          <div className="px-4 py-3 bg-surface-body border-t border-line-light flex items-center gap-2">
            <input
              type="text"
              placeholder="Nhập câu hỏi bạn muốn AI tư vấn..."
              value={inputQuestion}
              onChange={e => setInputQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className={styles.chatInput}
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={isLoading || !inputQuestion.trim()}
              className={styles.sendBtn}
              aria-label="Gửi câu hỏi"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
