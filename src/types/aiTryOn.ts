export type TryOnCategory = 'upper_body' | 'lower_body' | 'dresses';

export type TryOnStatus = 'idle' | 'preparing' | 'uploading' | 'processing' | 'success' | 'error';

export interface DemoModel {
  id: string;
  name: string;
  gender: 'male' | 'female';
  imageUrl: string;
  height: string;
  weight: string;
  fit: string;
}

export interface TryOnProgress {
  percent: number;
  stage: string;
  detail: string;
}

export interface TryOnResult {
  outputImageUrl: string;
  originalPersonImageUrl: string;
  garmentImageUrl: string;
  productName: string;
  executionTimeSec: number;
}

export interface TryOnRequestOptions {
  personImage: Blob | File | string;
  garmentImage: Blob | File | string;
  garmentDescription: string;
  category?: TryOnCategory;
  denoiseSteps?: number;
  seed?: number;
  onProgress?: (progress: TryOnProgress) => void;
}

