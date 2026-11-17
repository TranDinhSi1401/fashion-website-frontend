import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Edit2,
  FileText,
  Filter,
  Package,
  Percent,
  Plus,
  Power,
  RefreshCw,
  Search,
  Tag,
  Trash2,
} from 'lucide-react';
import AdminNav from '../components/admin/AdminNav';
import PromotionFormModal from '../components/admin/PromotionFormModal';
import ProductPickerModal from '../components/admin/ProductPickerModal';
import { Badge, Button, Input, Modal, Pagination, Select } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { promotionService } from '../services/promotionService';
import {
  DiscountTypeFilter,
  OfferProductTarget,
  OfferStatusFilter,
  OfferType,
  SpecialOfferProductResponse,
  SpecialOfferResponse,
} from '../types/promotion';
import { extractErrorMessage, formatCurrencyVND } from '../utils/format';
import { cn } from '../utils/cn';
import styles from './AdminPages.module.css';

function formatDateTimeVN(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function computeOfferLifecycle(offer: SpecialOfferResponse): {
  code: 'ACTIVE' | 'UPCOMING' | 'EXPIRED' | 'INACTIVE';
  label: string;
  badgeVariant: 'success' | 'warning' | 'error' | 'default';
} {
  if (!offer.isActive) {
    return { code: 'INACTIVE', label: 'Đang tắt', badgeVariant: 'default' };
  }
  const now = Date.now();
  const start = offer.startDate ? new Date(offer.startDate).getTime() : 0;
  const end = offer.endDate ? new Date(offer.endDate).getTime() : 0;

  if (start > now) {
    return { code: 'UPCOMING', label: 'Sắp diễn ra', badgeVariant: 'warning' };
  }
  if (end > 0 && end < now) {
    return { code: 'EXPIRED', label: 'Đã hết hạn', badgeVariant: 'error' };
  }
  return { code: 'ACTIVE', label: 'Đang hoạt động', badgeVariant: 'success' };
}

export default function AdminPromotionsPage() {
  const { isAdmin, isStaff } = useAuth();

  // Hai tab quản lý riêng biệt: Khuyến mãi HÓA ĐƠN ('ORDER') & Khuyến mãi SẢN PHẨM ('PRODUCT')
  const [activeTab, setActiveTab] = useState<OfferType>('ORDER');

  // Bộ lọc & tìm kiếm (có debounce 300ms)
  const [searchTerm, setSearchTerm] = useState<string>('');
  const debouncedKeyword = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<OfferStatusFilter>('');
  const [discountTypeFilter, setDiscountTypeFilter] = useState<DiscountTypeFilter>('');
  const [fromDateFilter, setFromDateFilter] = useState<string>('');
  const [toDateFilter, setToDateFilter] = useState<string>('');

  // Phân trang phía server
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Dữ liệu danh sách & trạng thái tải
  const [offers, setOffers] = useState<SpecialOfferResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | '';
    message: string;
  }>({ type: '', message: '' });

  // Modal Thêm / Sửa khuyến mãi
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingOffer, setEditingOffer] = useState<SpecialOfferResponse | null>(null);

  // Modal Xác nhận xóa mềm
  const [confirmDeleteOffer, setConfirmDeleteOffer] = useState<SpecialOfferResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Modal chọn/đồng bộ nhanh sản phẩm & biến thể cho 1 khuyến mãi SẢN PHẨM
  const [managingProductsOffer, setManagingProductsOffer] = useState<SpecialOfferResponse | null>(
    null
  );
  const [managingOfferTargets, setManagingOfferTargets] = useState<OfferProductTarget[]>([]);
  const [togglingOfferId, setTogglingOfferId] = useState<number | null>(null);

  // Khi đổi tab hoặc đổi tiêu chí lọc thì quay về trang 1
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, debouncedKeyword, statusFilter, discountTypeFilter, fromDateFilter, toDateFilter, pageSize]);

  const fetchOffersPage = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const res = await promotionService.getOffersPage(
          {
            offerType: activeTab,
            keyword: debouncedKeyword.trim() || undefined,
            status: statusFilter || undefined,
            discountType: discountTypeFilter || undefined,
            fromDate: fromDateFilter ? `${fromDateFilter}T00:00:00` : undefined,
            toDate: toDateFilter ? `${toDateFilter}T23:59:59` : undefined,
            page: Math.max(0, currentPage - 1),
            size: pageSize,
            sort: 'createdAt,desc',
          },
          signal
        );

        const pageData = res?.data;
        if (pageData && Array.isArray(pageData.content)) {
          setOffers(pageData.content);
          setTotalElements(pageData.totalElements ?? pageData.content.length);
          setTotalPages(Math.max(1, pageData.totalPages ?? 1));
        } else {
          setOffers([]);
          setTotalElements(0);
          setTotalPages(1);
        }
      } catch (err: any) {
        if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
          setNotification({
            type: 'error',
            message: extractErrorMessage(err, 'Không thể tải danh sách chương trình khuyến mãi.'),
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      activeTab,
      debouncedKeyword,
      statusFilter,
      discountTypeFilter,
      fromDateFilter,
      toDateFilter,
      currentPage,
      pageSize,
    ]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchOffersPage(controller.signal);
    return () => controller.abort();
  }, [fetchOffersPage]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setDiscountTypeFilter('');
    setFromDateFilter('');
    setToDateFilter('');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() || statusFilter || discountTypeFilter || fromDateFilter || toDateFilter
  );

  const handleOpenCreateModal = () => {
    setEditingOffer(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (offer: SpecialOfferResponse) => {
    setEditingOffer(offer);
    setIsFormModalOpen(true);
  };

  const handleToggleActive = async (offer: SpecialOfferResponse) => {
    const nextState = !offer.isActive;
    setTogglingOfferId(offer.id);
    setNotification({ type: '', message: '' });
    try {
      await promotionService.updateOfferActive(offer.id, nextState);
      setNotification({
        type: 'success',
        message: `Đã ${nextState ? 'bật kích hoạt' : 'tạm tắt'} khuyến mãi "${offer.title}".`,
      });
      await fetchOffersPage();
    } catch (err) {
      setNotification({
        type: 'error',
        message: extractErrorMessage(err, 'Không thể cập nhật trạng thái khuyến mãi.'),
      });
    } finally {
      setTogglingOfferId(null);
    }
  };

  const handleConfirmSoftDelete = async () => {
    if (!confirmDeleteOffer) return;
    setIsDeleting(true);
    setNotification({ type: '', message: '' });
    try {
      await promotionService.deleteOffer(confirmDeleteOffer.id);
      setNotification({
        type: 'success',
        message: `Đã xóa mềm chương trình khuyến mãi "${confirmDeleteOffer.title}" thành công.`,
      });
      setConfirmDeleteOffer(null);
      await fetchOffersPage();
    } catch (err) {
      setNotification({
        type: 'error',
        message: extractErrorMessage(err, 'Xóa chương trình khuyến mãi thất bại.'),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenQuickManageProducts = async (offer: SpecialOfferResponse) => {
    try {
      const res = await promotionService.getOfferProducts(offer.id);
      const list: SpecialOfferProductResponse[] = res?.data || [];
      setManagingOfferTargets(
        list
          .filter((item) => Boolean(item.productId))
          .map((item) => ({
            productId: Number(item.productId),
            productVariantId:
              item.productVariantId !== null && item.productVariantId !== undefined
                ? Number(item.productVariantId)
                : null,
            productName: item.productName || `Sản phẩm #${item.productId}`,
            productBasePrice: item.productBasePrice,
            productImageUrl: item.productImageUrl,
            variantSku: item.variantSku,
            variantColor: item.variantColor,
            variantSize: item.variantSize,
            variantPrice: item.variantPrice,
          }))
      );
    } catch {
      const fallbackTargets: OfferProductTarget[] = (offer.productIds || []).map((pid) => ({
        productId: Number(pid),
        productVariantId: null,
      }));
      setManagingOfferTargets(fallbackTargets);
    }
    setManagingProductsOffer(offer);
  };

  const handleQuickSyncProducts = async (selectedTargets: OfferProductTarget[]) => {
    if (!managingProductsOffer) return;
    setNotification({ type: '', message: '' });
    try {
      const distinctProductIds = Array.from(new Set(selectedTargets.map((t) => t.productId)));
      await promotionService.syncOfferProducts(managingProductsOffer.id, {
        productIds: distinctProductIds,
        productTargets: selectedTargets.map((t) => ({
          productId: t.productId,
          productVariantId: t.productVariantId ?? null,
        })),
      });
      setNotification({
        type: 'success',
        message: `Đã cập nhật ${selectedTargets.length} mục sản phẩm/biến thể cho khuyến mãi "${managingProductsOffer.title}".`,
      });
      setManagingProductsOffer(null);
      await fetchOffersPage();
    } catch (err) {
      setNotification({
        type: 'error',
        message: extractErrorMessage(err, 'Không thể đồng bộ sản phẩm cho khuyến mãi.'),
      });
    }
  };

  const startIndex = totalElements === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalElements);

  return (
    <div className="py-8">
      <div className="container">
        {/* Thanh điều hướng Quản trị chung */}
        <AdminNav
          title="Quản Lý Chương Trình Khuyến Mãi"
          subtitle="Thiết lập ưu đãi giảm giá cho Hóa đơn và Sản phẩm, kiểm soát thời hạn hiệu lực và phạm vi sản phẩm áp dụng."
          actions={
            <>
              <Button variant="secondary" onClick={() => fetchOffersPage()} icon={RefreshCw}>
                Làm Mới
              </Button>
              {(isAdmin || isStaff) && (
                <Button variant="primary" onClick={handleOpenCreateModal} icon={Plus}>
                  {activeTab === 'ORDER'
                    ? 'Thêm Khuyến Mãi Hóa Đơn'
                    : 'Thêm Khuyến Mãi Sản Phẩm'}
                </Button>
              )}
            </>
          }
        />

        {/* Hai Tab chuyển đổi: Khuyến mãi HÓA ĐƠN vs Khuyến mãi SẢN PHẨM */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-line-light">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('ORDER')}
              className={cn(
                'inline-flex items-center gap-2.5 px-5 py-3 text-sm font-bold uppercase tracking-wide border-b-2 -mb-[1px] transition-colors',
                activeTab === 'ORDER'
                  ? 'border-primary bg-primary text-content-inverse'
                  : 'border-transparent bg-surface text-content-secondary hover:text-content-primary'
              )}
            >
              <FileText size={16} />
              <span>Khuyến Mãi Hóa Đơn</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PRODUCT')}
              className={cn(
                'inline-flex items-center gap-2.5 px-5 py-3 text-sm font-bold uppercase tracking-wide border-b-2 -mb-[1px] transition-colors',
                activeTab === 'PRODUCT'
                  ? 'border-primary bg-primary text-content-inverse'
                  : 'border-transparent bg-surface text-content-secondary hover:text-content-primary'
              )}
            >
              <Tag size={16} />
              <span>Khuyến Mãi Sản Phẩm</span>
            </button>
          </div>

          <div className="text-xs text-content-secondary py-2">
            Đang xem:{' '}
            <strong className="text-content-primary uppercase">
              {activeTab === 'ORDER'
                ? 'Danh sách khuyến mãi áp dụng trên tổng hóa đơn'
                : 'Danh sách khuyến mãi giảm giá trực tiếp trên sản phẩm'}
            </strong>
          </div>
        </div>

        {/* Khối Tìm kiếm & Bộ lọc tiêu chí */}
        <div className="mb-6 p-4 border border-line-light bg-surface">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-primary">
              <Filter size={14} />
              <span>Tìm Kiếm &amp; Bộ Lọc Khuyến Mãi</span>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                Xóa bộ lọc
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-4">
              <Input
                placeholder="Tìm theo tên hoặc mã ID khuyến mãi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={Search}
              />
            </div>

            <div className="lg:col-span-2">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as OfferStatusFilter)}
                options={[
                  { value: '', label: 'Tất cả trạng thái' },
                  { value: 'ACTIVE', label: 'Đang hoạt động' },
                  { value: 'UPCOMING', label: 'Sắp diễn ra' },
                  { value: 'EXPIRED', label: 'Đã hết hạn' },
                  { value: 'INACTIVE', label: 'Đang tắt' },
                ]}
              />
            </div>

            <div className="lg:col-span-2">
              <Select
                value={discountTypeFilter}
                onChange={(e) => setDiscountTypeFilter(e.target.value as DiscountTypeFilter)}
                options={[
                  { value: '', label: 'Mọi loại giảm giá' },
                  { value: 'PERCENT', label: 'Giảm theo phần trăm (%)' },
                  { value: 'AMOUNT', label: 'Giảm số tiền (VNĐ)' },
                ]}
              />
            </div>

            <div className="lg:col-span-2">
              <Input
                type="date"
                value={fromDateFilter}
                onChange={(e) => setFromDateFilter(e.target.value)}
                title="Lọc từ ngày"
              />
            </div>

            <div className="lg:col-span-2">
              <Input
                type="date"
                value={toDateFilter}
                onChange={(e) => setToDateFilter(e.target.value)}
                title="Lọc đến ngày"
              />
            </div>
          </div>
        </div>

        {/* Thông báo phản hồi thành công / lỗi */}
        {notification.message && (
          <div
            className={
              notification.type === 'error' ? styles.alertError : styles.alertSuccess
            }
          >
            {notification.message}
          </div>
        )}

        {/* Thanh thông tin tổng số bản ghi & Chọn số dòng/trang */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs text-content-secondary">
          <div>
            Hiển thị{' '}
            <strong className="text-content-primary">
              {startIndex} – {endIndex}
            </strong>{' '}
            trên tổng số <strong className="text-content-primary">{totalElements}</strong> chương
            trình khuyến mãi
          </div>

          <div className="flex items-center gap-2">
            <span>Số dòng / trang:</span>
            <div className="w-28">
              <Select
                value={String(pageSize)}
                onChange={(e) => setPageSize(Number(e.target.value))}
                options={[
                  { value: '5', label: '5 dòng' },
                  { value: '10', label: '10 dòng' },
                  { value: '20', label: '20 dòng' },
                  { value: '50', label: '50 dòng' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Bảng danh sách khuyến mãi */}
        <div className="overflow-x-auto border border-line-light bg-surface-body">
          <table className="w-full border-collapse text-left text-[0.85rem]">
            <thead>
              <tr className="bg-surface border-b border-line-light uppercase tracking-[0.05em] text-[0.75rem] font-bold text-content-secondary">
                <th className="p-4">Mã</th>
                <th className="p-4">Tên Chương Trình Khuyến Mãi</th>
                <th className="p-4">Mức Giảm Giá</th>
                <th className="p-4">
                  {activeTab === 'ORDER' ? 'Đơn Tối Thiểu' : 'Sản Phẩm Áp Dụng'}
                </th>
                <th className="p-4">Thời Gian Hiệu Lực</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-content-muted">
                    Đang tải danh sách khuyến mãi...
                  </td>
                </tr>
              ) : offers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-content-muted">
                      <Percent size={28} />
                      <div className="text-sm font-semibold text-content-primary">
                        Chưa có chương trình khuyến mãi nào phù hợp
                      </div>
                      <div className="text-xs">
                        {hasActiveFilters
                          ? 'Hãy thử điều chỉnh từ khóa hoặc xóa bộ lọc để xem toàn bộ danh sách.'
                          : `Nhấn nút "THÊM KHUYẾN MÃI ${
                              activeTab === 'ORDER' ? 'HÓA ĐƠN' : 'SẢN PHẨM'
                            }" ở góc trên bên phải để tạo mới.`}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                offers.map((offer) => {
                  const lifecycle = computeOfferLifecycle(offer);
                  const isPercent =
                    offer.discountPercent !== null &&
                    offer.discountPercent !== undefined &&
                    offer.discountPercent > 0;
                  const productCount =
                    offer.productCount ?? (offer.productIds ? offer.productIds.length : 0);

                  return (
                    <tr key={offer.id} className={styles.tableRow}>
                      <td className="p-4 font-bold text-content-primary">#{offer.id}</td>

                      <td className="p-4">
                        <div className="font-semibold text-content-primary">{offer.title}</div>
                        <div className="text-[0.72rem] text-content-muted mt-0.5">
                          Loại: {offer.offerType === 'ORDER' ? 'Hóa đơn' : 'Sản phẩm'}
                        </div>
                      </td>

                      <td className="p-4">
                        {isPercent ? (
                          <div>
                            <Badge variant="sale">-{offer.discountPercent}%</Badge>
                            {offer.maxDiscountAmount && Number(offer.maxDiscountAmount) > 0 ? (
                              <div className="text-[0.72rem] text-content-muted mt-1">
                                Tối đa: {formatCurrencyVND(Number(offer.maxDiscountAmount))}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-accent-red text-sm">
                              -{formatCurrencyVND(Number(offer.discountAmount || 0))}
                            </span>
                            <div className="text-[0.72rem] text-content-muted mt-0.5">
                              Giảm tiền trực tiếp
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        {activeTab === 'ORDER' ? (
                          <div>
                            <div className="font-semibold text-content-primary">
                              {offer.minOrderAmount && Number(offer.minOrderAmount) > 0
                                ? `Từ ${formatCurrencyVND(Number(offer.minOrderAmount))}`
                                : 'Không giới hạn (0₫)'}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-semibold text-content-primary">
                              {productCount} sản phẩm
                              {offer.variantCount && offer.variantCount > 0
                                ? ` (${offer.variantCount} biến thể lẻ)`
                                : ''}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenQuickManageProducts(offer)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-content-secondary underline hover:text-content-primary"
                            >
                              <Package size={12} />
                              <span>Chọn SP / biến thể</span>
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-xs">
                        <div className="flex items-center gap-1.5 text-content-primary">
                          <Calendar size={13} className="text-content-muted shrink-0" />
                          <span>BĐ: {formatDateTimeVN(offer.startDate)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-content-secondary mt-1">
                          <Calendar size={13} className="text-content-muted shrink-0" />
                          <span>KT: {formatDateTimeVN(offer.endDate)}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <Badge variant={lifecycle.badgeVariant}>{lifecycle.label}</Badge>
                          <button
                            type="button"
                            disabled={togglingOfferId === offer.id}
                            onClick={() => handleToggleActive(offer)}
                            className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-content-secondary hover:text-content-primary underline disabled:opacity-50"
                          >
                            <Power size={11} />
                            <span>{offer.isActive ? 'Tạm tắt' : 'Bật lại'}</span>
                          </button>
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={Edit2}
                            onClick={() => handleOpenEditModal(offer)}
                          >
                            Sửa
                          </Button>
                          {(isAdmin || isStaff) && (
                            <Button
                              variant="danger"
                              size="sm"
                              icon={Trash2}
                              onClick={() => setConfirmDeleteOffer(offer)}
                            >
                              Xóa
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang chuẩn UI Design System */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
          scrollTargetTop={0}
        />
      </div>

      {/* Modal Thêm mới / Cập nhật khuyến mãi */}
      <PromotionFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        offerType={activeTab}
        editingOffer={editingOffer}
        onSaved={(msg) => {
          setNotification({ type: 'success', message: msg });
          fetchOffersPage();
        }}
      />

      {/* Modal Chọn & Đồng bộ nhanh sản phẩm / biến thể áp dụng cho 1 khuyến mãi SẢN PHẨM */}
      <ProductPickerModal
        isOpen={Boolean(managingProductsOffer)}
        onClose={() => setManagingProductsOffer(null)}
        selectedTargets={managingOfferTargets}
        title={
          managingProductsOffer
            ? `Sản Phẩm & Biến Thể Áp Dụng — ${managingProductsOffer.title}`
            : 'Chọn Sản Phẩm & Biến Thể Áp Dụng'
        }
        onConfirm={(targets) => handleQuickSyncProducts(targets)}
      />

      {/* Hộp thoại Xác nhận xóa mềm khuyến mãi */}
      <Modal
        isOpen={Boolean(confirmDeleteOffer)}
        onClose={() => !isDeleting && setConfirmDeleteOffer(null)}
        title="Xác Nhận Xóa Khuyến Mãi"
        maxWidth="520px"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3.5 bg-surface border border-line-light">
            <AlertTriangle size={22} className="text-accent-red shrink-0 mt-0.5" />
            <div className="text-sm text-content-primary leading-relaxed">
              Bạn có chắc chắn muốn xóa chương trình khuyến mãi{' '}
              <strong>&ldquo;{confirmDeleteOffer?.title}&rdquo;</strong> (Mã{' '}
              <strong>#{confirmDeleteOffer?.id}</strong>) không?
              <p className="text-xs text-content-secondary mt-2 mb-0">
                Lưu ý: Hệ thống thực hiện <strong>xóa mềm (Soft Delete)</strong> — chương trình sẽ
                được ngừng kích hoạt và ẩn khỏi danh sách hoạt động nhưng vẫn giữ toàn vẹn lịch sử
                cho các đơn hàng cũ.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line-light">
            <Button
              variant="secondary"
              disabled={isDeleting}
              onClick={() => setConfirmDeleteOffer(null)}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              loading={isDeleting}
              onClick={handleConfirmSoftDelete}
            >
              Xác Nhận Xóa
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
