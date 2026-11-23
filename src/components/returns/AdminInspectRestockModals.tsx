/**
 * Module định nghĩa 2 Modal tác vụ kích thước lớn (920px quick-view) phục vụ kiểm định chất lượng và phân loại nhập kho:
 * 1. ReturnInspectModal (Modal 10): Kiểm định chất lượng thực tế (QC), đối soát tiền hoàn & phí ship thời gian thực.
 * 2. ReturnRestockModal (Modal 11): Phân loại và nhập lại kho bán cho các sản phẩm đạt chuẩn.
 *
 * TUÂN THỦ NGHIÊM NGẶT THIẾT KẾ VÀ QUY TẮC NGHIỆP VỤ:
 * - Modal rộng 920px (size="quick-view").
 * - Preview tính toán hoàn tiền realtime (itemsRefundAmount, returnShippingFee, netRefundAmount).
 * - Khóa ô phí ship returnShippingFee = 0 trừ khi tick "Khách đổi ý" hoặc lý do ban đầu là CHANGE_OF_MIND.
 * - Bắt buộc nhập lý do từ chối nếu tổng số lượng được duyệt sum(acceptedQuantity) === 0.
 * - Bắt buộc số lượng nhập kho restockQuantity không vượt quá acceptedQuantity (0..acceptedQuantity).
 */

import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  PackageCheck,
  AlertCircle,
  Info,
  DollarSign,
} from 'lucide-react';
import type {
  ReturnRequestResponse,
  ReturnRequestInspectRequest,
  ReturnRequestRestockRequest,
} from '../../types/return';
import { returnAdminService } from '../../services/returnAdminService';
import { orderService } from '../../services/orderService';
import { formatVND, getReturnReasonLabel } from '../../utils/returnHelpers';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Checkbox from '../ui/Checkbox';

// ============================================================================
// 1. MODAL 10: KIỂM ĐỊNH CHẤT LƯỢNG QC (RETURN INSPECT MODAL - 920PX)
// ============================================================================

export interface ReturnInspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRequest: ReturnRequestResponse;
  onSuccess: () => void;
}

interface ItemInspectFormState {
  itemId: number;
  productName: string;
  variantInfo?: string;
  maxQuantity: number;
  acceptedQuantity: number;
  unitRefundAmount: number;
  inspectionNote: string;
}

/**
 * Chức năng: Modal kiểm định chất lượng sản phẩm (QC) với bảng 920px, đối soát tiền hoàn và phí vận chuyển (Bước 4).
 *
 * @param props Đầu vào: Thuộc tính điều khiển hiển thị và thông tin phiếu trả hàng.
 * @returns Đầu ra: Thẻ JSX Modal kiểm định QC.
 */
export function ReturnInspectModal({
  isOpen,
  onClose,
  returnRequest,
  onSuccess,
}: ReturnInspectModalProps) {
  const [items, setItems] = useState<ItemInspectFormState[]>([]);
  const [reclassifyToChangeOfMind, setReclassifyToChangeOfMind] = useState<boolean>(false);
  const [returnShippingFee, setReturnShippingFee] = useState<number>(0);
  const [isFeeDirty, setIsFeeDirty] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const isInitialChangeOfMind = returnRequest.reason === 'CHANGE_OF_MIND';
  const isShippingFeeEditable = reclassifyToChangeOfMind || isInitialChangeOfMind;

  // Khởi tạo state khi mở modal và tự động tra cứu đơn giá gốc từ đơn hàng nếu phiếu chưa có itemRefundAmount
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    const rawItems = returnRequest.items || [];
    const totalQty = rawItems.reduce((sum, item) => sum + item.quantity, 0);

    const buildInitialItems = (orderPriceMap?: Record<number, number>): ItemInspectFormState[] =>
      rawItems.map((it) => {
        // Ưu tiên đơn giá từ dữ liệu item hoặc đơn hàng gốc, sau đó mới tính theo tỷ lệ
        let unitRefund = 0;
        const itemUnitPrice = (it as { unitPrice?: number; price?: number }).unitPrice ?? (it as { price?: number }).price;
        if (typeof itemUnitPrice === 'number' && itemUnitPrice > 0) {
          unitRefund = Math.round(itemUnitPrice);
        } else if (orderPriceMap && orderPriceMap[it.orderItemId] > 0) {
          unitRefund = Math.round(orderPriceMap[it.orderItemId]);
        } else if (it.itemRefundAmount && it.quantity > 0) {
          unitRefund = Math.round(it.itemRefundAmount / it.quantity);
        } else if (returnRequest.refundAmount && totalQty > 0) {
          unitRefund = Math.round(returnRequest.refundAmount / totalQty);
        }

        return {
          itemId: it.id,
          productName: it.productName,
          variantInfo: it.variantInfo,
          maxQuantity: it.quantity,
          acceptedQuantity: it.acceptedQuantity ?? it.quantity,
          unitRefundAmount: unitRefund,
          inspectionNote: it.inspectionNote || '',
        };
      });

    const initialItems = buildInitialItems();
    setItems(initialItems);
    setReclassifyToChangeOfMind(Boolean(returnRequest.proposedChangeOfMind));
    setReturnShippingFee(returnRequest.returnShippingFee ?? 0);
    setIsFeeDirty(false);
    setRejectionReason(returnRequest.rejectionReason || '');
    setErrorMessage('');
    setIsSubmitting(false);

    // Nếu phiếu chưa có đơn giá (thường gặp trước bước QC đầu tiên), thử lấy đơn giá từ đơn hàng gốc
    const needsOrderLookup = initialItems.some((it) => it.unitRefundAmount === 0) && Boolean(returnRequest.orderId);
    if (needsOrderLookup) {
      orderService
        .getOrderById(returnRequest.orderId)
        .then((order) => {
          if (!isMounted || !order?.orderItems?.length) return;
          const priceMap: Record<number, number> = {};
          order.orderItems.forEach((oi) => {
            if (oi.unitPrice > 0) {
              priceMap[oi.id] = oi.unitPrice;
            } else if (oi.totalPrice > 0 && oi.quantity > 0) {
              priceMap[oi.id] = Math.round(oi.totalPrice / oi.quantity);
            }
          });
          setItems((prev) =>
            prev.map((curr) => {
              if (curr.unitRefundAmount > 0) return curr;
              const matchedItem = rawItems.find((ri) => ri.id === curr.itemId);
              const matchedPrice = matchedItem ? priceMap[matchedItem.orderItemId] : 0;
              return matchedPrice > 0 ? { ...curr, unitRefundAmount: Math.round(matchedPrice) } : curr;
            })
          );
        })
        .catch(() => {
          // Bỏ qua lỗi tra cứu đơn hàng để không cản trở nhân viên kho nhập kết quả QC
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, returnRequest]);

  // Cập nhật số lượng chấp nhận của từng sản phẩm
  const handleAcceptedQtyChange = (itemId: number, rawVal: string) => {
    const num = parseInt(rawVal, 10);
    setItems((prev) =>
      prev.map((it) => {
        if (it.itemId === itemId) {
          const safeVal = isNaN(num) ? 0 : Math.max(0, Math.min(it.maxQuantity, num));
          return { ...it, acceptedQuantity: safeVal };
        }
        return it;
      })
    );
  };

  // Cập nhật ghi chú kiểm định từng món
  const handleNoteChange = (itemId: number, note: string) => {
    setItems((prev) =>
      prev.map((it) => (it.itemId === itemId ? { ...it, inspectionNote: note } : it))
    );
  };

  // Tính toán realtime số liệu tài chính
  const totalAcceptedQuantity = items.reduce((sum, it) => sum + it.acceptedQuantity, 0);
  const totalMaxQuantity = items.reduce((sum, it) => sum + it.maxQuantity, 0);
  const calculatedItemsRefund = items.reduce(
    (sum, it) => sum + it.acceptedQuantity * it.unitRefundAmount,
    0
  );
  const effectiveShippingFee = isShippingFeeEditable ? returnShippingFee : 0;
  const calculatedNetRefund = Math.max(0, calculatedItemsRefund - effectiveShippingFee);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Ràng buộc nghiệp vụ: Nếu từ chối toàn bộ sản phẩm (acceptedQuantity = 0), bắt buộc phải có lý do từ chối
    if (totalAcceptedQuantity === 0 && !rejectionReason.trim()) {
      setErrorMessage(
        'Bạn đã duyệt 0 sản phẩm hợp lệ. Bắt buộc phải nhập lý do từ chối yêu cầu trả hàng.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload: ReturnRequestInspectRequest = {
        items: items.map((it) => ({
          returnRequestItemId: it.itemId,
          acceptedQuantity: it.acceptedQuantity,
          inspectionNote: it.inspectionNote.trim() || undefined,
        })),
        reclassifyToChangeOfMind: reclassifyToChangeOfMind ? true : undefined,
        // Nếu không sửa phí GHN khi được phép thu phí đổi ý, gửi null để Backend giữ nguyên phí GHN đã tính ở bước Duyệt
        returnShippingFee: !isShippingFeeEditable ? 0 : isFeeDirty ? effectiveShippingFee : null,
        rejectionReason:
          totalAcceptedQuantity === 0
            ? rejectionReason.trim()
            : rejectionReason.trim() || undefined,
      };

      await returnAdminService.inspectReturn(returnRequest.id, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu kết quả QC.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kiểm định chất lượng sản phẩm (QC Thẩm định)"
      size="quick-view"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner hướng dẫn kiểm định */}
        <div className="flex items-start gap-3 p-3.5 bg-surface border border-line-light rounded-sm">
          <ClipboardCheck size={22} className="text-content-primary shrink-0 mt-0.5" />
          <div className="text-xs text-content-primary leading-relaxed">
            <p className="font-semibold text-sm mb-0.5">
              Phiếu kiểm định: <span className="font-mono">{returnRequest.returnCode}</span> — Lý do ban đầu: {getReturnReasonLabel(returnRequest.reason)}
            </p>
            <p className="text-content-secondary">
              Nhập số lượng sản phẩm đạt chuẩn chất lượng thực tế. Nếu số lượng duyệt ít hơn yêu
              cầu của khách, hệ thống sẽ tự động chuyển trạng thái sang{' '}
              <strong>Chờ khách phản hồi</strong> để chốt phương án.
            </p>
          </div>
        </div>

        {/* Bảng danh sách sản phẩm kiểm định (Kích thước 920px) */}
        <div className="overflow-x-auto border border-line-light rounded-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface border-b border-line-light text-content-muted font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Sản phẩm</th>
                <th className="py-2.5 px-3 text-center w-24">SL Khách trả</th>
                <th className="py-2.5 px-3 text-center w-28">SL QC Duyệt</th>
                <th className="py-2.5 px-3 w-32 text-right">Đơn giá hoàn</th>
                <th className="py-2.5 px-3">Ghi chú kiểm định QC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-light">
              {items.map((it) => (
                <tr key={it.itemId} className="hover:bg-surface transition-colors">
                  <td className="py-2.5 px-3">
                    <p className="font-semibold text-content-primary text-sm line-clamp-1">
                      {it.productName}
                    </p>
                    {it.variantInfo && (
                      <p className="text-content-muted text-xs">{it.variantInfo}</p>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-center font-bold text-sm text-content-primary">
                    {it.maxQuantity}
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="number"
                      min={0}
                      max={it.maxQuantity}
                      value={it.acceptedQuantity}
                      onChange={(e) => handleAcceptedQtyChange(it.itemId, e.target.value)}
                      disabled={isSubmitting}
                      className="w-16 h-8 text-center text-sm font-bold border border-line rounded-sm bg-surface-body text-content-primary focus:border-line-focus focus:outline-none"
                    />
                  </td>

                  <td className="py-2.5 px-3 text-right font-mono text-content-secondary">
                    {formatVND(it.unitRefundAmount)}
                  </td>

                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={it.inspectionNote}
                      onChange={(e) => handleNoteChange(it.itemId, e.target.value)}
                      placeholder="Ghi chú lỗi vải, tình trạng tem mác..."
                      disabled={isSubmitting}
                      className="w-full h-8 px-2 text-xs border border-line rounded-sm bg-surface-body text-content-primary placeholder:text-content-muted focus:border-line-focus focus:outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Phân loại lại sang Đổi ý & Phí vận chuyển */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-surface border border-line-light rounded-sm">
          <div>
            <Checkbox
              id="reclassify-change-of-mind"
              label="Khách đổi ý (chuyển sang thu phí vận chuyển gửi trả)"
              checked={reclassifyToChangeOfMind}
              onChange={(e) => setReclassifyToChangeOfMind(e.target.checked)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-content-muted mt-1.5 ml-6">
              Chọn cờ này nếu kiểm tra thực tế sản phẩm không có lỗi sản xuất mà là do khách hàng
              thay đổi ý định, cần trừ phí vận chuyển vào tiền hoàn.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-content-primary mb-1">
              Phí vận chuyển hoàn hàng (VND):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={1000}
                value={effectiveShippingFee}
                onChange={(e) => {
                  setReturnShippingFee(Math.max(0, parseInt(e.target.value, 10) || 0));
                  setIsFeeDirty(true);
                }}
                disabled={!isShippingFeeEditable || isSubmitting}
                className="h-9 w-full rounded-sm border border-line bg-surface-body px-3 text-sm font-mono text-content-primary disabled:bg-surface-disabled disabled:text-content-disabled focus:border-line-focus focus:outline-none"
              />
              <span className="text-xs text-content-muted shrink-0">
                {isShippingFeeEditable ? '(Được chỉnh sửa)' : '(Bằng 0 do lỗi từ Shop)'}
              </span>
            </div>
            {typeof returnRequest.returnShippingFee === 'number' && returnRequest.returnShippingFee > 0 && (
              <p className="text-xs text-content-muted mt-1">
                Phí GHN đã tính ở bước duyệt: <strong className="text-content-primary">{formatVND(returnRequest.returnShippingFee)}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Lý do từ chối (bắt buộc nếu tổng duyệt = 0) */}
        <div>
          <label className="block text-xs font-semibold text-content-primary mb-1">
            Lý do từ chối / Ghi chú kiểm định chung{' '}
            {totalAcceptedQuantity === 0 && (
              <span className="text-status-error font-bold">
                (Bắt buộc vì tổng số lượng duyệt = 0)
              </span>
            )}
          </label>
          <Input
            value={rejectionReason}
            onChange={(e) => {
              setRejectionReason(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
            placeholder="Nhập lý do từ chối duyệt hoặc giải thích cho khách hàng..."
            disabled={isSubmitting}
          />
        </div>

        {/* Thẻ Realtime Calculation Preview */}
        <div className="p-3.5 bg-surface border border-line-light rounded-sm">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-line-light">
            <DollarSign size={16} className="text-content-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-content-primary">
              Đối soát tài chính dự tính sau kiểm định:
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-content-muted block">Số lượng duyệt:</span>
              <span className="font-bold text-sm font-mono text-content-primary">
                {totalAcceptedQuantity} / {totalMaxQuantity} món
              </span>
            </div>

            <div>
              <span className="text-content-muted block">Tiền hàng duyệt:</span>
              <span className="font-bold text-sm font-mono text-content-primary">
                {formatVND(calculatedItemsRefund)}
              </span>
            </div>

            <div>
              <span className="text-content-muted block">Khấu trừ phí ship:</span>
              <span className="font-bold text-sm font-mono text-status-error">
                - {formatVND(effectiveShippingFee)}
              </span>
            </div>

            <div>
              <span className="text-content-muted block">Thực hoàn cho khách:</span>
              <span className="font-bold text-base font-mono text-accent-red">
                {formatVND(calculatedNetRefund)}
              </span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-surface border border-line-error rounded-sm text-status-error text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-line-light">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Đóng
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Lưu Kết Quả Kiểm Định
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// 2. MODAL 11: PHÂN LOẠI NHẬP KHO (RETURN RESTOCK MODAL - 920PX)
// ============================================================================

export interface ReturnRestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRequest: ReturnRequestResponse;
  onSuccess: () => void;
}

interface ItemRestockFormState {
  itemId: number;
  productName: string;
  variantInfo?: string;
  acceptedQuantity: number;
  alreadyRestocked: number;
  remainingQuantity: number;
  restockQuantity: number;
  note: string;
}

/**
 * Chức năng: Modal phân loại và nhập lại kho bán các sản phẩm đạt chuẩn chất lượng với bảng 920px (Bước 6).
 * Hỗ trợ nhập cộng dồn nhiều đợt: mỗi đợt chỉ cho phép nhập tối đa phần số lượng còn lại.
 *
 * @param props Đầu vào: Thuộc tính điều khiển hiển thị và thông tin phiếu trả hàng.
 * @returns Đầu ra: Thẻ JSX Modal nhập kho.
 */
export function ReturnRestockModal({
  isOpen,
  onClose,
  returnRequest,
  onSuccess,
}: ReturnRestockModalProps) {
  const [items, setItems] = useState<ItemRestockFormState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // Chỉ lấy các sản phẩm có acceptedQuantity > 0 để nhập lại kho bán theo số lượng còn lại
      const restockableItems: ItemRestockFormState[] = (returnRequest.items || [])
        .filter((it) => (it.acceptedQuantity ?? 0) > 0)
        .map((it) => {
          const maxAccepted = it.acceptedQuantity ?? 0;
          const alreadyRestocked = Math.max(0, it.restockedQuantity ?? 0);
          const remainingQuantity = Math.max(0, maxAccepted - alreadyRestocked);
          return {
            itemId: it.id,
            productName: it.productName,
            variantInfo: it.variantInfo,
            acceptedQuantity: maxAccepted,
            alreadyRestocked,
            remainingQuantity,
            restockQuantity: remainingQuantity,
            note: '',
          };
        });

      setItems(restockableItems);
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen, returnRequest]);

  // Cập nhật số lượng nhập kho đợt này (bắt buộc 0 <= restockQuantity <= remainingQuantity)
  const handleRestockQtyChange = (itemId: number, rawVal: string) => {
    const num = parseInt(rawVal, 10);
    setItems((prev) =>
      prev.map((it) => {
        if (it.itemId === itemId) {
          const safeVal = isNaN(num) ? 0 : Math.max(0, Math.min(it.remainingQuantity, num));
          return { ...it, restockQuantity: safeVal };
        }
        return it;
      })
    );
  };

  const handleNoteChange = (itemId: number, note: string) => {
    setItems((prev) =>
      prev.map((it) => (it.itemId === itemId ? { ...it, note } : it))
    );
  };

  const hasRemainingItems = items.some((it) => it.remainingQuantity > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // Chỉ gửi các dòng còn số lượng cần nhập để tránh gửi vượt phần còn lại
      const itemsToSubmit = items.filter((it) => it.remainingQuantity > 0);
      const payload: ReturnRequestRestockRequest = {
        items: itemsToSubmit.map((it) => ({
          returnRequestItemId: it.itemId,
          restockQuantity: Math.max(0, Math.min(it.remainingQuantity, it.restockQuantity)),
          note: it.note.trim() || undefined,
        })),
      };

      await returnAdminService.restockReturn(returnRequest.id, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi nhập kho lại.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Phân loại và nhập lại kho bán (Restock Inventory)"
      size="quick-view"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 bg-surface border border-line-light rounded-sm">
          <PackageCheck size={22} className="text-status-success shrink-0 mt-0.5" />
          <div className="text-xs text-content-primary leading-relaxed">
            <p className="font-semibold text-sm mb-0.5">
              Nhập kho phiếu: <span className="font-mono">{returnRequest.returnCode}</span>
            </p>
            <p className="text-content-secondary">
              Phân loại số lượng sản phẩm đủ chuẩn đóng gói lại để mở bán trên website. Hệ thống
              hỗ trợ nhập cộng dồn nhiều đợt; số lượng nhập đợt này không vượt quá phần còn lại.
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="p-6 bg-surface border border-line-light rounded-sm text-center text-content-muted text-sm">
            <Info size={24} className="mx-auto mb-2 text-content-muted" />
            <p>Không có sản phẩm nào đủ điều kiện nhập kho (tất cả đã bị từ chối hoặc QC duyệt = 0).</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-line-light rounded-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface border-b border-line-light text-content-muted font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Sản phẩm</th>
                  <th className="py-2.5 px-3 text-center w-24">SL QC Đã Duyệt</th>
                  <th className="py-2.5 px-3 text-center w-20">Đã nhập</th>
                  <th className="py-2.5 px-3 text-center w-20">Còn lại</th>
                  <th className="py-2.5 px-3 text-center w-28">SL Nhập Đợt Này</th>
                  <th className="py-2.5 px-3">Ghi chú phân loại kho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-light">
                {items.map((it) => {
                  const isRowFullyRestocked = it.remainingQuantity === 0;
                  return (
                    <tr key={it.itemId} className="hover:bg-surface transition-colors">
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-content-primary text-sm line-clamp-1">
                          {it.productName}
                        </p>
                        {it.variantInfo && (
                          <p className="text-content-muted text-xs">{it.variantInfo}</p>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center font-bold text-sm text-content-primary">
                        {it.acceptedQuantity}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono text-sm text-content-secondary">
                        {it.alreadyRestocked}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-bold text-sm text-content-primary">
                        {it.remainingQuantity}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={it.remainingQuantity}
                          value={it.restockQuantity}
                          onChange={(e) => handleRestockQtyChange(it.itemId, e.target.value)}
                          disabled={isSubmitting || isRowFullyRestocked}
                          className="w-16 h-8 text-center text-sm font-bold border border-line rounded-sm bg-surface-body text-content-primary disabled:bg-surface-disabled disabled:text-content-disabled focus:border-line-focus focus:outline-none"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={it.note}
                          onChange={(e) => handleNoteChange(it.itemId, e.target.value)}
                          placeholder={
                            isRowFullyRestocked
                              ? 'Đã nhập đủ số lượng QC duyệt'
                              : 'Ví dụ: Kệ A-12, còn nguyên túi zip, đã là phẳng...'
                          }
                          disabled={isSubmitting || isRowFullyRestocked}
                          className="w-full h-8 px-2 text-xs border border-line rounded-sm bg-surface-body text-content-primary placeholder:text-content-muted disabled:bg-surface-disabled disabled:text-content-disabled focus:border-line-focus focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-surface border border-line-error rounded-sm text-status-error text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-line-light">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Đóng
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={items.length === 0 || !hasRemainingItems}
          >
            Xác Nhận Nhập Kho
          </Button>
        </div>
      </form>
    </Modal>
  );
}
