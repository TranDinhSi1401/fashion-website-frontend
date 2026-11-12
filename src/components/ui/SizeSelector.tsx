import { SizeOption } from '../../types/ui';
import { cn } from '../../utils/cn';
import styles from './SizeSelector.module.css';

export interface SizeSelectorProps {
  options: SizeOption[];
  value?: string;
  onChange?: (option: SizeOption) => void;
  className?: string;
}

export default function SizeSelector({
  options,
  value,
  onChange,
  className = '',
}: SizeSelectorProps) {
  if (!options.length) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)} role="radiogroup">
      {options.map((option) => {
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={option.disabled}
            onClick={() => onChange?.(option)}
            className={cn(
              'inline-flex h-[38px] min-w-[44px] items-center justify-center rounded-sm border px-3 text-sm uppercase',
              styles.option,
              option.disabled
                ? cn('cursor-not-allowed border-line bg-surface font-medium text-content-disabled', styles.disabled)
                : isActive
                  ? 'border-primary bg-primary font-semibold text-content-inverse'
                  : 'border-line bg-surface-body font-medium text-content-primary hover:border-primary'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
