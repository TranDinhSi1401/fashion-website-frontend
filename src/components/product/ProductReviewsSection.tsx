import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Star,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { reviewService } from '../../services/reviewService';
import {
  ProductReviewResponse,
  ReviewSummaryResponse,
} from '../../types/review';
import { cn } from '../../utils/cn';

interface ProductReviewsSectionProps {
  productId: number;
  onSummaryChange?: (summary: ReviewSummaryResponse) => void;
}

const PAGE_SIZE = 5;

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Mới nhất' },
  { value: 'createdAt,asc', label: 'Cũ nhất' },
  { value: 'rating,desc', label: 'Số sao cao nhất' },
  { value: 'rating,asc', label: 'Số sao thấp nhất' },
] as const;

function formatDateVN(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function isEditedReview(createdAt?: string, updatedAt?: string): boolean {
  if (!createdAt || !updatedAt) return false;
  const created = new Date(createdAt).getTime();
  const updated = new Date(updatedAt).getTime();
  if (Number.isNaN(created) || Number.isNaN(updated)) return false;
  return updated - created > 5000;
}

function resolveFitBadge(fitRating?: string | number | null): string | null {
  if (fitRating == null || fitRating === '') return null;
  const normalized = String(fitRating).trim().toUpperCase();
  if (normalized === '1' || normalized === 'CHẬT' || normalized === 'CHAT') return 'CHẬT';
  if (normalized === '2' || normalized === 'ĐÚNG KÍCH CỠ' || normalized === 'DUNG KICH CO') {
    return 'ĐÚNG KÍCH CỠ';
  }
  if (normalized === '3' || normalized === 'HƠI RỘNG' || normalized === 'HOI RONG') {
    return 'HƠI RỘNG';
  }
  return normalized;
}

function getReviewerDisplayName(review: ProductReviewResponse): string {
  const full = review.fullName?.trim();
  if (full) return full;
  const uname = review.userName?.trim();
  if (uname) return uname;
  return `Khách hàng #${review.userId}`;
}

function getAvatarInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'K';
  const parts = trimmed.split(/\s+/);
  const firstWord = parts[0];
  return (firstWord.charAt(0) || 'K').toUpperCase();
}

function StarRow({
  rating,
  size = 14,
  className = '',
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  const rounded = Math.round(rating);
  return (
    <div className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${rating} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= rounded;
        return (
          <Star
            key={star}
            size={size}
            className={filled ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-[#CCCCCC]'}
          />
        );
      })}
    </div>
  );
}

export default function ProductReviewsSection({
  productId,
  onSummaryChange,
}: ProductReviewsSectionProps) {
  const { user } = useAuth();

  const [summary, setSummary] = useState<ReviewSummaryResponse>({
    averageRating: 0,
    totalReviews: 0,
    countByStar: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [reviews, setReviews] = useState<ProductReviewResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedStar, setSelectedStar] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>('createdAt,desc');
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  // Trạng thái Lightbox xem ảnh thực tế
  const [lightboxState, setLightboxState] = useState<{
    review: ProductReviewResponse;
    activeIndex: number;
  } | null>(null);

  const loadSummary = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await reviewService.getProductReviewSummary(productId, signal);
        if (res.data) {
          setSummary(res.data);
          onSummaryChange?.(res.data);
        }
      } catch {
        /* Giữ nguyên thống kê hiện tại nếu lỗi tạm thời */
      }
    },
    [productId, onSummaryChange]
  );

  const loadReviews = useCallback(
    async (page: number, rating: number | null, sort: string, signal?: AbortSignal) => {
      setLoading(true);
      setListError('');
      try {
        const res = await reviewService.getProductReviews(
          productId,
          { page, size: PAGE_SIZE, rating, sort },
          signal
        );
        if (res.data) {
          setReviews(res.data.content || []);
          setTotalElements(res.data.totalElements ?? 0);
          setTotalPages(res.data.totalPages ?? 0);
          setCurrentPage(res.data.number ?? page);
        }
      } catch {
        if (!signal?.aborted) {
          setListError('Không thể tải danh sách đánh giá. Vui lòng thử lại.');
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [productId]
  );

  useEffect(() => {
    setSelectedStar(null);
    setCurrentPage(0);
    setSortBy('createdAt,desc');
  }, [productId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadSummary(controller.signal);
    return () => controller.abort();
  }, [loadSummary]);

  useEffect(() => {
    const controller = new AbortController();
    void loadReviews(currentPage, selectedStar, sortBy, controller.signal);
    return () => controller.abort();
  }, [loadReviews, currentPage, selectedStar, sortBy]);

  const starDistribution = useMemo(() => {
    const total = summary.totalReviews || 0;
    return [5, 4, 3, 2, 1].map((star) => {
      const count = summary.countByStar?.[star] ?? 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return { star, count, percentage };
    });
  }, [summary]);

  const startItemIndex = totalElements === 0 ? 0 : currentPage * PAGE_SIZE + 1;
  const endItemIndex = Math.min(totalElements, (currentPage + 1) * PAGE_SIZE);

  return (
    <section
      id="product-reviews-section"
      className="mt-16 border-t border-line-light pt-12"
      aria-labelledby="product-reviews-heading"
    >
      {/* Tiêu đề phân khu ĐÁNH GIÁ SẢN PHẨM */}
      <div className="mb-6">
        <h2
          id="product-reviews-heading"
          className="text-xl font-bold uppercase tracking-wider text-content-primary"
        >
          ĐÁNH GIÁ SẢN PHẨM
        </h2>
        <div className="mt-2 h-0.5 w-10 bg-primary" />
        <p className="mt-3 text-sm text-content-secondary">
          Nhận xét thực tế từ khách hàng đã mua và trải nghiệm sản phẩm.
        </p>
      </div>

      {/* Khối Tổng quan Đánh giá (Chỉ hiển thị thống kê điểm & phân bố sao cho người mua xem) */}
      <div className="grid grid-cols-1 items-center gap-6 border border-line-light bg-surface p-6 md:grid-cols-12 md:p-8">
        {/* Cột 1: Điểm trung bình */}
        <div className="flex flex-col items-center justify-center text-center md:col-span-4 md:border-r md:border-line-light md:pr-6">
          <div className="flex items-baseline gap-1">
            <span className="text-[44px] font-bold leading-none text-content-primary">
              {Number(summary.averageRating || 0).toFixed(1)}
            </span>
            <span className="text-lg font-medium text-content-muted">/5</span>
          </div>
          <StarRow rating={summary.averageRating || 0} size={16} className="mt-2.5" />
          <p className="mt-2 text-xs text-content-secondary">
            {summary.totalReviews || 0} lượt đánh giá
          </p>
        </div>

        {/* Cột 2: Thanh phân bố 5 mức sao */}
        <div className="flex flex-col gap-2.5 md:col-span-8 md:pl-4">
          {starDistribution.map(({ star, percentage }) => (
            <div key={star} className="flex items-center gap-3 text-xs">
              <span className="w-11 shrink-0 text-content-secondary">{star} sao</span>
              <div className="h-1.5 flex-1 overflow-hidden bg-[#E2E2E2]">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-9 shrink-0 text-right text-content-muted">{percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Thanh Lọc theo số sao & Sắp xếp */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-line-light pb-5">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Lọc theo số sao">
          <button
            type="button"
            onClick={() => {
              setSelectedStar(null);
              setCurrentPage(0);
            }}
            className={cn(
              'h-9 rounded-sm border px-3.5 text-xs font-medium transition-colors',
              selectedStar === null
                ? 'border-primary bg-primary font-semibold text-content-inverse'
                : 'border-line bg-surface-body text-content-primary hover:border-primary'
            )}
          >
            Tất cả ({summary.totalReviews || 0})
          </button>

          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.countByStar?.[star] ?? 0;
            const active = selectedStar === star;
            return (
              <button
                key={star}
                type="button"
                onClick={() => {
                  setSelectedStar(star);
                  setCurrentPage(0);
                }}
                className={cn(
                  'inline-flex h-9 items-center gap-1 rounded-sm border px-3.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary font-semibold text-content-inverse'
                    : 'border-line bg-surface-body text-content-primary hover:border-primary'
                )}
              >
                <span>{star} <span className="text-amber-400">★</span></span>
                <span className={active ? 'text-content-inverse/80' : 'text-content-muted'}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5">
          <label htmlFor="review-sort-select" className="text-xs font-semibold text-content-primary">
            Sắp xếp:
          </label>
          <select
            id="review-sort-select"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(0);
            }}
            className="h-9 min-w-[150px] border border-line bg-surface-body px-3 text-xs font-medium text-content-primary outline-none transition-colors focus:border-primary"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dòng đếm số lượng hiển thị */}
      <div className="border-b border-line-light py-3 text-xs text-content-muted">
        {totalElements > 0
          ? `Hiển thị ${startItemIndex}–${endItemIndex} trên ${totalElements} đánh giá`
          : 'Chưa có đánh giá nào phù hợp bộ lọc'}
      </div>

      {/* Danh sách thẻ đánh giá (Chế độ chỉ xem dành cho người mua) */}
      {loading ? (
        <div className="py-12 text-center text-sm text-content-secondary" role="status">
          Đang tải đánh giá sản phẩm…
        </div>
      ) : listError ? (
        <div className="py-10 text-center" role="alert">
          <p className="text-sm text-status-error">{listError}</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-12 text-center text-sm text-content-secondary">
          Chưa có nhận xét nào cho sản phẩm này.
        </div>
      ) : (
        <div className="divide-y divide-line-light">
          {reviews.map((review) => {
            const reviewerName = getReviewerDisplayName(review);
            const initial = getAvatarInitial(reviewerName);
            const isOwnReview = Boolean(user && review.userId === user.id);
            const fitBadge = resolveFitBadge(review.fitRating);
            const edited = isEditedReview(review.createdAt, review.updatedAt);

            return (
              <article
                key={review.id}
                className="grid grid-cols-1 gap-4 py-6 md:grid-cols-[210px_1fr] md:gap-6"
              >
                {/* Cột trái: Avatar + Tên + Ngày */}
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                      isOwnReview
                        ? 'bg-primary text-content-inverse'
                        : 'border border-line-light bg-surface text-content-primary'
                    )}
                    aria-hidden="true"
                  >
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-content-primary">{reviewerName}</p>
                    <p className="mt-0.5 text-xs text-content-muted">
                      {formatDateVN(review.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Cột phải: Số sao, Độ vừa vặn, Thông số cơ thể, Nội dung, Ảnh thực tế */}
                <div className="flex flex-col items-start">
                  <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
                    <StarRow rating={review.rating} size={14} />

                    {fitBadge && (
                      <span className="rounded-sm border border-line px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-content-primary">
                        {fitBadge}
                      </span>
                    )}

                    {review.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-status-success">
                        <CheckCircle2 size={13} className="shrink-0" />
                        <span>Đã mua hàng</span>
                      </span>
                    )}

                    {review.variantInfo && (
                      <span className="text-xs text-content-muted">
                        Phân loại: {review.variantInfo}
                      </span>
                    )}

                    {isOwnReview && (
                      <span className="rounded-sm bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-content-inverse">
                        ĐÁNH GIÁ CỦA BẠN
                      </span>
                    )}
                  </div>

                  {review.comment && (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-content-primary">
                      {review.comment}
                    </p>
                  )}

                  {edited && (
                    <p className="mt-2 text-xs italic text-content-muted">
                      Đã chỉnh sửa {formatDateVN(review.updatedAt)}
                    </p>
                  )}

                  {review.images && review.images.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      {review.images.map((img, idx) => (
                        <button
                          key={img.id || `${review.id}-${idx}`}
                          type="button"
                          onClick={() => setLightboxState({ review, activeIndex: idx })}
                          className="h-[92px] w-[72px] overflow-hidden border border-line-light bg-surface transition-colors hover:border-primary"
                          aria-label={`Xem ảnh thực tế ${idx + 1} của ${reviewerName}`}
                        >
                          <img
                            src={img.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Thanh phân trang số ở cuối danh sách */}
      {totalPages > 1 && (
        <nav
          className="mt-8 flex items-center justify-center gap-1.5"
          aria-label="Phân trang đánh giá"
        >
          <button
            type="button"
            disabled={currentPage <= 0}
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            aria-label="Trang trước"
            className="grid h-9 w-9 place-items-center rounded-sm border border-line bg-surface-body text-content-primary transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>

          {Array.from({ length: totalPages }, (_, index) => {
            const active = index === currentPage;
            return (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentPage(index)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'h-9 w-9 rounded-sm border text-xs font-semibold transition-colors',
                  active
                    ? 'border-primary bg-primary text-content-inverse'
                    : 'border-line bg-surface-body text-content-primary hover:border-primary'
                )}
              >
                {index + 1}
              </button>
            );
          })}

          <button
            type="button"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            aria-label="Trang tiếp theo"
            className="grid h-9 w-9 place-items-center rounded-sm border border-line bg-surface-body text-content-primary transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </nav>
      )}

      {/* Lightbox xem phóng to hình ảnh thực tế của đánh giá */}
      {lightboxState && lightboxState.review.images && lightboxState.review.images.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={() => setLightboxState(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh thực tế đánh giá"
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-[780px] flex-col overflow-hidden rounded-modal bg-surface-elevated shadow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxState(null)}
              aria-label="Đóng xem ảnh"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface-body/90 text-content-primary shadow-sm hover:bg-surface"
            >
              <X size={18} />
            </button>

            <div className="flex max-h-[68vh] min-h-[340px] items-center justify-center bg-[#F2F2F2]">
              <img
                src={
                  lightboxState.review.images[lightboxState.activeIndex]?.imageUrl ||
                  lightboxState.review.images[0].imageUrl
                }
                alt="Ảnh thực tế từ khách hàng"
                className="max-h-[68vh] w-auto max-w-full object-contain"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line-light bg-surface-elevated p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-content-primary">
                    {getReviewerDisplayName(lightboxState.review)}
                  </span>
                  <StarRow rating={lightboxState.review.rating} size={13} />
                  <span className="text-xs text-content-muted">
                    {formatDateVN(lightboxState.review.createdAt)}
                  </span>
                </div>
                {lightboxState.review.comment && (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-content-secondary">
                    {lightboxState.review.comment}
                  </p>
                )}
              </div>

              {lightboxState.review.images.length > 1 && (
                <div className="flex items-center gap-2">
                  {lightboxState.review.images.map((img, idx) => (
                    <button
                      key={img.id || idx}
                      type="button"
                      onClick={() =>
                        setLightboxState((prev) =>
                          prev ? { ...prev, activeIndex: idx } : null
                        )
                      }
                      className={cn(
                        'h-14 w-12 overflow-hidden border',
                        idx === lightboxState.activeIndex
                          ? 'border-2 border-primary'
                          : 'border-line-light opacity-70 hover:opacity-100'
                      )}
                    >
                      <img src={img.imageUrl} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
