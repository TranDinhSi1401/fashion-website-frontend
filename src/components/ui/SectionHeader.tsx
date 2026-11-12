import { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import styles from './SectionHeader.module.css';

export interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

export default function SectionHeader({
  title,
  action,
  align = 'center',
  className = '',
}: SectionHeaderProps) {
  const isCentered = align === 'center' && !action;

  return (
    <div
      className={cn(
        'mb-8 flex items-end justify-between gap-4',
        isCentered && 'flex-col items-center text-center',
        className
      )}
    >
      <div className={cn('flex flex-col gap-2.5', isCentered && 'items-center')}>
        <h2 className="text-xl font-bold uppercase tracking-wider text-content-primary">
          {title}
        </h2>
        <span className={styles.divider} aria-hidden="true" />
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
