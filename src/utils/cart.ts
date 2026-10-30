import axios from 'axios';

const messages: Record<string, string> = {
  'error.insufficient_stock': 'Số lượng yêu cầu vượt quá tồn kho hiện tại. Vui lòng kiểm tra lại giỏ hàng.',
  'error.product_variant_unavailable': 'Biến thể này hiện không còn được bán. Bạn có thể xóa khỏi giỏ hàng.',
  'error.product_variant_not_found': 'Không tìm thấy biến thể sản phẩm đã chọn.',
  'error.cart_item_not_found': 'Sản phẩm trong giỏ đã thay đổi. Vui lòng tải lại giỏ hàng.',
};

export function cartError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && messages[message]) return messages[message];
    if (error.response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (error.response?.status === 403) return 'Chỉ tài khoản khách hàng có thể sử dụng giỏ hàng.';
    if (!error.response) return 'Không kết nối được máy chủ. Vui lòng thử lại.';
    return 'Không thể cập nhật giỏ hàng. Vui lòng tải lại và thử lại.';
  }
  return error instanceof Error ? error.message : 'Không thể cập nhật giỏ hàng. Vui lòng thử lại.';
}
