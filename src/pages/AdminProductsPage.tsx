import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Edit2, Trash2, Eye, RefreshCw } from 'lucide-react';
import AdminNav from '../components/admin/AdminNav';
import ProductAttributeSelect from '../components/admin/ProductAttributeSelect';
import { DEFAULT_COLORS, DEFAULT_SIZES, newVariant, normalizeVariantSize, variantKey, uniqueChoices, generateVariantGrid, appendVariants, parseVariantTable } from '../utils/productEditor';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { CategoryResponse } from '../types/category';
import { useAuth } from '../context/AuthContext';
import { ProductResponse, ProductFilters, ProductPage, ProductVariantInput, ProductImageInput } from '../types/product';
import { Badge, Button, Checkbox, Input, Modal, Select } from '../components/ui';
import MoneyInput from '../components/ui/MoneyInput';
import ProductPrice from '../components/product/ProductPrice';
import { extractErrorMessage } from '../utils/format';
import styles from './AdminPages.module.css';
import editorStyles from './ProductEditor.module.css';

const emptyForm = { name: '', slug: '', description: '', basePrice: '', categoryId: 0, isActive: true };
const emptyFilters = { keyword: '', categoryId: '', minPrice: '', maxPrice: '', color: '', size: '', isActive: '', inStock: '', sort: 'newest' };

export default function AdminProductsPage() {
  const { isAdmin, isStaff } = useAuth();
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [result, setResult] = useState<ProductPage | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState(emptyFilters);
  const [filterReset, setFilterReset] = useState(0);
  const [applied, setApplied] = useState<ProductFilters>({});
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState({ error: false, text: '' });
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<ProductResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [variants, setVariants] = useState<ProductVariantInput[]>([newVariant()]);
  const [images, setImages] = useState<ProductImageInput[]>([{ imageUrl: '' }]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [detail, setDetail] = useState<ProductResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [options, setOptions] = useState({ colors: DEFAULT_COLORS, sizes: DEFAULT_SIZES });
  const [quickColors, setQuickColors] = useState<string[]>([]);
  const [quickSizes, setQuickSizes] = useState<string[]>([]);
  const [quickPrice, setQuickPrice] = useState('');
  const [quickStock, setQuickStock] = useState('0');
  const [pasteText, setPasteText] = useState('');
  const [quickNotice, setQuickNotice] = useState('');
  const colorOptions = uniqueChoices([...options.colors, ...variants.map(v => v.color)]);
  const sizeOptions = uniqueChoices([...options.sizes, ...variants.map(v => v.size)], true);

  useEffect(() => {
    let active = true;
    categoryService.getCategories().then(r => { if (active) setCategories(r.data); })
      .catch(e => { if (active) setNotice({ error: true, text: extractErrorMessage(e, 'Không tải được danh mục') }); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    productService.getOptions().then(r => {
      if (active) setOptions({
        colors: [...new Set([...DEFAULT_COLORS, ...r.data.colors.filter(Boolean)])],
        sizes: [...new Set([...DEFAULT_SIZES, ...r.data.sizes.filter(Boolean).map(normalizeVariantSize)])],
      });
    }).catch(() => { /* Keep the default palette available if metadata cannot be loaded. */ });
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    productService.getProductsPage({ ...applied, page, pageSize }, controller.signal)
      .then(r => {
        if (controller.signal.aborted) return;
        if (r.data.totalPages > 0 && page >= r.data.totalPages) setPage(r.data.totalPages - 1);
        else setResult(r.data);
      })
      .catch(e => { if (!controller.signal.aborted) { setResult(null); setNotice({ error: true, text: extractErrorMessage(e, 'Không tải được sản phẩm') }); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [applied, page, pageSize, reload]);

  useEffect(() => {
    if (!detailOpen || detailId === null) return;
    const controller = new AbortController();
    setDetail(null); setDetailBusy(true); setDetailError('');
    productService.getProductById(detailId, controller.signal)
      .then(r => { if (!controller.signal.aborted) setDetail(r.data); })
      .catch(e => { if (!controller.signal.aborted) setDetailError(extractErrorMessage(e, 'Không tải được chi tiết')); })
      .finally(() => { if (!controller.signal.aborted) setDetailBusy(false); });
    return () => controller.abort();
  }, [detailId, detailOpen]);

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    if (filters.minPrice && filters.maxPrice && Number(filters.minPrice) > Number(filters.maxPrice)) {
      setNotice({ error: true, text: 'Giá từ phải nhỏ hơn hoặc bằng giá đến' }); return;
    }
    setPage(0); setNotice({ error: false, text: '' });
    setApplied({ keyword: filters.keyword.trim() || undefined, categoryId: filters.categoryId || undefined,
      minPrice: filters.minPrice === '' ? undefined : Number(filters.minPrice),
      maxPrice: filters.maxPrice === '' ? undefined : Number(filters.maxPrice),
      color: filters.color.trim() || undefined, size: filters.size.trim() || undefined, sort: filters.sort,
      isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
      inStock: filters.inStock === '' ? undefined : filters.inStock === 'true' });
  }

  async function openForm(product?: ProductResponse) {
    setEditing(product || null); setFormError(''); setQuickNotice(''); setPasteText('');
    setQuickColors([]); setQuickSizes([]); setQuickPrice(''); setQuickStock('0');
    setModal(true); setFormLoading(Boolean(product));
    setForm({ ...emptyForm, categoryId: categories.find(c => c.isActive)?.id || 0 });
    setVariants([newVariant()]); setImages([{ imageUrl: '' }]);
    if (!product) return;
    try {
      const { data: fresh } = await productService.getProductById(product.id);
      setEditing(fresh);
      setForm({ name: fresh.name, slug: fresh.slug || '', description: fresh.description || '', basePrice: String(fresh.basePrice), categoryId: fresh.categoryId, isActive: fresh.isActive !== false });
      const rows = fresh.variants?.map(v => ({ ...newVariant(v.price), ...v, packageWeight: v.packageWeight || 200, packageLength: v.packageLength || 20, packageWidth: v.packageWidth || 15, packageHeight: v.packageHeight || 3 })) || [];
      setVariants(rows.length ? rows : [newVariant(fresh.basePrice)]);
      const pictures = fresh.productImages?.map(img => ({ id: img.id, imageUrl: img.imageUrl,
        variantIndex: img.variantId ? rows.findIndex(v => v.id === img.variantId) : undefined }))
        .map(img => ({ ...img, variantIndex: img.variantIndex === -1 ? undefined : img.variantIndex })) || [];
      setImages(pictures.length ? pictures : [{ imageUrl: '' }]);
    } catch (e) {
      setModal(false); setNotice({ error: true, text: extractErrorMessage(e, 'Không tải được thông tin để sửa sản phẩm') });
    } finally { setFormLoading(false); }
  }

  function addQuickVariants(next: ProductVariantInput[]) {
    // Remap image indices by object identity when an empty placeholder row is removed.
    setImages(old => old.map(img => {
      const original = img.variantIndex === undefined ? undefined : variants[img.variantIndex];
      const index = original ? next.indexOf(original) : -1;
      return { ...img, variantIndex: index < 0 ? undefined : index };
    }));
    const previousCount = variants.filter(v => v.id || v.color || v.size).length;
    setVariants(next); setFormError('');
    setQuickNotice(`Đã thêm ${next.length - previousCount} biến thể; các màu/size đã tồn tại được giữ nguyên.`);
  }

  function generateQuick() {
    try { addQuickVariants(generateVariantGrid(variants, quickColors, quickSizes, Number(quickPrice || form.basePrice), Number(quickStock))); }
    catch (e) { setFormError(e instanceof Error ? e.message : 'Không tạo được biến thể'); }
  }

  function pasteVariants() {
    try { addQuickVariants(appendVariants(variants, parseVariantTable(pasteText))); setPasteText(''); }
    catch (e) { setFormError(e instanceof Error ? e.message : 'Dữ liệu dán không hợp lệ'); }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (formLoading || saving || uploading) return;
    setFormError('');
    const usedImages = images.filter(i => i.imageUrl.trim()).map(i => ({ ...i, imageUrl: i.imageUrl.trim() }));
    if (!form.categoryId || Number(form.basePrice) <= 0) { setFormError('Chọn danh mục và nhập giá lớn hơn 0'); return; }
    if (!variants.length || !usedImages.length) { setFormError('Cần ít nhất một biến thể và một ảnh'); return; }
    const keys = variants.map(variantKey);
    if (new Set(keys).size !== keys.length) { setFormError('Biến thể màu/size bị trùng'); return; }
    setSaving(true);
    try {
      const variantInputs = variants.map(v => ({ id: v.id, color: v.color.trim(), size: normalizeVariantSize(v.size), price: v.price,
        stockQuantity: v.stockQuantity, isActive: v.isActive !== false, packageWeight: v.packageWeight,
        packageLength: v.packageLength, packageWidth: v.packageWidth, packageHeight: v.packageHeight }));
      const payload = { ...form, name: form.name.trim(), basePrice: Number(form.basePrice),
        slug: form.slug.trim() || form.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') };
      if (editing) await productService.updateProduct(editing.id, { ...payload, variants: variantInputs, images: usedImages });
      else await productService.createProduct({ ...payload, variants: variantInputs, images: usedImages });
      setModal(false); setNotice({ error: false, text: editing ? 'Đã cập nhật sản phẩm' : 'Đã tạo sản phẩm cùng ảnh và biến thể' });
      setReload(r => r + 1);
    } catch (e) { setFormError(extractErrorMessage(e, 'Không lưu được sản phẩm')); }
    finally { setSaving(false); }
  }

  async function upload(file: File | undefined, index: number) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setFormError('Chọn ảnh JPEG/PNG/WebP không quá 5MB'); return;
    }
    setUploading(true); setFormError('');
    try { const imageUrl = await productService.uploadImage(file); setImages(old => old.map((img, i) => i === index ? { ...img, imageUrl } : img)); }
    catch (e) { setFormError(extractErrorMessage(e, 'Upload ảnh thất bại')); }
    finally { setUploading(false); }
  }

  async function remove(product: ProductResponse) {
    if (!isAdmin || !window.confirm(`Xóa sản phẩm "${product.name}"?`)) return;
    try { await productService.deleteProduct(product.id); setReload(r => r + 1); setNotice({ error: false, text: 'Đã xóa sản phẩm' }); }
    catch (e) { setNotice({ error: true, text: extractErrorMessage(e, 'Không xóa được sản phẩm') }); }
  }

  return <div className="container py-8">
    <AdminNav title="Quản lý sản phẩm" subtitle={`${result?.totalElements ?? 0} sản phẩm phù hợp`}
      actions={<><Button icon={RefreshCw} variant="secondary" onClick={() => setReload(r => r + 1)}>Làm mới</Button>
        {(isAdmin || isStaff) && <Button icon={Plus} onClick={() => openForm()} disabled={!categories.some(c => c.isActive)}>Thêm sản phẩm</Button>}</>} />
    <form onSubmit={applyFilters} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      <Input label="Tên hoặc slug" value={filters.keyword} onChange={e => setFilters({ ...filters, keyword: e.target.value })} />
      <Select label="Danh mục" value={filters.categoryId} onChange={e => setFilters({ ...filters, categoryId: e.target.value })}
        options={[{ value: '', label: 'Tất cả' }, ...categories.map(c => ({ value: c.id, label: c.name }))]} />
      <Select label="Trạng thái" value={filters.isActive} onChange={e => setFilters({ ...filters, isActive: e.target.value })}
        options={[{ value: '', label: 'Tất cả' }, { value: 'true', label: 'Hoạt động' }, { value: 'false', label: 'Đang ẩn' }]} />
      <MoneyInput key={`min-${filterReset}`} id="admin-min-price" label="Giá gốc từ" value={filters.minPrice} onValueChange={minPrice => setFilters({ ...filters, minPrice })} />
      <MoneyInput key={`max-${filterReset}`} id="admin-max-price" label="Giá gốc đến" value={filters.maxPrice} onValueChange={maxPrice => setFilters({ ...filters, maxPrice })} />
      <Select label="Màu" value={filters.color} onChange={e => setFilters({ ...filters, color: e.target.value })} options={[{ value: '', label: 'Tất cả màu' }, ...colorOptions.map(value => ({ value, label: value }))]} />
      <Select label="Size" value={filters.size} onChange={e => setFilters({ ...filters, size: e.target.value })} options={[{ value: '', label: 'Tất cả size' }, ...sizeOptions.map(value => ({ value, label: value }))]} />
      <Select label="Tồn kho" value={filters.inStock} onChange={e => setFilters({ ...filters, inStock: e.target.value })}
        options={[{ value: '', label: 'Tất cả' }, { value: 'true', label: 'Còn hàng' }, { value: 'false', label: 'Hết hàng' }]} />
      <Select label="Sắp xếp" value={filters.sort} onChange={e => setFilters({ ...filters, sort: e.target.value })}
        options={[{ value: 'newest', label: 'Mới nhất' }, { value: 'name', label: 'Tên' }, { value: 'price-asc', label: 'Giá tăng' }, { value: 'price-desc', label: 'Giá giảm' }]} />
      <Button type="submit">Áp dụng bộ lọc</Button>
      <Button variant="secondary" onClick={() => { setFilters(emptyFilters); setFilterReset(n => n + 1); setApplied({}); setPage(0); }}>Xóa bộ lọc</Button>
    </form>
    {notice.text && <p role="status" className={notice.error ? styles.alertError : styles.alertSuccess}>{notice.text}</p>}
    <div className="overflow-x-auto border border-line-light">
      <table className="w-full text-left text-sm"><thead><tr>
        {['ID', 'Tên sản phẩm', 'Danh mục', 'Giá', 'Trạng thái', 'Thao tác'].map(h => <th className="p-3" key={h}>{h}</th>)}
      </tr></thead><tbody>
        {loading ? <tr><td colSpan={6} className="p-6">Đang tải...</td></tr> : !result?.content.length ? <tr><td colSpan={6} className="p-6">Không có sản phẩm phù hợp.</td></tr>
          : result.content.map(p => <tr key={p.id} className={styles.tableRow}>
            <td className="p-3">#{p.id}</td><td className="p-3"><button type="button" className="underline text-left" onClick={() => { setDetailId(p.id); setDetailOpen(true); }}>{p.name}</button></td>
            <td className="p-3">{categories.find(c => c.id === p.categoryId)?.name || `#${p.categoryId}`}</td>
            <td className="p-3"><ProductPrice price={p.basePrice} offer={p.bestOffer} /></td>
            <td className="p-3"><Badge variant={p.isActive ? 'success' : 'error'}>{p.isActive ? 'Hoạt động' : 'Đang ẩn'}</Badge></td>
            <td className="p-3"><div className="flex gap-2">
              <Button size="sm" variant="secondary" icon={Eye} onClick={() => { setDetailId(p.id); setDetailOpen(true); }}>Chi tiết</Button>
              <Button size="sm" variant="secondary" icon={Edit2} onClick={() => openForm(p)}>Sửa</Button>
              {isAdmin && <Button size="sm" variant="danger" icon={Trash2} onClick={() => remove(p)}>Xóa</Button>}
            </div></td>
          </tr>)}
      </tbody></table>
    </div>
    <div className="flex flex-wrap items-center gap-3 mt-4">
      <Button variant="secondary" disabled={loading || page === 0} onClick={() => setPage(p => p - 1)}>Trước</Button>
      <span>Trang {page + 1}/{Math.max(1, result?.totalPages ?? 0)}</span>
      <Button variant="secondary" disabled={loading || page + 1 >= (result?.totalPages ?? 0)} onClick={() => setPage(p => p + 1)}>Sau</Button>
      <Select label="Số sản phẩm/trang" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }} options={[10, 20, 50].map(n => ({ value: n, label: String(n) }))} />
    </div>

    <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Chi tiết sản phẩm" maxWidth="900px">
      {detailBusy ? <p>Đang tải chi tiết...</p> : detailError ? <p role="alert">{detailError}</p> : detail && <div className="space-y-4">
        <h2 className="text-xl font-bold">{detail.name} · #{detail.id}</h2>
        <p>{categories.find(c => c.id === detail.categoryId)?.name} · {detail.isActive ? 'Hoạt động' : 'Đang ẩn'} · {detail.slug}</p>
        <ProductPrice price={detail.basePrice} offer={detail.bestOffer} />
        <p className="whitespace-pre-line">{detail.description || 'Chưa có mô tả'}</p>
        <div className="flex gap-3 flex-wrap">{detail.productImages?.map(img => <figure key={img.id}><img src={img.imageUrl} alt={detail.name} className="w-28 h-28 object-cover" /><figcaption>{img.isMain ? 'Ảnh chính' : 'Ảnh phụ'}{img.variantId ? ` · Biến thể #${img.variantId}` : ''}</figcaption></figure>)}</div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['SKU', 'Màu', 'Size', 'Giá', 'Tồn kho', 'Trạng thái'].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead>
          <tbody>{detail.variants?.map(v => <tr key={v.id}><td className="p-2">{v.sku || v.id}</td><td className="p-2">{v.color}</td><td className="p-2">{v.size}</td><td className="p-2"><ProductPrice price={v.price} offer={v.bestOffer} /></td><td className="p-2">{v.stockQuantity}</td><td className="p-2">{v.isActive ? 'Hoạt động' : 'Đang ẩn'}</td></tr>)}</tbody></table></div>
      </div>}
    </Modal>

    <Modal isOpen={modal} onClose={() => { if (!saving && !uploading && !formLoading) setModal(false); }} title={editing ? 'Sửa thông tin sản phẩm' : 'Thêm sản phẩm mới'} maxWidth="950px" className={editorStyles.dialog}>
      {formLoading && <p role="status">Đang tải đầy đủ thông tin sản phẩm…</p>}
      <form onSubmit={submit} className={`${editorStyles.form} space-y-4`}><fieldset disabled={saving || uploading || formLoading} className="space-y-4">
        {formError && <p role="alert" className={styles.alertError}>{formError}</p>}
        <Input label="Tên sản phẩm" required maxLength={200} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <Input label="Slug (để trống để tạo từ tên)" maxLength={200} value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
        <Input label="Giá gốc (đ)" type="number" min="1" step="0.01" required value={form.basePrice} onChange={e => setForm({ ...form, basePrice: e.target.value })} />
        <Select label="Danh mục" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: Number(e.target.value) })}
          options={[{ value: 0, label: 'Chọn danh mục' }, ...categories.filter(c => c.isActive || c.id === form.categoryId).map(c => ({ value: c.id, label: c.name }))]} />
        <Input label="Mô tả" multiline rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <Checkbox label="Hiển thị trên cửa hàng" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
        <>
          <h3 className="font-bold">Biến thể sản phẩm</h3>
          <details className={`${editorStyles.quick} border border-line-light bg-surface p-4`}>
            <summary className="cursor-pointer font-semibold">Nhập nhanh biến thể</summary>
            <div className="mt-4 space-y-4">
              <fieldset><legend className="mb-2 text-sm font-semibold">Chọn nhiều màu</legend><div className="flex max-h-36 flex-wrap gap-3 overflow-y-auto">{colorOptions.map(color => <Checkbox key={color} label={color} checked={quickColors.includes(color)} onChange={e => setQuickColors(old => e.target.checked ? [...old, color] : old.filter(v => v !== color))} />)}</div></fieldset>
              <fieldset><legend className="mb-2 text-sm font-semibold">Chọn nhiều size</legend><div className="flex max-h-36 flex-wrap gap-3 overflow-y-auto">{sizeOptions.map(size => <Checkbox key={size} label={size} checked={quickSizes.includes(size)} onChange={e => setQuickSizes(old => e.target.checked ? [...old, size] : old.filter(v => v !== size))} />)}</div></fieldset>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Input label="Giá chung (bỏ trống dùng giá gốc)" type="number" min="0.01" step="0.01" value={quickPrice} onChange={e => setQuickPrice(e.target.value)} /><Input label="Tồn kho chung" type="number" min="0" step="1" value={quickStock} onChange={e => setQuickStock(e.target.value)} /></div>
              <div className="flex flex-wrap gap-3"><Button variant="secondary" onClick={generateQuick}>Tạo {quickColors.length * quickSizes.length} tổ hợp màu × size</Button>
                <Button variant="secondary" onClick={() => {
                  const price = Number(quickPrice || form.basePrice), stock = Number(quickStock);
                  if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) { setFormError('Giá và tồn kho chung không hợp lệ'); return; }
                  setVariants(old => old.map(v => ({ ...v, price, stockQuantity: stock }))); setQuickNotice('Đã áp dụng giá và tồn kho cho tất cả biến thể.'); setFormError('');
                }}>Áp dụng giá/tồn kho cho tất cả</Button></div>
              <Input label="Hoặc dán 4 cột từ Excel: Màu, Size, Giá, Tồn kho" multiline rows={4} value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder={'Đen\tM\t200000\t10\nTrắng\tL\t220000\t5'} />
              <p className="text-xs text-content-secondary">Dùng Tab hoặc dấu chấm phẩy giữa các cột. Giá không có dấu phân cách hàng nghìn. Tối đa 100 biến thể; dòng trùng không ghi đè dữ liệu cũ.</p>
              <Button variant="secondary" onClick={pasteVariants}>Thêm các dòng đã dán</Button>
              {quickNotice && <p role="status" className="text-sm">{quickNotice}</p>}
            </div>
          </details>
          {variants.map((v, i) => <fieldset key={v.id ? `saved-${v.id}` : v.clientId || i} className="border border-line-light p-3 space-y-3"><legend>Biến thể {i + 1}</legend>
            <div className="grid grid-cols-2 gap-3">
              <ProductAttributeSelect label="Màu" value={v.color} options={colorOptions} onChange={color => setVariants(old => old.map((x, n) => n === i ? { ...x, color } : x))} />
              <ProductAttributeSelect label="Size" value={v.size} options={sizeOptions} maxLength={20} onChange={size => setVariants(old => old.map((x, n) => n === i ? { ...x, size } : x))} />
              <Input label="Giá biến thể (đ)" type="number" required min="1" step="0.01" value={v.price} onChange={e => setVariants(old => old.map((x, n) => n === i ? { ...x, price: Number(e.target.value) } : x))} />
              <Input label="Tồn kho" type="number" required min="0" step="1" value={v.stockQuantity} onChange={e => setVariants(old => old.map((x, n) => n === i ? { ...x, stockQuantity: Number(e.target.value) } : x))} />
              <details className="col-span-2">
                <summary className="cursor-pointer text-sm text-content-secondary">Thông số kiện hàng (GHN)</summary>
                <div className="mt-3 grid grid-cols-2 gap-3">
              {(['packageWeight', 'packageLength', 'packageWidth', 'packageHeight'] as const).map((field, n) => <Input key={field} label={['Khối lượng (g)', 'Dài (cm)', 'Rộng (cm)', 'Cao (cm)'][n]} type="number" required min="1" step="1" value={v[field]} onChange={e => setVariants(old => old.map((x, k) => k === i ? { ...x, [field]: Number(e.target.value) } : x))} />)}
                </div>
              </details>
            </div>
            <Checkbox label="Biến thể đang bán" checked={v.isActive !== false} onChange={e => setVariants(old => old.map((x, n) => n === i ? { ...x, isActive: e.target.checked } : x))} />
            {v.id && <p className="text-xs text-content-secondary">SKU hiện có: bỏ chọn “đang bán” để ngừng bán và giữ lịch sử đơn hàng.</p>}
            {!v.id && <Button size="sm" variant="danger" disabled={variants.length === 1} onClick={() => { setVariants(old => old.filter((_, n) => n !== i)); setImages(old => old.map(img => ({ ...img, variantIndex: img.variantIndex === i ? undefined : img.variantIndex !== undefined && img.variantIndex > i ? img.variantIndex - 1 : img.variantIndex }))); }}>Xóa biến thể</Button>}
          </fieldset>)}
          <Button variant="secondary" disabled={variants.length >= 100} onClick={() => setVariants(old => [...old, { ...newVariant(), price: Number(form.basePrice) || 0 }])}>Thêm biến thể</Button>
          <h3 className="font-bold">Ảnh sản phẩm · ảnh đầu tiên là ảnh chính</h3>
          <p className="text-sm text-content-secondary">Thay URL hoặc tải ảnh mới để sửa ảnh. Dùng nút mũi tên để sắp xếp; ảnh ở vị trí đầu là ảnh chính.</p>
          {images.map((img, i) => <div key={i} className="border border-line-light p-3 space-y-2">
            <Input label={`URL ảnh ${i + 1}`} type="url" maxLength={500} value={img.imageUrl} onChange={e => setImages(old => old.map((x, n) => n === i ? { ...x, imageUrl: e.target.value } : x))} placeholder="https://..." />
            <label className="block text-sm">Hoặc tải ảnh JPEG/PNG/WebP, tối đa 5MB<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={e => { void upload(e.target.files?.[0], i); e.target.value = ''; }} /></label>
            <Select label="Áp dụng ảnh cho" value={img.variantIndex ?? ''} onChange={e => setImages(old => old.map((x, n) => n === i ? { ...x, variantIndex: e.target.value === '' ? undefined : Number(e.target.value) } : x))}
              options={[{ value: '', label: 'Toàn sản phẩm' }, ...variants.map((v, n) => ({ value: n, label: `${n + 1}. ${v.color} / ${v.size}` }))]} />
            {img.imageUrl && <img src={img.imageUrl} alt={`Ảnh ${i + 1}`} className="w-24 h-24 object-cover" />}
            <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={i === 0} onClick={() => setImages(old => { const next = [...old]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; return next; })}>↑ Lên</Button>
            <Button size="sm" variant="secondary" disabled={i === images.length - 1} onClick={() => setImages(old => { const next = [...old]; [next[i + 1], next[i]] = [next[i], next[i + 1]]; return next; })}>↓ Xuống</Button>
            <Button size="sm" variant="danger" disabled={images.length === 1} onClick={() => setImages(old => old.filter((_, n) => n !== i))}>Xóa ảnh</Button></div>
          </div>)}
          <Button variant="secondary" disabled={images.length >= 20} onClick={() => setImages(old => [...old, { imageUrl: '' }])}>Thêm ảnh</Button>
        </>
      </fieldset><div className="flex gap-3 justify-end"><Button variant="secondary" disabled={saving || uploading || formLoading} onClick={() => setModal(false)}>Hủy</Button><Button type="submit" disabled={formLoading} loading={saving || uploading}>{editing ? 'Lưu thay đổi' : 'Tạo sản phẩm'}</Button></div></form>
    </Modal>
  </div>;
}
