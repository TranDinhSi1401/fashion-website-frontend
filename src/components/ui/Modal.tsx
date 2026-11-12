import { MouseEvent, ReactNode, useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import styles from './Modal.module.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'size-guide' | 'quick-view';
  maxWidth?: string;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  'size-guide': 'max-w-[720px]',
  'quick-view': 'max-w-[920px]',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'size-guide',
  maxWidth,
  className = '',
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      document.body.style.overflow = 'hidden';
    } else if (dialog.open) {
      dialog.close();
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleBackdropClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={handleBackdropClick}
      style={maxWidth ? { maxWidth } : undefined}
      className={cn(styles.dialog, !maxWidth && SIZE_CLASSES[size], className)}
    >
      <div
        className="flex max-h-[90vh] flex-col overflow-hidden rounded-modal p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative mb-6 flex items-center justify-center border-b border-line-light pb-4">
          <h3 className="px-10 text-center text-lg font-bold uppercase tracking-wide text-content-primary">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className={cn(
              'absolute right-0 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-sm text-content-secondary',
              'hover:bg-surface hover:text-content-primary',
              styles.closeButton
            )}
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto">{children}</div>
      </div>
    </dialog>
  );
}
