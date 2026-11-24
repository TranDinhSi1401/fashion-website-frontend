import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  CalendarDays,
  RefreshCw,
  Star,
  MessageSquare,
  Sparkles,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Layers,
  CheckCircle2,
  Bot
} from 'lucide-react';
import AdminNav from '../components/admin/AdminNav';
import { Button, Input, Select, Modal } from '../components/ui';
import { reviewService } from '../services/reviewService';
import { aiService } from '../services/aiService';
import { ProductReviewResponse } from '../types/review';
import { extractErrorMessage } from '../utils/format';
import styles from './AdminReviewStatisticsPage.module.css';

const todayDate = () => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type)!.value).join('-');
};

// Lấy ngày đầu tháng hiện tại (VD: 2026-11-01)
const startOfMonthDate = () => {
  const today = todayDate();
  return today.slice(0, 7) + '-01';
};

const daysBefore = (value: string, days: number) => {
  const date = new Date(value + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
};

const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;

const formatDateVN = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export default function AdminReviewStatisticsPage() {
  const today = todayDate();
  const startOfMonth = startOfMonthDate();

  // Mặc định khoảng ngày khi vừa vào trang là: từ đầu tháng hiện tại đến ngày hiện tại
  const [appliedRange, setAppliedRange] = useState({ from: startOfMonth, to: today });
  const [draftRange, setDraftRange] = useState(appliedRange);
  const [starFilter, setStarFilter] = useState<string>('all');

  const [allReviews, setAllReviews] = useState<ProductReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rangeError, setRangeError] = useState('');
  const [reload, setReload] = useState(0);

  // Trạng thái AI Phân tích & Tóm tắt
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiNotice, setAiNotice] = useState('');

  // Trạng thái xem chi tiết đánh giá (Modal Form)
  const [selectedReview, setSelectedReview] = useState<ProductReviewResponse | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Tải danh sách đánh giá
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setAiSummary('');

    reviewService
      .getAllReviews(controller.signal)
      .then((res) => {
        setAllReviews(res.data || []);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, 'Không tải được danh sách đánh giá.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reload]);

  // Lọc đánh giá theo khoảng thời gian đã chọn
  const filteredReviews = useMemo(() => {
    const fromTime = new Date(appliedRange.from + 'T00:00:00').getTime();
    const toTime = new Date(appliedRange.to + 'T23:59:59.999').getTime();

    return allReviews.filter((r) => {
      if (!r.createdAt) return true;
      const t = new Date(r.createdAt).getTime();
      return t >= fromTime && t <= toTime;
    });
  }, [allReviews, appliedRange]);

  // Thống kê số liệu tính toán
  const stats = useMemo(() => {
    const total = filteredReviews.length;
    if (total === 0) {
      return {
        total: 0,
        average: 0,
        countByStar: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>,
        verifiedCount: 0,
        withImagesCount: 0,
        positiveCount: 0,
        negativeCount: 0,
      };
    }

    const countByStar: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sumRating = 0;
    let verifiedCount = 0;
    let withImagesCount = 0;
    let positiveCount = 0;
    let negativeCount = 0;

    filteredReviews.forEach((r) => {
      const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
      countByStar[star] = (countByStar[star] || 0) + 1;
      sumRating += r.rating;

      if (r.verifiedPurchase) verifiedCount++;
      if (r.images && r.images.length > 0) withImagesCount++;
      if (r.rating >= 4) positiveCount++;
      if (r.rating <= 2) negativeCount++;
    });

    return {
      total,
      average: Number((sumRating / total).toFixed(1)),
      countByStar,
      verifiedCount,
      withImagesCount,
      positiveCount,
      negativeCount,
    };
  }, [filteredReviews]);

  // Danh sách review hiển thị trên bảng
  const displayReviews = useMemo(() => {
    if (starFilter === 'all') return filteredReviews;
    const targetStar = Number(starFilter);
    return filteredReviews.filter((r) => Math.round(r.rating) === targetStar);
  }, [filteredReviews, starFilter]);

  // Áp dụng bộ lọc ngày
  const applyRange = (e: FormEvent) => {
    e.preventDefault();
    if (!validDate(draftRange.from) || !validDate(draftRange.to)) {
      setRangeError('Vui lòng chọn ngày hợp lệ (định dạng YYYY-MM-DD).');
      return;
    }
    if (draftRange.from > draftRange.to) {
      setRangeError('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }
    setRangeError('');
    setAppliedRange(draftRange);
  };

  // Kích hoạt AI Phân tích & Tóm tắt đánh giá
  const handleGenerateAiSummary = useCallback(async (
    targetReviews: ProductReviewResponse[] = filteredReviews,
    targetStats = stats,
    range = appliedRange,
    customScopeTitle?: string
  ) => {
    setAiError('');
    setAiNotice('');

    if (targetReviews.length === 0) {
      const scopeDesc = customScopeTitle || (range.from === range.to ? `ngày ${range.from}` : `từ ngày ${range.from} đến ngày ${range.to}`);
      setAiNotice(`Chưa có lượt đánh giá nào trong ${scopeDesc} để tóm tắt.`);
      setAiSummary('');
      return;
    }

    setAiLoading(true);

    try {
      // 1. Tiền xử lý dữ liệu trước khi gửi cho AI để tiết kiệm tối đa Token
      const negativeReviews = targetReviews
        .filter((r) => r.rating <= 2 && r.comment?.trim())
        .map((r) => `- [${r.rating}★] ${r.comment?.trim()}`)
        .slice(0, 40); // Lấy tối đa 40 phản hồi tiêu cực nhất

      const neutralReviews = targetReviews
        .filter((r) => r.rating === 3 && r.comment?.trim())
        .map((r) => `- [3★] ${r.comment?.trim()}`)
        .slice(0, 20);

      const positiveReviews = targetReviews
        .filter((r) => r.rating >= 4 && r.comment?.trim())
        .map((r) => `- [${r.rating}★] ${r.comment?.trim()}`)
        .slice(0, 40); // Lấy tối đa 40 phản hồi tích cực nhất

      const prompt = `Bạn là Trợ lý Quản lý Chất lượng và Dịch vụ Khách hàng của Fashion Website.
Dưới đây là thống kê tổng hợp đánh giá sản phẩm của cửa hàng từ ngày ${range.from} đến ngày ${range.to}:
- Tổng số lượt đánh giá: ${targetStats.total}
- Điểm đánh giá trung bình: ${targetStats.average}/5 sao
- Tỉ lệ hài lòng (4-5 sao): ${targetStats.positiveCount}/${targetStats.total} (${Math.round((targetStats.positiveCount / targetStats.total) * 100)}%)
- Tỉ lệ chưa hài lòng (1-2 sao): ${targetStats.negativeCount}/${targetStats.total} (${Math.round((targetStats.negativeCount / targetStats.total) * 100)}%)

DANH SÁCH MẪU BÌNH LUẬN TIÊU CỰC (1-2 sao):
${negativeReviews.length > 0 ? negativeReviews.join('\n') : 'Không có phản hồi tiêu cực nào.'}

DANH SÁCH MẪU BÌNH LUẬN TRUNG LẬP (3 sao):
${neutralReviews.length > 0 ? neutralReviews.join('\n') : 'Không có phản hồi trung lập.'}

DANH SÁCH MẪU BÌNH LUẬN TÍCH CỰC (4-5 sao):
${positiveReviews.length > 0 ? positiveReviews.join('\n') : 'Không có phản hồi tích cực.'}

YÊU CẦU BÁO CÁO CHO BAN QUẢN TRỊ (Trình bày ngắn gọn, súc tích, gạch đầu dòng rõ ràng):
1. 🌟 ĐIỂM SÁNG KHÁCH HÀNG KHEN NGỢI NHIỀU NHẤT (Về chất liệu, đóng gói, form dáng, tốc độ giao...)
2. ⚠️ CÁC VẤN ĐỀ KHÁCH HÀNG PHÀN NÀN NHẤT (Lỗi kỹ thuật, sai kích cỡ, chất vải, vận chuyển...)
3. 💡 HÀNH ĐỘNG ĐỀ XUẤT CHO SHOP (Những việc cụ thể cần cải thiện ngay để nâng cao chất lượng và giảm tỉ lệ đổi trả)`;

      const res = await reviewService.generateAdminAiSummary(prompt);
      setAiSummary(res);
    } catch (err) {
      setAiError(extractErrorMessage(err, 'Không thể tạo báo cáo tóm tắt bằng AI. Vui lòng thử lại sau.'));
    } finally {
      setAiLoading(false);
    }
  }, [filteredReviews, stats, appliedRange]);

  // Xử lý tóm tắt riêng cho "Hôm nay"
  const handleSummarizeToday = useCallback(() => {
    const todayFromTime = new Date(today + 'T00:00:00').getTime();
    const todayToTime = new Date(today + 'T23:59:59.999').getTime();

    const todayReviews = allReviews.filter((r) => {
      if (!r.createdAt) return false;
      const t = new Date(r.createdAt).getTime();
      return t >= todayFromTime && t <= todayToTime;
    });

    const countByStar: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sumRating = 0;
    let verifiedCount = 0;
    let withImagesCount = 0;
    let positiveCount = 0;
    let negativeCount = 0;

    todayReviews.forEach((r) => {
      const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
      countByStar[star] = (countByStar[star] || 0) + 1;
      sumRating += r.rating;
      if (r.verifiedPurchase) verifiedCount++;
      if (r.images && r.images.length > 0) withImagesCount++;
      if (r.rating >= 4) positiveCount++;
      if (r.rating <= 2) negativeCount++;
    });

    const todayStats = {
      total: todayReviews.length,
      average: todayReviews.length > 0 ? Number((sumRating / todayReviews.length).toFixed(1)) : 0,
      countByStar,
      verifiedCount,
      withImagesCount,
      positiveCount,
      negativeCount,
    };

    handleGenerateAiSummary(todayReviews, todayStats, { from: today, to: today }, 'ngày hôm nay');
  }, [allReviews, today, handleGenerateAiSummary]);

  return (
    <div className={`container py-8 sm:py-10 ${styles.page}`}>
      <AdminNav
        title="Thống kê đánh giá sản phẩm"
        subtitle="Tổng hợp chất lượng phản hồi từ khách hàng và phân tích chuyên sâu bằng AI"
      />

      {error && <div className={styles.error}>{error}</div>}

      {/* Toolbar lọc thời gian */}
      <form onSubmit={applyRange} className={styles.toolbar} noValidate>
        <div className={styles.dateFields}>
          <Input
            label="Từ ngày"
            type="date"
            value={draftRange.from}
            max={draftRange.to || today}
            onChange={(e) => setDraftRange((prev) => ({ ...prev, from: e.target.value }))}
          />
          <Input
            label="Đến ngày"
            type="date"
            value={draftRange.to}
            min={draftRange.from}
            max={today}
            onChange={(e) => setDraftRange((prev) => ({ ...prev, to: e.target.value }))}
          />
        </div>

        <Select
          label="Lọc theo mức sao"
          value={starFilter}
          onChange={(e) => setStarFilter(e.target.value)}
          options={[
            { value: 'all', label: 'Tất cả mức sao' },
            { value: '5', label: '5 sao (Rất tốt)' },
            { value: '4', label: '4 sao (Tốt)' },
            { value: '3', label: '3 sao (Bình thường)' },
            { value: '2', label: '2 sao (Kém)' },
            { value: '1', label: '1 sao (Rất tệ)' },
          ]}
        />

        <div className="flex gap-2">
          <Button type="submit" variant="primary" icon={CalendarDays}>
            Áp dụng
          </Button>
          <Button
            type="button"
            variant="secondary"
            icon={RefreshCw}
            onClick={() => setReload((v) => v + 1)}
            disabled={loading}
            title="Tải lại dữ liệu"
          />
        </div>

        {rangeError && <p className={styles.filterError}>{rangeError}</p>}
      </form>

      {/* 4 Thẻ KPI chính */}
      <div className={styles.cards}>
        <div className={`${styles.card} ${styles.featured}`}>
          <div className={styles.cardLabel}>
            <span>ĐIỂM TRUNG BÌNH</span>
            <Star size={18} className="fill-amber-400 text-amber-400" />
          </div>
          <strong>{stats.average} / 5.0</strong>
          <p>Dựa trên {stats.total} lượt đánh giá trong kỳ</p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>
            <span>TỔNG LƯỢT ĐÁNH GIÁ</span>
            <MessageSquare size={18} />
          </div>
          <strong>{stats.total.toLocaleString('vi-VN')}</strong>
          <p>{stats.withImagesCount} lượt có hình ảnh thực tế</p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>
            <span>HÀI LÒNG (4 - 5★)</span>
            <ThumbsUp size={18} className="text-emerald-600" />
          </div>
          <strong className="text-emerald-700">
            {stats.total > 0 ? Math.round((stats.positiveCount / stats.total) * 100) : 0}%
          </strong>
          <p>{stats.positiveCount} đánh giá tích cực</p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>
            <span>CẦN CẢI THIỆN (1 - 2★)</span>
            <ThumbsDown size={18} className="text-rose-600" />
          </div>
          <strong className="text-rose-700">
            {stats.total > 0 ? Math.round((stats.negativeCount / stats.total) * 100) : 0}%
          </strong>
          <p>{stats.negativeCount} phản ánh tiêu cực</p>
        </div>
      </div>

      {/* KHỐI AI PHÂN TÍCH VÀ TÓM TẮT THÔNG MINH */}
      <div className={styles.aiBox}>
        <div className={styles.aiHeader}>
          <div className={styles.aiTitleGroup}>
            <div className={styles.aiIconBadge}>
              <Bot size={22} />
            </div>
            <div>
              <h3>AI Phân Tích & Tóm Tắt Ý Kiến Khách Hàng</h3>
              <p>Tự động tổng hợp ưu điểm, nhược điểm và đề xuất cải thiện chất lượng dịch vụ</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              icon={Sparkles}
              onClick={handleSummarizeToday}
              disabled={aiLoading}
              title="Tóm tắt nhanh các phản hồi phát sinh trong ngày hôm nay"
            >
              Tóm tắt hôm nay
            </Button>
            <Button
              type="button"
              variant="primary"
              icon={Sparkles}
              onClick={() => handleGenerateAiSummary(filteredReviews, stats, appliedRange)}
              disabled={aiLoading}
            >
              {aiLoading ? 'Đang phân tích...' : aiSummary ? 'Tóm tắt lại kỳ này' : 'Tạo tóm tắt bằng AI'}
            </Button>
          </div>
        </div>

        {aiError && <div className={`${styles.error} mt-4`}>{aiError}</div>}
        {aiNotice && !aiError && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {aiNotice}
          </div>
        )}

        {aiSummary ? (
          <div className={styles.aiContent}>{aiSummary}</div>
        ) : (
          <p className={styles.aiEmpty}>
            {aiLoading
              ? 'AI đang phân tích các đánh giá trong khoảng thời gian đã chọn, vui lòng chờ trong giây lát...'
              : 'Bấm nút "Tạo tóm tắt bằng AI" để hệ thống tổng hợp nhanh phản hồi của khách hàng trong kỳ này.'}
          </p>
        )}
      </div>

      {/* Bảng phân bổ số sao & Danh sách chi tiết */}
      <div className={styles.detailsGrid}>
        {/* Phân bổ tỷ lệ sao */}
        <div className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <h2>Phân bố mức sao</h2>
              <p>Tỷ trọng các mức đánh giá từ 1 đến 5 sao</p>
            </div>
          </div>
          <div className={styles.starList}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.countByStar[star] || 0;
              const percent = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={star} className={styles.starRow}>
                  <div className="flex items-center gap-1.5 font-medium">
                    <span>{star}</span>
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                  </div>
                  <strong>
                    {count} ({percent}%)
                  </strong>
                  <div className={styles.track}>
                    <div style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Thông tin độ tin cậy */}
        <div className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <h2>Chất lượng minh chứng</h2>
              <p>Độ xác thực và dữ liệu hình ảnh của đánh giá</p>
            </div>
          </div>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between border-b border-line-light py-2.5">
              <span className="text-content-secondary">Đã xác thực đơn hàng (Verified Purchase)</span>
              <strong>
                {stats.verifiedCount} / {stats.total} (
                {stats.total > 0 ? Math.round((stats.verifiedCount / stats.total) * 100) : 0}%)
              </strong>
            </div>
            <div className="flex items-center justify-between border-b border-line-light py-2.5">
              <span className="text-content-secondary">Có đính kèm hình ảnh thực tế</span>
              <strong>
                {stats.withImagesCount} / {stats.total} (
                {stats.total > 0 ? Math.round((stats.withImagesCount / stats.total) * 100) : 0}%)
              </strong>
            </div>
            <div className="flex items-center justify-between border-b border-line-light py-2.5">
              <span className="text-content-secondary">Đánh giá kèm bình luận chi tiết</span>
              <strong>
                {filteredReviews.filter((r) => r.comment && r.comment.trim().length > 0).length} / {stats.total}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Bảng danh sách đánh giá */}
      <div className={styles.panel}>
        <div className={styles.panelHeading}>
          <div>
            <h2>Danh sách đánh giá ({displayReviews.length})</h2>
            <p>
              Hiển thị phản hồi chi tiết từ ngày {formatDateVN(appliedRange.from)} đến{' '}
              {formatDateVN(appliedRange.to)}
            </p>
          </div>
        </div>

        {loading ? (
          <div className={styles.message}>Đang tải dữ liệu đánh giá...</div>
        ) : displayReviews.length === 0 ? (
          <div className={styles.message}>Không có đánh giá nào phù hợp với bộ lọc.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Ngày gửi</th>
                  <th style={{ width: '140px' }}>Khách hàng</th>
                  <th style={{ width: '110px' }}>Số sao</th>
                  <th>Nội dung bình luận</th>
                  <th style={{ width: '100px' }}>Ảnh đính kèm</th>
                </tr>
              </thead>
              <tbody>
                {displayReviews.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedReview(r)}
                    className={styles.tableRowClickable}
                    title="Bấm để xem chi tiết đánh giá này"
                  >
                    <td className="text-content-muted">{formatDateVN(r.createdAt)}</td>
                    <td>
                      <div className="font-semibold text-content-primary">
                        {r.fullName || r.userName || `Khách hàng #${r.userId}`}
                      </div>
                      {r.verifiedPurchase && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                          <CheckCircle2 size={11} /> Đã mua hàng
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="inline-flex items-center gap-1 font-semibold text-content-primary">
                        <span>{r.rating}</span>
                        <Star size={13} className="fill-amber-400 text-amber-400" />
                      </div>
                    </td>
                    <td>
                      <p className="line-clamp-2 text-content-primary">{r.comment || '— Không có lời nhắn —'}</p>
                      {r.variantInfo && (
                        <span className="text-xs text-content-muted">Phân loại: {r.variantInfo}</span>
                      )}
                    </td>
                    <td>
                      {r.images && r.images.length > 0 ? (
                        <span className="rounded-sm bg-surface px-2 py-1 text-xs font-semibold text-content-secondary">
                          {r.images.length} ảnh
                        </span>
                      ) : (
                        <span className="text-xs text-content-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CHI TIẾT ĐÁNH GIÁ CỦA KHÁCH HÀNG */}
      <Modal
        isOpen={selectedReview !== null}
        onClose={() => {
          setSelectedReview(null);
          setPreviewImage(null);
        }}
        title={`Chi tiết đánh giá #${selectedReview?.id || ''}`}
        maxWidth="640px"
      >
        {selectedReview && (
          <div className="space-y-4">
            {/* Thông tin nhanh */}
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Khách hàng</div>
                <div className={styles.detailValue}>
                  {selectedReview.fullName || selectedReview.userName || `Khách hàng #${selectedReview.userId}`}
                </div>
                <div className="mt-1 text-xs text-content-muted">
                  Tài khoản: {selectedReview.userName || `ID: ${selectedReview.userId}`}
                </div>
              </div>

              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Thời gian gửi</div>
                <div className={styles.detailValue}>{formatDateVN(selectedReview.createdAt)}</div>
                <div className="mt-1 text-xs text-content-muted">
                  {selectedReview.createdAt ? new Date(selectedReview.createdAt).toLocaleTimeString('vi-VN') : ''}
                </div>
              </div>

              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Sản phẩm & Phân loại</div>
                <div className={styles.detailValue}>
                  {selectedReview.productName ? (
                    <a
                      href={`/products/${selectedReview.productId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {selectedReview.productName}
                    </a>
                  ) : (
                    `Sản phẩm #${selectedReview.productId}`
                  )}
                </div>
                {selectedReview.variantInfo && (
                  <div className="mt-1 text-xs text-content-secondary">
                    Phân loại: <strong>{selectedReview.variantInfo}</strong>
                  </div>
                )}
              </div>

              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Mức độ đánh giá</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-bold text-base text-content-primary">{selectedReview.rating} / 5</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        className={
                          star <= selectedReview.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-transparent text-[#CCCCCC]'
                        }
                      />
                    ))}
                  </div>
                </div>
                {selectedReview.verifiedPurchase ? (
                  <div className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <CheckCircle2 size={12} /> Đơn hàng đã mua thành công
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-content-muted">Đánh giá chung</div>
                )}
              </div>
            </div>

            {/* Nội dung bình luận */}
            <div className={styles.commentSection}>
              <div className={styles.detailLabel}>Nội dung nhận xét</div>
              <p className={styles.commentText}>
                {selectedReview.comment?.trim() ? selectedReview.comment : '— Khách hàng không để lại nhận xét bằng lời —'}
              </p>
            </div>

            {/* Ảnh chụp thực tế từ khách hàng */}
            {selectedReview.images && selectedReview.images.length > 0 && (
              <div>
                <div className={styles.detailLabel}>Hình ảnh đính kèm ({selectedReview.images.length})</div>
                <div className={styles.imageGrid}>
                  {selectedReview.images.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      className={styles.thumbWrap}
                      onClick={() => setPreviewImage(img.imageUrl)}
                      title="Bấm để xem ảnh lớn"
                    >
                      <img src={img.imageUrl} alt="Hình ảnh đánh giá" className={styles.thumbImg} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Xem ảnh kích thước lớn nếu bấm vào ảnh */}
            {previewImage && (
              <div className="mt-4 rounded-sm border border-line-light bg-black/5 p-2 flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-1.5 px-1">
                  <span className="text-xs text-content-muted font-medium">Ảnh phóng to:</span>
                  <button
                    type="button"
                    onClick={() => setPreviewImage(null)}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    Đóng ảnh
                  </button>
                </div>
                <img
                  src={previewImage}
                  alt="Ảnh phóng to"
                  className="max-h-[360px] w-auto max-w-full rounded object-contain shadow-sm"
                />
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedReview(null);
                  setPreviewImage(null);
                }}
              >
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
