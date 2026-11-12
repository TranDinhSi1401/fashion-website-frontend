import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';
import styles from './Checkbox.module.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className = '', id, disabled = false, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id || props.name || generatedId;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'inline-flex items-center gap-2.5 text-base font-normal text-content-primary',
        disabled ? 'cursor-not-allowed text-content-disabled' : 'cursor-pointer',
        className
      )}
    >
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        disabled={disabled}
        className={cn(
          'h-[18px] w-[18px] shrink-0 rounded-sm border-[1.5px] border-line bg-surface-body',
          'disabled:cursor-not-allowed disabled:bg-surface-disabled',
          styles.control
        )}
        {...props}
      />
      {label && <span>{label}</span>}
    </label>
  );
});

export default Checkbox;
