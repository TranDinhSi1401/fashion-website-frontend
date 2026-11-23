import React from 'react';
import { Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui';

interface AdminNavProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function AdminNav({ title, subtitle, actions }: AdminNavProps) {
  const { user, isAdmin } = useAuth();

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

    </div>
  );
}
