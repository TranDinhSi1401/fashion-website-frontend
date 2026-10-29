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
 * Extract clean error message from API response or Error object
 */
export function extractErrorMessage(error: any, fallback = 'Đã có lỗi xảy ra. Vui lòng thử lại.'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;

  if (error.response) {
    const data = error.response.data;
    if (data) {
      if (typeof data.message === 'string' && data.message.trim() !== '') {
        return data.message;
      }
      if (typeof data === 'string') return data;
      if (data.error) return data.error;
    }
    if (error.response.status === 401) {
      return 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.';
    }
    if (error.response.status === 403) {
      return 'Bạn không có quyền thực hiện thao tác này.';
    }
    if (error.response.status === 429) {
      return 'Yêu cầu quá nhanh. Vui lòng đợi trong giây lát.';
    }
  }

  return error.message || fallback;
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


