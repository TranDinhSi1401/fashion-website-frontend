import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, LayoutGrid, MessageSquare } from 'lucide-react';
import { productService } from '../services/productService';
import { ProductResponse } from '../types/product';
import ProductCard from '../components/product/ProductCard';

// Editorial catalog for fallback
const FALLBACK_PRODUCTS: ProductResponse[] = [
  {
    id: 1,
    name: 'Áo T-shirt Nam Regular Fit Cotton',
    slug: 'AO-T-SHIRT-TSN266708-BU',
    description: 'Chất liệu 100% Cotton thoáng mát, co giãn tự nhiên, thấm hút mồ hôi tối ưu.',
    basePrice: 380000,
    categoryId: 1,
    averageRating: 4.9,
    reviewCount: 38,
    isActive: true,
  },
  {
    id: 2,
    name: 'Áo T-shirt Cổ Tròn Basic Trắng',
    slug: 'AO-T-SHIRT-TSN266701',
    description: 'Form dáng hiện đại, dệt sợi bông chải kỹ chống xù lông, viền cổ dệt kim chống dão.',
    basePrice: 350000,
    categoryId: 1,
    averageRating: 5.0,
    reviewCount: 52,
    isActive: true,
  },
  {
    id: 3,
    name: 'Áo T-shirt Rêu Khaki Co Giãn 4 Chiều',
    slug: 'AO-T-SHIRT-TSN266709',
    description: 'Tone màu Earthy rêu phong lịch lãm, công nghệ dệt Double Face đứng form.',
    basePrice: 420000,
    categoryId: 1,
    averageRating: 4.8,
    reviewCount: 29,
    isActive: true,
  },
  {
    id: 4,
    name: 'Áo Polo Pique Dệt Mắt Chim Nam',
    slug: 'AO-POLO-PL260812-BK',
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
    slug: 'AO-SO-MI-SM260114-WH',
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
    slug: 'QUAN-TAY-QT260901-GR',
    description: 'Vải Wool Blend cao cấp đứng form, cạp chun thông minh co giãn nhẹ.',
    basePrice: 650000,
    categoryId: 3,
    averageRating: 4.9,
    reviewCount: 33,
    isActive: true,
  },
  {
    id: 7,
    name: 'Quần Khaki Chino Dáng Slim Fit Màu Be',
    slug: 'QUAN-KHAKI-QK260402-BE',
    description: 'Chất liệu Cotton chải co giãn tốt, đường may 2 kim bền bỉ, phong cách Smart Casual.',
    basePrice: 520000,
    categoryId: 3,
    averageRating: 4.8,
    reviewCount: 27,
    isActive: true,
  },
  {
    id: 8,
    name: 'Áo Khoác Blazer Minimalist Đơn Sắc Đen',
    slug: 'AO-KHOAC-BLAZER-BL2601-BK',
    description: 'Ve áo sắc nét, đệm vai tinh tế tạo phom dáng chuẩn mực cho quý ông lịch lãm.',
    basePrice: 1250000,
    categoryId: 4,
    averageRating: 5.0,
    reviewCount: 19,
    isActive: true,
  },
];

// Category metadata for dynamic banner & breadcrumb mapping
const CATEGORY_META: Record<string, { name: string; title: string; desc: string; categoryId?: number }> = {
  all: {
    name: 'Tất Cả Sản Phẩm',
    title: 'BỘ SƯU TẬP THỜI TRANG 2026',
    desc: 'Định hình phong thái đương đại với các thiết kế may đo cao cấp, đường may sắc sảo và chất liệu tự nhiên thượng hạng của FASHION WEBSITE.',
  },
  ao: {
    name: 'Thời Trang Áo Nam',
    title: 'BỘ SƯU TẬP ÁO NAM',
    desc: 'Bộ sưu tập áo sơ mi, t-shirt, áo polo lịch lãm, hiện đại, được dệt từ sợi tự nhiên cao cấp mang lại sự thoải mái suốt cả ngày dài.',
    categoryId: 1,
  },
  't-shirt': {
    name: 'Áo T-Shirt Nam',
    title: 'ÁO T-SHIRT CAO CẤP',
    desc: 'Thiết kế trẻ trung, năng động với 100% Cotton Compact chống xù lông, thoáng mát và co giãn 4 chiều.',
    categoryId: 1,
  },
  so_mi: {
    name: 'Áo Sơ Mi May Đo',
    title: 'ÁO SƠ MI CÔNG SỞ',
    desc: 'Phom dáng Regular & Slim fit chuẩn mực may đo, công nghệ chống nhăn Easy Care tối ưu thời gian chăm sóc.',
    categoryId: 1,
  },
  polo: {
    name: 'Áo Polo Nam',
    title: 'ÁO POLO SMART CASUAL',
    desc: 'Dệt kim Pique thể thao cao cấp, phối cổ thanh lịch, đáp ứng hoàn hảo từ môi trường công sở đến dạo phố.',
    categoryId: 2,
  },
  quan: {
    name: 'Thời Trang Quần Nam',
    title: 'BỘ SƯU TẬP QUẦN NAM',
    desc: 'Quần tây may đo, quần khaki và jeans tôn dáng, cạp may đo tinh xảo mang lại phong độ chuẩn mực cho phái mạnh.',
    categoryId: 3,
  },
  khoac: {
    name: 'Áo Khoác & Blazer',
    title: 'BỘ SƯU TẬP BLAZER & JACKET',
    desc: 'Kỹ thuật may đo sắc nét, đệm vai êm ái, định hình phong cách quý ông đẳng cấp trong mọi sự kiện.',
    categoryId: 4,
  },
  sale: {
    name: 'Ưu Đãi Đặc Quyền',
    title: 'SPECIAL OFFERS & PROMOTIONS',
    desc: 'Ưu đãi hấp dẫn lên đến 30% cho các sản phẩm trang phục kinh điển giới hạn trong tháng.',
  },
  new: {
    name: 'Hàng Mới Về',
    title: 'NEW ARRIVALS FW26',
    desc: 'Những mẫu trang phục thời thượng nhất vừa được cập bến trong bộ sưu tập mới nhất mùa này.',
  },
};

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dynamic filter accordion states
  const [filterCollapsed, setFilterCollapsed] = useState<Record<string, boolean>>({
    tayAo: false,
    kichCo: false,
    coAo: false,
    formDang: false,
    chatLieu: false,
    mauSac: false,
  });

  // Sidebar filter states
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedSleeve, setSelectedSleeve] = useState<string[]>([]);

  const toggleFilterGroup = (group: string) => {
    setFilterCollapsed((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  // Determine current category/tag from URL params
  const categoryParam = searchParams.get('category') || '';
  const categoryIdParam = searchParams.get('categoryId') || '';
  const tagParam = searchParams.get('tag') || '';
  const searchQuery = searchParams.get('search')?.toLowerCase() || '';

  // Resolve current active category key
  const activeKey = useMemo(() => {
    if (tagParam === 'new') return 'new';
    if (tagParam === 'sale') return 'sale';
    if (categoryParam === 'ao' || categoryParam === 'so-mi' || categoryIdParam === '1') return 'ao';
    if (categoryParam === 'polo' || categoryIdParam === '2') return 'polo';
    if (categoryParam === 't-shirt') return 't-shirt';
    if (categoryParam === 'quan' || categoryParam === 'quan-tay' || categoryParam === 'khaki' || categoryIdParam === '3') return 'quan';
    if (categoryParam === 'khoac' || categoryIdParam === '4') return 'khoac';
    return 'all';
  }, [categoryParam, categoryIdParam, tagParam]);

  const currentMeta = CATEGORY_META[activeKey] || CATEGORY_META.all;

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const res = await productService.getProducts();
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          setProducts(res.data);
        } else {
          setProducts(FALLBACK_PRODUCTS);
        }
      } catch (err) {
        console.warn('API fetch error, using editorial fallback products:', err);
        setProducts(FALLBACK_PRODUCTS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter products dynamically
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search query filter
      if (searchQuery) {
        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery) ||
          (p.slug && p.slug.toLowerCase().includes(searchQuery));
        if (!matchesSearch) return false;
      }

      // Category filter
      if (activeKey === 'ao') {
        if (p.categoryId !== 1 && p.categoryId !== 2) return false;
      } else if (activeKey === 'polo') {
        if (p.categoryId !== 2) return false;
      } else if (activeKey === 't-shirt') {
        if (p.categoryId !== 1) return false;
      } else if (activeKey === 'quan') {
        if (p.categoryId !== 3) return false;
      } else if (activeKey === 'khoac') {
        if (p.categoryId !== 4) return false;
      }

      return true;
    });
  }, [products, searchQuery, activeKey]);

  // Handle category pill click
  const handleSelectPill = (key: string) => {
    if (key === 'all') {
      searchParams.delete('category');
      searchParams.delete('categoryId');
      searchParams.delete('tag');
    } else if (key === 'new' || key === 'sale') {
      searchParams.delete('category');
      searchParams.delete('categoryId');
      searchParams.set('tag', key);
    } else {
      searchParams.delete('tag');
      searchParams.set('category', key);
    }
    setSearchParams(searchParams);
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh', position: 'relative' }}>
      {/* =========================================================================
          DYNAMIC PANORAMIC BANNER (Header & Layout color scheme from OWEN)
          ========================================================================= */}
      <section
        style={{
          position: 'relative',
          width: '100%',
          height: '400px',
          overflow: 'hidden',
          backgroundColor: '#181A20',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(to right, rgba(0, 0, 0, 0.45) 0%, rgba(0, 0, 0, 0.15) 55%, rgba(0, 0, 0, 0.35) 100%), url(https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=2000&q=85)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 32%',
          }}
        />

        {/* Central Dynamic Category Title */}
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#FFFFFF',
            zIndex: 2,
            width: '90%',
          }}
        >
          <h1
            style={{
              fontSize: 'clamp(1.8rem, 4vw, 3.2rem)',
              fontWeight: 900,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              textShadow: '0 4px 20px rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              flexWrap: 'wrap',
            }}
          >
            <span>FASHION WEBSITE</span>
            <span style={{ fontWeight: 300, opacity: 0.6 }}>|</span>
            <span>{currentMeta.title}</span>
          </h1>
        </div>

        {/* Dynamic Glassmorphic Info Card */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '32px',
            maxWidth: '460px',
            backgroundColor: 'rgba(15, 17, 22, 0.68)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            borderRadius: '6px',
            padding: '20px 24px',
            color: '#FFFFFF',
            zIndex: 3,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          }}
        >
          <h2
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              letterSpacing: '0.02em',
              marginBottom: '6px',
            }}
          >
            {currentMeta.name}
          </h2>
          <p
            style={{
              fontSize: '0.82rem',
              lineHeight: 1.55,
              color: 'rgba(255, 255, 255, 0.88)',
            }}
          >
            {currentMeta.desc}
          </p>
        </div>
      </section>

      {/* =========================================================================
          DYNAMIC BREADCRUMB & HORIZONTAL PILL CATEGORIES
          ========================================================================= */}
      <div className="container" style={{ paddingTop: '20px' }}>
        {/* Dynamic Breadcrumb */}
        <div
          style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#666666',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '18px',
          }}
        >
          <Link to="/" style={{ color: '#111111' }}>Trang Chủ</Link>
          <span>&gt;</span>
          <Link to="/products" style={{ color: '#666666' }}>Sản Phẩm</Link>
          {activeKey !== 'all' && (
            <>
              <span>&gt;</span>
              <span style={{ color: '#999999' }}>{currentMeta.name}</span>
            </>
          )}
        </div>

        {/* Dynamic Category Capsule Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '16px',
            borderBottom: '1px solid #EEEEEE',
            scrollbarWidth: 'none',
          }}
        >
          {[
            { id: 'all', label: 'TẤT CẢ SẢN PHẨM' },
            { id: 'new', label: 'HÀNG MỚI VỀ' },
            { id: 'ao', label: 'ÁO NAM' },
            { id: 'polo', label: 'ÁO POLO' },
            { id: 'quan', label: 'QUẦN NAM' },
            { id: 'khoac', label: 'ÁO KHOÁC' },
            { id: 'sale', label: 'ƯU ĐÃI' },
          ].map((cat) => {
            const isSelected = activeKey === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectPill(cat.id)}
                style={{
                  padding: '10px 22px',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  border: isSelected ? '1px solid #000000' : '1px solid #E0E0E0',
                  backgroundColor: isSelected ? '#000000' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#333333',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          MAIN 2-COLUMN LAYOUT: SIDEBAR BỘ LỌC + LƯỚI SẢN PHẨM
          ========================================================================= */}
      <div className="container" style={{ padding: '28px 20px 80px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '260px 1fr',
            gap: '36px',
            alignItems: 'start',
          }}
        >
          {/* LEFT SIDEBAR: BỘ LỌC */}
          <aside
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              borderRight: '1px solid #EEEEEE',
              paddingRight: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: '1px solid #E5E5E5',
              }}
            >
              <h3
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#111111',
                }}
              >
                Bộ Lọc
              </h3>
              <ChevronUp size={18} style={{ color: '#666' }} />
            </div>

            {/* Filter: Kiểu tay áo */}
            <div style={{ borderBottom: '1px solid #F0F0F0', paddingBottom: '16px' }}>
              <div
                onClick={() => toggleFilterGroup('tayAo')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  color: '#222',
                  marginBottom: '10px',
                }}
              >
                <span>Kiểu tay áo</span>
                {filterCollapsed.tayAo ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
              </div>

              {!filterCollapsed.tayAo && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedSleeve.includes('dai')}
                      onChange={(e) => {
                        setSelectedSleeve(
                          e.target.checked
                            ? [...selectedSleeve, 'dai']
                            : selectedSleeve.filter((s) => s !== 'dai')
                        );
                      }}
                      style={{ width: '16px', height: '16px', accentColor: '#000000' }}
                    />
                    <span>Dài tay</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedSleeve.includes('ngan')}
                      onChange={(e) => {
                        setSelectedSleeve(
                          e.target.checked
                            ? [...selectedSleeve, 'ngan']
                            : selectedSleeve.filter((s) => s !== 'ngan')
                        );
                      }}
                      style={{ width: '16px', height: '16px', accentColor: '#000000' }}
                    />
                    <span>Ngắn tay</span>
                  </label>
                </div>
              )}
            </div>

            {/* Filter: Kích cỡ */}
            <div style={{ borderBottom: '1px solid #F0F0F0', paddingBottom: '16px' }}>
              <div
                onClick={() => toggleFilterGroup('kichCo')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  color: '#222',
                  marginBottom: '12px',
                }}
              >
                <span>Kích cỡ</span>
                {filterCollapsed.kichCo ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
              </div>

              {!filterCollapsed.kichCo && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {['S', 'M', 'L', 'XL', 'XXL', '2XL'].map((sz) => {
                    const isPicked = selectedSize === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedSize(isPicked ? '' : sz)}
                        style={{
                          height: '38px',
                          border: isPicked ? '1px solid #000000' : '1px solid #E2E2E2',
                          backgroundColor: isPicked ? '#000000' : '#FFFFFF',
                          color: isPicked ? '#FFFFFF' : '#444444',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          borderRadius: '2px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Filter: Kiểu cổ áo */}
            <div style={{ borderBottom: '1px solid #F0F0F0', paddingBottom: '14px' }}>
              <div
                onClick={() => toggleFilterGroup('coAo')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  color: '#222',
                }}
              >
                <span>Kiểu cổ áo</span>
                <ChevronDown size={15} />
              </div>
            </div>

            {/* Filter: Form dáng */}
            <div style={{ borderBottom: '1px solid #F0F0F0', paddingBottom: '14px' }}>
              <div
                onClick={() => toggleFilterGroup('formDang')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  color: '#222',
                }}
              >
                <span>Form dáng</span>
                <ChevronDown size={15} />
              </div>
            </div>

            {/* Filter: Chất liệu */}
            <div style={{ borderBottom: '1px solid #F0F0F0', paddingBottom: '14px' }}>
              <div
                onClick={() => toggleFilterGroup('chatLieu')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  color: '#222',
                }}
              >
                <span>Chất liệu</span>
                <ChevronDown size={15} />
              </div>
            </div>

            {/* Filter: Màu sắc */}
            <div style={{ borderBottom: '1px solid #F0F0F0', paddingBottom: '14px' }}>
              <div
                onClick={() => toggleFilterGroup('mauSac')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  color: '#222',
                }}
              >
                <span>Màu sắc</span>
                <ChevronDown size={15} />
              </div>
            </div>
          </aside>

          {/* RIGHT COLUMN: PRODUCT GRID */}
          <div>
            {/* Top Toolbar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '18px',
                borderBottom: '1px solid #EEEEEE',
                marginBottom: '24px',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#333333' }}>
                « {filteredProducts.length} sản phẩm
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#666' }}>
                <span>Hiển thị</span>
                <LayoutGrid size={18} style={{ color: '#111111', cursor: 'pointer' }} />
              </div>
            </div>

            {/* Products Grid */}
            {isLoading ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: '24px',
                }}
              >
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ width: '100%', aspectRatio: '1 / 1.15', backgroundColor: '#F0F0F2', borderRadius: '4px' }} />
                    <div style={{ width: '60%', height: '14px', backgroundColor: '#EAEAEA' }} />
                    <div style={{ width: '40%', height: '14px', backgroundColor: '#EAEAEA' }} />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '28px',
                }}
              >
                {filteredProducts.map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
                Không tìm thấy sản phẩm nào phù hợp với bộ lọc hiện tại.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Bottom-Right Support Icons */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 999,
        }}
      >
        <a
          href="https://m.me/"
          target="_blank"
          rel="noreferrer"
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: '#1C1C1E',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
          aria-label="Tin nhắn"
        >
          <MessageSquare size={20} />
        </a>

        <a
          href="https://zalo.me/"
          target="_blank"
          rel="noreferrer"
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: '#0068FF',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.78rem',
            fontWeight: 800,
            boxShadow: '0 4px 16px rgba(0,104,255,0.35)',
            textDecoration: 'none',
          }}
          aria-label="Zalo"
        >
          Zalo
        </a>
      </div>
    </div>
  );
}
