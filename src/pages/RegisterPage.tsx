import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Mail, Phone, UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authService } from '../services/authService';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { isValidVietnamPhone, extractErrorMessage } from '../utils/format';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullname: '',
    email: '',
    phone: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim() || formData.username.trim().length < 3 || formData.username.trim().length > 50) {
      newErrors.username = 'Tên đăng nhập phải từ 3 đến 50 ký tự';
    }

    if (!formData.password || formData.password.length < 6 || formData.password.length > 100) {
      newErrors.password = 'Mật khẩu phải từ 6 đến 100 ký tự';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (!formData.fullname.trim()) {
      newErrors.fullname = 'Vui lòng nhập họ và tên';
    }

    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không đúng định dạng';
    }

    if (!formData.phone.trim() || !isValidVietnamPhone(formData.phone)) {
      newErrors.phone = 'SĐT phải gồm 10 chữ số (bắt đầu bằng 0 hoặc +84)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await authService.register({
        username: formData.username.trim(),
        password: formData.password,
        fullname: formData.fullname.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
      });

      setSuccessMessage('Đăng ký tài khoản thành công! Đang chuyển đến trang đăng nhập...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(extractErrorMessage(err, 'Đăng ký không thành công. Vui lòng thử lại.'));
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
          top: '-10%',
          right: '-10%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(197, 160, 89, 0.15) 0%, rgba(0,0,0,0) 70%)',
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
          maxWidth: '520px',
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

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--color-primary)',
              marginBottom: '8px',
            }}
          >
            Tạo Tài Khoản
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Gia nhập cộng đồng thành viên để nhận ưu đãi đặc quyền
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

        <form onSubmit={handleSubmit}>
          <Input
            label="Họ và tên"
            name="fullname"
            placeholder="Ví dụ: Nguyễn Văn A"
            value={formData.fullname}
            onChange={handleChange}
            error={errors.fullname}
            icon={UserCheck}
            required
          />

          <Input
            label="Tên đăng nhập"
            name="username"
            placeholder="Ví dụ: nguyenvana (3-50 ký tự)"
            value={formData.username}
            onChange={handleChange}
            error={errors.username}
            icon={User}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              icon={Mail}
              required
            />

            <Input
              label="Số điện thoại"
              name="phone"
              placeholder="0912345678"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
              icon={Phone}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Mật khẩu"
              name="password"
              type="password"
              placeholder="Tối thiểu 6 ký tự"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              icon={Lock}
              required
            />

            <Input
              label="Xác nhận mật khẩu"
              name="confirmPassword"
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              icon={Lock}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isLoading}
            style={{
              width: '100%',
              fontSize: '0.88rem',
              fontWeight: 700,
              marginTop: '12px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
            }}
          >
            Đăng Ký Tài Khoản
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Đã có tài khoản?{' '}
          <Link
            to="/login"
            style={{
              fontWeight: 700,
              color: 'var(--color-primary)',
              textDecoration: 'underline',
              letterSpacing: '0.02em',
            }}
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}

