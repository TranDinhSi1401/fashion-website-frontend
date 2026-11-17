import apiClient from './apiClient';
import { ApiResponse } from '../types/api';

export interface SpecialOfferResponse {
  id: number;
  title: string;
  offerType: 'PERCENT' | 'AMOUNT';
  discountPercent?: number | null;
  discountAmount?: number | null;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

type SpecialOfferPayload =
  | SpecialOfferResponse
  | SpecialOfferResponse[]
  | ApiResponse<SpecialOfferResponse | SpecialOfferResponse[]>;

function normalizeSpecialOffer(value: unknown): SpecialOfferResponse | null {
  if (!value || typeof value !== 'object') return null;

  const offer = value as Partial<SpecialOfferResponse>;
  const isOptionalAmount = (amount: unknown) =>
    amount === undefined ||
    amount === null ||
    (typeof amount === 'number' && Number.isFinite(amount) && amount >= 0);

  const validOffer =
    typeof offer.id === 'number' &&
    Number.isFinite(offer.id) &&
    typeof offer.title === 'string' &&
    typeof offer.offerType === 'string' &&
    typeof offer.isActive === 'boolean' &&
    isOptionalAmount(offer.discountPercent) &&
    isOptionalAmount(offer.discountAmount) &&
    isOptionalAmount(offer.minOrderAmount) &&
    isOptionalAmount(offer.maxDiscountAmount) &&
    (offer.startDate === undefined || typeof offer.startDate === 'string') &&
    (offer.endDate === undefined || typeof offer.endDate === 'string') &&
    (offer.createdAt === undefined || typeof offer.createdAt === 'string') &&
    (offer.updatedAt === undefined || typeof offer.updatedAt === 'string');

  if (!validOffer) return null;

  const offerType =
    offer.offerType === 'PERCENT'
      ? 'PERCENT'
      : offer.offerType === 'AMOUNT'
        ? 'AMOUNT'
        : typeof offer.discountAmount === 'number' && offer.discountAmount > 0
          ? 'AMOUNT'
          : typeof offer.discountPercent === 'number'
            ? 'PERCENT'
            : typeof offer.discountAmount === 'number'
              ? 'AMOUNT'
              : null;

  if (
    !offerType ||
    (offerType === 'PERCENT' && typeof offer.discountPercent !== 'number') ||
    (offerType === 'AMOUNT' && typeof offer.discountAmount !== 'number')
  ) {
    return null;
  }

  return { ...(offer as SpecialOfferResponse), offerType };
}

export const specialOfferService = {
  async getActiveOffers(): Promise<SpecialOfferResponse[]> {
    const response = await apiClient.get<SpecialOfferPayload>(
      '/special-offers/active'
    );
    const payload = response.data;
    const offers =
      payload && typeof payload === 'object' && 'data' in payload
        ? payload.data
        : payload;

    if (Array.isArray(offers)) {
      const normalizedOffers = offers.map(normalizeSpecialOffer);
      if (normalizedOffers.some((offer) => offer === null)) {
        throw new Error('Dữ liệu ưu đãi không hợp lệ.');
      }
      return normalizedOffers.filter(
        (offer): offer is SpecialOfferResponse => offer !== null
      );
    }

    const normalizedOffer = normalizeSpecialOffer(offers);
    if (!normalizedOffer) {
      throw new Error('Dữ liệu ưu đãi không hợp lệ.');
    }

    return [normalizedOffer];
  },
};
