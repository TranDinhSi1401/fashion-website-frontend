import React, { HTMLAttributes, ReactNode } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'dark';
  children: ReactNode;
}

export default function Badge({
  children,
  variant = 'default',
  className = '',
  style,
  ...props
}: BadgeProps) {
  const getStyle = (): React.CSSProperties => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: 'var(--status-success-bg)',
          color: 'var(--status-success)',
        };
      case 'error':
        return {
          backgroundColor: 'var(--status-error-bg)',
          color: 'var(--status-error)',
        };
      case 'warning':
        return {
          backgroundColor: 'var(--status-warning-bg)',
          color: 'var(--status-warning)',
        };
      case 'dark':
        return {
          backgroundColor: 'var(--bg-dark)',
          color: 'var(--text-inverse)',
        };
      case 'default':
      default:
        return {
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-light)',
        };
    }
  };

  return (
    <span
      className={`badge ${className}`}
      style={{
        ...getStyle(),
        borderRadius: 'var(--radius-sm)',
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        fontSize: '0.72rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
}

