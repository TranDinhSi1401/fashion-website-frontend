import { FormEvent, useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { cn } from '../../utils/cn';

export interface SearchInputProps {
  value?: string;
  placeholder?: string;
  debounceMs?: number;
  onSearch?: (query: string) => void;
  onDebouncedChange?: (query: string) => void;
  className?: string;
}

export default function SearchInput({
  value = '',
  placeholder = 'Tìm kiếm sản phẩm...',
  debounceMs = 300,
  onSearch,
  onDebouncedChange,
  className = '',
}: SearchInputProps) {
  const [query, setQuery] = useState<string>(value);
  const [prevValue, setPrevValue] = useState<string>(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(value);
  }

  const debouncedQuery = useDebounce<string>(query, debounceMs);

  useEffect(() => {
    onDebouncedChange?.(debouncedQuery);
  }, [debouncedQuery, onDebouncedChange]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch?.(query.trim());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'relative flex h-[38px] w-[220px] items-center rounded-input border border-transparent bg-surface transition-all duration-200',
        'hover:border-line focus-within:w-[280px] focus-within:border-line-focus focus-within:bg-surface-body',
        className
      )}
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-full w-full bg-transparent pl-3.5 pr-9 text-sm font-normal text-content-primary placeholder:text-content-muted focus:outline-none"
      />
      {query ? (
        <button
          type="button"
          onClick={() => {
            setQuery('');
            onSearch?.('');
          }}
          aria-label="Xóa từ khóa"
          className="absolute right-2.5 flex items-center text-content-muted hover:text-content-primary"
        >
          <X size={15} />
        </button>
      ) : (
        <button
          type="submit"
          aria-label="Tìm kiếm"
          className="absolute right-2.5 flex items-center text-content-secondary hover:text-content-primary"
        >
          <Search size={16} />
        </button>
      )}
    </form>
  );
}
