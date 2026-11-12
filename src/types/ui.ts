export type BadgeVariant = 'new' | 'sale' | 'best-seller' | 'vip';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonSize = 'md' | 'lg';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  to?: string;
}

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface ColorSwatchOption {
  name: string;
  value: string;
  hex: string;
  disabled?: boolean;
}

export interface SizeOption {
  label: string;
  value: string;
  disabled?: boolean;
}
