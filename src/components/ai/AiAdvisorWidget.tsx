import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, RefreshCw, ChevronDown } from 'lucide-react';
import { aiService } from '../../services/aiService';
import { ChatMessage } from '../../types/ai';
import { useAuth } from '../../context/AuthContext';

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
    } catch (err: any) {
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
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '88px',
            right: '24px',
            zIndex: 998,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#111111',
            color: '#FFFFFF',
            border: '1px solid #C5A059',
            padding: '12px 20px',
            borderRadius: '9999px',
            boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.backgroundColor = '#1c1c1f';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.backgroundColor = '#111111';
          }}
          aria-label="Tư vấn thời trang AI"
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#C5A059',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}
          >
            <Sparkles size={16} />
          </div>
          <span style={{ fontSize: '0.84rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            AI Stylist Tư Vấn
          </span>
        </button>
      )}

      {/* Hộp Chat AI Styling Modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '400px',
            maxWidth: 'calc(100vw - 32px)',
            height: '580px',
            maxHeight: 'calc(100vh - 48px)',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
            border: '1px solid #E5E5E5',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: '#111111',
              color: '#FFFFFF',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '2px solid #C5A059'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#C5A059',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Sparkles size={18} color="#FFFFFF" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                  AI STYLIST TƯ VẤN
                </h4>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#C5A059' }}>
                  {isAuthenticated ? 'Đã kích hoạt Ma trận sở thích của bạn' : 'Tư vấn thời trang thông minh'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#CCCCCC',
                cursor: 'pointer',
                padding: '4px'
              }}
              aria-label="Đóng chat"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              backgroundColor: '#FAFAFA'
            }}
          >
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%'
                }}
              >
                {msg.sender === 'ai' && (
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: '#111111',
                      color: '#C5A059',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}
                  >
                    <Bot size={16} />
                  </div>
                )}

                <div
                  style={{
                    backgroundColor: msg.sender === 'user' ? '#111111' : '#FFFFFF',
                    color: msg.sender === 'user' ? '#FFFFFF' : '#111111',
                    padding: '10px 14px',
                    borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    fontSize: '0.84rem',
                    lineHeight: '1.5',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    border: msg.sender === 'ai' ? '1px solid #EAEAEA' : 'none',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#111111',
                    color: '#C5A059',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Bot size={16} />
                </div>
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: '1px solid #EAEAEA',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#777777',
                    fontSize: '0.82rem'
                  }}
                >
                  <RefreshCw size={14} className="spin-animation" style={{ animation: 'spin 1.5s linear infinite' }} />
                  <span>AI đang phân tích sở thích & soạn tư vấn...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts (Gợi ý câu hỏi) */}
          {messages.length <= 2 && (
            <div
              style={{
                padding: '8px 16px',
                backgroundColor: '#FFFFFF',
                borderTop: '1px solid #F0F0F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#888888', textTransform: 'uppercase' }}>
                Gợi ý câu hỏi nhanh:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {SUGGESTED_PROMPTS.slice(0, 2).map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt)}
                    style={{
                      textAlign: 'left',
                      padding: '6px 10px',
                      backgroundColor: '#F5F5F7',
                      border: '1px solid #E5E5E5',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      color: '#333333',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#EEEEF2')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#F5F5F7')}
                  >
                    💡 {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Box */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#FFFFFF',
              borderTop: '1px solid #EBEBEB',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <input
              type="text"
              placeholder="Nhập câu hỏi bạn muốn AI tư vấn..."
              value={inputQuestion}
              onChange={e => setInputQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #CCCCCC',
                fontSize: '0.84rem',
                outline: 'none',
                backgroundColor: '#FAFAFA'
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !inputQuestion.trim()}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: inputQuestion.trim() && !isLoading ? '#C5A059' : '#CCCCCC',
                color: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputQuestion.trim() && !isLoading ? 'pointer' : 'default',
                transition: 'background-color 0.2s'
              }}
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

