import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Mail,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { productService } from '../services/productService';
import { ProductResponse } from '../types/product';
import { Button, ProductCard, SectionHeader } from '../components/ui';
import { cn } from '../utils/cn';
import styles from './HomePage.module.css';

interface HeroSlide {
  id: number;
  subtitle: string;
  title: string;
  desc: string;
  primaryCta: string;
  primaryLink: string;
  secondaryCta: string;
  secondaryLink: string;
  image: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    subtitle: 'BỘ SƯU TẬP THU ĐÔNG 2026',
    title: 'BẢN SẮC TỐI GIẢN\nĐƯỜNG NÉT SẮC CẠNH',
    desc: 'Sự hòa quyện chuẩn mực giữa kỹ nghệ may đo thủ công đương đại và chất liệu tự nhiên sinh thái cao cấp.',
    primaryCta: 'KHÁM PHÁ BỘ SƯU TẬP',
    primaryLink: '/products?tag=new',
    secondaryCta: 'XEM TẤT CẢ SẢN PHẨM',
    secondaryLink: '/products',
    image:
      'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 2,
    subtitle: 'PREMIUM TAILORED SHIRTS & POLOS',
    title: 'ÁO SƠ MI & POLO\nTHẾ HỆ MỚI',
    desc: 'Dòng sợi tre Bamboo và sợi dệt Pique siêu nhẹ kháng khuẩn, chống nhăn giữ nếp hoàn hảo cả ngày.',
    primaryCta: 'MUA SẮM DÒNG ÁO',
    primaryLink: '/products?category=ao',
    secondaryCta: 'HÀNG MỚI VỀ',
    secondaryLink: '/products?tag=new',
    image:
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 3,
    subtitle: 'SMART CASUAL & BUSINESS TAILORING',
    title: 'QUẦN TÂY MAY ĐO\nĐẲNG CẤP VƯỢT THỜI GIAN',
    desc: 'Cạp ẩn co giãn thông minh, tôn vinh dáng vóc phái mạnh với những đường xếp ly sắc sảo.',
    primaryCta: 'CHỌN MẪU QUẦN TÂY',
    primaryLink: '/products?category=quan',
    secondaryCta: 'ƯU ĐÃI ĐẶC QUYỀN',
    secondaryLink: '/products?tag=sale',
    image:
      'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&w=1920&q=80',
  },
];

interface CategoryCard {
  title: string;
  subtitle: string;
  link: string;
  image: string;
  count: string;
}

const FEATURED_CATEGORIES: CategoryCard[] = [
  {
    title: 'ÁO SƠ MI MAY ĐO',
    subtitle: 'Chất vải Bamboo, Modal chống nhăn tự nhiên',
    link: '/products?category=so-mi',
    image:
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80',
    count: '34 Sản phẩm',
  },
  {
    title: 'ÁO POLO & T-SHIRT',
    subtitle: 'Sợi bông chải kỹ, bo dệt mắt chim thanh lịch',
    link: '/products?category=polo',
    image:
      'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80',
    count: '28 Sản phẩm',
  },
  {
    title: 'QUẦN TÂY & KHAKI',
    subtitle: 'Đứng form chuẩn mực, cạp chun thông minh',
    link: '/products?category=quan',
    image:
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80',
    count: '22 Sản phẩm',
  },
  {
    title: 'ÁO KHOÁC & BLAZER',
    subtitle: 'Đệm vai mềm, phom dáng quyền lực cho doanh nhân',
    link: '/products?category=khoac',
    image:
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80',
    count: '16 Sản phẩm',
  },
];

const VALUE_PROMISES = [
  {
    icon: ShieldCheck,
    title: '100% Chính Hãng',
    desc: 'Thiết kế & sợi sinh thái tuyển chọn độc quyền',
  },
  {
    icon: Truck,
    title: 'Miễn Phí Giao Hàng',
    desc: 'Cho mọi đơn hàng toàn quốc từ 500.000₫',
  },
  {
    icon: RotateCcw,
    title: '30 Ngày Đổi Trả',
    desc: 'Đổi tận nơi linh hoạt, không thủ tục rườm rà',
  },
  {
    icon: Sparkles,
    title: 'Bảo Hành Trọn Đời',
    desc: 'Chăm sóc đường kim, cúc áo chuẩn phong thái',
  },
];

const FALLBACK_SHOWCASE_PRODUCTS: ProductResponse[] = [
  {
    id: 1,
    name: 'Áo T-shirt Nam Regular Fit Cotton Xanh Khói',
    slug: 'ao-t-shirt-nam-regular-fit-cotton',
    description: 'Chất liệu 100% Cotton thoáng mát, co giãn tự nhiên, thấm hút mồ hôi tối ưu.',
    basePrice: 380000,
    categoryId: 1,
    averageRating: 4.9,
    reviewCount: 38,
    isActive: true,
    isNew: true,
  },
  {
    id: 2,
    name: 'Áo T-shirt Cổ Tròn Basic Trắng Tinh Khiết',
    slug: 'ao-t-shirt-co-tron-basic-trang',
    description: 'Form dáng hiện đại, dệt sợi bông chải kỹ chống xù lông, viền cổ dệt kim chống dão.',
    basePrice: 350000,
    categoryId: 1,
    averageRating: 5.0,
    reviewCount: 52,
    isActive: true,
  },
  {
    id: 4,
    name: 'Áo Polo Pique Dệt Mắt Chim Nam Đen',
    slug: 'ao-polo-pique-det-mat-chim-nam',
    description: 'Bo dệt họa tiết kẻ tinh tế, chất vải Pique thể thao cao cấp thoáng khí.',
    basePrice: 450000,
    categoryId: 2,
    averageRating: 4.9,
    reviewCount: 46,
    isActive: true,
    isNew: true,
  },
  {
    id: 5,
    name: 'Áo Sơ Mi Sợi Tre Kháng Khuẩn Trắng Regular',
    slug: 'ao-so-mi-soi-tre-khang-khuan-trang-regular',
    description: 'Vải Bamboo tự nhiên chống tia UV, hạn chế nhăn nhàu vượt trội.',
    basePrice: 580000,
    categoryId: 1,
    averageRating: 5.0,
    reviewCount: 64,
    isActive: true,
  },
  {
    id: 6,
    name: 'Quần Tây May Đo Khuy Khóa Ẩn Xám Khói',
    slug: 'quan-tay-may-do-khuy-khoa-an-xam-khoi',
    description: 'Vải Wool Blend cao cấp đứng form, cạp chun thông minh co giãn nhẹ.',
    basePrice: 650000,
    categoryId: 3,
    averageRating: 4.9,
    reviewCount: 33,
    isActive: true,
  },
  {
    id: 8,
    name: 'Áo Khoác Blazer Minimalist Đơn Sắc Đen',
    slug: 'ao-khoac-blazer-minimalist-don-sac-den',
    description: 'Ve áo sắc nét, đệm vai tinh tế tạo phom dáng chuẩn mực cho quý ông lịch lãm.',
    basePrice: 1250000,
    categoryId: 4,
    averageRating: 5.0,
    reviewCount: 19,
    isActive: true,
  },
];

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [emailSubscribed, setEmailSubscribed] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await productService.getProducts();
        if (isMounted) {
          if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
            setProducts(res.data);
          } else {
            setProducts(FALLBACK_SHOWCASE_PRODUCTS);
          }
        }
      } catch {
        if (isMounted) setProducts(FALLBACK_SHOWCASE_PRODUCTS);
      }
    }
    void loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  const prevSlide = () =>
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);

  const newArrivals = products.slice(0, 8);
  const bestSellers = [...products]
    .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
    .slice(0, 4);

  const handleSubscribe = (e: FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setEmailSubscribed(true);
      setEmailInput('');
    }
  };

  return (
    <div className="min-h-screen bg-surface-body text-content-primary">
      {/* 1. HERO CAROUSEL */}
      <section className={styles.heroSection}>
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <div
              key={slide.id}
              className={cn(styles.heroSlide, isActive && styles.heroSlideActive)}
            >
              <div
                className={styles.heroBg}
                style={{ backgroundImage: `url(${slide.image})` }}
              />
              <div className={styles.heroOverlay} />
              <div className={styles.heroBottomFade} />

              <div className="relative z-10 mx-auto flex h-full max-w-container items-center px-6">
                <div className={cn('max-w-[680px]', styles.heroContent)}>
                  <div
                    className={cn(
                      'mb-5 inline-flex items-center gap-2 rounded-sm px-3.5 py-1.5',
                      styles.heroBadge
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-gold" />
                    <span className="text-xs font-bold uppercase tracking-wider text-accent-gold">
                      {slide.subtitle}
                    </span>
                  </div>

                  <h1 className="mb-5 whitespace-pre-line text-2xl font-bold leading-tight text-content-inverse md:text-[48px]">
                    {slide.title}
                  </h1>

                  <p className="mb-9 max-w-[560px] text-md font-normal leading-relaxed text-content-inverse">
                    {slide.desc}
                  </p>

                  <div className="flex flex-wrap items-center gap-4">
                    <Link
                      to={slide.primaryLink}
                      className={cn(
                        'inline-flex h-btn-lg items-center gap-2.5 rounded-btn px-8 text-base font-bold uppercase tracking-wide',
                        styles.heroPrimaryCta
                      )}
                    >
                      <span>{slide.primaryCta}</span>
                      <ArrowRight size={16} />
                    </Link>

                    <Link
                      to={slide.secondaryLink}
                      className={cn(
                        'inline-flex h-btn-lg items-center gap-2.5 rounded-btn px-7 text-base font-semibold uppercase tracking-wide',
                        styles.heroSecondaryCta
                      )}
                    >
                      <span>{slide.secondaryCta}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={prevSlide}
          aria-label="Previous slide"
          className={cn(
            'absolute left-6 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center text-content-inverse',
            styles.carouselControl
          )}
        >
          <ChevronLeft size={24} />
        </button>

        <button
          type="button"
          onClick={nextSlide}
          aria-label="Next slide"
          className={cn(
            'absolute right-6 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center text-content-inverse',
            styles.carouselControl
          )}
        >
          <ChevronRight size={24} />
        </button>

        <div className="absolute bottom-9 left-1/2 z-20 flex -translate-x-1/2 gap-2.5">
          {HERO_SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setCurrentSlide(i)}
              aria-label={`Slide ${i + 1}`}
              className={cn(
                'h-1 rounded-sm transition-all duration-300',
                currentSlide === i
                  ? 'w-8 bg-accent-gold'
                  : 'w-2 bg-surface-disabled opacity-50'
              )}
            />
          ))}
        </div>
      </section>

      {/* 2. VALUE PROPOSITION BAR */}
      <section className="border-b border-line-light bg-surface py-6">
        <div className="mx-auto max-w-container px-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUE_PROMISES.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-primary text-content-inverse">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold uppercase tracking-wide text-content-primary">
                      {item.title}
                    </h4>
                    <p className="mt-0.5 text-xs text-content-secondary">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. FEATURED CATEGORIES GRID */}
      <section className="py-16">
        <div className="mx-auto max-w-container px-6">
          <SectionHeader title="Không gian mua sắm theo phong cách" align="center" />

          <div className="grid grid-cols-1 gap-[var(--grid-gap)] sm:grid-cols-2 lg:grid-cols-4">
            {FEATURED_CATEGORIES.map((cat) => (
              <Link
                key={cat.title}
                to={cat.link}
                className={cn(
                  'relative block h-[420px] overflow-hidden bg-surface-dark',
                  styles.categoryCard
                )}
              >
                <div
                  className={cn('absolute inset-0', styles.categoryBg)}
                  style={{ backgroundImage: `url(${cat.image})` }}
                />
                <div className={cn('absolute inset-0', styles.categoryVignette)} />

                <div className="absolute bottom-0 left-0 right-0 z-[2] p-7 text-content-inverse">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-accent-gold">
                    {cat.count}
                  </span>
                  <h3 className="mb-1.5 text-lg font-bold uppercase tracking-wide text-content-inverse">
                    {cat.title}
                  </h3>
                  <p className="mb-4 text-sm leading-snug text-content-disabled">
                    {cat.subtitle}
                  </p>
                  <span className="inline-flex items-center gap-2 border-b border-line pb-0.5 text-xs font-bold uppercase tracking-wide text-content-inverse">
                    <span>Khám phá ngay</span>
                    <ArrowUpRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. NEW ARRIVALS */}
      <section className="py-14">
        <div className="mx-auto max-w-container px-6">
          <SectionHeader
            title="Hàng mới về | New Arrivals"
            align="left"
            action={
              <Link
                to="/products?tag=new"
                className="inline-flex items-center gap-2 border-b border-primary pb-1 text-sm font-semibold uppercase tracking-wide text-content-primary transition-colors hover:text-content-secondary"
              >
                <span>Xem tất cả</span>
                <ArrowRight size={16} />
              </Link>
            }
          />

          <div className="grid grid-cols-1 gap-[var(--grid-gap)] sm:grid-cols-2 lg:grid-cols-4">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link to="/products">
              <Button variant="primary" size="lg">
                <span>Xem toàn bộ sản phẩm</span>
                <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. EDITORIAL STORYTELLING & LOOKBOOK */}
      <section className="bg-surface-dark py-20 text-content-inverse">
        <div className="mx-auto max-w-container px-6">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className={cn('relative h-[520px] overflow-hidden', styles.storyImageFrame)}>
              <img
                src="https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=1000&q=80"
                alt="Editorial Lookbook FashionWebsite"
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div
                className={cn(
                  'absolute left-5 top-5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-gold',
                  styles.storyTag
                )}
              >
                FW26 LOOKBOOK
              </div>
            </div>

            <div>
              <span className="mb-3 block text-xs font-bold uppercase tracking-wider text-accent-gold">
                TRIẾT LÝ THIẾT KẾ
              </span>

              <h2 className="mb-6 text-2xl font-bold leading-tight text-content-inverse md:text-[36px]">
                BẢN SẮC TỐI GIẢN.
                <br />
                <span className="text-accent-gold">KỸ NGHỆ SẮC CẠNH.</span>
              </h2>

              <p className="mb-6 text-md leading-relaxed text-content-disabled">
                FashionWebsite định hình chuẩn mực thời trang nam đương đại qua sự giao thoa hài hòa
                giữa kỹ thuật may đo thủ công tinh tế và ngôn ngữ thiết kế tối giản. Chúng tôi tin rằng
                sự lịch lãm thực thụ của người đàn ông không nằm ở vẻ ngoài phô trương, mà toát ra từ
                từng đường kim mũi chỉ chuẩn xác và cảm giác vừa vặn hoàn hảo trên cơ thể.
              </p>

              <div className="mb-9 flex flex-col gap-3.5">
                {[
                  'Sợi dệt sinh thái tự nhiên (Bamboo, Modal, Combed Cotton) kháng khuẩn, bảo vệ môi trường',
                  'Phom dáng Regular & Slim Tailored nghiên cứu riêng theo đặc trưng hình thể nam giới Á Đông',
                  'Bảng phối màu Monochrome & Earthy trung tính, dễ dàng biến hóa cho cả công sở lẫn tiệc tối',
                ].map((point) => (
                  <div key={point} className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                        styles.goldIconCircle
                      )}
                    >
                      <Check size={14} />
                    </span>
                    <span className="text-base text-content-inverse">{point}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/products?category=ao"
                className={cn(
                  'inline-flex h-btn-lg items-center gap-2.5 px-8 text-base font-bold uppercase tracking-wide',
                  styles.goldCta
                )}
              >
                <span>Khám phá dòng thiết kế mới</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BEST SELLERS */}
      <section className="py-16">
        <div className="mx-auto max-w-container px-6">
          <SectionHeader
            title="Sản phẩm bán chạy | Best Sellers"
            align="left"
            action={
              <Link
                to="/products"
                className="inline-flex items-center gap-2 border-b border-primary pb-1 text-sm font-semibold uppercase tracking-wide text-content-primary transition-colors hover:text-content-secondary"
              >
                <span>Xem toàn bộ bán chạy</span>
                <ArrowRight size={16} />
              </Link>
            }
          />

          <div className="grid grid-cols-1 gap-[var(--grid-gap)] sm:grid-cols-2 lg:grid-cols-4">
            {bestSellers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 7. VIP CLUB & NEWSLETTER */}
      <section className={cn('bg-surface-dark py-16 text-content-inverse', styles.vipSection)}>
        <div className="mx-auto max-w-container px-6">
          <div className="mx-auto max-w-[680px] text-center">
            <div
              className={cn(
                'mb-5 inline-flex h-[52px] w-[52px] items-center justify-center rounded-full',
                styles.goldIconCircle
              )}
            >
              <Mail size={24} />
            </div>

            <h3 className="mb-3 text-xl font-bold uppercase tracking-wider text-content-inverse">
              GIA NHẬP FASHION WEBSITE VIP CLUB
            </h3>

            <p className="mb-7 text-base leading-relaxed text-content-disabled">
              Nhận thông báo sớm nhất về các đợt phát hành bộ sưu tập giới hạn, quyền tham gia sự
              kiện thời trang riêng và tặng ngay voucher{' '}
              <strong className="text-accent-gold">10% OFF</strong> cho đơn hàng đầu tiên.
            </p>

            {emailSubscribed ? (
              <div className={cn('px-6 py-4 text-base font-semibold', styles.vipSuccess)}>
                Cảm ơn bạn đã đăng ký! Mã voucher ưu đãi 10% đã được gửi đến email của bạn.
              </div>
            ) : (
              <form
                onSubmit={handleSubscribe}
                className="mx-auto flex max-w-[520px]"
              >
                <input
                  type="email"
                  required
                  placeholder="Nhập địa chỉ email của bạn..."
                  aria-label="Email đăng ký VIP Club"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className={cn(
                    'h-btn-lg flex-1 rounded-input px-4 text-base text-content-inverse placeholder:text-content-muted focus:outline-none',
                    styles.vipInput
                  )}
                />
                <button
                  type="submit"
                  className={cn(
                    'h-btn-lg shrink-0 rounded-btn px-7 text-base font-bold uppercase tracking-wide',
                    styles.goldCta
                  )}
                >
                  Đăng Ký
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
