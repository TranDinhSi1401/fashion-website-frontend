import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Package,
  RotateCcw,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { reviewService } from '../../services/reviewService';
import type {
  ProductReviewImageResponse,
  ProductReviewUpsertPayload,
  ReviewableOrderItemResponse,
} from '../../types/review';
import { cn } from '../../utils/cn';

interface OrderReviewModalProps {
  isOpen: boolean;
  item: ReviewableOrderItemResponse | null;
  onClose: () => void;
  onSuccess: (message: string) => Promise<void> | void;
}

interface PendingImageFile {
  id: string;
  file: File;
  previewUrl: string;
}

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const STAR_LABELS: Record<number, string> = {
  1: 'Rất tệ',
  2: 'Không hài lòng',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Tuyệt vời',
};

const FIT_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'Chật' },
  { value: 2, label: 'Đúng kích cỡ' },
  { value: 3, label: 'Hơi rộng' },
];

function parseInitialFitRating(fitRating?: string | number | null): number | null {
  if (fitRating == null || fitRating === '') return null;
  const normalized = String(fitRating).trim().toUpperCase();
  if (normalized === '1' || normalized === 'CHẬT' || normalized === 'CHAT') return 1;
  if (normalized === '2' || normalized === 'ĐÚNG KÍCH CỠ' || normalized === 'DUNG KICH CO') return 2;
  if (normalized === '3' || normalized === 'HƠI RỘNG' || normalized === 'HOI RONG') return 3;
  const numeric = Number(normalized);
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 3 ? numeric : null;
}

function extractApiError(err: unknown, fallback: string): string {
  const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
  return axiosErr?.response?.data?.message || axiosErr?.message || fallback;
}

interface OrderReviewFormProps {
  item: ReviewableOrderItemResponse;
  onBusyChange: (busy: boolean) => void;
  onClose: () => void;
  onSuccess: (message: string) => Promise<void> | void;
}

function OrderReviewForm({ item, onBusyChange, onClose, onSuccess }: OrderReviewFormProps) {
  const existingReview = item.review ?? null;
  const isEditMode = Boolean(existingReview);

  const [rating, setRating] = useState<number>(() => existingReview?.rating ?? 5);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [fitRating, setFitRating] = useState<number | null>(() =>
    parseInitialFitRating(existingReview?.fitRating)
  );
  const [comment, setComment] = useState<string>(() => existingReview?.comment ?? '');

  const existingImages: ProductReviewImageResponse[] = useMemo(
    () => existingReview?.images ?? [],
    [existingReview]
  );
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingImageFile[]>([]);

  const [formError, setFormError] = useState<string>('');
  const [imageError, setImageError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const createdUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    onBusyChange(isSubmitting || isDeleting);
  }, [isSubmitting, isDeleting, onBusyChange]);

  // Giải phóng toàn bộ objectURL đã tạo khi đóng/unmount form
  useEffect(() => {
    const urlsRef = createdUrlsRef;
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      urlsRef.current = [];
    };
  }, []);

  const keptExistingImages = useMemo(
    () => existingImages.filter((img) => !removedImageIds.includes(img.id)),
    [existingImages, removedImageIds]
  );

  const totalSelectedImages = keptExistingImages.length + pendingFiles.length;
  const remainingSlots = Math.max(0, MAX_IMAGES - totalSelectedImages);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setImageError('');
    const fileList = Array.from(e.target.files || []);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (fileList.length === 0) return;

    const accepted: PendingImageFile[] = [];
    let currentCount = totalSelectedImages;

    for (const file of fileList) {
      if (currentCount >= MAX_IMAGES) {
        setImageError(`Mỗi đánh giá chỉ được đính kèm tối đa ${MAX_IMAGES} hình ảnh.`);
        break;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setImageError(`Ảnh "${file.name}" vượt quá giới hạn 5MB.`);
        continue;
      }

      const lowerType = (file.type || '').toLowerCase();
      const lowerName = (file.name || '').toLowerCase();
      const validFormat =
        ALLOWED_MIME_TYPES.includes(lowerType) ||
        ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

      if (!validFormat) {
        setImageError('Chỉ hỗ trợ định dạng ảnh JPG, JPEG, PNG hoặc WebP.');
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      createdUrlsRef.current.push(previewUrl);
      accepted.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl,
      });
      currentCount += 1;
    }

    if (accepted.length > 0) {
      setPendingFiles((prev) => [...prev, ...accepted]);
    }
  };

  const handleToggleRemoveExisting = (imageId: number) => {
    setImageError('');
    setRemovedImageIds((prev) => {
      if (prev.includes(imageId)) {
        if (totalSelectedImages >= MAX_IMAGES) {
          setImageError(`Đã đủ tối đa ${MAX_IMAGES} ảnh, hãy bỏ bớt ảnh mới trước khi khôi phục.`);
          return prev;
        }
        return prev.filter((id) => id !== imageId);
      }
      return [...prev, imageId];
    });
  };

  const handleRemovePending = (id: string) => {
    setImageError('');
    setPendingFiles((prev) => {
      const target = prev.find((pf) => pf.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        createdUrlsRef.current = createdUrlsRef.current.filter((u) => u !== target.previewUrl);
      }
      return prev.filter((pf) => pf.id !== id);
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setImageError('');

    if (rating < 1 || rating > 5) {
      setFormError('Vui lòng chọn số sao từ 1 đến 5.');
      return;
    }

    const trimmedComment = comment.trim();
    if (trimmedComment.length > 1000) {
      setFormError('Nội dung nhận xét không được vượt quá 1000 ký tự.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: ProductReviewUpsertPayload = {
        rating,
        comment: trimmedComment,
        ...(fitRating != null ? { fitRating } : {}),
      };

      let savedReviewId: number;
      if (isEditMode && existingReview) {
        const res = await reviewService.updateReview(existingReview.id, payload);
        savedReviewId = res.data?.id ?? existingReview.id;

        for (const imageId of removedImageIds) {
          await reviewService.deleteReviewImage(imageId);
        }
      } else {
        const res = await reviewService.createReview({
          ...payload,
          productId: item.productId,
          orderItemId: item.orderItemId,
        });
        if (!res.data?.id) {
          throw new Error('Không nhận được mã đánh giá sau khi tạo.');
        }
        savedReviewId = res.data.id;
      }

      let failedUploadCount = 0;
      const baseDisplayOrder = keptExistingImages.length;
      for (let i = 0; i < pendingFiles.length; i += 1) {
        try {
          await reviewService.uploadReviewImage(
            savedReviewId,
            pendingFiles[i].file,
            baseDisplayOrder + i + 1
          );
        } catch {
          failedUploadCount += 1;
        }
      }

      const baseMsg = isEditMode
        ? 'Đã cập nhật đánh giá sản phẩm thành công.'
        : 'Cảm ơn bạn đã gửi đánh giá sản phẩm!';
      const finalMsg =
        failedUploadCount > 0
          ? `${baseMsg} (Lưu ý: ${failedUploadCount} ảnh chưa tải lên được, bạn có thể thử bổ sung lại).`
          : baseMsg;

      await onSuccess(finalMsg);
      onClose();
    } catch (err) {
      setFormError(
        extractApiError(
          err,
          isEditMode
            ? 'Không thể cập nhật đánh giá. Vui lòng thử lại.'
            : 'Không thể gửi đánh giá. Vui lòng thử lại.'
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!existingReview) return;
    setFormError('');
    setIsDeleting(true);
    try {
      await reviewService.deleteReview(existingReview.id);
      await onSuccess('Đã xóa đánh giá sản phẩm.');
      onClose();
    } catch (err) {
      setFormError(extractApiError(err, 'Không thể xóa đánh giá. Vui lòng thử lại.'));
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const displayStar = hoveredStar ?? rating;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Thông tin sản phẩm đã mua */}
      <div className="flex items-center gap-4 border border-line-light bg-surface p-4">
        {item.productImageUrl ? (
          <img
            src={item.productImageUrl}
            alt={item.productName}
            className="aspect-[3/4] w-14 shrink-0 border border-line-light object-cover"
          />
        ) : (
          <div className="flex aspect-[3/4] w-14 shrink-0 items-center justify-center border border-line-light bg-surface-body text-content-muted">
            <Package size={20} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-semibold text-content-primary">
            {item.productName}
          </p>
          {item.variantInfo && (
            <p className="mt-0.5 text-xs text-content-secondary">
              Phân loại:{' '}
              <span className="font-medium text-content-primary">{item.variantInfo}</span>
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-content-muted">
            {item.orderCode && <span>Mã đơn: #{item.orderCode}</span>}
            <span className="inline-flex items-center gap-1 font-medium text-status-success">
              <CheckCircle2 size={13} />
              Đã mua hàng
            </span>
          </div>
        </div>
      </div>

      {/* Báo lỗi biểu mẫu */}
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2 border border-status-error bg-surface p-3 text-xs text-status-error"
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* 1. Chọn số sao */}
      <div>
        <label className="mb-2 block text-[13px] font-semibold text-content-primary">
          Chất lượng sản phẩm <span className="text-status-error">*</span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex items-center gap-1"
            onMouseLeave={() => setHoveredStar(null)}
            role="radiogroup"
            aria-label="Chọn số sao đánh giá"
          >
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= displayStar;
              return (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={rating === star}
                  aria-label={`${star} sao - ${STAR_LABELS[star]}`}
                  onMouseEnter={() => setHoveredStar(star)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <Star
                    size={28}
                    className={
                      active ? 'fill-primary text-primary' : 'fill-transparent text-line'
                    }
                  />
                </button>
              );
            })}
          </div>
          <span className="text-sm font-semibold text-content-primary">
            {displayStar}/5 — {STAR_LABELS[displayStar]}
          </span>
        </div>
      </div>

      {/* 2. Độ vừa vặn */}
      <div>
        <label className="mb-2 block text-[13px] font-semibold text-content-primary">
          Độ vừa vặn thực tế <span className="font-normal text-content-muted">(Tùy chọn)</span>
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          {FIT_OPTIONS.map((option) => {
            const selected = fitRating === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  setFitRating((prev) => (prev === option.value ? null : option.value))
                }
                className={cn(
                  'h-10 rounded-sm border px-3 text-xs font-semibold uppercase tracking-wide transition-colors',
                  selected
                    ? 'border-primary bg-primary text-content-inverse'
                    : 'border-line bg-surface-body text-content-primary hover:border-primary'
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Nội dung nhận xét */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label
            htmlFor="review-comment"
            className="text-[13px] font-semibold text-content-primary"
          >
            Nhận xét của bạn
          </label>
          <span className="text-xs text-content-muted">{comment.length}/1000</span>
        </div>
        <textarea
          id="review-comment"
          rows={4}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Chia sẻ cảm nhận về chất liệu vải, đường may, màu sắc và phom dáng sản phẩm..."
          className="w-full resize-none rounded-input border border-line bg-surface-body p-3.5 text-sm leading-relaxed text-content-primary outline-none transition-colors placeholder:text-content-muted focus:border-primary"
        />
      </div>

      {/* 4. Ảnh thực tế sản phẩm (tối đa 5 ảnh) */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-content-primary">
            Ảnh thực tế ({totalSelectedImages}/{MAX_IMAGES})
          </span>
          <span className="text-xs text-content-muted">JPG, PNG, WebP • Tối đa 5MB/ảnh</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-wrap items-center gap-3">
          {existingImages.map((img) => {
            const markedRemoved = removedImageIds.includes(img.id);
            return (
              <div
                key={img.id}
                className={cn(
                  'relative aspect-[3/4] w-20 overflow-hidden border border-line-light bg-surface',
                  markedRemoved && 'opacity-40'
                )}
              >
                <img
                  src={img.imageUrl}
                  alt="Ảnh đánh giá đã tải lên"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleToggleRemoveExisting(img.id)}
                  aria-label={markedRemoved ? 'Khôi phục ảnh' : 'Gỡ ảnh này'}
                  title={markedRemoved ? 'Khôi phục ảnh' : 'Gỡ ảnh này'}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-dark/80 text-content-inverse hover:bg-dark"
                >
                  {markedRemoved ? <RotateCcw size={12} /> : <X size={13} />}
                </button>
              </div>
            );
          })}

          {pendingFiles.map((pf) => (
            <div
              key={pf.id}
              className="relative aspect-[3/4] w-20 overflow-hidden border border-primary bg-surface"
            >
              <img
                src={pf.previewUrl}
                alt={pf.file.name}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemovePending(pf.id)}
                aria-label={`Bỏ ảnh ${pf.file.name}`}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-dark/80 text-content-inverse hover:bg-dark"
              >
                <X size={13} />
              </button>
            </div>
          ))}

          {remainingSlots > 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-[3/4] w-20 flex-col items-center justify-center gap-1 border border-dashed border-line bg-surface text-content-secondary transition-colors hover:border-primary hover:text-content-primary"
            >
              <ImagePlus size={20} />
              <span className="text-[11px] font-medium">Thêm ảnh</span>
            </button>
          )}
        </div>

        {imageError && <p className="mt-1.5 text-xs italic text-status-error">{imageError}</p>}
      </div>

      {/* Thanh hành động đáy Modal */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-line-light pt-5">
        <div>
          {isEditMode && !confirmDelete && (
            <button
              type="button"
              disabled={isSubmitting || isDeleting}
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-error hover:underline disabled:opacity-50"
            >
              <Trash2 size={14} />
              <span>Xóa đánh giá</span>
            </button>
          )}

          {isEditMode && confirmDelete && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-status-error">Xác nhận xóa?</span>
              <Button
                type="button"
                variant="danger"
                size="sm"
                loading={isDeleting}
                disabled={isSubmitting}
                onClick={handleDeleteReview}
              >
                Xóa
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isDeleting}
                onClick={() => setConfirmDelete(false)}
              >
                Hủy
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isSubmitting || isDeleting}
            onClick={onClose}
          >
            Đóng
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={isSubmitting}
            disabled={isDeleting}
          >
            {isEditMode ? 'Lưu Thay Đổi' : 'Gửi Đánh Giá'}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default function OrderReviewModal({
  isOpen,
  item,
  onClose,
  onSuccess,
}: OrderReviewModalProps) {
  const [isBusy, setIsBusy] = useState(false);

  if (!item) return null;

  const isEditMode = Boolean(item.review);
  const formKey = `${item.orderItemId}-${item.review?.id ?? 'new'}-${item.review?.updatedAt ?? ''}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isBusy ? () => {} : onClose}
      title={isEditMode ? 'Xem & Chỉnh Sửa Đánh Giá' : 'Đánh Giá Sản Phẩm'}
      size="size-guide"
    >
      <OrderReviewForm
        key={formKey}
        item={item}
        onBusyChange={setIsBusy}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}
