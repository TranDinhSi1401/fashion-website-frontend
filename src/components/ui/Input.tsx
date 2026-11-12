import {
  ElementType,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
  forwardRef,
  useId,
} from 'react';
import { cn } from '../../utils/cn';
import styles from './Input.module.css';

type BaseFieldProps = {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ElementType;
  rightElement?: ReactNode;
  multiline?: boolean;
};

export type InputProps = BaseFieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> &
  Pick<TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'>;

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(function Input(
  {
    label,
    error,
    helperText,
    icon: Icon,
    rightElement,
    multiline = false,
    className = '',
    id,
    type = 'text',
    disabled = false,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const inputId = id || props.name || generatedId;

  const fieldClasses = cn(
    'w-full rounded-input border bg-surface-body text-base font-normal text-content-primary placeholder:text-content-muted',
    'focus:outline-none',
    error
      ? 'border-line-error focus:border-line-error'
      : 'border-line focus:border-line-focus',
    disabled && 'cursor-not-allowed bg-surface-disabled text-content-disabled',
    multiline ? 'min-h-[96px] py-2.5' : 'h-input',
    Icon ? 'pl-10' : 'pl-3.5',
    rightElement ? 'pr-10' : 'pr-3.5',
    styles.control
  );

  return (
    <div className={cn('flex w-full flex-col', className)}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 text-sm font-semibold text-content-primary">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <span className="pointer-events-none absolute left-3.5 flex items-center text-content-muted">
            <Icon size={18} />
          </span>
        )}

        {multiline ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            className={fieldClasses}
            {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            id={inputId}
            type={type}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            className={fieldClasses}
            {...(props as InputHTMLAttributes<HTMLInputElement>)}
          />
        )}

        {rightElement && (
          <div className="absolute right-3 flex items-center">{rightElement}</div>
        )}
      </div>

      {error ? (
        <span className="mt-1 text-xs italic text-status-error">{error}</span>
      ) : helperText ? (
        <span className="mt-1 text-xs text-content-muted">{helperText}</span>
      ) : null}
    </div>
  );
});

export default Input;
