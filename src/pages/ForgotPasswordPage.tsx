import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  KeyRound,
  Lock,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { authService } from '../services/authService';
import { extractErrorMessage } from '../utils/format';
import { cn } from '../utils/cn';
import loginAtelierImg from '../assets/login-atelier.jpg';
import styles from './AuthPages.module.css';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [email, setEmail] = useState<string>('');
  const [tempPassword, setTempPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [cooldown, setCooldown] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRequestTempCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }

    if (cooldown > 0) {
      setErrorMessage(`Vui lòng đợi ${cooldown} giây trước khi yêu cầu lại.`);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await authService.forgotPassword(email.trim());
      setSuccessMessage(
        'Hệ thống đã gửi Tên đăng nhập (Username) và Mật khẩu tạm thời (8 ký tự, hiệu lực 15 phút) vào email của bạn. Vui lòng kiểm tra hộp thư!'
      );
      setCooldown(60);
      setStep(2);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        setErrorMessage('Yêu cầu quá thường xuyên. Vui lòng đợi đủ 60 giây.');
        setCooldown(60);
      } else {
        setErrorMessage(extractErrorMessage(err, 'Không thể gửi email đặt lại mật khẩu. Vui lòng kiểm tra lại địa chỉ email.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempPassword.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu tạm thời gồm 8 ký tự từ email.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await authService.resetPassword({
        email: email.trim(),
        tempPassword: tempPassword.trim(),
        newPassword,
        confirmPassword,
      });

      setSuccessMessage('Đặt lại mật khẩu thành công! Đang chuyển hướng đến trang đăng nhập...');
      setTimeout(() => {
        navigate('/login');
      }, 1800);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Không thể đặt lại mật khẩu. Mật khẩu tạm thời không đúng hoặc đã hết hạn (15 phút).'));
    } finally {
      setIsLoading(false);
    }
  };

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
            Khôi phục quyền
            <br />
            truy cập{' '}
            <span className={cn(styles.loginEditorialItalic, 'whitespace-nowrap')}>tài khoản</span>
          </h1>
          <p className={styles.loginEditorialSub}>
            Xác minh email thành viên để nhận mã bảo mật tạm thời và thiết lập lại mật khẩu mới nhanh chóng.
          </p>

          <div className={styles.loginFeaturePills}>
            <span className={styles.loginFeaturePill}>
              <Mail size={13} className={styles.goldIcon} />
              Xác thực qua Email
            </span>
            <span className={styles.loginFeaturePill}>
              <Clock size={13} className={styles.goldIcon} />
              Mã hiệu lực 15 phút
            </span>
            <span className={styles.loginFeaturePill}>
              <ShieldCheck size={13} className={styles.goldIcon} />
              Bảo vệ tài khoản
            </span>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          RIGHT PANEL: Luxury Dark Forgot Password Card
          ========================================================================= */}
      <main className={styles.loginFormPanel}>
        <div className={cn('animate-slide-up', styles.loginFormWrap, 'max-w-[445px]')}>
          <div className={styles.loginTopGleam} />

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={cn(
                styles.stepPillBtn,
                'cursor-pointer',
                step === 1 && styles.stepPillBtnActive
              )}
            >
              Bước 1: Gửi mã tạm
            </button>
            <span className="text-white/30 text-xs">&rarr;</span>
            <button
              type="button"
              onClick={() => email && setStep(2)}
              disabled={!email}
              className={cn(
                styles.stepPillBtn,
                step === 2 && styles.stepPillBtnActive,
                email ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
              )}
            >
              Bước 2: Đổi mật khẩu
            </button>
          </div>

          <div className="mb-6">
            <span className={styles.loginFormEyebrow}>Bảo mật tài khoản</span>
            <h2 className={styles.loginFormHeading}>
              {step === 1 ? 'Quên mật khẩu' : 'Đặt lại mật khẩu'}
            </h2>
            <p className={styles.subtitleDark}>
              {step === 1
                ? 'Nhập email tài khoản để nhận Tên đăng nhập và Mật khẩu tạm thời.'
                : 'Nhập mật khẩu tạm thời đã nhận trong email và thiết lập mật khẩu mới.'}
            </p>
          </div>

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

          {step === 1 ? (
            <form onSubmit={handleRequestTempCode} className="flex flex-col gap-4">
              <div>
                <label htmlFor="forgot-email" className={styles.labelDark}>
                  Địa chỉ Email
                </label>
                <div className="relative flex items-center">
                  <span className={styles.inputIconDark}>
                    <Mail size={17} />
                  </span>
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="Nhập email của tài khoản..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className={styles.loginInputModern}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || cooldown > 0}
                className={styles.goldSubmitBtnModern}
              >
                {cooldown > 0 ? (
                  <>
                    <Clock size={16} />
                    <span>Gửi lại sau {cooldown}s</span>
                  </>
                ) : isLoading ? (
                  'Đang gửi mã...'
                ) : (
                  'Gửi mật khẩu tạm thời'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-3.5">
              <div>
                <label htmlFor="reset-email" className={styles.labelDark}>
                  Email
                </label>
                <div className="relative flex items-center">
                  <span className={styles.inputIconDark}>
                    <Mail size={16} />
                  </span>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={styles.loginInputModern}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reset-temp-password" className={styles.labelDark}>
                  Mật khẩu tạm thời (8 ký tự)
                </label>
                <div className="relative flex items-center">
                  <span className={styles.inputIconDark}>
                    <KeyRound size={16} />
                  </span>
                  <input
                    id="reset-temp-password"
                    type="text"
                    placeholder="Nhập mã 8 ký tự từ email (vd: Xk9mP2qA)"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    required
                    className={styles.loginInputModern}
                  />
                </div>
                <p className="mt-1.5 text-[0.74rem] text-white/45">
                  Mật khẩu tạm có hiệu lực trong 15 phút.
                </p>
              </div>

              <div>
                <label htmlFor="reset-new-password" className={styles.labelDark}>
                  Mật khẩu mới
                </label>
                <div className="relative flex items-center">
                  <span className={styles.inputIconDark}>
                    <Lock size={16} />
                  </span>
                  <input
                    id="reset-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Tối thiểu 6 ký tự"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className={cn(styles.loginInputModern, styles.loginPasswordInput)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className={styles.eyeToggleDark}
                    aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="reset-confirm-password" className={styles.labelDark}>
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative flex items-center">
                  <span className={styles.inputIconDark}>
                    <Lock size={16} />
                  </span>
                  <input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className={cn(styles.loginInputModern, styles.loginPasswordInput)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={styles.eyeToggleDark}
                    aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => handleRequestTempCode()}
                  disabled={cooldown > 0 || isLoading}
                  className={cn(styles.darkOutlineBtn, 'flex-1')}
                >
                  {cooldown > 0 ? `Gửi lại (${cooldown}s)` : 'Gửi lại mã'}
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={cn(styles.goldSubmitBtnModern, 'flex-[1.5] mt-0 h-[46px]')}
                >
                  {isLoading ? 'Đang xử lý...' : 'Xác nhận đổi'}
                </button>
              </div>
            </form>
          )}

          <div className="text-center mt-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-[0.82rem] text-white/70 hover:text-[#ecc880] font-medium transition-colors"
            >
              <ArrowLeft size={15} />
              Quay lại trang Đăng nhập
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
