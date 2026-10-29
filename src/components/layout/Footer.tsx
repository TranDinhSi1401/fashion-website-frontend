import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        backgroundColor: 'var(--bg-dark)',
        color: 'var(--text-inverse)',
        marginTop: 'auto',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="container" style={{ paddingTop: '64px', paddingBottom: '48px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '40px',
            marginBottom: '48px',
          }}
        >
          {/* Col 1: Brand story */}
          <div>
            <h4
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '16px',
                color: 'var(--text-inverse)',
              }}
            >
              FASHION WEBSITE
            </h4>
            <p
              style={{
                fontSize: '0.85rem',
                lineHeight: 1.7,
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '20px',
              }}
            >
              Định hình phong cách hiện đại với những thiết kế tối giản, sắc nét và chất liệu cao cấp. Bản sắc thời trang đương đại dành cho người theo đuổi sự tinh tế.
            </p>
            <div style={{ display: 'flex', gap: '16px', color: 'rgba(255, 255, 255, 0.8)' }}>
              <a href="#instagram" style={{ color: 'inherit' }} aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
              </a>
              <a href="#facebook" style={{ color: 'inherit' }} aria-label="Facebook">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              </a>
              <a href="#youtube" style={{ color: 'inherit' }} aria-label="Youtube">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
                  <polygon points="10 15 15 12 10 9 10 15"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Col 2: Customer Service */}
          <div>
            <h5
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '16px',
                color: 'var(--text-inverse)',
              }}
            >
              Dịch Vụ Khách Hàng
            </h5>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)' }}>
              <li><a href="#help" style={{ color: 'inherit' }}>Chính sách đổi trả trong 30 ngày</a></li>
              <li><a href="#shipping" style={{ color: 'inherit' }}>Chính sách giao hàng & kiểm hàng</a></li>
              <li><a href="#size" style={{ color: 'inherit' }}>Bảng quy đổi kích cỡ chuẩn (Size Guide)</a></li>
              <li><a href="#faq" style={{ color: 'inherit' }}>Câu hỏi thường gặp (FAQ)</a></li>
            </ul>
          </div>

          {/* Col 3: About */}
          <div>
            <h5
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '16px',
                color: 'var(--text-inverse)',
              }}
            >
              Về Chúng Tôi
            </h5>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)' }}>
              <li><a href="#story" style={{ color: 'inherit' }}>Câu chuyện thương hiệu</a></li>
              <li><a href="#sustainability" style={{ color: 'inherit' }}>Phát triển bền vững</a></li>
              <li><a href="#stores" style={{ color: 'inherit' }}>Hệ thống cửa hàng trên toàn quốc</a></li>
              <li><a href="#careers" style={{ color: 'inherit' }}>Cơ hội nghề nghiệp</a></li>
            </ul>
          </div>

          {/* Col 4: Newsletter */}
          <div>
            <h5
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '16px',
                color: 'var(--text-inverse)',
              }}
            >
              Đăng Ký Nhận Bản Tin
            </h5>
            <p style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '14px' }}>
              Nhận thông báo sớm nhất về các bộ sưu tập giới hạn và ưu đãi độc quyền 15% cho đơn hàng đầu tiên.
            </p>
            <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex' }}>
              <input
                type="email"
                placeholder="Nhập email của bạn..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  borderRadius: 0,
                  outline: 'none',
                  fontSize: '0.85rem',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'white',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 0,
                }}
                aria-label="Đăng ký"
              >
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            paddingTop: '24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
            color: 'rgba(255, 255, 255, 0.5)',
            gap: '16px',
          }}
        >
          <div>
            &copy; {currentYear} FASHION WEBSITE. Tất cả quyền được bảo lưu. Powered by Spring Boot & React.
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <a href="#privacy" style={{ color: 'inherit' }}>Chính sách bảo mật</a>
            <a href="#terms" style={{ color: 'inherit' }}>Điều khoản dịch vụ</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
