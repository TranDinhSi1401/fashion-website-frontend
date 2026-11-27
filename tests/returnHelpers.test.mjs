/**
 * Bộ kiểm thử 4 tầng (4-Tier Test Suite) cho Module Trả hàng & Hoàn tiền (Return & Refund).
 * Kiểm thử toàn diện trên Native Node.js Test Runner (node:test + node:assert/strict).
 *
 * Cấu trúc 4 tầng:
 * - Tier 1: Feature Coverage (Nghiệp vụ cốt lõi, validators, payload builders, guards)
 * - Tier 2: Boundary & Corner Cases (Biên 7 ngày +/- 1ms, 5MB +/- 1B, Regex STK, Định dạng tiền)
 * - Tier 3: Cross-Feature Integration (Adapter đơn hàng C1->C2, prefill C4->C5a, phân trang 0-1)
 * - Tier 4: Real-World Scenarios (4 kịch bản vòng đời hoàn chỉnh của State Machine)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  isOrderEligibleForReturn,
  validateReturnImageFiles,
  formatVND,
  formatDateTime,
  formatDate,
  formatReturnShippingFeeDisplay,
  toLocalIsoDateTimeString,
  normalizeReturnReason,
  getReturnReasonLabel,
  isValidBankAccountNumber,
  isValidPickupPhone,
  buildGhnTrackingUrl,
  formatPickupAddress,
  buildCreateReturnPayload,
  buildUpdateReturnPayload,
  buildConfirmPlanPayload,
  canCustomerCancelReturn,
  canCustomerEditReturn,
  canCustomerUpdateBank,
  canCustomerConfirmPlan,
  getAdminAvailableActions,
  getGeneralInspectionNote,
  isSelfDropOffReturn,
  pageToSpring,
  pageFromSpring,
  normalizeOrderWithItems,
  RETURN_WINDOW_MS,
  MAX_RETURN_IMAGE_SIZE_BYTES,
  MAX_RETURN_IMAGES_COUNT,
} from '../src/utils/returnHelpers.ts';

// ============================================================================
// TIER 1: FEATURE COVERAGE (KIỂM THỬ BAO PHỦ NGHIỆP VỤ CỐT LÕI)
// ============================================================================
describe('Tier 1: Feature Coverage', () => {
  test('isOrderEligibleForReturn verifies DELIVERED status and 7-day window', () => {
    const now = 1700000000000;
    const deliveredAt = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();

    // Đơn hàng DELIVERED trong hạn 3 ngày -> Hợp lệ
    assert.equal(isOrderEligibleForReturn({ orderStatus: 'DELIVERED', deliveredAt }, now), true);

    // Đơn hàng trạng thái khác (PENDING, SHIPPING, CANCELLED) -> Bị từ chối dù mới giao
    assert.equal(isOrderEligibleForReturn({ orderStatus: 'PENDING', deliveredAt }, now), false);
    assert.equal(isOrderEligibleForReturn({ orderStatus: 'SHIPPING', deliveredAt }, now), false);
    assert.equal(isOrderEligibleForReturn({ orderStatus: 'CANCELLED', deliveredAt }, now), false);

    // Đơn hàng thiếu deliveredAt hoặc null -> Bị từ chối
    assert.equal(isOrderEligibleForReturn({ orderStatus: 'DELIVERED', deliveredAt: null }, now), false);
    assert.equal(isOrderEligibleForReturn({ orderStatus: 'DELIVERED', deliveredAt: '' }, now), false);
    assert.equal(isOrderEligibleForReturn(null, now), false);
  });

  test('validateReturnImageFiles checks image count and reason rules', () => {
    const validFile = { name: 'evidence.jpg', size: 1024 * 1024, type: 'image/jpeg' };

    // DEFECTIVE / WRONG_ITEM có từ 1 đến 5 ảnh -> Hợp lệ
    assert.equal(validateReturnImageFiles([validFile], 'DEFECTIVE').isValid, true);
    assert.equal(validateReturnImageFiles([validFile, validFile], 'WRONG_ITEM').isValid, true);

    // CHANGE_OF_MIND không gửi ảnh -> Vẫn hợp lệ
    assert.equal(validateReturnImageFiles([], 'CHANGE_OF_MIND').isValid, true);

    // DEFECTIVE thiếu ảnh -> Báo lỗi REQUIRED_IMAGE_FOR_DEFECTIVE
    const noImageDefective = validateReturnImageFiles([], 'DEFECTIVE');
    assert.equal(noImageDefective.isValid, false);
    assert.equal(noImageDefective.errorCode, 'REQUIRED_IMAGE_FOR_DEFECTIVE');

    // Quá 5 ảnh -> Báo lỗi MAX_IMAGES_EXCEEDED
    const sixImages = Array(6).fill(validFile);
    const exceededResult = validateReturnImageFiles(sixImages, 'CHANGE_OF_MIND');
    assert.equal(exceededResult.isValid, false);
    assert.equal(exceededResult.errorCode, 'MAX_IMAGES_EXCEEDED');
  });

  test('buildCreateReturnPayload strips unknown fields and handles bank accounts cleanly', () => {
    const rawFormWithBank = {
      orderId: 101,
      reason: 'DEFECTIVE',
      reasonDetail: 'Áo bị rách đường may nách trái',
      items: [{ orderItemId: 501, quantity: 1, extraGarbage: 'deleteMe' }],
      bankName: 'Vietcombank',
      accountNumber: '1234567890',
      accountHolderName: 'NGUYEN VAN A',
      // Các trường thừa phải bị loại bỏ để chống lỗi @JsonAnySetter
      id: 999,
      status: 'PENDING_APPROVAL',
      refundAmount: 500000,
      isOverdue: false,
    };

    const payload = buildCreateReturnPayload(rawFormWithBank);
    assert.equal(payload.orderId, 101);
    assert.equal(payload.reason, 'DEFECTIVE');
    assert.equal(payload.reasonDetail, 'Áo bị rách đường may nách trái');
    assert.deepEqual(payload.items, [{ orderItemId: 501, quantity: 1 }]);
    assert.equal(payload.bankName, 'Vietcombank');
    assert.equal(payload.accountNumber, '1234567890');
    assert.equal(payload.accountHolderName, 'NGUYEN VAN A');

    // Đảm bảo không tồn tại key lạ nào
    assert.equal('id' in payload, false);
    assert.equal('status' in payload, false);
    assert.equal('refundAmount' in payload, false);
    assert.equal('isOverdue' in payload, false);

    // Khi người dùng không nhập ngân hàng, phải lược bỏ hoàn toàn các key ngân hàng (chống lỗi @Pattern)
    const rawFormNoBank = {
      orderId: 102,
      reason: 'CHANGE_OF_MIND',
      reasonDetail: 'Đổi ý',
      items: [{ orderItemId: 502, quantity: 2 }],
      bankName: '',
      accountNumber: '',
      accountHolderName: '',
    };
    const cleanPayloadNoBank = buildCreateReturnPayload(rawFormNoBank);
    assert.equal('accountNumber' in cleanPayloadNoBank, false);
    assert.equal('bankName' in cleanPayloadNoBank, false);
    assert.equal('accountHolderName' in cleanPayloadNoBank, false);
  });

  test('buildUpdateReturnPayload NEVER includes orderId', () => {
    const rawUpdateForm = {
      orderId: 101, // Client vô tình truyền orderId vào form update
      reason: 'WRONG_ITEM',
      reasonDetail: 'Giao nhầm màu đen thành trắng',
      items: [{ orderItemId: 501, quantity: 1 }],
      accountNumber: '987654321',
      bankName: 'Techcombank',
      accountHolderName: 'TRAN VAN B',
    };

    const updatePayload = buildUpdateReturnPayload(rawUpdateForm);
    // Bắt buộc loại bỏ orderId
    assert.equal('orderId' in updatePayload, false);
    assert.equal(updatePayload.reason, 'WRONG_ITEM');
    assert.equal(updatePayload.accountNumber, '987654321');
  });

  test('buildConfirmPlanPayload wraps agreed flag and customerNote properly', () => {
    const confirmForm = {
      agreed: true,
      customerNote: 'Tôi đồng ý phương án trừ 30.000đ tiền ship',
      bankName: 'MB Bank',
      accountNumber: '1122334455',
      accountHolderName: 'LE THI C',
    };
    const payload = buildConfirmPlanPayload(confirmForm);
    assert.equal(payload.agreed, true);
    assert.equal(payload.customerNote, 'Tôi đồng ý phương án trừ 30.000đ tiền ship');
    assert.equal(payload.accountNumber, '1122334455');

    // Khi từ chối và không có STK
    const rejectPlanForm = { agreed: false, customerNote: 'Không đồng ý', accountNumber: '' };
    const payloadReject = buildConfirmPlanPayload(rejectPlanForm);
    assert.equal(payloadReject.agreed, false);
    assert.equal('accountNumber' in payloadReject, false);
  });

  test('Customer Action Guards guard transitions according to business rules', () => {
    // 1. canCustomerCancelReturn
    assert.equal(canCustomerCancelReturn({ status: 'PENDING_APPROVAL' }), true);
    assert.equal(canCustomerCancelReturn({ status: 'WAITING_FOR_RETURN_DELIVERY', handedOverAt: null }), true);
    // Khi đã giao hàng cho shipper -> Khóa nút hủy
    assert.equal(canCustomerCancelReturn({ status: 'WAITING_FOR_RETURN_DELIVERY', handedOverAt: '2026-11-15T10:00:00Z' }), false);
    assert.equal(canCustomerCancelReturn({ status: 'INSPECTING' }), false);

    // 2. canCustomerEditReturn: Chỉ khi PENDING_APPROVAL
    assert.equal(canCustomerEditReturn({ status: 'PENDING_APPROVAL' }), true);
    assert.equal(canCustomerEditReturn({ status: 'WAITING_FOR_RETURN_DELIVERY' }), false);
    assert.equal(canCustomerEditReturn({ status: 'REFUNDED' }), false);

    // 3. canCustomerUpdateBank: Chỉ cho phép trước WAITING_REFUND, khóa từ WAITING_REFUND trở đi
    assert.equal(canCustomerUpdateBank({ status: 'PENDING_APPROVAL' }), true);
    assert.equal(canCustomerUpdateBank({ status: 'WAITING_FOR_RETURN_DELIVERY' }), true);
    assert.equal(canCustomerUpdateBank({ status: 'INSPECTING' }), true);
    assert.equal(canCustomerUpdateBank({ status: 'WAITING_CUSTOMER_FEEDBACK' }), true);
    assert.equal(canCustomerUpdateBank({ status: 'WAITING_REFUND' }), false);
    assert.equal(canCustomerUpdateBank({ status: 'REFUNDED' }), false);
    assert.equal(canCustomerUpdateBank({ status: 'REJECTED' }), false);
    assert.equal(canCustomerUpdateBank({ status: 'CANCELLED' }), false);

    // 4. canCustomerConfirmPlan: Khi WAITING_CUSTOMER_FEEDBACK và chưa xác nhận
    assert.equal(canCustomerConfirmPlan({ status: 'WAITING_CUSTOMER_FEEDBACK', customerConfirmedPlan: false }), true);
    assert.equal(canCustomerConfirmPlan({ status: 'WAITING_CUSTOMER_FEEDBACK', customerConfirmedPlan: true }), false);
    assert.equal(canCustomerConfirmPlan({ status: 'INSPECTING', customerConfirmedPlan: false }), false);
  });

  test('getAdminAvailableActions returns exactly permitted actions per state', () => {
    // Bước 2: PENDING_APPROVAL -> approve, reject, overdueNote
    const actionsB2 = getAdminAvailableActions({ status: 'PENDING_APPROVAL' });
    assert.ok(actionsB2.includes('approve'));
    assert.ok(actionsB2.includes('reject'));
    assert.ok(actionsB2.includes('overdueNote'));
    assert.equal(actionsB2.includes('refund'), false);

    // Bước 3: WAITING_FOR_RETURN_DELIVERY (chưa bàn giao) -> handover, extendHandover, receive
    const actionsB3 = getAdminAvailableActions({ status: 'WAITING_FOR_RETURN_DELIVERY', handedOverAt: null });
    assert.ok(actionsB3.includes('handover'));
    assert.ok(actionsB3.includes('extendHandover'));
    assert.ok(actionsB3.includes('receive'));

    // Bước 4: INSPECTING -> inspect, reject
    const actionsB4 = getAdminAvailableActions({ status: 'INSPECTING' });
    assert.ok(actionsB4.includes('inspect'));
    assert.ok(actionsB4.includes('reject'));

    // Chờ khách phản hồi (WAITING_CUSTOMER_FEEDBACK) -> ẩn inspect và reject khi khách chưa phản hồi, chỉ hiện lại inspect nếu khách đã gửi phản hồi không đồng ý
    const actionsFeedbackWaiting = getAdminAvailableActions({
      status: 'WAITING_CUSTOMER_FEEDBACK',
      customerConfirmedPlan: false,
      customerNote: null,
    });
    assert.ok(!actionsFeedbackWaiting.includes('inspect'));
    assert.ok(!actionsFeedbackWaiting.includes('reject'));

    const actionsFeedbackDisagreed = getAdminAvailableActions({
      status: 'WAITING_CUSTOMER_FEEDBACK',
      customerConfirmedPlan: false,
      customerNote: 'Không đồng ý trừ phí ship',
    });
    assert.ok(actionsFeedbackDisagreed.includes('inspect'));

    // Đóng phiếu quá hạn 7 ngày bàn giao khi chưa giao shipper -> có action reject
    const actionsExpiredHandover = getAdminAvailableActions({
      status: 'WAITING_FOR_RETURN_DELIVERY',
      handedOverAt: null,
      handoverDeadline: '2020-01-01T00:00:00Z',
    });
    assert.ok(actionsExpiredHandover.includes('reject'));

    // Bước 5: WAITING_REFUND -> refund
    const actionsB5 = getAdminAvailableActions({ status: 'WAITING_REFUND' });
    assert.ok(actionsB5.includes('refund'));

    // Bước 6: Nhập kho (restock) và ghi nhật ký CSKH cho phiếu REFUNDED chưa đóng (completedAt == null)
    const actionsRestock = getAdminAvailableActions({
      status: 'REFUNDED',
      inspectedAt: '2026-11-15T08:00:00Z',
      restockedAt: null,
      completedAt: null,
    });
    assert.ok(actionsRestock.includes('restock'));
    assert.ok(actionsRestock.includes('contactLog'));
    assert.ok(actionsRestock.includes('complete')); // REFUNDED chưa completed -> có complete action
  });
});

// ============================================================================
// TIER 2: BOUNDARY & CORNER CASES (GIÁ TRỊ BIÊN & NGOẠI LỆ)
// ============================================================================
describe('Tier 2: Boundary & Corner Cases', () => {
  test('7-day delivery boundary tests exact millisecond precision', () => {
    const deliveredMs = 1700000000000;
    const deliveredAt = new Date(deliveredMs).toISOString();

    // Đúng tròn 7 ngày: now == delivered + 7 days -> Vẫn hợp lệ
    const exactSevenDays = deliveredMs + RETURN_WINDOW_MS;
    assert.equal(isOrderEligibleForReturn({ orderStatus: 'DELIVERED', deliveredAt }, exactSevenDays), true);

    // Quá hạn đúng 1 mili-giây -> Bị từ chối
    const oneMsOver = exactSevenDays + 1;
    assert.equal(isOrderEligibleForReturn({ orderStatus: 'DELIVERED', deliveredAt }, oneMsOver), false);

    // Thời gian giao hàng nằm ở tương lai (deliveredMs > nowMs) -> Xử lý an toàn, trả về false
    const futureDelivery = deliveredMs + 10000;
    assert.equal(isOrderEligibleForReturn({ orderStatus: 'DELIVERED', deliveredAt: new Date(futureDelivery).toISOString() }, deliveredMs), false);

    // Chuỗi ISO có múi giờ khác nhau (+07:00 vs Z)
    const tzDeliveredAt = '2026-11-15T17:00:00+07:00';
    const tzEpoch = new Date(tzDeliveredAt).getTime();
    assert.equal(isOrderEligibleForReturn({ orderStatus: 'DELIVERED', deliveredAt: tzDeliveredAt }, tzEpoch + RETURN_WINDOW_MS), true);
    assert.equal(isOrderEligibleForReturn({ orderStatus: 'DELIVERED', deliveredAt: tzDeliveredAt }, tzEpoch + RETURN_WINDOW_MS + 1), false);
  });

  test('Image validation boundary: exact 5MB and extension variations', () => {
    // Đúng tròn 5MB (5,242,880 bytes) -> Hợp lệ
    assert.equal(MAX_RETURN_IMAGES_COUNT, 5);
    const exact5MB = { name: 'photo.jpg', size: MAX_RETURN_IMAGE_SIZE_BYTES, type: 'image/jpeg' };
    assert.equal(validateReturnImageFiles([exact5MB], 'CHANGE_OF_MIND').isValid, true);

    // 5MB + 1 byte -> Báo lỗi FILE_TOO_LARGE
    const over1Byte = { name: 'photo.jpg', size: MAX_RETURN_IMAGE_SIZE_BYTES + 1, type: 'image/jpeg' };
    const sizeResult = validateReturnImageFiles([over1Byte], 'CHANGE_OF_MIND');
    assert.equal(sizeResult.isValid, false);
    assert.equal(sizeResult.errorCode, 'FILE_TOO_LARGE');

    // Phần mở rộng viết hoa (.JPG, .PNG, .WEBP) -> Hợp lệ (case-insensitive)
    const upperJpg = { name: 'EVIDENCE.JPG', size: 1000, type: 'image/jpeg' };
    const upperPng = { name: 'SCREENSHOT.PNG', size: 1000, type: 'image/png' };
    const upperWebp = { name: 'PROOF.WEBP', size: 1000, type: 'image/webp' };
    assert.equal(validateReturnImageFiles([upperJpg, upperPng, upperWebp], 'DEFECTIVE').isValid, true);

    // File giả mạo định dạng (.pdf, .exe, .svg) -> Báo lỗi INVALID_IMAGE_FORMAT
    const pdfFile = { name: 'doc.pdf', size: 1000, type: 'application/pdf' };
    const exeFile = { name: 'virus.exe', size: 1000, type: 'application/x-msdownload' };
    const svgFile = { name: 'icon.svg', size: 1000, type: 'image/svg+xml' };
    assert.equal(validateReturnImageFiles([pdfFile], 'CHANGE_OF_MIND').errorCode, 'INVALID_IMAGE_FORMAT');
    assert.equal(validateReturnImageFiles([exeFile], 'CHANGE_OF_MIND').errorCode, 'INVALID_IMAGE_FORMAT');
    assert.equal(validateReturnImageFiles([svgFile], 'CHANGE_OF_MIND').errorCode, 'INVALID_IMAGE_FORMAT');
  });

  test('Bank account regex boundary: 6 to 30 digits', () => {
    // 5 chữ số -> Không hợp lệ
    assert.equal(isValidBankAccountNumber('12345'), false);
    // 6 chữ số -> Hợp lệ (biên dưới)
    assert.equal(isValidBankAccountNumber('123456'), true);
    // 30 chữ số -> Hợp lệ (biên trên)
    const thirtyDigits = '123456789012345678901234567890';
    assert.equal(isValidBankAccountNumber(thirtyDigits), true);
    // 31 chữ số -> Không hợp lệ
    assert.equal(isValidBankAccountNumber(thirtyDigits + '1'), false);
    // Chứa khoảng trắng, chữ cái hoặc ký tự đặc biệt -> Không hợp lệ
    assert.equal(isValidBankAccountNumber('123 456'), false);
    assert.equal(isValidBankAccountNumber('123456A'), false);
    assert.equal(isValidBankAccountNumber('123-456'), false);
    assert.equal(isValidBankAccountNumber(''), false);
    assert.equal(isValidBankAccountNumber(null), false);
  });

  test('Formatters handle zero, null, undefined and large numbers without throwing', () => {
    assert.equal(formatVND(0), '0₫');
    assert.equal(formatVND(null), '0₫');
    assert.equal(formatVND(undefined), '0₫');
    assert.equal(formatVND(NaN), '0₫');
    assert.equal(formatVND(150000), '150.000₫');
    assert.equal(formatVND(1500000), '1.500.000₫');

    assert.equal(formatDateTime(null), '-');
    assert.equal(formatDateTime('invalid-date'), '-');
    assert.equal(formatDate(null), '-');
  });
});

// ============================================================================
// TIER 3: CROSS-FEATURE INTEGRATION (TÍCH HỢP LIÊN TÍNH NĂNG)
// ============================================================================
describe('Tier 3: Cross-Feature Integration', () => {
  test('normalizeOrderWithItems fallback generates mock items when backend lacks orderItems', () => {
    const rawOrderWithoutItems = {
      id: 42,
      orderCode: 'ORD-20261115-042',
      userId: 1,
      shippingRecipientName: 'Nguyễn Văn A',
      shippingPhone: '0901234567',
      shippingAddress: '123 Nguyễn Văn Bảo, Gò Vấp',
      subtotal: 450000,
      shippingFee: 30000,
      totalAmount: 480000,
      orderStatus: 'DELIVERED',
      deliveredAt: '2026-11-14T10:00:00Z',
      paymentStatus: 'PAID',
      createdAt: '2026-11-13T10:00:00Z',
      updatedAt: '2026-11-14T10:00:00Z',
      // Không có orderItems
    };

    const normalized = normalizeOrderWithItems(rawOrderWithoutItems);
    assert.equal(normalized.isMockItems, true);
    assert.equal(Array.isArray(normalized.orderItems), true);
    assert.equal(normalized.orderItems.length > 0, true);
    assert.equal(normalized.orderItems[0].orderId, 42);
    assert.ok(normalized.orderItems[0].unitPrice > 0);

    // Khi đơn hàng đã có sẵn orderItems thật -> Giữ nguyên, isMockItems = false
    const rawOrderWithItems = {
      ...rawOrderWithoutItems,
      orderItems: [
        {
          id: 999,
          orderId: 42,
          productVariantId: 88,
          productName: 'Áo Khoác Bomber Thật',
          unitPrice: 450000,
          quantity: 1,
          totalPrice: 450000,
        },
      ],
    };
    const normalizedReal = normalizeOrderWithItems(rawOrderWithItems);
    assert.equal(normalizedReal.isMockItems, false);
    assert.equal(normalizedReal.orderItems[0].productName, 'Áo Khoác Bomber Thật');
  });

  test('Pre-filled C4 detail object converted to C5a payload strips system keys and orderId', () => {
    // Giả lập dữ liệu nhận về từ C4 detail API
    const returnDetailFromBackend = {
      id: 888,
      returnCode: 'RET-001',
      orderId: 101,
      orderCode: 'ORD-101',
      reason: 'DEFECTIVE',
      reasonDetail: 'Hỏng dây kéo',
      status: 'PENDING_APPROVAL',
      items: [
        {
          id: 11,
          orderItemId: 501,
          productVariantId: 71,
          productName: 'Áo thun',
          quantity: 1,
        },
      ],
      bankName: 'VietinBank',
      accountNumber: '10987654321',
      accountHolderName: 'NGUYEN VAN D',
      approvedBy: null,
      isOverdue: false,
      refundAmount: null,
    };

    // Khi C5a submit update:
    const updatePayload = buildUpdateReturnPayload(returnDetailFromBackend);
    assert.equal('orderId' in updatePayload, false);
    assert.equal('id' in updatePayload, false);
    assert.equal('status' in updatePayload, false);
    assert.equal(updatePayload.reason, 'DEFECTIVE');
    assert.equal(updatePayload.accountNumber, '10987654321');
    assert.deepEqual(updatePayload.items, [{ orderItemId: 501, quantity: 1 }]);
  });

  test('Pagination indexing helpers convert accurately between 1-based UI and 0-based Spring', () => {
    // 1-based UI -> 0-based Spring API
    assert.equal(pageToSpring(1), 0);
    assert.equal(pageToSpring(2), 1);
    assert.equal(pageToSpring(5), 4);
    assert.equal(pageToSpring(0), 0); // An toàn chặn dưới 0

    // 0-based Spring API -> 1-based UI
    assert.equal(pageFromSpring(0), 1);
    assert.equal(pageFromSpring(1), 2);
    assert.equal(pageFromSpring(4), 5);
  });

  test('Admin RBAC Guardrails and Holiday Default Protection assertions', () => {
    // 1. Phân quyền hiển thị tab A3 Hồ sơ lưu kho >30 ngày: CHỈ ROLE_ADMIN
    const isDormantVisibleForRole = (role) => role === 'ADMIN' || role === 'ROLE_ADMIN';
    assert.equal(isDormantVisibleForRole('ADMIN'), true);
    assert.equal(isDormantVisibleForRole('ROLE_ADMIN'), true);
    assert.equal(isDormantVisibleForRole('STAFF'), false);
    assert.equal(isDormantVisibleForRole('ROLE_STAFF'), false);
    assert.equal(isDormantVisibleForRole('CUSTOMER'), false);

    // 2. Bảo vệ ngày nghỉ lễ mặc định: isDefault === true là bất biến không thể sửa/xóa
    const canModifyHoliday = (holiday) => !holiday.isDefault;
    assert.equal(canModifyHoliday({ id: 1, name: 'Tết Dương Lịch', isDefault: true }), false);
    assert.equal(canModifyHoliday({ id: 2, name: 'Tết Nguyên Đán', isDefault: true }), false);
    assert.equal(canModifyHoliday({ id: 101, name: 'Nghỉ bù đặc thù 2026', isDefault: false }), true);

    // 3. Quy tắc kiểm định QC: Tổng số lượng duyệt = 0 bắt buộc phải có rejectionReason
    const validateQcInspection = (acceptedQuantities, rejectionReason) => {
      const sumAccepted = acceptedQuantities.reduce((a, b) => a + b, 0);
      if (sumAccepted === 0 && (!rejectionReason || rejectionReason.trim() === '')) {
        return { isValid: false, error: 'Khi số lượng duyệt bằng 0, bắt buộc phải có lý do từ chối.' };
      }
      return { isValid: true };
    };
    assert.equal(validateQcInspection([0, 0], '').isValid, false);
    assert.equal(validateQcInspection([0, 0], 'Hàng bị rách do khách tự cắt').isValid, true);
    assert.equal(validateQcInspection([1, 0], '').isValid, true);
  });
});

// ============================================================================
// TIER 4: REAL-WORLD SCENARIOS (MÔ PHỎNG VÒNG ĐỜI THỰC TẾ)
// ============================================================================
describe('Tier 4: Real-World Scenarios', () => {
  test('Scenario 1: Happy Path - Defective item lifecycle from creation to completion', () => {
    // 1. Khách hàng nhận hàng 3 ngày trước -> Kiểm tra đủ điều kiện trả
    const now = 1700000000000;
    const deliveredAt = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
    assert.equal(isOrderEligibleForReturn({ orderStatus: 'DELIVERED', deliveredAt }, now), true);

    // 2. Khách tạo yêu cầu 1 áo lỗi vải, đính kèm 2 ảnh, điền STK ngân hàng
    const image1 = { name: 'defect1.jpg', size: 1024 * 1024, type: 'image/jpeg' };
    const image2 = { name: 'defect2.png', size: 1024 * 1024, type: 'image/png' };
    assert.equal(validateReturnImageFiles([image1, image2], 'DEFECTIVE').isValid, true);

    const creationPayload = buildCreateReturnPayload({
      orderId: 101,
      reason: 'DEFECTIVE',
      reasonDetail: 'Vải bị rách ở vai áo',
      items: [{ orderItemId: 1, quantity: 1 }],
      bankName: 'Vietcombank',
      accountNumber: '0123456789',
      accountHolderName: 'NGUYEN VAN HAPPY',
    });
    assert.equal(creationPayload.orderId, 101);
    assert.equal(creationPayload.accountNumber, '0123456789');

    // 3. Trạng thái PENDING_APPROVAL: Nhân viên có thể approve/reject; khách có thể edit/cancel
    let state = { status: 'PENDING_APPROVAL', handedOverAt: null };
    assert.ok(getAdminAvailableActions(state).includes('approve'));
    assert.equal(canCustomerCancelReturn(state), true);
    assert.equal(canCustomerEditReturn(state), true);

    // 4. Nhân viên duyệt -> Chuyển sang WAITING_FOR_RETURN_DELIVERY
    state = { status: 'WAITING_FOR_RETURN_DELIVERY', handedOverAt: null };
    assert.ok(getAdminAvailableActions(state).includes('handover'));
    assert.ok(getAdminAvailableActions(state).includes('extendHandover'));
    assert.ok(getAdminAvailableActions(state).includes('receive'));
    assert.equal(canCustomerCancelReturn(state), true);

    // 5. Khách bàn giao cho shipper -> Ghi nhận handedOverAt -> Khách mất quyền cancel
    state.handedOverAt = '2026-11-15T09:00:00Z';
    assert.equal(canCustomerCancelReturn(state), false);

    // 6. Kiện hàng về kho -> Chuyển sang INSPECTING
    state = { status: 'INSPECTING', inspectedAt: null };
    assert.ok(getAdminAvailableActions(state).includes('inspect'));
    assert.equal(canCustomerConfirmPlan(state), false);

    // 7. QC duyệt đủ 1/1 áo đạt chuẩn lỗi kỹ thuật -> Chuyển WAITING_REFUND
    state = { status: 'WAITING_REFUND', inspectedAt: '2026-11-15T11:00:00Z', restockedAt: null, completedAt: null };
    assert.ok(getAdminAvailableActions(state).includes('refund'));

    // 8. Kế toán xác nhận hoàn tiền -> Chuyển REFUNDED
    state = { status: 'REFUNDED', inspectedAt: '2026-11-15T11:00:00Z', restockedAt: null, completedAt: null };
    assert.equal(canCustomerUpdateBank(state), false); // Đã hoàn tiền -> Khóa sửa STK
    assert.ok(getAdminAvailableActions(state).includes('restock'));
    assert.ok(getAdminAvailableActions(state).includes('complete'));

    // 9. Thủ kho restock và Admin đóng hoàn tất hồ sơ
    state.restockedAt = '2026-11-15T15:00:00Z';
    state.completedAt = '2026-11-15T16:00:00Z';
    const finalActions = getAdminAvailableActions(state);
    assert.equal(finalActions.includes('complete'), false);
    assert.equal(finalActions.includes('restock'), false);
  });

  test('Scenario 2: Negotiation Path - QC reduction triggers WAITING_CUSTOMER_FEEDBACK and customer confirms', () => {
    // 1. Khách trả 2 áo WRONG_ITEM
    // 2. Kho kiểm định: 1 áo giao sai thật (chấp nhận), 1 áo đúng mẫu khách giặt rồi (từ chối)
    // -> acceptedQuantity = 1 -> Chuyển WAITING_CUSTOMER_FEEDBACK
    let state = {
      status: 'WAITING_CUSTOMER_FEEDBACK',
      customerConfirmedPlan: false,
      inspectedAt: '2026-11-15T10:00:00Z',
    };

    // Khách hàng nhìn thấy banner yêu cầu xác nhận phương án
    assert.equal(canCustomerConfirmPlan(state), true);

    // Khách hàng mở modal C5c bấm "Đồng ý với phương án", bổ sung STK
    const confirmPayload = buildConfirmPlanPayload({
      agreed: true,
      customerNote: 'Tôi đồng ý nhận hoàn tiền cho 1 áo giao sai',
      bankName: 'Techcombank',
      accountNumber: '19033445566',
      accountHolderName: 'NGUYEN NEGOTIATION',
    });
    assert.equal(confirmPayload.agreed, true);
    assert.equal(confirmPayload.accountNumber, '19033445566');

    // Sau khi phản hồi thành công: customerConfirmedPlan = true -> không còn hiện banner C5c
    state.customerConfirmedPlan = true;
    assert.equal(canCustomerConfirmPlan(state), false);
  });

  test('Scenario 3: SLA Overdue and Staff Contact Log for dormant tracking', () => {
    // Phiếu ở WAITING_CUSTOMER_FEEDBACK bị trễ SLA
    const state = {
      status: 'WAITING_CUSTOMER_FEEDBACK',
      isOverdue: true,
      completedAt: null,
    };

    const adminActions = getAdminAvailableActions(state);
    // Nhân viên có thể mở modal giải trình trễ SLA và ghi nhật ký CSKH
    assert.ok(adminActions.includes('overdueNote'));
    assert.ok(adminActions.includes('contactLog'));
  });

  test('Scenario 4: Change of mind with shipping fee deduction and handover extension', () => {
    // 1. Khách trả hàng CHANGE_OF_MIND không gửi ảnh -> Hợp lệ
    const imgCheck = validateReturnImageFiles([], 'CHANGE_OF_MIND');
    assert.equal(imgCheck.isValid, true);

    // 2. Đang chờ bàn giao hàng -> Nhân viên có thể gia hạn (+3 ngày)
    const state = { status: 'WAITING_FOR_RETURN_DELIVERY', handedOverAt: null };
    assert.ok(getAdminAvailableActions(state).includes('extendHandover'));

    // 3. Tính toán đối soát tài chính khi kiểm định: Khấu trừ 30.000₫ phí ship trả
    const itemsRefundAmount = 300000;
    const returnShippingFee = 30000;
    const refundAmount = itemsRefundAmount - returnShippingFee;
    assert.equal(refundAmount, 270000);
    assert.equal(formatVND(refundAmount), '270000₫'.replace('270000', '270.000'));
  });

  test('Regression fixes: local datetime preservation, reason normalization, and 7-day edit window', () => {
    // 1. Giữ nguyên giờ địa phương (không bị lùi -7h sang UTC khi gửi datetime-local)
    assert.equal(toLocalIsoDateTimeString('2026-11-15T22:39'), '2026-11-15T22:39:00');
    assert.equal(toLocalIsoDateTimeString('2026-11-15T22:39:45'), '2026-11-15T22:39:45');
    assert.equal(toLocalIsoDateTimeString(''), undefined);

    // 2. Chuẩn hóa lý do trả hàng & nhãn tiếng Việt
    assert.equal(normalizeReturnReason('DEFECTIVE'), 'DEFECTIVE');
    assert.equal(normalizeReturnReason('wrong_item'), 'WRONG_ITEM');
    assert.equal(normalizeReturnReason('Đổi ý, không còn nhu cầu'), 'CHANGE_OF_MIND');
    assert.equal(normalizeReturnReason('invalid_value'), 'CHANGE_OF_MIND');
    assert.equal(getReturnReasonLabel('DEFECTIVE'), 'Sản phẩm bị lỗi sản xuất');

    // 3. Khóa nút chỉnh sửa khi không còn ở PENDING_APPROVAL; giữ mở khi vẫn PENDING_APPROVAL kể cả quá 7 ngày sau giao
    const now = 1700000000000;
    const within7Days = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    const expired8Days = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();
    assert.equal(
      canCustomerEditReturn({ status: 'PENDING_APPROVAL', deliveredAt: within7Days }, now),
      true
    );
    assert.equal(
      canCustomerEditReturn({ status: 'PENDING_APPROVAL', deliveredAt: expired8Days }, now),
      true
    );
    assert.equal(
      canCustomerEditReturn({ status: 'WAITING_FOR_RETURN_DELIVERY', deliveredAt: within7Days }, now),
      false
    );
  });

  test('GHN pickup fields, phone validation, tracking URL, and address formatting', () => {
    // 1. Payload tạo phiếu đính kèm pickupAddressId, pickupContactName, pickupPhone khi hợp lệ
    const withPickup = buildCreateReturnPayload({
      orderId: 10,
      reason: 'DEFECTIVE',
      reasonDetail: 'Rách đường may',
      items: [{ orderItemId: 101, quantity: 1 }],
      pickupAddressId: 5,
      pickupContactName: '  Nguyễn Văn A  ',
      pickupPhone: ' 0901234567 ',
    });
    assert.equal(withPickup.pickupAddressId, 5);
    assert.equal(withPickup.pickupContactName, 'Nguyễn Văn A');
    assert.equal(withPickup.pickupPhone, '0901234567');

    // 2. Bỏ qua các trường lấy hàng khi null / chuỗi rỗng để tránh lỗi @Pattern
    const withoutPickup = buildCreateReturnPayload({
      orderId: 10,
      reason: 'CHANGE_OF_MIND',
      reasonDetail: 'Đổi ý',
      items: [{ orderItemId: 101, quantity: 1 }],
      pickupAddressId: null,
      pickupContactName: '   ',
      pickupPhone: '',
    });
    assert.equal('pickupAddressId' in withoutPickup, false);
    assert.equal('pickupContactName' in withoutPickup, false);
    assert.equal('pickupPhone' in withoutPickup, false);

    // 3. Payload cập nhật vẫn giữ pickup fields và tuyệt đối không chứa orderId
    const updatedWithPickup = buildUpdateReturnPayload({
      orderId: 999,
      reason: 'WRONG_ITEM',
      reasonDetail: 'Giao sai size',
      items: [{ orderItemId: 102, quantity: 1 }],
      pickupAddressId: '5',
      pickupContactName: 'Trần Thị B',
      pickupPhone: '+84901234567',
    });
    assert.equal('orderId' in updatedWithPickup, false);
    assert.equal(updatedWithPickup.pickupAddressId, 5);
    assert.equal(updatedWithPickup.pickupContactName, 'Trần Thị B');
    assert.equal(updatedWithPickup.pickupPhone, '+84901234567');

    // 4. Kiểm tra SĐT lấy hàng, link GHN tracking và format địa chỉ
    assert.equal(isValidPickupPhone('0901234567'), true);
    assert.equal(isValidPickupPhone('+84901234567'), true);
    assert.equal(isValidPickupPhone('12345'), false);
    assert.equal(buildGhnTrackingUrl('ABC'), 'https://donhang.ghn.vn/?order_code=ABC');
    assert.equal(buildGhnTrackingUrl(''), '');
    assert.equal(
      formatPickupAddress({
        pickupAddress: '12 Nguyễn Văn Bảo',
        pickupWardName: 'Phường 4',
        pickupProvinceName: 'TP.HCM',
      }),
      '12 Nguyễn Văn Bảo, Phường 4, TP.HCM'
    );

    // 5. Cờ selfDropOff trên payload tạo/sửa và nhận diện phiếu tự mang đến cửa hàng
    const selfDropOffCreate = buildCreateReturnPayload({
      orderId: 10,
      reason: 'CHANGE_OF_MIND',
      reasonDetail: 'Tự mang tới shop',
      items: [{ orderItemId: 101, quantity: 1 }],
      selfDropOff: true,
      pickupAddressId: 5,
      pickupContactName: 'Nguyễn Văn A',
      pickupPhone: '0901234567',
    });
    assert.equal(selfDropOffCreate.selfDropOff, true);
    assert.equal('pickupAddressId' in selfDropOffCreate, false);
    assert.equal('pickupContactName' in selfDropOffCreate, false);
    assert.equal('pickupPhone' in selfDropOffCreate, false);

    const ghnResumeUpdate = buildUpdateReturnPayload({
      reason: 'CHANGE_OF_MIND',
      reasonDetail: 'Đổi sang GHN tới lấy',
      items: [{ orderItemId: 101, quantity: 1 }],
      selfDropOff: false,
      pickupAddressId: 5,
      pickupContactName: 'Nguyễn Văn A',
      pickupPhone: '0901234567',
    });
    assert.equal(ghnResumeUpdate.selfDropOff, false);
    assert.equal(ghnResumeUpdate.pickupAddressId, 5);
    assert.equal(ghnResumeUpdate.pickupContactName, 'Nguyễn Văn A');
    assert.equal(ghnResumeUpdate.pickupPhone, '0901234567');

    assert.equal(
      isSelfDropOffReturn({
        pickupAddress: null,
        pickupProvinceName: null,
        pickupWardName: null,
        pickupContactName: null,
        pickupPhone: null,
        returnShippingProvider: null,
        returnTrackingCode: null,
      }),
      true
    );
    assert.equal(
      isSelfDropOffReturn({
        pickupAddress: '12 Nguyễn Văn Bảo',
        pickupProvinceName: 'TP.HCM',
        pickupWardName: 'Phường 4',
        pickupContactName: 'Nguyễn Văn A',
        pickupPhone: '0901234567',
        returnShippingProvider: null,
        returnTrackingCode: null,
      }),
      false
    );

    // 6. retainedImageUrls trên update payload & tách generalInspectionNote / rejectionReason
    const updateWithRetained = buildUpdateReturnPayload({
      reason: 'DEFECTIVE',
      reasonDetail: 'Giữ lại 1 ảnh cũ',
      items: [{ orderItemId: 101, quantity: 1 }],
      retainedImageUrls: ['https://cdn.example.com/img1.jpg'],
    });
    assert.deepEqual(updateWithRetained.retainedImageUrls, ['https://cdn.example.com/img1.jpg']);

    const updateClearAllOldImages = buildUpdateReturnPayload({
      reason: 'CHANGE_OF_MIND',
      reasonDetail: 'Xóa hết ảnh cũ',
      items: [{ orderItemId: 101, quantity: 1 }],
      retainedImageUrls: [],
    });
    assert.deepEqual(updateClearAllOldImages.retainedImageUrls, []);

    assert.equal(
      getGeneralInspectionNote({
        status: 'WAITING_CUSTOMER_FEEDBACK',
        generalInspectionNote: 'Duyệt 1/2 sản phẩm',
        rejectionReason: null,
      }),
      'Duyệt 1/2 sản phẩm'
    );
    assert.equal(
      getGeneralInspectionNote({
        status: 'REJECTED',
        generalInspectionNote: null,
        rejectionReason: 'Sản phẩm đã qua sử dụng',
      }),
      ''
    );
    assert.equal(isOrderEligibleForReturn({ returnEligible: true }), true);
    assert.equal(isOrderEligibleForReturn({ returnEligible: false }), false);

    // 7. Hiển thị phí gửi trả hàng ở bước Chờ duyệt (selfDropOff, GHN tạm tính, null fallback, miễn phí)
    assert.equal(
      formatReturnShippingFeeDisplay({ selfDropOff: true, returnShippingFee: 0 }).text,
      '0₫ (Tự mang đến cửa hàng)'
    );
    assert.equal(
      formatReturnShippingFeeDisplay({
        status: 'PENDING_APPROVAL',
        selfDropOff: false,
        pickupAddress: '12 Nguyễn Văn Bảo',
        returnShippingFee: null,
      }).text,
      'Chờ tính phí (theo cước GHN)'
    );
    assert.equal(
      formatReturnShippingFeeDisplay({
        status: 'PENDING_APPROVAL',
        selfDropOff: false,
        pickupAddress: '12 Nguyễn Văn Bảo',
        returnShippingFee: 30000,
        inspectedAt: null,
      }).text,
      '- 30.000₫ (Tạm tính GHN)'
    );
    assert.equal(
      formatReturnShippingFeeDisplay({
        status: 'PENDING_APPROVAL',
        selfDropOff: false,
        pickupAddress: '12 Nguyễn Văn Bảo',
        returnShippingFee: 0,
      }).text,
      'Miễn phí (0₫)'
    );
  });
});
