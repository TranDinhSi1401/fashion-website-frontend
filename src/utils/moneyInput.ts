/** Integer VND input. Keep digits separate from the displayed grouping spaces. */
export function moneyDigits(value: string): string | null {
  const text = value.trim().replace(/[đ₫]$/iu, '').trim();
  if (!text) return '';
  let digits: string;
  if (/^\d[\d\s]*$/u.test(text)) digits = text.replace(/\s/g, '');
  else if (/^\d{1,3}(?:\.\d{3})+$/.test(text) || /^\d{1,3}(?:,\d{3})+$/.test(text)) digits = text.replace(/[.,]/g, '');
  else return null;
  digits = digits.replace(/^0+(?=\d)/, '');
  return Number.isSafeInteger(Number(digits)) ? digits : null;
}

export function formatMoneyInput(value: string): string {
  const digits = moneyDigits(value);
  return digits === null ? value : digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function moneyCaretPosition(formatted: string, digitCount: number) {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i]) && ++seen === digitCount) return i + 1;
  }
  return formatted.length;
}
