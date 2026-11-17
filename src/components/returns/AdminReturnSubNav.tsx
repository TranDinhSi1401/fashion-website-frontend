/**
 * Component thanh điều hướng phụ cho các trang quản trị Trả hàng & Hoàn tiền (Admin Return Sub Navigation).
 * Điều hướng giữa A1 (Danh sách phiếu), A3 (Hồ sơ lưu kho > 30 ngày) và A4 (Lịch nghỉ lễ SLA).
 *
 * RÀO CHẮN PHÂN QUYỀN (ACCESS GUARD):
 * Tab A3 ("Hồ sơ lưu kho > 30 ngày") CHỈ ĐƯỢC PHÉP hiển thị khi người dùng có quyền ROLE_ADMIN.
 * Nhân viên kho/vận hành (ROLE_STAFF) tuyệt đối không nhìn thấy tab này.
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { RotateCcw, AlertTriangle, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

/**
 * Cấu trúc thông tin tab điều hướng quản trị.
 */
interface NavTabItem {
  key: string;
  label: string;
  to: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

/**
 * Danh sách cấu hình các tab điều hướng quản trị phân hệ Trả hàng.
 */
const ADMIN_RETURN_TABS: NavTabItem[] = [
  {
    key: 'list',
    label: 'Danh sách phiếu trả hàng',
    to: '/admin/returns',
    icon: RotateCcw,
  },
  {
    key: 'dormant',
    label: 'Hồ sơ lưu kho >30 ngày',
    to: '/admin/returns/dormant',
    icon: AlertTriangle,
    adminOnly: true, // Rào chắn chỉ cho ROLE_ADMIN
  },
  {
    key: 'holidays',
    label: 'Lịch nghỉ lễ SLA',
    to: '/admin/returns/holidays',
    icon: Calendar,
  },
];

/**
 * Chức năng: Hiển thị thanh tab chuyển đổi giữa các màn hình quản trị của phân hệ Trả hàng.
 *
 * @returns Đầu ra: Thẻ JSX thanh sub-navigation.
 */
export default function AdminReturnSubNav() {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  // Xác định người dùng có quyền quản trị tối cao ROLE_ADMIN hay không
  // Dựa trên cờ isAdmin hoặc giá trị role từ user profile / token
  const hasAdminRole = Boolean(
    isAdmin ||
    user?.role === 'ADMIN' ||
    user?.role === 'ROLE_ADMIN'
  );

  // Lọc danh sách tab: Chỉ hiển thị tab adminOnly nếu có quyền ROLE_ADMIN
  const visibleTabs = ADMIN_RETURN_TABS.filter((tab) => {
    if (tab.adminOnly && !hasAdminRole) {
      return false;
    }
    return true;
  });

  /**
   * Kiểm tra tab có đang active trên URL hiện tại hay không.
   *
   * @param tabItem Cấu hình tab cần kiểm tra.
   * @returns true nếu đang khớp đường dẫn; ngược lại false.
   */
  const isTabActive = (tabItem: NavTabItem): boolean => {
    const currentPath = location.pathname;

    if (tabItem.key === 'dormant') {
      return currentPath.startsWith('/admin/returns/dormant');
    }

    if (tabItem.key === 'holidays') {
      return currentPath.startsWith('/admin/returns/holidays');
    }

    // Tab 'list' khớp khi ở /admin/returns hoặc trang chi tiết /admin/returns/:id
    // nhưng không khớp với /dormant hay /holidays
    if (tabItem.key === 'list') {
      return (
        currentPath === '/admin/returns' ||
        (currentPath.startsWith('/admin/returns/') &&
          !currentPath.startsWith('/admin/returns/dormant') &&
          !currentPath.startsWith('/admin/returns/holidays'))
      );
    }

    return false;
  };

  return (
    <div className="w-full border-b border-line-light bg-surface-body mb-6">
      <nav className="flex space-x-2 overflow-x-auto py-1" aria-label="Điều hướng quản lý trả hàng">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const active = isTabActive(tab);

          return (
            <Link
              key={tab.key}
              to={tab.to}
              className={cn(
                'group inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                active
                  ? 'border-primary text-content-primary font-semibold'
                  : 'border-transparent text-content-secondary hover:text-content-primary hover:border-line'
              )}
            >
              <Icon
                size={16}
                className={cn(
                  'transition-colors',
                  active ? 'text-content-primary' : 'text-content-muted group-hover:text-content-secondary'
                )}
              />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
