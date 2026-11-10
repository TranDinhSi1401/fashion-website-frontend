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

export const shippingService = {
  async getProvinces(signal?: AbortSignal): Promise<ShippingLocation[]> {
    const response = await apiClient.get<ShippingLocationsPayload>('/shipping/provinces', { signal });
    return getLocations(response.data);
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
