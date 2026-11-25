import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import {
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  getAuthStorageItem,
  setAuthTokensStorage,
  clearAuthTokensStorage,
} from '../services/apiClient';
import { parseJwt } from '../utils/format';
import { UserResponse } from '../types/user';
import { TokenClaims } from '../types/auth';

interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
  isGoogleAuth: boolean;
  login: (
    username: string,
    password?: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; user?: UserResponse }>;
  loginWithGoogle: (
    idToken: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; user?: UserResponse }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserLocal: (updatedData: Partial<UserResponse>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AUTH_PROVIDER_KEY = 'auth_provider';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(() => getAuthStorageItem(TOKEN_KEY));
  const [authProvider, setAuthProvider] = useState<'LOCAL' | 'GOOGLE'>(() => {
    return (getAuthStorageItem(AUTH_PROVIDER_KEY) as 'LOCAL' | 'GOOGLE') || 'LOCAL';
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Extract roles and user info from parsed JWT claims
  const tokenPayload: TokenClaims | null = token ? parseJwt(token) : null;
  const role = user?.role || tokenPayload?.scope || null;
  const isAdmin = role === 'ADMIN' || role === 'ROLE_ADMIN';
  const isStaff = role === 'STAFF' || role === 'ROLE_STAFF';
  const isCustomer = role === 'CUSTOMER' || role === 'ROLE_CUSTOMER';
  const isAuthenticated = !!token;
  const isGoogleAuth = authProvider === 'GOOGLE' || Boolean(user?.avt && user.avt.includes('googleusercontent.com'));

  const handleLogoutLocal = useCallback(() => {
    clearAuthTokensStorage();
    localStorage.removeItem(AUTH_PROVIDER_KEY);
    sessionStorage.removeItem(AUTH_PROVIDER_KEY);
    setToken(null);
    setUser(null);
    setAuthProvider('LOCAL');
  }, []);

  // Fetch complete user profile from backend
  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await userService.getCurrentUser();
      if (response && response.data) {
        setUser(response.data);
      }
    } catch (error: any) {
      console.warn('Could not load user profile with current token:', error);
      if (error?.response?.status === 401) {
        handleLogoutLocal();
      }
    }
  }, [handleLogoutLocal]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getAuthStorageItem(TOKEN_KEY);
      if (storedToken) {
        setToken(storedToken);
        await fetchUserProfile();
      }
      setIsLoading(false);
    };

    initAuth();

    // Listen for custom logout event emitted by axios interceptor
    const onLogoutEvent = () => {
      handleLogoutLocal();
    };

    window.addEventListener('auth-logout', onLogoutEvent);
    return () => window.removeEventListener('auth-logout', onLogoutEvent);
  }, [fetchUserProfile, handleLogoutLocal]);

  /**
   * Login with username and password
   */
  const login = async (username: string, password?: string, rememberMe = true) => {
    const res = await authService.login({ username, password });
    if (res?.data?.token) {
      const { token: accToken, refreshToken } = res.data;
      const storage = rememberMe ? localStorage : sessionStorage;
      const otherStorage = rememberMe ? sessionStorage : localStorage;
      otherStorage.removeItem(AUTH_PROVIDER_KEY);
      storage.setItem(AUTH_PROVIDER_KEY, 'LOCAL');
      setAuthTokensStorage(accToken, refreshToken, rememberMe);
      setAuthProvider('LOCAL');
      setToken(accToken);

      // Fetch user profile immediately
      try {
        const userRes = await userService.getCurrentUser();
        if (userRes?.data) {
          setUser(userRes.data);
          return { success: true, user: userRes.data };
        }
      } catch {
        const claims = parseJwt(accToken);
        const fallbackUser: UserResponse = {
          id: claims?.userId || 0,
          username: claims?.sub || username,
          email: '',
          role: claims?.scope || 'CUSTOMER',
        };
        setUser(fallbackUser);
        return { success: true, user: fallbackUser };
      }

      return { success: true };
    }
    throw new Error(res?.message || 'Đăng nhập không thành công');
  };

  /**
   * Login or auto-register via Google ID Token
   */
  const loginWithGoogle = async (idToken: string, rememberMe = true) => {
    const res = await authService.loginWithGoogle(idToken);
    if (res?.data?.token) {
      const { token: accToken, refreshToken } = res.data;
      const storage = rememberMe ? localStorage : sessionStorage;
      const otherStorage = rememberMe ? sessionStorage : localStorage;
      otherStorage.removeItem(AUTH_PROVIDER_KEY);
      storage.setItem(AUTH_PROVIDER_KEY, 'GOOGLE');
      setAuthTokensStorage(accToken, refreshToken, rememberMe);
      setAuthProvider('GOOGLE');
      setToken(accToken);

      try {
        const userRes = await userService.getCurrentUser();
        if (userRes?.data) {
          setUser(userRes.data);
          return { success: true, user: userRes.data };
        }
      } catch {
        const claims = parseJwt(accToken);
        const fallbackUser: UserResponse = {
          id: claims?.userId || 0,
          username: claims?.sub || 'google_user',
          email: '',
          role: claims?.scope || 'CUSTOMER',
        };
        setUser(fallbackUser);
        return { success: true, user: fallbackUser };
      }

      return { success: true };
    }
    throw new Error(res?.message || 'Đăng nhập Google không thành công');
  };

  /**
   * Logout user, notify backend to revoke tokens, and clear storage
   */
  const logout = async () => {
    const currentToken = getAuthStorageItem(TOKEN_KEY);
    const currentRefreshToken = getAuthStorageItem(REFRESH_TOKEN_KEY);

    try {
      if (currentToken && currentRefreshToken) {
        await authService.logout(currentToken, currentRefreshToken);
      }
    } catch (err) {
      console.warn('Backend logout error (continuing local logout):', err);
    } finally {
      handleLogoutLocal();
    }
  };

  /**
   * Re-fetch fresh user profile
   */
  const refreshProfile = async () => {
    await fetchUserProfile();
  };

  /**
   * Direct update local user state
   */
  const updateUserLocal = (updatedData: Partial<UserResponse>) => {
    setUser((prev) => (prev ? { ...prev, ...updatedData } : (updatedData as UserResponse)));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        isAdmin,
        isStaff,
        isCustomer,
        isGoogleAuth,
        login,
        loginWithGoogle,
        logout,
        refreshProfile,
        updateUserLocal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

