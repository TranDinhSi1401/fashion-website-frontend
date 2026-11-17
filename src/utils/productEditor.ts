import type { ProductVariantInput } from '../types/product';

export const DEFAULT_COLORS = ['Đen', 'Trắng', 'Xám', 'Be', 'Nâu', 'Xanh navy', 'Xanh dương', 'Xanh lá', 'Đỏ', 'Hồng', 'Vàng', 'Tím'];
export const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Freesize'];
export const normalizeVariantSize = (size: string) => size.trim().toUpperCase().replace(/^2XL$/, 'XXL');
export const variantKey = (v: Pick<ProductVariantInput, 'color' | 'size'>) => `${v.color.trim().toLocaleLowerCase('vi')}:${normalizeVariantSize(v.size)}`;
export function uniqueChoices(values: string[], size = false) {
  const seen = new Set<string>();
  return values.map(v => size ? normalizeVariantSize(v) : v.trim()).filter(v => {
    const key = v.toLocaleLowerCase('vi');
    if (!v || seen.has(key)) return false;
    seen.add(key); return true;
  });
}

export function newVariant(price = 0): ProductVariantInput {
  return { clientId: crypto.randomUUID(), color: '', size: '', price, stockQuantity: 0, isActive: true,
    packageWeight: 200, packageLength: 20, packageWidth: 15, packageHeight: 3 };
}

export function appendVariants(existing: ProductVariantInput[], incoming: ProductVariantInput[]) {
  const next = existing.filter(v => v.id !== undefined || v.color.trim() || v.size.trim());
  const seen = new Set(next.map(variantKey));
  for (const value of incoming) {
    const v = { ...value, color: value.color.trim(), size: normalizeVariantSize(value.size) };
    if (!v.color || !v.size || !Number.isFinite(v.price) || v.price <= 0 ||
      !Number.isInteger(v.stockQuantity) || v.stockQuantity < 0) throw new Error('Mỗi dòng cần màu, size, giá lớn hơn 0 và tồn kho nguyên không âm.');
    const key = variantKey(v);
    if (!seen.has(key)) { next.push(v); seen.add(key); }
  }
  if (next.length > 100) throw new Error('Tối đa 100 biến thể. Hãy giảm số màu hoặc size đã chọn.');
  return next;
}

export function generateVariantGrid(existing: ProductVariantInput[], colors: string[], sizes: string[], price: number, stock: number) {
  if (!colors.length || !sizes.length) throw new Error('Chọn ít nhất một màu và một size.');
  return appendVariants(existing, colors.flatMap(color => sizes.map(size => ({ ...newVariant(price), color, size, stockQuantity: stock }))));
}

export function parseVariantTable(text: string): ProductVariantInput[] {
  const lines = text.trim().split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) throw new Error('Dán các dòng màu, size, giá và tồn kho từ bảng tính.');
  const rows = lines.map(line => line.split(line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',').map(cell => cell.trim()));
  if (/^(màu|color)$/i.test(rows[0][0])) rows.shift();
  if (!rows.length) throw new Error('Bảng chưa có dòng dữ liệu.');
  return rows.map((row, index) => {
    if (row.length !== 4 || !row.every(Boolean) || !/^\d+(?:\.\d+)?$/.test(row[2]) || !/^\d+$/.test(row[3]))
      throw new Error(`Dòng ${index + 1}: cần 4 cột Màu, Size, Giá, Tồn kho; giá không có dấu phân cách hàng nghìn.`);
    return { ...newVariant(Number(row[2])), color: row[0], size: row[1], stockQuantity: Number(row[3]) };
  });
}
