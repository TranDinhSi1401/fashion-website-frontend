import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { BreadcrumbItem } from '../../types/ui';

export type { BreadcrumbItem };

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items = [] }: BreadcrumbProps) {
  if (!items.length) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex h-11 w-full items-center gap-2 overflow-x-auto whitespace-nowrap text-xs font-normal"
    >
      <Link
        to="/"
        className="text-content-muted transition-colors hover:text-content-primary hover:underline"
      >
        Trang chủ
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const target = item.to || item.href;

        return (
          <Fragment key={`${item.label}-${index}`}>
            <span className="text-content-muted" aria-hidden="true">
              /
            </span>
            {isLast || !target ? (
              <span
                aria-current={isLast ? 'page' : undefined}
                className="font-medium text-content-primary"
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={target}
                className="text-content-muted transition-colors hover:text-content-primary hover:underline"
              >
                {item.label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
