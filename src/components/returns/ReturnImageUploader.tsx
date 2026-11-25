/**
 * Component tải lên ảnh minh chứng cho yêu cầu trả hàng (Return Image Uploader).
 * Hỗ trợ chọn từ 1 đến 5 ảnh, xem trước hình ảnh thu nhỏ (thumbnail preview),
 * xóa từng ảnh đã chọn và kiểm tra tính hợp lệ về dung lượng (<= 5MB) và định dạng tệp tin.
 */

import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, X, AlertCircle, Image as ImageIcon } from 'lucide-react';
import {
  validateReturnImageFiles,
  MAX_RETURN_IMAGES_COUNT,
  ACCEPTED_IMAGE_EXTENSIONS,
} from '../../utils/returnHelpers';
import type { ReturnReason } from '../../types/return';
import { cn } from '../../utils/cn';

export interface ReturnImageUploaderProps {
  /**
   * Danh sách các tệp File hiện tại do component cha quản lý.
   */
  files: File[];
  /**
   * Hàm gọi lại khi danh sách tệp thay đổi.
   */
  onChange: (files: File[]) => void;
  /**
   * Lý do trả hàng (để áp dụng quy tắc bắt buộc 1-5 ảnh khi lỗi sản xuất hoặc sai hàng).
   */
  reason?: ReturnReason | string;
  /**
   * Lỗi từ form bên ngoài truyền vào nếu có.
   */
  error?: string;
  /**
   * Trạng thái vô hiệu hóa thao tác.
   */
  disabled?: boolean;
  /**
   * Class CSS bổ sung tùy chọn.
   */
  className?: string;
}

/**
 * Chức năng: Kiểm tra magic bytes đầu tệp để phát hiện file giả mạo (VD: file text đổi đuôi .jpg).
 *
 * @param file Đầu vào: Tệp ảnh cần kiểm tra chữ ký nhị phân.
 * @returns Đầu ra: Promise<boolean> true nếu đúng chữ ký JPEG, PNG hoặc WebP.
 */
async function hasValidImageSignature(file: File): Promise<boolean> {
  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 4) return false;

    // JPEG: FF D8 FF
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    // PNG: 89 50 4E 47
    const isPng =
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    // WebP: "RIFF" (0..3) + "WEBP" (8..11)
    const isWebp =
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;

    return isJpeg || isPng || isWebp;
  } catch {
    return false;
  }
}

/**
 * Chức năng: Cho phép người dùng chọn, xem trước và quản lý tối đa 5 ảnh minh chứng trả hàng.
 *
 * @param props Đầu vào: ReturnImageUploaderProps.
 * @returns Đầu ra: Thẻ JSX giao diện bộ tải ảnh.
 */
export default function ReturnImageUploader({
  files,
  onChange,
  reason,
  error: externalError,
  disabled = false,
  className = '',
}: ReturnImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [internalError, setInternalError] = useState<string>('');
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Đồng bộ tạo URL preview cho các tệp File đang được chọn và giải phóng bộ nhớ khi đổi tệp
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);

    // Cleanup URLs khi unmount hoặc khi mảng files thay đổi
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  // Xử lý khi người dùng chọn thêm tệp từ input file (kèm kiểm tra magic bytes chống file giả mạo)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Reset input để người dùng có thể chọn lại cùng một file nếu vừa xóa
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setInternalError('');

    // Ghép danh sách tệp mới vào danh sách hiện có
    const combinedFiles = [...files, ...selectedFiles];

    // Kiểm tra giới hạn số lượng ảnh tối đa 5 ảnh
    if (combinedFiles.length > MAX_RETURN_IMAGES_COUNT) {
      setInternalError(`Chỉ được tải lên tối đa ${MAX_RETURN_IMAGES_COUNT} ảnh minh chứng.`);
      return;
    }

    // Thẩm định danh sách tệp theo quy chuẩn tiện ích thuần
    const validation = validateReturnImageFiles(combinedFiles, reason);
    if (!validation.isValid) {
      setInternalError(validation.error || 'Tệp tải lên không hợp lệ.');
      return;
    }

    // Kiểm tra chữ ký nhị phân của từng tệp mới chọn
    const signatures = await Promise.all(selectedFiles.map((f) => hasValidImageSignature(f)));
    if (signatures.some((ok) => !ok)) {
      setInternalError('Định dạng ảnh không hợp lệ. Hệ thống chỉ hỗ trợ JPG, JPEG, PNG và WebP.');
      return;
    }

    onChange(combinedFiles);
  };

  // Xóa một tệp khỏi danh sách dựa trên chỉ số index
  const handleRemoveFile = (indexToRemove: number) => {
    if (disabled) return;
    setInternalError('');
    const updatedFiles = files.filter((_, idx) => idx !== indexToRemove);
    onChange(updatedFiles);
  };

  // Kích hoạt hộp thoại chọn file của trình duyệt
  const triggerFileDialog = () => {
    if (disabled) return;
    if (files.length >= MAX_RETURN_IMAGES_COUNT) {
      setInternalError(`Bạn đã chọn đủ ${MAX_RETURN_IMAGES_COUNT} ảnh minh chứng.`);
      return;
    }
    fileInputRef.current?.click();
  };

  const displayError = internalError || externalError;
  const isImageMandatory = reason === 'DEFECTIVE' || reason === 'WRONG_ITEM';

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Tiêu đề và nhãn số lượng ảnh */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-content-primary flex items-center gap-1.5">
          <span>Ảnh minh chứng</span>
          {isImageMandatory ? (
            <span className="text-accent-red font-bold">* (Bắt buộc từ 1–5 ảnh)</span>
          ) : (
            <span className="text-content-muted text-xs font-normal">(Tùy chọn, tối đa 5 ảnh)</span>
          )}
        </label>
        <span className="text-xs text-content-muted">
          Đã chọn: <strong className="text-content-primary">{files.length}</strong>/{MAX_RETURN_IMAGES_COUNT}
        </span>
      </div>

      {/* Input file ẩn của trình duyệt */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_IMAGE_EXTENSIONS.join(', ')}
        onChange={handleFileSelect}
        disabled={disabled || files.length >= MAX_RETURN_IMAGES_COUNT}
        className="hidden"
      />

      {/* Lưới hình ảnh xem trước thu nhỏ (Thumbnail Preview Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {previewUrls.map((url, idx) => (
          <div
            key={`${url}-${idx}`}
            className="relative aspect-square border border-line-light rounded-sm overflow-hidden bg-surface group"
          >
            <img
              src={url}
              alt={`Ảnh minh chứng ${idx + 1}`}
              className="w-full h-full object-cover"
            />
            {/* Nút xóa ảnh */}
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemoveFile(idx)}
                aria-label={`Xóa ảnh ${idx + 1}`}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-surface-dark text-content-inverse flex items-center justify-center opacity-85 hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            )}
            <div className="absolute bottom-1 left-1.5 text-[10px] bg-surface-dark text-content-inverse px-1 py-0.5 rounded-sm opacity-75">
              Ảnh {idx + 1}
            </div>
          </div>
        ))}

        {/* Nút ô bấm thêm ảnh nếu chưa đủ 5 ảnh */}
        {files.length < MAX_RETURN_IMAGES_COUNT && !disabled && (
          <button
            type="button"
            onClick={triggerFileDialog}
            className={cn(
              'aspect-square border-2 border-dashed border-line-light rounded-sm flex flex-col items-center justify-center gap-1.5 p-2 text-content-muted',
              'hover:border-primary hover:text-content-primary hover:bg-surface transition-colors cursor-pointer',
              displayError && 'border-line-error'
            )}
          >
            <UploadCloud size={24} />
            <span className="text-xs font-medium text-center">Thêm ảnh</span>
            <span className="text-[10px] text-content-muted">Tối đa 5MB</span>
          </button>
        )}
      </div>

      {/* Hướng dẫn định dạng & dung lượng cho khách hàng */}
      <div className="flex items-center gap-2 text-xs text-content-muted">
        <ImageIcon size={14} className="shrink-0" />
        <span>Hỗ trợ định dạng JPG, JPEG, PNG, WebP (dung lượng mỗi ảnh không vượt quá 5MB).</span>
      </div>

      {/* Thông báo lỗi nếu vi phạm số lượng, định dạng hoặc dung lượng */}
      {displayError && (
        <div className="flex items-center gap-1.5 text-xs text-status-error font-medium">
          <AlertCircle size={14} className="shrink-0" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}
