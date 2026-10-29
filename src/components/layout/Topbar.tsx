import React from 'react';
import { Phone, Mail, ShieldCheck } from 'lucide-react';

export default function Topbar() {
  return (
    <aside
      style={{
        height: 'var(--topbar-height)',
        backgroundColor: 'var(--bg-dark)',
        color: 'var(--text-inverse)',
        fontSize: '0.75rem',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} style={{ color: 'var(--color-accent-gold)' }} />
            Chính hãng 100% & Bảo hành độc quyền
          </span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span>
            Miễn phí giao hàng cho đơn từ 500.000₫
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <a
            href="tel:19001234"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'inherit' }}
          >
            <Phone size={13} />
            <span>Hotline: 1900 1234</span>
          </a>
          <span style={{ opacity: 0.4 }}>|</span>
          <a
            href="mailto:support@fashionwebsite.com"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'inherit' }}
          >
            <Mail size={13} />
            <span>Hỗ trợ</span>
          </a>
        </div>
      </div>
    </aside>
  );
}

