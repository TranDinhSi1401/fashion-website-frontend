import { HTMLAttributes, ReactNode } from 'react';
import { BadgeVariant } from '../../types/ui';
import { cn } from '../../utils/cn';
import styles from './Badge.module.css';

export type LegacyBadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'dark';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant | LegacyBadgeVariant;
  children: ReactNode;
}

const VARIANT_CLASS_MAP: Record<NonNullable<BadgeProps['variant']>, string> = {
  new: styles.new,
  sale: styles.sale,
  'best-seller': styles.bestSeller,
  vip: styles.vip,
  default: styles.default,
  success: styles.success,
  error: styles.error,
  warning: styles.warning,
  dark: styles.dark,
};

export default function Badge({
  children,
  variant = 'new',
  className = '',
  ...props
}: BadgeProps) {
  return (
    <span className={cn(styles.badge, VARIANT_CLASS_MAP[variant], className)} {...props}>
      {children}
    </span>
  );
}
