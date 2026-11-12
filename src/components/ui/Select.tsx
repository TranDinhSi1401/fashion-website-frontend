import { ReactNode, SelectHTMLAttributes, forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { SelectOption } from '../../types/ui';
import { cn } from '../../utils/cn';
import styles from './Select.module.css';

export type { SelectOption };

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  children?: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    error,
    helperText,
    options = [],
    className = '',
    id,
    children,
    disabled = false,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const selectId = id || props.name || generatedId;

  return (
    <div className={cn('flex w-full flex-col', className)}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 text-sm font-semibold text-content-primary">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className={cn(
            'h-10 w-full cursor-pointer rounded-input border bg-surface-body pl-3 pr-8 text-base font-normal text-content-primary',
            'hover:border-line-focus focus:border-line-focus focus:outline-none',
            error ? 'border-line-error' : 'border-line',
            disabled && 'cursor-not-allowed bg-surface-disabled text-content-disabled',
            styles.select
          )}
          {...props}
        >
          {children
            ? children
            : options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))}
        </select>

        <span className="pointer-events-none absolute right-2.5 flex items-center text-content-muted">
          <ChevronDown size={16} />
        </span>
      </div>

      {error ? (
        <span className="mt-1 text-xs italic text-status-error">{error}</span>
      ) : helperText ? (
        <span className="mt-1 text-xs text-content-muted">{helperText}</span>
      ) : null}
    </div>
  );
});

export default Select;
