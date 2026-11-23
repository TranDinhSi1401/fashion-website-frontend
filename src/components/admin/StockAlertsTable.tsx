import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, EyeOff, ArrowUpRight } from 'lucide-react';
import { dashboardService, type StockAlertPage, type StockAlert } from '../../services/dashboardService';
import { extractErrorMessage } from '../../utils/format';
import styles from '../../pages/AdminDashboardPage.module.css';
import { Select } from '../ui';

const number = (value: number) => value.toLocaleString('vi-VN');
const editLink = (item: StockAlert, focus: 'stock' | 'status') =>
  `/admin/products?edit=${item.productId}&variant=${item.variantId}&focus=${focus}`;

export default function StockAlertsTable({ threshold }: { threshold: number }) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [result, setResult] = useState<StockAlertPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    dashboardService.getStockAlerts(page, pageSize, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      if (page > 0 && page >= data.totalPages) setPage(Math.max(0, data.totalPages - 1));
      else setResult(data);
    }).catch(reason => {
      if (!controller.signal.aborted) setError(extractErrorMessage(reason, 'Không tải được cảnh báo tồn kho.'));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, pageSize, reload]);

  const changePage = (next: number) => { if (next !== page) { setLoading(true); setError(''); setPage(next); } };
  const busy = loading || (!error && (result?.number !== page || result?.size !== pageSize));
  const total = result?.totalElements ?? 0;
  const totalPages = Math.max(1, result?.totalPages ?? 0);
  const first = total ? page * pageSize + 1 : 0;
  const last = Math.min((page + 1) * pageSize, total);

  return <section id="stock-alerts" className={styles.panel} aria-labelledby="alerts-heading" aria-busy={busy}>
    <div className={styles.panelHeading}><div><h3 id="alerts-heading">Cần bổ sung hàng ở đâu?</h3><p>Tất cả biến thể còn ≤ {threshold} đơn vị · Ưu tiên hết hàng</p></div><span className={styles.tag}>{result ? `${number(total)} biến thể` : 'Đang tải'}</span></div>
    {error ? <div role="alert" className={styles.error}>{error} <button type="button" onClick={() => { setLoading(true); setError(''); setReload(v => v + 1); }}>Thử lại</button></div> : <>
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Sản phẩm / SKU</th><th>Màu / Size</th><th>Tồn kho</th><th>Thao tác</th></tr></thead><tbody>
        {busy ? <tr><td colSpan={4} className={styles.message} role="status">Đang tải danh sách…</td></tr> : !result?.content.length ? <tr><td colSpan={4} className={styles.message}>Không có biến thể ở mức cảnh báo.</td></tr> : result.content.map(item => <tr key={item.variantId} data-alert-variant={item.variantId}>
          <td><Link to={editLink(item, 'stock')}>{item.productName}</Link><small>{item.sku || `#${item.productId}`}</small></td>
          <td>{item.color} / {item.size}</td>
          <td><span className={item.stockQuantity <= 0 ? styles.emptyBadge : styles.lowBadge}>{number(item.stockQuantity)} · {item.stockQuantity <= 0 ? 'Hết hàng' : 'Sắp hết'}</span></td>
          <td><div className={styles.alertActions}>
            <Link className={styles.restockLink} to={editLink(item, 'stock')} aria-label={`Bổ sung hàng ${item.sku || item.productName + ' ' + item.color + ' ' + item.size}`}><Plus size={13} />Bổ sung hàng<ArrowUpRight size={12} /></Link>
            {item.stockQuantity <= 0 && <Link className={styles.hideLink} to={editLink(item, 'status')} aria-label={`Tạm ẩn ${item.sku || item.productName + ' ' + item.color + ' ' + item.size}`}><EyeOff size={13} />Tạm ẩn</Link>}
          </div></td>
        </tr>)}
      </tbody></table></div>
      <div className={styles.alertPagination}>
        <span>{number(first)}–{number(last)} / <strong>{number(total)}</strong> biến thể</span>
        <div className={styles.alertPageControls}>
          <Select className={styles.alertPageSize} label="Mỗi trang" aria-label="Số biến thể mỗi trang" value={pageSize} disabled={busy} onChange={e => { setLoading(true); setError(''); setPageSize(Number(e.target.value)); setPage(0); }} options={[10, 20, 50].map(size => ({ value: size, label: String(size) }))} />
          <div><button type="button" aria-label="Trang cảnh báo trước" disabled={busy || page === 0} onClick={() => changePage(page - 1)}><ChevronLeft size={16} /></button><span>Trang {page + 1} / {totalPages}</span><button type="button" aria-label="Trang cảnh báo sau" disabled={busy || page + 1 >= totalPages} onClick={() => changePage(page + 1)}><ChevronRight size={16} /></button></div>
        </div>
      </div>
    </>}
  </section>;
}
