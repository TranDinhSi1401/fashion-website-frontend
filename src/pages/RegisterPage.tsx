import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Lock,
  Mail,
  Phone,
  UserCheck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  ShoppingBag,
  Heart,
  ShieldCheck,
  Gift,
} from 'lucide-react';
import { authService } from '../services/authService';
import { isValidVietnamPhone, validateDateOfBirth, extractErrorMessage } from '../utils/format';
import { cn } from '../utils/cn';
import loginAtelierImg from '../assets/login-atelier.jpg';
import styles from './AuthPages.module.css';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullname: '',
    gender: 'MALE',
    dateOfBirth: '',
    email: '',
    phone: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    if (!['MALE', 'FEMALE', 'OTHER'].includes(formData.gender)) {
      newErrors.gender = 'Vui lòng chọn giới tính';
    }

    const dobError = validateDateOfBirth(formData.dateOfBirth, false);
    if (dobError) {
      newErrors.dateOfBirth = dobError;
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
        gender: formData.gender,
        ...(formData.dateOfBirth ? { dateOfBirth: formData.dateOfBirth } : {}),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
      });

      setSuccessMessage(
        'Đăng ký thành công! Bạn đã được tặng mã WELCOME50K (Giảm 50.000₫) vào Ví Voucher cá nhân. Đang chuyển đến trang đăng nhập...'
      );
      setTimeout(() => {
        navigate('/login');
      }, 2200);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Đăng ký không thành công. Vui lòng thử lại.'));
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
            Trở thành thành viên{' '}
            <span className={cn(styles.loginEditorialItalic, 'whitespace-nowrap')}>FashionWeb</span>
            <br />
            ngay hôm nay
          </h1>
          <p className={styles.loginEditorialSub}>
            Tạo tài khoản để mở khóa ưu đãi độc quyền, lưu trang phục yêu thích và theo dõi đơn hàng dễ dàng.
          </p>

          <div className={styles.loginFeaturePills}>
            <span className={styles.loginFeaturePill}>
              <ShieldCheck size={13} className={styles.goldIcon} />
              Ưu đãi thành viên mới
            </span>
            <span className={styles.loginFeaturePill}>
              <Heart size={13} className={styles.goldIcon} />
              Lưu bộ sưu tập
            </span>
            <span className={styles.loginFeaturePill}>
              <ShoppingBag size={13} className={styles.goldIcon} />
              Theo dõi đơn hàng 24/7
            </span>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          RIGHT PANEL: Luxury Dark Register Card
          ========================================================================= */}
      <main className={styles.loginFormPanel}>
        <div className={cn('animate-slide-up', styles.registerFormWrap)}>
          <div className={styles.loginTopGleam} />

          <div className="mb-6">
            <span className={styles.loginFormEyebrow}>Đăng ký thành viên</span>
            <h2 className={styles.loginFormHeading}>Tạo tài khoản</h2>
            <p className={styles.subtitleDark}>
              Gia nhập cộng đồng thành viên để nhận ưu đãi đặc quyền.
            </p>
          </div>

          <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#C9A961]/40 bg-[#C9A961]/10 px-3.5 py-2.5 text-left text-white shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C9A961] text-black">
              <Gift size={18} />
            </div>
            <div className="text-xs leading-snug text-gray-200">
              <strong className="uppercase tracking-wide text-[#C9A961]">Quà chào mừng thành viên mới:</strong>{' '}
              Nhận tự động voucher <strong className="font-mono text-white">WELCOME50K</strong> (Giảm 50.000₫ cho đơn từ 300.000₫) vào Ví Voucher ngay khi đăng ký!
            </div>
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

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Fullname */}
              <div>
                <label htmlFor="reg-fullname" className={styles.labelDark}>
                  Họ và tên
                </label>
                <div className="relative flex items-center">
                  <span className={styles.inputIconDark}>
                    <UserCheck size={16} />
                  </span>
                  <input
                    id="reg-fullname"
                    name="fullname"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={formData.fullname}
                    onChange={handleChange}
                    required
                    className={cn(styles.loginInputModern, errors.fullname && styles.loginInputError)}
                  />
                </div>
                {errors.fullname && <p className={styles.fieldErrorText}>{errors.fullname}</p>}
              </div>

              {/* Username */}
              <div>
                <label htmlFor="reg-username" className={styles.labelDark}>
                  Tên đăng nhập
                </label>
                <div className="relative flex items-center">
                  <span className={styles.inputIconDark}>
                    <User size={16} />
                  </span>
                  <input
                    id="reg-username"
                    name="username"
                    type="text"
                    placeholder="nguyenvana"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    autoComplete="username"
                    className={cn(styles.loginInputModern, errors.username && styles.loginInputError)}
                  />
                </div>
                {errors.username && <p className={styles.fieldErrorText}>{errors.username}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Gender */}
              <div>
                <label htmlFor="reg-gender" className={styles.labelDark}>
                  Giới tính
                </label>
                <select
                  id="reg-gender"
                  name="gender"
                  value={formData.gender}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, gender: e.target.value }));
                    if (errors.gender) {
                      setErrors((prev) => ({ ...prev, gender: '' }));
                    }
                  }}
                  required
                  className={cn(
                    styles.loginInputModern,
                    styles.registerSelect,
                    errors.gender && styles.loginInputError
                  )}
                >
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                  <option value="OTHER">Khác</option>
                </select>
                {errors.gender && <p className={styles.fieldErrorText}>{errors.gender}</p>}
              </div>

              {/* Date of birth */}
              <div>
                <label htmlFor="reg-dob" className={styles.labelDark}>
                  Ngày sinh (Tùy chọn)
                </label>
                <div className="relative flex items-center">
                  <span className={styles.inputIconDark}>
                    <Calendar size={16} />
                  </span>
                  <input
                    id="reg-dob"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                    className={cn(
                      styles.loginInputModern,
                      styles.registerDateInput,
                      errors.dateOfBirth && styles.loginInputError
                    )}
                  />
                </div>
                {errors.dateOfBirth && <p className={styles.fieldErrorText}>{errors.dateOfBirth}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Email */}
              <div>
                <label htmlFor="reg-email" className={styles.labelDark}>
                  Email
                </label>
                <div className="relative flex items-center">
                  <span className={styles.inputIconDark}>
                    <Mail size={16} />
                  </span>
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                    className={cn(styles.loginInputModern, errors.email && styles.loginInputError)}
                  />
                </div>
                {errors.email && <p className={styles.fieldErrorText}>{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="reg-phone" className={styles.labelDark}>
                  Số điện thoại
                </label>
                <div className="relative flex items-center">
                  <span className={styles.inputIconDark}>
                    <Phone size={16} />
                  </span>
                  <input
                    id="reg-phone"
                    name="phone"
                    type="tel"
                    placeholder="0912345678"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    autoComplete="tel"
                    className={cn(styles.loginInputModern, errors.phone && styles.loginInputError)}
                  />
                </div>
                {errors.phone && <p className={styles.fieldErrorText}>{errors.phone}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Password */}
              <div>
                <label htmlFor="reg-password" className={styles.labelDark}>
                  Mật khẩu
                </label>
                <div className="relative flex items-center">
                  <span className={styles.inputIconDark}>
                    <Lock size={16} />
                  </span>
                  <input
                    id="reg-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Tối thiểu 6 ký tự"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                    className={cn(
                      styles.loginInputModern,
                      styles.loginPasswordInput,
                      errors.password && styles.loginInputError
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.eyeToggleDark}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {errors.password && <p className={styles.fieldErrorText}>{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="reg-confirm-password" className={styles.labelDark}>
                  Xác nhận mật khẩu
                </label>
                <div className="relative flex items-center">
                  <span className={styles.inputIconDark}>
                    <Lock size={16} />
                  </span>
                  <input
                    id="reg-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                    className={cn(
                      styles.loginInputModern,
                      styles.loginPasswordInput,
                      errors.confirmPassword && styles.loginInputError
                    )}
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
                {errors.confirmPassword && <p className={styles.fieldErrorText}>{errors.confirmPassword}</p>}
              </div>
            </div>

            <button type="submit" disabled={isLoading} className={cn(styles.goldSubmitBtnModern, 'mt-2')}>
              {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản'}
            </button>
          </form>

          <div className={styles.registerPromptDark}>
            Đã có tài khoản?{' '}
            <Link
              to="/login"
              className={cn('font-semibold hover:underline tracking-[0.01em]', styles.goldAccentText)}
            >
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
