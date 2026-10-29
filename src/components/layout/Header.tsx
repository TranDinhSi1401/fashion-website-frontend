import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, User, ShoppingBag, ChevronDown, Shield, LogOut, Package, MapPin, KeyRound, Users, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import Badge from '../ui/Badge';

export default function Header() {
  const { user, isAuthenticated, isAdmin, isStaff, logout } = useAuth();
  const { cart } = useCart();
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setDropdownOpen(false);
    setActiveMenu(null);
  }, [location.pathname, location.search]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  return (
    <header
      style={{
        backgroundColor: '#000000',
        color: '#FFFFFF',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '68px',
          gap: '16px',
        }}
      >
        {/* Brand Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
            color: '#FFFFFF',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '2px solid #FFFFFF',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '0.8rem',
              letterSpacing: '0.05em',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 100%)',
            }}
          >
            <span>FW</span>
          </div>

          <span
            style={{
              fontSize: '1.25rem',
              fontWeight: 900,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#FFFFFF',
            }}
          >
            FASHION<span style={{ color: 'var(--color-accent-gold)', fontWeight: 400 }}>WEBSITE</span>
          </span>
        </Link>

        {/* Clean Responsive Nav Menu without Scrollbar */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            fontSize: '0.82rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <Link
            to="/"
            style={{
              color: location.pathname === '/' ? 'var(--color-accent-gold)' : '#FFFFFF',
              whiteSpace: 'nowrap',
              padding: '6px 0',
              transition: 'color 0.15s',
              borderBottom: location.pathname === '/' ? '2px solid var(--color-accent-gold)' : '2px solid transparent',
            }}
          >
            Trang Chủ
          </Link>

          <Link
            to="/products"
            style={{
              color: location.pathname === '/products' && !location.search ? 'var(--color-accent-gold)' : '#FFFFFF',
              whiteSpace: 'nowrap',
              padding: '6px 0',
              transition: 'color 0.15s',
              borderBottom: location.pathname === '/products' && !location.search ? '2px solid var(--color-accent-gold)' : '2px solid transparent',
            }}
          >
            Sản Phẩm
          </Link>

          <Link
            to="/products?tag=new"
            style={{
              color: location.search.includes('tag=new') ? 'var(--color-accent-gold)' : '#FFFFFF',
              whiteSpace: 'nowrap',
              padding: '6px 0',
              transition: 'color 0.15s',
            }}
          >
            Hàng mới về
          </Link>

          {/* Áo Dropdown trigger */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setActiveMenu('ao')}
            onMouseLeave={() => setActiveMenu(null)}
          >
            <Link
              to="/products?category=ao"
              style={{
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                padding: '6px 0',
              }}
            >
              Áo <ChevronDown size={13} />
            </Link>

            {activeMenu === 'ao' && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  backgroundColor: '#111114',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  minWidth: '190px',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
                  borderRadius: '4px',
                  padding: '8px 0',
                  zIndex: 1100,
                }}
              >
                <Link to="/products?category=ao" style={{ display: 'block', padding: '9px 18px', color: '#FFF', fontSize: '0.8rem', fontWeight: 700 }}>
                  Tất cả Áo Nam
                </Link>
                <Link to="/products?category=t-shirt" style={{ display: 'block', padding: '8px 18px', color: '#CCC', fontSize: '0.8rem' }}>
                  Áo T-Shirt
                </Link>
                <Link to="/products?category=polo" style={{ display: 'block', padding: '8px 18px', color: '#CCC', fontSize: '0.8rem' }}>
                  Áo Polo
                </Link>
                <Link to="/products?category=so-mi" style={{ display: 'block', padding: '8px 18px', color: '#CCC', fontSize: '0.8rem' }}>
                  Áo Sơ Mi May Đo
                </Link>
                <Link to="/products?category=khoac" style={{ display: 'block', padding: '8px 18px', color: '#CCC', fontSize: '0.8rem' }}>
                  Áo Khoác & Blazer
                </Link>
              </div>
            )}
          </div>

          {/* Quần Dropdown trigger */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setActiveMenu('quan')}
            onMouseLeave={() => setActiveMenu(null)}
          >
            <Link
              to="/products?category=quan"
              style={{
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                padding: '6px 0',
              }}
            >
              Quần <ChevronDown size={13} />
            </Link>

            {activeMenu === 'quan' && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  backgroundColor: '#111114',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  minWidth: '190px',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
                  borderRadius: '4px',
                  padding: '8px 0',
                  zIndex: 1100,
                }}
              >
                <Link to="/products?category=quan" style={{ display: 'block', padding: '9px 18px', color: '#FFF', fontSize: '0.8rem', fontWeight: 700 }}>
                  Tất cả Quần Nam
                </Link>
                <Link to="/products?category=quan-tay" style={{ display: 'block', padding: '8px 18px', color: '#CCC', fontSize: '0.8rem' }}>
                  Quần Tây May Đo
                </Link>
                <Link to="/products?category=khaki" style={{ display: 'block', padding: '8px 18px', color: '#CCC', fontSize: '0.8rem' }}>
                  Quần Khaki
                </Link>
                <Link to="/products?category=jeans" style={{ display: 'block', padding: '8px 18px', color: '#CCC', fontSize: '0.8rem' }}>
                  Quần Jeans
                </Link>
              </div>
            )}
          </div>

          <Link
            to="/products?category=phukien"
            style={{ color: '#FFFFFF', whiteSpace: 'nowrap', padding: '6px 0' }}
          >
            Phụ kiện
          </Link>

          <Link
            to="/products?tag=sale"
            style={{ color: '#FF4D4D', whiteSpace: 'nowrap', padding: '6px 0', fontWeight: 800 }}
          >
            Ưu đãi
          </Link>

          <Link
            to="/#stores"
            style={{ color: '#FFFFFF', whiteSpace: 'nowrap', padding: '6px 0' }}
          >
            Cửa hàng
          </Link>

          {(isAdmin || isStaff) && (
            <Link
              to="/admin/products"
              style={{
                color: '#C5A059',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                padding: '6px 0',
              }}
            >
              <Shield size={13} /> Quản trị
            </Link>
          )}
        </nav>

        {/* Action Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Search Button */}
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            style={{
              width: '38px',
              height: '38px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer',
              border: 'none',
              transition: 'background-color 0.15s',
            }}
            aria-label="Tìm kiếm"
          >
            <Search size={18} />
          </button>

          {/* User Account Button & Dropdown */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) {
                  navigate('/login');
                } else {
                  setDropdownOpen(!dropdownOpen);
                }
              }}
              style={{
                width: '38px',
                height: '38px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                cursor: 'pointer',
                border: 'none',
              }}
              aria-label="Tài khoản"
            >
              {user?.avt ? (
                <img
                  src={user.avt}
                  alt={user.fullname || user.username}
                  style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <User size={18} />
              )}
            </button>

            {dropdownOpen && isAuthenticated && (
              <div
                className="animate-slide-up"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '240px',
                  backgroundColor: '#141416',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 16px 36px rgba(0,0,0,0.6)',
                  borderRadius: '6px',
                  zIndex: 1100,
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#1C1C20' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF' }}>
                    {user?.fullname || user?.username}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#999', marginTop: '2px' }}>
                    {user?.email || `@${user?.username}`}
                  </div>
                  {user?.role && (
                    <div style={{ marginTop: '6px' }}>
                      <Badge variant={isAdmin ? 'dark' : 'default'}>{user.role}</Badge>
                    </div>
                  )}
                </div>

                <div style={{ padding: '6px 0' }}>
                  <Link
                    to="/account/profile"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '0.82rem', color: '#EEE' }}
                  >
                    <User size={15} /> Thông tin tài khoản
                  </Link>

                  <Link
                    to="/account/addresses"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '0.82rem', color: '#EEE' }}
                  >
                    <MapPin size={15} /> Sổ địa chỉ nhận hàng
                  </Link>

                  <Link
                    to="/account/password"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '0.82rem', color: '#EEE' }}
                  >
                    <KeyRound size={15} /> Đổi mật khẩu
                  </Link>

                  {(isAdmin || isStaff) && (
                    <>
                      <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                      <Link
                        to="/admin/products"
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', fontSize: '0.82rem', color: '#C5A059' }}
                      >
                        <Package size={15} /> Quản lý sản phẩm
                      </Link>
                      <Link
                        to="/admin/users"
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', fontSize: '0.82rem', color: '#C5A059' }}
                      >
                        <Users size={15} /> Quản lý người dùng
                      </Link>
                    </>
                  )}

                  <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 16px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#FF6B6B',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <LogOut size={15} /> Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cart Button */}
          <Link
            to="/cart"
            style={{
              width: '38px',
              height: '38px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              position: 'relative',
            }}
            aria-label="Giỏ hàng"
          >
            <ShoppingBag size={18} />
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#D0021B',
                color: '#FFFFFF',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                fontSize: '0.65rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {cart?.totalQuantity || 0}
            </span>
          </Link>
        </div>
      </div>

      {/* Slide-Down Quick Search Drawer */}
      {searchOpen && (
        <div
          style={{
            backgroundColor: '#111114',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '16px 0',
          }}
        >
          <div className="container">
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="text"
                placeholder="Tìm kiếm áo sơ mi, polo, quần tây, t-shirt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  outline: 'none',
                  fontSize: '0.9rem',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  fontSize: '0.82rem',
                }}
              >
                Tìm Kiếm
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                style={{ color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', background: 'none', border: 'none' }}
              >
                <X size={22} />
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
