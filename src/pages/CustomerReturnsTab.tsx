/**
 * Tab hiển thị danh sách phiếu trả hàng của khách hàng (Customer Returns Tab - C3).
 * Tích hợp trong ProfilePage (/account/returns).
 * Hiển thị danh sách phiếu trả hàng, trạng thái vòng đời qua ReturnStatusBadge,
 * cờ cảnh báo SLA quá hạn, số tiền hoàn và phân trang 1-based đồng bộ với Spring Data.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, AlertTriangle, ChevronRight, AlertCircle, Eye, Calendar, Package } from 'lucide-react';
import { returnService } from '../services/returnService';
import type { ReturnRequestResponse, SpringPage } from '../types/return';
import { pageToSpring, pageFromSpring, formatVND, formatDateTime } from '../utils/returnHelpers';
import ReturnStatusBadge from '../components/returns/ReturnStatusBadge';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Pagination from '../components/ui/Pagination';
import { cn } from '../utils/cn';

/**
 * Chức năng: Hiển thị danh sách các phiếu yêu cầu trả hàng đã tạo và phân trang kết quả.
 *
 * @returns Đầu ra: Thẻ JSX danh sách phiếu trả hàng.
 */
export default function CustomerReturnsTab() {
  const navigate = useNavigate();
  const [returnsPage, setReturnsPage] = useState<SpringPage<ReturnRequestResponse> | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Tải dữ liệu danh sách phiếu trả hàng theo trang
  useEffect(() => {
    let isMounted = true;

    async function fetchReturns(page1Based: number) {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const springPageIndex = pageToSpring(page1Based);
        const res = await returnService.getMyRequests(springPageIndex, 10);
        if (isMounted && res.data) {
          setReturnsPage(res.data);
        }
      } catch (err: any) {
        if (isMounted) {
          const msg = err?.response?.data?.message || err?.message || 'Không thể tải danh sách phiếu trả hàng.';
          setErrorMessage(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchReturns(currentPage);

    return () => {
      isMounted = false;
    };
  }, [currentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleViewDetail = (id: number) => {
    navigate(`/account/returns/${id}`);
  };

  // Trạng thái đang tải dữ liệu
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-content-muted">
        <div className="w-8 h-8 border-2 border-line border-t-primary rounded-full animate-spin mb-3" />
        <p className="text-sm">Đang tải danh sách yêu cầu trả hàng...</p>
      </div>
    );
  }

  // Trạng thái gặp lỗi khi gọi API
  if (errorMessage) {
    return (
      <div className="p-6 bg-surface border border-line-light rounded-sm text-center">
        <AlertCircle size={32} className="mx-auto text-status-error mb-2" />
        <p className="text-sm text-content-primary font-medium mb-4">{errorMessage}</p>
        <Button variant="secondary" onClick={() => setCurrentPage(1)}>
          Thử Lại
        </Button>
      </div>
    );
  }

  const items = returnsPage?.content || [];
  const totalPages = returnsPage?.totalPages || 0;
  const totalElements = returnsPage?.totalElements || 0;

  // Trạng thái chưa có phiếu trả hàng nào
  if (items.length === 0) {
    return (
      <div className="p-12 bg-surface border border-line-light rounded-sm text-center">
        <RotateCcw size={40} className="mx-auto text-content-muted mb-3" />
        <h4 className="text-base font-bold text-content-primary mb-1">
          Chưa có yêu cầu trả hàng nào
        </h4>
        <p className="text-xs text-content-muted mb-5">
          Nếu bạn có sản phẩm cần hỗ trợ đổi trả, hãy vào mục Đơn hàng của tôi để tạo yêu cầu trong vòng 7 ngày.
        </p>
        <Button variant="primary" onClick={() => navigate('/account/orders')}>
          Xem Đơn Hàng Của Tôi
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-line-light pb-4">
        <div>
          <h3 className="text-lg font-bold uppercase tracking-wide text-content-primary">
            Yêu Cầu Trả Hàng &amp; Hoàn Tiền
          </h3>
          <p className="text-xs text-content-muted mt-0.5">
            Theo dõi tiến trình xử lý, kiểm định chất lượng và lịch sử hoàn tiền
          </p>
        </div>
        <span className="text-xs font-semibold text-content-muted">
          Tổng cộng: <strong className="text-content-primary">{totalElements}</strong> yêu cầu
        </span>
      </div>

      {/* Danh sách bảng phiếu trả hàng */}
      <div className="flex flex-col gap-4">
        {items.map((ret: ReturnRequestResponse) => (
          <div
            key={ret.id}
            className="border border-line-light bg-surface-body rounded-card p-5 hover:shadow-dropdown transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-sm font-bold text-content-primary">
                  Mã phiếu: {ret.returnCode}
                </span>

                <ReturnStatusBadge status={ret.status} />

                {/* Cảnh báo quá hạn SLA nếu có */}
                {ret.isOverdue && (
                  <Badge variant="warning" className="flex items-center gap-1">
                    <AlertTriangle size={12} />
                    <span>Quá hạn xử lý</span>
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-content-muted">
                <span className="flex items-center gap-1">
                  <Package size={13} />
                  <span>Đơn hàng: #{ret.orderCode || ret.orderId}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={13} />
                  <span>Ngày tạo: {formatDateTime(ret.createdAt)}</span>
                </span>
              </div>

              <div className="text-xs text-content-secondary mt-1 break-words [overflow-wrap:anywhere]">
                Lý do: <span className="font-medium text-content-primary">{ret.reasonDetail || ret.reason}</span>
              </div>
            </div>

            {/* Cột thông tin tiền hoàn & nút xem chi tiết */}
            <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 border-t sm:border-t-0 border-line-light pt-3 sm:pt-0">
              <div className="text-left sm:text-right">
                <div className="text-xs text-content-muted">Tiền hoàn dự kiến:</div>
                <div className="text-base font-bold text-accent-red">
                  {formatVND(ret.refundAmount)}
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleViewDetail(ret.id)}
                className="flex items-center gap-1.5"
              >
                <span>Xem Chi Tiết</span>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Phân trang kết quả 1-based */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
