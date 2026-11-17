import { useRef, useState, type ChangeEvent } from 'react';
import Input from './Input';
import { formatMoneyInput, moneyCaretPosition, moneyDigits } from '../../utils/moneyInput';

interface MoneyInputProps {
  id: string;
  label: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (digits: string) => void;
}

export default function MoneyInput({ id, label, name, value, defaultValue = '', onValueChange }: MoneyInputProps) {
  const [localValue, setLocalValue] = useState(defaultValue);
  const [inputError, setInputError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const raw = value === undefined ? localValue : value;
  const digits = moneyDigits(raw);
  const message = 'Nhập số tiền nguyên không âm, ví dụ 2 000 000 đ, và không vượt quá giới hạn số an toàn.';

  function change(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const next = moneyDigits(input.value);
    if (next === null) {
      input.setCustomValidity(message);
      setInputError(message);
      return;
    }
    const count = (input.value.slice(0, input.selectionStart ?? input.value.length).match(/\d/g) || []).length;
    input.setCustomValidity(''); setInputError('');
    setLocalValue(next); onValueChange?.(next);
    requestAnimationFrame(() => {
      if (document.activeElement === inputRef.current) {
        const position = moneyCaretPosition(formatMoneyInput(next), count);
        inputRef.current?.setSelectionRange(position, position);
      }
    });
  }

  return <>
    <Input ref={inputRef} id={id} label={label} type="text" inputMode="numeric" autoComplete="off"
      aria-label={`${label}, đơn vị đồng`} value={formatMoneyInput(raw)} onChange={change}
      placeholder="Ví dụ: 2 000 000" error={inputError || (digits === null ? message : undefined)}
      rightElement={<span aria-hidden="true" className="text-sm text-content-secondary">đ</span>} />
    {name && <input type="hidden" name={name} value={digits ?? raw} />}
  </>;
}
