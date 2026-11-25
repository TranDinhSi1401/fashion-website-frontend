/**
 * Tab hiển thị danh sách phiếu trả hàng của khách hàng (Customer Returns Tab - C3).
 * Tích hợp trong ProfilePage (/account/returns).
 * Ẩn mã phiếu nội bộ, tập trung hiển thị sản phẩm trả, số lượng trả, tiền hoàn từng món,
 * tổng tiền hoàn và trạng thái nổi bật trên 1 dòng duy nhất.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, ChevronRight, AlertCircle, Calendar, Package } from 'lucide-react';
import { returnService } from '../services/returnService';
import { orderService } from '../services/orderService';
import type { ReturnRequestResponse, SpringPage } from '../types/return';
import {
  pageToSpring,
  formatVND,
  formatDateTime,
  getReturnReasonLabel,
} from '../utils/returnHelpers';
import ReturnStatusBadge from '../components/returns/ReturnStatusBadge';
import Button from '../components/ui/Button';
import Pagination from '../components/ui/Pagination';

export default function CustomerReturnsTab() {
  const navigate = useNavigate();
  const [returnsPage, setReturnsPage] = useState<SpringPage<ReturnRequestResponse> | null>(null);
  const [orderItemPriceMap, setOrderItemPriceMap] = useState<Record<number, number>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Tải đơn giá sản phẩm từ đơn hàng gốc để hiển thị tiền hoàn dự kiến từng món trước khi kho kiểm định
  useEffect(() => {
    let isMounted = true;
    orderService
      .getMyOrders()
      .then((orders) => {
        if (!isMounted || !Array.isArray(orders)) return;
        const map: Record<number, number> = {};
        orders.forEach((ord) => {
          (ord.orderItems || []).forEach((oi) => {
            if (oi.unitPrice > 0) {
              map[oi.id] = oi.unitPrice;
            } else if (oi.totalPrice > 0 && oi.quantity > 0) {
              map[oi.id] = Math.round(oi.totalPrice / oi.quantity);
            }
          });
        });
        setOrderItemPriceMap(map);
      })
      .catch(() => {
        // Bỏ qua lỗi phụ, vẫn hiển thị bình thường với dữ liệu từ phiếu trả
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Tải danh sách yêu cầu trả hàng theo trang
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
          const msg =
            err?.response?.data?.message ||
            err?.message ||
            'Không thể tải danh sách yêu cầu trả hàng.';
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-content-muted">
        <div className="w-8 h-8 border-2 border-line border-t-primary rounded-full animate-spin mb-3" />
        <p className="text-sm">Đang tải danh sách yêu cầu trả hàng...</p>
      </div>
    );
  }

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
            Theo dõi chi tiết sản phẩm trả lại, số tiền hoàn và trạng thái xử lý
          </p>
        </div>
        <span className="text-xs font-semibold text-content-muted whitespace-nowrap">
          Tổng cộng: <strong className="text-content-primary">{totalElements}</strong> yêu cầu
        </span>
      </div>

      {/* Danh sách thẻ yêu cầu trả hàng */}
      <div className="flex flex-col gap-4">
        {items.map((ret: ReturnRequestResponse) => {
          const returnItems = ret.items || [];
          const estimatedTotalItems = returnItems.reduce((sum, it) => {
            if (it.itemRefundAmount && it.itemRefundAmount > 0) {
              return sum + it.itemRefundAmount;
            }
            const unitPrice = orderItemPriceMap[it.orderItemId] || 0;
            return sum + unitPrice * (it.quantity || 0);
          }, 0);

          const isFinalized = Boolean(ret.inspectedAt) || ret.status === 'REFUNDED';
          const displayTotalRefund =
            ret.refundAmount && ret.refundAmount > 0
              ? ret.refundAmount
              : Math.max(0, estimatedTotalItems - (ret.returnShippingFee || 0));

          return (
            <div
              key={ret.id}
              className="border border-line-light bg-surface-body rounded-card p-5 hover:shadow-dropdown transition-all flex flex-col gap-4"
            >
              {/* Header thẻ: Thông tin đơn hàng & Trạng thái nổi bật 1 dòng */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-light pb-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-content-muted">
                  <span className="flex items-center gap-1.5 font-semibold text-content-primary">
                    <Package size={14} className="shrink-0" />
                    <span>Đơn hàng #{ret.orderCode || ret.orderId}</span>
                  </span>
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <Calendar size={13} className="shrink-0" />
                    <span>Ngày gửi: {formatDateTime(ret.createdAt)}</span>
                  </span>
                </div>

                <ReturnStatusBadge status={ret.status} prominent />
              </div>

              {/* Danh sách chi tiết sản phẩm trả, số lượng trả & tiền hoàn từng món */}
              {returnItems.length > 0 && (
                <div className="flex flex-col divide-y divide-line-light rounded-sm border border-line-light bg-surface px-3.5 py-1">
                  {returnItems.map((it) => {
                    const itemRefund =
                      it.itemRefundAmount && it.itemRefundAmount > 0
                        ? it.itemRefundAmount
                        : (orderItemPriceMap[it.orderItemId] || 0) * (it.quantity || 0);

                    return (
                      <div
                        key={it.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm text-content-primary truncate">
                            {it.productName}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-content-muted">
                            <span>{it.variantInfo || 'Tiêu chuẩn'}</span>
                            <span className="font-semibold text-content-primary">
                              SL trả: {it.quantity}
                            </span>
                            {it.acceptedQuantity !== null && it.acceptedQuantity !== undefined && (
                              <span className="font-semibold text-status-success">
                                Duyệt hoàn: {it.acceptedQuantity}/{it.quantity}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-left sm:text-right shrink-0">
                          <span className="text-content-muted mr-1.5 sm:block sm:mr-0 text-[11px]">
                            Tiền hoàn món:
                          </span>
                          <span className="font-bold text-sm text-content-primary whitespace-nowrap">
                            {formatVND(itemRefund)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Lý do ngắn gọn */}
              <div className="text-xs text-content-secondary break-words [overflow-wrap:anywhere]">
                <span className="text-content-muted">Lý do: </span>
                <span className="font-semibold text-content-primary">
                  {getReturnReasonLabel(ret.reason)}
                </span>
                {ret.reasonDetail && (
                  <span className="text-content-secondary"> — {ret.reasonDetail}</span>
                )}
              </div>

              {/* Footer thẻ: Tổng tiền hoàn & Nút xem chi tiết */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line-light pt-3.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-content-muted whitespace-nowrap">
                    {isFinalized ? 'Tổng tiền hoàn:' : 'Tổng tiền hoàn dự kiến:'}
                  </span>
                  <span className="text-lg font-bold text-accent-red whitespace-nowrap">
                    {formatVND(displayTotalRefund)}
                  </span>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleViewDetail(ret.id)}
                  className="flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <span>Xem Chi Tiết</span>
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          );
        })}
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
