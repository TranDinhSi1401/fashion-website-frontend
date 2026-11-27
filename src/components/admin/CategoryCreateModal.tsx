import { useState, type FormEvent } from 'react';
import { categoryService } from '../../services/categoryService';
import type { CategoryResponse } from '../../types/category';
import { extractErrorMessage } from '../../utils/format';
import { Button, Checkbox, Input, Modal, Select } from '../ui';

interface CategoryCreateModalProps {
  categories: CategoryResponse[];
  onClose: () => void;
  onCreated: (category: CategoryResponse) => void;
}

export default function CategoryCreateModal({ categories, onClose, onCreated }: CategoryCreateModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    if (!name) {
      setError('Nhập tên danh mục.');
      return;
    }

    setError('');
    setSaving(true);
    try {
      const { data } = await categoryService.createCategory({
        name,
        slug: String(form.get('slug') ?? '').trim() || undefined,
        parentId: Number(form.get('parentId')) || null,
        isActive: form.has('isActive'),
      });
      onCreated(data);
    } catch (reason) {
      setError(extractErrorMessage(reason, 'Chưa thể thêm danh mục. Vui lòng thử lại.'));
      setSaving(false);
    }
  }

  return (
    <Modal isOpen title="Thêm danh mục" maxWidth="480px" onClose={() => { if (!saving) onClose(); }}>
      <form onSubmit={submit}>
        <fieldset disabled={saving} className="flex min-w-0 flex-col gap-4">
          <Input label="Tên danh mục" name="name" required maxLength={100} />
          <Input label="Slug (tùy chọn)" name="slug" maxLength={100} placeholder="ao-khoac" />
          <Select
            label="Danh mục cha"
            name="parentId"
            options={[
              { value: '', label: 'Danh mục cấp cao nhất' },
              ...categories.map(category => ({ value: category.id, label: category.name })),
            ]}
          />
          <Checkbox label="Hiển thị trên cửa hàng" name="isActive" defaultChecked />
          {error && <p role="alert" className="text-sm text-status-error">{error}</p>}
        </fieldset>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="submit" loading={saving}>Thêm danh mục</Button>
        </div>
      </form>
    </Modal>
  );
}
