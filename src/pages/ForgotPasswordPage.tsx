import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, Lock, ArrowLeft, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { Button, Input } from '../components/ui';
import { extractErrorMessage } from '../utils/format';
import { cn } from '../utils/cn';
import styles from './AuthPages.module.css';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [email, setEmail] = useState<string>('');
  const [tempPassword, setTempPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

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
    <div className={cn(styles.authViewport, styles.authViewportAmbient)}>
      {/* Background Ambience */}
      <div className={styles.ambientOrbLeft} />

      <div className={cn('animate-slide-up max-w-[480px]', styles.lightGlassCard)}>
        <div className={styles.lightCardTopBar} />

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={cn(
              'px-3 py-1 text-[0.72rem] font-bold uppercase tracking-[0.05em] border-0 cursor-pointer transition-colors',
              step === 1 ? 'bg-primary text-content-inverse' : 'bg-surface text-content-secondary'
            )}
          >
            Bước 1: Gửi mã tạm
          </button>
          <div className="text-line">&rarr;</div>
          <button
            type="button"
            onClick={() => email && setStep(2)}
            disabled={!email}
            className={cn(
              'px-3 py-1 text-[0.72rem] font-bold uppercase tracking-[0.05em] border-0 transition-colors',
              step === 2 ? 'bg-primary text-content-inverse' : 'bg-surface text-content-secondary',
              email ? 'cursor-pointer' : 'cursor-not-allowed'
            )}
          >
            Bước 2: Đổi mật khẩu
          </button>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-[1.5rem] font-extrabold tracking-[0.06em] uppercase text-primary mb-2">
            {step === 1 ? 'Quên Mật Khẩu' : 'Đặt Lại Mật Khẩu'}
          </h2>
          <p className="text-[0.85rem] text-content-secondary">
            {step === 1
              ? 'Nhập email tài khoản để nhận Tên đăng nhập và Mật khẩu tạm thời'
              : 'Nhập mật khẩu tạm thời đã nhận trong email và thiết lập mật khẩu mới'}
          </p>
        </div>

        {errorMessage && (
          <div className={cn('animate-fade-in', styles.lightAlertError)}>
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className={cn('animate-fade-in', styles.lightAlertSuccess)}>
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestTempCode}>
            <Input
              label="Địa chỉ Email"
              type="email"
              placeholder="Nhập email của tài khoản..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              disabled={cooldown > 0}
              className="w-full text-[0.88rem] font-bold mt-3"
            >
              {cooldown > 0 ? (
                <>
                  <Clock size={16} />
                  <span>Gửi lại sau {cooldown}s</span>
                </>
              ) : (
                'Gửi Mật Khẩu Tạm Thời'
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              required
            />

            <Input
              label="Mật khẩu tạm thời (8 ký tự)"
              type="text"
              placeholder="Nhập mã 8 ký tự từ email (vd: Xk9mP2qA)"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              icon={KeyRound}
              helperText="Mật khẩu tạm có hiệu lực trong 15 phút"
              required
            />

            <Input
              label="Mật khẩu mới"
              type="password"
              placeholder="Tối thiểu 6 ký tự"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              icon={Lock}
              required
            />

            <Input
              label="Xác nhận mật khẩu mới"
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={Lock}
              required
            />

            <div className="flex gap-3 mt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleRequestTempCode()}
                disabled={cooldown > 0 || isLoading}
                className="flex-1 text-[0.78rem]"
              >
                {cooldown > 0 ? `Gửi lại (${cooldown}s)` : 'Gửi lại mã'}
              </Button>

              <Button
                type="submit"
                variant="primary"
                loading={isLoading}
                className="flex-[1.5] text-[0.82rem]"
              >
                Xác Nhận Đổi Mật Khẩu
              </Button>
            </div>
          </form>
        )}

        <div className="text-center mt-7">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-[0.82rem] text-content-secondary hover:text-primary font-semibold transition-colors"
          >
            <ArrowLeft size={16} />
            Quay lại trang Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
