import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Package, Users, Shield, ArrowUpRight, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui';
import { cn } from '../../utils/cn';

interface AdminNavProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function AdminNav({ title, subtitle, actions }: AdminNavProps) {
  const location = useLocation();
  const { user, isAdmin } = useAuth();

  const isProductsActive = location.pathname.startsWith('/admin/products');
  const isUsersActive = location.pathname.startsWith('/admin/users');

  return (
    <div className="mb-6">
      {/* Top Banner & Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-line-light">
        <div>
          <div className="flex items-center gap-2 text-accent-gold mb-1">
            <Shield size={16} className="shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Khu Vực Quản Trị Hệ Thống
            </span>
            <Badge variant={isAdmin ? 'new' : 'vip'} className="ml-1 text-[0.68rem] py-0.5 px-2 font-bold">
              {user?.role || 'ADMIN'}
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-content-primary m-0">
            {title || 'Hệ Thống Quản Trị'}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-content-muted mt-1 m-0">
              {subtitle}
            </p>
          )}
        </div>

        {/* Action buttons (e.g. Refresh, Create new...) */}
        {actions && (
          <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center flex-wrap">
            {actions}
          </div>
        )}
      </div>

      {/* Admin Module Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pt-3 border-b border-line">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/admin/products"
            className={cn(
              'flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold tracking-wide transition-all border-b-2 -mb-[1px]',
              isProductsActive
                ? 'border-accent-gold text-accent-gold font-bold bg-accent-gold/5'
                : 'border-transparent text-content-secondary hover:text-content-primary hover:border-line-light'
            )}
          >
            <Package size={16} />
            <span>Quản Lý Sản Phẩm</span>
          </Link>

          <Link
            to="/admin/users"
            className={cn(
              'flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold tracking-wide transition-all border-b-2 -mb-[1px]',
              isUsersActive
                ? 'border-accent-gold text-accent-gold font-bold bg-accent-gold/5'
                : 'border-transparent text-content-secondary hover:text-content-primary hover:border-line-light'
            )}
          >
            <Users size={16} />
            <span>Quản Lý Người Dùng &amp; Sổ Địa Chỉ</span>
          </Link>
        </div>

        <Link
          to="/"
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-content-muted hover:text-content-primary hover:bg-surface rounded transition-colors whitespace-nowrap"
        >
          <Store size={14} />
          <span className="hidden sm:inline">Về Cửa Hàng</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>
    </div>
  );
}
