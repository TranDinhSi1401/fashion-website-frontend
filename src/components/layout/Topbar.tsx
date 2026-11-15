import { useEffect, useState } from 'react';
import { Mail, Phone, ShieldCheck, X } from 'lucide-react';
import styles from './Topbar.module.css';

const ANNOUNCEMENTS = [
  'Miễn phí giao hàng cho đơn từ 500.000₫',
  'Sản phẩm chính hãng 100% - an tâm mua sắm',
  'Đổi trả linh hoạt trong 30 ngày',
];

export default function Topbar() {
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!isVisible) return;
    const timer = window.setInterval(() => {
      setAnnouncementIndex((current) => (current + 1) % ANNOUNCEMENTS.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <aside className={styles.topbar} aria-label="Thông tin cửa hàng">
      <div className={styles.content}>
        <div className={styles.trustMessage}>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={14} className={styles.trustIcon} />
            <span>Chính hãng 100%</span>
          </span>
        </div>

        <p className={styles.announcement} aria-live="off">
          {ANNOUNCEMENTS[announcementIndex]}
        </p>

        <div className={styles.contactLinks}>
          <a
            href="tel:19001234"
            className={styles.contactLink}
          >
            <Phone size={13} />
            <span>Hotline: 1900 1234</span>
          </a>
          <a
            href="mailto:support@fashionwebsite.com"
            className={styles.contactLink}
          >
            <Mail size={13} />
            <span>Hỗ trợ</span>
          </a>
        </div>

        <button
          type="button"
          className={styles.closeButton}
          onClick={() => setIsVisible(false)}
          aria-label="Ẩn thanh thông báo"
          title="Ẩn thông báo"
        >
          <X size={15} />
        </button>
      </div>
    </aside>
  );
}
