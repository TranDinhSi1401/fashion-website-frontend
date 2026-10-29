export interface LoginRequest {
  username: string;
  password?: string;
}

export interface GoogleLoginRequest {
  idToken: string;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
  authenticated: boolean;
}

export interface RegisterRequest {
  username: string;
  password?: string;
  fullname: string;
  email: string;
  phone: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  tempPassword: string;
  newPassword?: string;
  confirmPassword?: string;
}

export interface IntrospectRequest {
  token: string;
}

export interface IntrospectResponse {
  valid: boolean;
}

export interface TokenClaims {
  sub: string;
  userId: number;
  scope: 'ADMIN' | 'STAFF' | 'CUSTOMER' | string;
  exp: number;
  [key: string]: any;
}

