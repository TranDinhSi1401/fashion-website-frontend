import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Layers, Package, Search, Trash2, X } from 'lucide-react';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/categoryService';
import { ProductResponse, ProductVariant } from '../../types/product';
import { CategoryResponse } from '../../types/category';
import { OfferProductTarget } from '../../types/promotion';
import { useDebounce } from '../../hooks/useDebounce';
import { extractErrorMessage, extractProductImage, formatCurrencyVND } from '../../utils/format';
import { Badge, Button, Checkbox, Input, Modal, Pagination, Select } from '../ui';

export interface ProductPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTargets: OfferProductTarget[];
  onConfirm: (selectedTargets: OfferProductTarget[]) => void;
  title?: string;
}

function makeTargetKey(productId: number | string, variantId?: number | string | null): string {
  const pid = Number(productId);
  const vid =
    variantId !== null && variantId !== undefined && Number(variantId) > 0
      ? Number(variantId)
      : 'ALL';
  return `${pid}:${vid}`;
}

export default function ProductPickerModal({
  isOpen,
  onClose,
  selectedTargets,
  onConfirm,
  title = 'Chọn Sản Phẩm & Biến Thể Áp Dụng Khuyến Mãi',
}: ProductPickerModalProps) {
  const [allProducts, setAllProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Bộ lọc & tìm kiếm có debounce 300ms
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const debouncedKeyword = useDebounce(searchKeyword, 300);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // Phân trang trong hộp thoại chọn sản phẩm
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);

  // Danh sách sản phẩm / biến thể đang chọn tạm thời trong Modal
  const [draftTargets, setDraftTargets] = useState<OfferProductTarget[]>([]);
  // Lưu trạng thái mở rộng danh sách biến thể của từng sản phẩm
  const [expandedProductIds, setExpandedProductIds] = useState<number[]>([]);

  // Chỉ khởi tạo lại draftTargets khi Modal chuyển từ đóng sang mở
  const wasOpenRef = useRef<boolean>(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const normalized = (selectedTargets || []).map((t) => ({
        ...t,
        productId: Number(t.productId),
        productVariantId:
          t.productVariantId !== null &&
          t.productVariantId !== undefined &&
          Number(t.productVariantId) > 0
            ? Number(t.productVariantId)
            : null,
      }));
      setDraftTargets(normalized);

      const withVariants = Array.from(
        new Set(
          normalized
            .filter((t) => t.productVariantId !== null && t.productVariantId !== undefined)
            .map((t) => t.productId)
        )
      );
      setExpandedProductIds(withVariants);
      setCurrentPage(1);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, selectedTargets]);

  // Tải danh mục 1 lần khi mở hộp thoại
  useEffect(() => {
    if (!isOpen) return;
    categoryService
      .getCategories()
      .then((res) => {
        if (res?.data) setCategories(res.data);
      })
      .catch(() => {});
  }, [isOpen]);

  // Tải danh sách sản phẩm từ API (kèm sẵn danh sách variants của từng sản phẩm)
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();

    const loadProducts = async () => {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const res = await productService.getProducts(
          {
            keyword: debouncedKeyword.trim() || undefined,
            categoryId: selectedCategoryId ? Number(selectedCategoryId) : undefined,
          },
          controller.signal
        );
        setAllProducts(res?.data || []);
        setCurrentPage(1);
      } catch (err: any) {
        if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
          setErrorMsg(extractErrorMessage(err, 'Không thể tải danh sách sản phẩm.'));
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
    return () => controller.abort();
  }, [isOpen, debouncedKeyword, selectedCategoryId]);

  // Lưu cache thông tin chi tiết sản phẩm để hiển thị ở cột phải kể cả khi đổi từ khóa lọc
  const [productMap, setProductMap] = useState<Record<number, ProductResponse>>({});

  useEffect(() => {
    if (allProducts.length > 0) {
      setProductMap((prev) => {
        const next = { ...prev };
        allProducts.forEach((p) => {
          next[Number(p.id)] = p;
        });
        return next;
      });
    }
  }, [allProducts]);

  const totalElements = allProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return allProducts.slice(start, start + pageSize);
  }, [allProducts, safePage, pageSize]);

  // Tập khóa đã chọn để tra cứu O(1) và chuẩn hóa kiểu Number
  const selectedKeySet = useMemo(() => {
    return new Set(draftTargets.map((t) => makeTargetKey(t.productId, t.productVariantId)));
  }, [draftTargets]);

  const isWholeProductSelected = (productId: number) =>
    selectedKeySet.has(makeTargetKey(productId, null));

  const isVariantSelected = (productId: number, variantId: number) =>
    selectedKeySet.has(makeTargetKey(productId, variantId));

  const toggleExpandVariants = (productId: number) => {
    const pid = Number(productId);
    setExpandedProductIds((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  // Chọn / bỏ chọn áp dụng cho TOÀN BỘ sản phẩm (mọi biến thể)
  const handleToggleWholeProduct = (product: ProductResponse) => {
    const pid = Number(product.id);
    const thumb = extractProductImage(product);

    setDraftTargets((prev) => {
      const currentlyWhole = prev.some(
        (t) =>
          Number(t.productId) === pid &&
          (t.productVariantId === null || t.productVariantId === undefined)
      );

      // Xóa mọi mục hiện có của sản phẩm này (cả toàn bộ lẫn biến thể lẻ)
      const withoutProduct = prev.filter((t) => Number(t.productId) !== pid);

      if (currentlyWhole) {
        return withoutProduct;
      }

      return [
        ...withoutProduct,
        {
          productId: pid,
          productVariantId: null,
          productName: product.name,
          productBasePrice: product.basePrice,
          productImageUrl: thumb,
        },
      ];
    });
  };

  // Chọn / bỏ chọn 1 biến thể cụ thể (Màu + Size) của sản phẩm
  const handleToggleVariant = (product: ProductResponse, variant: ProductVariant) => {
    const pid = Number(product.id);
    const vid = Number(variant.id);
    const thumb = extractProductImage(product);
    const allVariants = product.variants || [];

    setDraftTargets((prev) => {
      const wasWholeSelected = prev.some(
        (t) =>
          Number(t.productId) === pid &&
          (t.productVariantId === null || t.productVariantId === undefined)
      );

      // Trường hợp 1: Đang tích "Toàn bộ sản phẩm" mà bấm vào 1 biến thể -> bỏ chọn biến thể đó, giữ các biến thể còn lại
      if (wasWholeSelected) {
        const withoutWhole = prev.filter((t) => Number(t.productId) !== pid);
        const remainingVariants: OfferProductTarget[] = allVariants
          .filter((v) => Number(v.id) !== vid)
          .map((v) => ({
            productId: pid,
            productVariantId: Number(v.id),
            productName: product.name,
            productBasePrice: product.basePrice,
            productImageUrl: thumb,
            variantColor: v.color,
            variantSize: v.size,
            variantPrice: v.price,
          }));
        return [...withoutWhole, ...remainingVariants];
      }

      const wasVariantSelected = prev.some(
        (t) =>
          Number(t.productId) === pid &&
          t.productVariantId !== null &&
          t.productVariantId !== undefined &&
          Number(t.productVariantId) === vid
      );

      // Trường hợp 2: Biến thể đang được chọn -> bỏ chọn biến thể đó
      if (wasVariantSelected) {
        return prev.filter(
          (t) =>
            !(
              Number(t.productId) === pid &&
              t.productVariantId !== null &&
              t.productVariantId !== undefined &&
              Number(t.productVariantId) === vid
            )
        );
      }

      // Trường hợp 3: Biến thể chưa được chọn -> thêm biến thể vào danh sách
      return [
        ...prev,
        {
          productId: pid,
          productVariantId: vid,
          productName: product.name,
          productBasePrice: product.basePrice,
          productImageUrl: thumb,
          variantColor: variant.color,
          variantSize: variant.size,
          variantPrice: variant.price,
        },
      ];
    });
  };

  const handleRemoveTarget = (target: OfferProductTarget) => {
    const key = makeTargetKey(target.productId, target.productVariantId);
    setDraftTargets((prev) =>
      prev.filter((t) => makeTargetKey(t.productId, t.productVariantId) !== key)
    );
  };

  const isCurrentPageAllWholeSelected =
    paginatedProducts.length > 0 &&
    paginatedProducts.every((p) => isWholeProductSelected(p.id));

  const handleToggleCurrentPage = () => {
    const pageProductIds = new Set(paginatedProducts.map((p) => Number(p.id)));
    if (isCurrentPageAllWholeSelected) {
      setDraftTargets((prev) => prev.filter((t) => !pageProductIds.has(Number(t.productId))));
    } else {
      setDraftTargets((prev) => {
        const remaining = prev.filter((t) => !pageProductIds.has(Number(t.productId)));
        const added: OfferProductTarget[] = paginatedProducts.map((p) => ({
          productId: Number(p.id),
          productVariantId: null,
          productName: p.name,
          productBasePrice: p.basePrice,
          productImageUrl: extractProductImage(p),
        }));
        return [...remaining, ...added];
      });
    }
  };

  const handleClearAll = () => {
    setDraftTargets([]);
  };

  const handleSaveSelection = () => {
    const enriched = draftTargets.map((t) => {
      const prod = productMap[Number(t.productId)];
      const variant = prod?.variants?.find((v) => Number(v.id) === Number(t.productVariantId));
      return {
        ...t,
        productId: Number(t.productId),
        productVariantId:
          t.productVariantId !== null && t.productVariantId !== undefined
            ? Number(t.productVariantId)
            : null,
        productName: t.productName || prod?.name || `Sản phẩm #${t.productId}`,
        productBasePrice: t.productBasePrice ?? prod?.basePrice,
        productImageUrl: t.productImageUrl ?? extractProductImage(prod),
        variantColor: t.variantColor ?? variant?.color ?? null,
        variantSize: t.variantSize ?? variant?.size ?? null,
        variantPrice: t.variantPrice ?? variant?.price ?? null,
      };
    });
    onConfirm(enriched);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="1020px">
      <div className="flex flex-col gap-5">
        {/* Thanh tìm kiếm & lọc sản phẩm */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-surface p-3.5 border border-line-light">
          <div className="sm:col-span-6">
            <Input
              placeholder="Tìm theo tên hoặc đường dẫn sản phẩm..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              icon={Search}
            />
          </div>
          <div className="sm:col-span-4">
            <Select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              options={[
                { value: '', label: 'Tất cả danh mục' },
                ...categories.map((cat) => ({
                  value: String(cat.id),
                  label: cat.name,
                })),
              ]}
            />
          </div>
          <div className="sm:col-span-2">
            <Select
              value={String(pageSize)}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              options={[
                { value: '6', label: '6 / trang' },
                { value: '10', label: '10 / trang' },
                { value: '15', label: '15 / trang' },
              ]}
            />
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 border-l-2 border-status-error bg-status-error/10 text-status-error text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Khung chính chia 2 cột: Danh sách sản phẩm & biến thể (trái) — Mục đã chọn (phải) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Cột trái: Danh sách sản phẩm kèm mở rộng biến thể */}
          <div className="lg:col-span-8 flex flex-col border border-line-light bg-surface-body">
            <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-line-light text-xs">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  label="Chọn toàn bộ SP trang này"
                  checked={isCurrentPageAllWholeSelected}
                  onChange={handleToggleCurrentPage}
                  disabled={paginatedProducts.length === 0}
                />
              </div>
              <span className="text-content-secondary font-medium">
                Tổng số: <strong className="text-content-primary">{totalElements}</strong> sản phẩm
              </span>
            </div>

            <div className="divide-y divide-line-light max-h-[410px] overflow-y-auto">
              {isLoading ? (
                <div className="p-10 text-center text-sm text-content-muted">
                  Đang tải danh sách sản phẩm và biến thể...
                </div>
              ) : paginatedProducts.length === 0 ? (
                <div className="p-10 text-center text-sm text-content-muted">
                  Không tìm thấy sản phẩm nào phù hợp với từ khóa.
                </div>
              ) : (
                paginatedProducts.map((product) => {
                  const pid = Number(product.id);
                  const wholeChecked = isWholeProductSelected(pid);
                  const variants = product.variants || [];
                  const selectedVariantsCount = variants.filter((v) =>
                    isVariantSelected(pid, Number(v.id))
                  ).length;
                  const isExpanded = expandedProductIds.includes(pid);
                  const thumb = extractProductImage(product);
                  const categoryName = categories.find(
                    (c) => Number(c.id) === Number(product.categoryId)
                  )?.name;

                  return (
                    <div key={pid} className="flex flex-col">
                      {/* Dòng sản phẩm cha */}
                      <div
                        className={`flex items-center justify-between gap-3 px-4 py-2.5 transition-colors ${
                          wholeChecked || selectedVariantsCount > 0
                            ? 'bg-surface'
                            : 'hover:bg-surface/60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Hộp kiểm Custom chuẩn Design System (tránh xung đột sự kiện native checkbox) */}
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={wholeChecked}
                            onClick={() => handleToggleWholeProduct(product)}
                            title="Chọn áp dụng cho toàn bộ biến thể của sản phẩm này"
                            className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm border transition-colors ${
                              wholeChecked
                                ? 'border-primary bg-primary text-content-inverse'
                                : 'border-line bg-surface-body hover:border-primary'
                            }`}
                          >
                            {wholeChecked && <Check size={12} strokeWidth={3} />}
                          </button>

                          {/* Khung ảnh tỷ lệ chuẩn 3:4 theo UI Design System */}
                          <div
                            onClick={() => handleToggleWholeProduct(product)}
                            className="w-10 aspect-[3/4] bg-surface border border-line-light overflow-hidden shrink-0 flex items-center justify-center cursor-pointer"
                          >
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={product.name}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package size={16} className="text-content-muted" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div
                              onClick={() => handleToggleWholeProduct(product)}
                              className="text-sm font-medium text-content-primary truncate cursor-pointer"
                            >
                              {product.name}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-content-muted mt-0.5">
                              <span>Mã SP: #{pid}</span>
                              {categoryName && <span>• {categoryName}</span>}
                              {wholeChecked && (
                                <Badge variant="new" className="text-[10px] py-0 px-1.5">
                                  Áp dụng toàn bộ SP
                                </Badge>
                              )}
                              {!wholeChecked && selectedVariantsCount > 0 && (
                                <Badge variant="sale" className="text-[10px] py-0 px-1.5">
                                  Đã chọn {selectedVariantsCount}/{variants.length} biến thể
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-sm font-bold text-content-primary">
                              {formatCurrencyVND(product.basePrice)}
                            </div>
                            <div className="text-[11px] text-content-muted">
                              {variants.length > 0
                                ? `${variants.length} biến thể`
                                : 'Không có biến thể lẻ'}
                            </div>
                          </div>

                          {variants.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleExpandVariants(pid)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-line bg-surface-body hover:border-primary text-xs font-semibold text-content-primary transition-colors"
                            >
                              <Layers size={13} />
                              <span>Biến thể</span>
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Khung mở rộng chọn từng biến thể (Màu sắc & Kích cỡ) */}
                      {isExpanded && variants.length > 0 && (
                        <div className="px-4 py-3 bg-surface/70 border-t border-line-light">
                          <div className="flex items-center justify-between mb-2 text-xs">
                            <span className="font-semibold text-content-secondary">
                              Chọn biến thể cụ thể (Màu / Size) để áp khuyến mãi riêng:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleWholeProduct(product)}
                              className="text-xs font-medium text-content-primary underline hover:text-accent-red"
                            >
                              {wholeChecked
                                ? 'Bỏ chọn toàn bộ SP'
                                : 'Áp dụng cho tất cả biến thể'}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {variants.map((variant) => {
                              const vid = Number(variant.id);
                              const variantChecked = wholeChecked || isVariantSelected(pid, vid);
                              return (
                                <button
                                  key={vid}
                                  type="button"
                                  role="checkbox"
                                  aria-checked={variantChecked}
                                  onClick={() => handleToggleVariant(product, variant)}
                                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 border text-left text-xs cursor-pointer transition-colors ${
                                    variantChecked
                                      ? 'border-primary bg-surface-body font-semibold'
                                      : 'border-line-light bg-surface-body/80 hover:border-line-focus'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span
                                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm border transition-colors ${
                                        variantChecked
                                          ? 'border-primary bg-primary text-content-inverse'
                                          : 'border-line bg-surface-body'
                                      }`}
                                    >
                                      {variantChecked && <Check size={12} strokeWidth={3} />}
                                    </span>
                                    <div className="truncate">
                                      <span className="text-content-primary">
                                        Màu: {variant.color} — Size: {variant.size}
                                      </span>
                                      <div className="text-[11px] font-normal text-content-muted">
                                        ID: #{vid} • Tồn kho: {variant.stockQuantity}
                                      </div>
                                    </div>
                                  </div>
                                  <span className="font-bold text-content-primary shrink-0">
                                    {formatCurrencyVND(variant.price)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Phân trang danh sách sản phẩm */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-line-light bg-surface flex items-center justify-between">
                <span className="text-xs text-content-muted">
                  Trang {safePage} / {totalPages}
                </span>
                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  onPageChange={(page) => setCurrentPage(page)}
                  className="mt-0"
                />
              </div>
            )}
          </div>

          {/* Cột phải: Danh sách sản phẩm / biến thể đã chọn */}
          <div className="lg:col-span-4 flex flex-col border border-line-light bg-surface-body">
            <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-line-light">
              <span className="text-xs font-bold uppercase tracking-wider text-content-primary">
                Đã chọn ({draftTargets.length} mục)
              </span>
              {draftTargets.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent-red hover:underline"
                >
                  <Trash2 size={13} />
                  <span>Bỏ chọn hết</span>
                </button>
              )}
            </div>

            <div className="flex-1 divide-y divide-line-light max-h-[410px] overflow-y-auto">
              {draftTargets.length === 0 ? (
                <div className="p-8 text-center text-xs text-content-muted">
                  Chưa chọn sản phẩm hoặc biến thể nào. Bạn có thể tích chọn cả sản phẩm hoặc bấm
                  nút &ldquo;Biến thể&rdquo; để chọn từng Màu / Size.
                </div>
              ) : (
                draftTargets.map((target) => {
                  const prod = productMap[Number(target.productId)];
                  const variant = prod?.variants?.find(
                    (v) => Number(v.id) === Number(target.productVariantId)
                  );
                  const thumb = target.productImageUrl || extractProductImage(prod);
                  const key = makeTargetKey(target.productId, target.productVariantId);
                  const isVariantLevel =
                    target.productVariantId !== null && target.productVariantId !== undefined;

                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-2.5 px-3.5 py-2.5 hover:bg-surface/60"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 aspect-[3/4] bg-surface border border-line-light overflow-hidden shrink-0 flex items-center justify-center">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={target.productName || prod?.name || `#${target.productId}`}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package size={14} className="text-content-muted" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-content-primary truncate">
                            {target.productName || prod?.name || `Sản phẩm #${target.productId}`}
                          </div>
                          {isVariantLevel ? (
                            <div className="text-[11px] font-medium text-accent-red mt-0.5">
                              Biến thể: Màu {target.variantColor || variant?.color || '—'} • Size{' '}
                              {target.variantSize || variant?.size || '—'} (
                              {formatCurrencyVND(
                                target.variantPrice ?? variant?.price ?? prod?.basePrice ?? 0
                              )}
                              )
                            </div>
                          ) : (
                            <div className="text-[11px] text-content-muted mt-0.5">
                              Toàn bộ biến thể •{' '}
                              {formatCurrencyVND(target.productBasePrice ?? prod?.basePrice ?? 0)}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTarget(target)}
                        aria-label="Bỏ chọn"
                        className="p-1 text-content-muted hover:text-status-error transition-colors shrink-0"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer xác nhận */}
        <div className="flex items-center justify-between pt-3 border-t border-line-light">
          <div className="text-xs text-content-secondary">
            Đã chọn <strong className="text-content-primary">{draftTargets.length}</strong> mục sản
            phẩm / biến thể
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="secondary" onClick={onClose}>
              Hủy
            </Button>
            <Button variant="primary" icon={Check} onClick={handleSaveSelection}>
              Xác Nhận ({draftTargets.length} Mục)
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
