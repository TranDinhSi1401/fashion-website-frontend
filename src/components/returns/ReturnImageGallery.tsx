/**
 * Component hiển thị thư viện ảnh minh chứng (Return Image Gallery).
 * Kết nối dữ liệu ảnh từ Backend (ReturnRequestImageResponse[]), hiển thị lưới ảnh thu nhỏ
 * và cho phép bấm vào từng ảnh để phóng to toàn màn hình thông qua component Modal.
 */

import React, { useState } from 'react';
import { ZoomIn, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import Modal from '../ui/Modal';
import type { ReturnRequestImageResponse } from '../../types/return';
import { cn } from '../../utils/cn';

export interface ReturnImageGalleryProps {
  /**
   * Danh sách hình ảnh minh chứng trả về từ Backend API.
   */
  images?: ReturnRequestImageResponse[] | null;
  /**
   * Class CSS bổ sung tùy chọn.
   */
  className?: string;
}

/**
 * Chức năng: Hiển thị danh sách ảnh minh chứng và hộp thoại phóng to chi tiết.
 *
 * @param props Đầu vào: ReturnImageGalleryProps.
 * @returns Đầu ra: Thẻ JSX lưới ảnh và Modal xem ảnh lớn.
 */
export default function ReturnImageGallery({ images, className = '' }: ReturnImageGalleryProps) {
  const safeImages = Array.isArray(images) ? images : [];
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Nếu không có bất kỳ ảnh minh chứng nào
  if (safeImages.length === 0) {
    return (
      <div className={cn('p-6 bg-surface border border-line-light text-center rounded-sm', className)}>
        <div className="flex flex-col items-center justify-center gap-2 text-content-muted">
          <ImageIcon size={32} />
          <p className="text-sm">Yêu cầu này không đính kèm ảnh minh chứng.</p>
        </div>
      </div>
    );
  }

  const currentImage = selectedImageIndex !== null ? safeImages[selectedImageIndex] : null;

  // Điều hướng chuyển ảnh trước/sau trong modal
  const handlePrev = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((selectedImageIndex - 1 + safeImages.length) % safeImages.length);
    }
  };

  const handleNext = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((selectedImageIndex + 1) % safeImages.length);
    }
  };

  return (
    <div className={className}>
      {/* Lưới hình ảnh thu nhỏ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {safeImages.map((img, idx) => (
          <div
            key={img.id || `${img.imageUrl}-${idx}`}
            onClick={() => setSelectedImageIndex(idx)}
            className="group relative aspect-square border border-line-light rounded-sm overflow-hidden bg-surface cursor-pointer"
          >
            <img
              src={img.imageUrl}
              alt={`Ảnh minh chứng ${idx + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {/* Lớp phủ hover với biểu tượng kính lúp */}
            <div className="absolute inset-0 bg-surface-dark/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="flex items-center gap-1 text-content-inverse text-xs font-semibold px-2 py-1 bg-surface-dark/70 rounded-sm">
                <ZoomIn size={14} /> Phóng to
              </span>
            </div>
            {/* Chỉ mục ảnh */}
            <div className="absolute bottom-1 left-1.5 text-[10px] bg-surface-dark text-content-inverse px-1 py-0.5 rounded-sm opacity-80">
              {idx + 1}/{safeImages.length}
            </div>
          </div>
        ))}
      </div>

      {/* Modal phóng to hình ảnh chi tiết */}
      <Modal
        isOpen={selectedImageIndex !== null}
        onClose={() => setSelectedImageIndex(null)}
        title={
          selectedImageIndex !== null
            ? `Ảnh minh chứng (${selectedImageIndex + 1}/${safeImages.length})`
            : 'Chi tiết ảnh minh chứng'
        }
        size="quick-view"
      >
        {currentImage && (
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative flex items-center justify-center w-full max-h-[70vh] overflow-hidden bg-surface-dark/5 rounded-sm">
              <img
                src={currentImage.imageUrl}
                alt={`Ảnh minh chứng chi tiết ${selectedImageIndex !== null ? selectedImageIndex + 1 : ''}`}
                className="max-h-[65vh] w-auto max-w-full object-contain"
              />

              {/* Nút điều hướng ảnh trước */}
              {safeImages.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Ảnh trước"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface-dark/70 text-content-inverse flex items-center justify-center hover:bg-surface-dark transition-colors"
                >
                  <ChevronLeft size={22} />
                </button>
              )}

              {/* Nút điều hướng ảnh sau */}
              {safeImages.length > 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Ảnh tiếp theo"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface-dark/70 text-content-inverse flex items-center justify-center hover:bg-surface-dark transition-colors"
                >
                  <ChevronRight size={22} />
                </button>
              )}
            </div>

            {/* Chú thích thông tin ảnh */}
            <div className="text-center text-xs text-content-muted">
              Đang xem ảnh {selectedImageIndex !== null ? selectedImageIndex + 1 : 0} trên tổng số {safeImages.length} ảnh minh chứng
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
