import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '../services/apiClient';
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
  login: (username: string, password?: string) => Promise<{ success: boolean; user?: UserResponse }>;
  loginWithGoogle: (idToken: string) => Promise<{ success: boolean; user?: UserResponse }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserLocal: (updatedData: Partial<UserResponse>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Extract roles and user info from parsed JWT claims
  const tokenPayload: TokenClaims | null = token ? parseJwt(token) : null;
  const role = user?.role || tokenPayload?.scope || null;
  const isAdmin = role === 'ADMIN' || role === 'ROLE_ADMIN';
  const isStaff = role === 'STAFF' || role === 'ROLE_STAFF';
  const isCustomer = role === 'CUSTOMER' || role === 'ROLE_CUSTOMER';
  const isAuthenticated = !!token;

  const handleLogoutLocal = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setToken(null);
    setUser(null);
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
      const storedToken = localStorage.getItem(TOKEN_KEY);
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
  const login = async (username: string, password?: string) => {
    const res = await authService.login({ username, password });
    if (res?.data?.token) {
      const { token: accToken, refreshToken } = res.data;
      localStorage.setItem(TOKEN_KEY, accToken);
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
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
  const loginWithGoogle = async (idToken: string) => {
    const res = await authService.loginWithGoogle(idToken);
    if (res?.data?.token) {
      const { token: accToken, refreshToken } = res.data;
      localStorage.setItem(TOKEN_KEY, accToken);
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
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
    const currentToken = localStorage.getItem(TOKEN_KEY);
    const currentRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

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

