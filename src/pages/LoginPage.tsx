import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../utils/format';

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

  const redirectPath = (location.state as any)?.from?.pathname || '/';

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
    } catch (err: any) {
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
    } catch (err: any) {
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
    <div
      style={{
        minHeight: 'calc(100vh - var(--header-height) - var(--topbar-height))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#070709',
        padding: '50px 20px',
      }}
    >
      {/* =========================================================================
          BACKGROUND LAYER 1: Deep Moody Vignette & Ambient Golden Backlights
          ========================================================================= */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 50%, rgba(24, 21, 18, 0.9) 0%, rgba(10, 10, 13, 0.98) 65%, #050507 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Warm Golden Atmosphere Behind Right 3D Ribbon */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          right: '5%',
          width: '550px',
          height: '550px',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.16) 0%, rgba(184, 134, 11, 0.05) 50%, transparent 70%)',
          filter: 'blur(75px)',
          pointerEvents: 'none',
          animation: 'pulseGlow 8s ease-in-out infinite',
        }}
      />

      {/* Deep Bronze Glow Behind Left Silk & Cubes */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '2%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(160, 120, 50, 0.14) 0%, transparent 65%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />

      {/* =========================================================================
          BACKGROUND LAYER 2: Realistic 3D Elements (Left Silk Drapes + Cubes)
          ========================================================================= */}
      {/* Left Silk Drapery SVG with Realistic Gradients and Shadows */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '420px',
          height: '480px',
          pointerEvents: 'none',
          zIndex: 1,
          opacity: 0.85,
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 420 480" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="silkGold1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4A3B22" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#A8894E" stopOpacity="0.85" />
              <stop offset="55%" stopColor="#D9BA76" stopOpacity="0.95" />
              <stop offset="70%" stopColor="#755829" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#251D12" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id="silkGold2" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#2F2516" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#B39355" stopOpacity="0.8" />
              <stop offset="65%" stopColor="#F0D597" stopOpacity="0.9" />
              <stop offset="85%" stopColor="#5E4620" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#18130B" stopOpacity="0.98" />
            </linearGradient>

            <linearGradient id="silkShadow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#050507" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#120E08" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#050507" stopOpacity="0.9" />
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
      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          left: '4%',
          width: '260px',
          height: '240px',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 260 240" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="goldFrameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F9DF98" />
              <stop offset="35%" stopColor="#D4AF37" />
              <stop offset="70%" stopColor="#8A6A23" />
              <stop offset="100%" stopColor="#4A3810" />
            </linearGradient>

            <linearGradient id="cubeDarkTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2A2A32" />
              <stop offset="100%" stopColor="#15151A" />
            </linearGradient>

            <linearGradient id="cubeDarkLeft" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1C1C22" />
              <stop offset="100%" stopColor="#0E0E12" />
            </linearGradient>

            <linearGradient id="cubeDarkRight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#121216" />
              <stop offset="100%" stopColor="#08080A" />
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
              filter="drop-shadow(0px 10px 18px rgba(0,0,0,0.85))"
            />
            {/* Bevel highlight line */}
            <path
              d="M 24 24 L 106 24"
              stroke="#FFF2CC"
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
      <div
        style={{
          position: 'absolute',
          top: '8%',
          right: '3%',
          width: '420px',
          height: '520px',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 420 520" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Polished Realistic Metallic Gold Gradient */}
            <linearGradient id="ribbonGoldOuter" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF0C2" />
              <stop offset="25%" stopColor="#ECC880" />
              <stop offset="48%" stopColor="#D4AF37" />
              <stop offset="70%" stopColor="#967425" />
              <stop offset="88%" stopColor="#ECC880" />
              <stop offset="100%" stopColor="#5C4510" />
            </linearGradient>

            {/* Deep Obsidian Black Lacquer Core Gradient */}
            <linearGradient id="ribbonBlackCore" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#303038" />
              <stop offset="20%" stopColor="#1C1C22" />
              <stop offset="60%" stopColor="#0F0F13" />
              <stop offset="85%" stopColor="#1A1A20" />
              <stop offset="100%" stopColor="#08080A" />
            </linearGradient>

            <linearGradient id="goldSpecHighlight" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ECC880" stopOpacity="0" />
            </linearGradient>

            <filter id="ribbonShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="-10" dy="18" stdDeviation="22" floodColor="#000000" floodOpacity="0.85" />
            </filter>
          </defs>

          {/* Ambient 3D Ribbon Shadow */}
          <path
            d="M 120 70 C 260 30, 360 120, 310 240 C 260 360, 200 460, 330 490"
            stroke="#000000"
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

          {/* Inner Black Lacquer Ribbon Core (giving the dual-layer luxury look from screenshot) */}
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
            stroke="#ECC880"
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

        {/* 4-Point Gold Diamond Star Sparkle (Bottom Right of card, matching screenshot) */}
        <div
          style={{
            position: 'absolute',
            bottom: '75px',
            left: '-10px',
            width: '42px',
            height: '42px',
            animation: 'pulseGlow 4s ease-in-out infinite',
            filter: 'drop-shadow(0 0 12px rgba(212, 175, 55, 0.7))',
          }}
        >
          <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none">
            <path
              d="M 50 0 C 50 35, 65 50, 100 50 C 65 50, 50 65, 50 100 C 50 65, 35 50, 0 50 C 35 50, 50 35, 50 0 Z"
              fill="url(#ribbonGoldOuter)"
            />
          </svg>
        </div>
      </div>

      {/* =========================================================================
          CENTRAL GLASSMORPHIC LOGIN CONTAINER (Accurately Styled from Screenshot)
          ========================================================================= */}
      <div
        className="animate-slide-up"
        style={{
          width: '100%',
          maxWidth: '450px',
          backgroundColor: 'rgba(20, 20, 26, 0.68)',
          backdropFilter: 'blur(32px) saturate(160%)',
          WebkitBackdropFilter: 'blur(32px) saturate(160%)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow:
            '0 30px 80px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(212, 175, 55, 0.15), 0 0 40px rgba(212, 175, 55, 0.08)',
          position: 'relative',
          zIndex: 10,
          padding: '42px 36px 36px',
        }}
      >
        {/* Subtle top edge metallic glow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            right: '15%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(236, 200, 128, 0.65), transparent)',
          }}
        />

        {/* Heading Section */}
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          {/* Top Tag: ✦ XÁC THỰC TÀI KHOẢN */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#C5A059',
              marginBottom: '8px',
            }}
          >
            <Sparkles size={13} style={{ color: '#D4AF37' }} />
            Xác Thực Tài Khoản
          </div>

          {/* Title: ĐĂNG NHẬP */}
          <h2
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#FFFFFF',
              marginBottom: '6px',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            }}
          >
            Đăng Nhập
          </h2>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '0.84rem',
              color: 'rgba(255, 255, 255, 0.68)',
              fontWeight: 400,
              lineHeight: 1.5,
            }}
          >
            Chào mừng bạn trở lại với không gian thời trang cao cấp
          </p>
        </div>

        {/* Dynamic Alerts */}
        {errorMessage && (
          <div
            className="animate-fade-in"
            style={{
              padding: '11px 14px',
              backgroundColor: 'rgba(208, 2, 27, 0.15)',
              border: '1px solid rgba(208, 2, 27, 0.4)',
              borderRadius: '8px',
              color: '#FF6B6B',
              fontSize: '0.82rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '18px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            className="animate-fade-in"
            style={{
              padding: '11px 14px',
              backgroundColor: 'rgba(31, 139, 76, 0.18)',
              border: '1px solid rgba(31, 139, 76, 0.4)',
              borderRadius: '8px',
              color: '#4ADE80',
              fontSize: '0.82rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '18px',
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Username Input Field */}
          <div>
            <label
              htmlFor="login-username"
              style={{
                display: 'block',
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'rgba(255, 255, 255, 0.85)',
                marginBottom: '6px',
              }}
            >
              Tên đăng nhập
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  color: 'rgba(255, 255, 255, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
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
                style={{
                  width: '100%',
                  height: '46px',
                  paddingLeft: '42px',
                  paddingRight: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.7)';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(212, 175, 55, 0.2)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Password Input Field */}
          <div>
            <label
              htmlFor="login-password"
              style={{
                display: 'block',
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'rgba(255, 255, 255, 0.85)',
                marginBottom: '6px',
              }}
            >
              Mật khẩu
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  color: 'rgba(255, 255, 255, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
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
                style={{
                  width: '100%',
                  height: '46px',
                  paddingLeft: '42px',
                  paddingRight: '42px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.7)';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(212, 175, 55, 0.2)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-2px' }}>
            <Link
              to="/forgot-password"
              style={{
                fontSize: '0.8rem',
                color: 'rgba(255, 255, 255, 0.7)',
                fontWeight: 500,
                letterSpacing: '0.02em',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ECC880')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)')}
            >
              Quên mật khẩu?
            </Link>
          </div>

          {/* Submit Button: Luxurious Brushed Gold Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              height: '48px',
              marginTop: '4px',
              background: 'linear-gradient(135deg, #F3D08A 0%, #D4AF37 45%, #AA8232 85%, #C5A059 100%)',
              color: '#0F0E0C',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 6px 20px rgba(212, 175, 55, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s',
              opacity: isLoading ? 0.75 : 1,
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {isLoading ? 'Đang xác thực...' : 'Đăng Nhập Ngay'}
          </button>
        </form>

        {/* Divider: HOẶC */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '22px 0 16px',
            color: 'rgba(255, 255, 255, 0.45)',
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
          <span style={{ padding: '0 14px' }}>HOẶC</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
        </div>

        {/* Google OAuth Login Button */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          {isGoogleConfigured ? (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
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
              style={{
                width: '100%',
                height: '46px',
                backgroundColor: 'rgba(255, 255, 255, 0.88)',
                color: '#1C1C1E',
                border: 'none',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.88)')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Đăng nhập bằng Google</span>
            </button>
          )}
        </div>

        {/* Quick Fill Test Accounts Helper */}
        <div
          style={{
            marginTop: '20px',
            padding: '10px 12px',
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            border: '1px dashed rgba(212, 175, 55, 0.3)',
            borderRadius: '8px',
            fontSize: '0.72rem',
          }}
        >
          <div style={{ fontWeight: 700, color: '#C5A059', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            ⚡ Tài khoản thử nghiệm nhanh:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => fillDemoAccount('customer1', 'password123')}
              style={{
                padding: '4px 8px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              👤 Customer: customer1
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('admin', 'admin123')}
              style={{
                padding: '4px 8px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#ECC880',
                cursor: 'pointer',
              }}
            >
              🛡️ Admin: admin
            </button>
          </div>
        </div>

        {/* Register Prompt */}
        <div
          style={{
            textAlign: 'center',
            marginTop: '20px',
            fontSize: '0.82rem',
            color: 'rgba(255, 255, 255, 0.65)',
          }}
        >
          Chưa có tài khoản?{' '}
          <Link
            to="/register"
            style={{
              fontWeight: 700,
              color: '#ECC880',
              textDecoration: 'underline',
              letterSpacing: '0.02em',
            }}
          >
            Tạo tài khoản mới
          </Link>
        </div>
      </div>
    </div>
  );
}
