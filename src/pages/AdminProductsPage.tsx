import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Trash2, Eye, RefreshCw, Search, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight, Package, ImageOff, X } from 'lucide-react';
import AdminNav from '../components/admin/AdminNav';
import CategoryCreateModal from '../components/admin/CategoryCreateModal';
import ProductAttributeSelect from '../components/admin/ProductAttributeSelect';
import { DEFAULT_COLORS, DEFAULT_SIZES, newVariant, normalizeVariantSize, variantKey, uniqueChoices, generateVariantGrid, appendVariants, parseVariantTable } from '../utils/productEditor';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { CategoryResponse } from '../types/category';
import { useAuth } from '../context/AuthContext';
import { ProductResponse, ProductFilters, ProductPage, ProductVariantInput, ProductImageInput } from '../types/product';
import { Button, Checkbox, Input, Modal, Select } from '../components/ui';
import MoneyInput from '../components/ui/MoneyInput';
import ProductPrice from '../components/product/ProductPrice';
import { extractErrorMessage, extractProductImage } from '../utils/format';
import ui from './AdminProductsPage.module.css';
import editorStyles from './ProductEditor.module.css';

const PRODUCTS_PER_PAGE = 10;

type VariantTarget = { id: number; focus: 'stock' | 'status' };

const emptyForm = { name: '', slug: '', description: '', basePrice: '', categoryId: 0, isActive: true };
const emptyFilters = { keyword: '', categoryId: '', minPrice: '', maxPrice: '', color: '', size: '', isActive: '', inStock: '', sort: 'newest' };

export default function AdminProductsPage() {
  const { isAdmin, isStaff } = useAuth();
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [result, setResult] = useState<ProductPage | null>(null);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState(() => ({ ...emptyFilters, keyword: searchParams.get('keyword') || '', isActive: ['true', 'false'].includes(searchParams.get('isActive') || '') ? searchParams.get('isActive')! : '', inStock: ['true', 'false'].includes(searchParams.get('inStock') || '') ? searchParams.get('inStock')! : '' }));
  const [filterReset, setFilterReset] = useState(0);
  const [advancedFilters, setAdvancedFilters] = useState(false);
  const [applied, setApplied] = useState<ProductFilters>(() => ({ keyword: searchParams.get('keyword') || undefined, isActive: filters.isActive === '' ? undefined : filters.isActive === 'true', inStock: filters.inStock === '' ? undefined : filters.inStock === 'true' }));
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState({ error: false, text: '' });
  const [modal, setModal] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
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
  const [variantTarget, setVariantTarget] = useState<VariantTarget | null>(null);
  const deepLinkHandled = useRef('');
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
    categoryService.getCategories().then(({ data }) => {
      if (active) {
        const loadedIds = new Set(data.map(category => category.id));
        setCategories(current => [...data, ...current.filter(category => !loadedIds.has(category.id))]);
      }
    }).catch(e => { if (active) setNotice({ error: true, text: extractErrorMessage(e, 'Không tải được danh mục') }); });
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
    productService.getProductsPage({ ...applied, page, pageSize: PRODUCTS_PER_PAGE }, controller.signal)
      .then(r => {
        if (controller.signal.aborted) return;
        if (r.data.totalPages > 0 && page >= r.data.totalPages) setPage(r.data.totalPages - 1);
        else setResult(r.data);
      })
      .catch(e => { if (!controller.signal.aborted) { setResult(null); setNotice({ error: true, text: extractErrorMessage(e, 'Không tải được sản phẩm') }); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [applied, page, reload]);

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

  const openForm = useCallback(async (product?: ProductResponse | number, target?: VariantTarget) => {
    const productId = typeof product === 'number' ? product : product?.id;
    setVariantTarget(target || null);
    setEditing(typeof product === 'object' ? product : null); setFormError(''); setQuickNotice(''); setPasteText('');
    setQuickColors([]); setQuickSizes([]); setQuickPrice(''); setQuickStock('0');
    setModal(true); setFormLoading(productId !== undefined);
    setForm({ ...emptyForm, categoryId: categories.find(c => c.isActive)?.id || 0 });
    setVariants([newVariant()]); setImages([{ imageUrl: '' }]);
    if (productId === undefined) return;
    try {
      const { data: fresh } = await productService.getProductById(productId);
      setEditing(fresh);
      setForm({ name: fresh.name, slug: fresh.slug || '', description: fresh.description || '', basePrice: String(fresh.basePrice), categoryId: fresh.categoryId, isActive: fresh.isActive !== false });
      const rows = fresh.variants?.map(v => ({ ...newVariant(v.price), ...v, packageWeight: v.packageWeight || 200, packageLength: v.packageLength || 20, packageWidth: v.packageWidth || 15, packageHeight: v.packageHeight || 3 })) || [];
      setVariants(rows.length ? rows : [newVariant(fresh.basePrice)]);
      if (target && !rows.some(v => v.id === target.id)) { setVariantTarget(null); setFormError('Biến thể được chọn không còn tồn tại. Vui lòng kiểm tra lại sản phẩm.'); }
      const pictures = fresh.productImages?.map(img => ({ id: img.id, imageUrl: img.imageUrl,
        variantIndex: img.variantId ? rows.findIndex(v => v.id === img.variantId) : undefined }))
        .map(img => ({ ...img, variantIndex: img.variantIndex === -1 ? undefined : img.variantIndex })) || [];
      setImages(pictures.length ? pictures : [{ imageUrl: '' }]);
    } catch (e) {
      setModal(false); setNotice({ error: true, text: extractErrorMessage(e, 'Không tải được thông tin để sửa sản phẩm') });
    } finally { setFormLoading(false); }
  }, [categories]);

  useEffect(() => {
    const key = searchParams.toString();
    const productId = Number(searchParams.get('edit'));
    const variantId = Number(searchParams.get('variant'));
    if (!categories.length || !Number.isSafeInteger(productId) || productId <= 0 || deepLinkHandled.current === key) return;
    deepLinkHandled.current = key;
    void openForm(productId, Number.isSafeInteger(variantId) && variantId > 0 ? {
      id: variantId, focus: searchParams.get('focus') === 'status' ? 'status' : 'stock',
    } : undefined);
  }, [categories, searchParams, openForm]);

  useEffect(() => {
    if (!modal || formLoading || !variantTarget) return;
    const frame = requestAnimationFrame(() => {
      const field = document.getElementById(`variant-${variantTarget.focus}-${variantTarget.id}`);
      field?.scrollIntoView({ block: 'center', behavior: 'instant' });
      field?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [modal, formLoading, variantTarget]);

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

  const activeFilterCount = Object.entries(applied).filter(([key, value]) => key !== 'sort' && value !== undefined && value !== '').length;
  const resetFilters = () => { setFilters(emptyFilters); setFilterReset(n => n + 1); setApplied({}); setPage(0); setNotice({ error: false, text: '' }); };
  const firstItem = result?.totalElements ? page * PRODUCTS_PER_PAGE + 1 : 0;
  const lastItem = Math.min((page + 1) * PRODUCTS_PER_PAGE, result?.totalElements ?? 0);

  return <div className={ui.page}>
    <div className="container py-8 sm:py-10">
    <AdminNav title="Quản lý sản phẩm" subtitle="Sắp xếp danh mục, cập nhật sản phẩm và theo dõi tồn kho."
      actions={<><Button size="sm" icon={RefreshCw} variant="outline" onClick={() => setReload(r => r + 1)}>Làm mới</Button>
        {(isAdmin || isStaff) && <>
          <Button size="sm" icon={Plus} variant="outline" onClick={() => setCategoryModalOpen(true)}>Thêm danh mục</Button>
          <Button size="sm" icon={Plus} onClick={() => openForm()} disabled={!categories.some(c => c.isActive)}>Thêm sản phẩm</Button>
        </>}</>} />

    {categoryModalOpen && (
      <CategoryCreateModal
        categories={categories}
        onClose={() => setCategoryModalOpen(false)}
        onCreated={category => {
          setCategories(current => [...current.filter(item => item.id !== category.id), category]);
          setNotice({ error: false, text: `Đã thêm danh mục “${category.name}”` });
          setCategoryModalOpen(false);
        }}
      />
    )}

    <section className={ui.workspace} aria-labelledby="product-list-heading">
      <div className={ui.listHeading}>
        <div className={ui.titleGroup}><span className={ui.sectionIcon}><Package size={20} /></span><div><div className={ui.titleLine}><h2 id="product-list-heading">Danh sách sản phẩm</h2><span className={ui.count}>{result?.totalElements ?? '—'}</span></div><p>Quản lý thông tin và trạng thái bán hàng của bạn.</p></div></div>
        <span className={ui.liveLabel}><span /> Dữ liệu cửa hàng</span>
      </div>
      <form onSubmit={applyFilters} className={ui.filters}>
        <div className={ui.primaryFilters}>
          <Input id="admin-product-search" label="Tìm sản phẩm" icon={Search} placeholder="Tên sản phẩm hoặc slug…" value={filters.keyword} onChange={e => setFilters({ ...filters, keyword: e.target.value })} />
          <Select id="admin-product-category" label="Danh mục" value={filters.categoryId} onChange={e => setFilters({ ...filters, categoryId: e.target.value })}
            options={[{ value: '', label: 'Tất cả danh mục' }, ...categories.map(c => ({ value: c.id, label: c.name }))]} />
          <Select id="admin-product-status" label="Trạng thái" value={filters.isActive} onChange={e => setFilters({ ...filters, isActive: e.target.value })}
            options={[{ value: '', label: 'Tất cả trạng thái' }, { value: 'true', label: 'Đang bán' }, { value: 'false', label: 'Đang ẩn' }]} />
          <button type="button" className={`${ui.filterToggle} ${advancedFilters ? ui.filterToggleActive : ''}`} aria-expanded={advancedFilters} aria-controls="advanced-product-filters" onClick={() => setAdvancedFilters(v => !v)}><SlidersHorizontal size={16} /><span>Lọc nâng cao</span><ChevronDown size={14} /></button>
        </div>
        {advancedFilters && <div id="advanced-product-filters" className={ui.advancedFilters}>
          <MoneyInput key={`min-${filterReset}`} id="admin-min-price" label="Giá gốc từ" value={filters.minPrice} onValueChange={minPrice => setFilters({ ...filters, minPrice })} />
          <MoneyInput key={`max-${filterReset}`} id="admin-max-price" label="Giá gốc đến" value={filters.maxPrice} onValueChange={maxPrice => setFilters({ ...filters, maxPrice })} />
          <Select label="Màu sắc" value={filters.color} onChange={e => setFilters({ ...filters, color: e.target.value })} options={[{ value: '', label: 'Tất cả màu' }, ...colorOptions.map(value => ({ value, label: value }))]} />
          <Select label="Kích thước" value={filters.size} onChange={e => setFilters({ ...filters, size: e.target.value })} options={[{ value: '', label: 'Tất cả size' }, ...sizeOptions.map(value => ({ value, label: value }))]} />
          <Select label="Tình trạng kho" value={filters.inStock} onChange={e => setFilters({ ...filters, inStock: e.target.value })}
            options={[{ value: '', label: 'Tất cả tồn kho' }, { value: 'true', label: 'Còn hàng' }, { value: 'false', label: 'Hết hàng' }]} />
          <Select label="Sắp xếp" value={filters.sort} onChange={e => setFilters({ ...filters, sort: e.target.value })}
            options={[{ value: 'newest', label: 'Mới nhất' }, { value: 'name', label: 'Tên A–Z' }, { value: 'price-asc', label: 'Giá thấp đến cao' }, { value: 'price-desc', label: 'Giá cao đến thấp' }]} />
        </div>}
        <div className={ui.filterFooter}>
          <span>{activeFilterCount ? <><strong>{activeFilterCount}</strong> bộ lọc đang áp dụng</> : 'Hiển thị tất cả sản phẩm trong cửa hàng'}</span>
          <div><button type="button" className={ui.resetButton} onClick={resetFilters}><X size={14} />Xóa bộ lọc</button><Button type="submit" size="sm" icon={Search}>Tìm kiếm</Button></div>
        </div>
      </form>
      {notice.text && <p role="status" className={notice.error ? ui.alertError : ui.alertSuccess}>{notice.text}</p>}
      <div className={ui.tableWrap} aria-busy={loading}>
        <table className={ui.table}><thead><tr>
          {['Sản phẩm', 'Danh mục', 'Giá bán', 'Tồn kho', 'Trạng thái', 'Thao tác'].map(h => <th key={h}>{h}</th>)}
        </tr></thead><tbody>
          {loading ? <tr><td colSpan={6}><div className={ui.emptyState}><RefreshCw size={25} className="animate-spin" /><strong>Đang tải sản phẩm…</strong><span>Đang cập nhật danh sách của bạn.</span></div></td></tr> : !result?.content.length ? <tr><td colSpan={6}><div className={ui.emptyState}><Package size={32} /><strong>{notice.error ? 'Chưa tải được sản phẩm' : 'Không tìm thấy sản phẩm'}</strong><span>{notice.error ? 'Vui lòng thử làm mới danh sách.' : 'Thử thay đổi từ khóa hoặc bỏ bớt bộ lọc.'}</span><button type="button" className={ui.resetButton} onClick={notice.error ? () => setReload(r => r + 1) : resetFilters}>{notice.error ? 'Thử lại' : 'Xóa bộ lọc'}</button></div></td></tr>
            : result.content.map(p => {
              const image = extractProductImage(p);
              const stock = p.variants?.filter(v => v.isActive).reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
              return <tr key={p.id}>
              <td><button type="button" className={ui.productCell} onClick={() => { setDetailId(p.id); setDetailOpen(true); }}>
                <span className={ui.thumbnail}>{image ? <img src={image} alt="" loading="lazy" /> : <ImageOff size={22} />}</span>
                <span className={ui.productInfo}><strong>{p.name}</strong><span>#{p.id}<i />{p.variants?.length ?? '—'} biến thể</span></span>
              </button></td>
              <td data-label="Danh mục"><span className={ui.category}>{categories.find(c => c.id === p.categoryId)?.name || `#${p.categoryId}`}</span></td>
              <td data-label="Giá bán" className={ui.price}><ProductPrice price={p.basePrice} offer={p.bestOffer} /></td>
              <td data-label="Tồn kho"><span className={`${ui.stock} ${stock === 0 ? ui.stockEmpty : ''}`}>{stock === undefined ? '—' : stock.toLocaleString('vi-VN')}</span><small className={ui.stockNote}>đơn vị</small></td>
              <td data-label="Trạng thái"><span className={`${ui.status} ${p.isActive ? ui.statusActive : ui.statusHidden}`}><span />{p.isActive ? 'Đang bán' : 'Đang ẩn'}</span></td>
              <td className={ui.actionsCell}><div className={ui.rowActions}>
                <button type="button" title="Xem chi tiết" aria-label={`Chi tiết ${p.name}`} onClick={() => { setDetailId(p.id); setDetailOpen(true); }}><Eye size={16} /></button>
                <button type="button" title="Chỉnh sửa" aria-label={`Sửa ${p.name}`} onClick={() => openForm(p)}><Edit2 size={16} /></button>
                {isAdmin && <button type="button" className={ui.deleteAction} title="Xóa sản phẩm" aria-label={`Xóa ${p.name}`} onClick={() => remove(p)}><Trash2 size={16} /></button>}
              </div></td>
            </tr>; })}
        </tbody></table>
      </div>
      <div className={ui.pagination}>
        <div className={ui.resultRange}>Hiển thị <strong>{firstItem}–{lastItem}</strong> trong <strong>{result?.totalElements ?? 0}</strong> sản phẩm</div>
        <div className={ui.pageControls}>
          <div className={ui.pageButtons}><button type="button" aria-label="Trang trước" disabled={loading || page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button><span>{page + 1} <small>/ {Math.max(1, result?.totalPages ?? 0)}</small></span><button type="button" aria-label="Trang sau" disabled={loading || page + 1 >= (result?.totalPages ?? 0)} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button></div>
        </div>
      </div>
    </section>

    <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Chi tiết sản phẩm" maxWidth="900px" className={editorStyles.dialog}>
      {detailBusy ? <p>Đang tải chi tiết...</p> : detailError ? <p role="alert">{detailError}</p> : detail && <div className={`${editorStyles.detail} space-y-4`}>
        <h2 className="text-xl font-bold">{detail.name} · #{detail.id}</h2>
        <p>{categories.find(c => c.id === detail.categoryId)?.name} · {detail.isActive ? 'Hoạt động' : 'Đang ẩn'} · {detail.slug}</p>
        <ProductPrice price={detail.basePrice} offer={detail.bestOffer} />
        <p className="whitespace-pre-line">{detail.description || 'Chưa có mô tả'}</p>
        <div className="flex gap-3 flex-wrap">{detail.productImages?.map(img => <figure key={img.id}><img src={img.imageUrl} alt={detail.name} className="w-28 aspect-[3/4] object-cover" loading="lazy" /><figcaption>{img.isMain ? 'Ảnh chính' : 'Ảnh phụ'}{img.variantId ? ` · Biến thể #${img.variantId}` : ''}</figcaption></figure>)}</div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['SKU', 'Màu', 'Size', 'Giá', 'Tồn kho', 'Trạng thái'].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead>
          <tbody>{detail.variants?.map(v => <tr key={v.id}><td className="p-2">{v.sku || v.id}</td><td className="p-2">{v.color}</td><td className="p-2">{v.size}</td><td className="p-2"><ProductPrice price={v.price} offer={v.bestOffer} /></td><td className="p-2">{v.stockQuantity}</td><td className="p-2">{v.isActive ? 'Hoạt động' : 'Đang ẩn'}</td></tr>)}</tbody></table></div>
      </div>}
    </Modal>

    <Modal isOpen={modal} onClose={() => { if (!saving && !uploading && !formLoading) setModal(false); }} title={formLoading ? 'Đang tải sản phẩm' : editing ? 'Sửa thông tin sản phẩm' : 'Thêm sản phẩm mới'} maxWidth="950px" className={editorStyles.dialog}>
      {formLoading && <p role="status">Đang tải đầy đủ thông tin sản phẩm…</p>}
      <form onSubmit={submit} className={editorStyles.form}><fieldset disabled={saving || uploading || formLoading} className={editorStyles.formContent}>
        {variantTarget && !formLoading && <div role="status" className={editorStyles.targetNotice}><strong>{variantTarget.focus === 'stock' ? 'Bổ sung hàng' : 'Tạm ẩn biến thể'}</strong><span>{variants.find(v => v.id === variantTarget.id)?.color} / {variants.find(v => v.id === variantTarget.id)?.size} · {variantTarget.focus === 'stock' ? 'Nhập tồn kho mới rồi lưu thay đổi.' : 'Bỏ chọn “Biến thể đang bán” rồi lưu thay đổi.'}</span></div>}
        {formError && <p role="alert" className={ui.alertError}>{formError}</p>}
        <section className={editorStyles.section}>
        <div className={editorStyles.sectionHeading}><span>01</span><div><h3>Thông tin cơ bản</h3><p>Tên, giá và danh mục hiển thị trên cửa hàng.</p></div></div>
        <div className={editorStyles.basicGrid}>
        <Input className={editorStyles.fullWidth} label="Tên sản phẩm" placeholder="Ví dụ: Áo polo nam Cotton Regular Fit" required maxLength={200} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <Input className={editorStyles.fullWidth} label="Đường dẫn sản phẩm (slug)" helperText="Để trống để tự tạo từ tên sản phẩm." maxLength={200} value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
        <Input label="Giá gốc (đ)" type="number" min="1" step="0.01" required value={form.basePrice} onChange={e => setForm({ ...form, basePrice: e.target.value })} />
        <Select label="Danh mục" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: Number(e.target.value) })}
          options={[{ value: 0, label: 'Chọn danh mục' }, ...categories.filter(c => c.isActive || c.id === form.categoryId).map(c => ({ value: c.id, label: c.name }))]} />
        <Input className={editorStyles.fullWidth} label="Mô tả" multiline rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div><div className={editorStyles.visibility}><Checkbox label="Hiển thị trên cửa hàng" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /><span>Tắt để ẩn sản phẩm khỏi danh sách mua sắm.</span></div></section>
        <>
          <section className={editorStyles.section}>
          <div className={editorStyles.sectionHeading}><span>02</span><div><h3>Biến thể sản phẩm <small>{variants.length}</small></h3><p>Quản lý màu sắc, kích thước, giá bán và số lượng.</p></div></div>
          <details className={editorStyles.quick}>
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
          <div className={editorStyles.variantGrid}>{variants.map((v, i) => <fieldset key={v.id ? `saved-${v.id}` : v.clientId || i} data-variant-id={v.id} className={`${editorStyles.variantCard} ${variantTarget && variantTarget.id === v.id ? editorStyles.targetVariant : ''} space-y-3`}><legend>Biến thể {String(i + 1).padStart(2, '0')}</legend>
            <div className="grid grid-cols-2 gap-3">
              <ProductAttributeSelect label="Màu" value={v.color} options={colorOptions} onChange={color => setVariants(old => old.map((x, n) => n === i ? { ...x, color } : x))} />
              <ProductAttributeSelect label="Size" value={v.size} options={sizeOptions} maxLength={20} onChange={size => setVariants(old => old.map((x, n) => n === i ? { ...x, size } : x))} />
              <Input label="Giá biến thể (đ)" type="number" required min="1" step="0.01" value={v.price} onChange={e => setVariants(old => old.map((x, n) => n === i ? { ...x, price: Number(e.target.value) } : x))} />
              <Input id={`variant-stock-${v.id ?? v.clientId}`} label="Tồn kho" type="number" required min="0" step="1" value={v.stockQuantity} onChange={e => setVariants(old => old.map((x, n) => n === i ? { ...x, stockQuantity: Number(e.target.value) } : x))} />
              <details className="col-span-2">
                <summary className="cursor-pointer text-sm text-content-secondary">Thông số kiện hàng (GHN)</summary>
                <div className="mt-3 grid grid-cols-2 gap-3">
              {(['packageWeight', 'packageLength', 'packageWidth', 'packageHeight'] as const).map((field, n) => <Input key={field} label={['Khối lượng (g)', 'Dài (cm)', 'Rộng (cm)', 'Cao (cm)'][n]} type="number" required min="1" step="1" value={v[field]} onChange={e => setVariants(old => old.map((x, k) => k === i ? { ...x, [field]: Number(e.target.value) } : x))} />)}
                </div>
              </details>
            </div>
            <Checkbox id={`variant-status-${v.id ?? v.clientId}`} label="Biến thể đang bán" checked={v.isActive !== false} onChange={e => setVariants(old => old.map((x, n) => n === i ? { ...x, isActive: e.target.checked } : x))} />
            {v.id && <p className="text-xs text-content-secondary">SKU hiện có: bỏ chọn “đang bán” để ngừng bán và giữ lịch sử đơn hàng.</p>}
            {!v.id && <Button size="sm" variant="danger" disabled={variants.length === 1} onClick={() => { setVariants(old => old.filter((_, n) => n !== i)); setImages(old => old.map(img => ({ ...img, variantIndex: img.variantIndex === i ? undefined : img.variantIndex !== undefined && img.variantIndex > i ? img.variantIndex - 1 : img.variantIndex }))); }}>Xóa biến thể</Button>}
          </fieldset>)}</div>
          <Button icon={Plus} size="sm" variant="outline" disabled={variants.length >= 100} onClick={() => setVariants(old => [...old, { ...newVariant(), price: Number(form.basePrice) || 0 }])}>Thêm biến thể</Button>
          </section>
          <section className={editorStyles.section}>
          <div className={editorStyles.sectionHeading}><span>03</span><div><h3>Hình ảnh sản phẩm <small>{images.length}</small></h3><p>Ảnh đầu tiên là ảnh chính. Kéo lên hoặc xuống bằng nút mũi tên để đổi thứ tự.</p></div></div>
          <div className={editorStyles.imageGrid}>{images.map((img, i) => <div key={i} className={`${editorStyles.imageCard} space-y-3`}><div className={editorStyles.imageLabel}>{i === 0 ? 'Ảnh chính' : `Ảnh ${i + 1}`}</div>
            <Input label={`URL ảnh ${i + 1}`} type="url" maxLength={500} value={img.imageUrl} onChange={e => setImages(old => old.map((x, n) => n === i ? { ...x, imageUrl: e.target.value } : x))} placeholder="https://..." />
            <label className="block text-sm">Hoặc tải ảnh JPEG/PNG/WebP, tối đa 5MB<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={e => { void upload(e.target.files?.[0], i); e.target.value = ''; }} /></label>
            <Select label="Áp dụng ảnh cho" value={img.variantIndex ?? ''} onChange={e => setImages(old => old.map((x, n) => n === i ? { ...x, variantIndex: e.target.value === '' ? undefined : Number(e.target.value) } : x))}
              options={[{ value: '', label: 'Toàn sản phẩm' }, ...variants.map((v, n) => ({ value: n, label: `${n + 1}. ${v.color} / ${v.size}` }))]} />
            {img.imageUrl && <img src={img.imageUrl} alt={`Ảnh ${i + 1}`} className="w-24 aspect-[3/4] object-cover" loading="lazy" />}
            <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={i === 0} onClick={() => setImages(old => { const next = [...old]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; return next; })}>↑ Lên</Button>
            <Button size="sm" variant="secondary" disabled={i === images.length - 1} onClick={() => setImages(old => { const next = [...old]; [next[i + 1], next[i]] = [next[i], next[i + 1]]; return next; })}>↓ Xuống</Button>
            <Button size="sm" variant="danger" disabled={images.length === 1} onClick={() => setImages(old => old.filter((_, n) => n !== i))}>Xóa ảnh</Button></div>
          </div>)}</div>
          <Button icon={Plus} size="sm" variant="outline" disabled={images.length >= 20} onClick={() => setImages(old => [...old, { imageUrl: '' }])}>Thêm ảnh</Button>
          </section>
        </>
      </fieldset><div className={editorStyles.formFooter}><span>Kiểm tra thông tin trước khi lưu sản phẩm.</span><div className="flex gap-3"><Button variant="secondary" disabled={saving || uploading || formLoading} onClick={() => setModal(false)}>Hủy</Button><Button type="submit" disabled={formLoading} loading={saving || uploading}>{editing ? 'Lưu thay đổi' : 'Tạo sản phẩm'}</Button></div></div></form>
    </Modal>
    </div>
  </div>;
}
