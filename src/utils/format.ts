import { TokenClaims } from '../types/auth';

/**
 * Format number to standard Vietnamese Dong (VND) currency string
 * e.g. 450000 -> "450.000₫"
 */
export function formatCurrencyVND(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0₫';
  }
  return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
}

/**
 * Safely parse a JWT token payload without external libraries
 */
export function parseJwt(token: string): TokenClaims | null {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as TokenClaims;
  } catch (err) {
    console.error('Failed to parse JWT token:', err);
    return null;
  }
}

/**
 * Validate Vietnamese phone number format (10 digits starting with 0 or +84)
 */
export function isValidVietnamPhone(phone: string): boolean {
  if (!phone) return false;
  const regex = /^(0|\+84)[0-9]{9}$/;
  return regex.test(phone.trim());
}

/**
 * Từ điển ánh xạ mã lỗi hệ thống sang thông báo tiếng Việt thân thiện
 */
export const ERROR_CODE_TRANSLATIONS: Record<string, string> = {
  'error.unauthenticated': 'Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.',
  'error.invalid_password': 'Mật khẩu phải có độ dài từ 6 đến 100 ký tự.',
  'error.old_password_incorrect': 'Mật khẩu cũ không chính xác.',
  'error.password_confirmation_mismatch': 'Mật khẩu xác nhận không trùng khớp.',
  'error.new_password_same_as_old': 'Mật khẩu mới không được trùng với mật khẩu hiện tại.',
  'error.user_inactive': 'Tài khoản của bạn đang bị khóa hoặc chưa kích hoạt. Vui lòng liên hệ quản trị viên.',
  'error.user_not_found': 'Tài khoản không tồn tại trên hệ thống.',
  'error.user_existed': 'Tên đăng nhập hoặc thông tin người dùng đã tồn tại.',
  'error.duplicate_username': 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.',
  'error.duplicate_email': 'Địa chỉ email này đã được đăng ký tài khoản khác.',
  'error.token_expired': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'error.token_invalid': 'Mã xác thực không hợp lệ hoặc đã bị hủy.',
  'error.reset_token_invalid': 'Mã khôi phục mật khẩu không hợp lệ.',
  'error.reset_token_expired': 'Mã khôi phục mật khẩu đã hết hạn. Vui lòng gửi yêu cầu mới.',
  'error.reset_password_cooldown': 'Bạn vừa yêu cầu mã gần đây. Vui lòng đợi trong giây lát.',
  'error.unauthorized': 'Bạn không có quyền thực hiện thao tác này.',
  'error.bad_request': 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.',
  'error.product_not_found': 'Không tìm thấy thông tin sản phẩm.',
  'error.product_variant_not_found': 'Biến thể sản phẩm (màu/size) không tồn tại.',
  'error.product_variant_unavailable': 'Biến thể sản phẩm này hiện không khả dụng.',
  'error.cart_item_not_found': 'Sản phẩm không có trong giỏ hàng.',
  'error.insufficient_stock': 'Số lượng sản phẩm trong kho không đủ đáp ứng.',
  'error.category_not_found': 'Không tìm thấy danh mục sản phẩm.',
  'error.order_not_found': 'Không tìm thấy đơn hàng.',
  'error.address_not_found': 'Không tìm thấy địa chỉ giao hàng.',
  'error.user_address_not_found': 'Không tìm thấy địa chỉ giao hàng.',
  'error.email_send_failed': 'Không thể gửi email. Vui lòng thử lại sau ít phút.',
};

/**
 * Dịch chuỗi thông báo lỗi kỹ thuật sang tiếng Việt thân thiện
 */
export function translateErrorMessage(msg: any): string {
  if (!msg || typeof msg !== 'string') return '';
  const trimmed = msg.trim();
  if (ERROR_CODE_TRANSLATIONS[trimmed]) {
    return ERROR_CODE_TRANSLATIONS[trimmed];
  }
  // Nếu chuỗi có tiền tố error. nhưng chưa có trong từ điển
  if (trimmed.startsWith('error.')) {
    return 'Thao tác không thành công. Vui lòng kiểm tra lại thông tin.';
  }
  return trimmed;
}

/**
 * Extract clean error message from API response or Error object
 */
export function extractErrorMessage(error: any, fallback = 'Đã có lỗi xảy ra. Vui lòng thử lại.'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return translateErrorMessage(error) || fallback;

  if (error.response) {
    const data = error.response.data;
    if (data) {
      if (typeof data.message === 'string' && data.message.trim() !== '') {
        const translated = translateErrorMessage(data.message);
        if (translated) return translated;
      }
      if (typeof data === 'string' && data.trim() !== '') {
        const translated = translateErrorMessage(data);
        if (translated) return translated;
      }
      if (data.error && typeof data.error === 'string' && data.error.trim() !== '') {
        const translated = translateErrorMessage(data.error);
        if (translated) return translated;
      }
    }
    if (error.response.status === 401) {
      return 'Tên đăng nhập hoặc mật khẩu không chính xác.';
    }
    if (error.response.status === 403) {
      return 'Bạn không có quyền thực hiện thao tác này.';
    }
    if (error.response.status === 429) {
      return 'Yêu cầu quá nhanh. Vui lòng đợi trong giây lát.';
    }
  }

  const rawMsg = error.message;
  if (rawMsg) {
    const translated = translateErrorMessage(rawMsg);
    if (translated) return translated;
  }

  return fallback;
}

/**
 * Safely extract primary image URL directly from product data fields,
 * prioritizing the backend's `productImages` array ({ imageUrl, isMain, displayOrder })
 */
export function extractProductImage(product?: any): string | null {
  if (!product) return null;

  // 1. Check backend `productImages` array
  if (Array.isArray(product.productImages) && product.productImages.length > 0) {
    // Find main image
    const mainImg = product.productImages.find((img: any) => img && img.isMain === true);
    if (mainImg?.imageUrl && typeof mainImg.imageUrl === 'string') {
      return mainImg.imageUrl.trim();
    }
    // Sort by displayOrder if available
    const sorted = [...product.productImages].sort((a: any, b: any) => {
      const orderA = typeof a?.displayOrder === 'number' ? a.displayOrder : 999;
      const orderB = typeof b?.displayOrder === 'number' ? b.displayOrder : 999;
      return orderA - orderB;
    });
    if (sorted[0]?.imageUrl && typeof sorted[0].imageUrl === 'string') {
      return sorted[0].imageUrl.trim();
    }
  }

  // 2. Direct string properties fallback
  if (typeof product.imageUrl === 'string' && product.imageUrl.trim() !== '') {
    return product.imageUrl.trim();
  }
  if (typeof product.image === 'string' && product.image.trim() !== '') {
    return product.image.trim();
  }
  if (typeof product.thumbnail === 'string' && product.thumbnail.trim() !== '') {
    return product.thumbnail.trim();
  }
  if (Array.isArray(product.images) && product.images.length > 0 && typeof product.images[0] === 'string') {
    return product.images[0].trim();
  }
  return null;
}

/**
 * Extract all image URLs from product data for gallery view
 */
export function extractAllProductImages(product?: any): string[] {
  if (!product) return [];
  const urls: string[] = [];

  // 1. Backend `productImages` array
  if (Array.isArray(product.productImages)) {
    const sorted = [...product.productImages].sort((a: any, b: any) => {
      if (a?.isMain && !b?.isMain) return -1;
      if (!a?.isMain && b?.isMain) return 1;
      const orderA = typeof a?.displayOrder === 'number' ? a.displayOrder : 999;
      const orderB = typeof b?.displayOrder === 'number' ? b.displayOrder : 999;
      return orderA - orderB;
    });

    sorted.forEach((item: any) => {
      if (item?.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.trim()) {
        const u = item.imageUrl.trim();
        if (!urls.includes(u)) urls.push(u);
      }
    });
  }

  // 2. Fallbacks
  if (typeof product.imageUrl === 'string' && product.imageUrl.trim() && !urls.includes(product.imageUrl.trim())) {
    urls.push(product.imageUrl.trim());
  }
  if (typeof product.image === 'string' && product.image.trim() && !urls.includes(product.image.trim())) {
    urls.push(product.image.trim());
  }
  if (typeof product.thumbnail === 'string' && product.thumbnail.trim() && !urls.includes(product.thumbnail.trim())) {
    urls.push(product.thumbnail.trim());
  }
  if (Array.isArray(product.images)) {
    product.images.forEach((img: any) => {
      if (typeof img === 'string' && img.trim() && !urls.includes(img.trim())) {
        urls.push(img.trim());
      }
    });
  }

  return urls;
}


