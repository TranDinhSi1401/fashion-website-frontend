import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../utils/format';
import { cn } from '../utils/cn';
import styles from './AuthPages.module.css';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const redirectPath = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await login(username.trim(), password);
      setSuccessMessage('Đăng nhập thành công! Đang chuyển hướng...');
      setTimeout(() => {
        if (res?.user?.role === 'ADMIN' || res?.user?.role === 'STAFF') {
          navigate('/admin/products');
        } else {
          navigate(redirectPath);
        }
      }, 600);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Tên đăng nhập hoặc mật khẩu không chính xác.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse?.credential) {
      setErrorMessage('Không nhận được thông tin xác thực từ Google.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await loginWithGoogle(credentialResponse.credential);
      setSuccessMessage('Đăng nhập Google thành công! Đang chuyển hướng...');
      setTimeout(() => {
        if (res?.user?.role === 'ADMIN' || res?.user?.role === 'STAFF') {
          navigate('/admin/products');
        } else {
          navigate(redirectPath);
        }
      }, 600);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Đăng nhập bằng Google thất bại.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setErrorMessage('Xác thực với Google đã bị hủy hoặc gặp sự cố.');
  };

  const fillDemoAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage('');
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const isGoogleConfigured = googleClientId && !googleClientId.includes('your_google_web_client_id_here');

  return (
    <div className={cn(styles.authViewport, styles.authViewportDark)}>
      {/* =========================================================================
          BACKGROUND LAYER 1: Deep Moody Vignette & Ambient Golden Backlights
          ========================================================================= */}
      <div className={styles.loginVignette} />

      {/* Warm Golden Atmosphere Behind Right 3D Ribbon */}
      <div className={styles.loginWarmGlow} />

      {/* Deep Bronze Glow Behind Left Silk & Cubes */}
      <div className={styles.loginBronzeGlow} />

      {/* =========================================================================
          BACKGROUND LAYER 2: Realistic 3D Elements (Left Silk Drapes + Cubes)
          ========================================================================= */}
      {/* Left Silk Drapery SVG with Realistic Gradients and Shadows */}
      <div className={styles.silkLayer}>
        <svg width="100%" height="100%" viewBox="0 0 420 480" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="silkGold1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className={styles.stopSilk1a} />
              <stop offset="30%" className={styles.stopSilk1b} />
              <stop offset="55%" className={styles.stopSilk1c} />
              <stop offset="70%" className={styles.stopSilk1d} />
              <stop offset="100%" className={styles.stopSilk1e} />
            </linearGradient>

            <linearGradient id="silkGold2" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" className={styles.stopSilk2a} />
              <stop offset="40%" className={styles.stopSilk2b} />
              <stop offset="65%" className={styles.stopSilk2c} />
              <stop offset="85%" className={styles.stopSilk2d} />
              <stop offset="100%" className={styles.stopSilk2e} />
            </linearGradient>

            <linearGradient id="silkShadow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" className={styles.stopShadowA} />
              <stop offset="50%" className={styles.stopShadowB} />
              <stop offset="100%" className={styles.stopShadowC} />
            </linearGradient>

            <filter id="silkBlur" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1.5" />
            </filter>
          </defs>

          {/* Deep shadow fold layer */}
          <path
            d="M-50 -20 C 80 70, 140 180, 80 320 C 40 410, 120 440, 220 380 C 130 460, 40 480, -50 440 Z"
            fill="url(#silkShadow)"
          />

          {/* Primary Silk Ribbon Wave 1 */}
          <path
            d="M-40 -30 C 60 50, 160 140, 120 260 C 90 350, 170 380, 260 300 C 180 360, 80 380, 20 280 C -30 200, 20 100, -40 -30 Z"
            fill="url(#silkGold1)"
            filter="url(#silkBlur)"
          />

          {/* Secondary Silk Ribbon Wave 2 (Top cascade drape) */}
          <path
            d="M-20 -40 C 40 40, 100 80, 180 60 C 260 40, 310 90, 340 160 C 280 120, 220 110, 150 140 C 90 170, 30 140, -20 -40 Z"
            fill="url(#silkGold2)"
          />

          {/* Third Delicate Swirl Fold */}
          <path
            d="M140 140 C 200 170, 260 160, 300 240 C 270 200, 220 190, 160 210 C 110 230, 90 280, 70 350 C 70 280, 100 220, 140 140 Z"
            fill="url(#silkGold1)"
            opacity="0.8"
          />
        </svg>
      </div>

      {/* Floating 3D Geometric Gold Wireframe & Black Cubes (Bottom Left) */}
      <div className={styles.cubesLayer}>
        <svg width="100%" height="100%" viewBox="0 0 260 240" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="goldFrameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className={styles.stopFrameA} />
              <stop offset="35%" className={styles.stopFrameB} />
              <stop offset="70%" className={styles.stopFrameC} />
              <stop offset="100%" className={styles.stopFrameD} />
            </linearGradient>

            <linearGradient id="cubeDarkTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className={styles.stopCubeTopA} />
              <stop offset="100%" className={styles.stopCubeTopB} />
            </linearGradient>

            <linearGradient id="cubeDarkLeft" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" className={styles.stopCubeLeftA} />
              <stop offset="100%" className={styles.stopCubeLeftB} />
            </linearGradient>

            <linearGradient id="cubeDarkRight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" className={styles.stopCubeRightA} />
              <stop offset="100%" className={styles.stopCubeRightB} />
            </linearGradient>
          </defs>

          {/* 3D Tilted Gold Wireframe Beveled Square */}
          <g transform="translate(60, 40) rotate(-18)">
            {/* Outer Gold Frame */}
            <path
              d="M 20 20 L 110 20 L 110 110 L 20 110 Z"
              stroke="url(#goldFrameGrad)"
              strokeWidth="12"
              strokeLinejoin="miter"
              className={styles.svgFrameDropShadow}
            />
            {/* Bevel highlight line */}
            <path
              d="M 24 24 L 106 24"
              className={styles.svgBevelStroke}
              strokeWidth="2"
              opacity="0.8"
            />
          </g>

          {/* 3D Dark Obsidian Cube 1 */}
          <g transform="translate(10, 110)">
            {/* Top face */}
            <polygon points="40,10 75,25 40,40 5,25" fill="url(#cubeDarkTop)" />
            {/* Left face */}
            <polygon points="5,25 40,40 40,80 5,65" fill="url(#cubeDarkLeft)" />
            {/* Right face */}
            <polygon points="40,40 75,25 75,65 40,80" fill="url(#cubeDarkRight)" />
          </g>

          {/* 3D Dark Obsidian Cube 2 (Layered behind) */}
          <g transform="translate(85, 125) scale(0.85)">
            <polygon points="40,10 75,25 40,40 5,25" fill="url(#cubeDarkTop)" />
            <polygon points="5,25 40,40 40,80 5,65" fill="url(#cubeDarkLeft)" />
            <polygon points="40,40 75,25 75,65 40,80" fill="url(#cubeDarkRight)" />
          </g>
        </svg>
      </div>

      {/* =========================================================================
          BACKGROUND LAYER 3: Realistic 3D Ribbon Sculpture & Star (Right Side)
          ========================================================================= */}
      <div className={styles.ribbonLayer}>
        <svg width="100%" height="100%" viewBox="0 0 420 520" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Polished Realistic Metallic Gold Gradient */}
            <linearGradient id="ribbonGoldOuter" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className={styles.stopRibbonGoldA} />
              <stop offset="25%" className={styles.stopRibbonGoldB} />
              <stop offset="48%" className={styles.stopRibbonGoldC} />
              <stop offset="70%" className={styles.stopRibbonGoldD} />
              <stop offset="88%" className={styles.stopRibbonGoldE} />
              <stop offset="100%" className={styles.stopRibbonGoldF} />
            </linearGradient>

            {/* Deep Obsidian Black Lacquer Core Gradient */}
            <linearGradient id="ribbonBlackCore" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className={styles.stopRibbonCoreA} />
              <stop offset="20%" className={styles.stopRibbonCoreB} />
              <stop offset="60%" className={styles.stopRibbonCoreC} />
              <stop offset="85%" className={styles.stopRibbonCoreD} />
              <stop offset="100%" className={styles.stopRibbonCoreE} />
            </linearGradient>

            <linearGradient id="goldSpecHighlight" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" className={styles.stopSpecA} />
              <stop offset="100%" className={styles.stopSpecB} />
            </linearGradient>

            <filter id="ribbonShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="-10" dy="18" stdDeviation="22" floodColor="rgb(0, 0, 0)" floodOpacity="0.85" />
            </filter>
          </defs>

          {/* Ambient 3D Ribbon Shadow */}
          <path
            d="M 120 70 C 260 30, 360 120, 310 240 C 260 360, 200 460, 330 490"
            className={styles.svgShadowPath}
            strokeWidth="60"
            strokeLinecap="round"
            opacity="0.6"
            filter="url(#ribbonShadow)"
          />

          {/* Outer Gold Sculptural Spiral Ribbon */}
          <path
            d="M 140 70 C 270 30, 370 120, 320 230 C 270 340, 220 420, 320 470"
            stroke="url(#ribbonGoldOuter)"
            strokeWidth="48"
            strokeLinecap="round"
            fill="none"
          />

          {/* Inner Black Lacquer Ribbon Core */}
          <path
            d="M 140 70 C 270 30, 370 120, 320 230 C 270 340, 220 420, 320 470"
            stroke="url(#ribbonBlackCore)"
            strokeWidth="26"
            strokeLinecap="round"
            fill="none"
          />

          {/* Thin Polished Gold Center Accent Spine */}
          <path
            d="M 148 70 C 274 34, 366 122, 318 230 C 272 338, 222 418, 318 468"
            className={styles.svgRibbonSpine}
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.9"
          />

          {/* Realistic Specular Gleam Highlight on top curve */}
          <ellipse
            cx="285"
            cy="75"
            rx="28"
            ry="7"
            transform="rotate(-15, 285, 75)"
            fill="url(#goldSpecHighlight)"
            opacity="0.8"
          />
        </svg>

        {/* 4-Point Gold Diamond Star Sparkle */}
        <div className={styles.sparkleStar}>
          <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none">
            <path
              d="M 50 0 C 50 35, 65 50, 100 50 C 65 50, 50 65, 50 100 C 50 65, 35 50, 0 50 C 35 50, 50 35, 50 0 Z"
              fill="url(#ribbonGoldOuter)"
            />
          </svg>
        </div>
      </div>

      {/* =========================================================================
          CENTRAL GLASSMORPHIC LOGIN CONTAINER
          ========================================================================= */}
      <div className={cn('animate-slide-up', styles.loginCard)}>
        {/* Subtle top edge metallic glow */}
        <div className={styles.loginTopGleam} />

        {/* Heading Section */}
        <div className="text-center mb-[26px]">
          <div className="inline-flex items-center justify-center gap-1.5 text-[0.72rem] font-bold tracking-[0.12em] uppercase text-accent-gold mb-2">
            <Sparkles size={13} className={styles.goldIcon} />
            Xác Thực Tài Khoản
          </div>

          <h2 className={cn('text-[2rem] font-extrabold tracking-[0.04em] uppercase text-content-inverse mb-1.5', styles.loginTitle)}>
            Đăng Nhập
          </h2>

          <p className={styles.subtitleDark}>
            Chào mừng bạn trở lại với không gian thời trang cao cấp
          </p>
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

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Username Input Field */}
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
                placeholder="Nhập username của bạn..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className={styles.loginInput}
              />
            </div>
          </div>

          {/* Password Input Field */}
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className={cn(styles.loginInput, styles.loginPasswordInput)}
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

          {/* Forgot Password Link */}
          <div className="flex justify-end -mt-0.5">
            <Link to="/forgot-password" className={styles.forgotLink}>
              Quên mật khẩu?
            </Link>
          </div>

          {/* Submit Button: Luxurious Brushed Gold Button */}
          <button type="submit" disabled={isLoading} className={styles.goldSubmitBtn}>
            {isLoading ? 'Đang xác thực...' : 'Đăng Nhập Ngay'}
          </button>
        </form>

        {/* Divider: HOẶC */}
        <div className={styles.dividerDark}>
          <div className={styles.dividerLineDark} />
          <span className="px-3.5">HOẶC</span>
          <div className={styles.dividerLineDark} />
        </div>

        {/* Google OAuth Login Button */}
        <div className="w-full flex justify-center">
          {isGoogleConfigured ? (
            <div className="w-full flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
                width="378"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setErrorMessage('Vui lòng cấu hình VITE_GOOGLE_CLIENT_ID trong file .env để kích hoạt Google OAuth.');
              }}
              className={styles.googleFallbackBtn}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
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
              <span>Đăng nhập bằng Google</span>
            </button>
          )}
        </div>

        {/* Quick Fill Test Accounts Helper */}
        <div className={styles.demoHelperBox}>
          <div className="font-bold text-accent-gold mb-1.5 uppercase tracking-[0.04em]">
            ⚡ Tài khoản thử nghiệm nhanh:
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => fillDemoAccount('customer1', 'password123')}
              className={cn(styles.demoHelperBtn, 'text-content-inverse')}
            >
              👤 Customer: customer1
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('admin', 'admin123')}
              className={cn(styles.demoHelperBtn, styles.goldAccentText)}
            >
              🛡️ Admin: admin
            </button>
          </div>
        </div>

        {/* Register Prompt */}
        <div className={styles.registerPromptDark}>
          Chưa có tài khoản?{' '}
          <Link
            to="/register"
            className={cn('font-bold underline tracking-[0.02em]', styles.goldAccentText)}
          >
            Tạo tài khoản mới
          </Link>
        </div>
      </div>
    </div>
  );
}
