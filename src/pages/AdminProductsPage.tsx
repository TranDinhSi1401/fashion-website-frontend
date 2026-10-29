import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, Search, RefreshCw } from 'lucide-react';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { CategoryResponse } from '../types/category';
import { useAuth } from '../context/AuthContext';
import { ProductResponse } from '../types/product';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { formatCurrencyVND, extractErrorMessage } from '../utils/format';

export default function AdminProductsPage() {
  const { isAdmin, isStaff } = useAuth();
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<ProductResponse | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    description: string;
    basePrice: string;
    categoryId: number;
    isActive: boolean;
    imageUrl?: string;
  }>({
    name: '',
    slug: '',
    description: '',
    basePrice: '',
    categoryId: 0,
    isActive: true,
    imageUrl: '',
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: string; message: string }>({ type: '', message: '' });

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const [res, categoryResponse] = await Promise.all([productService.getProducts(), categoryService.getCategories()]);
      setCategories(categoryResponse.data);
      if (res && res.data) {
        setProducts(res.data);
      }
    } catch (err) {
      setNotification({ type: 'error', message: extractErrorMessage(err, 'Không thể tải sản phẩm và danh mục.') });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      basePrice: '',
      categoryId: categories.find(category => category.isActive)?.id || 0,
      isActive: true,
      imageUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod: ProductResponse) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name || '',
      slug: prod.slug || '',
      description: prod.description || '',
      basePrice: String(prod.basePrice || ''),
      categoryId: prod.categoryId,
      isActive: prod.isActive !== false,
      imageUrl: prod.imageUrl || prod.image || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.basePrice || !formData.categoryId) {
      alert('Vui lòng nhập tên, giá và chọn danh mục sản phẩm');
      return;
    }

    setIsSubmitting(true);
    setNotification({ type: '', message: '' });

    const payload = {
      name: formData.name.trim(),
      slug:
        formData.slug.trim() ||
        formData.name
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, ''),
      description: formData.description.trim(),
      basePrice: parseFloat(formData.basePrice),
      categoryId: Number(formData.categoryId),
      isActive: Boolean(formData.isActive),
      imageUrl: formData.imageUrl?.trim() || undefined,
    };

    try {
      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, payload);
        setNotification({ type: 'success', message: 'Cập nhật sản phẩm thành công!' });
      } else {
        await productService.createProduct(payload);
        setNotification({ type: 'success', message: 'Tạo mới sản phẩm thành công!' });
      }
      setIsModalOpen(false);
      await fetchProducts();
    } catch (err: any) {
      alert(extractErrorMessage(err, 'Lưu sản phẩm thất bại'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!isAdmin) {
      alert('Chỉ quản trị viên cấp cao (ADMIN) mới có quyền xóa sản phẩm.');
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${name}"?`)) return;

    try {
      await productService.deleteProduct(id);
      setNotification({ type: 'success', message: 'Đã xóa sản phẩm thành công.' });
      await fetchProducts();
    } catch (err: any) {
      alert(extractErrorMessage(err, 'Xóa sản phẩm thất bại'));
    }
  };

  const filtered = products.filter((p) =>
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">
        {/* Header toolbar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent-gold)', marginBottom: '4px' }}>
              <Shield size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Hệ Thống Quản Trị
              </span>
            </div>
            <h1
              style={{
                fontSize: '1.8rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Quản Lý Sản Phẩm
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="secondary" onClick={fetchProducts} icon={RefreshCw}>
              Làm Mới
            </Button>
            {(isAdmin || isStaff) && (
              <Button variant="primary" onClick={handleOpenCreateModal} icon={Plus} disabled={!categories.some(category => category.isActive)}>
                Thêm Sản Phẩm Mới
              </Button>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div style={{ maxWidth: '400px', marginBottom: '24px' }}>
          <Input
            placeholder="Tìm theo tên sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={Search}
          />
        </div>

        {notification.message && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: notification.type === 'error' ? 'var(--status-error-bg)' : 'var(--status-success-bg)',
              color: notification.type === 'error' ? 'var(--status-error)' : 'var(--status-success)',
              marginBottom: '20px',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            {notification.message}
          </div>
        )}

        {/* Data Table */}
        <div
          style={{
            overflowX: 'auto',
            border: '1px solid var(--border-light)',
            backgroundColor: 'var(--bg-body)',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.85rem',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderBottom: '1px solid var(--border-light)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                }}
              >
                <th style={{ padding: '16px' }}>ID</th>
                <th style={{ padding: '16px' }}>Tên Sản Phẩm</th>
                <th style={{ padding: '16px' }}>Danh Mục</th>
                <th style={{ padding: '16px' }}>Giá Cơ Bản</th>
                <th style={{ padding: '16px' }}>Đánh Giá</th>
                <th style={{ padding: '16px' }}>Trạng Thái</th>
                <th style={{ padding: '16px', textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Đang tải danh sách sản phẩm...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không có sản phẩm nào phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map((prod) => (
                  <tr
                    key={prod.id}
                    style={{
                      borderBottom: '1px solid var(--border-light)',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <td style={{ padding: '16px', fontWeight: 700 }}>#{prod.id}</td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{prod.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{prod.slug}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <Badge variant="default">Cat #{prod.categoryId}</Badge>
                    </td>
                    <td style={{ padding: '16px', fontWeight: 700 }}>{formatCurrencyVND(prod.basePrice)}</td>
                    <td style={{ padding: '16px' }}>
                      {prod.averageRating ? Number(prod.averageRating).toFixed(1) : '5.0'} ★ ({prod.reviewCount || 0})
                    </td>
                    <td style={{ padding: '16px' }}>
                      <Badge variant={prod.isActive ? 'success' : 'error'}>
                        {prod.isActive ? 'Hoạt động' : 'Đang ẩn'}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Edit2}
                          onClick={() => handleOpenEditModal(prod)}
                        >
                          Sửa
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                            onClick={() => handleDelete(prod.id, prod.name)}
                          >
                            Xóa
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? `Cập Nhật Sản Phẩm #${editingProduct.id}` : 'Thêm Sản Phẩm Mới'}
        maxWidth="600px"
      >
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Tên sản phẩm"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ví dụ: Áo Sơ Mi Oxford Trắng Form Regular"
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Giá cơ bản (VND)"
              type="number"
              value={formData.basePrice}
              onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
              placeholder="Ví dụ: 450000"
              required
            />

            <Select
              label="Danh mục"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
              options={[{ value: 0, label: 'Chọn danh mục' }, ...categories.filter(category => category.isActive || category.id === formData.categoryId)
                .map(category => ({ value: category.id, label: category.name }))]}
            />
          </div>

          <Input
            label="Đường dẫn tĩnh (Slug)"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="Để trống sẽ tự động tạo từ tên sản phẩm"
          />

          <Input
            label="Đường dẫn hình ảnh (Image URL)"
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            placeholder="Ví dụ: https://res.cloudinary.com/... hoặc /images/product1.jpg"
          />

          <div className="form-group">
            <label className="form-label">Mô tả sản phẩm</label>
            <textarea
              className="form-input"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Chất liệu, tính năng, hướng dẫn giặt ủi..."
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            />
            <span>Kích hoạt hiển thị sản phẩm trên cửa hàng</span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {editingProduct ? 'Cập Nhật' : 'Tạo Sản Phẩm'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

