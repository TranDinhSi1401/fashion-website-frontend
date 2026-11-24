import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Tag, Users, MessageSquare, BellRing, UserRound, ShieldCheck, Menu, ChevronDown, LogOut, ChartNoAxesCombined, ClipboardCheck, RotateCcw } from 'lucide-react';
import ProtectedRoute from '../common/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import Modal from '../ui/Modal';
import styles from './AdminLayout.module.css';

const modules = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/products', label: 'Quản lý sản phẩm', icon: Package },
  { to: '/admin/orders', label: 'Quản lý đơn hàng', icon: ShoppingCart },
  { to: '/admin/promotions', label: 'Quản lý khuyến mãi', icon: Tag },
  { to: '/admin/users', label: 'Người dùng & sổ địa chỉ', icon: Users },
  { to: '/admin/chat', label: 'Chat hỗ trợ khách hàng', icon: MessageSquare },
  { to: '/admin/notifications', label: 'Thông báo & sự kiện', icon: BellRing },
];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [statisticsExpanded, setStatisticsExpanded] = useState(pathname.startsWith('/admin/statistics'));
  const [loggingOut, setLoggingOut] = useState(false);
  const { user, logout } = useAuth();
  const [showAccount, setShowAccount] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  return <ProtectedRoute requiredRoles={['ADMIN', 'STAFF']}>
    <div className={styles.layout}>
      <aside className={styles.sidebar} aria-label="Thanh quản trị">
        <div className={styles.sidebarInner}>
          <div className={styles.brand}><span><ShieldCheck size={22} /></span><div><strong>Quản trị cửa hàng</strong><small>FASHION WEBSITE</small></div></div>
          <button type="button" className={styles.mobileToggle} aria-expanded={expanded} aria-controls="admin-sidebar-links" onClick={() => setExpanded(v => !v)}><Menu size={18} /> Menu quản trị <ChevronDown size={16} /></button>
          <nav id="admin-sidebar-links" aria-label="Điều hướng quản trị" className={`${styles.navigation} ${expanded ? styles.expanded : ''}`}>
            <p className={styles.sectionLabel}>KHÔNG GIAN LÀM VIỆC</p>
            {modules.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || pathname.startsWith(to + '/');
              return <Link key={to} to={to} onClick={() => setExpanded(false)} aria-current={active ? 'page' : undefined} className={`${styles.navLink} ${active ? styles.active : ''}`}><Icon size={18} /><span>{label}</span></Link>;
            })}
            <div className={styles.statisticsMenu}>
              <button type="button" className={`${styles.navLink} ${styles.statisticsToggle} ${pathname.startsWith('/admin/statistics') ? styles.active : ''}`} aria-expanded={statisticsExpanded} onClick={() => setStatisticsExpanded(value => !value)}>
                <ChartNoAxesCombined size={18} /><span>Thống kê</span><ChevronDown size={15} className={statisticsExpanded ? styles.chevronOpen : ''} />
              </button>
              {statisticsExpanded && (
                <div className={styles.statisticsLinks}>
                  <Link to="/admin/statistics/orders" onClick={() => setExpanded(false)} aria-current={pathname === '/admin/statistics/orders' ? 'page' : undefined} className={pathname === '/admin/statistics/orders' ? styles.subActive : ''}><ShoppingCart size={16} /><span>Thống kê đơn hàng</span></Link>
                  <Link to="/admin/statistics/products" onClick={() => setExpanded(false)} aria-current={pathname === '/admin/statistics/products' ? 'page' : undefined}><ClipboardCheck size={16} /><span>Thống kê sản phẩm</span></Link>
                  <Link to="/admin/statistics/returns" onClick={() => setExpanded(false)} aria-current={pathname === '/admin/statistics/returns' ? 'page' : undefined}><RotateCcw size={16} /><span>Thống kê phiếu trả</span></Link>
                </div>
              )}
            </div>
            <button type="button" className={styles.accountButton} onClick={() => { setShowAccount(true); setExpanded(false); }}>
              <UserRound size={17} /><span>Thông tin tài khoản</span>
            </button>
          </nav>
          <button type="button" className={styles.logoutButton} disabled={loggingOut} onClick={() => void handleLogout()}>
            <LogOut size={17} /><span>{loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</span>
          </button>
        </div>
      </aside>
      <div className={styles.content}><Outlet /></div>
      <Modal isOpen={showAccount} onClose={() => setShowAccount(false)} title="Thông tin tài khoản" maxWidth="560px">
        {user ? (
          <dl className={styles.accountDetails}>
            {[
              ['Tên đăng nhập', user.username],
              ['Họ và tên', user.fullname],
              ['Vai trò', user.role?.replace(/^ROLE_/, '') === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên'],
              ['Email', user.email],
              ['Số điện thoại', user.phone],
              ['Ngày sinh', user.dateOfBirth ? user.dateOfBirth.slice(0, 10).split('-').reverse().join('/') : null],
              ['Giới tính', user.gender === 'MALE' ? 'Nam' : user.gender === 'FEMALE' ? 'Nữ' : user.gender === 'OTHER' ? 'Khác' : null],
              ['Địa chỉ', user.address],
            ].map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value || 'Chưa cập nhật'}</dd></div>
            ))}
          </dl>
        ) : <p className="text-sm text-content-secondary">Chưa tải được thông tin tài khoản.</p>}
      </Modal>
    </div>
  </ProtectedRoute>;
}
