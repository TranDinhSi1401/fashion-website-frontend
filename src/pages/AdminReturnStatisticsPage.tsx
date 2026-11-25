import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlarmClock,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Info,
  PackageSearch,
  Percent,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Truck,
  Wallet,
} from 'lucide-react';
import AdminNav from '../components/admin/AdminNav';
import { Badge, Button, Input, Select } from '../components/ui';
import { RETURN_REASON_META } from '../constants/returnMeta';
import { useAuth } from '../context/AuthContext';
import { returnStatisticsService } from '../services/returnStatisticsService';
import type { ReturnReason, ReturnRequestStatus } from '../types/return';
import type {
  CustomerRiskStatistics,
  ReturnFinancialPeriod,
  ReturnFinancialStatistics,
  ReturnOverviewStatistics,
  ReturnProductStatistics,
  ReturnReasonStatistics,
  ReturnSlaStatistics,
  ReturnStatisticsRange,
} from '../types/returnStatistics';
import { extractErrorMessage, formatCurrencyVND } from '../utils/format';
import styles from './AdminReturnStatisticsPage.module.css';

interface SectionState<T> {
  data: T | null;
  loading: boolean;
  error: string;
  forbidden?: boolean;
}

const todayDate = () => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  return ['year', 'month', 'day']
    .map((type) => parts.find((part) => part.type === type)!.value)
    .join('-');
};

const daysBefore = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
};

const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;

const num = (value?: number | null) => (value ?? 0).toLocaleString('vi-VN');
const pct = (value?: number | null) => `${(value ?? 0).toFixed(2)}%`;

const hoursLabel = (hours?: number | null) => {
  const val = hours ?? 0;
  if (val >= 24) {
    const days = Math.floor(val / 24);
    const remHours = Math.round(val % 24);
    return remHours > 0 ? `${days} ngày ${remHours} giờ` : `${days} ngày`;
  }
  return `${val.toFixed(1)} giờ`;
};

const weekLabel = (label: string) => {
  const match = /^\d{4}-(\d{2})-(\d{2})/.exec(label);
  return match ? `Tuần ${match[2]}/${match[1]}` : label;
};

const REASON_COLORS: Record<ReturnReason, string> = {
  DEFECTIVE: '#D0021B',
  WRONG_ITEM: '#E67E22',
  CHANGE_OF_MIND: '#2563EB',
};

const REASON_FALLBACK_PALETTE = ['#D0021B', '#E67E22', '#2563EB'];

const getReasonColor = (
  reason?: string | null,
  displayName?: string | null,
  index = 0
): string => {
  const normalized = reason?.trim().toUpperCase() as ReturnReason | undefined;
  if (normalized && normalized in REASON_COLORS) {
    return REASON_COLORS[normalized];
  }
  const label = displayName?.toLowerCase() ?? '';
  if (label.includes('lỗi')) return '#D0021B';
  if (label.includes('sai')) return '#E67E22';
  if (label.includes('đổi ý')) return '#2563EB';
  return REASON_FALLBACK_PALETTE[index % REASON_FALLBACK_PALETTE.length];
};

const STATUS_BAR_COLORS: Partial<Record<ReturnRequestStatus, string>> = {
  PENDING_APPROVAL: '#E67E22',
  WAITING_FOR_RETURN_DELIVERY: '#333333',
  INSPECTING: '#8A642D',
  WAITING_CUSTOMER_FEEDBACK: '#D49B27',
  WAITING_REFUND: '#C5A059',
  REFUNDED: '#1F8B4C',
  REJECTED: '#D0021B',
  CANCELLED: '#888888',
};

function useSection<T>(
  enabled: boolean,
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
  fallbackError: string
): SectionState<T> {
  const [state, setState] = useState<SectionState<T>>({
    data: null,
    loading: enabled,
    error: '',
    forbidden: false,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: '', forbidden: false });
      return;
    }

    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: '', forbidden: false }));

    fetcher(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ data, loading: false, error: '', forbidden: false });
        }
      })
      .catch((err: any) => {
        if (controller.signal.aborted) return;
        const status = err?.response?.status;
        if (status === 403) {
          setState({
            data: null,
            loading: false,
            error: 'Bạn không có quyền xem mục này.',
            forbidden: true,
          });
          return;
        }
        setState({
          data: null,
          loading: false,
          error: extractErrorMessage(err, fallbackError),
          forbidden: false,
        });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return state;
}

export default function AdminReturnStatisticsPage() {
  const { isAdmin } = useAuth();
  const today = todayDate();

  const [appliedRange, setAppliedRange] = useState<ReturnStatisticsRange>(() => ({
    from: daysBefore(today, 29),
    to: today,
  }));
  const [draftRange, setDraftRange] = useState(appliedRange);
  const [rangeError, setRangeError] = useState('');

  const [period, setPeriod] = useState<ReturnFinancialPeriod>('day');
  const [topLimit, setTopLimit] = useState<number>(10);
  const [minReturns, setMinReturns] = useState<number>(2);
  const [reload, setReload] = useState<number>(0);

  const overview = useSection<ReturnOverviewStatistics>(
    true,
    (signal) => returnStatisticsService.getOverview(appliedRange, signal),
    [appliedRange, reload],
    'Không tải được thống kê tổng quan trả hàng.'
  );

  const financial = useSection<ReturnFinancialStatistics>(
    true,
    (signal) => returnStatisticsService.getFinancial(period, appliedRange, signal),
    [appliedRange, period, reload],
    'Không tải được thống kê tài chính hoàn tiền.'
  );

  const reasons = useSection<ReturnReasonStatistics>(
    true,
    (signal) => returnStatisticsService.getReasons(appliedRange, signal),
    [appliedRange, reload],
    'Không tải được thống kê lý do trả hàng.'
  );

  const products = useSection<ReturnProductStatistics>(
    true,
    (signal) => returnStatisticsService.getProducts(appliedRange, topLimit, signal),
    [appliedRange, topLimit, reload],
    'Không tải được thống kê sản phẩm bị trả.'
  );

  const sla = useSection<ReturnSlaStatistics>(
    true,
    (signal) => returnStatisticsService.getSlaPerformance(appliedRange, signal),
    [appliedRange, reload],
    'Không tải được thống kê hiệu suất SLA.'
  );

  const customerRisks = useSection<CustomerRiskStatistics>(
    isAdmin,
    (signal) =>
      returnStatisticsService.getCustomerRisks(
        appliedRange,
        { minReturns, topLimit: 10 },
        signal
      ),
    [appliedRange, minReturns, reload],
    'Không tải được danh sách cảnh báo khách hàng.'
  );

  const anyLoading =
    overview.loading ||
    financial.loading ||
    reasons.loading ||
    products.loading ||
    sla.loading ||
    (isAdmin && customerRisks.loading);

  const applyRange = (event: FormEvent) => {
    event.preventDefault();
    const fromVal = draftRange.from || '';
    const toVal = draftRange.to || '';
    if (!validDate(fromVal) || !validDate(toVal)) {
      setRangeError('Chọn đủ ngày bắt đầu và ngày kết thúc hợp lệ.');
      return;
    }
    if (fromVal > toVal) {
      setRangeError('Từ ngày phải trước hoặc bằng đến ngày.');
      return;
    }
    if (toVal > today) {
      setRangeError('Không thể chọn ngày trong tương lai.');
      return;
    }
    setRangeError('');
    setAppliedRange({ from: fromVal, to: toVal });
  };

  // Financial Combo Chart computation
  const financialChart = useMemo(() => {
    const points = financial.data?.points ?? [];
    const width = 840;
    const height = 300;
    const padX = 28;
    const padTop = 20;
    const padBottom = 32;
    const plotHeight = height - padTop - padBottom;
    const plotWidth = width - padX * 2;

    const maxBar = Math.max(
      ...points.map((p) =>
        Math.max(p.refundAmount ?? 0, p.shopSubsidizedShippingFee ?? 0)
      ),
      1
    );
    const maxLine = Math.max(...points.map((p) => p.grossDeliveredRevenue ?? 0), 1);

    const slotWidth = points.length > 0 ? plotWidth / points.length : plotWidth;
    const barWidth = Math.min(16, Math.max(4, (slotWidth - 8) / 2));

    const items = points.map((point, index) => {
      const centerX = padX + slotWidth * (index + 0.5);
      const refundH = ((point.refundAmount ?? 0) / maxBar) * plotHeight;
      const shipH = ((point.shopSubsidizedShippingFee ?? 0) / maxBar) * plotHeight;
      const lineY =
        padTop + plotHeight - ((point.grossDeliveredRevenue ?? 0) / maxLine) * plotHeight;
      const formattedLabel =
        period === 'week' ? weekLabel(point.label) : point.label;

      return {
        point,
        formattedLabel,
        centerX,
        refundX: centerX - barWidth - 1,
        refundY: padTop + plotHeight - refundH,
        refundH,
        shipX: centerX + 1,
        shipY: padTop + plotHeight - shipH,
        shipH,
        lineY,
      };
    });

    const linePath = items
      .map((item, idx) => `${idx === 0 ? 'M' : 'L'} ${item.centerX} ${item.lineY}`)
      .join(' ');

    return { items, linePath, width, height, padX, padTop, plotHeight, barWidth };
  }, [financial.data, period]);

  // Donut Chart computation for Reasons
  const reasonDonut = useMemo(() => {
    const list = reasons.data?.reasons ?? [];
    const total = reasons.data?.totalRequests ?? 0;
    const radius = 64;
    const circumference = 2 * Math.PI * radius;

    const segments = list.reduce<
      Array<
        (typeof list)[number] & {
          color: string;
          dashArray: string;
          dashOffset: number;
        }
      >
    >((acc, item, index) => {
      const ratio = total > 0 ? (item.requestCount ?? 0) / total : 0;
      const dash = ratio * circumference;
      const prevDashSum = list
        .slice(0, index)
        .reduce(
          (sum, prev) =>
            sum + (total > 0 ? ((prev.requestCount ?? 0) / total) * circumference : 0),
          0
        );
      acc.push({
        ...item,
        color: getReasonColor(item.reason, item.reasonDisplayName, index),
        dashArray: `${dash} ${circumference - dash}`,
        dashOffset: -prevDashSum,
      });
      return acc;
    }, []);

    return { radius, circumference, segments, total };
  }, [reasons.data]);

  // SLA Gauge computation
  const slaGauge = useMemo(() => {
    const rate = Math.max(0, Math.min(100, sla.data?.slaComplianceRate ?? 0));
    const color =
      rate >= 90 ? '#1F8B4C' : rate >= 70 ? '#E67E22' : '#D0021B';
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    const dash = (rate / 100) * circumference;
    return { rate, color, radius, circumference, dash };
  }, [sla.data]);

  const backlogItems = overview.data
    ? [
        {
          status: 'PENDING_APPROVAL' as ReturnRequestStatus,
          label: 'Chờ duyệt',
          count: overview.data.pendingApprovalCount ?? 0,
        },
        {
          status: 'WAITING_FOR_RETURN_DELIVERY' as ReturnRequestStatus,
          label: 'Chờ hàng về',
          count: overview.data.waitingDeliveryCount ?? 0,
        },
        {
          status: 'INSPECTING' as ReturnRequestStatus,
          label: 'Chờ kiểm kho',
          count: overview.data.inspectingCount ?? 0,
        },
        {
          status: 'WAITING_CUSTOMER_FEEDBACK' as ReturnRequestStatus,
          label: 'Chờ khách phản hồi',
          count: overview.data.waitingCustomerFeedbackCount ?? 0,
        },
        {
          status: 'WAITING_REFUND' as ReturnRequestStatus,
          label: 'Chờ chuyển khoản',
          count: overview.data.waitingRefundCount ?? 0,
        },
      ]
    : [];

  return (
    <div className={`${styles.page} container py-8 sm:py-10`}>
      <AdminNav
        title="Thống kê trả hàng & hoàn tiền"
        subtitle="Theo dõi tỷ lệ trả hàng, chi phí hoàn tiền, thu hồi tồn kho, hiệu suất SLA và rủi ro khách hàng."
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            loading={anyLoading}
            onClick={() => setReload((v) => v + 1)}
          >
            Làm mới
          </Button>
        }
      />

      <form className={styles.toolbar} onSubmit={applyRange} noValidate>
        <div className={styles.dateFields}>
          <Input
            label="Từ ngày"
            type="date"
            value={draftRange.from || ''}
            min="1000-01-01"
            max={
              draftRange.to && draftRange.to < today ? draftRange.to : today
            }
            onChange={(e) => {
              setDraftRange((old) => ({ ...old, from: e.target.value }));
              setRangeError('');
            }}
          />
          <Input
            label="Đến ngày"
            type="date"
            value={draftRange.to || ''}
            min={draftRange.from || ''}
            max={today}
            onChange={(e) => {
              setDraftRange((old) => ({ ...old, to: e.target.value }));
              setRangeError('');
            }}
          />
        </div>
        <Button type="submit" icon={CalendarDays} loading={anyLoading}>
          Áp dụng
        </Button>
        {rangeError && (
          <p role="alert" className={styles.filterError}>
            {rangeError}
          </p>
        )}
      </form>

      {/* 1. OVERVIEW & LIVE BACKLOG */}
      <section className={styles.section} aria-labelledby="return-overview-heading">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleWrap}>
            <RotateCcw size={18} className={styles.sectionIcon} />
            <div>
              <h2 id="return-overview-heading">1. Tổng quan &amp; Hàng đợi cần xử lý ngay</h2>
              <p>Số liệu tổng hợp trong kỳ và tồn đọng hiện tại trên toàn hệ thống</p>
            </div>
          </div>
        </div>

        {overview.loading && (
          <p role="status" className={styles.sectionMessage}>
            Đang tải dữ liệu tổng quan...
          </p>
        )}
        {!overview.loading && overview.error && (
          <div role="alert" className={styles.sectionError}>
            {overview.error}
          </div>
        )}
        {!overview.loading && !overview.error && overview.data && (
          <>
            <div className={styles.kpiGrid4}>
              <article className={`${styles.kpiCard} ${styles.kpiFeatured}`}>
                <div className={styles.kpiLabel}>
                  <span>Tổng yêu cầu trả</span>
                  <RotateCcw size={18} />
                </div>
                <strong>{num(overview.data.totalReturnRequests)}</strong>
                <p>Phiếu trả phát sinh trong kỳ</p>
              </article>

              <article
                className={`${styles.kpiCard} ${
                  (overview.data.orderReturnRate ?? 0) > 10 ? styles.kpiWarning : ''
                }`}
              >
                <div className={styles.kpiLabel}>
                  <span>Tỷ lệ trả hàng (%)</span>
                  <Percent size={18} />
                </div>
                <strong>{pct(overview.data.orderReturnRate)}</strong>
                <p>
                  {num(overview.data.returnedOrderCount)} /{' '}
                  {num(overview.data.deliveredOrderCount)} đơn đã giao
                </p>
              </article>

              <article className={styles.kpiCard}>
                <div className={styles.kpiLabel}>
                  <span>Tổng tiền đã hoàn</span>
                  <CircleDollarSign size={18} />
                </div>
                <strong>{formatCurrencyVND(overview.data.totalRefundedAmount)}</strong>
                <p>{num(overview.data.refundedRequestCount)} phiếu đã hoàn</p>
              </article>

              <Link
                to="/admin/returns?isOverdue=true"
                className={`${styles.kpiCard} ${styles.kpiDanger}`}
              >
                <div className={styles.kpiLabel}>
                  <span>Đang quá hạn SLA</span>
                  <AlarmClock size={18} />
                </div>
                <strong>{num(overview.data.activeOverdueCount)}</strong>
                <p>Phiếu trễ hạn SLA 2 ngày làm việc · Bấm để xử lý ngay</p>
              </Link>
            </div>

            <div className={styles.backlogWrap}>
              <div className={styles.backlogHeader}>
                <span className={styles.backlogTitle}>Việc cần xử lý ngay</span>
                {isAdmin ? (
                  <Link
                    to="/admin/returns/dormant-reviews"
                    className={styles.dormantBadge}
                  >
                    <AlarmClock size={14} />
                    <span>
                      Lưu kho &gt; 30 ngày cần rà soát:{' '}
                      <strong>{num(overview.data.dormantOver30DaysCount)}</strong>
                    </span>
                  </Link>
                ) : (
                  <span className={styles.dormantBadge}>
                    <AlarmClock size={14} />
                    <span>
                      Lưu kho &gt; 30 ngày cần rà soát:{' '}
                      <strong>{num(overview.data.dormantOver30DaysCount)}</strong>
                    </span>
                  </span>
                )}
              </div>

              <div className={styles.backlogFlow}>
                {backlogItems.map((item, idx) => (
                  <div key={item.status} className={styles.backlogStep}>
                    <Link
                      to={`/admin/returns?status=${item.status}`}
                      className={styles.backlogPill}
                    >
                      <span>{item.label}</span>
                      <strong>{num(item.count)}</strong>
                    </Link>
                    {idx < backlogItems.length - 1 && (
                      <ChevronRight size={16} className={styles.flowArrow} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      {/* 2. FINANCIAL */}
      <section className={styles.section} aria-labelledby="return-financial-heading">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleWrap}>
            <Wallet size={18} className={styles.sectionIcon} />
            <div>
              <h2 id="return-financial-heading">
                2. Tài chính Hoàn tiền &amp; Chi phí Ship Ngược
              </h2>
              <p>So sánh tiền bán được với tiền đã hoàn lại và phí ship trả hàng</p>
            </div>
          </div>

          <div className={styles.segmented} role="group" aria-label="Chu kỳ biểu đồ tài chính">
            {(
              [
                ['day', 'Ngày'],
                ['week', 'Tuần'],
                ['month', 'Tháng'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                aria-pressed={period === val}
                className={`${styles.segmentBtn} ${
                  period === val ? styles.segmentActive : ''
                }`}
                onClick={() => setPeriod(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {financial.loading && (
          <p role="status" className={styles.sectionMessage}>
            Đang tải dữ liệu tài chính...
          </p>
        )}
        {!financial.loading && financial.error && (
          <div role="alert" className={styles.sectionError}>
            {financial.error}
          </div>
        )}
        {!financial.loading && !financial.error && financial.data && (
          <>
            <div className={styles.kpiGrid3}>
              <article
                className={`${styles.kpiCard} ${styles.kpiShipAlert}`}
                title={`Cước GHN chiều về ${formatCurrencyVND(
                  financial.data.totalGhnReturnShippingFee
                )} − Khách chịu (Đổi ý) ${formatCurrencyVND(
                  financial.data.totalCustomerShippingFeeDeducted
                )}`}
              >
                <div className={styles.kpiLabel}>
                  <span>Phí ship trả hàng Shop phải bù</span>
                  <Truck size={18} />
                </div>
                <strong>
                  {formatCurrencyVND(financial.data.totalShopSubsidizedShippingFee)}
                </strong>
              </article>

              <article className={styles.kpiCard}>
                <div className={styles.kpiLabel}>
                  <span>Doanh thu giữ lại sau hoàn</span>
                  <CircleDollarSign size={18} />
                </div>
                <strong>{formatCurrencyVND(financial.data.netRevenueAfterRefund)}</strong>
                <p>
                  Tổng doanh thu các đơn giao thành công trong kỳ là{' '}
                  {formatCurrencyVND(financial.data.grossDeliveredRevenue)}
                </p>
              </article>

              <article className={styles.kpiCard}>
                <div className={styles.kpiLabel}>
                  <span>Tỷ lệ hoàn tiền / Doanh thu</span>
                  <Percent size={18} />
                </div>
                <strong>{pct(financial.data.refundToRevenueRatio)}</strong>
                <p>Phần trăm doanh thu phải hoàn lại cho khách</p>
              </article>
            </div>

            <div className={styles.chartBox}>
              {financialChart.items.length > 0 ? (
                <>
                  <div className={styles.chartWrap}>
                    <svg
                      viewBox={`0 0 ${financialChart.width} ${financialChart.height}`}
                      role="img"
                      aria-label="Biểu đồ tài chính hoàn tiền và doanh thu gộp"
                    >
                      {[0, 1, 2, 3, 4].map((index) => {
                        const y =
                          financialChart.padTop +
                          index * (financialChart.plotHeight / 4);
                        return (
                          <line
                            key={index}
                            x1={financialChart.padX}
                            x2={financialChart.width - financialChart.padX}
                            y1={y}
                            y2={y}
                            className={styles.gridLine}
                          />
                        );
                      })}

                      {financialChart.items.map((item, idx) => (
                        <g key={item.point.label}>
                          <title>
                            {[
                              item.formattedLabel,
                              `Tiền đã hoàn cho khách: ${formatCurrencyVND(item.point.refundAmount)}`,
                              `Tổng giá trị hàng trả: ${formatCurrencyVND(item.point.itemsRefundAmount)}`,
                              `Phí ship Shop phải bù: ${formatCurrencyVND(item.point.shopSubsidizedShippingFee)}`,
                              `Phí ship khách chịu (Đổi ý): ${formatCurrencyVND(item.point.customerShippingFeeDeducted)}`,
                              `Tiền bán được (đơn đã giao): ${formatCurrencyVND(item.point.grossDeliveredRevenue)}`,
                              `Số phiếu đã hoàn: ${num(item.point.refundedRequestCount)}`,
                            ].join('\n')}
                          </title>
                          <rect
                            x={item.refundX}
                            y={item.refundY}
                            width={financialChart.barWidth}
                            height={Math.max(item.refundH, 0)}
                            fill="#C5A059"
                          />
                          <rect
                            x={item.shipX}
                            y={item.shipY}
                            width={financialChart.barWidth}
                            height={Math.max(item.shipH, 0)}
                            fill="#E67E22"
                          />
                          {(financialChart.items.length <= 12 ||
                            idx % Math.ceil(financialChart.items.length / 12) === 0) && (
                            <text
                              x={item.centerX}
                              y={financialChart.height - 8}
                              textAnchor="middle"
                              className={styles.axisLabel}
                            >
                              {item.formattedLabel}
                            </text>
                          )}
                        </g>
                      ))}

                      {financialChart.linePath && (
                        <path
                          d={financialChart.linePath}
                          fill="none"
                          stroke="#111111"
                          strokeWidth="2.5"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      )}

                      {financialChart.items.map((item) => (
                        <circle
                          key={`dot-${item.point.label}`}
                          cx={item.centerX}
                          cy={item.lineY}
                          r="4"
                          fill="#FFFFFF"
                          stroke="#111111"
                          strokeWidth="2.5"
                        >
                          <title>
                            {item.formattedLabel} · Tiền bán được:{' '}
                            {formatCurrencyVND(item.point.grossDeliveredRevenue)}
                          </title>
                        </circle>
                      ))}
                    </svg>
                  </div>

                  <div className={styles.chartLegend}>
                    <span className={styles.legendItem}>
                      <span className={styles.swatch} style={{ background: '#C5A059' }} />
                      Tiền đã hoàn cho khách
                    </span>
                    <span className={styles.legendItem}>
                      <span className={styles.swatch} style={{ background: '#E67E22' }} />
                      Phí ship Shop phải bù
                    </span>
                    <span className={styles.legendItem}>
                      <span
                        className={styles.swatchLine}
                        style={{ background: '#111111' }}
                      />
                      Tiền bán được (đơn đã giao)
                    </span>
                  </div>
                </>
              ) : (
                <p className={styles.sectionMessage}>
                  Chưa có dữ liệu tài chính trong khoảng thời gian này.
                </p>
              )}
            </div>
          </>
        )}
      </section>

      {/* 3. REASONS & DISCREPANCY */}
      <section className={styles.section} aria-labelledby="return-reasons-heading">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleWrap}>
            <RotateCcw size={18} className={styles.sectionIcon} />
            <div>
              <h2 id="return-reasons-heading">
                3. Lý do Trả hàng &amp; Độ lệch Kiểm định
              </h2>
              <p>Phân bổ 3 nhóm lý do trả hàng và chất lượng kiểm định kho</p>
            </div>
          </div>
        </div>

        {reasons.loading && (
          <p role="status" className={styles.sectionMessage}>
            Đang tải thống kê lý do trả hàng...
          </p>
        )}
        {!reasons.loading && reasons.error && (
          <div role="alert" className={styles.sectionError}>
            {reasons.error}
          </div>
        )}
        {!reasons.loading && !reasons.error && reasons.data && (
          <div className={styles.reasonsGrid}>
            <div className={styles.donutBlock}>
              <div className={styles.donutWrap}>
                <svg width="190" height="190" viewBox="0 0 180 180" role="img" aria-label="Biểu đồ tỷ lệ lý do trả hàng">
                  <circle
                    cx="90"
                    cy="90"
                    r={reasonDonut.radius}
                    fill="none"
                    stroke="#EBEBEB"
                    strokeWidth="24"
                  />
                  {reasonDonut.total > 0 &&
                    reasonDonut.segments.map((seg, idx) => (
                      <circle
                        key={seg.reason || seg.reasonDisplayName || idx}
                        cx="90"
                        cy="90"
                        r={reasonDonut.radius}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="24"
                        strokeDasharray={seg.dashArray}
                        strokeDashoffset={seg.dashOffset}
                        transform="rotate(-90 90 90)"
                      >
                        <title>
                          {seg.reasonDisplayName}: {num(seg.requestCount)} phiếu (
                          {pct(seg.percentage)})
                        </title>
                      </circle>
                    ))}
                  <text
                    x="90"
                    y="86"
                    textAnchor="middle"
                    fontSize="22"
                    fontWeight="700"
                    fill="#111111"
                  >
                    {num(reasonDonut.total)}
                  </text>
                  <text x="90" y="106" textAnchor="middle" fontSize="12" fill="#888888">
                    phiếu
                  </text>
                </svg>
              </div>

              <table className={styles.donutTable}>
                <thead>
                  <tr>
                    <th>Lý do</th>
                    <th>Số phiếu</th>
                    <th>Tỷ lệ</th>
                    <th>Tiền đã hoàn</th>
                  </tr>
                </thead>
                <tbody>
                  {(reasons.data.reasons ?? []).map((item, idx) => (
                    <tr key={item.reason || item.reasonDisplayName || idx}>
                      <td>
                        <span className={styles.legendItem}>
                          <span
                            className={styles.swatch}
                            style={{
                              background: getReasonColor(
                                item.reason,
                                item.reasonDisplayName,
                                idx
                              ),
                            }}
                          />
                          {item.reasonDisplayName}
                        </span>
                      </td>
                      <td>{num(item.requestCount)}</td>
                      <td>{pct(item.percentage)}</td>
                      <td>
                        {formatCurrencyVND(item.totalRefundAmount)}
                        <span className={styles.subMuted}>
                          từ {num(item.refundedCount)} phiếu
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.discrepancyGrid}>
              <article className={styles.discrepancyCard}>
                <span>Đề xuất chuyển sang Đổi ý</span>
                <strong>
                  {num(reasons.data.pendingReclassifyToChangeOfMindCount)}
                </strong>
                <p>Khách báo lỗi nhưng kho kiểm không thấy lỗi</p>
              </article>
              <article className={styles.discrepancyCard}>
                <span>Chấp nhận trả 1 phần</span>
                <strong>{num(reasons.data.partialAcceptanceCount)}</strong>
                <p>Phiếu được kho chấp nhận hoàn một phần số lượng</p>
              </article>
              <article className={styles.discrepancyCard}>
                <span>Từ chối sau kiểm kho</span>
                <strong>{num(reasons.data.rejectedAfterInspectionCount)}</strong>
                <p>Không đạt điều kiện sau khi hàng đã về kho</p>
              </article>
              <article className={styles.discrepancyCard}>
                <span>Từ chối trước kiểm kho</span>
                <strong>{num(reasons.data.rejectedBeforeInspectionCount)}</strong>
                <p>Từ chối ngay khâu duyệt hoặc quá hạn bàn giao</p>
              </article>
            </div>
          </div>
        )}
      </section>

      {/* 4. PRODUCTS & INVENTORY RECOVERY */}
      <section className={styles.section} aria-labelledby="return-products-heading">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleWrap}>
            <PackageSearch size={18} className={styles.sectionIcon} />
            <div>
              <h2 id="return-products-heading">
                4. Sản phẩm / Biến thể bị trả nhiều &amp; Thu hồi Tồn kho
              </h2>
              <p>Tỷ lệ nhập lại kho bán tiếp, hàng hỏng và xếp hạng biến thể trả nhiều</p>
            </div>
          </div>
        </div>

        {products.loading && (
          <p role="status" className={styles.sectionMessage}>
            Đang tải thống kê sản phẩm trả hàng...
          </p>
        )}
        {!products.loading && products.error && (
          <div role="alert" className={styles.sectionError}>
            {products.error}
          </div>
        )}
        {!products.loading && !products.error && products.data && (
          <>
            {(() => {
              const accepted = products.data.totalAcceptedUnits || 0;
              const restockedPct = accepted
                ? ((products.data.totalRestockedUnits ?? 0) / accepted) * 100
                : 0;
              const writeOffPct = accepted
                ? ((products.data.confirmedWriteOffUnits ?? 0) / accepted) * 100
                : 0;
              const pendingPct = accepted
                ? ((products.data.pendingRestockUnits ?? 0) / accepted) * 100
                : 0;

              return (
                <div className={styles.recoveryCard}>
                  <div className={styles.recoveryHeader}>
                    <div>
                      <div className={styles.recoveryTitle}>
                        Tình trạng xử lý hàng trả về kho
                      </div>
                      <div className={styles.recoverySub}>
                        Khách yêu cầu trả{' '}
                        <strong>{num(products.data.totalRequestedUnits)} chiếc</strong>{' '}
                        &rarr; Kho đã chấp nhận hoàn{' '}
                        <strong>{num(accepted)} chiếc</strong>
                      </div>
                    </div>
                    <div className={styles.recoveryBadge}>
                      <span>Tỷ lệ nhập kho bán lại</span>
                      <strong>{pct(products.data.restockRecoveryRate)}</strong>
                    </div>
                  </div>

                  <div className={styles.recoveryGrid}>
                    <div className={`${styles.recoveryItem} ${styles.recoveryRestocked}`}>
                      <span>Đã nhập kho bán lại</span>
                      <strong>{num(products.data.totalRestockedUnits)} chiếc</strong>
                      <p>Đủ điều kiện bán tiếp ({pct(restockedPct)})</p>
                    </div>

                    <div className={`${styles.recoveryItem} ${styles.recoveryPending}`}>
                      <span>Chờ kho phân loại</span>
                      <strong>{num(products.data.pendingRestockUnits)} chiếc</strong>
                      <p>Đang chờ kiểm tra nhập kho ({pct(pendingPct)})</p>
                    </div>

                    <div className={`${styles.recoveryItem} ${styles.recoveryWriteOff}`}>
                      <span>Hàng hỏng / Bỏ đi</span>
                      <strong>{num(products.data.confirmedWriteOffUnits)} chiếc</strong>
                      <p>
                        Thiệt hại ước tính:{' '}
                        {formatCurrencyVND(products.data.estimatedWriteOffValue)}
                      </p>
                    </div>
                  </div>

                  <div className={styles.stackedTrack} aria-label="Phân bổ thu hồi tồn kho">
                    <div
                      className={styles.stackedRestocked}
                      style={{ width: `${restockedPct}%` }}
                      title={`Đã nhập kho bán lại: ${num(
                        products.data.totalRestockedUnits
                      )} chiếc`}
                    />
                    <div
                      className={styles.stackedPending}
                      style={{ width: `${pendingPct}%` }}
                      title={`Chờ kho phân loại: ${num(
                        products.data.pendingRestockUnits
                      )} chiếc`}
                    />
                    <div
                      className={styles.stackedWriteOff}
                      style={{ width: `${writeOffPct}%` }}
                      title={`Hàng hỏng / Bỏ đi: ${num(
                        products.data.confirmedWriteOffUnits
                      )} chiếc`}
                    />
                  </div>
                </div>
              );
            })()}

            <div className={styles.controlRow}>
              <span className={styles.backlogTitle}>Top biến thể bị trả nhiều nhất</span>
              <div className={styles.controlSelect}>
                <Select
                  label="Số lượng hiển thị"
                  value={String(topLimit)}
                  onChange={(e) => setTopLimit(Number(e.target.value))}
                  options={[
                    { value: '5', label: 'Top 5' },
                    { value: '10', label: 'Top 10' },
                    { value: '20', label: 'Top 20' },
                  ]}
                />
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Sản phẩm &amp; Biến thể</th>
                    <th className={styles.numCell}>Số phiếu / Số chiếc trả</th>
                    <th className={styles.numCell}>Tỷ lệ trả biến thể</th>
                    <th>Lý do chính</th>
                    <th className={styles.numCell}>Tiền hàng hoàn</th>
                  </tr>
                </thead>
                <tbody>
                  {(products.data.topReturnedVariants ?? []).length > 0 ? (
                    (products.data.topReturnedVariants ?? []).map((v, idx) => (
                      <tr key={`${v.productId}-${v.variantId ?? v.sku ?? idx}`}>
                        <td>
                          <Link
                            to={`/products/${v.productId}`}
                            className={styles.productLink}
                          >
                            {v.productName}
                          </Link>
                          <div className={styles.variantTags}>
                            {v.color && (
                              <span className={styles.variantChip}>{v.color}</span>
                            )}
                            {v.size && (
                              <span className={styles.variantChip}>Size {v.size}</span>
                            )}
                            {v.sku && (
                              <span className={styles.variantChip}>SKU: {v.sku}</span>
                            )}
                          </div>
                        </td>
                        <td className={styles.numCell}>
                          {num(v.returnRequestCount)} phiếu · {num(v.returnedUnits)} chiếc
                        </td>
                        <td className={styles.numCell}>
                          <span
                            className={
                              (v.variantReturnRate ?? 0) >= 20
                                ? styles.rateDanger
                                : undefined
                            }
                          >
                            {pct(v.variantReturnRate)}
                          </span>
                          <span className={styles.subMuted}>
                            {num(v.returnedUnits)} / {num(v.soldUnitsInPeriod)} đã giao
                          </span>
                        </td>
                        <td>
                          {v.topReason ? (
                            <span className={styles.reasonChip}>
                              {RETURN_REASON_META[v.topReason]?.label ?? v.topReason}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className={styles.numCell}>
                          {formatCurrencyVND(v.totalItemRefundAmount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className={styles.sectionMessage}>
                        Chưa có dữ liệu biến thể trả hàng trong kỳ.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* 5. SLA PERFORMANCE & FUNNEL */}
      <section className={styles.section} aria-labelledby="return-sla-heading">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleWrap}>
            <AlarmClock size={18} className={styles.sectionIcon} />
            <div>
              <h2 id="return-sla-heading">
                5. Phễu Trạng thái &amp; Hiệu suất SLA 2 ngày làm việc
              </h2>
              <p>Tốc độ xử lý trung bình từng khâu và phân bổ hồ sơ theo trạng thái</p>
            </div>
          </div>
        </div>

        {sla.loading && (
          <p role="status" className={styles.sectionMessage}>
            Đang tải hiệu suất SLA...
          </p>
        )}
        {!sla.loading && sla.error && (
          <div role="alert" className={styles.sectionError}>
            {sla.error}
          </div>
        )}
        {!sla.loading && !sla.error && sla.data && (
          <>
            <div className={styles.slaTop}>
              <div className={styles.gaugeCard}>
                <svg
                  width="150"
                  height="150"
                  viewBox="0 0 150 150"
                  role="img"
                  aria-label={`Tỷ lệ đạt SLA ${pct(sla.data.slaComplianceRate)}`}
                >
                  <circle
                    cx="75"
                    cy="75"
                    r={slaGauge.radius}
                    fill="none"
                    stroke="#EBEBEB"
                    strokeWidth="14"
                  />
                  <circle
                    cx="75"
                    cy="75"
                    r={slaGauge.radius}
                    fill="none"
                    stroke={slaGauge.color}
                    strokeWidth="14"
                    strokeDasharray={`${slaGauge.dash} ${slaGauge.circumference}`}
                    transform="rotate(-90 75 75)"
                  />
                  <text
                    x="75"
                    y="72"
                    textAnchor="middle"
                    fontSize="20"
                    fontWeight="700"
                    fill="#111111"
                  >
                    {slaGauge.rate.toFixed(1)}%
                  </text>
                  <text x="75" y="92" textAnchor="middle" fontSize="11" fill="#555555">
                    Đạt SLA 2 ngày
                  </text>
                </svg>

                <div className={styles.gaugeStats}>
                  <span>
                    {num(sla.data.totalSlaBreachedRequests)} /{' '}
                    {num(sla.data.totalRequests)} phiếu vi phạm SLA
                  </span>
                  <span>Đang trễ hiện tại: {num(sla.data.currentlyOverdueCount)}</span>
                  <span>Gia hạn bàn giao: {num(sla.data.handoverExtendedCount)} lần</span>
                </div>
              </div>

              <div className={styles.timeline5}>
                <div className={styles.timelineStep}>
                  <span>1. CSKH duyệt</span>
                  <strong>{hoursLabel(sla.data.avgApprovalHours)}</strong>
                  <div
                    className={`${styles.slaBreachNote} ${
                      (sla.data.breachedApprovalSlaCount ?? 0) > 0
                        ? styles.slaBreachHot
                        : ''
                    }`}
                  >
                    Trễ SLA: {num(sla.data.breachedApprovalSlaCount)}
                  </div>
                </div>

                <div className={styles.timelineStep}>
                  <span>2. GHN lấy &amp; giao về kho</span>
                  <strong>{hoursLabel(sla.data.avgReturnDeliveryHours)}</strong>
                  <div className={styles.slaBreachNote}>Vận chuyển chiều về</div>
                </div>

                <div className={styles.timelineStep}>
                  <span>3. Kho kiểm định</span>
                  <strong>{hoursLabel(sla.data.avgInspectionHours)}</strong>
                  <div
                    className={`${styles.slaBreachNote} ${
                      (sla.data.breachedInspectionSlaCount ?? 0) > 0
                        ? styles.slaBreachHot
                        : ''
                    }`}
                  >
                    Trễ SLA: {num(sla.data.breachedInspectionSlaCount)}
                  </div>
                </div>

                <div className={styles.timelineStep}>
                  <span>4. Kế toán hoàn tiền</span>
                  <strong>{hoursLabel(sla.data.avgRefundExecutionHours)}</strong>
                  <div
                    className={`${styles.slaBreachNote} ${
                      (sla.data.breachedRefundSlaCount ?? 0) > 0
                        ? styles.slaBreachHot
                        : ''
                    }`}
                  >
                    Trễ SLA: {num(sla.data.breachedRefundSlaCount)}
                  </div>
                </div>

                <div className={`${styles.timelineStep} ${styles.timelineStepEnd}`}>
                  <span>5. Tổng vòng đời khép kín</span>
                  <strong>{hoursLabel(sla.data.avgEndToEndResolutionHours)}</strong>
                  <div className={styles.slaBreachNote}>Từ lúc tạo đến hoàn tất</div>
                </div>
              </div>
            </div>

            <div className={styles.funnelList}>
              <div className={styles.funnelHeader}>
                <h3 className={styles.funnelTitle}>
                  Trạng thái hiện tại của {num(sla.data.totalRequests)} phiếu phát sinh
                  trong kỳ
                </h3>
                <span className={styles.funnelNote}>
                  Tỷ lệ % tính trên tổng {num(sla.data.totalRequests)} phiếu trong kỳ
                </span>
              </div>
              {(sla.data.statusBreakdown ?? []).map((row) => (
                <div key={row.status} className={styles.funnelRow}>
                  <span>{row.displayName}</span>
                  <div className={styles.funnelTrack}>
                    <div
                      className={styles.funnelFill}
                      style={{
                        width: `${Math.min(100, Math.max(0, row.percentage ?? 0))}%`,
                        background:
                          STATUS_BAR_COLORS[row.status] ?? 'var(--color-accent-gold)',
                      }}
                    />
                  </div>
                  <span className={styles.funnelCount}>
                    <strong>{num(row.count)}</strong> / {num(sla.data?.totalRequests)}{' '}
                    phiếu ({pct(row.percentage)})
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* 6. CUSTOMER RISKS — ADMIN ONLY */}
      {isAdmin && (
        <section className={styles.section} aria-labelledby="return-risks-heading">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleWrap}>
              <ShieldAlert size={18} className={styles.sectionIcon} />
              <div>
                <h2 id="return-risks-heading">
                  6. Cảnh báo Khách hàng Trả hàng Bất thường (Chỉ ADMIN)
                </h2>
                <p>Theo dõi các tài khoản có tần suất trả hàng hoặc lệch kiểm định cao</p>
              </div>
            </div>
          </div>

          <div className={styles.infoBanner}>
            <Info size={16} className="shrink-0 mt-0.5 text-accent-gold" />
            <span>
              Danh sách này dùng để lưu ý Kho quay video cận cảnh khi kiểm định kiện
              hàng hoàn của các tài khoản có tỷ lệ trả cao, không dùng để khóa tài
              khoản tự động.
            </span>
          </div>

          <div className={styles.riskToolbar}>
            <div className={styles.riskFilterGroup}>
              <span className={styles.riskFilterLabel}>Hiển thị khách trả từ:</span>
              <div
                className={styles.segmented}
                role="group"
                aria-label="Lọc theo số phiếu trả tối thiểu"
              >
                {[2, 3, 5].map((threshold) => (
                  <button
                    key={threshold}
                    type="button"
                    aria-pressed={minReturns === threshold}
                    className={`${styles.segmentBtn} ${
                      minReturns === threshold ? styles.segmentActive : ''
                    }`}
                    onClick={() => setMinReturns(threshold)}
                  >
                    {threshold} phiếu trở lên
                  </button>
                ))}
              </div>
            </div>

            {customerRisks.data && (
              <Badge variant="warning" className="px-3 py-1.5 text-xs font-semibold">
                Có {num(customerRisks.data.flaggedCustomerCount)} tài khoản cần lưu ý
              </Badge>
            )}
          </div>

          {customerRisks.loading && (
            <p role="status" className={styles.sectionMessage}>
              Đang tải danh sách cảnh báo khách hàng...
            </p>
          )}
          {!customerRisks.loading && customerRisks.error && (
            <div role="alert" className={styles.sectionError}>
              {customerRisks.error}
            </div>
          )}
          {!customerRisks.loading && !customerRisks.error && customerRisks.data && (
            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th className={styles.numCell}>Tần suất trả</th>
                    <th className={styles.numCell}>Tỷ lệ trả cá nhân</th>
                    <th>Chi tiết các phiếu trả</th>
                    <th className={styles.numCell}>Tổng tiền đã hoàn</th>
                  </tr>
                </thead>
                <tbody>
                  {(customerRisks.data.customers ?? []).length > 0 ? (
                    (customerRisks.data.customers ?? []).map((cust) => {
                      const highRisk = (cust.personalReturnRate ?? 0) >= 50;
                      return (
                        <tr key={cust.userId}>
                          <td>
                            <div className="font-semibold text-content-primary">
                              {cust.fullName || cust.username}{' '}
                              <span className="text-xs font-normal text-content-muted">
                                ({cust.username})
                              </span>
                            </div>
                            <span className={styles.subMuted}>
                              {[cust.phone, cust.email].filter(Boolean).join(' · ') ||
                                'Chưa có thông tin liên hệ'}
                            </span>
                          </td>
                          <td className={styles.numCell}>
                            {num(cust.totalReturnRequests)} phiếu /{' '}
                            {num(cust.deliveredOrderCount)} đơn đã giao
                          </td>
                          <td className={styles.numCell}>
                            <span className={highRisk ? styles.rateDanger : undefined}>
                              {pct(cust.personalReturnRate)}
                            </span>
                            <div className={styles.rateTrack}>
                              <div
                                className={`${styles.rateBar} ${
                                  highRisk ? styles.rateBarDanger : ''
                                }`}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(0, cust.personalReturnRate ?? 0)
                                  )}%`,
                                }}
                              />
                            </div>
                          </td>
                          <td>
                            <div className={styles.signalBadges}>
                              <Badge
                                variant="warning"
                                title="Khách báo sản phẩm lỗi nhưng kho kiểm không thấy lỗi"
                              >
                                Báo lỗi không đúng: {num(cust.discrepancyCount)}
                              </Badge>
                              <Badge
                                variant="error"
                                title="Số phiếu trả hàng bị shop từ chối"
                              >
                                Bị từ chối: {num(cust.rejectedRequestCount)}
                              </Badge>
                              <Badge
                                variant="default"
                                title="Số phiếu khách hàng tự hủy"
                              >
                                Khách tự hủy: {num(cust.cancelledRequestCount)}
                              </Badge>
                              <Badge
                                variant="success"
                                title="Số phiếu đã được hoàn tiền thành công"
                              >
                                Đã hoàn tiền: {num(cust.refundedRequestCount)}
                              </Badge>
                            </div>
                          </td>
                          <td className={styles.numCell}>
                            {formatCurrencyVND(cust.totalRefundedAmount)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className={styles.sectionMessage}>
                        Không có tài khoản nào vượt ngưỡng trong khoảng thời gian này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
