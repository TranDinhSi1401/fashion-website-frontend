import { CSSProperties } from 'react';
import { ColorSwatchOption } from '../../types/ui';
import { cn } from '../../utils/cn';
import styles from './ColorSwatches.module.css';

export interface ColorSwatchesProps {
  options: ColorSwatchOption[];
  value?: string;
  onChange?: (option: ColorSwatchOption) => void;
  size?: 'sm' | 'lg';
  className?: string;
}

export default function ColorSwatches({
  options,
  value,
  onChange,
  size = 'sm',
  className = '',
}: ColorSwatchesProps) {
  if (!options.length) return null;

  const sizeClass = size === 'lg' ? 'h-7 w-7' : 'h-4 w-4';

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)} role="radiogroup">
      {options.map((option) => {
        const isActive = value === option.value;
        const swatchStyle = {
          '--swatch-color': option.hex,
        } as CSSProperties;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={option.name}
            title={option.name}
            disabled={option.disabled}
            onClick={() => onChange?.(option)}
            style={swatchStyle}
            className={cn(
              'shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              sizeClass,
              styles.swatch,
              isActive && styles.active
            )}
          />
        );
      })}
    </div>
  );
}
