/**
 * Module cung cấp các hàm thuần (Pure Helper Functions) cho quy trình Trả hàng & Hoàn tiền.
 * Đảm nhiệm kiểm tra hạn 7 ngày, kiểm tra hợp lệ file ảnh, chuẩn hóa payload loại bỏ key thừa
 * (@JsonAnySetter) và chuỗi ngân hàng rỗng (@Pattern), các Action Guards cho Khách hàng & Quản trị.
 *
 * Lưu ý quan trọng cho Node.js 24 ESM Type-Stripping:
 * - Mọi type/interface bắt buộc dùng cú pháp `import type`.
 * - Không import module có side-effect hoặc thiếu đuôi mở rộng.
 */

import type {
  ReturnReason,
  ReturnRequestCreationRequest,
  ReturnRequestUpdateRequest,
  ReturnRequestConfirmPlanRequest,
  ReturnRequestStatus,
  ReturnRequestItemRequest,
} from '../types/return.ts';
import type {
  OrderResponse,
  OrderWithItems,
  OrderItemResponse,
} from '../types/order.ts';

// ============================================================================
// 1. KIỂM TRA ĐIỀU KIỆN TRẢ HÀNG 7 NGÀY
// ============================================================================

/**
 * Số mili-giây trong 7 ngày dương lịch (7 * 24 * 60 * 60 * 1000 = 604.800.000 ms).
 */
export const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Chức năng: Kiểm tra xem một đơn hàng có thỏa mãn điều kiện yêu cầu trả hàng trong hạn 7 ngày hay không.
 * Điều kiện hợp lệ:
 * 1. Đơn hàng có trạng thái là DELIVERED (Đã giao hàng thành công).
 * 2. Thời điểm giao hàng deliveredAt không được null, rỗng, không ở tương lai, và thời gian hiện tại
 *    không vượt quá deliveredAt + 7 ngày (tính chính xác đến từng mili-giây, mốc đúng 7 ngày vẫn hợp lệ).
 *
 * @param order Đầu vào: Đối tượng đơn hàng chứa trường orderStatus và deliveredAt.
 * @param nowMs Đầu vào: Mốc thời gian hiện tại tính theo epoch mili-giây (tùy chọn, mặc định Date.now()).
 * @returns Đầu ra: true nếu đơn hàng đủ điều kiện trả; ngược lại false.
 */
export function isOrderEligibleForReturn(
  order?: { orderStatus?: string; deliveredAt?: string | null; returnEligible?: boolean } | null,
  nowMs?: number
): boolean {
  if (!order) {
    return false;
  }

  // Nếu không truyền mốc nowMs giả lập và Backend đã tính sẵn returnEligible thì ưu tiên dùng trực tiếp
  if (typeof nowMs !== 'number' && typeof order.returnEligible === 'boolean') {
    return order.returnEligible;
  }

  // 1. Đơn hàng bắt buộc phải ở trạng thái đã giao hàng (DELIVERED)
  if (order.orderStatus !== 'DELIVERED') {
    return false;
  }

  // 2. Phải có mốc thời gian giao hàng thực tế
  if (!order.deliveredAt || typeof order.deliveredAt !== 'string' || order.deliveredAt.trim() === '') {
    return false;
  }

  const deliveredTimestamp = new Date(order.deliveredAt).getTime();
  if (isNaN(deliveredTimestamp)) {
    return false;
  }

  const currentMs = typeof nowMs === 'number' ? nowMs : Date.now();

  // Không cho phép ngày giao hàng nằm ở tương lai so với thời điểm hiện tại
  if (deliveredTimestamp > currentMs) {
    return false;
  }

  // Kiểm tra cửa sổ 7 ngày: đúng mốc 7 ngày (currentMs == deliveredTimestamp + RETURN_WINDOW_MS) vẫn hợp lệ
  return currentMs <= deliveredTimestamp + RETURN_WINDOW_MS;
}

// ============================================================================
// 2. THẨM ĐỊNH TỆP ẢNH MINH CHỨNG (IMAGE VALIDATOR)
// ============================================================================

/**
 * Dung lượng tối đa cho phép của mỗi tệp ảnh minh chứng: 5 MB (5.242.880 bytes).
 */
export const MAX_RETURN_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Số lượng ảnh minh chứng tối đa cho phép gửi trong một yêu cầu: 5 ảnh.
 */
export const MAX_RETURN_IMAGES_COUNT = 5;

/**
 * Danh sách định dạng MIME type của ảnh được hệ thống chấp nhận.
 */
export const ACCEPTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

/**
 * Danh sách phần mở rộng tệp tin ảnh được chấp nhận.
 */
export const ACCEPTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * Cấu trúc đối tượng tệp tin hỗ trợ cả Browser File và Object giả lập trong Node.js unit tests.
 */
export interface ReturnImageFileLike {
  name?: string;
  size?: number;
  type?: string;
}

/**
 * Kết quả thẩm định tệp ảnh minh chứng.
 */
export interface ImageValidationResult {
  /** Cờ đánh dấu toàn bộ danh sách ảnh có hợp lệ hay không */
  isValid: boolean;
  /** Thông báo lỗi chi tiết bằng tiếng Việt */
  error?: string;
  /** Mã định danh lỗi phục vụ kiểm thử tự động */
  errorCode?:
    | 'REQUIRED_IMAGE_FOR_DEFECTIVE'
    | 'MAX_IMAGES_EXCEEDED'
    | 'FILE_TOO_LARGE'
    | 'INVALID_IMAGE_FORMAT';
}

/**
 * Chức năng: Thẩm định danh sách tệp ảnh minh chứng trước khi tải lên Cloudinary/Backend.
 * Quy tắc:
 * - Bắt buộc phải có từ 1 đến 5 ảnh minh chứng cho mọi lý do trả hàng (CHANGE_OF_MIND, DEFECTIVE, WRONG_ITEM).
 * - Mỗi ảnh phải <= 5MB và có định dạng JPG, JPEG, PNG, hoặc WebP (chặn .pdf, .exe, .svg).
 *
 * @param files  Đầu vào: Mảng các tệp ảnh cần kiểm tra.
 * @param reason Đầu vào: Lý do trả hàng (CHANGE_OF_MIND, DEFECTIVE, WRONG_ITEM).
 * @returns Đầu ra: Đối tượng ImageValidationResult với isValid, error và errorCode.
 */
export function validateReturnImageFiles(
  files: ReturnImageFileLike[],
  _reason?: ReturnReason | string
): ImageValidationResult {
  const safeFiles = Array.isArray(files) ? files : [];

  // 1. Kiểm tra số lượng ảnh tối thiểu (bắt buộc từ 1 đến 5 ảnh cho mọi lý do trả hàng)
  if (safeFiles.length === 0) {
    return {
      isValid: false,
      error: 'Vui lòng đính kèm từ 1 đến 5 ảnh minh chứng cho yêu cầu trả hàng.',
      errorCode: 'REQUIRED_IMAGE_FOR_DEFECTIVE',
    };
  }

  // 2. Kiểm tra giới hạn số lượng ảnh tối đa (không quá 5 ảnh)
  if (safeFiles.length > MAX_RETURN_IMAGES_COUNT) {
    return {
      isValid: false,
      error: `Mỗi yêu cầu chỉ được gửi tối đa ${MAX_RETURN_IMAGES_COUNT} ảnh minh chứng.`,
      errorCode: 'MAX_IMAGES_EXCEEDED',
    };
  }

  // 3. Kiểm tra từng tệp tin: dung lượng và định dạng
  for (const file of safeFiles) {
    const fileSize = typeof file.size === 'number' ? file.size : 0;
    if (fileSize > MAX_RETURN_IMAGE_SIZE_BYTES) {
      return {
        isValid: false,
        error: 'Dung lượng ảnh vượt quá giới hạn cho phép (tối đa 5MB mỗi ảnh).',
        errorCode: 'FILE_TOO_LARGE',
      };
    }

    // Kiểm tra định dạng qua MIME type và phần mở rộng (case-insensitive)
    const fileType = (file.type || '').toLowerCase();
    const fileName = (file.name || '').toLowerCase();

    const hasValidMime = ACCEPTED_IMAGE_MIME_TYPES.includes(fileType);
    const hasValidExtension = ACCEPTED_IMAGE_EXTENSIONS.some((ext) => fileName.endsWith(ext));

    // Nếu không khớp cả MIME type lẫn phần mở rộng thì coi là tệp không hợp lệ
    if (!hasValidMime && !hasValidExtension) {
      return {
        isValid: false,
        error: 'Định dạng ảnh không hợp lệ. Hệ thống chỉ hỗ trợ JPG, JPEG, PNG và WebP.',
        errorCode: 'INVALID_IMAGE_FORMAT',
      };
    }
  }

  return { isValid: true };
}

// ============================================================================
// 3. ĐỊNH DẠNG TIỀN TỆ VÀ THỜI GIAN (FORMATTERS)
// ============================================================================

/**
 * Chức năng: Định dạng số tiền sang chuẩn hiển thị tiền tệ Việt Nam Đồng (VND).
 * Ví dụ: 450000 -> "450.000₫", 0 -> "0₫", null -> "0₫".
 *
 * @param amount Đầu vào: Giá trị số tiền cần định dạng (VND).
 * @returns Đầu ra: Chuỗi định dạng có ký hiệu ₫ ở cuối.
 */
export function formatVND(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0₫';
  }
  return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
}

/**
 * Chức năng: Định dạng chuỗi ISO ngày giờ sang định dạng ngày giờ Việt Nam DD/MM/YYYY HH:mm.
 *
 * @param iso Đầu vào: Chuỗi ngày giờ ISO 8601 (ví dụ: "2026-11-15T14:30:00").
 * @returns Đầu ra: Chuỗi hiển thị dạng "15/11/2026 14:30" hoặc "-" nếu chuỗi đầu vào rỗng.
 */
export function formatDateTime(iso?: string | null): string {
  if (!iso || typeof iso !== 'string') {
    return '-';
  }
  const date = new Date(iso);
  if (isNaN(date.getTime())) {
    return '-';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Chức năng: Định dạng chuỗi ISO ngày sang định dạng DD/MM/YYYY.
 *
 * @param iso Đầu vào: Chuỗi ngày ISO (ví dụ: "2026-11-15").
 * @returns Đầu ra: Chuỗi hiển thị dạng "15/11/2026" hoặc "-".
 */
export function formatDate(iso?: string | null): string {
  if (!iso || typeof iso !== 'string') {
    return '-';
  }
  const date = new Date(iso);
  if (isNaN(date.getTime())) {
    return '-';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Chức năng: Chuyển giá trị từ input type="datetime-local" (YYYY-MM-DDTHH:mm) sang chuỗi ISO LocalDateTime
 * theo múi giờ địa phương (YYYY-MM-DDTHH:mm:ss) mà KHÔNG quy đổi sang UTC (.toISOString()),
 * tránh lệch -7 giờ khi Backend Spring Boot parse LocalDateTime.
 *
 * @param localDatetime Đầu vào: Chuỗi ngày giờ local từ input hoặc đối tượng Date.
 * @returns Đầu ra: Chuỗi YYYY-MM-DDTHH:mm:ss theo giờ địa phương, hoặc undefined nếu rỗng/không hợp lệ.
 */
export function toLocalIsoDateTimeString(localDatetime?: string | Date | null): string | undefined {
  if (!localDatetime) {
    return undefined;
  }

  if (localDatetime instanceof Date) {
    if (isNaN(localDatetime.getTime())) {
      return undefined;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${localDatetime.getFullYear()}-${pad(localDatetime.getMonth() + 1)}-${pad(localDatetime.getDate())}T${pad(localDatetime.getHours())}:${pad(localDatetime.getMinutes())}:${pad(localDatetime.getSeconds())}`;
  }

  const trimmed = localDatetime.trim();
  if (!trimmed) {
    return undefined;
  }

  // Nếu chuỗi từ input datetime-local có dạng YYYY-MM-DDTHH:mm thì bổ sung :00
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }

  // Nếu đã có đủ giây YYYY-MM-DDTHH:mm:ss thì giữ nguyên theo giờ địa phương
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    return undefined;
  }
  return toLocalIsoDateTimeString(parsed);
}

/**
 * Chức năng: Chuẩn hóa chuỗi lý do trả hàng từ API hoặc form về đúng 1 trong 3 mã enum hợp lệ.
 * Giúp đồng bộ state React với component Select, tránh lỗi hiển thị option đầu tiên nhưng gửi mã sai.
 *
 * @param reason Đầu vào: Chuỗi lý do thô cần chuẩn hóa.
 * @returns Đầu ra: Mã ReturnReason hợp lệ (mặc định CHANGE_OF_MIND nếu không khớp).
 */
export function normalizeReturnReason(reason?: string | null): ReturnReason {
  const upper = (reason || '').trim().toUpperCase();
  if (upper === 'DEFECTIVE' || upper === 'WRONG_ITEM' || upper === 'CHANGE_OF_MIND') {
    return upper as ReturnReason;
  }

  const lower = (reason || '').trim().toLowerCase();
  if (lower.includes('lỗi')) {
    return 'DEFECTIVE';
  }
  if (lower.includes('sai')) {
    return 'WRONG_ITEM';
  }
  return 'CHANGE_OF_MIND';
}

/**
 * Chức năng: Trả về nhãn tiếng Việt dễ hiểu cho lý do trả hàng thay vì mã enum tiếng Anh.
 *
 * @param reason Đầu vào: Mã lý do trả hàng.
 * @returns Đầu ra: Chuỗi mô tả lý do bằng tiếng Việt.
 */
export function getReturnReasonLabel(reason?: string | null): string {
  const normalized = normalizeReturnReason(reason);
  if (normalized === 'DEFECTIVE') {
    return 'Sản phẩm bị lỗi sản xuất';
  }
  if (normalized === 'WRONG_ITEM') {
    return 'Shop giao sai sản phẩm';
  }
  return 'Đổi ý, không còn nhu cầu';
}

// ============================================================================
// 4. KIỂM TRA ĐỊNH DẠNG SỐ TÀI KHOẢN NGÂN HÀNG
// ============================================================================

/**
 * Biểu thức chính quy kiểm tra số tài khoản ngân hàng: chỉ gồm từ 6 đến 30 chữ số (Bean Validation @Pattern).
 */
export const BANK_ACCOUNT_REGEX = /^[0-9]{6,30}$/;

/**
 * Độ dài số tài khoản hợp lệ theo từng ngân hàng phổ biến tại Việt Nam (đồng bộ với BE).
 */
export const BANK_ACCOUNT_LENGTH_RULES: Record<string, number[]> = {
  Vietcombank: [10, 13],
  MBBank: [9, 10, 12, 13],
  'MB Bank': [9, 10, 12, 13],
  Techcombank: [10, 12, 14],
  VietinBank: [10, 12],
  BIDV: [10, 14],
  ACB: [8, 9, 10],
  TPBank: [10, 11],
  VPBank: [8, 9, 10],
  Sacombank: [10, 12],
  Agribank: [10, 13],
  HDBank: [10, 15],
  VIB: [9, 10, 15],
  SHB: [10, 11],
  MSB: [10, 14],
  OCB: [10, 13],
  SeABank: [10, 14],
  Eximbank: [10, 15],
  LPBank: [10, 12],
};

function formatAllowedLengthsText(lengths: number[]): string {
  if (lengths.length === 1) return String(lengths[0]);
  if (lengths.length === 2) return `${lengths[0]} hoặc ${lengths[1]}`;
  return `${lengths.slice(0, -1).join(', ')} hoặc ${lengths[lengths.length - 1]}`;
}

/**
 * Chức năng: Tra cứu danh sách độ dài số tài khoản hợp lệ theo tên ngân hàng (không phân biệt hoa/thường và khoảng trắng).
 */
export function getBankAccountAllowedLengths(bankName?: string | null): number[] | null {
  if (!bankName || typeof bankName !== 'string') return null;
  const trimmed = bankName.trim();
  if (!trimmed) return null;

  if (BANK_ACCOUNT_LENGTH_RULES[trimmed]) {
    return BANK_ACCOUNT_LENGTH_RULES[trimmed];
  }

  const normalizedTarget = trimmed.toLowerCase().replace(/\s+/g, '');
  for (const [key, lengths] of Object.entries(BANK_ACCOUNT_LENGTH_RULES)) {
    if (key.toLowerCase().replace(/\s+/g, '') === normalizedTarget) {
      return lengths;
    }
  }
  return null;
}

/**
 * Chức năng: Tạo gợi ý độ dài số tài khoản hiển thị ngay dưới ô nhập theo ngân hàng đang chọn.
 */
export function getBankAccountHint(bankName?: string | null): string | undefined {
  const trimmed = (bankName || '').trim();
  if (!trimmed) return undefined;
  const allowedLengths = getBankAccountAllowedLengths(trimmed);
  if (allowedLengths) {
    return `Số tài khoản ${trimmed} gồm ${formatAllowedLengthsText(allowedLengths)} chữ số`;
  }
  return 'Số tài khoản gồm 6–30 chữ số (không nhập số thẻ ATM 16–19 chữ số)';
}

/**
 * Chức năng: Kiểm tra số tài khoản theo đúng quy tắc của từng ngân hàng và chặn dải số thẻ ATM (16–19 chữ số).
 * Trả về thông báo lỗi nếu không hợp lệ, hoặc undefined nếu hợp lệ.
 */
export function validateBankAccountNumberForBank(
  accountNumber?: string | null,
  bankName?: string | null
): string | undefined {
  if (!accountNumber || typeof accountNumber !== 'string') {
    return 'Vui lòng nhập số tài khoản ngân hàng.';
  }
  const clean = accountNumber.trim();
  if (!clean) {
    return 'Vui lòng nhập số tài khoản ngân hàng.';
  }
  if (!/^[0-9]+$/.test(clean)) {
    return 'Số tài khoản ngân hàng chỉ được chứa chữ số (không khoảng trắng hoặc dấu gạch).';
  }
  if (clean.length >= 16 && clean.length <= 19) {
    return 'Vui lòng nhập số tài khoản ngân hàng, không nhập số thẻ ATM (16–19 chữ số).';
  }
  const allowedLengths = getBankAccountAllowedLengths(bankName);
  if (allowedLengths) {
    if (!allowedLengths.includes(clean.length)) {
      return `Số tài khoản ${(bankName || '').trim()} phải gồm ${formatAllowedLengthsText(allowedLengths)} chữ số.`;
    }
    return undefined;
  }
  if (!BANK_ACCOUNT_REGEX.test(clean)) {
    return 'Số tài khoản ngân hàng không hợp lệ (phải gồm từ 6 đến 30 chữ số).';
  }
  return undefined;
}

/**
 * Chức năng: Kiểm tra nhanh khi người dùng đang gõ STK — báo lỗi ngay nếu rơi vào dải thẻ ATM (16–19 số)
 * hoặc vượt quá độ dài tối đa của ngân hàng đã chọn.
 */
export function getRealtimeBankAccountError(
  accountNumber: string,
  bankName?: string | null
): string | undefined {
  const clean = accountNumber.trim();
  if (!clean) return undefined;
  if (clean.length >= 16 && clean.length <= 19) {
    return 'Vui lòng nhập số tài khoản ngân hàng, không nhập số thẻ ATM (16–19 chữ số).';
  }
  const allowedLengths = getBankAccountAllowedLengths(bankName);
  if (allowedLengths && clean.length > Math.max(...allowedLengths)) {
    return validateBankAccountNumberForBank(clean, bankName);
  }
  return undefined;
}

/**
 * Biểu thức chính quy kiểm tra tên chủ tài khoản ngân hàng (chữ cái in hoa không dấu, có thể gồm nhiều từ cách nhau bởi 1 khoảng trắng).
 */
export const BANK_ACCOUNT_HOLDER_REGEX = /^[A-Z]+(?:\s+[A-Z]+)*$/;

/**
 * Chức năng: Kiểm tra tính hợp lệ của số tài khoản ngân hàng.
 *
 * @param accountNumber Đầu vào: Chuỗi số tài khoản ngân hàng cần kiểm tra.
 * @param bankName Đầu vào tùy chọn: Tên ngân hàng để kiểm tra theo độ dài từng ngân hàng.
 * @returns Đầu ra: true nếu hợp lệ; ngược lại false.
 */
export function isValidBankAccountNumber(
  accountNumber?: string | null,
  bankName?: string | null
): boolean {
  return validateBankAccountNumberForBank(accountNumber, bankName) === undefined;
}

/**
 * Chức năng: Chỉ giữ lại chữ số (tối đa 30 ký tự) khi người dùng nhập số tài khoản ngân hàng.
 */
export function sanitizeBankAccountNumberInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 30);
}

/**
 * Chức năng: Chuẩn hóa tên chủ tài khoản ngân hàng theo thời gian thực:
 * bỏ dấu tiếng Việt, chuyển sang chữ IN HOA, loại bỏ số/ký tự đặc biệt và gộp khoảng trắng thừa.
 */
export function normalizeBankAccountHolderInput(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s+/, '')
    .slice(0, 100);
}

/**
 * Chức năng: Kiểm tra tên chủ tài khoản ngân hàng hợp lệ (2–100 ký tự chữ cái in hoa không dấu).
 */
export function isValidBankAccountHolderName(name?: string | null): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 100) {
    return false;
  }
  return BANK_ACCOUNT_HOLDER_REGEX.test(trimmed);
}

function validateBankInfoFields(
  input: {
    bankName?: string | null;
    accountNumber?: string | null;
    accountHolderName?: string | null;
  },
  requireAll: boolean
): {
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
} {
  const cleanBank = (input.bankName || '').trim();
  const cleanAccount = (input.accountNumber || '').trim();
  const cleanHolder = (input.accountHolderName || '').trim();

  if (!requireAll && !cleanBank && !cleanAccount && !cleanHolder) {
    return {};
  }

  const errors: {
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
  } = {};

  if (!cleanBank) {
    errors.bankName = 'Vui lòng chọn ngân hàng nhận hoàn tiền.';
  }
  if (!cleanAccount) {
    errors.accountNumber = 'Vui lòng nhập số tài khoản ngân hàng.';
  } else {
    const accountError = validateBankAccountNumberForBank(cleanAccount, cleanBank);
    if (accountError) {
      errors.accountNumber = accountError;
    }
  }
  if (!cleanHolder) {
    errors.accountHolderName = 'Vui lòng nhập tên chủ tài khoản ngân hàng.';
  } else if (!isValidBankAccountHolderName(cleanHolder)) {
    errors.accountHolderName =
      'Tên chủ tài khoản phải từ 2–100 ký tự chữ cái viết hoa không dấu (ví dụ: NGUYEN VAN A).';
  }

  return errors;
}

/**
 * Chức năng: Kiểm tra nhóm thông tin tài khoản nhận hoàn tiền (khi là phần tùy chọn):
 * - Nếu cả 3 trường đều trống: hợp lệ (khách có thể bổ sung sau).
 * - Nếu đã nhập ít nhất 1 trường: bắt buộc nhập đủ và đúng định dạng cả Ngân hàng, Số tài khoản và Tên chủ tài khoản.
 */
export function validateOptionalBankInfo(input: {
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolderName?: string | null;
}): {
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
} {
  return validateBankInfoFields(input, false);
}

/**
 * Chức năng: Kiểm tra bắt buộc đủ và đúng định dạng cả 3 trường thông tin tài khoản nhận hoàn tiền
 * (đồng bộ với BE trên POST /returns và PUT /returns/{id}).
 */
export function validateRequiredBankInfo(input: {
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolderName?: string | null;
}): {
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
} {
  return validateBankInfoFields(input, true);
}

/**
 * Biểu thức chính quy kiểm tra số điện thoại lấy hàng Việt Nam: bắt đầu bằng 0 hoặc +84 theo sau bởi 9–10 chữ số.
 */
export const PICKUP_PHONE_REGEX = /^(\+84|0)[0-9]{9,10}$/;

/**
 * Chức năng: Kiểm tra tính hợp lệ của số điện thoại liên hệ lấy hàng trả (GHN).
 *
 * @param phone Đầu vào: Chuỗi số điện thoại cần kiểm tra.
 * @returns Đầu ra: true nếu khớp định dạng SĐT Việt Nam hợp lệ; ngược lại false.
 */
export function isValidPickupPhone(phone?: string | null): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  return PICKUP_PHONE_REGEX.test(phone.trim());
}

/**
 * Chức năng: Tạo đường dẫn tra cứu hành trình vận đơn công khai của Giao Hàng Nhanh (GHN).
 *
 * @param trackingCode Đầu vào: Mã vận đơn GHN.
 * @returns Đầu ra: URL tra cứu vận đơn GHN hoặc chuỗi rỗng nếu chưa có mã vận đơn.
 */
export function buildGhnTrackingUrl(trackingCode?: string | null): string {
  const trimmed = (trackingCode || '').trim();
  if (!trimmed) {
    return '';
  }
  return `https://donhang.ghn.vn/?order_code=${encodeURIComponent(trimmed)}`;
}

/**
 * Chức năng: Ghép các thành phần địa chỉ lấy hàng (địa chỉ chi tiết, phường/xã, tỉnh/thành) thành chuỗi dễ đọc.
 *
 * @param ret Đầu vào: Đối tượng chứa pickupAddress, pickupWardName và pickupProvinceName.
 * @returns Đầu ra: Chuỗi địa chỉ đầy đủ nối bằng dấu phẩy hoặc chuỗi rỗng nếu không có dữ liệu.
 */
export function formatPickupAddress(
  ret?: {
    pickupAddress?: string | null;
    pickupWardName?: string | null;
    pickupProvinceName?: string | null;
  } | null
): string {
  if (!ret) {
    return '';
  }
  return [ret.pickupAddress, ret.pickupWardName, ret.pickupProvinceName]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part !== '')
    .join(', ');
}

/**
 * Chức năng: Kiểm tra phiếu trả hàng có đang chọn tự mang đến cửa hàng hay không
 * dựa trên dữ liệu thật từ Backend: cả 5 trường lấy hàng đều trống/null và chưa có vận đơn GHN.
 */
export function isSelfDropOffReturn(
  ret?: {
    selfDropOff?: boolean | null;
    pickupAddress?: string | null;
    pickupProvinceName?: string | null;
    pickupWardName?: string | null;
    pickupContactName?: string | null;
    pickupPhone?: string | null;
    returnShippingProvider?: string | null;
    returnTrackingCode?: string | null;
  } | null
): boolean {
  if (!ret) {
    return false;
  }
  if (ret.returnShippingProvider === 'GHN' || Boolean(ret.returnTrackingCode)) {
    return false;
  }
  if (typeof ret.selfDropOff === 'boolean') {
    return ret.selfDropOff;
  }
  return (
    !ret.pickupAddress &&
    !ret.pickupProvinceName &&
    !ret.pickupWardName &&
    !ret.pickupContactName &&
    !ret.pickupPhone
  );
}

/**
 * Chức năng: Định dạng hiển thị phí vận chuyển chiều hoàn theo đúng trạng thái thực tế của phiếu:
 * - Tự mang đến cửa hàng: "0₫ (Tự mang đến cửa hàng)"
 * - returnShippingFee === null (lỗi preview GHN tạm thời): "Chờ tính phí (theo cước GHN)"
 * - returnShippingFee > 0: "- 30.000₫ (Tạm tính GHN)" nếu chưa kiểm tra xong ở bước chờ duyệt, hoặc "- 30.000₫"
 * - returnShippingFee === 0: "Miễn phí (0₫)"
 */
export function formatReturnShippingFeeDisplay(
  ret?: {
    status?: ReturnRequestStatus | string;
    inspectedAt?: string | null;
    returnShippingFee?: number | null;
    selfDropOff?: boolean | null;
    pickupAddress?: string | null;
    pickupProvinceName?: string | null;
    pickupWardName?: string | null;
    pickupContactName?: string | null;
    pickupPhone?: string | null;
    returnShippingProvider?: string | null;
    returnTrackingCode?: string | null;
  } | null
): { text: string; isDeduction: boolean } {
  if (!ret) {
    return { text: 'Miễn phí (0₫)', isDeduction: false };
  }
  if (isSelfDropOffReturn(ret)) {
    return { text: '0₫ (Tự mang đến cửa hàng)', isDeduction: false };
  }
  if (ret.returnShippingFee === null || ret.returnShippingFee === undefined) {
    return { text: 'Chờ tính phí (theo cước GHN)', isDeduction: false };
  }
  if (ret.returnShippingFee > 0) {
    const isPreviewEstimate = !ret.inspectedAt && ret.status === 'PENDING_APPROVAL';
    return {
      text: `- ${formatVND(ret.returnShippingFee)}${isPreviewEstimate ? ' (Tạm tính GHN)' : ''}`,
      isDeduction: true,
    };
  }
  return { text: 'Miễn phí (0₫)', isDeduction: false };
}

/**
 * Chức năng: Lấy ghi chú kiểm tra chung từ kho/shop (ưu tiên generalInspectionNote, fallback rejectionReason khi khác REJECTED).
 */
export function getGeneralInspectionNote(
  ret?: {
    status?: ReturnRequestStatus | string;
    generalInspectionNote?: string | null;
    rejectionReason?: string | null;
  } | null
): string {
  if (!ret) return '';
  if (ret.generalInspectionNote && ret.generalInspectionNote.trim() !== '') {
    return ret.generalInspectionNote.trim();
  }
  if (ret.status !== 'REJECTED' && ret.rejectionReason && ret.rejectionReason.trim() !== '') {
    return ret.rejectionReason.trim();
  }
  return '';
}

// ============================================================================
// 5. BỘ DỰNG PAYLOAD THUẦN (EXPLICIT PAYLOAD BUILDERS)
// ============================================================================

/**
 * Chức năng: Gắn các trường ngân hàng và địa chỉ lấy hàng tùy chọn vào payload tạo/sửa phiếu,
 * đảm bảo lược bỏ hoàn toàn giá trị rỗng để tránh vi phạm Bean Validation @Pattern.
 * Nếu `selfDropOff` là `true`, bỏ qua toàn bộ các trường lấy hàng GHN để Backend xóa trắng 5 trường địa chỉ.
 *
 * @param payload Đích cần gắn các trường hợp lệ.
 * @param form    Nguồn dữ liệu thô từ form khách hàng.
 */
function attachOptionalBankAndPickupFields(
  payload: ReturnRequestCreationRequest | ReturnRequestUpdateRequest,
  form: {
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    pickupAddressId?: number | string | null;
    pickupContactName?: string;
    pickupPhone?: string;
    selfDropOff?: boolean;
  }
): void {
  // Chỉ đính kèm thông tin ngân hàng khi người dùng thực sự nhập số tài khoản không rỗng
  const trimmedAccountNumber = (form.accountNumber || '').trim();
  if (trimmedAccountNumber !== '') {
    payload.accountNumber = trimmedAccountNumber;
    if (form.bankName && form.bankName.trim() !== '') {
      payload.bankName = form.bankName.trim();
    }
    if (form.accountHolderName && form.accountHolderName.trim() !== '') {
      payload.accountHolderName = form.accountHolderName.trim();
    }
  }

  if (typeof form.selfDropOff === 'boolean') {
    payload.selfDropOff = form.selfDropOff;
  }

  if (form.selfDropOff === true) {
    return;
  }

  // Đính kèm mã địa chỉ lấy hàng nếu hợp lệ (> 0)
  if (
    form.pickupAddressId !== undefined &&
    form.pickupAddressId !== null &&
    String(form.pickupAddressId).trim() !== ''
  ) {
    const parsedAddrId = Number(form.pickupAddressId);
    if (!isNaN(parsedAddrId) && parsedAddrId > 0) {
      payload.pickupAddressId = parsedAddrId;
    }
  }

  // Đính kèm người liên hệ và SĐT lấy hàng nếu có nhập (bỏ trống sẽ dùng fallback ở Backend)
  const trimmedContactName = (form.pickupContactName || '').trim();
  if (trimmedContactName !== '') {
    payload.pickupContactName = trimmedContactName;
  }

  const trimmedPickupPhone = (form.pickupPhone || '').trim();
  if (trimmedPickupPhone !== '') {
    payload.pickupPhone = trimmedPickupPhone;
  }
}

/**
 * Cấu trúc dữ liệu nhập liệu thô từ Form tạo yêu cầu trả hàng C2.
 */
export interface CreateReturnFormData {
  orderId: number | string;
  reason: ReturnReason | string;
  reasonDetail: string;
  items: Array<{
    orderItemId: number | string;
    quantity: number | string;
    [key: string]: any;
  }>;
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  pickupAddressId?: number | string | null;
  pickupContactName?: string;
  pickupPhone?: string;
  selfDropOff?: boolean;
  // Các trường hệ thống có thể lẫn trong form state
  [key: string]: any;
}

/**
 * Chức năng: Chuẩn hóa payload tạo yêu cầu trả hàng sạch sẽ trước khi gửi lên Backend (POST /api/v1/returns).
 * Tự động loại bỏ mọi trường thừa (id, status, refundAmount, isOverdue...) để bảo vệ chống lỗi 400 UNSUPPORTED_FIELD (@JsonAnySetter).
 * Đồng thời loại bỏ hoàn toàn các trường ngân hàng và địa chỉ/SĐT rỗng để tránh lỗi Bean Validation @Pattern.
 *
 * @param form Đầu vào: Dữ liệu form thô từ màn hình C2.
 * @returns Đầu ra: Đối tượng ReturnRequestCreationRequest chuẩn chỉ gồm đúng các trường cho phép.
 */
export function buildCreateReturnPayload(form: CreateReturnFormData): ReturnRequestCreationRequest {
  // Chuẩn hóa danh sách sản phẩm trả: chỉ giữ lại orderItemId và quantity
  const cleanItems: ReturnRequestItemRequest[] = (form.items || []).map((item) => ({
    orderItemId: Number(item.orderItemId),
    quantity: Number(item.quantity),
  }));

  const payload: ReturnRequestCreationRequest = {
    orderId: Number(form.orderId),
    reason: form.reason,
    reasonDetail: (form.reasonDetail || '').trim(),
    items: cleanItems,
  };

  attachOptionalBankAndPickupFields(payload, form);

  return payload;
}

/**
 * Cấu trúc dữ liệu nhập liệu thô từ Modal sửa yêu cầu trả hàng C5a.
 */
export interface UpdateReturnFormData {
  reason: ReturnReason | string;
  reasonDetail: string;
  items: Array<{
    orderItemId: number | string;
    quantity: number | string;
    [key: string]: any;
  }>;
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  pickupAddressId?: number | string | null;
  pickupContactName?: string;
  pickupPhone?: string;
  selfDropOff?: boolean;
  retainedImageUrls?: string[];
  orderId?: any; // Cố tình truyền hoặc lẫn từ state chi tiết phiếu
  [key: string]: any;
}

/**
 * Chức năng: Chuẩn hóa payload chỉnh sửa yêu cầu trả hàng (PUT /api/v1/returns/{id}).
 * Quy tắc sống còn: Tuyệt đối KHÔNG BAO GIỜ đính kèm trường orderId (Backend ném 400 UNSUPPORTED_FIELD nếu có orderId khi update).
 * Lược bỏ toàn bộ trường ngân hàng và lấy hàng rỗng để tránh vi phạm @Pattern Bean Validation.
 *
 * @param form Đầu vào: Dữ liệu form chỉnh sửa từ Modal C5a.
 * @returns Đầu ra: Đối tượng ReturnRequestUpdateRequest sạch sẽ.
 */
export function buildUpdateReturnPayload(form: UpdateReturnFormData): ReturnRequestUpdateRequest {
  const cleanItems: ReturnRequestItemRequest[] = (form.items || []).map((item) => ({
    orderItemId: Number(item.orderItemId),
    quantity: Number(item.quantity),
  }));

  const payload: ReturnRequestUpdateRequest = {
    reason: form.reason,
    reasonDetail: (form.reasonDetail || '').trim(),
    items: cleanItems,
  };

  if (Array.isArray(form.retainedImageUrls)) {
    payload.retainedImageUrls = form.retainedImageUrls.filter(
      (url): url is string => typeof url === 'string' && url.trim() !== ''
    );
  }

  attachOptionalBankAndPickupFields(payload, form);

  return payload;
}

/**
 * Cấu trúc dữ liệu phản hồi phương án từ Modal C5c.
 */
export interface ConfirmPlanFormData {
  agreed: boolean;
  customerNote?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  [key: string]: any;
}

/**
 * Chức năng: Chuẩn hóa payload xác nhận đồng ý hoặc từ chối phương án xử lý (PATCH /api/v1/returns/{id}/confirm-plan).
 *
 * @param form Đầu vào: Lựa chọn đồng ý, ghi chú phản hồi và STK ngân hàng tùy chọn từ Modal C5c.
 * @returns Đầu ra: Đối tượng ReturnRequestConfirmPlanRequest hợp lệ.
 */
export function buildConfirmPlanPayload(form: ConfirmPlanFormData): ReturnRequestConfirmPlanRequest {
  const payload: ReturnRequestConfirmPlanRequest = {
    agreed: Boolean(form.agreed),
  };

  if (form.customerNote && form.customerNote.trim() !== '') {
    payload.customerNote = form.customerNote.trim();
  }

  const trimmedAccountNumber = (form.accountNumber || '').trim();
  if (trimmedAccountNumber !== '') {
    payload.accountNumber = trimmedAccountNumber;
    if (form.bankName && form.bankName.trim() !== '') {
      payload.bankName = form.bankName.trim();
    }
    if (form.accountHolderName && form.accountHolderName.trim() !== '') {
      payload.accountHolderName = form.accountHolderName.trim();
    }
  }

  return payload;
}

// ============================================================================
// 6. ACTION GUARDS PHÍA KHÁCH HÀNG (CUSTOMER GUARDS)
// ============================================================================

/**
 * Chức năng: Kiểm tra xem khách hàng có quyền chủ động hủy yêu cầu trả hàng hay không.
 * Điều kiện: Chỉ được hủy khi phiếu ở PENDING_APPROVAL hoặc khi WAITING_FOR_RETURN_DELIVERY mà CHƯA bàn giao hàng cho shipper.
 *
 * @param ret Đầu vào: Thông tin phiếu trả hàng chứa status và handedOverAt.
 * @returns Đầu ra: true nếu khách hàng được phép bấm nút Hủy; ngược lại false.
 */
export function canCustomerCancelReturn(ret?: {
  status?: ReturnRequestStatus | string;
  handedOverAt?: string | null;
} | null): boolean {
  if (!ret || !ret.status) {
    return false;
  }
  if (ret.status === 'PENDING_APPROVAL') {
    return true;
  }
  if (ret.status === 'WAITING_FOR_RETURN_DELIVERY') {
    // Khóa quyền hủy ngay khi kiện hàng đã được giao cho shipper nhằm tránh thất lạc hàng đang chuyển
    return !ret.handedOverAt;
  }
  return false;
}

/**
 * Chức năng: Kiểm tra xem khách hàng có quyền chỉnh sửa thông tin yêu cầu trả hàng hay không (Modal C5a).
 * Điều kiện: Chỉ được sửa khi phiếu còn ở trạng thái PENDING_APPROVAL (chờ xét duyệt),
 * không khóa theo hạn 7 ngày sau giao hàng đối với phiếu đã gửi hợp lệ từ trước.
 *
 * @param ret   Đầu vào: Thông tin phiếu trả hàng chứa status.
 * @returns Đầu ra: true nếu được phép mở modal sửa; ngược lại false.
 */
export function canCustomerEditReturn(
  ret?: {
    status?: ReturnRequestStatus | string;
    deliveredAt?: string | null;
    orderDeliveredAt?: string | null;
  } | null,
  _nowMs?: number
): boolean {
  if (!ret || !ret.status) {
    return false;
  }
  return ret.status === 'PENDING_APPROVAL';
}

/**
 * Chức năng: Kiểm tra xem khách hàng có quyền cập nhật hoặc bổ sung số tài khoản ngân hàng hay không (Modal C5b).
 * Điều kiện: Chỉ cho phép ở các trạng thái trước bước chờ hoàn tiền
 * (PENDING_APPROVAL, WAITING_FOR_RETURN_DELIVERY, INSPECTING, WAITING_CUSTOMER_FEEDBACK);
 * khóa khi đã sang WAITING_REFUND hoặc đã kết thúc (REFUNDED, REJECTED, CANCELLED).
 *
 * @param ret Đầu vào: Thông tin phiếu trả hàng chứa status.
 * @returns Đầu ra: true nếu được phép sửa STK; ngược lại false.
 */
export function canCustomerUpdateBank(ret?: { status?: ReturnRequestStatus | string } | null): boolean {
  if (!ret || !ret.status) {
    return false;
  }
  const normalizedStatus = String(ret.status).trim().toUpperCase();
  const lockedStatuses = ['WAITING_REFUND', 'REFUNDED', 'REJECTED', 'CANCELLED'];
  return !lockedStatuses.includes(normalizedStatus);
}

/**
 * Chức năng: Kiểm tra xem khách hàng có cần hiển thị banner/modal xác nhận phương án hay không (Modal C5c).
 * Điều kiện: Phiếu ở trạng thái WAITING_CUSTOMER_FEEDBACK và khách hàng chưa từng bấm xác nhận phương án.
 *
 * @param ret Đầu vào: Thông tin phiếu chứa status và customerConfirmedPlan.
 * @returns Đầu ra: true nếu cần khách phản hồi phương án; ngược lại false.
 */
export function canCustomerConfirmPlan(ret?: {
  status?: ReturnRequestStatus | string;
  customerConfirmedPlan?: boolean | null;
} | null): boolean {
  if (!ret || !ret.status) {
    return false;
  }
  return ret.status === 'WAITING_CUSTOMER_FEEDBACK' && !ret.customerConfirmedPlan;
}

// ============================================================================
// 7. ACTION GUARDS PHÍA QUẢN TRỊ / KHO (ADMIN & STAFF GUARDS)
// ============================================================================

/**
 * Danh sách các mã hành động có thể thao tác trên trang điều phối quản trị A2.
 */
export type AdminActionType =
  | 'approve'        // Duyệt yêu cầu
  | 'reject'         // Từ chối yêu cầu
  | 'handover'       // Xác nhận bàn giao đơn vị vận chuyển
  | 'extendHandover' // Gia hạn thời hạn bàn giao (+3 ngày)
  | 'receive'        // Xác nhận hàng đã về đến kho
  | 'inspect'        // Ghi kết quả kiểm định QC
  | 'refund'         // Xác nhận hoàn tiền
  | 'restock'        // Phân loại và nhập lại kho bán
  | 'overdueNote'    // Giải trình trễ hạn SLA
  | 'contactLog'     // Ghi nhật ký CSKH
  | 'complete';      // Đóng hoàn tất hồ sơ

/**
 * Chức năng: Xác định danh sách các nút hành động Quản trị viên/Nhân viên kho được phép bấm trên trang A2.
 * Dựa trên ma trận trạng thái vòng đời nghiêm ngặt quy định tại docs/RETURN_REFUND_FRONTEND_PLAN.md §5 B.
 *
 * @param ret Đầu vào: Thông tin phiếu trả hàng đầy đủ các mốc thời gian và trạng thái.
 * @returns Đầu ra: Mảng các mã hành động hợp lệ AdminActionType[].
 */
export function getAdminAvailableActions(ret?: {
  status?: ReturnRequestStatus | string;
  handedOverAt?: string | null;
  handoverDeadline?: string | null;
  inspectedAt?: string | null;
  restockedAt?: string | null;
  receivedAt?: string | null;
  completedAt?: string | null;
  customerConfirmedPlan?: boolean | null;
  customerNote?: string | null;
} | null): AdminActionType[] {
  if (!ret || !ret.status) {
    return [];
  }

  const actions: AdminActionType[] = [];
  const status = ret.status;

  // 1. Duyệt yêu cầu: Chỉ khi phiếu ở PENDING_APPROVAL
  if (status === 'PENDING_APPROVAL') {
    actions.push('approve');
  }

  // 2. Từ chối / Đóng yêu cầu: Cho phép ở PENDING_APPROVAL, INSPECTING,
  // hoặc đóng phiếu WAITING_FOR_RETURN_DELIVERY khi đã quá hạn 7 ngày bàn giao và chưa giao hàng cho shipper
  const isHandoverExpired =
    status === 'WAITING_FOR_RETURN_DELIVERY' &&
    !ret.handedOverAt &&
    ret.handoverDeadline != null &&
    new Date(ret.handoverDeadline).getTime() < Date.now();
  if (
    status === 'PENDING_APPROVAL' ||
    status === 'INSPECTING' ||
    isHandoverExpired
  ) {
    actions.push('reject');
  }

  // 3. Bàn giao vận chuyển & Gia hạn bàn giao: Khi đang chờ giao hàng và shipper chưa nhận
  if (status === 'WAITING_FOR_RETURN_DELIVERY' && !ret.handedOverAt) {
    actions.push('handover');
    actions.push('extendHandover');
  }

  // 4. Nhận hàng tại kho: Khi phiếu ở WAITING_FOR_RETURN_DELIVERY
  if (status === 'WAITING_FOR_RETURN_DELIVERY') {
    actions.push('receive');
  }

  // 5. Kiểm định QC: ở INSPECTING, hoặc khi ở WAITING_CUSTOMER_FEEDBACK nhưng khách đã gửi phản hồi không đồng ý (có customerNote)
  if (
    status === 'INSPECTING' ||
    (status === 'WAITING_CUSTOMER_FEEDBACK' && Boolean(ret.customerNote?.trim()))
  ) {
    actions.push('inspect');
  }

  // 6. Hoàn tiền: Khi phiếu đã chốt phương án và đang ở WAITING_REFUND
  if (status === 'WAITING_REFUND') {
    actions.push('refund');
  }

  // 7. Nhập kho bán lại: Đã kiểm định, chưa restock và ở WAITING_CUSTOMER_FEEDBACK, WAITING_REFUND, hoặc REFUNDED
  const restockEligibleStatuses = [
    'WAITING_CUSTOMER_FEEDBACK',
    'WAITING_REFUND',
    'REFUNDED',
  ];
  if (
    ret.inspectedAt != null &&
    !ret.restockedAt &&
    restockEligibleStatuses.includes(status)
  ) {
    actions.push('restock');
  }

  // 8. Giải trình trễ SLA: Cho phép khi phiếu chưa đóng kết thúc (chưa REFUNDED, REJECTED, CANCELLED)
  const closedStatuses = ['REFUNDED', 'REJECTED', 'CANCELLED'];
  if (!closedStatuses.includes(status)) {
    actions.push('overdueNote');
  }

  // 9. Ghi nhật ký CSKH: Chưa đóng hồ sơ và (đang chờ khách phản hồi, đã từ chối giữ hàng tại kho, hoặc đã hoàn tiền 1 phần còn hàng lưu kho)
  if (
    !ret.completedAt &&
    (status === 'WAITING_CUSTOMER_FEEDBACK' ||
      (status === 'REJECTED' && ret.receivedAt != null) ||
      status === 'REFUNDED')
  ) {
    actions.push('contactLog');
  }

  // 10. Đóng hoàn tất hồ sơ: Khi hồ sơ chưa đóng và đã ở trạng thái kết thúc (REFUNDED hoặc REJECTED)
  if (!ret.completedAt && (status === 'REFUNDED' || status === 'REJECTED')) {
    actions.push('complete');
  }

  return actions;
}

// ============================================================================
// 8. ĐỒNG BỘ CHỈ SỐ PHÂN TRANG (PAGINATION INDEXING HELPERS)
// ============================================================================

/**
 * Chức năng: Chuyển đổi số trang từ giao diện Pagination (1-indexed: 1, 2, 3...)
 * sang chỉ số trang của Spring Data API (0-indexed: 0, 1, 2...).
 *
 * @param page1Based Đầu vào: Số trang hiển thị trên UI.
 * @returns Đầu ra: Chỉ số trang gửi lên API (>= 0).
 */
export function pageToSpring(page1Based: number): number {
  return Math.max(0, page1Based - 1);
}

/**
 * Chức năng: Chuyển đổi chỉ số trang từ Spring Data API (0-indexed)
 * sang số trang hiển thị trên giao diện Pagination (1-indexed).
 *
 * @param page0Based Đầu vào: Chỉ số trang từ Spring Data response.number.
 * @returns Đầu ra: Số trang truyền vào component Pagination.
 */
export function pageFromSpring(page0Based: number): number {
  return page0Based + 1;
}

// ============================================================================
// 9. ADAPTER CHUẨN HÓA ĐƠN HÀNG FALLBACK MOCK ITEMS (ORDER ADAPTER)
// ============================================================================

/**
 * Danh sách mẫu sản phẩm dùng cho adapter fallback khi Backend Order API chưa trả orderItems.
 */
export const MOCK_PRODUCT_TEMPLATES = [
  {
    name: 'Áo Thun Cotton Compact Form Rộng',
    variant: 'Size L / Đen Carbon',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'Quần Tây Baggy Xếp Ly Cao Cấp',
    variant: 'Size 32 / Xám Tiêu',
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'Áo Sơ Mi Lụa Dài Tay Tối Giản',
    variant: 'Size XL / Trắng Ngà',
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop&q=60',
  },
];

/**
 * Chức năng: Chuẩn hóa đối tượng đơn hàng từ Backend, đảm bảo luôn có mảng orderItems.
 * Nếu Backend đã trả orderItems thực tế thì giữ nguyên (isMockItems: false); nếu thiếu thì sinh danh sách sản phẩm mẫu
 * nhất quán dựa trên ID và tổng tiền đơn hàng, gắn cờ `isMockItems: true`.
 *
 * @param order Đầu vào: Đối tượng đơn hàng thô nhận từ Backend API (OrderResponse).
 * @returns Đầu ra: Đối tượng OrderWithItems đảm bảo có mảng orderItems.
 */
export function normalizeOrderWithItems(order: OrderResponse): OrderWithItems {
  if (!order) {
    return order as unknown as OrderWithItems;
  }

  // Nếu Backend đã trả orderItems thực tế và có phần tử
  if (Array.isArray(order.orderItems) && order.orderItems.length > 0) {
    return {
      ...order,
      orderItems: order.orderItems,
      isMockItems: false,
    };
  }

  // Fallback: Tự sinh danh sách sản phẩm mẫu nhất quán
  const templateIndex = Math.abs(order.id || 1) % MOCK_PRODUCT_TEMPLATES.length;
  const template = MOCK_PRODUCT_TEMPLATES[templateIndex];

  const safeTotal = typeof order.subtotal === 'number' && order.subtotal > 0
    ? order.subtotal
    : (typeof order.totalAmount === 'number' && order.totalAmount > 0 ? order.totalAmount : 350000);

  const fallbackItems: OrderItemResponse[] = [
    {
      id: Number(order.id) * 100 + 1,
      orderId: Number(order.id),
      productVariantId: Number(order.id) * 10 + 1,
      productName: template.name,
      variantInfo: template.variant,
      unitPrice: safeTotal,
      quantity: 1,
      totalPrice: safeTotal,
      imageUrl: template.image,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    },
  ];

  return {
    ...order,
    orderItems: fallbackItems,
    isMockItems: true,
  };
}
