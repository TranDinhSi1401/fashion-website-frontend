import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowDown, Minus, Package, Layers, Sparkles, RefreshCw, AlertTriangle, ShoppingBag, CalendarDays, ChevronRight, ImageOff } from 'lucide-react';
import AdminNav from '../components/admin/AdminNav';
import StockAlertsTable from '../components/admin/StockAlertsTable';
import { Button } from '../components/ui';
import { dashboardService, type ProductStatistics } from '../services/dashboardService';
import { extractErrorMessage } from '../utils/format';
import styles from './AdminDashboardPage.module.css';

const number = (value: number) => value.toLocaleString('vi-VN');
const ratio = (value: number, total: number) => total ? (value / total * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : '0';
const date = (value: string) => new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
const todayDate = () => {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
};
const daysBefore = (value: string, days: number) => {
  const result = new Date(value + 'T00:00:00Z'); result.setUTCDate(result.getUTCDate() - days);
  return result.toISOString().slice(0, 10);
};
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const productLink = (name: string) => `/admin/products?keyword=${encodeURIComponent(name)}`;

function Trend({ current, previous }: { current: number; previous: number }) {
  const delta = current - previous;
  const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const label = delta === 0 ? 'Không đổi' : `${delta > 0 ? '+' : '−'}${number(Math.abs(delta))}`;
  const percent = previous > 0 ? ` (${ratio(Math.abs(delta), previous)}%)` : delta > 0 ? ' · Mới phát sinh' : '';
  return <span className={`${styles.trend} ${delta > 0 ? styles.positive : delta < 0 ? styles.negative : styles.neutral}`} title={`Kỳ này: ${number(current)} · Kỳ trước: ${number(previous)}`}><Icon size={13} aria-hidden="true" />{label}{delta !== 0 && percent}</span>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<ProductStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [days, setDays] = useState(30);
  const [rangeMode, setRangeMode] = useState<'preset' | 'custom'>('preset');
  const [draftRange, setDraftRange] = useState(() => ({ from: daysBefore(todayDate(), 29), to: todayDate() }));
  const [appliedRange, setAppliedRange] = useState<{ from: string; to: string } | null>(null);
  const [rangeError, setRangeError] = useState('');
  const [topLimit, setTopLimit] = useState(5);
  const [draftTop, setDraftTop] = useState('5');
  const [topError, setTopError] = useState('');
  const today = todayDate();

  useEffect(() => {
    const controller = new AbortController();
    dashboardService.getProductStatistics(controller.signal, days, { topLimit, ...appliedRange }).then(result => {
      if (!controller.signal.aborted) {
        if (!result.insights) throw new Error('Backend cần cập nhật để tải thống kê so sánh.');
        setData(result);
      }
    }).catch(reason => {
      if (!controller.signal.aborted) setError(extractErrorMessage(reason, 'Không tải được thống kê sản phẩm. Vui lòng thử lại.'));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload, days, topLimit, appliedRange]);

  const refresh = () => { setLoading(true); setError(''); setReload(v => v + 1); };
  const changePeriod = (value: number) => {
    setRangeMode('preset'); setRangeError('');
    if (value !== days || appliedRange) { setLoading(true); setError(''); setDays(value); setAppliedRange(null); }
  };
  const applyRange = (event: FormEvent) => {
    event.preventDefault();
    if (!validDate(draftRange.from) || !validDate(draftRange.to)) { setRangeError('Chọn đủ từ ngày và đến ngày hợp lệ.'); return; }
    if (draftRange.from < '1001-01-01') { setRangeError('Ngày bắt đầu phải từ năm 1001.'); return; }
    if (draftRange.from > draftRange.to) { setRangeError('Từ ngày phải trước hoặc bằng đến ngày.'); return; }
    if (draftRange.to > today) { setRangeError('Không chọn ngày trong tương lai.'); return; }
    const count = (Date.parse(draftRange.to) - Date.parse(draftRange.from)) / 86400000 + 1;
    if (count > 365) { setRangeError('Khoảng ngày tối đa là 365 ngày.'); return; }
    setRangeError('');
    if (appliedRange?.from !== draftRange.from || appliedRange?.to !== draftRange.to) {
      setLoading(true); setError(''); setAppliedRange({ ...draftRange });
    }
  };
  const applyTop = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(draftTop);
    if (!/^\d+$/.test(draftTop) || !Number.isInteger(value) || value < 1 || value > 100) { setTopError('Nhập số nguyên từ 1 đến 100.'); return; }
    setTopError(''); setDraftTop(String(value));
    if (value !== topLimit) { setLoading(true); setError(''); setTopLimit(value); }
  };
  const insight = data?.insights;
  const largestCategory = Math.max(1, ...(data?.categories.map(c => c.productCount) ?? []));

  return <div className="container py-8 sm:py-10">
    <AdminNav title="Dashboard" subtitle="Nhìn rõ nhịp bán hàng, sức khỏe danh mục và việc cần ưu tiên."
      actions={<Button variant="outline" size="sm" icon={RefreshCw} disabled={loading} onClick={refresh}>Làm mới</Button>} />
    <section aria-labelledby="product-statistics-heading" aria-busy={loading} className={styles.dashboard}>
      <div className={styles.heading}>
        <div><p className={styles.eyebrow}>HIỂU DANH MỤC CỦA BẠN</p><h2 id="product-statistics-heading">Thống kê sản phẩm</h2></div>
        <div className={styles.periods} role="group" aria-label="Kỳ thống kê">{[7, 30, 90].map(value => <button key={value} type="button" aria-pressed={rangeMode === 'preset' && days === value} onClick={() => changePeriod(value)}>{value} ngày</button>)}<button type="button" aria-pressed={rangeMode === 'custom'} aria-expanded={rangeMode === 'custom'} aria-controls="custom-statistics-range" onClick={() => { setRangeMode('custom'); setRangeError(''); }}><CalendarDays size={14} />Tùy chọn</button></div>
      </div>
      {rangeMode === 'custom' && <form id="custom-statistics-range" className={styles.rangeForm} onSubmit={applyRange} noValidate>
        <label>Từ ngày<input type="date" aria-label="Thống kê từ ngày" value={draftRange.from} min="1001-01-01" max={draftRange.to && draftRange.to < today ? draftRange.to : today} required onChange={e => { setDraftRange(old => ({ ...old, from: e.target.value })); setRangeError(''); }} /></label>
        <span className={styles.dateSeparator}>→</span>
        <label>Đến ngày<input type="date" aria-label="Thống kê đến ngày" value={draftRange.to} min={draftRange.from || '1001-01-01'} max={today} required onChange={e => { setDraftRange(old => ({ ...old, to: e.target.value })); setRangeError(''); }} /></label>
        <button type="submit" disabled={loading}>Áp dụng</button><small>Tối đa 365 ngày</small>
        {rangeError && <p role="alert" className={styles.filterError}>{rangeError}</p>}
      </form>}
      {loading && <p role="status" className={styles.message}>Đang tổng hợp số liệu...</p>}
      {error && <div role="alert" className={styles.error}>{error} <button onClick={refresh}>Thử lại</button></div>}
      {!loading && !error && data && insight && <>
        <div className={styles.periodNote}><span><strong>{date(insight.fromDate || insight.periodStart)} – {date(insight.toDate || insight.periodEnd)}</strong> so với {date(insight.previousPeriodStart)} – {date(new Date(new Date(insight.periodStart).getTime() - 1).toISOString())} · cùng độ dài</span><span>Cập nhật {new Date(data.generatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span></div>
        <div className={styles.cards}>
          <article className={styles.card}><div className={styles.cardLabel}><span>Danh mục hiện tại</span><Package size={18} /></div><strong>{number(data.totalProducts)}</strong><p>{number(data.activeProducts)} đang bật · {number(data.inactiveProducts)} đang ẩn</p><div className={styles.cardFooter}><span>{ratio(data.activeProducts, data.totalProducts)}% sản phẩm đang bật</span></div></article>
          <article className={styles.card}><div className={styles.cardLabel}><span>Sản phẩm tạo mới</span><Sparkles size={18} /></div><strong>{number(insight.newProducts)}</strong><p>{insight.customRange ? 'Trong khoảng ngày đã chọn' : `Trong ${insight.periodDays} ngày đã chọn`}</p><div className={styles.cardFooter}><Trend current={insight.newProducts} previous={insight.previousNewProducts} /><small>Kỳ trước: {number(insight.previousNewProducts)}</small></div></article>
          <article className={styles.card}><div className={styles.cardLabel}><span>Số lượng đã giao</span><ShoppingBag size={18} /></div><strong>{number(insight.deliveredUnits)}</strong><p>Đơn vị sản phẩm giao thành công</p><div className={styles.cardFooter}><Trend current={insight.deliveredUnits} previous={insight.previousDeliveredUnits} /><small>Kỳ trước: {number(insight.previousDeliveredUnits)}</small></div></article>
          <article className={styles.card}><div className={styles.cardLabel}><span>Tồn kho hiện tại</span><Layers size={18} /></div><strong>{number(data.totalStock)}</strong><p>Đơn vị ở các biến thể đang bật</p><div className={styles.cardFooter}><span>{number(insight.hiddenStock)} đơn vị ở sản phẩm đang ẩn</span></div></article>
        </div>

        <nav className={styles.quickChecks} aria-label="Việc cần kiểm tra">
          <Link to="/admin/products?isActive=true&inStock=false"><span className={styles.checkIcon}><Package size={18} /></span><span><small>Sản phẩm hết hàng</small><strong className={data.outOfStockProducts ? styles.negative : ''}>{number(data.outOfStockProducts)}</strong></span><ChevronRight size={15} /></Link>
          <a href="#stock-alerts"><span className={styles.checkIcon}><AlertTriangle size={18} /></span><span><small>Biến thể tồn thấp</small><strong className={data.lowStockVariants ? styles.negative : ''}>{number(data.lowStockVariants)} <em>≤ {data.lowStockThreshold} đơn vị</em></strong></span><ChevronRight size={15} /></a>
          <Link to="/admin/products?isActive=false"><span className={styles.checkIcon}><Layers size={18} /></span><span><small>Tồn kho đang ẩn</small><strong>{number(insight.hiddenStock)} <em>đơn vị</em></strong></span><ChevronRight size={15} /></Link>
          <Link to="/admin/products?isActive=true" title={`${number(insight.productsMissingImages)} sản phẩm thiếu ảnh; ${number(insight.productsWithoutVariants)} sản phẩm thiếu biến thể đang bán`}><span className={styles.checkIcon}><ImageOff size={18} /></span><span><small>Thiếu ảnh / biến thể</small><strong>{number(insight.productsMissingImages)} / {number(insight.productsWithoutVariants)}</strong></span><ChevronRight size={15} /></Link>
        </nav>

        <div className={styles.grid}>
          <section className={styles.panel} aria-labelledby="best-sellers-heading">
            <div className={styles.panelHeading}><div><h3 id="best-sellers-heading">Sản phẩm dẫn đầu trong kỳ</h3><p>Xếp theo số lượng giao thành công.</p></div><form className={styles.topForm} onSubmit={applyTop} noValidate><label>Top<input type="number" aria-label="Số sản phẩm dẫn đầu" min="1" max="100" step="1" required value={draftTop} onChange={e => { setDraftTop(e.target.value); setTopError(''); }} aria-invalid={Boolean(topError)} aria-describedby="top-limit-help" /></label><button type="submit">Xem</button><small id="top-limit-help">1–100</small>{topError && <p role="alert" className={styles.filterError}>{topError}</p>}</form></div>
            {insight.bestSellers.length === 0 ? <div className={styles.message}><ShoppingBag size={25} /><p>Chưa có sản phẩm giao thành công trong kỳ này.</p><small>Thử chọn khoảng thời gian dài hơn để xem thêm dữ liệu.</small></div> : <div className={styles.bestSellers}>{insight.bestSellers.map((product, index) => <article key={product.productId} className={styles.bestSeller}><span className={styles.rank}>{String(index + 1).padStart(2, '0')}</span><div className={styles.bestSellerInfo}><Link to={productLink(product.productName)}>{product.productName}</Link><span>Kỳ trước: {number(product.previousUnits)} đơn vị</span><div className={styles.track}><div style={{ width: `${product.units / insight.bestSellers[0].units * 100}%` }} /></div></div><div className={styles.bestSellerValue}><strong>{number(product.units)} <small>đv</small></strong><Trend current={product.units} previous={product.previousUnits} /></div></article>)}</div>}
            {insight.bestSellers.length > 0 && <p className={styles.resultCount}>{insight.bestSellers.length} / {insight.topLimit} sản phẩm yêu cầu</p>}
            <p className={styles.footnote}>Theo ngày giao thực tế; không tính đơn hủy hoặc đã chuyển sang trạng thái trả hàng. Số lượng chưa trừ trả từng phần.</p>
          </section>
          <section className={styles.panel} aria-labelledby="category-heading">
            <div className={styles.panelHeading}><div><h3 id="category-heading">Cơ cấu danh mục hiện tại</h3><p>Gồm sản phẩm đang bật và đang ẩn.</p></div><span className={styles.tag}>{number(data.categories.length)} nhóm</span></div>
            {data.categories.length === 0 ? <p className={styles.message}>Chưa có sản phẩm để thống kê.</p> : <>
              <p className={styles.categoryInsight}><strong>{data.categories[0].categoryName}</strong> đang chiếm tỷ trọng lớn nhất: {ratio(data.categories[0].productCount, data.totalProducts)}% danh mục.</p>
              <div className={styles.categories}>{data.categories.map(category => <div key={category.categoryId ?? 'uncategorized'}><div className={styles.categoryLabel}><span>{category.categoryName}</span><strong>{number(category.productCount)} <small>· {ratio(category.productCount, data.totalProducts)}%</small></strong></div><div className={styles.track}><div style={{ width: `${category.productCount / largestCategory * 100}%` }} /></div></div>)}</div>
            </>}
          </section>
        </div>

        <StockAlertsTable threshold={data.lowStockThreshold} />
        <details className={styles.methodology}><summary>Cách đọc các chỉ số</summary><p>Mũi tên và màu xanh/đỏ chỉ mức tăng/giảm của số sản phẩm tạo mới hoặc số lượng đã giao so với kỳ có cùng độ dài ngay trước đó. Kỳ trước bằng 0 được ghi “Mới phát sinh”, không tính phần trăm tăng trưởng.</p><p>Danh mục, ảnh và tồn kho là ảnh chụp hiện tại, không thay đổi theo kỳ. Không tính sản phẩm đã xóa hoặc biến thể đã tắt trong tồn kho; số lượng đã giao vẫn giữ lịch sử sản phẩm đã xóa. Sản phẩm tạo mới chỉ tính các sản phẩm còn trong danh mục. Biến thể sắp hết chỉ xét sản phẩm đang bật.</p><p>Hai kỳ so sánh có cùng độ dài thực tế: {new Date(insight.previousPeriodStart).toLocaleString('vi-VN')} → {new Date(insight.periodStart).toLocaleString('vi-VN')} → {new Date(insight.periodEnd).toLocaleString('vi-VN')}. Khoảng tự chọn tính cả ngày kết thúc; nếu chọn hôm nay chỉ tính đến lúc cập nhật và kỳ trước có cùng độ dài đã trôi qua. Chưa có lịch sử tồn kho để tính tăng/giảm hoặc dự báo ngày hết hàng.</p></details>
      </>}
    </section>
  </div>;
}
