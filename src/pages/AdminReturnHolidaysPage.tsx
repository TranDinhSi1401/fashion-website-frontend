/**
 * Màn hình Cấu hình Lịch nghỉ lễ tính cam kết SLA (Admin Return Holidays Page - A4).
 * Tuyến đường: /admin/returns/holidays.
 *
 * TÍNH NĂNG BẢO VỆ NGÀY LỄ MẶC ĐỊNH HỆ THỐNG (CRITICAL DEFAULT PROTECTION):
 * Các ngày nghỉ lễ theo Luật Lao động có cờ isDefault === true là bất biến (Immutable).
 * Các nút Sửa và Xóa đối với các dòng isDefault === true BẮT BUỘC PHẢI BỊ VÔ HIỆU HÓA (disabled)
 * hoặc ẩn, kèm thông báo "Ngày lễ mặc định của hệ thống không thể sửa/xóa".
 * Backend sẽ ném lỗi 400 DEFAULT_HOLIDAY_IMMUTABLE nếu cố tình sửa hoặc xóa.
 *
 * Tính năng chính:
 * - Điều hướng phụ AdminReturnSubNav.
 * - Bộ lọc năm dương lịch (mặc định năm hiện tại, hỗ trợ năm trước/sau).
 * - Bảng danh sách các ngày nghỉ lễ, phân biệt rõ ngày lễ mặc định vs ngày nghỉ đặc thù mở rộng.
 * - Thêm mới ngày nghỉ lễ mở rộng (POST /api/v1/admin/returns/holidays).
 * - Sửa ngày lễ mở rộng (PUT /api/v1/admin/returns/holidays/{id}).
 * - Xóa ngày lễ mở rộng (DELETE /api/v1/admin/returns/holidays/{id}).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Lock,
  AlertCircle,
  RefreshCw,
  Info,
} from 'lucide-react';
import type {
  ReturnRequestHolidayResponse,
  ReturnRequestHolidayRequest,
} from '../types/return';
import { returnAdminService } from '../services/returnAdminService';
import { formatDate } from '../utils/returnHelpers';
import AdminReturnSubNav from '../components/returns/AdminReturnSubNav';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';

/**
 * Chức năng: Hiển thị giao diện quản lý lịch ngày nghỉ lễ áp dụng tính thời hạn cam kết SLA.
 *
 * @returns Đầu ra: Thẻ JSX trang quản lý lịch nghỉ lễ.
 */
export default function AdminReturnHolidaysPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [holidays, setHolidays] = useState<ReturnRequestHolidayResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingHoliday, setEditingHoliday] = useState<ReturnRequestHolidayResponse | null>(null);
  const [deletingHoliday, setDeletingHoliday] = useState<ReturnRequestHolidayResponse | null>(null);

  // Form state cho Thêm / Sửa
  const [formData, setFormData] = useState<ReturnRequestHolidayRequest>({
    holidayDate: '',
    name: '',
    description: '',
  });
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Tải danh sách ngày lễ theo năm được chọn
  const loadHolidays = useCallback(async (year: number) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await returnAdminService.getHolidays(year);
      if (res && res.data) {
        setHolidays(res.data);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể tải danh sách ngày nghỉ lễ.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHolidays(selectedYear);
  }, [loadHolidays, selectedYear]);

  // Mở modal tạo mới
  const handleOpenCreateModal = () => {
    setFormData({
      holidayDate: `${selectedYear}-01-01`,
      name: '',
      description: '',
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Mở modal sửa (Chỉ gọi cho isDefault === false)
  const handleOpenEditModal = (h: ReturnRequestHolidayResponse) => {
    if (h.isDefault) {
      return; // Bảo vệ mặc định
    }
    setEditingHoliday(h);
    setFormData({
      holidayDate: h.holidayDate,
      name: h.name,
      description: h.description || '',
    });
    setFormError('');
  };

  // Mở dialog xóa (Chỉ gọi cho isDefault === false)
  const handleOpenDeleteDialog = (h: ReturnRequestHolidayResponse) => {
    if (h.isDefault) {
      return; // Bảo vệ mặc định
    }
    setDeletingHoliday(h);
    setFormError('');
  };

  // Xử lý nộp form Thêm mới ngày lễ
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.holidayDate) {
      setFormError('Vui lòng chọn ngày nghỉ lễ.');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('Vui lòng nhập tên ngày nghỉ lễ.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await returnAdminService.createHoliday({
        holidayDate: formData.holidayDate,
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
      });
      setIsCreateModalOpen(false);
      loadHolidays(selectedYear);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tạo ngày lễ.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý nộp form Cập nhật ngày lễ
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingHoliday || !editingHoliday.id) {
      return;
    }

    if (!formData.holidayDate) {
      setFormError('Vui lòng chọn ngày nghỉ lễ.');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('Vui lòng nhập tên ngày nghỉ lễ.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await returnAdminService.updateHoliday(editingHoliday.id, {
        holidayDate: formData.holidayDate,
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
      });
      setEditingHoliday(null);
      loadHolidays(selectedYear);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi cập nhật ngày lễ.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý xác nhận Xóa ngày lễ
  const handleDeleteConfirm = async () => {
    if (!deletingHoliday || !deletingHoliday.id) {
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await returnAdminService.deleteHoliday(deletingHoliday.id);
      setDeletingHoliday(null);
      loadHolidays(selectedYear);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi xóa ngày lễ.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Danh sách các năm lựa chọn (năm trước, năm hiện tại, năm sau, năm sau nữa)
  const yearOptions = [
    { value: String(currentYear - 1), label: `Năm ${currentYear - 1}` },
    { value: String(currentYear), label: `Năm ${currentYear} (Hiện tại)` },
    { value: String(currentYear + 1), label: `Năm ${currentYear + 1}` },
    { value: String(currentYear + 2), label: `Năm ${currentYear + 2}` },
  ];

  return (
    <div className="container py-8 max-w-7xl">
      {/* Header trang */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wide text-content-primary">
            Cấu Hình Lịch Nghỉ Lễ SLA
          </h1>
          <p className="text-sm text-content-secondary mt-1">
            Quản lý các ngày nghỉ lễ dương lịch được trừ ra khi tính thời hạn xử lý 2 ngày làm việc của cam kết SLA.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadHolidays(selectedYear)}
            disabled={isLoading}
            icon={RefreshCw}
          >
            Làm Mới
          </Button>
          <Button
            variant="primary"
            size="sm"
            data-testid="btn-add-holiday"
            onClick={handleOpenCreateModal}
            icon={Plus}
          >
            Thêm Ngày Nghỉ Lễ
          </Button>
        </div>
      </div>

      {/* Thanh Sub-Nav A1, A3, A4 */}
      <AdminReturnSubNav />

      {/* Bộ chọn năm */}
      <div className="flex items-center gap-4 p-4 bg-surface border border-line-light rounded-sm mb-6 max-w-md">
        <label className="text-xs font-semibold text-content-primary shrink-0">
          Xem lịch theo năm:
        </label>
        <Select
          value={String(selectedYear)}
          onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
          options={yearOptions}
        />
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div className="p-4 bg-surface border border-line-error rounded-sm text-status-error text-sm flex items-center gap-2 mb-6">
          <AlertCircle size={18} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Danh sách ngày nghỉ lễ */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-content-muted">
          <div className="w-8 h-8 border-2 border-line border-t-primary rounded-full animate-spin mb-3" />
          <p className="text-sm">Đang tải lịch ngày nghỉ lễ năm {selectedYear}...</p>
        </div>
      ) : holidays.length === 0 ? (
        <div className="p-12 bg-surface border border-line-light rounded-sm text-center">
          <Calendar size={40} className="mx-auto text-content-muted mb-3 opacity-50" />
          <h3 className="text-base font-bold text-content-primary mb-1">
            Chưa có cấu hình ngày nghỉ lễ cho năm {selectedYear}
          </h3>
          <p className="text-xs text-content-secondary max-w-md mx-auto mb-4">
            Bấm nút &quot;Thêm Ngày Nghỉ Lễ&quot; phía trên để bổ sung ngày nghỉ áp dụng tính SLA.
          </p>
          <Button variant="primary" size="sm" onClick={handleOpenCreateModal} icon={Plus}>
            Thêm Ngày Nghỉ Lễ
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto border border-line-light rounded-sm bg-surface-body shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface border-b border-line-light text-content-muted font-bold uppercase tracking-wider">
                <th className="py-3 px-3.5 w-36">Ngày nghỉ lễ</th>
                <th className="py-3 px-3.5">Tên ngày lễ</th>
                <th className="py-3 px-3.5 w-52 whitespace-nowrap">Phân loại</th>
                <th className="py-3 px-3.5">Mô tả</th>
                <th className="py-3 px-3.5 text-center w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-light">
              {holidays.map((h, idx) => (
                <tr key={h.id ?? `default-${idx}`} className="hover:bg-surface transition-colors">
                  <td className="py-3 px-3.5 font-mono font-bold text-sm text-content-primary">
                    {formatDate(h.holidayDate)}
                  </td>

                  <td className="py-3 px-3.5 font-semibold text-content-primary text-sm">
                    {h.name}
                  </td>

                  <td className="py-3 px-3.5 whitespace-nowrap">
                    {h.isDefault ? (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        <Badge variant="dark" className="whitespace-nowrap">
                          <Lock size={10} className="mr-1 shrink-0" />
                          Mặc định hệ thống
                        </Badge>
                      </span>
                    ) : (
                      <Badge variant="vip" className="whitespace-nowrap">
                        Mở rộng / Bổ sung
                      </Badge>
                    )}
                  </td>

                  <td className="py-3 px-3.5 text-content-secondary text-xs">
                    {h.description || '—'}
                  </td>

                  <td className="py-3 px-3.5 text-center">
                    {/* CRITICAL DEFAULT PROTECTION: Nút sửa và xóa bị vô hiệu hóa tuyệt đối khi isDefault === true */}
                    {h.isDefault ? (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] text-content-disabled cursor-not-allowed select-none font-medium"
                        title="Ngày lễ mặc định của hệ thống không thể sửa/xóa"
                      >
                        <Lock size={12} />
                        Khóa sửa/xóa
                      </span>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(h)}
                          className="p-1.5 text-content-secondary hover:text-content-primary hover:bg-surface rounded-sm transition-colors"
                          title="Sửa ngày lễ"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteDialog(h)}
                          className="p-1.5 text-status-error hover:bg-surface rounded-sm transition-colors"
                          title="Xóa ngày lễ"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL THÊM MỚI NGÀY NGHỈ LỄ */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Thêm mới ngày nghỉ lễ SLA"
        size="size-guide"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-content-primary mb-1.5">
              Ngày nghỉ lễ (Dương lịch) <span className="text-status-error">*</span>
            </label>
            <input
              type="date"
              name="holidayDate"
              value={formData.holidayDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, holidayDate: e.target.value }))}
              disabled={isSubmitting}
              className="h-10 w-full rounded-sm border border-line bg-surface-body px-3 text-base text-content-primary focus:border-line-focus focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-content-primary mb-1.5">
              Tên ngày nghỉ lễ <span className="text-status-error">*</span>
            </label>
            <Input
              name="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ví dụ: Nghỉ bù lễ Quốc khánh..."
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-content-primary mb-1.5">
              Mô tả chi tiết (tùy chọn)
            </label>
            <Input
              multiline
              name="description"
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Nhập mô tả chi tiết..."
              disabled={isSubmitting}
            />
          </div>

          {formError && (
            <div className="flex items-center gap-2 p-3 bg-surface border border-line-error rounded-sm text-status-error text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-line-light">
            <Button
              variant="ghost"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Lưu Ngày Lễ
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL SỬA NGÀY NGHỈ LỄ MỞ RỘNG */}
      <Modal
        isOpen={editingHoliday !== null}
        onClose={() => setEditingHoliday(null)}
        title="Chỉnh sửa ngày nghỉ lễ mở rộng"
        size="size-guide"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-content-primary mb-1.5">
              Ngày nghỉ lễ (Dương lịch) <span className="text-status-error">*</span>
            </label>
            <input
              type="date"
              name="holidayDate"
              value={formData.holidayDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, holidayDate: e.target.value }))}
              disabled={isSubmitting}
              className="h-10 w-full rounded-sm border border-line bg-surface-body px-3 text-base text-content-primary focus:border-line-focus focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-content-primary mb-1.5">
              Tên ngày nghỉ lễ <span className="text-status-error">*</span>
            </label>
            <Input
              name="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nhập tên ngày lễ..."
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-content-primary mb-1.5">
              Mô tả chi tiết (tùy chọn)
            </label>
            <Input
              multiline
              name="description"
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Nhập mô tả chi tiết..."
              disabled={isSubmitting}
            />
          </div>

          {formError && (
            <div className="flex items-center gap-2 p-3 bg-surface border border-line-error rounded-sm text-status-error text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-line-light">
            <Button
              variant="ghost"
              onClick={() => setEditingHoliday(null)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Cập Nhật
            </Button>
          </div>
        </form>
      </Modal>

      {/* DIALOG XÁC NHẬN XÓA NGÀY LỄ */}
      <Modal
        isOpen={deletingHoliday !== null}
        onClose={() => setDeletingHoliday(null)}
        title="Xác nhận xóa ngày nghỉ lễ"
        size="size-guide"
      >
        <div className="space-y-4">
          <p className="text-sm text-content-primary">
            Bạn có chắc chắn muốn xóa ngày nghỉ lễ{' '}
            <strong>{deletingHoliday?.name}</strong> (ngày{' '}
            <span className="font-mono">{formatDate(deletingHoliday?.holidayDate)}</span>) khỏi hệ thống không?
          </p>
          <p className="text-xs text-content-secondary">
            Sau khi xóa, ngày này sẽ không còn được trừ ra khi hệ thống tính toán thời hạn SLA 2
            ngày làm việc cho các phiếu trả hàng.
          </p>

          {formError && (
            <div className="flex items-center gap-2 p-3 bg-surface border border-line-error rounded-sm text-status-error text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-line-light">
            <Button
              variant="ghost"
              onClick={() => setDeletingHoliday(null)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              loading={isSubmitting}
            >
              Xác Nhận Xóa
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
