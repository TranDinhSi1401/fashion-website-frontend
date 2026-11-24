import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tag,
  Users,
  MessageSquare,
  BellRing,
  UserRound,
  ShieldCheck,
  Menu,
  ChevronDown,
  LogOut,
  ChartNoAxesCombined,
  ClipboardCheck,
  RotateCcw,
  Star,
  Mail,
  Phone,
  Calendar,
  MapPin,
  User,
  CheckCircle2,
} from 'lucide-react';
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
                  <Link to="/admin/statistics/reviews" onClick={() => setExpanded(false)} aria-current={pathname === '/admin/statistics/reviews' ? 'page' : undefined} className={pathname === '/admin/statistics/reviews' ? styles.subActive : ''}><Star size={16} /><span>Thống kê đánh giá</span></Link>
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
      <Modal isOpen={showAccount} onClose={() => setShowAccount(false)} title="Hồ sơ tài khoản quản trị" maxWidth="580px">
        {user ? (
          <div className="space-y-4">
            {/* Header Profile Card */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#111111] via-[#1a1a1a] to-[#242424] p-5 text-white shadow-md border border-[#C9A961]/35">
              <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                {/* Avatar */}
                <div className="relative shrink-0">
                  {user.avt ? (
                    <img
                      src={user.avt}
                      alt={user.fullname || user.username}
                      className="h-16 w-16 rounded-full border-2 border-[#C9A961] object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#C9A961] bg-[#2a2a2a] text-xl font-bold text-[#C9A961] shadow-sm">
                      {(user.fullname || user.username).slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[#111111] bg-emerald-500" title="Đang hoạt động" />
                </div>

                {/* Profile Identity */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h3 className="m-0 text-base font-bold text-white tracking-wide">
                      {user.fullname || user.username}
                    </h3>
                    <span className="rounded-full bg-[#C9A961]/20 px-2.5 py-0.5 text-[0.68rem] font-bold text-[#C9A961] border border-[#C9A961]/40 uppercase tracking-wider">
                      {user.role?.replace(/^ROLE_/, '') === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên'}
                    </span>
                  </div>

                  <p className="m-0 mt-0.5 text-xs text-gray-400">
                    @{user.username} • Mã tài khoản: <span className="text-[#C9A961] font-semibold">#{user.id}</span>
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[0.72rem] text-gray-300">
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <CheckCircle2 size={13} />
                      <span>Trạng thái: Hoạt động</span>
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="flex items-center gap-1 text-gray-300">
                      <ShieldCheck size={13} className="text-[#C9A961]" />
                      <span>Quyền hạn hệ thống</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Background Accent Glow */}
              <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-[#C9A961]/10 blur-2xl" />
            </div>

            {/* Thông tin chi tiết - Dạng lưới 2 cột sang trọng có icon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {/* Email */}
              <div className="flex items-start gap-3 rounded-lg border border-[#EAE6DF] bg-[#FAF8F5] p-3 transition-colors hover:border-[#C9A961]/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#FAF3E0] text-[#C9A961]">
                  <Mail size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[0.66rem] font-semibold uppercase tracking-wider text-[#8A8A8A]">Email</span>
                  <p className="m-0 truncate text-xs font-semibold text-[#111111]" title={user.email}>
                    {user.email || 'Chưa cập nhật'}
                  </p>
                </div>
              </div>

              {/* Số điện thoại */}
              <div className="flex items-start gap-3 rounded-lg border border-[#EAE6DF] bg-[#FAF8F5] p-3 transition-colors hover:border-[#C9A961]/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#FAF3E0] text-[#C9A961]">
                  <Phone size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[0.66rem] font-semibold uppercase tracking-wider text-[#8A8A8A]">Số điện thoại</span>
                  <p className="m-0 truncate text-xs font-semibold text-[#111111]">
                    {user.phone || 'Chưa cập nhật'}
                  </p>
                </div>
              </div>

              {/* Giới tính */}
              <div className="flex items-start gap-3 rounded-lg border border-[#EAE6DF] bg-[#FAF8F5] p-3 transition-colors hover:border-[#C9A961]/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#FAF3E0] text-[#C9A961]">
                  <User size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[0.66rem] font-semibold uppercase tracking-wider text-[#8A8A8A]">Giới tính</span>
                  <p className="m-0 text-xs font-semibold text-[#111111]">
                    {user.gender === 'MALE' ? 'Nam' : user.gender === 'FEMALE' ? 'Nữ' : user.gender === 'OTHER' ? 'Khác' : 'Chưa cập nhật'}
                  </p>
                </div>
              </div>

              {/* Ngày sinh */}
              <div className="flex items-start gap-3 rounded-lg border border-[#EAE6DF] bg-[#FAF8F5] p-3 transition-colors hover:border-[#C9A961]/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#FAF3E0] text-[#C9A961]">
                  <Calendar size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[0.66rem] font-semibold uppercase tracking-wider text-[#8A8A8A]">Ngày sinh</span>
                  <p className="m-0 text-xs font-semibold text-[#111111]">
                    {user.dateOfBirth ? user.dateOfBirth.slice(0, 10).split('-').reverse().join('/') : 'Chưa cập nhật'}
                  </p>
                </div>
              </div>

              {/* Địa chỉ làm việc / liên hệ (Full width) */}
              <div className="sm:col-span-2 flex items-start gap-3 rounded-lg border border-[#EAE6DF] bg-[#FAF8F5] p-3 transition-colors hover:border-[#C9A961]/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#FAF3E0] text-[#C9A961]">
                  <MapPin size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[0.66rem] font-semibold uppercase tracking-wider text-[#8A8A8A]">Địa chỉ</span>
                  <p className="m-0 text-xs font-semibold text-[#111111] leading-relaxed">
                    {user.address || 'Chưa cập nhật'}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EAE6DF]">
              <Link
                to="/account/profile"
                onClick={() => setShowAccount(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#111111] bg-[#111111] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[#C9A961] hover:border-[#C9A961] hover:text-black shadow-xs"
              >
                <span>Chỉnh sửa thông tin</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowAccount(false)}
                className="rounded-lg border border-[#EAE6DF] bg-white px-4 py-2 text-xs font-semibold text-[#555555] transition-colors hover:bg-gray-100 hover:text-black"
              >
                Đóng
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-content-secondary">Chưa tải được thông tin tài khoản.</p>
        )}
      </Modal>
    </div>
  </ProtectedRoute>;
}
