import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Edit2,
  Filter,
  Plus,
  Power,
  RefreshCw,
  Search,
  Ticket,
  Trash2,
} from 'lucide-react';
import { Badge, Button, Input, Modal, Pagination, Select } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { voucherService } from '../../services/voucherService';
import { VoucherResponse } from '../../types/voucher';
import { extractErrorMessage, formatCurrencyVND } from '../../utils/format';
import VoucherFormModal from './VoucherFormModal';

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

function computeVoucherLifecycle(v: VoucherResponse): {
  code: 'ACTIVE' | 'UPCOMING' | 'EXPIRED' | 'OUT_OF_STOCK' | 'INACTIVE';
  label: string;
  badgeVariant: 'success' | 'warning' | 'error' | 'default';
} {
  if (v.status === 'INACTIVE') {
    return { code: 'INACTIVE', label: 'Đang tắt', badgeVariant: 'default' };
  }
  const now = Date.now();
  const start = v.startDate ? new Date(v.startDate).getTime() : 0;
  const end = v.endDate ? new Date(v.endDate).getTime() : 0;

  if (start > now) {
    return { code: 'UPCOMING', label: 'Sắp diễn ra', badgeVariant: 'warning' };
  }
  if (end > 0 && end < now) {
    return { code: 'EXPIRED', label: 'Đã hết hạn', badgeVariant: 'error' };
  }
  if (v.usedQuantity >= v.totalQuantity) {
    return { code: 'OUT_OF_STOCK', label: 'Đã hết lượt', badgeVariant: 'error' };
  }
  return { code: 'ACTIVE', label: 'Đang hoạt động', badgeVariant: 'success' };
}

export default function VoucherManagementTab() {
  const { isAdmin, isStaff } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedKeyword = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState('');
  const [discountTypeFilter, setDiscountTypeFilter] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [vouchers, setVouchers] = useState<VoucherResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | '';
    message: string;
  }>({ type: '', message: '' });

  // Modal Tạo mới & Sửa voucher
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherResponse | null>(null);

  // Modal Xóa voucher
  const [confirmDeleteVoucher, setConfirmDeleteVoucher] = useState<VoucherResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [togglingVoucherId, setTogglingVoucherId] = useState<number | null>(null);

  const fetchVouchers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await voucherService.getAdminVouchers(
        Math.max(0, currentPage - 1),
        pageSize
      );
      const pageData = res?.data;
      if (pageData && Array.isArray(pageData.content)) {
        setVouchers(pageData.content);
        setTotalElements(pageData.totalElements ?? pageData.content.length);
        setTotalPages(Math.max(1, pageData.totalPages ?? 1));
      } else {
        setVouchers([]);
        setTotalElements(0);
        setTotalPages(1);
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: extractErrorMessage(err, 'Không thể tải danh sách mã giảm giá.'),
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    void fetchVouchers();
  }, [fetchVouchers]);

  const handleToggleStatus = async (v: VoucherResponse) => {
    setTogglingVoucherId(v.id);
    setNotification({ type: '', message: '' });
    try {
      await voucherService.toggleVoucherStatus(v.id);
      setNotification({
        type: 'success',
        message: `Đã thay đổi trạng thái hoạt động của voucher "${v.code}".`,
      });
      await fetchVouchers();
    } catch (err) {
      setNotification({
        type: 'error',
        message: extractErrorMessage(err, 'Không thể cập nhật trạng thái voucher.'),
      });
    } finally {
      setTogglingVoucherId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteVoucher) return;
    setIsDeleting(true);
    setNotification({ type: '', message: '' });
    try {
      await voucherService.deleteVoucher(confirmDeleteVoucher.id);
      setNotification({
        type: 'success',
        message: `Đã xóa thành công voucher "${confirmDeleteVoucher.code}".`,
      });
      setConfirmDeleteVoucher(null);
      await fetchVouchers();
    } catch (err) {
      setNotification({
        type: 'error',
        message: extractErrorMessage(err, 'Không thể xóa voucher.'),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredVouchers = vouchers.filter((v) => {
    if (debouncedKeyword.trim()) {
      const kw = debouncedKeyword.toLowerCase();
      const match =
        v.code.toLowerCase().includes(kw) ||
        v.name.toLowerCase().includes(kw) ||
        (v.description && v.description.toLowerCase().includes(kw));
      if (!match) return false;
    }
    if (statusFilter) {
      const lc = computeVoucherLifecycle(v);
      if (lc.code !== statusFilter) return false;
    }
    if (discountTypeFilter && v.discountType !== discountTypeFilter) {
      return false;
    }
    return true;
  });

  const hasActiveFilters = Boolean(searchTerm || statusFilter || discountTypeFilter);

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setDiscountTypeFilter('');
  };

  const startIndex = totalElements === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalElements);

  return (
    <div>
      {/* Khối Tìm kiếm & Bộ lọc Voucher đồng bộ 100% với các tab khác */}
      <div className="mb-6 p-4 border border-line-light bg-surface min-h-[110px]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-primary">
            <Filter size={14} />
            <span>Tìm Kiếm &amp; Bộ Lọc Mã Giảm Giá</span>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                Xóa bộ lọc
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void fetchVouchers()}
              icon={RefreshCw}
            >
              Làm Mới
            </Button>
            {(isAdmin || isStaff) && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                icon={Plus}
              >
                Tạo Mã Giảm Giá
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-6">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã code, tên chiến dịch voucher..."
              icon={Search}
            />
          </div>

          <div className="lg:col-span-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                { value: 'ACTIVE', label: 'Đang hoạt động' },
                { value: 'UPCOMING', label: 'Sắp diễn ra' },
                { value: 'EXPIRED', label: 'Đã hết hạn' },
                { value: 'OUT_OF_STOCK', label: 'Đã hết lượt' },
                { value: 'INACTIVE', label: 'Đang tắt' },
              ]}
            />
          </div>

          <div className="lg:col-span-3">
            <Select
              value={discountTypeFilter}
              onChange={(e) => setDiscountTypeFilter(e.target.value)}
              options={[
                { value: '', label: 'Tất cả loại giảm giá' },
                { value: 'PERCENTAGE', label: 'Giảm theo %' },
                { value: 'FIXED_AMOUNT', label: 'Giảm số tiền cố định' },
              ]}
            />
          </div>
        </div>
      </div>

      {notification.message && (
        <div
          className={`mb-4 p-3 text-sm rounded ${
            notification.type === 'error'
              ? 'bg-status-error/10 text-status-error border border-status-error/30'
              : 'bg-status-success/10 text-status-success border border-status-success/30'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Thông tin số lượng & Chọn phân trang */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs text-content-secondary">
        <div>
          Hiển thị{' '}
          <strong className="text-content-primary">
            {startIndex} – {endIndex}
          </strong>{' '}
          trên tổng số <strong className="text-content-primary">{totalElements}</strong> mã giảm giá
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

      {/* Bảng Voucher */}
      <div className="overflow-x-auto border border-line-light bg-surface-body min-h-[380px]">
        <table className="w-full border-collapse text-left text-[0.85rem]">
          <thead>
            <tr className="bg-surface border-b border-line-light uppercase tracking-[0.05em] text-[0.75rem] font-bold text-content-secondary">
              <th className="p-4">Mã Voucher</th>
              <th className="p-4">Tên Chiến Dịch</th>
              <th className="p-4">Mức Giảm</th>
              <th className="p-4">Đơn Tối Thiểu</th>
              <th className="p-4">Lượt Dùng</th>
              <th className="p-4">Thời Gian Hiệu Lực</th>
              <th className="p-4">Trạng Thái</th>
              <th className="p-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-content-muted">
                  Đang tải danh sách mã giảm giá...
                </td>
              </tr>
            ) : filteredVouchers.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-content-muted">
                    <Ticket size={28} />
                    <div className="text-sm font-semibold text-content-primary">
                      Chưa có mã giảm giá nào phù hợp
                    </div>
                    <div className="text-xs">
                      {hasActiveFilters
                        ? 'Hãy thử điều chỉnh từ khóa hoặc xóa bộ lọc để xem toàn bộ danh sách.'
                        : 'Nhấn nút "Tạo Mã Giảm Giá" ở góc trên bên phải để tạo mới.'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredVouchers.map((v) => {
                const isPercentage = v.discountType === 'PERCENTAGE';
                const lifecycle = computeVoucherLifecycle(v);

                return (
                  <tr key={v.id} className="border-b border-line-light hover:bg-surface/50">
                    <td className="p-4">
                      <span className="font-mono font-bold text-content-primary rounded bg-surface px-2.5 py-1 border border-line-light">
                        {v.code}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="font-semibold text-content-primary">{v.name}</div>
                      {v.description && (
                        <div className="text-[0.72rem] text-content-muted mt-0.5 line-clamp-1">
                          {v.description}
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-accent-red">
                        {isPercentage ? (
                          <span>
                            {v.discountValue}%
                            {v.maxDiscountAmount
                              ? ` (Tối đa ${formatCurrencyVND(v.maxDiscountAmount)})`
                              : ''}
                          </span>
                        ) : (
                          formatCurrencyVND(v.discountValue)
                        )}
                      </div>
                      <div className="text-[0.7rem] text-content-muted">
                        {isPercentage ? 'Theo phần trăm' : 'Theo số tiền'}
                      </div>
                    </td>

                    <td className="p-4 font-semibold text-content-primary">
                      {v.minOrderAmount && v.minOrderAmount > 0
                        ? `Từ ${formatCurrencyVND(v.minOrderAmount)}`
                        : 'Không giới hạn (0₫)'}
                    </td>

                    <td className="p-4">
                      <div className="font-semibold text-content-primary">
                        {v.usedQuantity} / {v.totalQuantity}
                      </div>
                      <div className="text-[0.72rem] text-content-muted">
                        Còn lại: {v.remainingQuantity} mã
                      </div>
                      <div className="mt-1 inline-block rounded bg-surface px-1.5 py-0.5 text-[0.7rem] font-semibold text-content-secondary border border-line-light">
                        Tối đa {v.maxUsesPerUser} lần / 1 tài khoản
                      </div>
                    </td>

                    <td className="p-4 text-xs">
                      <div className="flex items-center gap-1.5 text-content-primary">
                        <Calendar size={13} className="text-content-muted shrink-0" />
                        <span>BĐ: {formatDateTimeVN(v.startDate)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-content-secondary mt-1">
                        <Calendar size={13} className="text-content-muted shrink-0" />
                        <span>KT: {formatDateTimeVN(v.endDate)}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <Badge variant={lifecycle.badgeVariant}>{lifecycle.label}</Badge>
                        <button
                          type="button"
                          disabled={togglingVoucherId === v.id}
                          onClick={() => void handleToggleStatus(v)}
                          className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-content-secondary hover:text-content-primary underline disabled:opacity-50"
                        >
                          <Power size={11} />
                          <span>{v.status === 'ACTIVE' ? 'Tạm tắt' : 'Bật lại'}</span>
                        </button>
                      </div>
                    </td>

                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Edit2}
                          onClick={() => setEditingVoucher(v)}
                        >
                          Sửa
                        </Button>
                        {(isAdmin || isStaff) && (
                          <Button
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                            onClick={() => setConfirmDeleteVoucher(v)}
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

      {/* Phân trang */}
      <div className="min-h-[50px] mt-4">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>

      {/* Modal Tạo mới / Sửa Voucher */}
      <VoucherFormModal
        isOpen={isCreateModalOpen || Boolean(editingVoucher)}
        editingVoucher={editingVoucher}
        onClose={() => {
          if (editingVoucher) setEditingVoucher(null);
          if (isCreateModalOpen) setIsCreateModalOpen(false);
        }}
        onSaved={(msg) => {
          setNotification({ type: 'success', message: msg });
          void fetchVouchers();
        }}
      />

      {/* Hộp thoại xác nhận xóa voucher */}
      <Modal
        isOpen={Boolean(confirmDeleteVoucher)}
        onClose={() => !isDeleting && setConfirmDeleteVoucher(null)}
        title="Xác Nhận Xóa Mã Giảm Giá"
        maxWidth="520px"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3.5 bg-surface border border-line-light">
            <AlertTriangle size={22} className="text-accent-red shrink-0 mt-0.5" />
            <div className="text-sm text-content-primary leading-relaxed">
              Bạn có chắc chắn muốn xóa vĩnh viễn voucher{' '}
              <strong>&ldquo;{confirmDeleteVoucher?.code}&rdquo;</strong> (
              {confirmDeleteVoucher?.name}) không?
              <p className="text-xs text-content-secondary mt-2 mb-0">
                Lưu ý: Voucher này sẽ bị xóa khỏi hệ thống và khách hàng sẽ không thể nhập mã này được nữa.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-line-light pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDeleteVoucher(null)}
              disabled={isDeleting}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              icon={Trash2}
              loading={isDeleting}
              onClick={() => void handleConfirmDelete()}
            >
              Xác Nhận Xóa
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
