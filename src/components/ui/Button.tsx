import React, { ButtonHTMLAttributes, ElementType } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ElementType;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  icon: Icon,
  style,
  ...props
}: ButtonProps) {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-primary)',
          border: '1px solid var(--color-primary)',
        };
      case 'danger':
        return {
          backgroundColor: 'var(--status-error)',
          color: 'var(--text-inverse)',
          border: '1px solid var(--status-error)',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-primary)',
          border: '1px solid transparent',
        };
      case 'primary':
      default:
        return {
          backgroundColor: 'var(--color-primary)',
          color: 'var(--text-inverse)',
          border: '1px solid var(--color-primary)',
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return { padding: '8px 16px', fontSize: '0.78rem' };
      case 'lg':
        return { padding: '16px 32px', fontSize: '0.95rem' };
      case 'md':
      default:
        return { padding: '12px 24px', fontSize: '0.85rem' };
    }
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      style={{
        ...getVariantStyles(),
        ...getSizeStyles(),
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: 600,
        borderRadius: 'var(--radius-btn)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all var(--transition-fast)',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
      className={`btn-editorial ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          <span>Đang xử lý...</span>
        </>
      ) : (
        <>
          {Icon && <Icon size={16} />}
          {children}
        </>
      )}
    </button>
  );
}

