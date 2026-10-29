import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  Sparkles, 
  Star, 
  Award, 
  Check, 
  Mail, 
  ArrowUpRight 
} from 'lucide-react';
import { productService } from '../services/productService';
import { ProductResponse } from '../types/product';
import ProductCard from '../components/product/ProductCard';

// Editorial Hero Slides
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
  tag: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    subtitle: 'BỘ SƯU TẬP THU ĐÔNG 2026',
    title: 'BẢN SẮC TỐI GIẢN\nĐƯỜNG NÉT SẮC CẠNH',
    desc: 'Sự hòa quyện chuẩn mực giữa kỹ nghệ may đo thủ công đương đại và chất liệu tự nhiên sinh thái cao cấp.',
    primaryCta: 'KHÁM PHÁ BỘ SƯU TẬP',
    primaryLink: '/products?tag=fw26',
    secondaryCta: 'XEM TẤT CẢ SẢN PHẨM',
    secondaryLink: '/products',
    image: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=1920&q=80',
    tag: 'FW26 COLLECTION',
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
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1920&q=80',
    tag: 'INNOVATIVE FABRIC',
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
    image: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&w=1920&q=80',
    tag: 'BESPOKE TAILORING',
  },
];

// Featured Categories Data
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
    image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80',
    count: '34 Sản phẩm',
  },
  {
    title: 'ÁO POLO & T-SHIRT',
    subtitle: 'Sợi bông chải kỹ, bo dệt mắt chim thanh lịch',
    link: '/products?category=polo',
    image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80',
    count: '28 Sản phẩm',
  },
  {
    title: 'QUẦN TÂY & KHAKI',
    subtitle: 'Đứng form chuẩn mực, cạp chun thông minh',
    link: '/products?category=quan',
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80',
    count: '22 Sản phẩm',
  },
  {
    title: 'ÁO KHOÁC & BLAZER',
    subtitle: 'Đệm vai mềm, phom dáng quyền lực cho doanh nhân',
    link: '/products?category=khoac',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80',
    count: '16 Sản phẩm',
  },
];

// Fallback products if backend is cold/empty
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
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'ao' | 'quan' | 'khoac'>('all');
  const [emailSubscribed, setEmailSubscribed] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');

  // Fetch real products from API
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await productService.getProducts();
        if (isMounted) {
          if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
            setProducts(res.data);
          } else {
            setProducts(FALLBACK_SHOWCASE_PRODUCTS);
          }
        }
      } catch (err) {
        console.warn('Could not load products from API, using catalog showcase fallback', err);
        if (isMounted) setProducts(FALLBACK_SHOWCASE_PRODUCTS);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Hero carousel auto-timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  // Filtered products for new arrivals section
  const newArrivals = products.slice(0, 8);
  const bestSellers = [...products]
    .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
    .slice(0, 4);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setEmailSubscribed(true);
      setEmailInput('');
    }
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh', color: '#111111' }}>
      {/* 1. HERO CAROUSEL */}
      <section
        style={{
          position: 'relative',
          height: '84vh',
          minHeight: '620px',
          maxHeight: '880px',
          backgroundColor: '#0D0D11',
          overflow: 'hidden',
        }}
      >
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <div
              key={slide.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: isActive ? 1 : 0,
                visibility: isActive ? 'visible' : 'hidden',
                transition: 'opacity 0.8s ease-in-out, visibility 0.8s ease-in-out',
                zIndex: isActive ? 2 : 1,
              }}
            >
              {/* Background Image with Dark Vignette */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundImage: `url(${slide.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center 25%',
                  transform: isActive ? 'scale(1.03)' : 'scale(1)',
                  transition: 'transform 7s ease-out',
                }}
              />

              {/* Gradient Overlays for Luxury Contrast */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(90deg, rgba(10,10,14,0.92) 0%, rgba(10,10,14,0.65) 45%, rgba(10,10,14,0.2) 100%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '160px',
                  background: 'linear-gradient(to top, rgba(10,10,14,0.95), transparent)',
                }}
              />

              {/* Slide Content */}
              <div
                className="container"
                style={{
                  position: 'relative',
                  zIndex: 10,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    maxWidth: '680px',
                    padding: '0 20px',
                    transform: isActive ? 'translateY(0)' : 'translateY(24px)',
                    opacity: isActive ? 1 : 0,
                    transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
                  }}
                >
                  {/* Badge */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '5px 14px',
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(197, 160, 89, 0.4)',
                      borderRadius: '2px',
                      marginBottom: '20px',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#C5A059',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        letterSpacing: '0.14em',
                        color: '#E5C98B',
                        textTransform: 'uppercase',
                      }}
                    >
                      {slide.subtitle}
                    </span>
                  </div>

                  {/* Heading */}
                  <h1
                    style={{
                      fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)',
                      fontWeight: 900,
                      lineHeight: 1.12,
                      letterSpacing: '-0.02em',
                      color: '#FFFFFF',
                      marginBottom: '20px',
                      whiteSpace: 'pre-line',
                      textShadow: '0 4px 20px rgba(0,0,0,0.6)',
                    }}
                  >
                    {slide.title}
                  </h1>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: '1.05rem',
                      lineHeight: 1.6,
                      color: 'rgba(255,255,255,0.85)',
                      marginBottom: '36px',
                      fontWeight: 400,
                      maxWidth: '560px',
                    }}
                  >
                    {slide.desc}
                  </p>

                  {/* CTA Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <Link
                      to={slide.primaryLink}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '16px 34px',
                        backgroundColor: '#FFFFFF',
                        color: '#000000',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        letterSpacing: '0.08em',
                        textDecoration: 'none',
                        borderRadius: '0px',
                        transition: 'all 0.25s',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#C5A059';
                        e.currentTarget.style.color = '#FFFFFF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.color = '#000000';
                      }}
                    >
                      <span>{slide.primaryCta}</span>
                      <ArrowRight size={16} />
                    </Link>

                    <Link
                      to={slide.secondaryLink}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '15px 30px',
                        backgroundColor: 'transparent',
                        color: '#FFFFFF',
                        border: '1px solid rgba(255,255,255,0.4)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        letterSpacing: '0.08em',
                        textDecoration: 'none',
                        borderRadius: '0px',
                        transition: 'all 0.25s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#FFFFFF';
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span>{slide.secondaryCta}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Carousel Prev/Next Buttons */}
        <button
          onClick={prevSlide}
          style={{
            position: 'absolute',
            left: '28px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '48px',
            height: '48px',
            backgroundColor: 'rgba(0,0,0,0.45)',
            border: '1px solid rgba(255,255,255,0.25)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 20,
            backdropFilter: 'blur(8px)',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.85)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.45)')}
          aria-label="Previous slide"
        >
          <ChevronLeft size={24} />
        </button>

        <button
          onClick={nextSlide}
          style={{
            position: 'absolute',
            right: '28px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '48px',
            height: '48px',
            backgroundColor: 'rgba(0,0,0,0.45)',
            border: '1px solid rgba(255,255,255,0.25)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 20,
            backdropFilter: 'blur(8px)',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.85)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.45)')}
          aria-label="Next slide"
        >
          <ChevronRight size={24} />
        </button>

        {/* Dot Indicators */}
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '10px',
            zIndex: 20,
          }}
        >
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              style={{
                width: currentSlide === i ? '32px' : '8px',
                height: '4px',
                borderRadius: '2px',
                backgroundColor: currentSlide === i ? '#C5A059' : 'rgba(255,255,255,0.3)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* 2. VALUE PROPOSITION & BRAND PROMISES BAR */}
      <section
        style={{
          borderBottom: '1px solid #EEEEEE',
          backgroundColor: '#FAFAFA',
          padding: '24px 0',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  backgroundColor: '#111111',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', margin: '0 0 3px' }}>
                  100% Chính Hãng
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#666666', margin: 0 }}>
                  Thiết kế & sợi sinh thái tuyển chọn độc quyền
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  backgroundColor: '#111111',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Truck size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', margin: '0 0 3px' }}>
                  Miễn Phí Giao Hàng
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#666666', margin: 0 }}>
                  Cho mọi đơn hàng toàn quốc từ 500.000đ
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  backgroundColor: '#111111',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <RotateCcw size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', margin: '0 0 3px' }}>
                  30 Ngày Đổi Trả
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#666666', margin: 0 }}>
                  Đổi tận nơi linh hoạt, không thủ tục rườm rà
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  backgroundColor: '#111111',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', margin: '0 0 3px' }}>
                  Bảo Hành Trọn Đời
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#666666', margin: 0 }}>
                  Chăm sóc đường kim, cúc áo chuẩn phong thái
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED CATEGORIES GRID */}
      <section style={{ padding: '72px 0 40px' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px' }}>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                letterSpacing: '0.14em',
                color: '#C5A059',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              DANH MỤC THIẾT KẾ ĐẶC TRƯNG
            </span>
            <h2
              style={{
                fontSize: '2.1rem',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                color: '#111111',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              KHÔNG GIAN MUA SẮM THEO PHONG CÁCH
            </h2>
            <div
              style={{
                width: '48px',
                height: '3px',
                backgroundColor: '#111111',
                margin: '16px auto 0',
              }}
            />
          </div>

          {/* 4 Large Editorial Category Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
            }}
          >
            {FEATURED_CATEGORIES.map((cat, idx) => (
              <Link
                key={idx}
                to={cat.link}
                style={{
                  position: 'relative',
                  height: '420px',
                  display: 'block',
                  textDecoration: 'none',
                  overflow: 'hidden',
                  backgroundColor: '#1C1C1E',
                }}
                className="category-card-hover"
              >
                {/* Background Image with Hover Scale */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${cat.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                />

                {/* Dark Vignette Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.05) 100%)',
                  }}
                />

                {/* Category Card Content */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '28px',
                    color: '#FFFFFF',
                    zIndex: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      color: '#C5A059',
                      textTransform: 'uppercase',
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    {cat.count}
                  </span>
                  <h3
                    style={{
                      fontSize: '1.3rem',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      margin: '0 0 6px',
                      color: '#FFFFFF',
                    }}
                  >
                    {cat.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: 'rgba(255,255,255,0.75)',
                      margin: '0 0 16px',
                      lineHeight: 1.4,
                    }}
                  >
                    {cat.subtitle}
                  </p>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#FFFFFF',
                      borderBottom: '1px solid rgba(255,255,255,0.4)',
                      paddingBottom: '2px',
                    }}
                  >
                    <span>Khám phá ngay</span>
                    <ArrowUpRight size={14} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. HÀNG MỚI VỀ (NEW ARRIVALS PRODUCT SHOWCASE) */}
      <section style={{ padding: '48px 0 72px' }}>
        <div className="container">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: '36px',
              borderBottom: '2px solid #111111',
              paddingBottom: '16px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  color: '#C5A059',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                CẬP NHẬT MỖI TUẦN
              </span>
              <h2
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 900,
                  letterSpacing: '-0.01em',
                  margin: 0,
                  textTransform: 'uppercase',
                }}
              >
                HÀNG MỚI VỀ | NEW ARRIVALS
              </h2>
            </div>

            {/* Quick Link to Catalog */}
            <Link
              to="/products?tag=new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#111111',
                textDecoration: 'none',
                padding: '6px 0',
                borderBottom: '1px solid #111111',
              }}
            >
              <span>Xem tất cả hàng mới</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Product Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '24px',
            }}
          >
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Full Catalog Button */}
          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <Link
              to="/products"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 42px',
                backgroundColor: '#111111',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.85rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#C5A059')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#111111')}
            >
              <span>Xem Toàn Bộ Sản Phẩm</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. EDITORIAL STORYTELLING & LOOKBOOK BANNER */}
      <section
        style={{
          backgroundColor: '#0F0F12',
          color: '#FFFFFF',
          padding: '80px 0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '48px',
              alignItems: 'center',
            }}
          >
            {/* Left Lookbook Image */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'relative',
                  height: '520px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=1000&q=80"
                  alt="Editorial Lookbook FashionWebsite"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(8px)',
                    padding: '6px 14px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    color: '#C5A059',
                  }}
                >
                  FW26 LOOKBOOK
                </div>
              </div>
            </div>

            {/* Right Brand Story Copy */}
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  color: '#C5A059',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '12px',
                }}
              >
                TRIẾT LÝ THIẾT KẾ
              </span>

              <h2
                style={{
                  fontSize: 'clamp(2rem, 3.2vw, 2.8rem)',
                  fontWeight: 900,
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                  color: '#FFFFFF',
                  margin: '0 0 24px',
                }}
              >
                BẢN SẮC TỐI GIẢN.
                <br />
                <span style={{ color: '#C5A059' }}>KỸ NGHỆ SẮC CẠNH.</span>
              </h2>

              <p
                style={{
                  fontSize: '0.98rem',
                  lineHeight: 1.7,
                  color: 'rgba(255,255,255,0.75)',
                  marginBottom: '24px',
                }}
              >
                FashionWebsite định hình chuẩn mực thời trang nam đương đại qua sự giao thoa hài hòa
                giữa kỹ thuật may đo thủ công tinh tế và ngôn ngữ thiết kế tối giản. Chúng tôi tin rằng
                sự lịch lãm thực thụ của người đàn ông không nằm ở vẻ ngoài phô trương, mà toát ra từ
                từng đường kim mũi chỉ chuẩn xác và cảm giác vừa vặn hoàn hảo trên cơ thể.
              </p>

              {/* Craftsmanship Highlights */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '36px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(197, 160, 89, 0.2)',
                      color: '#C5A059',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={14} />
                  </div>
                  <span style={{ fontSize: '0.9rem', color: '#EEEEEE' }}>
                    Sợi dệt sinh thái tự nhiên (Bamboo, Modal, Combed Cotton) kháng khuẩn, bảo vệ môi trường
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(197, 160, 89, 0.2)',
                      color: '#C5A059',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={14} />
                  </div>
                  <span style={{ fontSize: '0.9rem', color: '#EEEEEE' }}>
                    Phom dáng Regular & Slim Tailored nghiên cứu riêng theo đặc trưng hình thể nam giới Á Đông
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(197, 160, 89, 0.2)',
                      color: '#C5A059',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={14} />
                  </div>
                  <span style={{ fontSize: '0.9rem', color: '#EEEEEE' }}>
                    Bảng phối màu Monochrome & Earthy trung tính, dễ dàng biến hóa cho cả công sở lẫn tiệc tối
                  </span>
                </div>
              </div>

              <Link
                to="/products?category=ao"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '15px 32px',
                  backgroundColor: '#C5A059',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d8b26a')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#C5A059')}
              >
                <span>Khám Phá Dòng Thiết Kế Mới</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BEST SELLERS SECTION */}
      <section style={{ padding: '72px 0' }}>
        <div className="container">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: '36px',
              borderBottom: '2px solid #111111',
              paddingBottom: '16px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  color: '#C5A059',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                ĐƯỢC YÊU THÍCH NHẤT
              </span>
              <h2
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 900,
                  letterSpacing: '-0.01em',
                  margin: 0,
                  textTransform: 'uppercase',
                }}
              >
                SẢN PHẨM BÁN CHẠY | BEST SELLERS
              </h2>
            </div>

            <Link
              to="/products?tag=bestseller"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#111111',
                textDecoration: 'none',
                padding: '6px 0',
                borderBottom: '1px solid #111111',
              }}
            >
              <span>Xem toàn bộ bán chạy</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '24px',
            }}
          >
            {bestSellers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 7. VIP CLUB & NEWSLETTER SIGNUP */}
      <section
        style={{
          backgroundColor: '#18181B',
          color: '#FFFFFF',
          padding: '64px 0',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="container">
          <div
            style={{
              maxWidth: '680px',
              margin: '0 auto',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '52px',
                height: '52px',
                backgroundColor: 'rgba(197, 160, 89, 0.15)',
                color: '#C5A059',
                borderRadius: '50%',
                marginBottom: '20px',
              }}
            >
              <Mail size={24} />
            </div>

            <h3
              style={{
                fontSize: '1.8rem',
                fontWeight: 900,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                margin: '0 0 12px',
                color: '#FFFFFF',
              }}
            >
              GIA NHẬP FASHION WEBSITE VIP CLUB
            </h3>

            <p
              style={{
                fontSize: '0.92rem',
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.6,
                margin: '0 0 28px',
              }}
            >
              Nhận thông báo sớm nhất về các đợt phát hành bộ sưu tập giới hạn, quyền tham gia sự
              kiện thời trang riêng và tặng ngay voucher <strong style={{ color: '#C5A059' }}>10% OFF</strong> cho đơn hàng đầu tiên.
            </p>

            {emailSubscribed ? (
              <div
                style={{
                  padding: '16px 24px',
                  backgroundColor: 'rgba(31, 139, 76, 0.2)',
                  border: '1px solid #1F8B4C',
                  color: '#4ADE80',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                Cảm ơn bạn đã đăng ký! Mã voucher ưu đãi 10% đã được gửi đến email của bạn.
              </div>
            ) : (
              <form
                onSubmit={handleSubscribe}
                style={{
                  display: 'flex',
                  maxWidth: '520px',
                  margin: '0 auto',
                  gap: '0',
                }}
              >
                <input
                  type="email"
                  required
                  placeholder="Nhập địa chỉ email của bạn..."
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '15px 18px',
                    backgroundColor: '#27272A',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRight: 'none',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '15px 28px',
                    backgroundColor: '#C5A059',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d8b26a')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#C5A059')}
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
