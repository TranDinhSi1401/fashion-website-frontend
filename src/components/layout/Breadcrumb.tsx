import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items = [] }: BreadcrumbProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.78rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--text-muted)',
        padding: '16px 0',
      }}
      aria-label="Breadcrumb"
    >
      <Link to="/" style={{ color: 'var(--text-secondary)' }}>
        Trang Chủ
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight size={12} style={{ color: 'var(--border-default)' }} />
            {isLast || !item.to ? (
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {item.label}
              </span>
            ) : (
              <Link to={item.to} style={{ color: 'var(--text-secondary)' }}>
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

