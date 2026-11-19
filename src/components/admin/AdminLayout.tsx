import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Tag, Users, MessageSquare, BellRing, Store, ArrowUpRight, ShieldCheck, Menu, ChevronDown } from 'lucide-react';
import ProtectedRoute from '../common/ProtectedRoute';
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
            <Link to="/" className={styles.backLink}><Store size={17} /><span>Về cửa hàng</span><ArrowUpRight size={15} /></Link>
          </nav>
        </div>
      </aside>
      <div className={styles.content}><Outlet /></div>
    </div>
  </ProtectedRoute>;
}
