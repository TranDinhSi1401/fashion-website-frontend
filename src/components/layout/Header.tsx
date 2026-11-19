import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Package,
  Search,
  RotateCcw,
  Shield,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Tag,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { cn } from '../../utils/cn';
import { Badge, IconButton } from '../ui';
import MegaMenu from './MegaMenu';
import { categoryService } from '../../services/categoryService';
import { CategoryResponse } from '../../types/category';
import { buildCategoryMenu, groupCategoryIds, groupHref, isNavigationGroupActive } from '../../utils/categoryNavigation';
import HeaderSearch from './HeaderSearch';
import MiniCartDrawer from './MiniCartDrawer';
import NotificationBell from './NotificationBell';
import styles from './Header.module.css';
import { formatCurrencyVND } from '../../utils/format';

function BrandLogo({
  compact = false,
  onClick,
}: {
  compact?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to="/"
      className={cn(
        'flex shrink-0 items-center gap-2 text-content-primary',
        compact ? 'gap-2' : 'gap-2 sm:gap-2.5'
      )}
      aria-label="FashionWeb - Trang chủ"
      onClick={onClick}
    >
      <span className="flex h-8 w-8 items-center justify-center border-2 border-primary bg-primary text-xs font-bold tracking-wide text-content-inverse">
        FW
      </span>
      <span className={styles.logoText}>
        FASHION<span className={styles.logoWeb}>WEB</span>
      </span>
    </Link>
  );
}

export default function Header() {
  const { user, isAuthenticated, isAdmin, isStaff, logout } = useAuth();
  const { cart } = useCart();
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [categoryStatus, setCategoryStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const menus = useMemo(() => ({ ao: buildCategoryMenu('ao', categories), quan: buildCategoryMenu('quan', categories) }), [categories]);
  const hasAccessories = groupCategoryIds('phukien', categories).length > 0;
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState<boolean>(false);
  const [activeMenu, setActiveMenu] = useState<'ao' | 'quan' | null>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState<boolean>(false);
  const [cartPreviewOpen, setCartPreviewOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState<boolean>(false);
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState<'ao' | 'quan' | null>(null);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    let active = true;
    const load = () => categoryService.getCategories().then(response => {
      if (!Array.isArray(response.data)) throw new Error('Invalid category response');
      if (active) { setCategories(response.data); setCategoryStatus('ready'); }
    }).catch(() => { if (active) setCategoryStatus('error'); });
    void load();
    window.addEventListener('focus', load);
    return () => { active = false; window.removeEventListener('focus', load); };
  }, [location.pathname]);

  const routeKey = `${location.pathname}${location.search}`;
  const [prevRouteKey, setPrevRouteKey] = useState<string>(routeKey);

  if (routeKey !== prevRouteKey) {
    setPrevRouteKey(routeKey);
    setDropdownOpen(false);
    setAdminDropdownOpen(false);
    setActiveMenu(null);
    setCartDrawerOpen(false);
    setCartPreviewOpen(false);
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
    setMobileCategoryOpen(null);
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setDropdownOpen(false);
      setAdminDropdownOpen(false);
      setActiveMenu(null);
      setCartPreviewOpen(false);
      setMobileSearchOpen(false);
    };

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    handleScroll();
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const drawer = mobileDrawerRef.current;
    const trigger = mobileMenuTriggerRef.current;
    const getFocusableElements = () =>
      drawer?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
    getFocusableElements()?.[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = getFocusableElements();
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      trigger?.focus();
    };
  }, [mobileMenuOpen]);

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
          'w-full rounded-none text-content-primary',
          styles.header,
          isScrolled && styles.headerScrolled
        )}
      >
        <div
          className={cn(
            'mx-auto flex max-w-container items-center justify-between gap-2.5 px-3.5 sm:gap-5 sm:px-6',
            styles.headerRow,
            isScrolled && styles.compactRow
          )}
        >
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              ref={mobileMenuTriggerRef}
              type="button"
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full text-content-primary hover:bg-surface lg:hidden',
                styles.hamburger
              )}
              onClick={() => {
                setMobileSearchOpen(false);
                setMobileMenuOpen(true);
              }}
              aria-label="Mở menu điều hướng"
              aria-expanded={mobileMenuOpen}
              title="Mở menu"
            >
              <Menu size={22} />
            </button>

            <BrandLogo />
          </div>

          <nav
            aria-label="Điều hướng chính"
            className="hidden items-center gap-2.5 text-sm font-semibold uppercase tracking-wider lg:flex xl:gap-3"
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

            {(categoryStatus !== 'ready' || menus.ao.length > 0) && (
            <div
              onMouseEnter={() => setActiveMenu('ao')}
              className="flex h-full items-center"
            >
              <Link
                to={groupHref('ao')}
                onFocus={() => setActiveMenu('ao')}
                aria-haspopup="true"
                aria-expanded={activeMenu === 'ao'}
                className={cn(
                  styles.navLink,
                  isNavigationGroupActive('ao', location.search, categories) && styles.navLinkActive
                )}
              >
                <span>Áo</span>
                <ChevronDown size={14} />
              </Link>
            </div>
            )}

            {(categoryStatus !== 'ready' || menus.quan.length > 0) && (
            <div
              onMouseEnter={() => setActiveMenu('quan')}
              className="flex h-full items-center"
            >
              <Link
                to={groupHref('quan')}
                onFocus={() => setActiveMenu('quan')}
                aria-haspopup="true"
                aria-expanded={activeMenu === 'quan'}
                className={cn(
                  styles.navLink,
                  isNavigationGroupActive('quan', location.search, categories) && styles.navLinkActive
                )}
              >
                <span>Quần</span>
                <ChevronDown size={14} />
              </Link>
            </div>
            )}

            {hasAccessories && (<Link
              to={groupHref('phukien')}
              className={cn(
                styles.navLink,
                isNavigationGroupActive('phukien', location.search, categories) && styles.navLinkActive
              )}
            >
              Phụ kiện
            </Link>)}

            <Link
              to="/products?tag=sale"
              className={cn(
                styles.saleLink,
                styles.navLink,
                location.search.includes('tag=sale') && styles.navLinkActive
              )}
            >
              <span>Ưu đãi</span>
              <span className={styles.saleBadge}>HOT</span>
            </Link>

            {(isAdmin || isStaff) && (
              <div
                className="relative flex h-full items-center"
                onMouseEnter={() => setAdminDropdownOpen(true)}
                onMouseLeave={() => setAdminDropdownOpen(false)}
              >
                <Link
                  to="/admin/dashboard"
                  onFocus={() => setAdminDropdownOpen(true)}
                  aria-haspopup="true"
                  aria-expanded={adminDropdownOpen}
                  className={cn(
                    'flex items-center gap-1.5',
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
                      <span className={cn('text-[0.68rem] font-bold uppercase tracking-wider', styles.accentText)}>
                        Phân Hệ Quản Trị
                      </span>
                    </div>

                    <Link
                      to="/admin/dashboard"
                      onClick={() => setAdminDropdownOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
                        location.pathname === '/admin/dashboard'
                          ? cn('bg-accent-gold/10', styles.accentText)
                          : 'text-content-primary hover:bg-surface'
                      )}
                    >
                      <LayoutDashboard size={15} className="text-accent-gold" />
                      <span>Dashboard</span>
                    </Link>
                    <Link
                      to="/admin/products"
                      onClick={() => setAdminDropdownOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
                        location.pathname === '/admin/products'
                          ? cn('bg-accent-gold/10', styles.accentText)
                          : 'text-content-primary hover:bg-surface'
                      )}
                    >
                      <Package size={15} className="text-accent-gold" />
                      <span>Quản lý sản phẩm</span>
                    </Link>

                    <Link
                      to="/admin/orders"
                      onClick={() => setAdminDropdownOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
                        location.pathname.startsWith('/admin/orders')
                          ? cn('bg-accent-gold/10', styles.accentText)
                          : 'text-content-primary hover:bg-surface'
                      )}
                    >
                      <ShoppingCart size={15} className="text-accent-gold" />
                      <span>Quản lý đơn hàng</span>
                    </Link>

                    <Link
                      to="/admin/promotions"
                      onClick={() => setAdminDropdownOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
                        location.pathname === '/admin/promotions'
                          ? cn('bg-accent-gold/10', styles.accentText)
                          : 'text-content-primary hover:bg-surface'
                      )}
                    >
                      <Tag size={15} className="text-accent-gold" />
                      <span>Quản lý khuyến mãi</span>
                    </Link>

                    <Link
                      to="/admin/users"
                      onClick={() => setAdminDropdownOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
                        location.pathname === '/admin/users'
                          ? cn('bg-accent-gold/10', styles.accentText)
                          : 'text-content-primary hover:bg-surface'
                      )}
                    >
                      <Users size={15} className="text-accent-gold" />
                      <span>Quản lý người dùng</span>
                    </Link>

                    <Link
                      to="/admin/chat"
                      onClick={() => setAdminDropdownOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
                        location.pathname === '/admin/chat'
                          ? cn('bg-accent-gold/10', styles.accentText)
                          : 'text-content-primary hover:bg-surface'
                      )}
                    >
                      <MessageSquare size={15} className="text-accent-gold" />
                      <span>Chat hỗ trợ &amp; Thông báo</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Search & Action Icons */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <HeaderSearch
              value={currentSearch}
              placeholder="Tìm kiếm sản phẩm..."
              onSearch={handleSearch}
              className={styles.desktopSearch}
            />
            <IconButton
              aria-label="Mở tìm kiếm"
              aria-expanded={mobileSearchOpen}
              title="Tìm kiếm"
              className={styles.searchToggle}
              onClick={() => setMobileSearchOpen((open) => !open)}
              icon={<Search size={19} />}
            />

            {isAuthenticated && <NotificationBell />}

            <div className="relative" ref={dropdownRef}>
              <IconButton
                aria-label="Tài khoản"
                title="Tài khoản"
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
                <div
                  role="region"
                  aria-label="Menu tài khoản"
                  className="animate-slide-up absolute right-0 top-[calc(100%+10px)] z-50 w-72 overflow-hidden rounded-sm border border-line-light bg-surface-elevated shadow-dropdown"
                >
                  {/* Luxury User Header Banner */}
                  <div className="relative overflow-hidden border-b border-line-light bg-gradient-to-br from-surface via-surface-elevated to-surface p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        {user?.avt ? (
                          <img
                            src={user.avt}
                            alt={user.fullname || user.username}
                            className="h-11 w-11 rounded-full object-cover ring-2 ring-accent-gold/40 shadow-xs"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-dark font-bold text-sm text-content-inverse ring-2 ring-accent-gold/30 shadow-xs">
                            {(user?.fullname || user?.username || 'U')[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface-elevated border border-accent-gold/40 shadow-xs">
                          <span className="h-2 w-2 rounded-full bg-status-success animate-pulse" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-content-primary">
                          {user?.fullname || user?.username}
                        </div>
                        <div className="truncate text-[0.72rem] text-content-muted">
                          {user?.email || `@${user?.username}`}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Badge variant={isAdmin ? 'dark' : isStaff ? 'warning' : 'default'}>
                            {isAdmin ? 'ADMINISTRATOR' : isStaff ? 'STAFF OPERATOR' : 'CUSTOMER'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Menu Links */}
                  <div className="p-1.5 text-xs">
                    {/* Section 1: Tài khoản cá nhân */}
                    <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-content-muted">
                      Tài Khoản
                    </div>

                    <Link
                      to="/account/profile"
                      onClick={() => setDropdownOpen(false)}
                      className={cn('group flex items-center justify-between rounded-sm px-3 py-2 text-content-primary transition-colors hover:bg-surface', styles.accentHover)}
                    >
                      <div className="flex items-center gap-2.5">
                        <User size={15} className="text-content-muted group-hover:text-accent-gold transition-colors" />
                        <span className="font-medium">Thông tin tài khoản</span>
                      </div>
                      <ChevronRight size={13} className="text-content-muted/40 group-hover:text-accent-gold transition-colors" />
                    </Link>

                    <Link
                      to="/account/addresses"
                      onClick={() => setDropdownOpen(false)}
                      className={cn('group flex items-center justify-between rounded-sm px-3 py-2 text-content-primary transition-colors hover:bg-surface', styles.accentHover)}
                    >
                      <div className="flex items-center gap-2.5">
                        <MapPin size={15} className="text-content-muted group-hover:text-accent-gold transition-colors" />
                        <span className="font-medium">Sổ địa chỉ nhận hàng</span>
                      </div>
                      <ChevronRight size={13} className="text-content-muted/40 group-hover:text-accent-gold transition-colors" />
                    </Link>

                    <Link
                      to="/account/password"
                      onClick={() => setDropdownOpen(false)}
                      className={cn('group flex items-center justify-between rounded-sm px-3 py-2 text-content-primary transition-colors hover:bg-surface', styles.accentHover)}
                    >
                      <div className="flex items-center gap-2.5">
                        <KeyRound size={15} className="text-content-muted group-hover:text-accent-gold transition-colors" />
                        <span className="font-medium">Đổi mật khẩu</span>
                      </div>
                      <ChevronRight size={13} className="text-content-muted/40 group-hover:text-accent-gold transition-colors" />
                    </Link>

                    <Link
                      to="/account/orders"
                      onClick={() => setDropdownOpen(false)}
                      className={cn('group flex items-center justify-between rounded-sm px-3 py-2 text-content-primary transition-colors hover:bg-surface', styles.accentHover)}
                    >
                      <div className="flex items-center gap-2.5">
                        <Package size={15} className="text-content-muted group-hover:text-accent-gold transition-colors" />
                        <span className="font-medium">Đơn hàng của tôi</span>
                      </div>
                      <ChevronRight size={13} className="text-content-muted/40 group-hover:text-accent-gold transition-colors" />
                    </Link>

                    <Link
                      to="/account/returns"
                      onClick={() => setDropdownOpen(false)}
                      className={cn('group flex items-center justify-between rounded-sm px-3 py-2 text-content-primary transition-colors hover:bg-surface', styles.accentHover)}
                    >
                      <div className="flex items-center gap-2.5">
                        <RotateCcw size={15} className="text-content-muted group-hover:text-accent-gold transition-colors" />
                        <span className="font-medium">Trả hàng &amp; hoàn tiền</span>
                      </div>
                      <ChevronRight size={13} className="text-content-muted/40 group-hover:text-accent-gold transition-colors" />
                    </Link>

                    {/* Section 2: Quản trị hệ thống (Admin & Staff) */}
                    {(isAdmin || isStaff) && (
                      <>
                        <div className="my-1.5 h-px bg-line-light" />
                        <div className={cn('flex items-center gap-1.5 px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider', styles.accentText)}>
                          <ShieldCheck size={12} />
                          <span>Quản Trị Hệ Thống</span>
                        </div>

                        <Link
                          to="/admin/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className={cn('group flex items-center justify-between rounded-sm px-3 py-2 text-content-primary transition-colors hover:bg-accent-gold/10', styles.accentHover)}
                        >
                          <div className="flex items-center gap-2.5">
                            <LayoutDashboard size={15} className="text-accent-gold" />
                            <span className="font-medium">Dashboard</span>
                          </div>
                          <ChevronRight size={13} className="text-accent-gold/40 group-hover:text-accent-gold transition-colors" />
                        </Link>
                        <Link
                          to="/admin/products"
                          onClick={() => setDropdownOpen(false)}
                          className={cn('group flex items-center justify-between rounded-sm px-3 py-2 text-content-primary transition-colors hover:bg-accent-gold/10', styles.accentHover)}
                        >
                          <div className="flex items-center gap-2.5">
                            <Package size={15} className="text-accent-gold" />
                            <span className="font-medium">Quản lý sản phẩm</span>
                          </div>
                          <ChevronRight size={13} className="text-accent-gold/40 group-hover:text-accent-gold transition-colors" />
                        </Link>

                        <Link
                          to="/admin/orders"
                          onClick={() => setDropdownOpen(false)}
                          className={cn('group flex items-center justify-between rounded-sm px-3 py-2 text-content-primary transition-colors hover:bg-accent-gold/10', styles.accentHover)}
                        >
                          <div className="flex items-center gap-2.5">
                            <ShoppingCart size={15} className="text-accent-gold" />
                            <span className="font-medium">Quản lý đơn hàng</span>
                          </div>
                          <ChevronRight size={13} className="text-accent-gold/40 group-hover:text-accent-gold transition-colors" />
                        </Link>

                        <Link
                          to="/admin/promotions"
                          onClick={() => setDropdownOpen(false)}
                          className={cn('group flex items-center justify-between rounded-sm px-3 py-2 text-content-primary transition-colors hover:bg-accent-gold/10', styles.accentHover)}
                        >
                          <div className="flex items-center gap-2.5">
                            <Tag size={15} className="text-accent-gold" />
                            <span className="font-medium">Quản lý khuyến mãi</span>
                          </div>
                          <ChevronRight size={13} className="text-accent-gold/40 group-hover:text-accent-gold transition-colors" />
                        </Link>
                        
                        <Link
                          to="/admin/users"
                          onClick={() => setDropdownOpen(false)}
                          className={cn('group flex items-center justify-between rounded-sm px-3 py-2 text-content-primary transition-colors hover:bg-accent-gold/10', styles.accentHover)}
                        >
                          <div className="flex items-center gap-2.5">
                            <Users size={15} className="text-accent-gold" />
                            <span className="font-medium">Quản lý người dùng</span>
                          </div>
                          <ChevronRight size={13} className="text-accent-gold/40 group-hover:text-accent-gold transition-colors" />
                        </Link>

                        <Link
                          to="/admin/chat"
                          onClick={() => setDropdownOpen(false)}
                          className={cn('group flex items-center justify-between rounded-sm px-3 py-2 text-content-primary transition-colors hover:bg-accent-gold/10', styles.accentHover)}
                        >
                          <div className="flex items-center gap-2.5">
                            <MessageSquare size={15} className="text-accent-gold" />
                            <span className="font-medium">Chat hỗ trợ trực tuyến</span>
                          </div>
                          <ChevronRight size={13} className="text-accent-gold/40 group-hover:text-accent-gold transition-colors" />
                        </Link>
                        <Link
                          to="/admin/returns"
                          onClick={() => setDropdownOpen(false)}
                          className={cn('group flex items-center justify-between rounded-sm px-3 py-2 text-content-primary transition-colors hover:bg-accent-gold/10', styles.accentHover)}
                        >
                          <div className="flex items-center gap-2.5">
                            <RotateCcw size={15} className="text-accent-gold" />
                            <span className="font-medium">Quản lý trả hàng</span>
                          </div>
                          <ChevronRight size={13} className="text-accent-gold/40 group-hover:text-accent-gold transition-colors" />
                        </Link>
                      </>
                    )}

                    {/* Section 3: Đăng xuất */}
                    <div className="my-1.5 h-px bg-line-light" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="group flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-content-primary transition-colors hover:bg-surface font-medium"
                    >
                      <div className="flex items-center gap-2.5">
                        <LogOut size={15} />
                        <span>Đăng xuất</span>
                      </div>
                      <span className="text-[10px] text-content-secondary uppercase tracking-wider font-semibold">
                        Thoát
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div
              className="relative"
              onMouseEnter={() => setCartPreviewOpen(true)}
              onMouseLeave={() => setCartPreviewOpen(false)}
              onFocusCapture={() => setCartPreviewOpen(true)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setCartPreviewOpen(false);
                }
              }}
            >
              <IconButton
                aria-label={`Giỏ hàng, ${cart?.totalQuantity || 0} sản phẩm`}
                title="Giỏ hàng"
                aria-expanded={cartPreviewOpen}
                badgeCount={cart?.totalQuantity || 0}
                badgeVariant="accent"
                onClick={() => setCartDrawerOpen(true)}
                icon={<ShoppingBag size={20} />}
              />
              <div
                className={cn(
                  styles.cartPreview,
                  cartPreviewOpen && styles.cartPreviewOpen
                )}
                aria-hidden={!cartPreviewOpen}
              >
                <div className="flex items-center justify-between border-b border-line-light px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-content-primary">
                    Giỏ hàng của bạn
                  </span>
                  <span className="text-xs text-content-secondary">
                    {cart?.totalQuantity || 0} sản phẩm
                  </span>
                </div>
                {(cart?.items || []).length === 0 ? (
                  <p className="m-0 px-4 py-5 text-xs text-content-secondary">
                    Giỏ hàng của bạn đang trống.
                  </p>
                ) : (
                  <ul className="max-h-60 divide-y divide-line-light overflow-y-auto px-4">
                    {(cart?.items || []).slice(0, 3).map((item) => (
                      <li key={item.id} className="flex items-center gap-3 py-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="h-12 w-10 shrink-0 object-cover"
                          />
                        ) : (
                          <span className="h-12 w-10 shrink-0 bg-surface" aria-hidden="true" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-content-primary">
                            {item.productName}
                          </span>
                          <span className="mt-1 block text-[11px] text-content-secondary">
                            {item.quantity} × {formatCurrencyVND(item.unitPrice)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center justify-between border-t border-line-light px-4 py-3">
                  <span className="text-xs font-semibold text-content-secondary">Tạm tính</span>
                  <span className="text-sm font-bold text-content-primary">
                    {formatCurrencyVND(cart?.totalPrice || 0)}
                  </span>
                </div>
                <Link
                  to="/cart"
                  onClick={() => setCartPreviewOpen(false)}
                  className={cn(
                    'block bg-primary px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-content-inverse',
                    styles.cartPreviewLink
                  )}
                  tabIndex={cartPreviewOpen ? 0 : -1}
                >
                  Xem giỏ hàng
                </Link>
              </div>
            </div>
          </div>
        </div>

        {mobileSearchOpen && (
          <div className={styles.mobileSearchPanel}>
            <div className="mx-auto flex max-w-container items-center gap-2">
              <HeaderSearch
                value={currentSearch}
                placeholder="Tìm kiếm sản phẩm..."
                onSearch={handleSearch}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-content-secondary hover:bg-surface hover:text-content-primary"
                aria-label="Đóng tìm kiếm"
                title="Đóng tìm kiếm"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        <MegaMenu
          isOpen={activeMenu !== null}
          columns={activeMenu ? menus[activeMenu] : []}
          statusMessage={categoryStatus === 'loading' ? 'Đang tải danh mục…' : categoryStatus === 'error' ? 'Chưa tải được danh mục. Tải lại trang để thử.' : 'Chưa có danh mục phù hợp.'}
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
        <div className="fixed inset-0 z-[1100] lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div
            ref={mobileDrawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu điều hướng"
            className={cn(
              'fixed inset-y-0 left-0 w-[84vw] max-w-xs bg-surface-body border-r border-line shadow-2xl flex flex-col z-10 animate-slide-right pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]',
              styles.mobileDrawer
            )}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-line">
              <BrandLogo compact onClick={() => setMobileMenuOpen(false)} />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-content-muted hover:text-content-primary rounded-full hover:bg-surface"
                aria-label="Đóng menu"
                title="Đóng menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mobile Search Input */}
            <div className="p-3.5 border-b border-line bg-surface">
              <HeaderSearch
                value={currentSearch}
                placeholder="Tìm kiếm sản phẩm..."
                onSearch={(q) => {
                  handleSearch(q);
                  setMobileMenuOpen(false);
                }}
                onProductSelect={() => setMobileMenuOpen(false)}
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
                  location.pathname === '/'
                    ? cn('bg-accent-gold/10', styles.accentText)
                    : 'text-content-primary'
                )}
              >
                <span>Trang chủ</span>
              </Link>
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center justify-between p-2.5 rounded hover:bg-surface transition-colors',
                  location.pathname === '/products' && !location.search
                    ? cn('bg-accent-gold/10', styles.accentText)
                    : 'text-content-primary'
                )}
              >
                <span>Sản phẩm</span>
              </Link>
              <Link
                to="/products?tag=new"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center justify-between p-2.5 rounded hover:bg-surface transition-colors',
                  location.search.includes('tag=new')
                    ? cn('bg-accent-gold/10', styles.accentText)
                    : 'text-content-primary'
                )}
              >
                <span>Hàng mới</span>
              </Link>
              {(['ao', 'quan'] as const).filter(category => categoryStatus !== 'ready' || menus[category].length > 0).map((category) => {
                const isOpen = mobileCategoryOpen === category;
                const title = category === 'ao' ? 'Áo' : 'Quần';
                const categoryPath = groupHref(category);
                const links = menus[category].flatMap((column) => column.links);
                return (
                  <div key={category}>
                    <div className="flex items-center rounded hover:bg-surface">
                      <Link
                        to={categoryPath}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex min-h-10 flex-1 items-center rounded p-2.5 transition-colors',
                          isNavigationGroupActive(category, location.search, categories)
                            ? cn('bg-accent-gold/10', styles.accentText)
                            : 'text-content-primary'
                        )}
                      >
                        {title}
                      </Link>
                      <button
                        type="button"
                        aria-label={`${isOpen ? 'Thu gọn' : 'Mở'} danh mục ${title}`}
                        aria-expanded={isOpen}
                        aria-controls={`mobile-category-${category}`}
                        onClick={() => setMobileCategoryOpen(isOpen ? null : category)}
                        className={cn(
                          'mr-2 flex h-8 w-8 items-center justify-center rounded-full text-content-secondary hover:bg-white',
                          styles.mobileAccordionButton
                        )}
                      >
                        <ChevronDown
                          size={16}
                          className={cn('transition-transform', isOpen && 'rotate-180')}
                        />
                      </button>
                    </div>
                    <div
                      id={`mobile-category-${category}`}
                      aria-hidden={!isOpen}
                      inert={!isOpen}
                      className={cn(
                        styles.mobileSubLinks,
                        isOpen && styles.mobileSubLinksOpen
                      )}
                    >
                      <ul className="m-0 list-none py-1 pl-4">
                        {links.map((link) => (
                          <li key={`${category}-${link.to}-${link.label}`}>
                            <Link
                              to={link.to}
                              onClick={() => setMobileMenuOpen(false)}
                              className={cn(
                                'block rounded px-2.5 py-2 text-[11px] font-medium normal-case text-content-secondary hover:bg-surface hover:text-content-primary',
                                styles.drawerLink
                              )}
                            >
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
              {hasAccessories && (<Link
                to={groupHref('phukien')}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center justify-between p-2.5 rounded hover:bg-surface transition-colors',
                  isNavigationGroupActive('phukien', location.search, categories)
                    ? cn('bg-accent-gold/10', styles.accentText)
                    : 'text-content-primary'
                )}
              >
                <span>Phụ kiện</span>
              </Link>)}
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

              {(isAdmin || isStaff) && (
                <div className="pt-3 mt-3 border-t border-line space-y-1">
                  <div className={cn('px-2.5 text-[0.68rem] font-bold uppercase tracking-wider', styles.accentText)}>
                    Phân Hệ Quản Trị
                  </div>
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 p-2.5 rounded text-xs font-semibold text-content-primary hover:bg-surface"
                  >
                    <LayoutDashboard size={16} className="text-accent-gold" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to="/admin/products"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 p-2.5 rounded text-xs font-semibold text-content-primary hover:bg-surface"
                  >
                    <Package size={16} className="text-accent-gold" />
                    <span>Quản lý sản phẩm</span>
                  </Link>
                  
                  <Link
                    to="/admin/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 p-2.5 rounded text-xs font-semibold text-content-primary hover:bg-surface"
                  >
                    <ShoppingCart size={16} className="text-accent-gold" />
                    <span>Quản lý đơn hàng</span>
                  </Link>

                  <Link
                    to="/admin/promotions"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 p-2.5 rounded text-xs font-semibold text-content-primary hover:bg-surface"
                  >
                    <Tag size={16} className="text-accent-gold" />
                    <span>Quản lý khuyến mãi</span>
                  </Link>

                  <Link
                    to="/admin/users"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 p-2.5 rounded text-xs font-semibold text-content-primary hover:bg-surface"
                  >
                    <Users size={16} className="text-accent-gold" />
                    <span>Quản lý người dùng</span>
                  </Link>
                  <Link
                    to="/admin/chat"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 p-2.5 rounded text-xs font-semibold text-content-primary hover:bg-surface"
                  >
                    <MessageSquare size={16} className="text-accent-gold" />
                    <span>Chat hỗ trợ &amp; Thông báo</span>
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
                      <div className={cn('w-8 h-8 rounded-full bg-accent-gold/15 flex items-center justify-center font-bold text-xs', styles.accentText)}>
                        <User size={16} />
                      </div>
                    )}
                    <div className="text-xs min-w-0">
                      <div className="font-bold text-content-primary truncate">{user?.fullname || user?.username}</div>
                      <div className="text-[0.68rem] text-content-muted truncate">{user?.role || 'Khách hàng'}</div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="p-2 text-content-primary hover:bg-surface rounded transition-colors"
                    title="Đăng xuất"
                    aria-label="Đăng xuất"
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
