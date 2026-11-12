import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import styles from './MegaMenu.module.css';

export interface MegaMenuLink {
  label: string;
  to: string;
}

export interface MegaMenuColumn {
  title: string;
  links: MegaMenuLink[];
}

export interface MegaMenuProps {
  isOpen: boolean;
  columns: MegaMenuColumn[];
  onNavigate?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function MegaMenu({
  isOpen,
  columns,
  onNavigate,
  onMouseEnter,
  onMouseLeave,
}: MegaMenuProps) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-hidden={!isOpen}
      className={cn(
        'absolute left-0 right-0 top-full z-40 mx-auto w-full max-w-[1100px] rounded-b-sm border border-t-0 border-line-light bg-surface-elevated p-8 shadow-dropdown',
        styles.panel,
        isOpen && styles.open
      )}
    >
      <div className="grid grid-cols-4 gap-8">
        {columns.map((column) => (
          <div key={column.title}>
            <h4 className="mb-3 text-base font-bold uppercase tracking-wide text-content-primary">
              {column.title}
            </h4>
            <ul className="space-y-0.5">
              {column.links.map((link) => (
                <li key={link.to + link.label}>
                  <Link
                    to={link.to}
                    onClick={onNavigate}
                    className={cn(
                      'text-base font-normal leading-[2.2] text-content-secondary',
                      styles.subLink
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
