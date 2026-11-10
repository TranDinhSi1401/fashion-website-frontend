import apiClient from './apiClient';

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
};
