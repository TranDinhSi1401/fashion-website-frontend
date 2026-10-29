import React, { forwardRef, InputHTMLAttributes, ElementType, ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ElementType;
  rightElement?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    helperText,
    icon: Icon,
    rightElement,
    className = '',
    id,
    type = 'text',
    style,
    ...props
  },
  ref
) {
  const inputId = id || props.name || Math.random().toString(36).substring(2, 9);

  return (
    <div className={`form-group ${className}`} style={{ width: '100%' }}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {Icon && (
          <span
            style={{
              position: 'absolute',
              left: '14px',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <Icon size={18} />
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          style={{
            paddingLeft: Icon ? '42px' : '14px',
            paddingRight: rightElement ? '42px' : '14px',
            ...style,
          }}
          className={`form-input ${error ? 'error' : ''}`}
          {...props}
        />

        {rightElement && (
          <div
            style={{
              position: 'absolute',
              right: '12px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <span className="form-error">{error}</span>
      ) : helperText ? (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
});

export default Input;

