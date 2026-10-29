import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, Lock, ArrowLeft, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { extractErrorMessage } from '../utils/format';

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
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
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
    } catch (err: any) {
      if (err.response?.status === 429) {
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
    } catch (err: any) {
      setErrorMessage(extractErrorMessage(err, 'Không thể đặt lại mật khẩu. Mật khẩu tạm thời không đúng hoặc đã hết hạn (15 phút).'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - var(--header-height) - var(--topbar-height))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#0c0d10',
        padding: '50px 20px',
      }}
    >
      {/* Background Ambience */}
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-10%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(197, 160, 89, 0.14) 0%, rgba(0,0,0,0) 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          animation: 'floatOrb 14s ease-in-out infinite alternate',
          pointerEvents: 'none',
        }}
      />

      <div
        className="animate-slide-up"
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
          borderRadius: 'var(--radius-modal)',
          position: 'relative',
          zIndex: 10,
          padding: '44px 36px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, var(--color-accent-gold) 0%, var(--color-primary) 100%)',
          }}
        />

        {/* Step Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '24px',
          }}
        >
          <div
            onClick={() => setStep(1)}
            style={{
              padding: '4px 12px',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              backgroundColor: step === 1 ? 'var(--color-primary)' : 'var(--bg-surface)',
              color: step === 1 ? 'var(--text-inverse)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Bước 1: Gửi mã tạm
          </div>
          <div style={{ color: 'var(--border-default)' }}>&rarr;</div>
          <div
            onClick={() => email && setStep(2)}
            style={{
              padding: '4px 12px',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              backgroundColor: step === 2 ? 'var(--color-primary)' : 'var(--bg-surface)',
              color: step === 2 ? 'var(--text-inverse)' : 'var(--text-secondary)',
              cursor: email ? 'pointer' : 'not-allowed',
            }}
          >
            Bước 2: Đổi mật khẩu
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--color-primary)',
              marginBottom: '8px',
            }}
          >
            {step === 1 ? 'Quên Mật Khẩu' : 'Đặt Lại Mật Khẩu'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {step === 1
              ? 'Nhập email tài khoản để nhận Tên đăng nhập và Mật khẩu tạm thời'
              : 'Nhập mật khẩu tạm thời đã nhận trong email và thiết lập mật khẩu mới'}
          </p>
        </div>

        {errorMessage && (
          <div
            className="animate-fade-in"
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--status-error-bg)',
              borderLeft: '3px solid var(--status-error)',
              color: 'var(--status-error)',
              fontSize: '0.84rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            className="animate-fade-in"
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--status-success-bg)',
              borderLeft: '3px solid var(--status-success)',
              color: 'var(--status-success)',
              fontSize: '0.84rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
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
              style={{
                width: '100%',
                fontSize: '0.88rem',
                fontWeight: 700,
                marginTop: '12px',
              }}
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

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleRequestTempCode()}
                disabled={cooldown > 0 || isLoading}
                style={{ flex: 1, fontSize: '0.78rem' }}
              >
                {cooldown > 0 ? `Gửi lại (${cooldown}s)` : 'Gửi lại mã'}
              </Button>

              <Button
                type="submit"
                variant="primary"
                loading={isLoading}
                style={{ flex: 1.5, fontSize: '0.82rem' }}
              >
                Xác Nhận Đổi Mật Khẩu
              </Button>
            </div>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '28px' }}>
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} />
            Quay lại trang Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}

