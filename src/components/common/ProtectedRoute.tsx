import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.85rem', fontWeight: 600 }}>
          Đang tải thông tin...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = user?.role?.toUpperCase();
    const hasRole = requiredRoles.some((r) => r.toUpperCase() === userRole || `ROLE_${r.toUpperCase()}` === userRole);
    if (!hasRole) {
      return (
        <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
          <h2>Từ Chối Quyền Truy Cập (403)</h2>
          <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>
            Bạn không có quyền truy cập trang này bằng tài khoản hiện tại.
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
}

