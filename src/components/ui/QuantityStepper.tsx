import { useId, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';
import styles from './QuantityStepper.module.css';

export interface QuantityStepperProps {
  value?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  label?: string;
  onChange: (value: number) => void;
  onValidationChange?: (message: string) => void;
  className?: string;
}

export default function QuantityStepper({
  value = 1,
  min = 1,
  max = 99,
  disabled = false,
  label = 'Số lượng',
  onChange,
  onValidationChange,
  className = '',
}: QuantityStepperProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState('');
  const errorId = useId();

  const validate = (raw: string): string => {
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
      return 'Vui lòng nhập số lượng là số nguyên.';
    }
    if (Number(raw) < min) {
      return `Số lượng tối thiểu là ${min}.`;
    }
    if (Number(raw) > max) {
      return `Chỉ còn ${max} sản phẩm. Số lượng chưa được cập nhật, vui lòng nhập lại.`;
    }
    return '';
  };

  const showError = (message: string) => {
    setError(message);
    onValidationChange?.(message);
  };

  const clamp = (quantity: number) => Math.max(min, Math.min(max, quantity));

  const commit = (raw: string) => {
    const message = validate(raw);
    showError(message);
    if (message) {
      setDraft(raw);
      return;
    }
    setDraft(null);
    const quantity = Number(raw);
    if (Number.isSafeInteger(quantity) && clamp(quantity) !== value) {
      onChange(clamp(quantity));
    }
  };

  const isDecreaseDisabled = disabled || value <= min;
  const isIncreaseDisabled = disabled || value >= max;

  return (
    <div className={cn('inline-flex max-w-full flex-col items-start gap-2', className)}>
      <div className="quantity-stepper inline-flex h-[42px] w-[126px] items-center rounded-input border border-line bg-surface-body">
        <button
          type="button"
          aria-label={`Giảm ${label.toLowerCase()}`}
          disabled={isDecreaseDisabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setDraft(null);
            showError('');
            onChange(clamp(value - 1));
          }}
          className={cn(
            'grid h-full w-[38px] place-items-center border-r border-line-light text-content-primary',
            'hover:bg-surface disabled:cursor-not-allowed disabled:text-content-disabled disabled:hover:bg-transparent',
            styles.stepButton
          )}
        >
          <Minus size={14} />
        </button>

        <input
          type="number"
          inputMode="numeric"
          step="1"
          min={min}
          max={max}
          aria-label={label}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          value={disabled || draft === null ? value : draft}
          disabled={disabled}
          onChange={(event) => {
            setDraft(event.target.value);
            showError(event.target.value === '' ? '' : validate(event.target.value));
          }}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          className={cn(
            'h-full w-[50px] border-0 bg-transparent text-center text-base font-semibold text-content-primary focus:outline-none',
            'disabled:cursor-not-allowed disabled:text-content-disabled',
            styles.input
          )}
        />

        <button
          type="button"
          aria-label={`Tăng ${label.toLowerCase()}`}
          disabled={isIncreaseDisabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setDraft(null);
            showError('');
            onChange(clamp(value + 1));
          }}
          className={cn(
            'grid h-full w-[38px] place-items-center border-l border-line-light text-content-primary',
            'hover:bg-surface disabled:cursor-not-allowed disabled:text-content-disabled disabled:hover:bg-transparent',
            styles.stepButton
          )}
        >
          <Plus size={14} />
        </button>
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-xs italic leading-normal text-status-error">
          {error}
        </p>
      )}
    </div>
  );
}
