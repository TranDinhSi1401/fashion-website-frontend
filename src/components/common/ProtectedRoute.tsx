import { ReactNode } from 'react';
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="uppercase tracking-wider text-[0.85rem] font-semibold text-content-secondary">
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
        <div className="container py-20 px-5 text-center">
          <h2>Từ Chối Quyền Truy Cập (403)</h2>
          <p className="mt-3 text-content-muted">
            Bạn không có quyền truy cập trang này bằng tài khoản hiện tại.
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
}
