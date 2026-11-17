import { useState } from 'react';
import { Input, Select } from '../ui';

export default function ProductAttributeSelect({ label, value, options, onChange, maxLength = 50 }: {
  label: string; value: string; options: string[]; onChange: (value: string) => void; maxLength?: number;
}) {
  const [custom, setCustom] = useState(false);
  const key = (v: string) => label === 'Size' ? v.trim().toUpperCase().replace(/^2XL$/, 'XXL') : v.trim().toLocaleLowerCase('vi');
  const standard = options.find(option => key(option) === key(value));
  const isCustom = custom || Boolean(value && !standard);
  return <div className="space-y-2">
    <Select label={label} value={isCustom ? '__custom__' : standard || ''} required
      options={[{ value: '', label: `Chọn ${label.toLocaleLowerCase('vi')}` }, ...options.map(v => ({ value: v, label: v })), { value: '__custom__', label: '+ Nhập giá trị khác' }]}
      onChange={e => { const next = e.target.value; setCustom(next === '__custom__'); onChange(next === '__custom__' ? '' : next); }} />
    {isCustom && <Input label={`${label} khác`} required maxLength={maxLength} value={value} onChange={e => onChange(e.target.value)} placeholder={`Nhập ${label.toLocaleLowerCase('vi')}`} />}
  </div>;
}
