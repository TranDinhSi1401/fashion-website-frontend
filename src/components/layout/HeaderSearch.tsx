import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingBag, X } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { productService } from '../../services/productService';
import { ProductResponse } from '../../types/product';
import { extractProductImage, formatCurrencyVND } from '../../utils/format';
import styles from './HeaderSearch.module.css';

const RECENT_SEARCHES_KEY = 'fashionweb.recent-searches';
const MAX_RECENT_SEARCHES = 5;

interface HeaderSearchProps {
  value: string;
  placeholder?: string;
  onSearch: (query: string) => void;
  onProductSelect?: () => void;
  className?: string;
}

function readRecentSearches(): string[] {
  try {
    const stored = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    const searches: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(searches)
      ? searches.filter((item): item is string => typeof item === 'string').slice(0, MAX_RECENT_SEARCHES)
      : [];
  } catch (error) {
    console.warn('Could not read recent searches:', error);
    return [];
  }
}

function saveRecentSearch(query: string): void {
  try {
    const recent = readRecentSearches().filter(
      (item) => item.toLocaleLowerCase('vi') !== query.toLocaleLowerCase('vi')
    );
    window.localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify([query, ...recent].slice(0, MAX_RECENT_SEARCHES))
    );
  } catch (error) {
    console.warn('Could not save recent search:', error);
  }
}

export default function HeaderSearch({
  value,
  placeholder = 'Tìm kiếm sản phẩm...',
  onSearch,
  onProductSelect,
  className = '',
}: HeaderSearchProps) {
  const [query, setQuery] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [recentSearches, setRecentSearches] = useState<string[]>(readRecentSearches);
  const [suggestionResults, setSuggestionResults] = useState<{
    query: string;
    products: ProductResponse[];
    loading: boolean;
  }>({ query: '', products: [], loading: false });
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsId = useId();
  const debouncedQuery = useDebounce(query.trim(), 250);

  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(value);
  }

  useEffect(() => {
    if (debouncedQuery.length < 2) return;

    const controller = new AbortController();
    productService
      .getProducts({ keyword: debouncedQuery }, controller.signal)
      .then((response) =>
        setSuggestionResults({
          query: debouncedQuery,
          products: response.data.slice(0, 5),
          loading: false,
        })
      )
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.warn('Could not load product search suggestions:', error);
          setSuggestionResults({ query: debouncedQuery, products: [], loading: false });
        }
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const submitSearch = (searchTerm: string) => {
    const normalized = searchTerm.trim();
    if (normalized) {
      saveRecentSearch(normalized);
      setRecentSearches(readRecentSearches());
    }
    setIsOpen(false);
    onSearch(normalized);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitSearch(query);
  };

  const showResults = debouncedQuery.length >= 2;
  const hasCurrentResults = suggestionResults.query === debouncedQuery;
  const products = hasCurrentResults ? suggestionResults.products : [];
  const isLoading = showResults && (!hasCurrentResults || suggestionResults.loading);

  return (
    <div className={`${styles.root} ${className}`} ref={rootRef}>
      <form
        className={styles.form}
        role="search"
        onSubmit={handleSubmit}
      >
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={suggestionsId}
          className={styles.input}
        />
        {query ? (
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
              onSearch('');
              setIsOpen(true);
            }}
            aria-label="Xóa từ khóa tìm kiếm"
            title="Xóa từ khóa"
          >
            <X size={15} />
          </button>
        ) : (
          <button
            type="submit"
            className={styles.actionButton}
            aria-label="Tìm kiếm"
            title="Tìm kiếm"
          >
            <Search size={17} />
          </button>
        )}
      </form>

      {isOpen && (
        <div
          id={suggestionsId}
          className={styles.suggestions}
          role="listbox"
          aria-label={showResults ? 'Sản phẩm gợi ý' : 'Tìm kiếm gần đây'}
        >
          {showResults ? (
            <>
              <div className={styles.sectionTitle}>
                {isLoading ? 'Đang tìm sản phẩm...' : 'Sản phẩm gợi ý'}
              </div>
              {!isLoading && products.length === 0 ? (
                <p className={styles.emptyState}>Không tìm thấy sản phẩm phù hợp.</p>
              ) : (
                products.map((product) => {
                  const image = extractProductImage(product);
                  return (
                    <Link
                      key={product.id}
                      to={`/products/${product.id}`}
                      className={styles.productOption}
                      role="option"
                      aria-selected="false"
                      onClick={() => {
                        setIsOpen(false);
                        onProductSelect?.();
                      }}
                    >
                      {image ? (
                        <img src={image} alt="" className={styles.thumbnail} loading="lazy" />
                      ) : (
                        <span className={styles.thumbnailPlaceholder} aria-hidden="true">
                          <ShoppingBag size={16} />
                        </span>
                      )}
                      <span className={styles.productDetails}>
                        <span className={styles.productName}>{product.name}</span>
                        <span className={styles.productPrice}>
                          {formatCurrencyVND(product.basePrice)}
                        </span>
                      </span>
                    </Link>
                  );
                })
              )}
              <button
                type="button"
                className={styles.searchAll}
                onClick={() => submitSearch(query)}
              >
                Xem tất cả kết quả cho “{query.trim()}”
              </button>
            </>
          ) : recentSearches.length > 0 ? (
            <>
              <div className={styles.sectionTitle}>Tìm kiếm gần đây</div>
              {recentSearches.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={styles.recentOption}
                  onClick={() => submitSearch(item)}
                >
                  <Search size={14} aria-hidden="true" />
                  <span>{item}</span>
                </button>
              ))}
            </>
          ) : (
            <p className={styles.emptyState}>Nhập ít nhất 2 ký tự để tìm sản phẩm.</p>
          )}
        </div>
      )}
    </div>
  );
}
