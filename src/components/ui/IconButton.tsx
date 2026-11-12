import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';
import styles from './IconButton.module.css';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  badgeCount?: number;
  badgeVariant?: 'primary' | 'accent';
}

export default function IconButton({
  icon,
  badgeCount,
  badgeVariant = 'primary',
  type = 'button',
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'relative inline-flex h-10 w-10 items-center justify-center rounded-full text-content-primary',
        'hover:bg-surface disabled:cursor-not-allowed disabled:text-content-disabled',
        styles.iconButton,
        className
      )}
      {...props}
    >
      <span className={cn('inline-flex h-5 w-5 items-center justify-center', styles.icon)}>
        {icon}
      </span>
      {typeof badgeCount === 'number' && badgeCount > 0 && (
        <span
          className={cn(
            'absolute right-0.5 top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-content-inverse',
            badgeVariant === 'accent' ? 'bg-accent-red' : 'bg-primary'
          )}
        >
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </button>
  );
}
