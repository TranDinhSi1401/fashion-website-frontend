/**
 * Màn hình Quản lý danh sách phiếu yêu cầu Trả hàng & Hoàn tiền dành cho Quản trị viên và Nhân viên (A1).
 * Tuyến đường: /admin/returns.
 *
 * Tính năng chính:
 * - Điều hướng phụ AdminReturnSubNav liên kết các màn hình A1, A3, A4.
 * - Bộ lọc đa tiêu chí: Trạng thái (All + 8 trạng thái), ô tìm kiếm mã đơn debounce 300ms, cờ lọc quá hạn SLA.
 * - Bảng dữ liệu: Mã phiếu, Mã đơn hàng, Khách hàng, Ngày tạo, Huy hiệu trạng thái, Huy hiệu SLA, Số tiền hoàn và nút tác vụ "Xử lý".
 * - Phân trang 1-based đồng bộ 2 chiều với phân trang 0-based của Spring Data Pageable.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  AlertTriangle,
  RotateCcw,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import type { ReturnRequestResponse, ReturnRequestStatus, SpringPage } from '../types/return';
import { returnAdminService } from '../services/returnAdminService';
import { RETURN_STATUS_META } from '../constants/returnMeta';
import { pageToSpring, formatVND, formatDateTime } from '../utils/returnHelpers';
import AdminReturnSubNav from '../components/returns/AdminReturnSubNav';
import ReturnStatusBadge from '../components/returns/ReturnStatusBadge';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Checkbox from '../components/ui/Checkbox';
import Pagination from '../components/ui/Pagination';

/**
 * Chức năng: Hiển thị giao diện danh sách phiếu trả hàng, bộ lọc tìm kiếm và phân trang kết quả quản trị.
 *
 * @returns Đầu ra: Thẻ JSX trang quản lý danh sách phiếu trả hàng.
 */
type StatusFilterValue = ReturnRequestStatus | 'REFUNDED_UNRESTOCKED' | '';

export default function AdminReturnsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State bộ lọc (đồng bộ khởi tạo từ query params để hỗ trợ deep-link từ Dashboard)
  const initialStatusParam = searchParams.get('status');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>(() =>
    initialStatusParam === 'REFUNDED_UNRESTOCKED' ||
    (initialStatusParam && initialStatusParam in RETURN_STATUS_META)
      ? (initialStatusParam as StatusFilterValue)
      : ''
  );
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedOrderCode, setDebouncedOrderCode] = useState<string>('');
  const [isOverdueOnly, setIsOverdueOnly] = useState<boolean>(
    () => searchParams.get('isOverdue') === 'true'
  );

  // State dữ liệu & phân trang
  const [pageData, setPageData] = useState<SpringPage<ReturnRequestResponse> | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Cơ chế debounce 300ms cho ô tìm kiếm mã đơn hàng
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedOrderCode(searchInput.trim());
      // Reset về trang 1 khi từ khóa tìm kiếm thay đổi
      setCurrentPage(1);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  // Reset trang về 1 khi thay đổi trạng thái hoặc cờ quá hạn
  const syncFilterParams = (nextStatus: StatusFilterValue, nextOverdue: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (nextStatus) {
      next.set('status', nextStatus);
    } else {
      next.delete('status');
    }
    if (nextOverdue) {
      next.set('isOverdue', 'true');
    } else {
      next.delete('isOverdue');
    }
    setSearchParams(next, { replace: true });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as StatusFilterValue;
    setStatusFilter(val);
    setCurrentPage(1);
    syncFilterParams(val, isOverdueOnly);
  };

  const handleOverdueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsOverdueOnly(checked);
    setCurrentPage(1);
    syncFilterParams(statusFilter, checked);
  };

  // Tải dữ liệu từ Backend theo các tiêu chí lọc
  useEffect(() => {
    let isMounted = true;

    async function loadReturns() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        if (statusFilter === 'REFUNDED_UNRESTOCKED') {
          const allRefunded: ReturnRequestResponse[] = [];
          const firstRes = await returnAdminService.searchReturns({
            status: 'REFUNDED',
            orderCode: debouncedOrderCode || undefined,
            isOverdue: isOverdueOnly ? true : undefined,
            page: 0,
            size: 100,
          });
          if (firstRes.data?.content) {
            allRefunded.push(...firstRes.data.content);
          }
          const serverTotalPages = firstRes.data?.totalPages || 1;
          for (let p = 1; p < serverTotalPages; p++) {
            const nextRes = await returnAdminService.searchReturns({
              status: 'REFUNDED',
              orderCode: debouncedOrderCode || undefined,
              isOverdue: isOverdueOnly ? true : undefined,
              page: p,
              size: 100,
            });
            if (nextRes.data?.content) {
              allRefunded.push(...nextRes.data.content);
            }
          }

          const unrestocked = allRefunded.filter((ret) => !ret.restockedAt);
          const totalElements = unrestocked.length;
          const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
          const safePage = Math.min(currentPage, totalPages);
          const startIdx = (safePage - 1) * pageSize;
          const sliced = unrestocked.slice(startIdx, startIdx + pageSize);

          if (isMounted) {
            setPageData({
              content: sliced,
              totalElements,
              totalPages: totalElements === 0 ? 0 : totalPages,
              number: safePage - 1,
              size: pageSize,
              first: safePage <= 1,
              last: safePage >= totalPages,
            });
          }
        } else {
          const springPageIndex = pageToSpring(currentPage);
          const res = await returnAdminService.searchReturns({
            status: statusFilter || undefined,
            orderCode: debouncedOrderCode || undefined,
            isOverdue: isOverdueOnly ? true : undefined,
            page: springPageIndex,
            size: pageSize,
          });

          if (isMounted && res.data) {
            setPageData(res.data);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          const msg =
            err?.response?.data?.message ||
            err?.message ||
            'Không thể tải danh sách phiếu trả hàng.';
          setErrorMessage(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadReturns();

    return () => {
      isMounted = false;
    };
  }, [currentPage, pageSize, statusFilter, debouncedOrderCode, isOverdueOnly]);

  const handleResetFilters = () => {
    setStatusFilter('');
    setSearchInput('');
    setDebouncedOrderCode('');
    setIsOverdueOnly(false);
    setCurrentPage(1);
    syncFilterParams('', false);
  };

  const items = pageData?.content || [];
  const totalElements = pageData?.totalElements || 0;
  const totalPages = pageData?.totalPages || 0;

  return (
    <div className="container py-8 max-w-7xl">
      {/* Tiêu đề */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wide text-content-primary">
            Quản Lý Trả Hàng &amp; Hoàn Tiền
          </h1>
        </div>

        <div className="flex items-center gap-2">
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
      </div>

      {/* Thanh Sub-Nav A1, A3, A4 */}
      <AdminReturnSubNav />

      {/* Thanh bộ lọc tìm kiếm */}
      <div className="p-4 bg-surface border border-line-light rounded-sm mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Ô tìm kiếm mã đơn hàng (Debounce 300ms) */}
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-content-primary mb-1.5">
              Tìm theo mã đơn hàng
            </label>
            <div className="relative">
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Nhập mã đơn hàng (ví dụ: ORD-2026...)"
                icon={Search}
              />
            </div>
          </div>

          {/* Lọc theo trạng thái */}
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-content-primary mb-1.5">
              Trạng thái yêu cầu
            </label>
            <Select
              name="status"
              data-testid="filter-status"
              value={statusFilter}
              onChange={handleStatusChange}
            >
              <option value="">Tất cả trạng thái (8 trạng thái)</option>
              {Object.entries(RETURN_STATUS_META).map(([statusKey, meta]) => (
                <React.Fragment key={statusKey}>
                  <option value={statusKey}>{meta.label}</option>
                  {statusKey === 'REFUNDED' && (
                    <option value="REFUNDED_UNRESTOCKED">
                      Đã hoàn tiền (Chưa nhập lại kho)
                    </option>
                  )}
                </React.Fragment>
              ))}
            </Select>
          </div>

          {/* Cờ lọc quá hạn SLA & Nút Đặt lại */}
          <div className="md:col-span-4 flex items-center justify-between gap-3 h-10">
            <Checkbox
              id="filter-is-overdue"
              name="isOverdue"
              data-testid="filter-overdue"
              label="Chỉ đơn quá hạn SLA"
              checked={isOverdueOnly}
              onChange={handleOverdueChange}
            />

            {(statusFilter || searchInput || isOverdueOnly) && (
              <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                Đặt Lại Lọc
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Thông tin số lượng kết quả */}
      <div className="flex items-center justify-between text-xs text-content-secondary mb-3">
        <span>
          Tổng số hồ sơ: <strong className="text-content-primary font-mono">{totalElements}</strong>
        </span>
        {isOverdueOnly && (
          <span className="flex items-center gap-1 text-status-error font-medium">
            <AlertTriangle size={13} />
            Đang lọc đơn trễ hạn xử lý cam kết SLA
          </span>
        )}
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
          <p className="text-sm">Đang tải danh sách hồ sơ trả hàng...</p>
        </div>
      ) : items.length === 0 ? (
        /* Trạng thái không có bản ghi */
        <div className="p-12 bg-surface border border-line-light rounded-sm text-center">
          <RotateCcw size={40} className="mx-auto text-content-muted mb-3 opacity-50" />
          <h3 className="text-base font-bold text-content-primary mb-1">
            Không tìm thấy phiếu trả hàng nào
          </h3>
          <p className="text-xs text-content-secondary max-w-md mx-auto mb-4">
            {statusFilter || searchInput || isOverdueOnly
              ? 'Không có kết quả phù hợp với các tiêu chí lọc hiện tại. Vui lòng thử tìm kiếm lại.'
              : 'Hiện chưa có yêu cầu trả hàng nào được ghi nhận trên hệ thống.'}
          </p>
          {(statusFilter || searchInput || isOverdueOnly) && (
            <Button variant="secondary" size="sm" onClick={handleResetFilters}>
              Xóa Bộ Lọc
            </Button>
          )}
        </div>
      ) : (
        /* Bảng danh sách phiếu trả hàng */
        <div className="overflow-x-auto border border-line-light rounded-sm bg-surface-body shadow-sm">
          <table
            data-testid="admin-returns-list"
            className="w-full text-left text-xs border-collapse"
          >
            <thead>
              <tr className="bg-surface border-b border-line-light text-content-muted font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-2.5">Mã phiếu</th>
                <th className="py-3 px-2.5">Mã đơn hàng</th>
                <th className="py-3 px-2.5">Mã khách</th>
                <th className="py-3 px-2.5">Ngày tạo</th>
                <th className="py-3 px-2.5">Trạng thái</th>
                <th className="py-3 px-2.5">Cảnh báo SLA</th>
                <th className="py-3 px-2.5 text-right">Số tiền hoàn</th>
                <th className="py-3 px-2.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-light">
              {items.map((ret) => (
                <tr
                  key={ret.id}
                  data-testid={`return-row-${ret.status}`}
                  onClick={() => navigate(`/admin/returns/${ret.id}`)}
                  className="hover:bg-surface transition-colors cursor-pointer"
                >
                  <td className="py-3 px-2.5 font-mono font-bold text-xs text-content-primary max-w-[140px] break-all">
                    {ret.returnCode}
                  </td>

                  <td className="py-3 px-2.5 font-mono text-content-secondary max-w-[130px] break-words">
                    {ret.orderCode}
                  </td>

                  <td className="py-3 px-2.5 text-content-secondary whitespace-nowrap">
                    ID #{ret.userId}
                  </td>

                  <td className="py-3 px-2.5 text-content-secondary">
                    {formatDateTime(ret.createdAt)}
                  </td>

                  <td className="py-3 px-2.5">
                    <div className="flex flex-col items-start gap-1">
                      <ReturnStatusBadge status={ret.status} />
                      {ret.status === 'REFUNDED' && !ret.restockedAt && (
                        <span className="text-[11px] font-semibold text-status-warning whitespace-nowrap">
                          Chưa nhập lại kho
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-2.5">
                    {ret.isOverdue ? (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        <Badge variant="error">
                          <AlertTriangle size={11} className="mr-1" />
                          Quá hạn SLA
                        </Badge>
                      </span>
                    ) : (
                      <span className="text-content-muted text-[11px] whitespace-nowrap">Đúng hạn</span>
                    )}
                  </td>

                  <td className="py-3 px-2.5 text-right font-mono font-bold text-content-primary whitespace-nowrap">
                    {formatVND(ret.refundAmount || 0)}
                  </td>

                  <td className="py-3 px-2.5 text-center whitespace-nowrap">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/returns/${ret.id}`);
                      }}
                      icon={Eye}
                    >
                      Xử Lý
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
