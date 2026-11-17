/**
 * Màn hình Rà soát hồ sơ lưu kho quá 30 ngày chờ phản hồi (Admin Dormant Reviews Page - A3).
 * Tuyến đường: /admin/returns/dormant.
 *
 * RÀO CHẮN PHÂN QUYỀN TUYỆT ĐỐI (CRITICAL ROLE_ADMIN GUARD):
 * Màn hình này CHỈ DÀNH RIÊNG cho người dùng có quyền ROLE_ADMIN.
 * Nhân viên (ROLE_STAFF) và khách hàng không được phép truy cập.
 * Component sẽ tự động chuyển hướng (Redirect) về /admin/returns nếu người dùng không có ROLE_ADMIN.
 *
 * Tính năng chính:
 * - Điều hướng phụ AdminReturnSubNav (chỉ hiển thị tab này cho ROLE_ADMIN).
 * - Danh sách các phiếu trả hàng bị treo quá 30 ngày ở bước chờ khách phản hồi phương án (WAITING_CUSTOMER_FEEDBACK).
 * - Tóm tắt nhật ký CSKH, ngày kích hoạt mốc 30 ngày và nút tác vụ "Điều phối xử lý" sang A2.
 * - Phân trang Spring Data.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  RotateCcw,
  Clock,
  Eye,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { ReturnRequestResponse, SpringPage } from '../types/return';
import { returnAdminService } from '../services/returnAdminService';
import { pageToSpring, formatVND, formatDateTime } from '../utils/returnHelpers';
import AdminReturnSubNav from '../components/returns/AdminReturnSubNav';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Pagination from '../components/ui/Pagination';

/**
 * Chức năng: Hiển thị danh sách các hồ sơ lưu kho quá 30 ngày để Admin quyết định phương án giải quyết dứt điểm.
 *
 * @returns Đầu ra: Thẻ JSX trang rà soát hồ sơ lưu kho > 30 ngày.
 */
export default function AdminDormantReviewsPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Kiểm tra rào chắn quyền hạn ROLE_ADMIN
  const hasAdminRole = Boolean(
    isAdmin ||
    user?.role === 'ADMIN' ||
    user?.role === 'ROLE_ADMIN'
  );

  // State dữ liệu & phân trang
  const [pageData, setPageData] = useState<SpringPage<ReturnRequestResponse> | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Tải dữ liệu hồ sơ treo > 30 ngày từ backend
  useEffect(() => {
    if (!hasAdminRole) return;

    let isMounted = true;

    async function loadDormantReviews() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const springPageIndex = pageToSpring(currentPage);
        const res = await returnAdminService.getDormantReviews(springPageIndex, pageSize);
        if (isMounted && res.data) {
          setPageData(res.data);
        }
      } catch (err: any) {
        if (isMounted) {
          const msg =
            err?.response?.data?.message ||
            err?.message ||
            'Không thể tải danh sách hồ sơ lưu kho quá 30 ngày.';
          setErrorMessage(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDormantReviews();

    return () => {
      isMounted = false;
    };
  }, [hasAdminRole, currentPage, pageSize]);

  // Ngăn chặn truy cập nếu không phải ROLE_ADMIN
  if (!hasAdminRole) {
    return <Navigate to="/admin/returns" replace />;
  }

  const items = pageData?.content || [];
  const totalElements = pageData?.totalElements || 0;
  const totalPages = pageData?.totalPages || 0;

  return (
    <div className="container py-8 max-w-7xl">
      {/* Tiêu đề & Giới thiệu */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold uppercase tracking-wide text-content-primary">
              Hồ Sơ Lưu Kho Quá 30 Ngày
            </h1>
            <Badge variant="warning">Chỉ dành cho Quản trị viên</Badge>
          </div>
          <p className="text-sm text-content-secondary">
            Rà soát và xử lý dứt điểm các kiện hàng hoàn đã về kho nhưng khách hàng không phản hồi
            phương án sau 30 ngày.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => p)}
          disabled={isLoading}
          icon={RefreshCw}
        >
          Làm Mới
        </Button>
      </div>

      {/* Thanh Sub-Nav A1, A3, A4 */}
      <AdminReturnSubNav />

      {/* Thẻ lưu ý quy chế kho vận */}
      <div className="flex items-start gap-3 p-4 bg-surface border border-line-light rounded-sm mb-6">
        <ShieldAlert size={22} className="text-status-warning shrink-0 mt-0.5" />
        <div className="text-xs text-content-primary leading-relaxed">
          <p className="font-semibold text-sm mb-1">
            Quy chế xử lý hàng tồn lưu kho chờ khách phản hồi quá 30 ngày
          </p>
          <p className="text-content-secondary">
            Theo chính sách bảo hộ và lưu kho: Sau 30 ngày kể từ khi kho có kết quả kiểm định QC mà
            khách hàng không xác nhận phương án hoặc bổ sung số tài khoản ngân hàng, Quản trị viên
            (ROLE_ADMIN) có toàn quyền quyết định: chuyển hoàn tiền tự động theo số tài khoản cũ,
            niêm phong tiêu hủy hoặc thanh lý nhập kho bảo lưu giá trị.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-content-secondary mb-3">
        <span>
          Tổng số hồ sơ lưu kho: <strong className="text-content-primary font-mono">{totalElements}</strong>
        </span>
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div className="p-4 bg-surface border border-line-error rounded-sm text-status-error text-sm flex items-center gap-2 mb-6">
          <AlertCircle size={18} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Trạng thái Loading */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-content-muted">
          <div className="w-8 h-8 border-2 border-line border-t-primary rounded-full animate-spin mb-3" />
          <p className="text-sm">Đang tải danh sách hồ sơ lưu kho...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 bg-surface border border-line-light rounded-sm text-center">
          <RotateCcw size={40} className="mx-auto text-status-success mb-3 opacity-80" />
          <h3 className="text-base font-bold text-content-primary mb-1">
            Không có hồ sơ nào bị lưu kho quá 30 ngày
          </h3>
          <p className="text-xs text-content-secondary max-w-md mx-auto">
            Tuyệt vời! Hiện tại không có yêu cầu trả hàng nào bị treo mốc 30 ngày chưa được giải
            quyết.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-line-light rounded-sm bg-surface-body shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface border-b border-line-light text-content-muted font-bold uppercase tracking-wider">
                <th className="py-3 px-3.5">Mã phiếu</th>
                <th className="py-3 px-3.5">Mã đơn hàng</th>
                <th className="py-3 px-3.5">Khách hàng</th>
                <th className="py-3 px-3.5">Ngày tạo</th>
                <th className="py-3 px-3.5">Mốc treo 30 ngày</th>
                <th className="py-3 px-3.5">Nhật ký CSKH</th>
                <th className="py-3 px-3.5 text-right">Tiền hoàn</th>
                <th className="py-3 px-3.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-light">
              {items.map((ret) => (
                <tr key={ret.id} className="hover:bg-surface transition-colors">
                  <td className="py-3 px-3.5 font-mono font-bold text-sm text-content-primary">
                    {ret.returnCode}
                  </td>

                  <td className="py-3 px-3.5 font-mono text-content-secondary">
                    {ret.orderCode}
                  </td>

                  <td className="py-3 px-3.5 text-content-secondary">
                    ID #{ret.userId}
                  </td>

                  <td className="py-3 px-3.5 text-content-secondary">
                    {formatDateTime(ret.createdAt)}
                  </td>

                  <td className="py-3 px-3.5">
                    <span className="inline-flex items-center gap-1 font-mono text-status-error font-semibold">
                      <Clock size={12} />
                      {ret.dormantReviewNotifiedAt
                        ? formatDateTime(ret.dormantReviewNotifiedAt)
                        : '> 30 ngày'}
                    </span>
                  </td>

                  <td className="py-3 px-3.5 max-w-xs">
                    {ret.staffContactLog ? (
                      <p className="text-xs text-content-secondary font-mono truncate" title={ret.staffContactLog}>
                        {ret.staffContactLog}
                      </p>
                    ) : (
                      <span className="text-content-muted text-xs italic">Chưa có liên hệ</span>
                    )}
                  </td>

                  <td className="py-3 px-3.5 text-right font-mono font-bold text-content-primary">
                    {formatVND(ret.refundAmount || 0)}
                  </td>

                  <td className="py-3 px-3.5 text-center">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/admin/returns/${ret.id}`)}
                      icon={Eye}
                    >
                      Điều Phối Xử Lý
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Phân trang 1-based */}
      <div className="mt-6 flex justify-center">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>
    </div>
  );
}
