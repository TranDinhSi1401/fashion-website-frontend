import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Sparkles,
  Ruler,
  Leaf,
  ChevronRight,
  ArrowRight,
  MapPin,
  Phone,
  Clock,
  ExternalLink,
  Scissors,
  CheckCircle2,
  Calendar,
  X,
} from 'lucide-react';
import styles from './AboutUsPage.module.css';

interface Showroom {
  id: string;
  city: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  mapEmbedUrl: string;
  directionsUrl: string;
}

const SHOWROOMS: Showroom[] = [
  {
    id: 'hanoi',
    city: 'Hà Nội',
    name: 'FASHION WEBSITE Flagship Tràng Tiền',
    address: 'Số 24 Tràng Tiền, Quận Hoàn Kiếm, Hà Nội [CẦN ĐIỀN]',
    phone: '024 3936 8888 [CẦN ĐIỀN]',
    hours: '09:00 – 21:30 (Thứ 2 – Chủ Nhật)',
    mapEmbedUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3724.096738947321!2d105.85233031538965!3d21.02881269315403!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ab953258757f%3A0x6b6c2a8f82877a5e!2zVHLDoG5nIFRp4buBbiwgSG_DoG4gS2nhur9tLCBIw6AgTuG7mWksIFZp4buHdCBOYW0!5e0!3m2!1svi!2s!4v1650000000000!5m2!1svi!2s',
    directionsUrl: 'https://maps.google.com/?q=24+Trang+Tien+Hoan+Kiem+Hanoi',
  },
  {
    id: 'hcm',
    city: 'TP. Hồ Chí Minh',
    name: 'FASHION WEBSITE The Atelier Đồng Khởi',
    address: 'Tầng 2, 88 Đồng Khởi, Bến Nghé, Quận 1, TP. Hồ Chí Minh [CẦN ĐIỀN]',
    phone: '028 3822 9999 [CẦN ĐIỀN]',
    hours: '09:30 – 22:00 (Thứ 2 – Chủ Nhật)',
    mapEmbedUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.447547854619!2d106.70231571533413!3d10.777000262130312!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f4684b39e31%3A0x40a92f03f3933c06!2zxJDhu5NuZyBLaOG7n2ksIELhur?nIE5naMOpLCBRdeG6rW4gMSwgVGjDoG5oIHBo4buRIEjhu5MgQ2jDrSBNaW5oLCBWaeG7h3QgTmFt!5e0!3m2!1svi!2s!4v1650000000001!5m2!1svi!2s',
    directionsUrl: 'https://maps.google.com/?q=88+Dong+Khoi+Ben+Nghe+District+1+HCMC',
  },
  {
    id: 'danang',
    city: 'Đà Nẵng',
    name: 'FASHION WEBSITE Heritage Bạch Đằng',
    address: '156 Bạch Đằng, Hải Châu 1, Hải Châu, Đà Nẵng [CẦN ĐIỀN]',
    phone: '0236 3888 666 [CẦN ĐIỀN]',
    hours: '09:00 – 21:00 (Thứ 2 – Chủ Nhật)',
    mapEmbedUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3833.918991206199!2d108.22238431527715!3d16.069695043701235!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x314218320498b50f%3A0xa1bfdf9f7a9f7375!2zQuG6oWNoIMSQ4bqxbmcsIEjhuqNpIENow6J1LCDEkMOgIE7hurVuZywgVmnhu4d0IE5hbQ!5e0!3m2!1svi!2s!4v1650000000002!5m2!1svi!2s',
    directionsUrl: 'https://maps.google.com/?q=156+Bach+Dang+Hai+Chau+Da+Nang',
  },
];

export default function AboutUsPage() {
  const [selectedShowroom, setSelectedShowroom] = useState<Showroom>(SHOWROOMS[0]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingName, setBookingName] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingDate, setBookingDate] = useState('');

  // Animated counters on scroll
  const [counts, setCounts] = useState({ year: 0, customers: 0, stores: 0, cities: 0 });
  const [hasAnimated, setHasAnimated] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // SEO Meta updates
    document.title = 'Về Chúng Tôi | FASHION WEBSITE - Thời Trang Nam Cao Cấp';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Scroll Observer for Stats
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 1600;
          const start = performance.now();

          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);

            setCounts({
              year: Math.floor(2018 + easeOutQuart * (2020 - 2018)),
              customers: Math.floor(easeOutQuart * 50),
              stores: Math.floor(easeOutQuart * 12),
              cities: Math.floor(easeOutQuart * 8),
            });

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setCounts({ year: 2020, customers: 50, stores: 12, cities: 8 });
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingName || !bookingPhone) return;
    setBookingSuccess(true);
    setTimeout(() => {
      setBookingSuccess(false);
      setShowBookingModal(false);
      setBookingName('');
      setBookingPhone('');
      setBookingDate('');
    }, 2800);
  };

  return (
    <div className={styles.pageContainer}>
      {/* Schema.org Organization & AboutPage Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            name: 'Về Chúng Tôi - FASHION WEBSITE',
            description:
              'Định hình phong cách hiện đại với những thiết kế tối giản, sắc nét và chất liệu cao cấp dành cho nam giới.',
            mainEntity: {
              '@type': 'Organization',
              name: 'FASHION WEBSITE',
              url: 'https://fashionwebsite.vn',
              logo: 'https://fashionwebsite.vn/logo.png',
              foundingDate: '2020',
              slogan: 'Định hình phong cách hiện đại với những thiết kế tối giản, sắc nét và chất liệu cao cấp.',
              contactPoint: {
                '@type': 'ContactPoint',
                telephone: '+84-24-3936-8888',
                contactType: 'customer service',
                areaServed: 'VN',
                availableLanguage: ['Vietnamese', 'English'],
              },
            },
          }),
        }}
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-6 py-4">
        <ol className="flex items-center gap-2 text-xs text-[#8A8A8A]">
          <li>
            <Link to="/" className="transition-colors hover:text-[#C9A961]">
              Trang chủ
            </Link>
          </li>
          <ChevronRight size={12} className="text-[#CCCCCC]" />
          <li className="font-semibold text-[#111111]" aria-current="page">
            Về chúng tôi
          </li>
        </ol>
      </nav>

      {/* =========================================================================
          1. HERO SECTION: ẢNH TOÀN CHIỀU RỘNG, OVERLAY TỐI & H1
          ========================================================================= */}
      <section className={styles.heroBanner} aria-labelledby="hero-heading">
        <img
          src="https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=1600&auto=format&fit=crop"
          alt="Người mẫu nam trong trang phục may đo tối giản cao cấp FASHION WEBSITE"
          loading="eager"
          className={styles.heroImage}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center text-white">
          <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A961]">
            Khởi nguồn từ niềm đam mê may đo
          </span>
          <h1
            id="hero-heading"
            className={`m-0 text-3xl font-normal sm:text-5xl lg:text-6xl text-white leading-tight ${styles.serifHeading}`}
          >
            Câu Chuyện Của Chúng Tôi
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm sm:text-base font-light leading-relaxed text-[#FAF8F5]/85">
            Định hình phong cách hiện đại với những thiết kế tối giản, sắc nét và chất liệu cao cấp.
            Bản sắc thời trang đương đại dành cho người theo đuổi sự tinh tế trường tồn.
          </p>
        </div>
      </section>

      {/* =========================================================================
          2. CÂU CHUYỆN THƯƠNG HIỆU: BỐ CỤC 2 CỘT + DROP CAP MÀU GOLD
          ========================================================================= */}
      <section id="story" className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Cột 1: Ảnh Editorial Atelier */}
          <div className="lg:col-span-6">
            <div className={styles.editorialImageWrapper}>
              <img
                src="https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=1000&auto=format&fit=crop"
                alt="Xưởng may đo cao cấp với vải tự nhiên và thước đo thủ công"
                loading="lazy"
                className="w-full h-[460px] sm:h-[540px] object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-[#111111]/85 px-4 py-2 text-[0.72rem] tracking-wider text-[#C9A961] backdrop-blur-xs">
                KHOẢNG LẶNG TRONG THẾ GIỚI MAY ĐO THỦ CÔNG
              </div>
            </div>
          </div>

          {/* Cột 2: Văn bản kể nguồn gốc & tầm nhìn */}
          <div className="lg:col-span-6">
            <span className={styles.sectionGoldLine} />
            <h2 className={`mb-6 text-2xl sm:text-4xl text-[#111111] font-normal leading-snug ${styles.serifHeading}`}>
              Khi Thời Trang Trở Thành Tuyên Ngôn Của Sự Tiết Chế
            </h2>

            <div className="space-y-5 text-sm sm:text-[0.92rem] leading-relaxed text-[#444444]">
              <p className={styles.dropCap}>
                FASHION WEBSITE được ấp ủ từ một trăn trở giản đơn: Giữa dòng chảy ồ ạt của xu hướng
                chóng nở sớm tàn, đâu là trang phục thực sự thuộc về một người đàn ông trưởng thành?
                Chúng tôi không tìm kiếm những họa tiết phô trương hay biểu tượng hào nhoáng. Chúng
                tôi theo đuổi vẻ đẹp của sự vừa vặn chuẩn xác, sự êm ái của sợi dệt tự nhiên và tính
                thời thượng không bao giờ lỗi thời.
              </p>
              <p>
                Từ xưởng may nhỏ đầu tiên tại Hà Nội năm 2020, chúng tôi đặt ra quy tắc bất biến: mỗi
                chiếc áo sơ mi, âu phục hay áo polo xuất xưởng đều phải trải qua hàng chục giờ hoàn
                thiện bán thủ công bởi những nghệ nhân giàu kinh nghiệm. Từng đường kim mũi chỉ, độ
                lượn của ve áo cho đến trọng lượng ve dựng (canvas) đều được cân chỉnh để tôn vinh
                vóc dáng quý ông Á Đông một cách tự nhiên nhất.
              </p>
              <blockquote className="my-6 border-l-2 border-[#C9A961] pl-5 italic text-[#222222] font-medium text-base">
                &ldquo;Sự sang trọng đích thực không cố gắng thu hút ánh nhìn, mà là sự lưu giữ không
                thể lãng quên trong tâm trí.&rdquo;
              </blockquote>
              <p>
                Hôm nay, FASHION WEBSITE không chỉ là một tủ đồ mà là người bạn đồng hành cùng quý
                ông trong những cột mốc quan trọng nhất của cuộc đời: từ buổi ký kết hợp đồng, bữa tiệc
                tối ấm cúng đến những chuyến viễn du cuối tuần.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. GIÁ TRỊ CỐT LÕI: 4 THẺ SANG TRỌNG CÓ LINE ICON
          ========================================================================= */}
      <section className="bg-white py-20 lg:py-28 border-y border-[#E8E4DC]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A961]">
              Nguyên Tắc Bất Biến
            </span>
            <h2 className={`mt-3 text-2xl sm:text-4xl text-[#111111] font-normal ${styles.serifHeading}`}>
              Bốn Trụ Cột Định Danh Thương Hiệu
            </h2>
            <p className="mt-3 text-sm text-[#777777] leading-relaxed">
              Mỗi sản phẩm mang nhãn FASHION WEBSITE đều là lời cam kết trọn vẹn đối với chất lượng
              và trải nghiệm sống của quý ông.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Value 1 */}
            <div className={styles.valueCard}>
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-sm bg-[#FAF8F5] text-[#C9A961] border border-[#C9A961]/30">
                <Compass size={24} strokeWidth={1.5} />
              </div>
              <h3 className={`mb-3 text-lg font-semibold text-[#111111] ${styles.serifHeading}`}>
                Tối Giản Đỉnh Cao
              </h3>
              <p className="m-0 text-xs sm:text-sm text-[#666666] leading-relaxed">
                Lược bỏ chi tiết rườm rà để tập trung tuyệt đối vào tỷ lệ hình khối, đường cắt sắc bén
                và phong thái đĩnh đạc tự nhiên.
              </p>
            </div>

            {/* Value 2 */}
            <div className={styles.valueCard}>
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-sm bg-[#FAF8F5] text-[#C9A961] border border-[#C9A961]/30">
                <Sparkles size={24} strokeWidth={1.5} />
              </div>
              <h3 className={`mb-3 text-lg font-semibold text-[#111111] ${styles.serifHeading}`}>
                Chất Liệu Tuyển Chọn
              </h3>
              <p className="m-0 text-xs sm:text-sm text-[#666666] leading-relaxed">
                Chỉ sử dụng sợi dệt tự nhiên hàng đầu thế giới: Len Merino Úc, Lụa Mulberry, Cotton
                Ai Cập và Linen từ vùng Normandie nước Pháp.
              </p>
            </div>

            {/* Value 3 */}
            <div className={styles.valueCard}>
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-sm bg-[#FAF8F5] text-[#C9A961] border border-[#C9A961]/30">
                <Ruler size={24} strokeWidth={1.5} />
              </div>
              <h3 className={`mb-3 text-lg font-semibold text-[#111111] ${styles.serifHeading}`}>
                Vừa Vặn Hoàn Hảo
              </h3>
              <p className="m-0 text-xs sm:text-sm text-[#666666] leading-relaxed">
                Hệ thống rập phom dáng được nghiên cứu chuẩn xác dựa trên dữ liệu trắc đạc hình thể của
                hơn 50.000 quý ông Việt Nam đương đại.
              </p>
            </div>

            {/* Value 4 */}
            <div className={styles.valueCard}>
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-sm bg-[#FAF8F5] text-[#C9A961] border border-[#C9A961]/30">
                <Leaf size={24} strokeWidth={1.5} />
              </div>
              <h3 className={`mb-3 text-lg font-semibold text-[#111111] ${styles.serifHeading}`}>
                Bền Vững &amp; Bền Lâu
              </h3>
              <p className="m-0 text-xs sm:text-sm text-[#666666] leading-relaxed">
                Nói không với thời trang mì ăn liền. Chúng tôi tạo tác những trang phục bạn có thể tự
                tin khoác lên mình suốt một thập kỷ.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. CON SỐ ẤN TƯỢNG: NỀN ĐEN CARBON, ĐẾM TĂNG DẦN
          ========================================================================= */}
      <section ref={statsRef} className="bg-[#111111] py-18 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            {/* Stat 1 */}
            <div className="p-4 border-r border-white/10 last:border-r-0">
              <div className={`text-3xl sm:text-5xl font-bold text-[#C9A961] ${styles.serifHeading}`}>
                {counts.year || 2020}
              </div>
              <div className="mt-2 text-xs uppercase tracking-wider text-gray-400">
                Năm thành lập &amp; định hình
              </div>
            </div>

            {/* Stat 2 */}
            <div className="p-4 border-r border-white/10 last:border-r-0">
              <div className={`text-3xl sm:text-5xl font-bold text-[#C9A961] ${styles.serifHeading}`}>
                {counts.customers || 50}K+
              </div>
              <div className="mt-2 text-xs uppercase tracking-wider text-gray-400">
                Khách hàng thân thiết toàn quốc
              </div>
            </div>

            {/* Stat 3 */}
            <div className="p-4 border-r border-white/10 last:border-r-0">
              <div className={`text-3xl sm:text-5xl font-bold text-[#C9A961] ${styles.serifHeading}`}>
                {counts.stores || 12}+
              </div>
              <div className="mt-2 text-xs uppercase tracking-wider text-gray-400">
                Showroom &amp; Không gian trải nghiệm
              </div>
            </div>

            {/* Stat 4 */}
            <div className="p-4">
              <div className={`text-3xl sm:text-5xl font-bold text-[#C9A961] ${styles.serifHeading}`}>
                {counts.cities || 8}+
              </div>
              <div className="mt-2 text-xs uppercase tracking-wider text-gray-400">
                Tỉnh thành phủ sóng dịch vụ
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. QUY TRÌNH & CHẤT LIỆU: TIMELINE NGANG 4 BƯỚC CÓ ẢNH
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A961]">
            Nghệ Thuật Thủ Công Đương Đại
          </span>
          <h2 className={`mt-3 text-2xl sm:text-4xl text-[#111111] font-normal ${styles.serifHeading}`}>
            Quy Trình Tạo Tác Tinh Tuyển
          </h2>
          <p className="mt-3 text-sm text-[#777777] leading-relaxed">
            Hành trình chuyển hóa từ bản vẽ phác thảo đến tác phẩm thời trang vừa vặn tuyệt đối.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Step 1 */}
          <div className={styles.timelineStep}>
            <div className="relative mb-4 h-48 overflow-hidden rounded-xs border border-[#E8E4DC]">
              <img
                src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop"
                alt="Bản vẽ phác thảo ý tưởng thiết kế thời trang nam"
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              />
              <span className="absolute top-3 left-3 bg-[#111111] px-2.5 py-1 text-xs font-bold text-[#C9A961]">
                BƯỚC 01
              </span>
            </div>
            <h3 className={`text-base font-bold text-[#111111] ${styles.serifHeading}`}>
              Nghiên Cứu &amp; Thiết Kế Rập
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-[#666666] leading-relaxed">
              Mỗi mẫu thiết kế được phát triển từ hàng trăm bản vẽ tay, thử nghiệm trên mannequin 3D
              để đảm bảo tính cân xứng hoàn mỹ giữa vai, ngực và eo.
            </p>
          </div>

          {/* Step 2 */}
          <div className={styles.timelineStep}>
            <div className="relative mb-4 h-48 overflow-hidden rounded-xs border border-[#E8E4DC]">
              <img
                src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800&auto=format&fit=crop"
                alt="Tuyển chọn các sớ vải cao cấp tự nhiên"
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              />
              <span className="absolute top-3 left-3 bg-[#111111] px-2.5 py-1 text-xs font-bold text-[#C9A961]">
                BƯỚC 02
              </span>
            </div>
            <h3 className={`text-base font-bold text-[#111111] ${styles.serifHeading}`}>
              Tuyển Chọn Sợi Vải
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-[#666666] leading-relaxed">
              Chúng tôi hợp tác cùng các nhà dệt danh tiếng tại Ý và Nhật Bản để nhập khẩu những thước
              vải dệt thoi mật độ cao, thoáng khí, co giãn tự nhiên và mềm mại tuyệt đối.
            </p>
          </div>

          {/* Step 3 */}
          <div className={styles.timelineStep}>
            <div className="relative mb-4 h-48 overflow-hidden rounded-xs border border-[#E8E4DC]">
              <img
                src="https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?q=80&w=800&auto=format&fit=crop"
                alt="Nghệ nhân may đo tỉ mỉ từng chi tiết ve áo và khuy nút"
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              />
              <span className="absolute top-3 left-3 bg-[#111111] px-2.5 py-1 text-xs font-bold text-[#C9A961]">
                BƯỚC 03
              </span>
            </div>
            <h3 className={`text-base font-bold text-[#111111] ${styles.serifHeading}`}>
              Cắt May Bán Thủ Công
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-[#666666] leading-relaxed">
              Các chi tiết cốt lõi như tra tay áo, khâu ve áo và đơm khuy sừng tự nhiên được thực
              hiện thủ công tỉ mỉ, giúp trang phục uyển chuyển theo từng cử động cơ thể.
            </p>
          </div>

          {/* Step 4 */}
          <div className={styles.timelineStep}>
            <div className="relative mb-4 h-48 overflow-hidden rounded-xs border border-[#E8E4DC]">
              <img
                src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop"
                alt="Kiểm định nghiêm ngặt thành phẩm trang phục nam"
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              />
              <span className="absolute top-3 left-3 bg-[#111111] px-2.5 py-1 text-xs font-bold text-[#C9A961]">
                BƯỚC 04
              </span>
            </div>
            <h3 className={`text-base font-bold text-[#111111] ${styles.serifHeading}`}>
              Kiểm Định 28 Điểm Chất Lượng
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-[#666666] leading-relaxed">
              Mỗi sản phẩm phải vượt qua bài kiểm tra nghiêm ngặt về độ bền kéo đứt, độ phẳng nếp gấp
              và độ chuẩn xác của số đo trước khi được ủi hơi định hình trao tay khách hàng.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. PHÁT TRIỂN BỀN VỮNG: CAM KẾT MÔI TRƯỜNG & THỜI TRANG TUẦN HOÀN
          ========================================================================= */}
      <section id="sustainability" className="bg-white py-20 lg:py-28 border-t border-[#E8E4DC]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6 order-2 lg:order-1">
              <span className={styles.sectionGoldLine} />
              <h2 className={`mb-6 text-2xl sm:text-4xl text-[#111111] font-normal leading-snug ${styles.serifHeading}`}>
                Cam Kết Bền Vững: Tôn Trọng Con Người &amp; Trái Đất
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-[#555555]">
                Chúng tôi tin rằng đỉnh cao của thời trang hiện đại không chỉ nằm ở vẻ ngoài sang
                trọng, mà còn ở cách nó được tạo ra. Sự phát triển bền vững không phải khẩu hiệu
                tiếp thị, mà là thước đo đạo đức trong mọi quyết định sản xuất của FASHION WEBSITE.
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-[#C9A961] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="m-0 text-sm font-bold text-[#111111]">100% Bao Bì Phân Hủy Sinh Học</h4>
                    <p className="m-0 text-xs sm:text-sm text-[#666666]">
                      Toàn bộ hộp đựng, túi đựng vest và thẻ bài đều sử dụng giấy tái chế FSC và mực
                      in gốc đậu nành an toàn cho hệ sinh thái.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-[#C9A961] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="m-0 text-sm font-bold text-[#111111]">Sợi Dệt Minh Bạch Nguồn Gốc</h4>
                    <p className="m-0 text-xs sm:text-sm text-[#666666]">
                      Hợp tác với các trang trại tuân thủ tiêu chuẩn OEKO-TEX® và Better Cotton Initiative
                      (BCI), không sử dụng hóa chất độc hại trong quá trình nhuộm sợi.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-[#C9A961] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="m-0 text-sm font-bold text-[#111111]">Chính Sách Chăm Sóc &amp; Sửa Chữa Trọn Đời</h4>
                    <p className="m-0 text-xs sm:text-sm text-[#666666]">
                      Cung cấp dịch vụ hạ gấu, bóp eo, đơm lại khuy áo miễn phí trọn đời nhằm kéo dài
                      vòng đời sử dụng của mỗi trang phục.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2">
              <div className={styles.editorialImageWrapper}>
                <img
                  src="https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=1000&auto=format&fit=crop"
                  alt="Vải sợi tự nhiên bền vững thân thiện môi trường"
                  loading="lazy"
                  className="w-full h-[440px] sm:h-[500px] object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. ĐỘI NGŨ NÒNG CỐT: LƯỚI CHÂN DUNG EDITORIAL
          ========================================================================= */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A961]">
            Những Con Người Kiến Tạo
          </span>
          <h2 className={`mt-3 text-2xl sm:text-4xl text-[#111111] font-normal ${styles.serifHeading}`}>
            Đội Ngũ Sáng Lập &amp; Nghệ Nhân
          </h2>
          <p className="mt-3 text-sm text-[#777777] leading-relaxed">
            Họ là những người thổi hồn vào từng thước vải, giữ vững triết lý thời trang tối giản và
            tinh xảo mỗi ngày.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Member 1 */}
          <div className={styles.teamCard}>
            <img
              src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop"
              alt="Lê Gia Huy - Creative Director"
              loading="lazy"
              className={styles.teamImage}
            />
            <div className="p-6">
              <h3 className={`m-0 text-lg font-bold text-[#111111] ${styles.serifHeading}`}>
                Lê Gia Huy [CẦN ĐIỀN]
              </h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#C9A961]">
                Giám Đốc Sáng Tạo (Creative Director)
              </p>
              <p className="mt-3 text-xs sm:text-sm text-[#666666] leading-relaxed italic">
                &ldquo;Trang phục của người đàn ông không nên át đi tính cách của anh ta, mà phải là
                tấm gương phản chiếu sự tự tin sâu thẳm bên trong.&rdquo;
              </p>
            </div>
          </div>

          {/* Member 2 */}
          <div className={styles.teamCard}>
            <img
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=600&auto=format&fit=crop"
              alt="Marc V. Nguyễn - Master Tailor"
              loading="lazy"
              className={styles.teamImage}
            />
            <div className="p-6">
              <h3 className={`m-0 text-lg font-bold text-[#111111] ${styles.serifHeading}`}>
                Marc V. Nguyễn [CẦN ĐIỀN]
              </h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#C9A961]">
                Trưởng Bộ Phận May Đo (Master Tailor)
              </p>
              <p className="mt-3 text-xs sm:text-sm text-[#666666] leading-relaxed italic">
                &ldquo;Độ vừa vặn không chỉ đo bằng thước dây centimet, mà còn đo bằng sự tự do, thoải
                mái tuyệt đối trong từng sải chân và cái bắt tay.&rdquo;
              </p>
            </div>
          </div>

          {/* Member 3 */}
          <div className={styles.teamCard}>
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop"
              alt="Elena Đặng - Head of Materials"
              loading="lazy"
              className={styles.teamImage}
            />
            <div className="p-6">
              <h3 className={`m-0 text-lg font-bold text-[#111111] ${styles.serifHeading}`}>
                Elena Đặng [CẦN ĐIỀN]
              </h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#C9A961]">
                Giám Đốc Chất Liệu &amp; Bền Vững (Head of Materials)
              </p>
              <p className="mt-3 text-xs sm:text-sm text-[#666666] leading-relaxed italic">
                &ldquo;Một thước vải tốt có ngôn ngữ riêng của nó. Nhiệm vụ của chúng tôi là lắng nghe
                và gìn giữ nguyên vẹn cảm xúc xúc giác tự nhiên đó.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. HỆ THỐNG CỬA HÀNG: SHOWROOM SELECTOR + LAZY GOOGLE MAPS IFRAME
          ========================================================================= */}
      <section id="stores" className="bg-[#111111] py-20 lg:py-28 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A961]">
              Không Gian Trải Nghiệm Thực Tế
            </span>
            <h2 className={`mt-3 text-2xl sm:text-4xl text-white font-normal ${styles.serifHeading}`}>
              Hệ Thống Showroom Cao Cấp
            </h2>
            <p className="mt-3 text-sm text-gray-400 leading-relaxed">
              Kính mời quý khách đến trải nghiệm không gian mua sắm tĩnh lặng, thưởng thức trà thơm
              và nhận tư vấn may đo riêng tư cùng chuyên gia stylist.
            </p>
          </div>

          {/* City Selection Tabs */}
          <div className="flex justify-center gap-3 mb-10 flex-wrap">
            {SHOWROOMS.map((sr) => (
              <button
                key={sr.id}
                type="button"
                onClick={() => setSelectedShowroom(sr)}
                className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all rounded-xs border ${
                  selectedShowroom.id === sr.id
                    ? 'border-[#C9A961] bg-[#C9A961] text-black shadow-md'
                    : 'border-white/20 bg-white/5 text-gray-300 hover:border-white/40 hover:text-white'
                }`}
              >
                {sr.city}
              </button>
            ))}
          </div>

          {/* Showroom Details + Map Embed */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#1a1a1a] p-6 sm:p-10 rounded-xs border border-white/10">
            {/* Showroom Info */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-[0.7rem] uppercase tracking-widest text-[#C9A961] font-semibold">
                  {selectedShowroom.city} Flagship
                </span>
                <h3 className={`mt-1 text-xl sm:text-2xl font-bold text-white ${styles.serifHeading}`}>
                  {selectedShowroom.name}
                </h3>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-gray-300">
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-[#C9A961] shrink-0 mt-0.5" />
                  <span>{selectedShowroom.address}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-[#C9A961] shrink-0" />
                  <a href={`tel:${selectedShowroom.phone}`} className="hover:text-[#C9A961] transition-colors">
                    {selectedShowroom.phone}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-[#C9A961] shrink-0" />
                  <span>{selectedShowroom.hours}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <a
                  href={selectedShowroom.directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xs bg-[#C9A961] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black transition-colors hover:bg-[#b5924d]"
                >
                  <MapPin size={14} />
                  <span>Chỉ đường trên Google Maps</span>
                </a>
              </div>
            </div>

            {/* Map Frame */}
            <div className="lg:col-span-7 h-[320px] sm:h-[380px] w-full overflow-hidden rounded-xs border border-white/15">
              <iframe
                title={`Bản đồ ${selectedShowroom.name}`}
                src={selectedShowroom.mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg)' }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. CƠ HỘI NGHỀ NGHIỆP: KHỐI CTA TUYỂN DỤNG
          ========================================================================= */}
      <section id="careers" className="mx-auto max-w-7xl px-6 py-20">
        <div className="relative overflow-hidden rounded-xs border border-[#C9A961]/40 bg-gradient-to-r from-[#FAF8F5] via-white to-[#FAF3E0] p-8 sm:p-14 shadow-sm">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A961]">
              Cơ Hội Nghề Nghiệp
            </span>
            <h2 className={`mt-2 text-2xl sm:text-3xl font-bold text-[#111111] ${styles.serifHeading}`}>
              Cùng Chúng Tôi Kiến Tạo Di Sản Thời Trang Nam
            </h2>
            <p className="mt-4 text-xs sm:text-sm text-[#555555] leading-relaxed">
              Chúng tôi luôn rộng mở chào đón những nhà thiết kế rập tài năng, chuyên viên tư vấn
              phong cách (Stylist) và thợ may bậc thầy chung niềm đam mê tôn vinh quý ông đương đại.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a
                href="mailto:careers@fashionwebsite.vn?subject=[Ứng tuyển FASHION WEBSITE]"
                className="inline-flex items-center gap-2 rounded-xs bg-[#111111] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-[#C9A961] hover:text-black"
              >
                <span>Gửi Hồ Sơ / CV [CẦN ĐIỀN]</span>
                <ArrowRight size={14} />
              </a>
              <span className="text-xs text-[#8A8A8A]">
                Liên hệ: careers@fashionwebsite.vn [CẦN ĐIỀN]
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          10. CTA CUỐI TRANG: KHÁM PHÁ BST MỚI & ĐẶT LỊCH TƯ VẤN STYLIST
          ========================================================================= */}
      <section className="bg-white py-20 border-t border-[#E8E4DC]">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A961]">
            Đồng Hành Cùng Phong Cách Của Bạn
          </span>
          <h2 className={`mt-3 text-3xl sm:text-5xl text-[#111111] font-normal leading-tight ${styles.serifHeading}`}>
            Sẵn Sàng Nâng Tầm Tủ Đồ Quý Ông?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-[#666666] leading-relaxed">
            Khám phá những thiết kế mới nhất hoặc đặt lịch hẹn riêng cùng Stylist chuyên nghiệp để
            tìm ra phom dáng và bảng màu tôn vinh bạn nhất.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/products"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xs bg-[#C9A961] px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-black transition-all hover:bg-[#b5924d] shadow-sm hover:scale-102"
            >
              <span>Khám Phá Bộ Sưu Tập Mới</span>
              <ArrowRight size={15} />
            </Link>

            <button
              type="button"
              onClick={() => setShowBookingModal(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xs border border-[#111111] bg-transparent px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-[#111111] transition-all hover:bg-[#111111] hover:text-white"
            >
              <Calendar size={15} />
              <span>Đặt Lịch Tư Vấn Với Stylist</span>
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          MODAL ĐẶT LỊCH HẸN VỚI STYLIST
          ========================================================================= */}
      {showBookingModal && (
        <div
          onClick={() => setShowBookingModal(false)}
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-xs border border-[#C9A961]/40 bg-[#FAF8F5] p-6 sm:p-8 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setShowBookingModal(false)}
              className="absolute top-4 right-4 rounded-full p-1 text-gray-400 hover:text-black"
              aria-label="Đóng cửa sổ"
            >
              <X size={18} />
            </button>

            {bookingSuccess ? (
              <div className="py-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={30} />
                </div>
                <h3 className={`text-xl font-bold text-[#111111] ${styles.serifHeading}`}>
                  Đặt Lịch Thành Công!
                </h3>
                <p className="mt-2 text-xs text-[#555555] leading-relaxed">
                  Chuyên viên Stylist của FASHION WEBSITE sẽ liên hệ qua số điện thoại của quý khách
                  trong vòng 30 phút để xác nhận khung giờ hẹn.
                </p>
              </div>
            ) : (
              <div>
                <span className="text-[0.68rem] font-bold uppercase tracking-widest text-[#C9A961]">
                  Dịch Vụ Cá Nhân Hóa
                </span>
                <h3 className={`mt-1 text-xl font-bold text-[#111111] ${styles.serifHeading}`}>
                  Đặt Lịch Tư Vấn May Đo &amp; Phối Đồ
                </h3>
                <p className="mt-1 text-xs text-[#666666]">
                  Gặp gỡ Stylist riêng tại Showroom hoặc qua video call 1:1 hoàn toàn miễn phí.
                </p>

                <form onSubmit={handleBookingSubmit} className="mt-5 space-y-3.5 text-xs">
                  <div>
                    <label className="mb-1 block font-semibold text-[#333333]">Họ và tên quý khách *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={bookingName}
                      onChange={(e) => setBookingName(e.target.value)}
                      className="w-full rounded-xs border border-[#CCCCCC] bg-white px-3 py-2 outline-none focus:border-[#C9A961]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-semibold text-[#333333]">Số điện thoại liên hệ *</label>
                    <input
                      type="tel"
                      required
                      placeholder="0901 234 567"
                      value={bookingPhone}
                      onChange={(e) => setBookingPhone(e.target.value)}
                      className="w-full rounded-xs border border-[#CCCCCC] bg-white px-3 py-2 outline-none focus:border-[#C9A961]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-semibold text-[#333333]">Ngày mong muốn hẹn gặp</label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full rounded-xs border border-[#CCCCCC] bg-white px-3 py-2 outline-none focus:border-[#C9A961]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-xs bg-[#111111] py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#C9A961] hover:text-black"
                  >
                    Xác Nhận Đặt Lịch
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
