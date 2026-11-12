import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import styles from './Footer.module.css';

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="mt-auto w-full bg-surface-dark pb-8 pt-16 text-content-inverse">
      <div className="mx-auto max-w-container px-6">
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Col 1: Brand story */}
          <div>
            <h4 className="mb-5 text-base font-semibold uppercase tracking-wide text-content-inverse">
              FASHION WEBSITE
            </h4>
            <p className="mb-5 text-sm leading-relaxed text-content-disabled">
              Định hình phong cách hiện đại với những thiết kế tối giản, sắc nét và chất liệu cao cấp. Bản sắc thời trang đương đại dành cho người theo đuổi sự tinh tế.
            </p>
            <div className="flex gap-4 text-content-disabled">
              <a
                href="#instagram"
                aria-label="Instagram"
                className="transition-colors hover:text-content-inverse"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a
                href="#facebook"
                aria-label="Facebook"
                className="transition-colors hover:text-content-inverse"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a
                href="#youtube"
                aria-label="Youtube"
                className="transition-colors hover:text-content-inverse"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
                  <polygon points="10 15 15 12 10 9 10 15" />
                </svg>
              </a>
            </div>
          </div>

          {/* Col 2: Customer Service */}
          <div>
            <h5 className="mb-5 text-base font-semibold uppercase tracking-wide text-content-inverse">
              Dịch Vụ Khách Hàng
            </h5>
            <ul>
              <li>
                <a
                  href="#help"
                  className={cn(
                    'text-sm font-normal leading-[2.2] text-content-disabled',
                    styles.footerLink
                  )}
                >
                  Chính sách đổi trả trong 30 ngày
                </a>
              </li>
              <li>
                <a
                  href="#shipping"
                  className={cn(
                    'text-sm font-normal leading-[2.2] text-content-disabled',
                    styles.footerLink
                  )}
                >
                  Chính sách giao hàng & kiểm hàng
                </a>
              </li>
              <li>
                <a
                  href="#size"
                  className={cn(
                    'text-sm font-normal leading-[2.2] text-content-disabled',
                    styles.footerLink
                  )}
                >
                  Bảng quy đổi kích cỡ chuẩn (Size Guide)
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className={cn(
                    'text-sm font-normal leading-[2.2] text-content-disabled',
                    styles.footerLink
                  )}
                >
                  Câu hỏi thường gặp (FAQ)
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: About */}
          <div>
            <h5 className="mb-5 text-base font-semibold uppercase tracking-wide text-content-inverse">
              Về Chúng Tôi
            </h5>
            <ul>
              <li>
                <a
                  href="#story"
                  className={cn(
                    'text-sm font-normal leading-[2.2] text-content-disabled',
                    styles.footerLink
                  )}
                >
                  Câu chuyện thương hiệu
                </a>
              </li>
              <li>
                <a
                  href="#sustainability"
                  className={cn(
                    'text-sm font-normal leading-[2.2] text-content-disabled',
                    styles.footerLink
                  )}
                >
                  Phát triển bền vững
                </a>
              </li>
              <li>
                <Link
                  to="/#stores"
                  className={cn(
                    'text-sm font-normal leading-[2.2] text-content-disabled',
                    styles.footerLink
                  )}
                >
                  Hệ thống cửa hàng trên toàn quốc
                </Link>
              </li>
              <li>
                <a
                  href="#careers"
                  className={cn(
                    'text-sm font-normal leading-[2.2] text-content-disabled',
                    styles.footerLink
                  )}
                >
                  Cơ hội nghề nghiệp
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Newsletter */}
          <div>
            <h5 className="mb-5 text-base font-semibold uppercase tracking-wide text-content-inverse">
              Đăng Ký Nhận Bản Tin
            </h5>
            <p className="mb-4 text-sm leading-relaxed text-content-disabled">
              Nhận thông báo sớm nhất về các bộ sưu tập giới hạn và ưu đãi độc quyền 15% cho đơn hàng đầu tiên.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="flex">
              <input
                type="email"
                placeholder="Nhập email của bạn..."
                aria-label="Email nhận bản tin"
                className={cn(
                  'h-input flex-1 rounded-input border px-3.5 text-base font-normal text-content-inverse placeholder:text-content-muted focus:outline-none',
                  styles.newsletterInput
                )}
              />
              <button
                type="submit"
                aria-label="Đăng ký"
                className="flex h-btn items-center justify-center rounded-btn bg-surface-body px-4 text-content-primary transition-colors hover:bg-surface"
              >
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-4 border-t pt-6 text-xs text-content-muted',
            styles.divider
          )}
        >
          <div>
            &copy; {CURRENT_YEAR} FASHION WEBSITE. Tất cả quyền được bảo lưu.
          </div>
          <div className="flex gap-5">
            <a href="#privacy" className="transition-colors hover:text-content-inverse">
              Chính sách bảo mật
            </a>
            <a href="#terms" className="transition-colors hover:text-content-inverse">
              Điều khoản dịch vụ
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
