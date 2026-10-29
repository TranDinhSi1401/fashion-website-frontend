export interface ApiResponse<T = any> {
  code: number;
  message?: string | null;
  data: T;
}

