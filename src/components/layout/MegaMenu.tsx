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
  banner?: {
    image: string;
    title: string;
    to: string;
  };
  statusMessage?: string;
  onNavigate?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function MegaMenu({
  isOpen,
  columns,
  banner,
  statusMessage,
  onNavigate,
  onMouseEnter,
  onMouseLeave,
}: MegaMenuProps) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-hidden={!isOpen}
      inert={!isOpen}
      className={cn(
        'absolute left-0 right-0 top-full z-40 mx-auto w-full max-w-[1180px] rounded-b-sm border border-t-0 border-line-light bg-surface-elevated p-7 shadow-dropdown',
        styles.panel,
        isOpen && styles.open
      )}
    >
      <div className={styles.content}>
        <div className={styles.columns}>
          {!columns.length && <p role="status" className="text-sm text-content-secondary">{statusMessage || 'Chưa có danh mục phù hợp.'}</p>}
          {columns.map((column) => (
            <div key={column.title}>
              <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-content-primary">
                {column.title}
              </h4>
              <ul className="space-y-0.5">
                {column.links.map((link) => (
                  <li key={link.to + link.label}>
                    <Link
                      to={link.to}
                      onClick={onNavigate}
                      className={cn(
                        'text-sm font-normal leading-[2.1] text-content-secondary',
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
        {banner && (
          <Link
            to={banner.to}
            onClick={onNavigate}
            className={styles.banner}
            style={{
              backgroundImage: `linear-gradient(0deg, rgba(0,0,0,.62), rgba(0,0,0,.06)), url("${banner.image}")`,
            }}
          >
            <span className={styles.bannerEyebrow}>FASHIONWEB EDIT</span>
            <span className={styles.bannerTitle}>{banner.title}</span>
            <span className={styles.bannerCta}>Khám phá ngay</span>
          </Link>
        )}
      </div>
    </div>
  );
}
