import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  KeyRound,
  LogOut,
  MapPin,
  Menu,
  Package,
  Shield,
  ShoppingBag,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { cn } from '../../utils/cn';
import { Badge, IconButton, SearchInput } from '../ui';
import MegaMenu, { MegaMenuColumn } from './MegaMenu';
import MiniCartDrawer from './MiniCartDrawer';
import styles from './Header.module.css';

const MEGA_MENU_DATA: Record<'ao' | 'quan', MegaMenuColumn[]> = {
  ao: [
    {
      title: 'Áo Nam Nổi Bật',
      links: [
        { label: 'Tất cả Áo Nam', to: '/products?category=ao' },
        { label: 'Hàng mới về', to: '/products?category=ao&tag=new' },
        { label: 'Bán chạy nhất', to: '/products?category=ao&sort=popular' },
      ],
    },
    {
      title: 'Áo Thường Ngày',
      links: [
        { label: 'Áo T-Shirt', to: '/products?category=t-shirt' },
        { label: 'Áo Polo', to: '/products?category=polo' },
      ],
    },
    {
      title: 'Công Sở & May Đo',
      links: [
        { label: 'Áo Sơ Mi May Đo', to: '/products?category=so-mi' },
        { label: 'Áo Khoác & Blazer', to: '/products?category=khoac' },
      ],
    },
    {
      title: 'Bộ Sưu Tập',
      links: [
        { label: 'Minimalist Essential', to: '/products?tag=new' },
        { label: 'Ưu đãi đặc biệt', to: '/products?tag=sale' },
      ],
    },
  ],
  quan: [
    {
      title: 'Quần Nam Nổi Bật',
      links: [
        { label: 'Tất cả Quần Nam', to: '/products?category=quan' },
        { label: 'Hàng mới về', to: '/products?category=quan&tag=new' },
      ],
    },
    {
      title: 'Lịch Lãm & Công Sở',
      links: [
        { label: 'Quần Tây May Đo', to: '/products?category=quan-tay' },
        { label: 'Quần Khaki', to: '/products?category=khaki' },
      ],
    },
    {
      title: 'Năng Động',
      links: [
        { label: 'Quần Jeans', to: '/products?category=jeans' },
      ],
    },
    {
      title: 'Phối Đồ Gợi Ý',
      links: [
        { label: 'Smart Casual', to: '/products?category=ao' },
        { label: 'Ưu đãi theo mùa', to: '/products?tag=sale' },
      ],
    },
  ],
};

export default function Header() {
  const { user, isAuthenticated, isAdmin, isStaff, logout } = useAuth();
  const { cart } = useCart();
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState<boolean>(false);
  const [activeMenu, setActiveMenu] = useState<'ao' | 'quan' | null>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}`;
  const [prevRouteKey, setPrevRouteKey] = useState<string>(routeKey);

  if (routeKey !== prevRouteKey) {
    setPrevRouteKey(routeKey);
    setDropdownOpen(false);
    setAdminDropdownOpen(false);
    setActiveMenu(null);
    setCartDrawerOpen(false);
    setMobileMenuOpen(false);
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    handleScroll();
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  const handleSearch = (query: string) => {
    if (query) {
      navigate(`/products?search=${encodeURIComponent(query)}`);
    } else {
      navigate('/products');
    }
  };

  const currentSearch = new URLSearchParams(location.search).get('search') || '';

  return (
    <>
      <header
        onMouseLeave={() => setActiveMenu(null)}
        className={cn(
          'sticky top-0 z-50 w-full rounded-none border-b border-line-light bg-surface-body text-content-primary',
          styles.header,
          isScrolled && 'shadow-header'
        )}
      >
        <div className="mx-auto flex h-14 sm:h-header max-w-container items-center justify-between gap-2.5 sm:gap-6 px-3.5 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Mobile Hamburger Menu Button */}
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded text-content-primary hover:bg-surface lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Mở menu điều hướng"
            >
              <Menu size={22} />
            </button>

            {/* Logo */}
            <Link
              to="/"
              className="flex w-[140px] sm:w-[160px] shrink-0 items-center gap-2 sm:gap-2.5 text-content-primary"
            >
              <div className="flex h-8 w-8 items-center justify-center border-2 border-primary bg-primary text-xs font-bold tracking-wide text-content-inverse">
                FW
              </div>
              <span className="text-sm sm:text-md font-bold uppercase tracking-wider">
                FASHION<span className="font-medium text-accent-gold">WEB</span>
              </span>
            </Link>
          </div>

          {/* Main Navigation */}
          <nav
            aria-label="Điều hướng chính"
            className="hidden items-center gap-3.5 xl:gap-5 text-sm font-semibold uppercase tracking-wider lg:flex"
          >
            <Link
              to="/"
              className={cn(
                styles.navLink,
                location.pathname === '/' && styles.navLinkActive
              )}
            >
              Trang chủ
            </Link>

            <Link
              to="/products"
              className={cn(
                styles.navLink,
                location.pathname === '/products' && !location.search && styles.navLinkActive
              )}
            >
              Sản phẩm
            </Link>

            <Link
              to="/products?tag=new"
              className={cn(
                styles.navLink,
                location.search.includes('tag=new') && styles.navLinkActive
              )}
            >
              Hàng mới
            </Link>

            <div
              onMouseEnter={() => setActiveMenu('ao')}
              className="flex h-header items-center"
            >
              <Link
                to="/products?category=ao"
                className={cn(
                  styles.navLink,
                  location.search.includes('category=ao') && styles.navLinkActive
                )}
              >
                <span>Áo</span>
                <ChevronDown size={14} />
              </Link>
            </div>

            <div
              onMouseEnter={() => setActiveMenu('quan')}
              className="flex h-header items-center"
            >
              <Link
                to="/products?category=quan"
                className={cn(
                  styles.navLink,
                  location.search.includes('category=quan') && styles.navLinkActive
                )}
              >
                <span>Quần</span>
                <ChevronDown size={14} />
              </Link>
            </div>

            <Link
              to="/products?category=phukien"
              className={cn(
                styles.navLink,
                location.search.includes('category=phukien') && styles.navLinkActive
              )}
            >
              Phụ kiện
            </Link>

            <Link
              to="/products?tag=sale"
              className={cn(
                'text-accent-red',
                styles.navLink,
                location.search.includes('tag=sale') && styles.navLinkActive
              )}
            >
              Ưu đãi
            </Link>

            <Link to="/#stores" className={styles.navLink}>
              Cửa hàng
            </Link>

            {(isAdmin || isStaff) && (
              <div
                className="relative flex h-header items-center"
                onMouseEnter={() => setAdminDropdownOpen(true)}
                onMouseLeave={() => setAdminDropdownOpen(false)}
              >
                <Link
                  to="/admin/products"
                  className={cn(
                    'text-accent-gold flex items-center gap-1.5',
                    styles.navLink,
                    location.pathname.startsWith('/admin') && styles.navLinkActive
                  )}
                >
                  <Shield size={14} />
                  <span>Quản trị</span>
                  <ChevronDown size={13} className={cn('transition-transform', adminDropdownOpen && 'rotate-180')} />
                </Link>

                {adminDropdownOpen && (
                  <div className="absolute top-[calc(100%-10px)] left-0 z-50 w-56 rounded-sm border border-line-light bg-surface-elevated shadow-dropdown py-1.5 animate-slide-up">
                    <div className="px-3 py-1.5 border-b border-line-light mb-1">
                      <span className="text-[0.68rem] font-bold uppercase tracking-wider text-accent-gold">
                        Phân Hệ Quản Trị
                      </span>
                    </div>

                    <Link
                      to="/admin/products"
                      onClick={() => setAdminDropdownOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
                        location.pathname === '/admin/products'
                          ? 'bg-accent-gold/10 text-accent-gold'
                          : 'text-content-primary hover:bg-surface'
                      )}
                    >
                      <Package size={15} className="text-accent-gold" />
                      <span>Quản lý sản phẩm</span>
                    </Link>

                    <Link
                      to="/admin/users"
                      onClick={() => setAdminDropdownOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
                        location.pathname === '/admin/users'
                          ? 'bg-accent-gold/10 text-accent-gold'
                          : 'text-content-primary hover:bg-surface'
                      )}
                    >
                      <Users size={15} className="text-accent-gold" />
                      <span>Quản lý người dùng</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Search & Action Icons */}
          <div className="flex shrink-0 items-center gap-2">
            <SearchInput
              value={currentSearch}
              placeholder="Tìm kiếm..."
              onSearch={handleSearch}
              className="hidden sm:flex"
            />

            {/* User Account */}
            <div className="relative" ref={dropdownRef}>
              <IconButton
                aria-label="Tài khoản"
                aria-expanded={dropdownOpen}
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate('/login');
                  } else {
                    setDropdownOpen((prev) => !prev);
                  }
                }}
                icon={
                  user?.avt ? (
                    <img
                      src={user.avt}
                      alt={user.fullname || user.username}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <User size={20} />
                  )
                }
              />

              {dropdownOpen && isAuthenticated && (
                <div className="animate-slide-up absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-sm border border-line-light bg-surface-elevated shadow-dropdown">
                  <div className="border-b border-line-light bg-surface px-4 py-3.5">
                    <div className="text-base font-bold text-content-primary">
                      {user?.fullname || user?.username}
                    </div>
                    <div className="mt-0.5 text-xs text-content-muted">
                      {user?.email || `@${user?.username}`}
                    </div>
                    {user?.role && (
                      <div className="mt-2">
                        <Badge variant={isAdmin ? 'new' : 'vip'}>{user.role}</Badge>
                      </div>
                    )}
                  </div>

                  <div className="py-1.5">
                    <Link
                      to="/account/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-content-primary hover:bg-surface"
                    >
                      <User size={15} />
                      <span>Thông tin tài khoản</span>
                    </Link>

                    <Link
                      to="/account/addresses"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-content-primary hover:bg-surface"
                    >
                      <MapPin size={15} />
                      <span>Sổ địa chỉ nhận hàng</span>
                    </Link>

                    <Link
                      to="/account/password"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-content-primary hover:bg-surface"
                    >
                      <KeyRound size={15} />
                      <span>Đổi mật khẩu</span>
                    </Link>

                    {(isAdmin || isStaff) && (
                      <>
                        <div className="my-1 h-px bg-line-light" />
                        <Link
                          to="/admin/products"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-accent-gold hover:bg-surface"
                        >
                          <Package size={15} />
                          <span>Quản lý sản phẩm</span>
                        </Link>
                        <Link
                          to="/admin/users"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-accent-gold hover:bg-surface"
                        >
                          <Users size={15} />
                          <span>Quản lý người dùng</span>
                        </Link>
                      </>
                    )}

                    <div className="my-1 h-px bg-line-light" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-accent-red hover:bg-surface"
                    >
                      <LogOut size={15} />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Trigger -> MiniCartDrawer */}
            <IconButton
              aria-label="Giỏ hàng"
              badgeCount={cart?.totalQuantity || 0}
              badgeVariant="accent"
              onClick={() => setCartDrawerOpen(true)}
              icon={<ShoppingBag size={20} />}
            />
          </div>
        </div>

        <MegaMenu
          isOpen={activeMenu !== null}
          columns={activeMenu ? MEGA_MENU_DATA[activeMenu] : []}
          onNavigate={() => setActiveMenu(null)}
          onMouseLeave={() => setActiveMenu(null)}
        />
      </header>

      <MiniCartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
      />

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-[84vw] max-w-xs bg-surface-body border-r border-line shadow-2xl flex flex-col z-10 animate-slide-right pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-line">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2"
              >
                <div className="flex h-7 w-7 items-center justify-center border-2 border-primary bg-primary text-xs font-bold tracking-wide text-content-inverse">
                  FW
                </div>
                <span className="text-sm font-bold uppercase tracking-wider">
                  FASHION<span className="font-medium text-accent-gold">WEB</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-content-muted hover:text-content-primary rounded-full hover:bg-surface"
                aria-label="Đóng menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mobile Search Input */}
            <div className="p-3.5 border-b border-line bg-surface">
              <SearchInput
                value={currentSearch}
                placeholder="Tìm kiếm sản phẩm..."
                onSearch={(q) => {
                  handleSearch(q);
                  setMobileMenuOpen(false);
                }}
                className="w-full"
              />
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto p-3.5 space-y-1 text-sm font-semibold uppercase tracking-wider">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center justify-between p-2.5 rounded hover:bg-surface transition-colors',
                  location.pathname === '/' ? 'text-accent-gold bg-accent-gold/10' : 'text-content-primary'
                )}
              >
                <span>Trang chủ</span>
              </Link>
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center justify-between p-2.5 rounded hover:bg-surface transition-colors',
                  location.pathname === '/products' && !location.search ? 'text-accent-gold bg-accent-gold/10' : 'text-content-primary'
                )}
              >
                <span>Sản phẩm</span>
              </Link>
              <Link
                to="/products?tag=new"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center justify-between p-2.5 rounded hover:bg-surface transition-colors',
                  location.search.includes('tag=new') ? 'text-accent-gold bg-accent-gold/10' : 'text-content-primary'
                )}
              >
                <span>Hàng mới</span>
              </Link>
              <Link
                to="/products?category=ao"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center justify-between p-2.5 rounded hover:bg-surface transition-colors',
                  location.search.includes('category=ao') ? 'text-accent-gold bg-accent-gold/10' : 'text-content-primary'
                )}
              >
                <span>Áo nam</span>
              </Link>
              <Link
                to="/products?category=quan"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center justify-between p-2.5 rounded hover:bg-surface transition-colors',
                  location.search.includes('category=quan') ? 'text-accent-gold bg-accent-gold/10' : 'text-content-primary'
                )}
              >
                <span>Quần nam</span>
              </Link>
              <Link
                to="/products?category=phukien"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center justify-between p-2.5 rounded hover:bg-surface transition-colors',
                  location.search.includes('category=phukien') ? 'text-accent-gold bg-accent-gold/10' : 'text-content-primary'
                )}
              >
                <span>Phụ kiện</span>
              </Link>
              <Link
                to="/products?tag=sale"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center justify-between p-2.5 rounded text-accent-red hover:bg-surface transition-colors',
                  location.search.includes('tag=sale') && 'bg-accent-red/10'
                )}
              >
                <span>Ưu đãi đặc quyền</span>
              </Link>
              <Link
                to="/#stores"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 rounded text-content-primary hover:bg-surface transition-colors"
              >
                <span>Hệ thống cửa hàng</span>
              </Link>

              {(isAdmin || isStaff) && (
                <div className="pt-3 mt-3 border-t border-line space-y-1">
                  <div className="px-2.5 text-[0.68rem] font-bold uppercase tracking-wider text-accent-gold">
                    Phân Hệ Quản Trị
                  </div>
                  <Link
                    to="/admin/products"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 p-2.5 rounded text-xs font-semibold text-content-primary hover:bg-surface"
                  >
                    <Package size={16} className="text-accent-gold" />
                    <span>Quản lý sản phẩm</span>
                  </Link>
                  <Link
                    to="/admin/users"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 p-2.5 rounded text-xs font-semibold text-content-primary hover:bg-surface"
                  >
                    <Users size={16} className="text-accent-gold" />
                    <span>Quản lý người dùng</span>
                  </Link>
                </div>
              )}
            </nav>

            {/* Mobile Footer User Section */}
            <div className="p-4 border-t border-line bg-surface">
              {isAuthenticated ? (
                <div className="flex items-center justify-between">
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 min-w-0"
                  >
                    {user?.avt ? (
                      <img src={user.avt} alt="" className="w-8 h-8 rounded-full object-cover border border-line" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-accent-gold/15 text-accent-gold flex items-center justify-center font-bold text-xs">
                        <User size={16} />
                      </div>
                    )}
                    <div className="text-xs min-w-0">
                      <div className="font-bold text-content-primary truncate">{user?.fullname || user?.username}</div>
                      <div className="text-[0.68rem] text-content-muted truncate">{user?.role || 'Khách hàng'}</div>
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="p-2 text-status-error hover:bg-status-error/10 rounded transition-colors"
                    title="Đăng xuất"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center bg-primary text-content-inverse font-bold text-xs uppercase tracking-wider rounded block hover:bg-primary/90 transition-colors"
                >
                  Đăng nhập / Đăng ký
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
