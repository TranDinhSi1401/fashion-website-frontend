import { ButtonHTMLAttributes, ElementType } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ElementType;
}

const SIZE_CLASSES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-4 text-xs',
  md: 'h-btn px-6 text-base',
  lg: 'h-btn-lg px-8 text-base',
};

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
  const isGhost = variant === 'ghost';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      style={style}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-btn font-semibold uppercase tracking-wide',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        !isGhost && SIZE_CLASSES[size],
        styles.button,
        styles[variant],
        className
      )}
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
