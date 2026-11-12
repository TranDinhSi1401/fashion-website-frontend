import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import styles from './Pagination.module.css';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  scrollTargetTop?: number;
  className?: string;
}

function getPageNumbers(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push('ellipsis');
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }
  if (end < totalPages - 1) pages.push('ellipsis');
  pages.push(totalPages);

  return pages;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  scrollTargetTop,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  const handleSelectPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
    if (typeof scrollTargetTop === 'number') {
      window.scrollTo({ top: scrollTargetTop, behavior: 'smooth' });
    }
  };

  const baseButtonClass = cn(
    'inline-flex h-[38px] w-[38px] items-center justify-center rounded-sm border text-base font-medium',
    styles.pageButton
  );

  return (
    <nav
      aria-label="Phân trang"
      className={cn('mt-12 flex items-center justify-center gap-2', className)}
    >
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => handleSelectPage(currentPage - 1)}
        aria-label="Trang trước"
        className={cn(
          baseButtonClass,
          'border-line-light bg-surface-body text-content-primary',
          'hover:border-primary disabled:cursor-not-allowed disabled:border-line-light disabled:text-content-disabled'
        )}
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((item, index) =>
        item === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className="inline-flex h-[38px] w-[38px] items-center justify-center text-base text-content-muted"
          >
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => handleSelectPage(item)}
            aria-current={item === currentPage ? 'page' : undefined}
            className={cn(
              baseButtonClass,
              item === currentPage
                ? 'border-primary bg-primary font-semibold text-content-inverse'
                : 'border-line-light bg-surface-body text-content-primary hover:border-primary'
            )}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => handleSelectPage(currentPage + 1)}
        aria-label="Trang sau"
        className={cn(
          baseButtonClass,
          'border-line-light bg-surface-body text-content-primary',
          'hover:border-primary disabled:cursor-not-allowed disabled:border-line-light disabled:text-content-disabled'
        )}
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
