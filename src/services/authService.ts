import apiClient from './apiClient';
import { ApiResponse } from '../types/api';
import {
  LoginRequest,
  AuthTokens,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  IntrospectResponse,
} from '../types/auth';
import { UserResponse } from '../types/user';

export const authService = {
  /**
   * Login with username and password
   */
  async login(data: LoginRequest): Promise<ApiResponse<AuthTokens>> {
    const res = await apiClient.post<ApiResponse<AuthTokens>>('/auth/login', data);
    return res.data;
  },

  /**
   * Login or Auto-Register via Google OAuth2 ID Token
   */
  async loginWithGoogle(idToken: string): Promise<ApiResponse<AuthTokens>> {
    const res = await apiClient.post<ApiResponse<AuthTokens>>('/auth/google', { idToken });
    return res.data;
  },

  /**
   * Register a new user account
   */
  async register(data: RegisterRequest): Promise<ApiResponse<UserResponse>> {
    const res = await apiClient.post<ApiResponse<UserResponse>>('/auth/register', data);
    return res.data;
  },

  /**
   * Request password reset - Step 1: Send temp password to email
   */
  async forgotPassword(email: string): Promise<ApiResponse<null>> {
    const res = await apiClient.post<ApiResponse<null>>('/auth/forgot-password', { email });
    return res.data;
  },

  /**
   * Reset password - Step 2: Verify temp password and set new password
   */
  async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse<null>> {
    const res = await apiClient.post<ApiResponse<null>>('/auth/reset-password', data);
    return res.data;
  },

  /**
   * Refresh Token Rotation
   */
  async refresh(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
    const res = await apiClient.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken });
    return res.data;
  },

  /**
   * Logout and revoke tokens
   */
  async logout(token: string, refreshToken: string): Promise<ApiResponse<null>> {
    const res = await apiClient.post<ApiResponse<null>>('/auth/logout', { token, refreshToken });
    return res.data;
  },

  /**
   * Verify token validity
   */
  async introspect(token: string): Promise<ApiResponse<IntrospectResponse>> {
    const res = await apiClient.post<ApiResponse<IntrospectResponse>>('/auth/introspect', { token });
    return res.data;
  },
};

