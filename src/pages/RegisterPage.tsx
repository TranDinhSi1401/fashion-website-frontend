import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Mail, Phone, UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authService } from '../services/authService';
import { Button, Input } from '../components/ui';
import { isValidVietnamPhone, extractErrorMessage } from '../utils/format';
import { cn } from '../utils/cn';
import styles from './AuthPages.module.css';

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
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Đăng ký không thành công. Vui lòng thử lại.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn(styles.authViewport, styles.authViewportAmbient)}>
      {/* Background Ambience */}
      <div className={styles.ambientOrbRight} />

      <div className={cn('animate-slide-up max-w-[520px]', styles.lightGlassCard)}>
        <div className={styles.lightCardTopBar} />

        <div className="text-center mb-7">
          <h2 className="text-[1.65rem] font-extrabold tracking-[0.06em] uppercase text-primary mb-2">
            Tạo Tài Khoản
          </h2>
          <p className="text-[0.85rem] text-content-secondary">
            Gia nhập cộng đồng thành viên để nhận ưu đãi đặc quyền
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            className="w-full text-[0.88rem] font-bold mt-3 shadow-dropdown"
          >
            Đăng Ký Tài Khoản
          </Button>
        </form>

        <div className="text-center mt-6 text-[0.85rem] text-content-secondary">
          Đã có tài khoản?{' '}
          <Link
            to="/login"
            className="font-bold text-primary underline tracking-[0.02em]"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
