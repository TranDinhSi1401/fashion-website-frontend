import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  ShieldCheck,
  ShoppingBag,
  Heart,
} from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { REMEMBERED_USERNAME_KEY } from '../services/apiClient';
import { extractErrorMessage, parseJwt } from '../utils/format';
import { cn } from '../utils/cn';
import loginAtelierImg from '../assets/login-atelier.jpg';
import styles from './AuthPages.module.css';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState<string>(() => localStorage.getItem(REMEMBERED_USERNAME_KEY) || '');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(() => Boolean(localStorage.getItem(REMEMBERED_USERNAME_KEY)));
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isGoogleConfirmOpen, setIsGoogleConfirmOpen] = useState<boolean>(false);
  const [pendingGoogleToken, setPendingGoogleToken] = useState<string | null>(null);
  const [selectedGoogleAccount, setSelectedGoogleAccount] = useState<{
    email?: string;
    name?: string;
    picture?: string;
  } | null>(null);
  const isGoogleSubmittingRef = useRef<boolean>(false);

  const handleCloseGoogleConfirm = useCallback(() => {
    if (isLoading) return;
    setIsGoogleConfirmOpen(false);
    setPendingGoogleToken(null);
    setSelectedGoogleAccount(null);
  }, [isLoading]);

  useEffect(() => {
    if (!isGoogleConfirmOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        handleCloseGoogleConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isGoogleConfirmOpen, isLoading, handleCloseGoogleConfirm]);

  const redirectPath = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorMessage('Vui lòng nhập tên đăng nhập.');
      return;
    }
    if (trimmedUsername.length < 3) {
      setErrorMessage('Tên đăng nhập phải có ít nhất 3 ký tự.');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }
    if (password.length < 6 || password.length > 100) {
      setErrorMessage('Mật khẩu phải từ 6 đến 100 ký tự.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBERED_USERNAME_KEY, trimmedUsername);
      } else {
        localStorage.removeItem(REMEMBERED_USERNAME_KEY);
      }

      const res = await login(trimmedUsername, password, rememberMe);
      setSuccessMessage('Đăng nhập thành công! Đang chuyển hướng...');
      setTimeout(() => {
        if (['ADMIN', 'STAFF', 'ROLE_ADMIN', 'ROLE_STAFF'].includes(res?.user?.role || '')) {
          navigate('/admin/statistics/products', { replace: true });
        } else {
          navigate(redirectPath);
        }
      }, 600);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    if (!credentialResponse?.credential) {
      setErrorMessage('Không nhận được thông tin xác thực từ Google.');
      return;
    }

    const claims = parseJwt(credentialResponse.credential) as Record<string, any> | null;
    setSelectedGoogleAccount({
      email: claims?.email,
      name: claims?.name,
      picture: claims?.picture,
    });

    setPendingGoogleToken(credentialResponse.credential);
    setErrorMessage('');
    setIsGoogleConfirmOpen(true);
  };

  const handleGoogleError = () => {
    setErrorMessage('Xác thực với Google đã bị hủy hoặc gặp sự cố.');
  };

  const handleConfirmGoogleLogin = async () => {
    if (!pendingGoogleToken || isGoogleSubmittingRef.current || isLoading) {
      return;
    }

    isGoogleSubmittingRef.current = true;
    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await loginWithGoogle(pendingGoogleToken, rememberMe);
      setIsGoogleConfirmOpen(false);
      setPendingGoogleToken(null);
      setSelectedGoogleAccount(null);
      setSuccessMessage('Đăng nhập Google thành công! Đang chuyển hướng...');
      setTimeout(() => {
        if (['ADMIN', 'STAFF', 'ROLE_ADMIN', 'ROLE_STAFF'].includes(res?.user?.role || '')) {
          navigate('/admin/statistics/products', { replace: true });
        } else {
          navigate(redirectPath);
        }
      }, 600);
    } catch (err) {
      setIsGoogleConfirmOpen(false);
      setErrorMessage(extractErrorMessage(err, 'Đăng nhập bằng Google thất bại.'));
    } finally {
      isGoogleSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const isGoogleConfigured = googleClientId && !googleClientId.includes('your_google_web_client_id_here');

  return (
    <div className={styles.loginSplitViewport}>
      {/* =========================================================================
          SEAMLESS PANORAMIC ATELIER BACKGROUND
          ========================================================================= */}
      <div className={styles.loginAtelierShowcase} aria-hidden="true">
        <div className={styles.loginAtelierFrame}>
          <img
            src={loginAtelierImg}
            alt="Bộ sưu tập thời trang cao cấp FashionWeb"
            className={styles.loginAtelierImg}
          />
          <div className={styles.loginAtelierOverlay} />
        </div>
      </div>

      {/* =========================================================================
          LEFT PANEL: Luxury Editorial Showcase
          ========================================================================= */}
      <aside className={styles.loginBrandPanel}>
        <div className={styles.loginBrandTag}>
          <Sparkles size={14} className={styles.goldIcon} />
          <span>FASHIONWEB</span>
          <span className={styles.loginSeasonBadge}>ATELIER</span>
        </div>

        <div className={styles.loginEditorialBlock}>
          <h1 className={styles.loginEditorialTitle}>
            Không gian thời trang
            <br />
            <span className={cn(styles.loginEditorialItalic, 'whitespace-nowrap')}>cao cấp</span>{' '}
            của riêng bạn
          </h1>
          <p className={styles.loginEditorialSub}>
            Đăng nhập để xem đơn hàng, bộ sưu tập đã lưu và ưu đãi dành riêng cho thành viên.
          </p>

          <div className={styles.loginFeaturePills}>
            <span className={styles.loginFeaturePill}>
              <ShoppingBag size={13} className={styles.goldIcon} />
              Theo dõi đơn hàng
            </span>
            <span className={styles.loginFeaturePill}>
              <Heart size={13} className={styles.goldIcon} />
              Bộ sưu tập đã lưu
            </span>
            <span className={styles.loginFeaturePill}>
              <ShieldCheck size={13} className={styles.goldIcon} />
              Đặc quyền thành viên
            </span>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          RIGHT PANEL: Clean Luxury Login Form
          ========================================================================= */}
      <main className={styles.loginFormPanel}>
        <div className={cn('animate-slide-up', styles.loginFormWrap)}>
          <div className={styles.loginTopGleam} />
          <div className="mb-6">
            <span className={styles.loginFormEyebrow}>Thành viên FashionWeb</span>
            <h2 className={styles.loginFormHeading}>Đăng nhập</h2>
            <p className={styles.subtitleDark}>Chào mừng bạn trở lại.</p>
          </div>

          {/* Dynamic Alerts */}
          {errorMessage && (
            <div className={cn('animate-fade-in', styles.darkAlertError)}>
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className={cn('animate-fade-in', styles.darkAlertSuccess)}>
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Username */}
            <div>
              <label htmlFor="login-username" className={styles.labelDark}>
                Tên đăng nhập
              </label>
              <div className="relative flex items-center">
                <span className={styles.inputIconDark}>
                  <User size={17} />
                </span>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  placeholder="Nhập tên đăng nhập"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className={styles.loginInputModern}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className={styles.labelDark}>
                Mật khẩu
              </label>
              <div className="relative flex items-center">
                <span className={styles.inputIconDark}>
                  <Lock size={17} />
                </span>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={cn(styles.loginInputModern, styles.loginPasswordInput)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.eyeToggleDark}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me + Forgot Password */}
            <div className={styles.rememberRow}>
              <label className={styles.rememberLabel}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    styles.rememberCheckbox,
                    rememberMe && styles.rememberCheckboxChecked
                  )}
                  aria-hidden="true"
                >
                  {rememberMe && <Check size={12} strokeWidth={3} />}
                </span>
                <span>Ghi nhớ đăng nhập</span>
              </label>

              <Link to="/forgot-password" className={cn(styles.forgotLink, styles.goldAccentText)}>
                Quên mật khẩu?
              </Link>
            </div>

            {/* Submit Button */}
            <button type="submit" disabled={isLoading} className={styles.goldSubmitBtnModern}>
              {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
            </button>
          </form>

          {/* Divider */}
          <div className={styles.dividerDark}>
            <div className={styles.dividerLineDark} />
            <span className="px-3.5 lowercase tracking-[0.06em]">hoặc</span>
            <div className={styles.dividerLineDark} />
          </div>

          {/* Google OAuth */}
          <div className="w-full flex justify-center">
            {isGoogleConfigured ? (
              <div className={styles.googleIframeWrap}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  theme="filled_black"
                  size="large"
                  text="continue_with"
                  shape="rectangular"
                  width="350"
                />
              </div>
            ) : (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setErrorMessage('Vui lòng cấu hình VITE_GOOGLE_CLIENT_ID trong file .env để kích hoạt Google OAuth.');
                }}
                className={styles.googleDarkBtn}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    className={styles.googleBlue}
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    className={styles.googleGreen}
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    className={styles.googleYellow}
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    className={styles.googleRed}
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Tiếp tục với Google</span>
              </button>
            )}
          </div>

          {/* Register Prompt */}
          <div className={styles.registerPromptDark}>
            Chưa có tài khoản?{' '}
            <Link
              to="/register"
              className={cn('font-semibold hover:underline tracking-[0.01em]', styles.goldAccentText)}
            >
              Tạo tài khoản mới
            </Link>
          </div>
        </div>
      </main>

      {/* Google Sign-In Confirmation Dialog */}
      {isGoogleConfirmOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={handleCloseGoogleConfirm}
          role="dialog"
          aria-modal="true"
          aria-labelledby="google-confirm-title"
        >
          <div
            className={styles.confirmDialogCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.dialogTopGleam} />

            <div className={styles.dialogHeader}>
              <div className="flex items-center gap-2">
                <Sparkles size={18} className={styles.goldIcon} />
                <h3 id="google-confirm-title" className={styles.dialogTitle}>
                  Xác nhận đăng nhập
                </h3>
              </div>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleCloseGoogleConfirm}
                className={styles.dialogCloseBtn}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            {selectedGoogleAccount && (selectedGoogleAccount.email || selectedGoogleAccount.name) && (
              <div className={styles.dialogAccountCard}>
                <div className="flex items-center gap-3 min-w-0">
                  {selectedGoogleAccount.picture ? (
                    <img
                      src={selectedGoogleAccount.picture}
                      alt={selectedGoogleAccount.name || 'Google avatar'}
                      className={styles.dialogAvatar}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={styles.dialogAvatarFallback}>
                      {(selectedGoogleAccount.name || selectedGoogleAccount.email || 'G').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    {selectedGoogleAccount.name && (
                      <p className={styles.dialogAccountName}>
                        {selectedGoogleAccount.name}
                      </p>
                    )}
                    {selectedGoogleAccount.email && (
                      <p className={styles.dialogAccountEmail}>
                        {selectedGoogleAccount.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-white/90 border border-white/10 shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      className={styles.googleBlue}
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      className={styles.googleGreen}
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      className={styles.googleYellow}
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      className={styles.googleRed}
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google</span>
                </div>
              </div>
            )}

            <p className={styles.dialogMessage}>
              Bạn có chắc chắn muốn đăng nhập bằng tài khoản Google không?
            </p>

            <div className={styles.dialogActions}>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleCloseGoogleConfirm}
                className={styles.dialogCancelBtn}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleConfirmGoogleLogin}
                className={styles.dialogConfirmBtn}
              >
                {isLoading ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
