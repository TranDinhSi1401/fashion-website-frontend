import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  CalendarDays,
  RefreshCw,
  Star,
  MessageSquare,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Bot,
  AlertTriangle,
} from 'lucide-react';
import AdminNav from '../components/admin/AdminNav';
import { Button, Input, Select, Modal } from '../components/ui';
import { reviewService } from '../services/reviewService';
import { ProductReviewResponse } from '../types/review';
import { extractErrorMessage } from '../utils/format';
import styles from './AdminReviewStatisticsPage.module.css';

interface ReviewStatsSnapshot {
  total: number;
  average: number;
  countByStar: Record<number, number>;
  verifiedCount: number;
  withImagesCount: number;
  withCommentCount: number;
  ratingOnlyCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  positiveCommentCount: number;
  neutralCommentCount: number;
  negativeCommentCount: number;
}

interface SummaryDiagnostic {
  level: 'empty' | 'partial' | 'complete';
  title: string;
  reason: string;
  details: string[];
  scopeLabel: string;
  canQuickSwitchLatestMonth?: boolean;
  latestReviewDate?: string;
}

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
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const computeReviewStats = (reviews: ProductReviewResponse[]): ReviewStatsSnapshot => {
  const total = reviews.length;
  const countByStar: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (total === 0) {
    return {
      total: 0,
      average: 0,
      countByStar,
      verifiedCount: 0,
      withImagesCount: 0,
      withCommentCount: 0,
      ratingOnlyCount: 0,
      positiveCount: 0,
      neutralCount: 0,
      negativeCount: 0,
      positiveCommentCount: 0,
      neutralCommentCount: 0,
      negativeCommentCount: 0,
    };
  }

  let sumRating = 0;
  let verifiedCount = 0;
  let withImagesCount = 0;
  let withCommentCount = 0;
  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;
  let positiveCommentCount = 0;
  let neutralCommentCount = 0;
  let negativeCommentCount = 0;

  reviews.forEach((r) => {
    const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
    countByStar[star] = (countByStar[star] || 0) + 1;
    sumRating += star;

    const hasComment = Boolean(r.comment && r.comment.trim().length > 0);
    if (hasComment) withCommentCount++;
    if (r.verifiedPurchase) verifiedCount++;
    if (r.images && r.images.length > 0) withImagesCount++;

    if (star >= 4) {
      positiveCount++;
      if (hasComment) positiveCommentCount++;
    } else if (star === 3) {
      neutralCount++;
      if (hasComment) neutralCommentCount++;
    } else {
      negativeCount++;
      if (hasComment) negativeCommentCount++;
    }
  });

  return {
    total,
    average: Number((sumRating / total).toFixed(1)),
    countByStar,
    verifiedCount,
    withImagesCount,
    withCommentCount,
    ratingOnlyCount: total - withCommentCount,
    positiveCount,
    neutralCount,
    negativeCount,
    positiveCommentCount,
    neutralCommentCount,
    negativeCommentCount,
  };
};

export default function AdminReviewStatisticsPage() {
  const today = todayDate();
  const startOfMonth = startOfMonthDate();

  // Mặc định khoảng ngày khi vừa vào trang là: từ đầu tháng hiện tại đến ngày hiện tại
  const [appliedRange, setAppliedRange] = useState({ from: startOfMonth, to: today });
  const [draftRange, setDraftRange] = useState({ from: startOfMonth, to: today });
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
  const [aiDiagnostic, setAiDiagnostic] = useState<SummaryDiagnostic | null>(null);
  const [summaryGeneratedAt, setSummaryGeneratedAt] = useState<string>('');
  const [isAutoGenerated, setIsAutoGenerated] = useState<boolean>(false);

  // Chỉ tự động tạo thống kê & tóm tắt ở lần đầu tiên vào trang (theo ngày tháng mặc định).
  // Các lần lọc/chỉnh sửa sau là tùy dùng của người dùng.
  const hasInitialAutoSummarizedRef = useRef(false);

  // Trạng thái xem chi tiết đánh giá (Modal Form)
  const [selectedReview, setSelectedReview] = useState<ProductReviewResponse | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Tìm khoảng thời gian tổng thể của toàn bộ dữ liệu đánh giá trong hệ thống (để giải thích rõ khi kỳ chọn bị trống)
  const systemDateBounds = useMemo(() => {
    const dated = allReviews
      .map((r) => (r.createdAt ? r.createdAt.slice(0, 10) : ''))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();
    if (dated.length === 0) return null;
    return {
      earliest: dated[0],
      latest: dated[dated.length - 1],
      totalInSystem: allReviews.length,
    };
  }, [allReviews]);

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
  const stats = useMemo(() => computeReviewStats(filteredReviews), [filteredReviews]);

  // Danh sách review hiển thị trên bảng
  const displayReviews = useMemo(() => {
    if (starFilter === 'all') return filteredReviews;
    const targetStar = Number(starFilter);
    return filteredReviews.filter((r) => Math.round(r.rating) === targetStar);
  }, [filteredReviews, starFilter]);

  // Xây dựng chẩn đoán lý do cụ thể cho dữ liệu đánh giá của kỳ đang xét
  const buildDiagnostic = useCallback(
    (
      targetReviews: ProductReviewResponse[],
      targetStats: ReviewStatsSnapshot,
      range: { from: string; to: string },
      customScopeTitle?: string
    ): SummaryDiagnostic => {
      const scopeLabel =
        customScopeTitle ||
        (range.from === range.to
          ? `ngày ${formatDateVN(range.from)}`
          : `từ ngày ${formatDateVN(range.from)} đến ngày ${formatDateVN(range.to)}`);

      // Trường hợp 1: Không có lượt đánh giá nào trong kỳ
      if (targetReviews.length === 0) {
        const details: string[] = [];
        let reason = '';
        let canQuickSwitchLatestMonth = false;
        let latestReviewDate: string | undefined;

        if (allReviews.length === 0) {
          reason =
            'Toàn hệ thống hiện chưa có bất kỳ lượt đánh giá sản phẩm nào từ khách hàng trong cơ sở dữ liệu.';
          details.push(
            'Nguyên nhân gốc: Chưa có đơn hàng hoàn tất được khách hàng gửi đánh giá hoặc dữ liệu đánh giá chưa phát sinh.'
          );
          details.push(
            'Hành động gợi ý: Báo cáo AI sẽ tự động hoạt động ngay khi cửa hàng ghi nhận lượt đánh giá đầu tiên.'
          );
        } else {
          reason = `Không có lượt đánh giá nào phát sinh trong ${scopeLabel}.`;
          if (systemDateBounds) {
            latestReviewDate = systemDateBounds.latest;
            canQuickSwitchLatestMonth = true;
            details.push(
              `Dữ liệu hệ thống hiện có ${systemDateBounds.totalInSystem.toLocaleString('vi-VN')} lượt đánh giá, nhưng nằm trong khoảng từ ngày ${formatDateVN(
                systemDateBounds.earliest
              )} đến ngày ${formatDateVN(systemDateBounds.latest)}.`
            );
          } else {
            details.push(
              `Hệ thống hiện có ${allReviews.length.toLocaleString('vi-VN')} lượt đánh giá ở các kỳ khác ngoài khoảng thời gian đang chọn.`
            );
          }
          details.push(
            'Gợi ý: Bạn có thể mở rộng khoảng "Từ ngày - Đến ngày" hoặc chọn nhanh các mốc 30 ngày / 90 ngày / Toàn thời gian để xem phân tích.'
          );
        }

        return {
          level: 'empty',
          title: `Không thể tạo nội dung tóm tắt cho ${scopeLabel}`,
          reason,
          details,
          scopeLabel,
          canQuickSwitchLatestMonth,
          latestReviewDate,
        };
      }

      // Trường hợp 2: Có đánh giá nhưng toàn bộ hoặc một phần bị thiếu bình luận chữ / thiếu nhóm mức sao
      const missingReasons: string[] = [];

      if (targetStats.withCommentCount === 0) {
        missingReasons.push(
          `Tất cả ${targetStats.total}/${targetStats.total} lượt đánh giá trong kỳ chỉ chấm điểm sao (trung bình ${targetStats.average}/5★) mà không để lại bất kỳ nhận xét văn bản nào, nên AI chỉ có thể phân tích dựa trên phân bổ số sao.`
        );
      } else if (targetStats.ratingOnlyCount > 0) {
        missingReasons.push(
          `Có ${targetStats.ratingOnlyCount}/${targetStats.total} lượt đánh giá chỉ chấm điểm sao mà không ghi nhận xét chi tiết (chỉ ${targetStats.withCommentCount}/${targetStats.total} lượt có bình luận văn bản).`
        );
      }

      if (targetStats.positiveCount === 0) {
        missingReasons.push(
          'Mục "Điểm sáng khen ngợi": Trong kỳ chưa phát sinh lượt đánh giá 4-5 sao nào.'
        );
      } else if (targetStats.positiveCommentCount === 0) {
        missingReasons.push(
          `Mục "Điểm sáng khen ngợi": Có ${targetStats.positiveCount} lượt đánh giá 4-5 sao nhưng khách hàng chỉ chấm sao, không để lại lời khen cụ thể.`
        );
      }

      if (targetStats.negativeCount === 0 && targetStats.neutralCount === 0) {
        missingReasons.push(
          'Mục "Vấn đề phàn nàn": Không phát sinh đánh giá tiêu cực (1-2 sao) hay trung lập (3 sao) nào trong kỳ (100% khách hàng đánh giá 4-5 sao).'
        );
      } else {
        if (targetStats.negativeCount === 0) {
          missingReasons.push(
            `Mục "Vấn đề phàn nàn": Không có đánh giá tiêu cực (1-2 sao); chỉ có ${targetStats.neutralCount} lượt đánh giá trung lập (3 sao).`
          );
        } else if (targetStats.negativeCommentCount === 0) {
          missingReasons.push(
            `Mục "Vấn đề phàn nàn": Có ${targetStats.negativeCount} lượt chấm 1-2 sao nhưng khách hàng không viết nội dung mô tả lỗi cụ thể.`
          );
        }

        if (targetStats.neutralCount > 0 && targetStats.neutralCommentCount === 0) {
          missingReasons.push(
            `Nhóm trung lập (3 sao): Có ${targetStats.neutralCount} lượt chấm 3 sao nhưng không kèm bình luận góp ý.`
          );
        }
      }

      if (targetStats.total < 3) {
        missingReasons.push(
          `Cỡ mẫu dữ liệu trong kỳ còn nhỏ (${targetStats.total} lượt đánh giá), kết quả tóm tắt phản ánh trực tiếp các lượt đánh giá hiện có.`
        );
      }

      const isPartial =
        targetStats.withCommentCount === 0 ||
        targetStats.positiveCommentCount === 0 ||
        targetStats.negativeCommentCount === 0 ||
        targetStats.ratingOnlyCount > 0 ||
        targetStats.total < 3;

      if (isPartial) {
        return {
          level: 'partial',
          title: `Giải thích độ đầy đủ dữ liệu (${scopeLabel})`,
          reason:
            targetStats.withCommentCount === 0
              ? 'Báo cáo được tổng hợp từ dữ liệu điểm sao do trong kỳ chưa có bình luận văn bản.'
              : `Báo cáo được phân tích từ ${targetStats.withCommentCount}/${targetStats.total} đánh giá có nội dung bình luận. Một số mục trong báo cáo không có trích dẫn hoặc ngắn gọn vì các lý do cụ thể sau:`,
          details: missingReasons,
          scopeLabel,
        };
      }

      return {
        level: 'complete',
        title: `Dữ liệu phân tích đầy đủ (${scopeLabel})`,
        reason: `Đã tổng hợp đầy đủ từ ${targetStats.total} lượt đánh giá (${targetStats.withCommentCount} bình luận chi tiết ở cả nhóm khen ngợi và góp ý).`,
        details: [],
        scopeLabel,
      };
    },
    [allReviews.length, systemDateBounds]
  );

  // Kích hoạt AI Phân tích & Tóm tắt đánh giá
  const handleGenerateAiSummary = useCallback(
    async (
      targetReviews: ProductReviewResponse[] = filteredReviews,
      targetStats: ReviewStatsSnapshot = stats,
      range: { from: string; to: string } = appliedRange,
      customScopeTitle?: string,
      autoTriggered = false
    ) => {
      setAiError('');
      setIsAutoGenerated(autoTriggered);

      const diagnostic = buildDiagnostic(targetReviews, targetStats, range, customScopeTitle);
      setAiDiagnostic(diagnostic);

      if (targetReviews.length === 0) {
        setAiSummary('');
        setSummaryGeneratedAt(
          new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        );
        return;
      }

      // Nếu tất cả đánh giá chỉ có điểm sao mà không có bất kỳ bình luận chữ nào,
      // tạo báo cáo định lượng rõ ràng ngay kèm lý do cụ thể thay vì để AI trả về nội dung rỗng/mơ hồ
      if (targetStats.withCommentCount === 0) {
        const starBreakdown = [5, 4, 3, 2, 1]
          .filter((s) => (targetStats.countByStar[s] || 0) > 0)
          .map((s) => `${s}★: ${targetStats.countByStar[s]} lượt`)
          .join(' · ');

        const ratingOnlyReport = [
          `📊 TỔNG QUAN ĐỊNH LƯỢNG (${diagnostic.scopeLabel.toUpperCase()})`,
          `- Tổng số lượt đánh giá: ${targetStats.total} lượt (Điểm trung bình: ${targetStats.average}/5.0 sao).`,
          `- Phân bổ mức sao: ${starBreakdown}.`,
          `- Trạng thái nội dung: 0/${targetStats.total} lượt có bình luận chữ (100% khách hàng chỉ bấm chọn số sao).`,
          '',
          '1. 🌟 ĐIỂM SÁNG KHÁCH HÀNG KHEN NGỢI NHIỀU NHẤT',
          targetStats.positiveCount > 0
            ? `- Ghi nhận ${targetStats.positiveCount}/${targetStats.total} lượt đánh giá tích cực (4-5 sao), chiếm ${Math.round(
                (targetStats.positiveCount / targetStats.total) * 100
              )}% tổng số phản hồi.\n- Lý do chưa có trích dẫn chi tiết: Toàn bộ ${targetStats.positiveCount} khách hàng chấm 4-5 sao đều không để lại nhận xét văn bản.`
            : '- Lý do không có dữ liệu: Trong khoảng thời gian này chưa phát sinh lượt đánh giá 4-5 sao nào.',
          '',
          '2. ⚠️ CÁC VẤN ĐỀ KHÁCH HÀNG PHÀN NÀN & GÓP Ý',
          targetStats.negativeCount > 0 || targetStats.neutralCount > 0
            ? `- Ghi nhận ${targetStats.negativeCount} lượt 1-2 sao và ${targetStats.neutralCount} lượt 3 sao.\n- Lý do chưa xác định được lỗi cụ thể: Khách hàng chấm điểm thấp/trung bình nhưng để trống ô nhận xét, cần kiểm tra trực tiếp đơn hàng trong danh sách bên dưới.`
            : '- Không phát sinh bất kỳ lượt đánh giá tiêu cực (1-2 sao) hay trung lập (3 sao) nào trong kỳ này.',
          '',
          '3. 💡 HÀNH ĐỘNG ĐỀ XUẤT CHO SHOP',
          '- Khuyến khích khách hàng để lại bình luận chữ và hình ảnh thực tế khi đánh giá (ví dụ: nhắc nhẹ trong thông báo sau giao hàng hoặc tặng mã giảm giá nhỏ).',
          targetStats.negativeCount > 0
            ? '- Kiểm tra các đơn hàng có đánh giá 1-2 sao trong bảng danh sách bên dưới để liên hệ khách hàng tìm hiểu nguyên nhân.'
            : '- Tiếp tục duy trì chất lượng sản phẩm và dịch vụ giao hàng hiện tại.',
        ].join('\n');

        setAiSummary(ratingOnlyReport);
        setSummaryGeneratedAt(
          new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        );
        return;
      }

      setAiLoading(true);

      try {
        // 1. Tiền xử lý dữ liệu trước khi gửi cho AI để tiết kiệm Token và cung cấp ngữ cảnh lý do đầy đủ
        const truncateComment = (text?: string | null) => {
          const clean = (text || '').trim().replace(/\s+/g, ' ');
          return clean.length > 180 ? clean.slice(0, 180) + '…' : clean;
        };

        const negativeReviews = targetReviews
          .filter((r) => r.rating <= 2 && r.comment?.trim())
          .map(
            (r) =>
              `- [${r.rating}★${r.productName ? ` | SP: ${r.productName}` : ''}] ${truncateComment(
                r.comment
              )}`
          )
          .slice(0, 15);

        const neutralReviews = targetReviews
          .filter((r) => Math.round(r.rating) === 3 && r.comment?.trim())
          .map(
            (r) =>
              `- [3★${r.productName ? ` | SP: ${r.productName}` : ''}] ${truncateComment(
                r.comment
              )}`
          )
          .slice(0, 10);

        const positiveReviews = targetReviews
          .filter((r) => r.rating >= 4 && r.comment?.trim())
          .map(
            (r) =>
              `- [${r.rating}★${r.productName ? ` | SP: ${r.productName}` : ''}] ${truncateComment(
                r.comment
              )}`
          )
          .slice(0, 15);

        const negativeEmptyReason =
          targetStats.negativeCount === 0
            ? 'Không phát sinh lượt đánh giá 1-2 sao nào trong kỳ này.'
            : `Có ${targetStats.negativeCount} lượt đánh giá 1-2 sao nhưng cả ${targetStats.negativeCount} khách hàng chỉ chấm sao và không để lại bình luận văn bản.`;

        const neutralEmptyReason =
          targetStats.neutralCount === 0
            ? 'Không phát sinh lượt đánh giá 3 sao nào trong kỳ này.'
            : `Có ${targetStats.neutralCount} lượt đánh giá 3 sao nhưng khách hàng chỉ chấm sao, không viết bình luận góp ý.`;

        const positiveEmptyReason =
          targetStats.positiveCount === 0
            ? 'Không phát sinh lượt đánh giá 4-5 sao nào trong kỳ này.'
            : `Có ${targetStats.positiveCount} lượt đánh giá 4-5 sao nhưng khách hàng chỉ chấm sao, không viết lời khen chi tiết.`;

        const prompt = `Bạn là Trợ lý Quản lý Chất lượng và Dịch vụ Khách hàng của Fashion Website.
Dưới đây là thống kê tổng hợp đánh giá sản phẩm của cửa hàng ${diagnostic.scopeLabel}:
- Tổng số lượt đánh giá: ${targetStats.total} lượt
- Điểm đánh giá trung bình: ${targetStats.average}/5 sao
- Số đánh giá có nội dung bình luận: ${targetStats.withCommentCount}/${targetStats.total} lượt (${targetStats.ratingOnlyCount} lượt chỉ chấm sao không viết chữ)
- Tỉ lệ hài lòng (4-5 sao): ${targetStats.positiveCount}/${targetStats.total} (${Math.round(
          (targetStats.positiveCount / targetStats.total) * 100
        )}%) - trong đó ${targetStats.positiveCommentCount} lượt có bình luận
- Tỉ lệ trung lập (3 sao): ${targetStats.neutralCount}/${targetStats.total} (${Math.round(
          (targetStats.neutralCount / targetStats.total) * 100
        )}%) - trong đó ${targetStats.neutralCommentCount} lượt có bình luận
- Tỉ lệ chưa hài lòng (1-2 sao): ${targetStats.negativeCount}/${targetStats.total} (${Math.round(
          (targetStats.negativeCount / targetStats.total) * 100
        )}%) - trong đó ${targetStats.negativeCommentCount} lượt có bình luận

DANH SÁCH MẪU BÌNH LUẬN TIÊU CỰC (1-2 sao):
${negativeReviews.length > 0 ? negativeReviews.join('\n') : negativeEmptyReason}

DANH SÁCH MẪU BÌNH LUẬN TRUNG LẬP (3 sao):
${neutralReviews.length > 0 ? neutralReviews.join('\n') : neutralEmptyReason}

DANH SÁCH MẪU BÌNH LUẬN TÍCH CỰC (4-5 sao):
${positiveReviews.length > 0 ? positiveReviews.join('\n') : positiveEmptyReason}

YÊU CẦU BÁO CÁO CHO BAN QUẢN TRỊ (Trình bày ngắn gọn, súc tích, gạch đầu dòng rõ ràng. Nếu mục nào không có bình luận mẫu, BẮT BUỘC ghi rõ lý do cụ thể đã nêu ở trên thay vì trả lời trống hoặc chung chung):
1. 🌟 ĐIỂM SÁNG KHÁCH HÀNG KHEN NGỢI NHIỀU NHẤT (Về chất liệu, đóng gói, form dáng, tốc độ giao... hoặc nêu rõ lý do nếu thiếu bình luận)
2. ⚠️ CÁC VẤN ĐỀ KHÁCH HÀNG PHÀN NÀN & GÓP Ý (Lỗi kỹ thuật, sai kích cỡ, chất vải, vận chuyển... hoặc nêu rõ lý do không phát sinh / khách chỉ chấm sao)
3. 💡 HÀNH ĐỘNG ĐỀ XUẤT CHO SHOP (Những việc cụ thể cần cải thiện hoặc duy trì dựa trên số liệu thực tế của kỳ này)`;

        const res = await reviewService.generateAdminAiSummary(prompt);
        const trimmed = (res || '').trim();

        if (!trimmed) {
          setAiError(
            'Dịch vụ AI trả về phản hồi rỗng (có thể do kết nối tới mô hình AI bị gián đoạn hoặc hết hạn mức). Vui lòng bấm "Tóm tắt lại kỳ này" để thử lại.'
          );
        } else {
          setAiSummary(trimmed);
          setSummaryGeneratedAt(
            new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          );
        }
      } catch (err) {
        setAiError(
          extractErrorMessage(
            err,
            'Không thể tạo báo cáo tóm tắt bằng AI (do lỗi kết nối máy chủ hoặc dịch vụ AI quá thời gian phản hồi). Vui lòng thử lại sau.'
          )
        );
      } finally {
        setAiLoading(false);
      }
    },
    [filteredReviews, stats, appliedRange, buildDiagnostic]
  );

  // Tải danh sách đánh giá khi vào trang hoặc khi bấm nút Tải lại dữ liệu
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    reviewService
      .getAllReviews(controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) {
          setAllReviews(res.data || []);
        }
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

  // Tự động tạo thống kê & tóm tắt AI ngay khi vừa vào trang với khoảng ngày tháng mặc định.
  // Những lần thay đổi bộ lọc ngày sau đó sẽ là tùy dùng của người dùng.
  useEffect(() => {
    if (loading || error || hasInitialAutoSummarizedRef.current) return;
    hasInitialAutoSummarizedRef.current = true;
    void handleGenerateAiSummary(filteredReviews, stats, appliedRange, undefined, true);
  }, [loading, error, filteredReviews, stats, appliedRange, handleGenerateAiSummary]);

  // Khi người dùng đổi khoảng ngày (sau lần tự động đầu tiên), cập nhật chẩn đoán dữ liệu của kỳ mới
  // để người dùng thấy rõ tình trạng dữ liệu và chủ động bấm tóm tắt khi cần
  const applyNewRange = useCallback(
    (nextRange: { from: string; to: string }) => {
      setRangeError('');
      setDraftRange(nextRange);
      setAppliedRange(nextRange);

      const fromTime = new Date(nextRange.from + 'T00:00:00').getTime();
      const toTime = new Date(nextRange.to + 'T23:59:59.999').getTime();
      const nextReviews = allReviews.filter((r) => {
        if (!r.createdAt) return true;
        const t = new Date(r.createdAt).getTime();
        return t >= fromTime && t <= toTime;
      });
      const nextStats = computeReviewStats(nextReviews);
      const nextDiag = buildDiagnostic(nextReviews, nextStats, nextRange);

      setAiSummary('');
      setAiError('');
      setIsAutoGenerated(false);
      setAiDiagnostic(nextDiag);
    },
    [allReviews, buildDiagnostic]
  );

  // Áp dụng bộ lọc ngày từ form
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
    if (draftRange.to > today) {
      setRangeError('Không thể chọn ngày kết thúc trong tương lai.');
      return;
    }
    applyNewRange(draftRange);
  };

  // Xử lý tóm tắt riêng cho "Hôm nay" (tùy chọn của người dùng)
  const handleSummarizeToday = useCallback(() => {
    const todayFromTime = new Date(today + 'T00:00:00').getTime();
    const todayToTime = new Date(today + 'T23:59:59.999').getTime();

    const todayReviews = allReviews.filter((r) => {
      if (!r.createdAt) return false;
      const t = new Date(r.createdAt).getTime();
      return t >= todayFromTime && t <= todayToTime;
    });

    const todayStats = computeReviewStats(todayReviews);

    void handleGenerateAiSummary(
      todayReviews,
      todayStats,
      { from: today, to: today },
      `ngày hôm nay (${formatDateVN(today)})`,
      false
    );
  }, [allReviews, today, handleGenerateAiSummary]);

  // Chuyển nhanh tới kỳ có dữ liệu gần nhất và tóm tắt luôn (hỗ trợ khi kỳ mặc định đầu tháng chưa có đánh giá)
  const handleSwitchToLatestDataPeriod = useCallback(() => {
    if (!systemDateBounds) return;
    const latest = systemDateBounds.latest;
    const from30 = daysBefore(latest, 29) < systemDateBounds.earliest
      ? systemDateBounds.earliest
      : daysBefore(latest, 29);
    const nextRange = { from: from30, to: latest };
    setRangeError('');
    setDraftRange(nextRange);
    setAppliedRange(nextRange);

    const fromTime = new Date(nextRange.from + 'T00:00:00').getTime();
    const toTime = new Date(nextRange.to + 'T23:59:59.999').getTime();
    const nextReviews = allReviews.filter((r) => {
      if (!r.createdAt) return true;
      const t = new Date(r.createdAt).getTime();
      return t >= fromTime && t <= toTime;
    });
    const nextStats = computeReviewStats(nextReviews);
    void handleGenerateAiSummary(nextReviews, nextStats, nextRange, undefined, false);
  }, [allReviews, systemDateBounds, handleGenerateAiSummary]);

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
            onChange={(e) => {
              setDraftRange((prev) => ({ ...prev, from: e.target.value }));
              setRangeError('');
            }}
          />
          <Input
            label="Đến ngày"
            type="date"
            value={draftRange.to}
            min={draftRange.from}
            max={today}
            onChange={(e) => {
              setDraftRange((prev) => ({ ...prev, to: e.target.value }));
              setRangeError('');
            }}
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

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="primary" icon={CalendarDays} disabled={loading}>
            Áp dụng
          </Button>
          <Button
            type="button"
            variant="secondary"
            icon={RefreshCw}
            onClick={() => {
              hasInitialAutoSummarizedRef.current = false;
              setReload((v) => v + 1);
            }}
            disabled={loading}
            title="Tải lại dữ liệu"
          />
        </div>

        <div className={styles.quickPresets}>
          <span className={styles.presetLabel}>Chọn nhanh kỳ thống kê:</span>
          <button
            type="button"
            className={`${styles.presetBtn} ${
              appliedRange.from === startOfMonth && appliedRange.to === today
                ? styles.presetBtnActive
                : ''
            }`}
            onClick={() => applyNewRange({ from: startOfMonth, to: today })}
          >
            Tháng này (Mặc định)
          </button>
          <button
            type="button"
            className={`${styles.presetBtn} ${
              appliedRange.from === daysBefore(today, 6) && appliedRange.to === today
                ? styles.presetBtnActive
                : ''
            }`}
            onClick={() => applyNewRange({ from: daysBefore(today, 6), to: today })}
          >
            7 ngày qua
          </button>
          <button
            type="button"
            className={`${styles.presetBtn} ${
              appliedRange.from === daysBefore(today, 29) && appliedRange.to === today
                ? styles.presetBtnActive
                : ''
            }`}
            onClick={() => applyNewRange({ from: daysBefore(today, 29), to: today })}
          >
            30 ngày qua
          </button>
          <button
            type="button"
            className={`${styles.presetBtn} ${
              appliedRange.from === daysBefore(today, 89) && appliedRange.to === today
                ? styles.presetBtnActive
                : ''
            }`}
            onClick={() => applyNewRange({ from: daysBefore(today, 89), to: today })}
          >
            90 ngày qua
          </button>
          {systemDateBounds && (
            <button
              type="button"
              className={`${styles.presetBtn} ${
                appliedRange.from === systemDateBounds.earliest &&
                appliedRange.to === systemDateBounds.latest
                  ? styles.presetBtnActive
                  : ''
              }`}
              onClick={() =>
                applyNewRange({
                  from: systemDateBounds.earliest,
                  to: systemDateBounds.latest,
                })
              }
            >
              Toàn thời gian ({systemDateBounds.totalInSystem})
            </button>
          )}
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
          <p>
            {stats.withCommentCount} có nhận xét chữ · {stats.withImagesCount} có ảnh
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>
            <span>HÀI LÒNG (4 - 5★)</span>
            <ThumbsUp size={18} className="text-emerald-600" />
          </div>
          <strong className="text-emerald-700">
            {stats.total > 0 ? Math.round((stats.positiveCount / stats.total) * 100) : 0}%
          </strong>
          <p>
            {stats.positiveCount} đánh giá ({stats.positiveCommentCount} có bình luận)
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>
            <span>CẦN CẢI THIỆN (1 - 2★)</span>
            <ThumbsDown size={18} className="text-rose-600" />
          </div>
          <strong className="text-rose-700">
            {stats.total > 0 ? Math.round((stats.negativeCount / stats.total) * 100) : 0}%
          </strong>
          <p>
            {stats.negativeCount} phản ánh ({stats.negativeCommentCount} có bình luận)
          </p>
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
              <div className="flex flex-wrap items-center gap-2">
                <h3>AI Phân Tích & Tóm Tắt Ý Kiến Khách Hàng</h3>
                <span className={styles.aiScopeBadge}>
                  Kỳ phân tích: {formatDateVN(appliedRange.from)} – {formatDateVN(appliedRange.to)}
                </span>
                {summaryGeneratedAt && (
                  <span className={styles.aiMetaBadge}>
                    {isAutoGenerated ? 'Tự động tổng hợp lúc ' : 'Cập nhật lúc '}
                    {summaryGeneratedAt}
                  </span>
                )}
              </div>
              <p>
                Tự động tạo báo cáo theo ngày tháng mặc định khi vừa vào trang; bạn có thể tùy chỉnh khoảng ngày hoặc chọn chế độ tóm tắt bên phải.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              icon={Sparkles}
              onClick={handleSummarizeToday}
              disabled={aiLoading || loading}
              title="Tóm tắt nhanh các phản hồi phát sinh trong ngày hôm nay"
            >
              Tóm tắt hôm nay
            </Button>
            <Button
              type="button"
              variant="primary"
              icon={Sparkles}
              onClick={() =>
                void handleGenerateAiSummary(filteredReviews, stats, appliedRange, undefined, false)
              }
              disabled={aiLoading || loading}
            >
              {aiLoading
                ? 'Đang phân tích...'
                : aiSummary
                ? 'Tóm tắt lại kỳ này'
                : 'Tạo tóm tắt kỳ này'}
            </Button>
          </div>
        </div>

        {/* Thông báo lỗi kết nối / dịch vụ AI */}
        {aiError && (
          <div className={`${styles.error} mt-4 flex flex-wrap items-center justify-between gap-3`}>
            <span>{aiError}</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                void handleGenerateAiSummary(filteredReviews, stats, appliedRange, undefined, false)
              }
            >
              Thử lại ngay
            </Button>
          </div>
        )}

        {/* Chỉ hiển thị thông báo khi kỳ đang chọn hoàn toàn không có lượt đánh giá nào */}
        {!loading && aiDiagnostic && aiDiagnostic.level === 'empty' && !aiError && (
          <div className={`${styles.diagnosticBox} ${styles.diagnosticEmpty}`}>
            <div className={styles.diagnosticHeader}>
              <AlertTriangle size={18} className="shrink-0 text-amber-700" />
              <div className="flex-1">
                <div className={styles.diagnosticTitle}>{aiDiagnostic.title}</div>
                <p className={styles.diagnosticReason}>{aiDiagnostic.reason}</p>
                {aiDiagnostic.details.length > 0 && (
                  <ul className={styles.diagnosticList}>
                    {aiDiagnostic.details.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
              {aiDiagnostic.canQuickSwitchLatestMonth && systemDateBounds && (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  icon={Sparkles}
                  onClick={handleSwitchToLatestDataPeriod}
                  disabled={aiLoading}
                >
                  Xem & Tóm tắt kỳ có dữ liệu gần nhất
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Nội dung báo cáo tóm tắt */}
        {aiLoading ? (
          <div className={styles.aiLoadingBox}>
            <RefreshCw size={18} className="animate-spin text-amber-600" />
            <span>
              Đang tổng hợp thống kê và phân tích nội dung đánh giá cho kỳ{' '}
              <strong>
                {formatDateVN(appliedRange.from)} – {formatDateVN(appliedRange.to)}
              </strong>
              , vui lòng chờ trong giây lát...
            </span>
          </div>
        ) : aiSummary ? (
          <div className={styles.aiContent}>{aiSummary}</div>
        ) : stats.total > 0 ? (
          <div className={styles.aiPromptAction}>
            <p className={styles.aiEmpty}>
              Bạn đã thay đổi bộ lọc khoảng thời gian sang{' '}
              <strong>
                {formatDateVN(appliedRange.from)} – {formatDateVN(appliedRange.to)}
              </strong>{' '}
              ({stats.total} lượt đánh giá, trong đó {stats.withCommentCount} lượt có nhận xét chi tiết). Bấm nút{' '}
              <strong>&ldquo;Tạo tóm tắt kỳ này&rdquo;</strong> ở góc phải để AI phân tích theo kỳ tùy chọn này.
            </p>
          </div>
        ) : null}
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
