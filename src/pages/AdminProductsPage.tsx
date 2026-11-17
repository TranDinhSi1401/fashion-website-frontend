import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Edit2, Trash2, Eye, RefreshCw } from 'lucide-react';
import AdminNav from '../components/admin/AdminNav';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { CategoryResponse } from '../types/category';
import { useAuth } from '../context/AuthContext';
import { ProductResponse, ProductFilters, ProductPage, ProductVariantInput, ProductImageInput } from '../types/product';
import { Badge, Button, Checkbox, Input, Modal, Select } from '../components/ui';
import ProductPrice from '../components/product/ProductPrice';
import { extractErrorMessage } from '../utils/format';
import styles from './AdminPages.module.css';

const emptyForm = { name: '', slug: '', description: '', basePrice: '', categoryId: 0, isActive: true };
const emptyFilters = { keyword: '', categoryId: '', minPrice: '', maxPrice: '', color: '', size: '', isActive: '', inStock: '', sort: 'newest' };
const newVariant = (): ProductVariantInput => ({ color: '', size: '', price: 0, stockQuantity: 0, packageWeight: 200, packageLength: 20, packageWidth: 15, packageHeight: 3 });

export default function AdminProductsPage() {
  const { isAdmin, isStaff } = useAuth();
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [result, setResult] = useState<ProductPage | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState(emptyFilters);
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

  useEffect(() => {
    let active = true;
    categoryService.getCategories().then(r => { if (active) setCategories(r.data); })
      .catch(e => { if (active) setNotice({ error: true, text: extractErrorMessage(e, 'Không tải được danh mục') }); });
    return () => { active = false; };
  }, []);

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

  function openForm(product?: ProductResponse) {
    setEditing(product || null); setFormError('');
    setForm(product ? { name: product.name, slug: product.slug || '', description: product.description || '',
      basePrice: String(product.basePrice), categoryId: product.categoryId, isActive: product.isActive !== false }
      : { ...emptyForm, categoryId: categories.find(c => c.isActive)?.id || 0 });
    setVariants([newVariant()]); setImages([{ imageUrl: '' }]); setModal(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault(); setFormError('');
    const usedImages = images.filter(i => i.imageUrl.trim()).map(i => ({ ...i, imageUrl: i.imageUrl.trim() }));
    if (!form.categoryId || Number(form.basePrice) <= 0) { setFormError('Chọn danh mục và nhập giá lớn hơn 0'); return; }
    if (!editing && (!variants.length || !usedImages.length)) { setFormError('Cần ít nhất một biến thể và một ảnh'); return; }
    const keys = variants.map(v => v.color.trim().toLocaleLowerCase() + ':' + v.size.trim().toUpperCase().replace(/^2XL$/, 'XXL'));
    if (!editing && new Set(keys).size !== keys.length) { setFormError('Biến thể màu/size bị trùng'); return; }
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), basePrice: Number(form.basePrice),
        slug: form.slug.trim() || form.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') };
      if (editing) await productService.updateProduct(editing.id, payload);
      else await productService.createProduct({ ...payload, variants, images: usedImages });
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
      <Input label="Giá gốc từ" type="number" min="0" value={filters.minPrice} onChange={e => setFilters({ ...filters, minPrice: e.target.value })} />
      <Input label="Giá gốc đến" type="number" min="0" value={filters.maxPrice} onChange={e => setFilters({ ...filters, maxPrice: e.target.value })} />
      <Input label="Màu" value={filters.color} onChange={e => setFilters({ ...filters, color: e.target.value })} />
      <Input label="Size" value={filters.size} onChange={e => setFilters({ ...filters, size: e.target.value })} />
      <Select label="Tồn kho" value={filters.inStock} onChange={e => setFilters({ ...filters, inStock: e.target.value })}
        options={[{ value: '', label: 'Tất cả' }, { value: 'true', label: 'Còn hàng' }, { value: 'false', label: 'Hết hàng' }]} />
      <Select label="Sắp xếp" value={filters.sort} onChange={e => setFilters({ ...filters, sort: e.target.value })}
        options={[{ value: 'newest', label: 'Mới nhất' }, { value: 'name', label: 'Tên' }, { value: 'price-asc', label: 'Giá tăng' }, { value: 'price-desc', label: 'Giá giảm' }]} />
      <Button type="submit">Áp dụng bộ lọc</Button>
      <Button variant="secondary" onClick={() => { setFilters(emptyFilters); setApplied({}); setPage(0); }}>Xóa bộ lọc</Button>
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

    <Modal isOpen={modal} onClose={() => { if (!saving && !uploading) setModal(false); }} title={editing ? 'Sửa thông tin sản phẩm' : 'Thêm sản phẩm mới'} maxWidth="950px">
      <form onSubmit={submit} className="space-y-4"><fieldset disabled={saving || uploading} className="space-y-4">
        {formError && <p role="alert" className={styles.alertError}>{formError}</p>}
        <Input label="Tên sản phẩm" required maxLength={200} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <Input label="Slug (để trống để tạo từ tên)" maxLength={200} value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
        <Input label="Giá gốc (đ)" type="number" min="1" step="0.01" required value={form.basePrice} onChange={e => setForm({ ...form, basePrice: e.target.value })} />
        <Select label="Danh mục" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: Number(e.target.value) })}
          options={[{ value: 0, label: 'Chọn danh mục' }, ...categories.filter(c => c.isActive || c.id === form.categoryId).map(c => ({ value: c.id, label: c.name }))]} />
        <Input label="Mô tả" multiline rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <Checkbox label="Hiển thị trên cửa hàng" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
        {!editing && <>
          <h3 className="font-bold">Biến thể sản phẩm</h3>
          {variants.map((v, i) => <fieldset key={i} className="border border-line-light p-3 space-y-3"><legend>Biến thể {i + 1}</legend>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Màu" required maxLength={50} value={v.color} onChange={e => setVariants(old => old.map((x, n) => n === i ? { ...x, color: e.target.value } : x))} />
              <Input label="Size" required maxLength={20} value={v.size} onChange={e => setVariants(old => old.map((x, n) => n === i ? { ...x, size: e.target.value } : x))} />
              <Input label="Giá biến thể (đ)" type="number" required min="1" step="0.01" value={v.price} onChange={e => setVariants(old => old.map((x, n) => n === i ? { ...x, price: Number(e.target.value) } : x))} />
              <Input label="Tồn kho" type="number" required min="0" step="1" value={v.stockQuantity} onChange={e => setVariants(old => old.map((x, n) => n === i ? { ...x, stockQuantity: Number(e.target.value) } : x))} />
              {(['packageWeight', 'packageLength', 'packageWidth', 'packageHeight'] as const).map((field, n) => <Input key={field} label={['Khối lượng (g)', 'Dài (cm)', 'Rộng (cm)', 'Cao (cm)'][n]} type="number" required min="1" step="1" value={v[field]} onChange={e => setVariants(old => old.map((x, k) => k === i ? { ...x, [field]: Number(e.target.value) } : x))} />)}
            </div>
            <Button size="sm" variant="danger" disabled={variants.length === 1} onClick={() => { setVariants(old => old.filter((_, n) => n !== i)); setImages(old => old.map(img => ({ ...img, variantIndex: img.variantIndex === i ? undefined : img.variantIndex !== undefined && img.variantIndex > i ? img.variantIndex - 1 : img.variantIndex }))); }}>Xóa biến thể</Button>
          </fieldset>)}
          <Button variant="secondary" disabled={variants.length >= 100} onClick={() => setVariants(old => [...old, { ...newVariant(), price: Number(form.basePrice) || 0 }])}>Thêm biến thể</Button>
          <h3 className="font-bold">Ảnh sản phẩm · ảnh đầu tiên là ảnh chính</h3>
          {images.map((img, i) => <div key={i} className="border border-line-light p-3 space-y-2">
            <Input label={`URL ảnh ${i + 1}`} type="url" maxLength={500} value={img.imageUrl} onChange={e => setImages(old => old.map((x, n) => n === i ? { ...x, imageUrl: e.target.value } : x))} placeholder="https://..." />
            <label className="block text-sm">Hoặc tải ảnh JPEG/PNG/WebP, tối đa 5MB<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={e => { void upload(e.target.files?.[0], i); e.target.value = ''; }} /></label>
            <Select label="Áp dụng ảnh cho" value={img.variantIndex ?? ''} onChange={e => setImages(old => old.map((x, n) => n === i ? { ...x, variantIndex: e.target.value === '' ? undefined : Number(e.target.value) } : x))}
              options={[{ value: '', label: 'Toàn sản phẩm' }, ...variants.map((v, n) => ({ value: n, label: `${n + 1}. ${v.color} / ${v.size}` }))]} />
            {img.imageUrl && <img src={img.imageUrl} alt={`Ảnh ${i + 1}`} className="w-24 h-24 object-cover" />}
            <Button size="sm" variant="danger" disabled={images.length === 1} onClick={() => setImages(old => old.filter((_, n) => n !== i))}>Xóa ảnh</Button>
          </div>)}
          <Button variant="secondary" disabled={images.length >= 20} onClick={() => setImages(old => [...old, { imageUrl: '' }])}>Thêm ảnh</Button>
        </>}
      </fieldset><div className="flex gap-3 justify-end"><Button variant="secondary" disabled={saving || uploading} onClick={() => setModal(false)}>Hủy</Button><Button type="submit" loading={saving || uploading}>{editing ? 'Lưu thay đổi' : 'Tạo sản phẩm'}</Button></div></form>
    </Modal>
  </div>;
}
