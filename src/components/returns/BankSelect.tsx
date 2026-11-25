/**
 * Component chọn ngân hàng dạng dropdown có logo nhận diện và ô tìm kiếm nhanh trong danh sách.
 * Không cho phép nhập tự do tên ngân hàng ngoài danh sách gợi ý để tránh sai lệch khi đối soát VietQR.
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, X, Building2 } from 'lucide-react';
import { VIETNAM_BANKS, findBankByName, type BankOption } from '../../constants/banks';
import { cn } from '../../utils/cn';

export interface BankSelectProps {
  label?: string;
  value: string;
  onChange: (bankShortName: string) => void;
  placeholder?: string;
  required?: boolean;
  allowClear?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

function BankLogo({ bank }: { bank: BankOption }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return (
      <span
        className="inline-flex h-6 w-10 shrink-0 items-center justify-center rounded-sm text-[10px] font-bold text-white tracking-tight"
        style={{ backgroundColor: bank.brandColor }}
      >
        {bank.code}
      </span>
    );
  }

  return (
    <span className="inline-flex h-6 w-10 shrink-0 items-center justify-center rounded-sm border border-line-light bg-white p-0.5 overflow-hidden">
      <img
        src={bank.logoUrl}
        alt={bank.shortName}
        onError={() => setImgFailed(true)}
        className="h-full w-full object-contain"
      />
    </span>
  );
}

export default function BankSelect({
  label,
  value,
  onChange,
  placeholder = 'Chọn ngân hàng nhận tiền',
  required = false,
  allowClear = false,
  disabled = false,
  error,
  className = '',
}: BankSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedBank = findBankByName(value);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      return;
    }
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 30);

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredBanks = VIETNAM_BANKS.filter((bank) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      bank.shortName.toLowerCase().includes(q) ||
      bank.code.toLowerCase().includes(q) ||
      bank.fullName.toLowerCase().includes(q)
    );
  });

  const handleSelect = (bank: BankOption) => {
    onChange(bank.shortName);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {label && (
        <label className="mb-1.5 block text-sm font-semibold text-content-primary">
          {label} {required && <span className="text-accent-red">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-input border bg-surface-body px-3 text-left text-sm transition-colors focus:border-line-focus focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-disabled',
            error ? 'border-line-error' : 'border-line'
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2.5">
            {selectedBank ? (
              <>
                <BankLogo bank={selectedBank} />
                <span className="truncate font-medium text-content-primary">
                  {selectedBank.shortName}
                </span>
              </>
            ) : value ? (
              <>
                <Building2 size={16} className="shrink-0 text-content-muted" />
                <span className="truncate font-medium text-content-primary">{value}</span>
              </>
            ) : (
              <span className="truncate text-content-muted">{placeholder}</span>
            )}
          </span>

          <span className="flex shrink-0 items-center gap-1">
            {allowClear && value && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Xóa ngân hàng đã chọn"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                className="rounded-sm p-0.5 text-content-muted hover:text-content-primary"
              >
                <X size={14} />
              </span>
            )}
            <ChevronDown
              size={16}
              className={cn(
                'text-content-muted transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </span>
        </button>

        {isOpen && !disabled && (
          <div className="absolute left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-sm border border-line bg-surface-body shadow-dropdown">
            <div className="border-b border-line-light p-2">
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm nhanh ngân hàng (VCB, MB, ACB...)"
                  className="h-8 w-full rounded-sm border border-line-light bg-surface pl-8 pr-2.5 text-xs text-content-primary placeholder:text-content-muted focus:border-line-focus focus:outline-none"
                />
              </div>
            </div>

            <ul className="max-h-60 overflow-y-auto py-1">
              {filteredBanks.length === 0 ? (
                <li className="px-3 py-4 text-center text-xs text-content-muted">
                  Không tìm thấy ngân hàng phù hợp
                </li>
              ) : (
                filteredBanks.map((bank) => {
                  const isSelected = selectedBank?.code === bank.code;
                  return (
                    <li key={bank.code}>
                      <button
                        type="button"
                        onClick={() => handleSelect(bank)}
                        className={cn(
                          'flex w-full items-center justify-between gap-2.5 px-3 py-2 text-left transition-colors hover:bg-surface',
                          isSelected && 'bg-surface font-semibold'
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <BankLogo bank={bank} />
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold text-content-primary">
                              {bank.shortName}
                            </div>
                            <div className="truncate text-[11px] text-content-muted">
                              {bank.fullName}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check size={14} className="shrink-0 text-primary" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-xs italic text-status-error">{error}</p>}
    </div>
  );
}
