import { Mail, Phone, ShieldCheck } from 'lucide-react';

export default function Topbar() {
  return (
    <aside className="h-topbar w-full rounded-none bg-surface-dark text-xs font-medium text-content-inverse">
      <div className="mx-auto flex h-full max-w-container items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-accent-gold" />
            <span>Chính hãng 100%</span>
          </span>
        </div>

        <p className="hidden text-center md:block">
          Miễn phí giao hàng cho đơn từ 500.000₫
        </p>

        <div className="flex items-center gap-4">
          <a
            href="tel:19001234"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-accent-gold"
          >
            <Phone size={13} />
            <span>Hotline: 1900 1234</span>
          </a>
          <span className="text-content-muted" aria-hidden="true">
            |
          </span>
          <a
            href="mailto:support@fashionwebsite.com"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-accent-gold"
          >
            <Mail size={13} />
            <span>Hỗ trợ</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
