import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, Search, RefreshCw } from 'lucide-react';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { CategoryResponse } from '../types/category';
import { useAuth } from '../context/AuthContext';
import { ProductResponse } from '../types/product';
import { Badge, Button, Checkbox, Input, Modal, Select } from '../components/ui';
import { formatCurrencyVND, extractErrorMessage } from '../utils/format';
import styles from './AdminPages.module.css';

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
    } catch (err) {
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
    } catch (err) {
      alert(extractErrorMessage(err, 'Xóa sản phẩm thất bại'));
    }
  };

  const filtered = products.filter((p) =>
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pt-10 pb-20">
      <div className="container">
        {/* Header toolbar */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-accent-gold mb-1">
              <Shield size={16} />
              <span className="text-[0.75rem] font-bold uppercase tracking-[0.08em]">
                Hệ Thống Quản Trị
              </span>
            </div>
            <h1 className="text-[1.8rem] font-extrabold uppercase tracking-[0.04em] text-content-primary m-0">
              Quản Lý Sản Phẩm
            </h1>
          </div>

          <div className="flex gap-3">
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
        <div className="max-w-[400px] mb-6">
          <Input
            placeholder="Tìm theo tên sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={Search}
          />
        </div>

        {notification.message && (
          <div className={notification.type === 'error' ? styles.alertError : styles.alertSuccess}>
            {notification.message}
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto border border-line-light bg-surface-body">
          <table className="w-full border-collapse text-left text-[0.85rem]">
            <thead>
              <tr className="bg-surface border-b border-line-light uppercase tracking-[0.05em] text-[0.75rem] font-bold text-content-secondary">
                <th className="p-4">ID</th>
                <th className="p-4">Tên Sản Phẩm</th>
                <th className="p-4">Danh Mục</th>
                <th className="p-4">Giá Cơ Bản</th>
                <th className="p-4">Đánh Giá</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-content-muted">
                    Đang tải danh sách sản phẩm...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-content-muted">
                    Không có sản phẩm nào phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map((prod) => (
                  <tr key={prod.id} className={styles.tableRow}>
                    <td className="p-4 font-bold">#{prod.id}</td>
                    <td className="p-4">
                      <div className="font-semibold text-content-primary">{prod.name}</div>
                      <div className="text-[0.72rem] text-content-muted">{prod.slug}</div>
                    </td>
                    <td className="p-4">
                      <Badge variant="default">Cat #{prod.categoryId}</Badge>
                    </td>
                    <td className="p-4 font-bold">{formatCurrencyVND(prod.basePrice)}</td>
                    <td className="p-4">
                      {prod.averageRating ? Number(prod.averageRating).toFixed(1) : '5.0'} ★ ({prod.reviewCount || 0})
                    </td>
                    <td className="p-4">
                      <Badge variant={prod.isActive ? 'success' : 'error'}>
                        {prod.isActive ? 'Hoạt động' : 'Đang ẩn'}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex gap-1.5">
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
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-3.5">
          <Input
            label="Tên sản phẩm"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ví dụ: Áo Sơ Mi Oxford Trắng Form Regular"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <Input
            label="Mô tả sản phẩm"
            multiline
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Chất liệu, tính năng, hướng dẫn giặt ủi..."
          />

          <Checkbox
            label="Kích hoạt hiển thị sản phẩm trên cửa hàng"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          />

          <div className="flex justify-end gap-2.5 mt-4">
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
