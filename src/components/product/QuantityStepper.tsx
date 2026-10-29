import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';

export interface QuantityStepperProps {
  value?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  label?: string;
  onChange: (value: number) => void;
}

export default function QuantityStepper({ value = 1, min = 1, max = 99, disabled = false, label = 'Số lượng', onChange }: QuantityStepperProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (quantity: number) => Math.max(min, Math.min(max, quantity));
  const commit = (raw: string) => {
    setDraft(null);
    if (!/^\d+$/.test(raw)) return;
    const quantity = Number(raw);
    if (Number.isSafeInteger(quantity) && clamp(quantity) !== value) onChange(clamp(quantity));
  };
  return <div className="quantity-stepper" style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-input)', height: '44px', backgroundColor: 'var(--bg-body)' }}>
    <button type="button" aria-label={`Giảm ${label.toLowerCase()}`} disabled={disabled || value <= min}
      onMouseDown={event => event.preventDefault()} onClick={() => { setDraft(null); onChange(clamp(value - 1)); }}
      style={{ width: '38px', height: '100%', display: 'grid', placeItems: 'center', borderRight: '1px solid var(--border-light)', opacity: disabled || value <= min ? .4 : 1 }}><Minus size={14} /></button>
    <input type="number" inputMode="numeric" step="1" min={min} max={max} aria-label={label}
      value={disabled || draft === null ? value : draft} disabled={disabled}
      onChange={event => setDraft(event.target.value)} onBlur={event => commit(event.target.value)}
      onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }}
      style={{ width: '50px', height: '100%', textAlign: 'center', border: 0, background: 'transparent', color: 'var(--text-primary)', fontWeight: 600 }} />
    <button type="button" aria-label={`Tăng ${label.toLowerCase()}`} disabled={disabled || value >= max}
      onMouseDown={event => event.preventDefault()} onClick={() => { setDraft(null); onChange(clamp(value + 1)); }}
      style={{ width: '38px', height: '100%', display: 'grid', placeItems: 'center', borderLeft: '1px solid var(--border-light)', opacity: disabled || value >= max ? .4 : 1 }}><Plus size={14} /></button>
  </div>;
}
