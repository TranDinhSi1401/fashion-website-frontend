import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarDays, RefreshCw, ShoppingCart, CircleDollarSign, PackageCheck, Clock3, Ban } from 'lucide-react';
import AdminNav from '../components/admin/AdminNav';
import { Button, Input, Select } from '../components/ui';
import {
  orderService,
  type OrderOverviewStatistics,
  type RevenueStatistics,
  type OrderStatusStatistics,
  type PaymentStatistics,
  type CancellationStatistics,
  type AverageOrderValueStatistics,
} from '../services/orderService';
import { extractErrorMessage, formatCurrencyVND } from '../utils/format';
import styles from './AdminOrderStatisticsPage.module.css';

type Period = 'day' | 'month' | 'year';

const todayDate = () => {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
};
const daysBefore = (value: string, days: number) => {
  const date = new Date(value + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
};
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const number = (value: number) => value.toLocaleString('vi-VN');

const statusLabels: Record<keyof OrderStatusStatistics['counts'], string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  RETURNED: 'Đã trả',
};

export default function AdminOrderStatisticsPage() {
  const today = todayDate();
  const [appliedRange, setAppliedRange] = useState({ from: daysBefore(today, 29), to: today });
  const [draftRange, setDraftRange] = useState(appliedRange);
  const [period, setPeriod] = useState<Period>('day');
  const [overview, setOverview] = useState<OrderOverviewStatistics | null>(null);
  const [revenue, setRevenue] = useState<RevenueStatistics | null>(null);
  const [status, setStatus] = useState<OrderStatusStatistics | null>(null);
  const [payment, setPayment] = useState<PaymentStatistics | null>(null);
  const [cancellation, setCancellation] = useState<CancellationStatistics | null>(null);
  const [average, setAverage] = useState<AverageOrderValueStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rangeError, setRangeError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    Promise.all([
      orderService.getOrderOverviewStatistics(appliedRange, controller.signal),
      orderService.getOrderRevenueStatistics(period, appliedRange, controller.signal),
      orderService.getOrderStatusStatistics(appliedRange, controller.signal),
      orderService.getPaymentStatistics(appliedRange, controller.signal),
      orderService.getCancellationStatistics(appliedRange, controller.signal),
      orderService.getAverageOrderValueStatistics(appliedRange, controller.signal),
    ]).then(([overviewData, revenueData, statusData, paymentData, cancellationData, averageData]) => {
      setOverview(overviewData);
      setRevenue(revenueData);
      setStatus(statusData);
      setPayment(paymentData);
      setCancellation(cancellationData);
      setAverage(averageData);
    }).catch(reason => {
      if (!controller.signal.aborted) setError(extractErrorMessage(reason, 'Không tải được thống kê đơn hàng.'));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [appliedRange, period, reload]);

  const applyRange = (event: FormEvent) => {
    event.preventDefault();
    if (!validDate(draftRange.from) || !validDate(draftRange.to)) {
      setRangeError('Chọn đủ ngày bắt đầu và ngày kết thúc hợp lệ.');
      return;
    }
    if (draftRange.from > draftRange.to) {
      setRangeError('Từ ngày phải trước hoặc bằng đến ngày.');
      return;
    }
    if (draftRange.to > today) {
      setRangeError('Không thể chọn ngày trong tương lai.');
      return;
    }
    setRangeError('');
    setAppliedRange({ ...draftRange });
  };

  const chart = useMemo(() => {
    const points = revenue?.points ?? [];
    const max = Math.max(...points.map(point => point.revenue), 1);
    const width = 840;
    const height = 280;
    const padX = 16;
    const padY = 16;
    const step = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0;
    const coords = points.map((point, index) => ({
      x: points.length === 1 ? width / 2 : padX + index * step,
      y: height - padY - (point.revenue / max) * (height - padY * 2),
    }));
    const line = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const area = coords.length ? `${line} L ${coords[coords.length - 1].x} ${height - padY} L ${coords[0].x} ${height - padY} Z` : '';
    return { points, coords, line, area, width, height, max };
  }, [revenue]);

  return (
    <div className={`${styles.page} container py-8 sm:py-10`}>
      <AdminNav
        title="Thống kê đơn hàng"
        subtitle="Theo dõi doanh thu, trạng thái đơn và hiệu quả thanh toán."
        actions={<Button variant="outline" size="sm" icon={RefreshCw} loading={loading} onClick={() => setReload(value => value + 1)}>Làm mới</Button>}
      />

      <form className={styles.toolbar} onSubmit={applyRange} noValidate>
        <div className={styles.dateFields}>
          <Input label="Từ ngày" type="date" value={draftRange.from} min="1000-01-01" max={draftRange.to < today ? draftRange.to : today} onChange={event => { setDraftRange(old => ({ ...old, from: event.target.value })); setRangeError(''); }} />
          <Input label="Đến ngày" type="date" value={draftRange.to} min={draftRange.from} max={today} onChange={event => { setDraftRange(old => ({ ...old, to: event.target.value })); setRangeError(''); }} />
        </div>
        <Select label="Cách gom nhóm" value={period} onChange={event => setPeriod(event.target.value as Period)} options={[{ value: 'day', label: 'Theo ngày' }, { value: 'month', label: 'Theo tháng' }, { value: 'year', label: 'Theo năm' }]} />
        <Button type="submit" icon={CalendarDays} loading={loading}>Áp dụng</Button>
        {rangeError && <p role="alert" className={styles.filterError}>{rangeError}</p>}
      </form>

      {loading && <p role="status" className={styles.message}>Đang tổng hợp số liệu đơn hàng...</p>}
      {error && <div role="alert" className={styles.error}>{error}</div>}

      {!loading && !error && overview && (
        <>
          <section className={styles.cards} aria-label="Tổng quan đơn hàng">
            <article className={`${styles.card} ${styles.featured}`}><div className={styles.cardLabel}><span>Tổng đơn hàng</span><ShoppingCart size={18} /></div><strong>{number(overview.totalOrders)}</strong><p>Trong khoảng thời gian đang xem</p></article>
            <article className={styles.card}><div className={styles.cardLabel}><span>Tổng doanh thu</span><CircleDollarSign size={18} /></div><strong>{formatCurrencyVND(overview.totalRevenue)}</strong><p>Chỉ tính đơn đã giao</p></article>
            <article className={styles.card}><div className={styles.cardLabel}><span>Đơn hoàn thành</span><PackageCheck size={18} /></div><strong>{number(overview.completedOrders)}</strong><p>Trạng thái DELIVERED</p></article>
            <article className={styles.card}><div className={styles.cardLabel}><span>Đang xử lý / giao</span><Clock3 size={18} /></div><strong>{number(overview.processingOrders)}</strong><p>PROCESSING và SHIPPING</p></article>
            <article className={styles.card}><div className={styles.cardLabel}><span>Đơn đã hủy</span><Ban size={18} /></div><strong>{number(overview.cancelledOrders)}</strong><p>{cancellation ? `${cancellation.cancellationRate.toFixed(2)}% tổng đơn` : 'Tỷ lệ hủy đơn'}</p></article>
            <article className={styles.card}><div className={styles.cardLabel}><span>Giá trị đơn trung bình</span><CircleDollarSign size={18} /></div><strong>{formatCurrencyVND(average?.averageOrderValue ?? 0)}</strong><p>{number(average?.eligibleOrders ?? 0)} đơn đủ điều kiện</p></article>
          </section>

          <section className={styles.chartPanel} aria-labelledby="revenue-chart-heading">
            <div className={styles.panelHeading}>
              <div><h2 id="revenue-chart-heading">Doanh thu theo thời gian</h2><p>{number(revenue?.totalOrders ?? 0)} đơn hoàn thành · {formatCurrencyVND(revenue?.totalRevenue ?? 0)}</p></div>
              <span className={styles.periodLabel}>{period === 'day' ? 'Ngày' : period === 'month' ? 'Tháng' : 'Năm'}</span>
            </div>
            {chart.points.length ? (
              <div className={styles.chartWrap}>
                <svg viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label="Biểu đồ doanh thu theo thời gian">
                  {[0, 1, 2, 3, 4].map(index => {
                    const y = 16 + index * ((chart.height - 32) / 4);
                    return <line key={index} x1="16" x2={chart.width - 16} y1={y} y2={y} className={styles.gridLine} />;
                  })}
                  {chart.area && <path d={chart.area} className={styles.chartArea} />}
                  {chart.line && <path d={chart.line} className={styles.chartLine} />}
                  {chart.coords.map((point, index) => (
                    <g key={chart.points[index].label}>
                      <circle cx={point.x} cy={point.y} r="5" className={styles.chartPoint}>
                        <title>{chart.points[index].label}: {formatCurrencyVND(chart.points[index].revenue)} · {chart.points[index].orderCount} đơn</title>
                      </circle>
                      {(chart.points.length <= 12 || index % Math.ceil(chart.points.length / 12) === 0) && <text x={point.x} y={chart.height - 2} textAnchor="middle" className={styles.axisLabel}>{chart.points[index].label}</text>}
                    </g>
                  ))}
                </svg>
              </div>
            ) : <p className={styles.message}>Chưa có dữ liệu doanh thu.</p>}
          </section>

          <div className={styles.detailsGrid}>
            <section className={styles.panel} aria-labelledby="status-heading">
              <div className={styles.panelHeading}><div><h2 id="status-heading">Số lượng theo trạng thái</h2><p>{number(status?.totalOrders ?? 0)} đơn</p></div></div>
              <div className={styles.statusList}>
                {status && (Object.keys(statusLabels) as Array<keyof typeof statusLabels>).map(key => (
                  <div className={styles.statusRow} key={key}>
                    <span>{statusLabels[key]}</span>
                    <strong>{number(status.counts[key] ?? 0)}</strong>
                    <div className={styles.track}><div style={{ width: `${status.totalOrders ? ((status.counts[key] ?? 0) / status.totalOrders) * 100 : 0}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.panel} aria-labelledby="payment-heading">
              <div className={styles.panelHeading}><div><h2 id="payment-heading">Thanh toán và phương thức</h2><p>{number(payment?.totalOrders ?? 0)} đơn</p></div></div>
              <div className={styles.paymentColumns}>
                <div>
                  <h3>Trạng thái thanh toán</h3>
                  {payment && ([
                    ['PENDING', 'Chờ thanh toán'], ['PENDING_COD', 'Chờ thanh toán COD'], ['PAID', 'Đã thanh toán'], ['FAILED', 'Thất bại'], ['REFUNDED', 'Hoàn tiền'],
                  ] as const).map(([key, label]) => <div className={styles.metricRow} key={key}><span>{label}</span><strong>{number(payment.paymentStatuses[key] ?? 0)}</strong></div>)}
                </div>
                <div>
                  <h3>Phương thức</h3>
                  {payment && Object.entries(payment.paymentMethods).map(([key, value]) => <div className={styles.metricRow} key={key}><span>{key === 'cod' ? 'COD' : key === 'vnPay' ? 'VNPay' : key}</span><strong>{number(value)}</strong></div>)}
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
