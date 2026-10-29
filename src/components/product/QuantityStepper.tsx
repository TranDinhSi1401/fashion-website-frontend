import React from 'react';
import { Minus, Plus } from 'lucide-react';

export interface QuantityStepperProps {
  value?: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export default function QuantityStepper({
  value = 1,
  min = 1,
  max = 99,
  onChange,
}: QuantityStepperProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      onChange(min);
    } else {
      onChange(Math.max(min, Math.min(max, val)));
    }
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-input)',
        height: '44px',
        backgroundColor: 'var(--bg-body)',
      }}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        style={{
          width: '40px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: value <= min ? 'var(--text-muted)' : 'var(--text-primary)',
          cursor: value <= min ? 'not-allowed' : 'pointer',
          borderRight: '1px solid var(--border-light)',
        }}
        aria-label="Giảm số lượng"
      >
        <Minus size={14} />
      </button>

      <input
        type="number"
        value={value}
        onChange={handleInputChange}
        min={min}
        max={max}
        style={{
          width: '50px',
          textAlign: 'center',
          border: 'none',
          outline: 'none',
          fontSize: '0.9rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}
      />

      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        style={{
          width: '40px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: value >= max ? 'var(--text-muted)' : 'var(--text-primary)',
          cursor: value >= max ? 'not-allowed' : 'pointer',
          borderLeft: '1px solid var(--border-light)',
        }}
        aria-label="Tăng số lượng"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

