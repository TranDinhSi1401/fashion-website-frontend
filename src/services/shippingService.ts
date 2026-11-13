import apiClient from './apiClient';
import { ApiResponse } from '../types/api';

export interface ShippingLocation {
  id: number;
  name: string;
}

interface ShippingLocationResponseItem {
  id?: number;
  _id?: number;
  name: string;
}

type ShippingLocationsPayload = ShippingLocationResponseItem[] | { data: ShippingLocationResponseItem[] };

export interface ShippingOrderPreview {
  total_fee: number;
  expected_delivery_time: string;
}

interface ShippingOrderPreviewRequest {
  userAddressId: number;
  paymentMethodId: number;
}

function getLocations(payload: ShippingLocationsPayload): ShippingLocation[] {
  const locations = Array.isArray(payload) ? payload : payload.data;

  if (!Array.isArray(locations)) {
    throw new Error('Dữ liệu địa chỉ giao hàng không hợp lệ.');
  }

  return locations.map(location => {
    const id = location.id ?? location._id;
    if (typeof id !== 'number' || !Number.isFinite(id) || typeof location.name !== 'string') {
      throw new Error('Dữ liệu địa chỉ giao hàng không hợp lệ.');
    }

    return { id, name: location.name };
  });
}

export const DEFAULT_PROVINCES: ShippingLocation[] = [
  { id: 1000000, name: 'Hà Nội' },
  { id: 1000001, name: 'Hồ Chí Minh' },
  { id: 1000002, name: 'Huế' },
  { id: 1000003, name: 'Đà Nẵng' },
  { id: 1000004, name: 'Hải Phòng' },
  { id: 1000005, name: 'Cần Thơ' },
  { id: 1000006, name: 'Đồng Nai' },
  { id: 1000007, name: 'Gia Lai' },
  { id: 1000008, name: 'Khánh Hòa' },
  { id: 1000009, name: 'Lâm Đồng' },
  { id: 1000010, name: 'Đắk Lắk' },
  { id: 1000011, name: 'Vĩnh Long' },
  { id: 1000012, name: 'Đồng Tháp' },
  { id: 1000013, name: 'An Giang' },
  { id: 1000014, name: 'Tuyên Quang' },
  { id: 1000015, name: 'Phú Thọ' },
  { id: 1000016, name: 'Ninh Bình' },
  { id: 1000017, name: 'Quảng Trị' },
  { id: 1000018, name: 'Tây Ninh' },
  { id: 1000019, name: 'Quảng Ngãi' },
  { id: 1000020, name: 'Thái Nguyên' },
  { id: 1000021, name: 'Bắc Ninh' },
  { id: 1000022, name: 'Cà Mau' },
  { id: 1000023, name: 'Hưng Yên' },
  { id: 1000024, name: 'Lào Cai' },
  { id: 1000025, name: 'Lai Châu' },
  { id: 1000026, name: 'Điện Biên' },
  { id: 1000027, name: 'Sơn La' },
  { id: 1000028, name: 'Quảng Ninh' },
  { id: 1000029, name: 'Hà Tĩnh' },
  { id: 1000030, name: 'Thanh Hóa' },
  { id: 1000031, name: 'Nghệ An' },
  { id: 1000032, name: 'Cao Bằng' },
  { id: 1000033, name: 'Lạng Sơn' },
];

export const shippingService = {
  async getProvinces(signal?: AbortSignal): Promise<ShippingLocation[]> {
    try {
      const response = await apiClient.get<ShippingLocationsPayload>('/shipping/provinces', { signal });
      const locations = getLocations(response.data);
      return locations.length > 0 ? locations : DEFAULT_PROVINCES;
    } catch (error) {
      if ((error as any)?.name === 'CanceledError' || (error as any)?.code === 'ERR_CANCELED') {
        throw error;
      }
      console.warn('Backend provinces call failed, falling back to local provinces list:', error);
      return DEFAULT_PROVINCES;
    }
  },

  async getWards(provinceId: number, signal?: AbortSignal): Promise<ShippingLocation[]> {
    const response = await apiClient.get<ShippingLocationsPayload>('/shipping/wards', {
      params: { provinceId },
      signal,
    });
    return getLocations(response.data);
  },

  async getOrderPreview(
    request: ShippingOrderPreviewRequest,
    signal?: AbortSignal,
  ): Promise<ShippingOrderPreview> {
    const response = await apiClient.post<ApiResponse<ShippingOrderPreview>>(
      '/shipping/order-preview',
      request,
      { signal },
    );
    const preview = response.data.data;

    if (
      typeof preview?.total_fee !== 'number'
      || !Number.isFinite(preview.total_fee)
      || typeof preview.expected_delivery_time !== 'string'
      || Number.isNaN(Date.parse(preview.expected_delivery_time))
    ) {
      throw new Error('Dữ liệu phí vận chuyển không hợp lệ.');
    }

    return preview;
  },
};
