import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, KeyRound, MapPin, Camera, Trash2, Plus, Calendar, AlertCircle, CheckCircle2, Sparkles, AlertTriangle, ShieldCheck, ExternalLink, Package, RotateCcw } from 'lucide-react';
import CustomerOrdersTab from './CustomerOrdersTab';
import CustomerReturnsTab from './CustomerReturnsTab';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import { UserAddressResponse } from '../types/user';
import AddressFormModal from '../components/profile/AddressFormModal';
import { Badge, Button, Input, Select, Modal } from '../components/ui';
import { isValidVietnamPhone, formatDateVN, validateDateOfBirth, extractErrorMessage } from '../utils/format';
import { cn } from '../utils/cn';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const { user, updateUserLocal, logout, isGoogleAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const addressSectionRef = useRef<HTMLDivElement>(null);

  const isGoogleUser = isGoogleAuth || Boolean(user?.avt && user.avt.includes('googleusercontent.com'));

  const activeTab = location.pathname.includes('/password')
    ? 'password'
    : location.pathname.includes('/orders')
      ? 'orders'
      : location.pathname.includes('/returns')
        ? 'returns'
        : 'profile';

  const [profileForm, setProfileForm] = useState({
    fullname: '',
    gender: 'MALE',
    dateOfBirth: '',
    email: '',
    phone: '',
  });

  const [profileErrors, setProfileErrors] = useState<{
    fullname?: string;
    gender?: string;
    dateOfBirth?: string;
    email?: string;
    phone?: string;
  }>({});

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordErrors, setPasswordErrors] = useState<{
    oldPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const [addresses, setAddresses] = useState<UserAddressResponse[]>([]);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState<boolean>(false);
  const [editingAddress, setEditingAddress] = useState<UserAddressResponse | null>(null);
  const [confirmDeleteAddress, setConfirmDeleteAddress] = useState<UserAddressResponse | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<boolean>(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState<boolean>(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState<boolean>(false);
  const [isOrderSuccessModalOpen, setIsOrderSuccessModalOpen] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [avatarUploading, setAvatarUploading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setProfileForm({
        fullname: user.fullname || '',
        gender: user.gender || 'OTHER',
        dateOfBirth: user.dateOfBirth || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const fetchAddresses = async () => {
    try {
      const res = await userService.getAddresses();
      if (res && res.data) {
        setAddresses(res.data);
      }
    } catch (err) {
      console.warn('Could not load user addresses:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'profile') {
      fetchAddresses();
    }
    setErrorMessage('');
    setSuccessMessage('');
  }, [activeTab]);

  useEffect(() => {
    if (location.pathname.includes('/addresses')) {
      setTimeout(() => {
        addressSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (
      activeTab === 'orders' &&
      (location.state as { orderPlacedSuccessfully?: boolean } | null)?.orderPlacedSuccessfully
    ) {
      setIsOrderSuccessModalOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [activeTab, location.pathname, location.state, navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: {
      fullname?: string;
      gender?: string;
      dateOfBirth?: string;
      email?: string;
      phone?: string;
    } = {};

    if (!profileForm.fullname.trim()) {
      newErrors.fullname = 'Vui lòng nhập họ và tên';
    } else if (profileForm.fullname.trim().length > 100) {
      newErrors.fullname = 'Họ và tên không được vượt quá 100 ký tự';
    }

    if (!['MALE', 'FEMALE', 'OTHER'].includes(profileForm.gender)) {
      newErrors.gender = 'Vui lòng chọn giới tính hợp lệ';
    }

    const dobErr = validateDateOfBirth(profileForm.dateOfBirth, false);
    if (dobErr) {
      newErrors.dateOfBirth = dobErr;
    }

    if (!profileForm.email.trim()) {
      newErrors.email = 'Vui lòng nhập địa chỉ email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email.trim())) {
      newErrors.email = 'Email không đúng định dạng (ví dụ: user@example.com)';
    } else if (profileForm.email.trim().length > 100) {
      newErrors.email = 'Email không được vượt quá 100 ký tự';
    }

    if (profileForm.phone && !isValidVietnamPhone(profileForm.phone.trim())) {
      newErrors.phone = 'Số điện thoại không đúng chuẩn 10 số Việt Nam (bắt đầu bằng 0 hoặc +84)';
    }

    if (Object.keys(newErrors).length > 0) {
      setProfileErrors(newErrors);
      setErrorMessage('');
      return;
    }

    setProfileErrors({});
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await userService.updateCurrentUser({
        fullname: profileForm.fullname.trim(),
        gender: profileForm.gender,
        ...(profileForm.dateOfBirth ? { dateOfBirth: profileForm.dateOfBirth } : {}),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
      });
      if (res?.data) {
        updateUserLocal(res.data);
      }
      setSuccessMessage('Cập nhật hồ sơ cá nhân thành công!');
    } catch (err: any) {
      const msg = extractErrorMessage(err, 'Cập nhật hồ sơ thất bại.');
      const lower = msg.toLowerCase();
      let fieldAssigned = false;

      if (lower.includes('tuổi') || lower.includes('ngày sinh') || lower.includes('dateofbirth')) {
        setProfileErrors((prev) => ({ ...prev, dateOfBirth: msg.replace(/^dateOfBirth:\s*/i, '') }));
        fieldAssigned = true;
      } else if (lower.includes('email') || lower.includes('duplicate_email')) {
        setProfileErrors((prev) => ({ ...prev, email: msg.replace(/^email:\s*/i, '') }));
        fieldAssigned = true;
      } else if (lower.includes('phone') || lower.includes('số điện thoại')) {
        setProfileErrors((prev) => ({ ...prev, phone: msg.replace(/^phone:\s*/i, '') }));
        fieldAssigned = true;
      } else if (lower.includes('fullname') || lower.includes('họ và tên')) {
        setProfileErrors((prev) => ({ ...prev, fullname: msg.replace(/^fullname:\s*/i, '') }));
        fieldAssigned = true;
      } else if (lower.includes('gender') || lower.includes('giới tính')) {
        setProfileErrors((prev) => ({ ...prev, gender: msg.replace(/^gender:\s*/i, '') }));
        fieldAssigned = true;
      }

      if (fieldAssigned) {
        setErrorMessage('');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await userService.uploadAvatar(file);
      if (res?.data) {
        updateUserLocal(res.data);
        setSuccessMessage('Tải ảnh đại diện thành công!');
      }
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Không thể tải ảnh đại diện lên.'));
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAvatar = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ảnh đại diện này không?')) return;

    setAvatarUploading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await userService.deleteAvatar();
      if (res?.data) {
        updateUserLocal(res.data);
      }
      setSuccessMessage('Đã xóa ảnh đại diện thành công!');
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Xóa ảnh đại diện thất bại.'));
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: {
      oldPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!passwordForm.oldPassword) {
      newErrors.oldPassword = 'Vui lòng nhập mật khẩu hiện tại';
    }

    if (!passwordForm.newPassword) {
      newErrors.newPassword = 'Vui lòng nhập mật khẩu mới';
    } else if (passwordForm.newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    } else if (passwordForm.newPassword === passwordForm.oldPassword) {
      newErrors.newPassword = 'Mật khẩu mới không được trùng với mật khẩu hiện tại';
    }

    if (!passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (Object.keys(newErrors).length > 0) {
      setPasswordErrors(newErrors);
      setErrorMessage('');
      return;
    }

    setPasswordErrors({});
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await userService.changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      setSuccessMessage('Đổi mật khẩu thành công! Toàn bộ phiên cũ đã bị thu hồi. Đang đăng xuất...');
      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 2000);
    } catch (err) {
      const msg = extractErrorMessage(err, 'Đổi mật khẩu không thành công. Kiểm tra lại mật khẩu cũ.');
      const lower = msg.toLowerCase();
      let fieldAssigned = false;

      if (lower.includes('cũ') || lower.includes('old_password') || lower.includes('hiện tại')) {
        setPasswordErrors((prev) => ({ ...prev, oldPassword: msg.replace(/^oldPassword:\s*/i, '') }));
        fieldAssigned = true;
      } else if (lower.includes('trùng') || lower.includes('same_as_old')) {
        setPasswordErrors((prev) => ({ ...prev, newPassword: msg.replace(/^newPassword:\s*/i, '') }));
        fieldAssigned = true;
      } else if (lower.includes('xác nhận') || lower.includes('mismatch')) {
        setPasswordErrors((prev) => ({ ...prev, confirmPassword: msg.replace(/^confirmPassword:\s*/i, '') }));
        fieldAssigned = true;
      } else if (lower.includes('mật khẩu') || lower.includes('password')) {
        setPasswordErrors((prev) => ({ ...prev, newPassword: msg.replace(/^newPassword:\s*/i, '') }));
        fieldAssigned = true;
      }

      if (fieldAssigned) {
        setErrorMessage('');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddressModal = (addr: UserAddressResponse | null = null) => {
    setEditingAddress(addr);
    setIsAddressModalOpen(true);
  };

  const handleSetDefaultAddress = async (id: number) => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await userService.setDefaultAddress(id);
      await fetchAddresses();
      setSuccessMessage('Đã đặt làm địa chỉ giao hàng mặc định!');
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Không thể đặt làm mặc định'));
    }
  };

  const handleConfirmDeleteAddress = async () => {
    if (!confirmDeleteAddress) return;
    setDeletingAddress(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await userService.deleteAddress(confirmDeleteAddress.id);
      setConfirmDeleteAddress(null);
      await fetchAddresses();
      setSuccessMessage('Đã xóa địa chỉ giao hàng khỏi sổ địa chỉ!');
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Xóa địa chỉ thất bại'));
    } finally {
      setDeletingAddress(false);
    }
  };

  const handleDeleteMyAccount = async () => {
    try {
      setIsDeletingAccount(true);
      await userService.deleteCurrentAccount();
      logout();
      navigate('/login', {
        state: {
          message:
            'Tài khoản của bạn đã được xóa thành công. Bạn có thể sử dụng lại username hoặc email này để đăng ký tài khoản mới bất cứ lúc nào.',
        },
      });
    } catch (err: any) {
      setErrorMessage(extractErrorMessage(err, 'Xóa tài khoản thất bại. Vui lòng thử lại sau.'));
      setConfirmDeleteAccount(false);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="pt-10 pb-20">
      <div className="container">
        <h1 className="text-[1.8rem] font-extrabold uppercase tracking-[0.04em] mb-8 text-content-primary">
          Tài Khoản Của Tôi
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-start">
          {/* Navigation Sidebar */}
          <div className="bg-surface border border-line-light p-6 flex flex-col gap-1.5">
            <div className="flex items-center gap-3 mb-5">
              {user?.avt ? (
                <img
                  src={user.avt}
                  alt={user.fullname || user.username}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-accent-gold/40 shadow-xs"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-surface-dark text-content-inverse flex items-center justify-center text-[1.1rem] font-bold ring-2 ring-accent-gold/30 shadow-xs">
                  {(user?.fullname || user?.username || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[0.9rem] font-bold text-content-primary truncate">{user?.fullname || user?.username}</div>
                <div className="text-[0.75rem] text-content-muted truncate">@{user?.username}</div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {user?.role && (
                    <Badge variant={user.role === 'ADMIN' ? 'dark' : user.role === 'STAFF' ? 'warning' : 'default'}>
                      {user.role}
                    </Badge>
                  )}
                  {user?.gender && (
                    <Badge variant="default">
                      {user.gender === 'MALE' ? 'Nam' : user.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                    </Badge>
                  )}
                </div>
                {user?.dateOfBirth && (
                  <div className="flex items-center gap-1 mt-1.5 text-[0.72rem] text-content-muted">
                    <Calendar size={12} className="text-accent-gold shrink-0" />
                    <span>{formatDateVN(user.dateOfBirth)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-line my-1 mb-3" />

            <button
              type="button"
              onClick={() => navigate('/account/profile', { state: { keepScroll: true } })}
              className={cn(
                'flex items-center gap-2.5 px-3.5 py-2.5 text-[0.85rem] text-left cursor-pointer rounded-btn border-0 transition-colors',
                activeTab === 'profile'
                  ? 'bg-surface-dark text-content-inverse font-bold'
                  : 'bg-transparent text-content-primary hover:bg-surface-elevated font-medium'
              )}
            >
              <User size={16} />
              Thông Tin &amp; Địa Chỉ
            </button>

            <button
              type="button"
              onClick={() => navigate('/account/orders', { state: { keepScroll: true } })}
              className={cn(
                'flex items-center gap-2.5 px-3.5 py-2.5 text-[0.85rem] text-left cursor-pointer rounded-btn border-0 transition-colors',
                activeTab === 'orders'
                  ? 'bg-surface-dark text-content-inverse font-bold'
                  : 'bg-transparent text-content-primary hover:bg-surface-elevated font-medium'
              )}
            >
              <Package size={16} />
              Đơn Hàng Của Tôi
            </button>

            <button
              type="button"
              onClick={() => navigate('/account/returns', { state: { keepScroll: true } })}
              className={cn(
                'flex items-center gap-2.5 px-3.5 py-2.5 text-[0.85rem] text-left cursor-pointer rounded-btn border-0 transition-colors',
                activeTab === 'returns'
                  ? 'bg-surface-dark text-content-inverse font-bold'
                  : 'bg-transparent text-content-primary hover:bg-surface-elevated font-medium'
              )}
            >
              <RotateCcw size={16} />
              Trả Hàng &amp; Hoàn Tiền
            </button>

            <button
              type="button"
              onClick={() => navigate('/account/password', { state: { keepScroll: true } })}
              className={cn(
                'flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-[0.85rem] text-left cursor-pointer rounded-btn border-0 transition-colors',
                activeTab === 'password'
                  ? 'bg-surface-dark text-content-inverse font-bold'
                  : 'bg-transparent text-content-primary hover:bg-surface-elevated font-medium'
              )}
            >
              <div className="flex items-center gap-2.5">
                <KeyRound size={16} />
                <span>Mật Khẩu &amp; Bảo Mật</span>
              </div>
              {isGoogleUser && (
                <span className="text-[0.62rem] px-1.5 py-0.5 rounded-xs font-bold uppercase bg-accent-gold/20 text-accent-gold border border-accent-gold/30">
                  Google
                </span>
              )}
            </button>
          </div>

          {/* Tab Main Content */}
          <div className="bg-surface-body border border-line-light p-6 md:p-9">
            {errorMessage && (
              <div className={cn('animate-fade-in', styles.alertError)}>
                <AlertCircle size={18} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className={cn('animate-fade-in', styles.alertSuccess)}>
                <CheckCircle2 size={18} className="shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* TAB 1: PROFILE INFO & ADDRESSES MERGED */}
            {activeTab === 'profile' && (
              <div>
                <h3 className="text-[1.2rem] font-bold uppercase tracking-[0.05em] mb-6 text-content-primary">
                  Hồ Sơ Của Bạn
                </h3>

                <div className="flex items-center gap-6 p-4 mb-6 bg-gradient-to-r from-surface to-surface-body border border-accent-gold/30 rounded-sm shadow-xs flex-wrap">
                  <div className="relative">
                    {user?.avt ? (
                      <img
                        src={user.avt}
                        alt="Avatar"
                        className="w-20 h-20 rounded-full object-cover ring-2 ring-accent-gold shadow-md"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-surface-dark text-content-inverse flex items-center justify-center text-2xl font-bold rounded-full ring-2 ring-accent-gold/40 shadow-md">
                        {(user?.fullname || user?.username || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 bg-surface-body border border-accent-gold/40 rounded-full p-1 shadow-xs">
                      <Camera size={13} className="text-accent-gold" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <div className="text-xs font-bold uppercase tracking-wider text-content-primary mb-1">
                      Ảnh Đại Diện Cá Nhân
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                    />
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        loading={avatarUploading}
                        icon={Camera}
                        className="text-xs font-semibold py-1 px-3"
                      >
                        Tải Ảnh Mới
                      </Button>
                      {user?.avt && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleDeleteAvatar}
                          disabled={avatarUploading}
                          icon={Trash2}
                          className="text-status-error hover:bg-status-error/10 hover:text-status-error text-xs font-semibold py-1 px-2.5"
                        >
                          Xóa Ảnh
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-content-muted m-0">
                      Hỗ trợ JPG, PNG, WEBP • Dung lượng tối đa 5MB.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Tên đăng nhập"
                      value={user?.username || ''}
                      disabled
                      helperText="Tên đăng nhập cố định không thể thay đổi"
                    />

                    <Input
                      label="Họ và tên"
                      name="fullname"
                      value={profileForm.fullname}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfileForm({ ...profileForm, fullname: val });
                        if (val.trim()) {
                          setProfileErrors((prev) => ({ ...prev, fullname: undefined }));
                        }
                      }}
                      onBlur={() => {
                        if (!profileForm.fullname.trim()) {
                          setProfileErrors((prev) => ({ ...prev, fullname: 'Vui lòng nhập họ và tên' }));
                        } else if (profileForm.fullname.trim().length > 100) {
                          setProfileErrors((prev) => ({ ...prev, fullname: 'Họ và tên không được vượt quá 100 ký tự' }));
                        }
                      }}
                      error={profileErrors.fullname}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="Giới tính"
                      name="gender"
                      value={profileForm.gender}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfileForm({ ...profileForm, gender: val });
                        if (profileErrors.gender) {
                          setProfileErrors((prev) => ({ ...prev, gender: undefined }));
                        }
                      }}
                      options={[
                        { value: 'MALE', label: 'Nam' },
                        { value: 'FEMALE', label: 'Nữ' },
                        { value: 'OTHER', label: 'Khác' },
                      ]}
                      error={profileErrors.gender}
                      required
                    />

                    <Input
                      label="Ngày sinh"
                      type="date"
                      name="dateOfBirth"
                      value={profileForm.dateOfBirth}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfileForm({ ...profileForm, dateOfBirth: val });
                        if (val) {
                          const err = validateDateOfBirth(val, false);
                          setProfileErrors((prev) => ({ ...prev, dateOfBirth: err || undefined }));
                        } else {
                          setProfileErrors((prev) => ({ ...prev, dateOfBirth: undefined }));
                        }
                      }}
                      onBlur={() => {
                        if (profileForm.dateOfBirth) {
                          const err = validateDateOfBirth(profileForm.dateOfBirth, false);
                          setProfileErrors((prev) => ({ ...prev, dateOfBirth: err || undefined }));
                        }
                      }}
                      error={profileErrors.dateOfBirth}
                      icon={Calendar}
                      max={new Date().toISOString().split('T')[0]}
                      helperText="Cập nhật ngày sinh để nhận ưu đãi dịp sinh nhật"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Email"
                      type="email"
                      name="email"
                      value={profileForm.email}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfileForm({ ...profileForm, email: val });
                        if (val.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
                          setProfileErrors((prev) => ({ ...prev, email: undefined }));
                        }
                      }}
                      onBlur={() => {
                        if (!profileForm.email.trim()) {
                          setProfileErrors((prev) => ({ ...prev, email: 'Vui lòng nhập địa chỉ email' }));
                        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email.trim())) {
                          setProfileErrors((prev) => ({ ...prev, email: 'Email không đúng định dạng (ví dụ: user@example.com)' }));
                        } else if (profileForm.email.trim().length > 100) {
                          setProfileErrors((prev) => ({ ...prev, email: 'Email không được vượt quá 100 ký tự' }));
                        }
                      }}
                      error={profileErrors.email}
                      required
                    />

                    <Input
                      label="Số điện thoại"
                      name="phone"
                      value={profileForm.phone}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfileForm({ ...profileForm, phone: val });
                        if (!val.trim() || isValidVietnamPhone(val.trim())) {
                          setProfileErrors((prev) => ({ ...prev, phone: undefined }));
                        }
                      }}
                      onBlur={() => {
                        if (profileForm.phone.trim() && !isValidVietnamPhone(profileForm.phone.trim())) {
                          setProfileErrors((prev) => ({
                            ...prev,
                            phone: 'Số điện thoại không đúng chuẩn 10 số Việt Nam (bắt đầu bằng 0 hoặc +84)',
                          }));
                        }
                      }}
                      error={profileErrors.phone}
                      placeholder="0912345678"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    loading={isLoading}
                    className="self-start mt-4"
                  >
                    Lưu Thay Đổi
                  </Button>
                </form>

                {/* SỔ ĐỊA CHỈ NHẬN HÀNG (GỘP TRỰC TIẾP VÀO THÔNG TIN CÁ NHÂN) */}
                <div ref={addressSectionRef} className="mt-10 pt-8 border-t border-line-light">
                  <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-[1.2rem] font-bold uppercase tracking-[0.05em] m-0 text-content-primary">
                          Sổ Địa Chỉ Giao Hàng
                        </h3>
                        <Badge variant="dark" className="text-[0.75rem] font-bold px-2 py-0.5">
                          {addresses.length}
                        </Badge>
                      </div>
                      <p className="text-[0.8rem] text-content-secondary mt-1 m-0">
                        Địa chỉ nhận hàng mặc định sẽ được ưu tiên tự động điền khi đặt mua đơn hàng
                      </p>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      icon={Plus}
                      onClick={() => handleOpenAddressModal()}
                    >
                      Thêm Địa Chỉ Mới
                    </Button>
                  </div>

                  {addresses.length === 0 ? (
                    <div className="text-center py-10 px-5 bg-surface border border-dashed border-line-light rounded-sm text-content-muted">
                      <MapPin size={32} className="mb-2.5 opacity-40 mx-auto" />
                      <p className="text-[0.875rem] font-medium m-0">Bạn chưa lưu địa chỉ giao hàng nào.</p>
                      <p className="text-[0.75rem] text-content-muted mt-1 mb-3">
                        Thêm địa chỉ ngay để đơn hàng được giao đến đúng nơi nhanh chóng.
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Plus}
                        onClick={() => handleOpenAddressModal()}
                      >
                        Thêm Địa Chỉ Đầu Tiên
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3.5">
                      {addresses.map((addr) => (
                        <div
                          key={addr.id}
                          className={cn(
                            'p-4 sm:p-5 border flex justify-between items-center gap-4 flex-wrap transition-colors',
                            addr.isDefault
                              ? 'border-primary bg-surface/80 shadow-xs'
                              : 'border-line-light bg-surface-body hover:border-line'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <MapPin size={18} className={cn('mt-0.5 shrink-0', addr.isDefault ? 'text-primary' : 'text-content-muted')} />
                            <div>
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <Badge variant={addr.addressType === 'HOME' ? 'default' : 'dark'} className="text-[0.7rem]">
                                  {addr.addressType === 'HOME' ? 'Nhà riêng' : addr.addressType === 'OFFICE' ? 'Văn phòng' : 'Khác'}
                                </Badge>
                                {addr.isDefault && (
                                  <Badge variant="success" className="text-[0.7rem]">Mặc định</Badge>
                                )}
                              </div>
                              <p className="text-[0.9rem] font-semibold text-content-primary m-0">
                                {[addr.fullAddress, addr.wardName, addr.provinceName].filter(Boolean).join(', ')}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2 shrink-0">
                            {!addr.isDefault && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetDefaultAddress(addr.id)}
                              >
                                Đặt Mặc Định
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenAddressModal(addr)}
                            >
                              Sửa
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setConfirmDeleteAddress(addr)}
                            >
                              Xóa
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: CHANGE PASSWORD / GOOGLE SSO SECURITY */}
            {activeTab === 'password' && (
              <div>
                <h3 className="text-[1.2rem] font-bold uppercase tracking-[0.05em] mb-2 text-content-primary">
                  {isGoogleUser ? 'Bảo Mật Tài Khoản Google' : 'Đổi Mật Khẩu'}
                </h3>

                {isGoogleUser ? (
                  <div className="mt-4 border border-line bg-surface p-6 sm:p-7 rounded-sm max-w-[580px] shadow-xs">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-gold/15 text-accent-gold border border-accent-gold/30">
                        <ShieldCheck size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <h4 className="text-[0.95rem] font-extrabold uppercase tracking-wider text-content-primary m-0">
                            Tài Khoản Liên Kết Google (SSO)
                          </h4>
                          <Badge variant="warning" className="text-[0.65rem] font-bold px-2 py-0.5">
                            Bảo Mật Bởi Google
                          </Badge>
                        </div>

                        <p className="text-[0.82rem] text-content-secondary leading-relaxed m-0 mt-2">
                          Tài khoản của bạn được đăng nhập và bảo vệ trực tiếp thông qua Google ID (<strong>{user?.email || user?.username}</strong>). Bạn không cần mật khẩu cục bộ trên website.
                        </p>

                        <div className="mt-4 rounded-sm border border-line-light bg-surface-elevated p-3.5 text-xs text-content-secondary space-y-1.5">
                          <div className="font-bold text-content-primary flex items-center gap-1.5">
                            <span>Quản lý mật khẩu &amp; xác thực 2 lớp (2FA):</span>
                          </div>
                          <p className="m-0 leading-relaxed text-[0.78rem]">
                            Website không lưu trữ mật khẩu của bạn. Mọi thao tác thay đổi mật khẩu hoặc cập nhật bảo mật vui lòng thực hiện trực tiếp tại trang Quản lý tài khoản Google.
                          </p>
                        </div>

                        <div className="mt-5 flex items-center gap-3 flex-wrap">
                          <a
                            href="https://myaccount.google.com/security"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-primary text-content-inverse hover:bg-primary-hover transition-colors rounded-none"
                          >
                            <span>Cài Đặt Bảo Mật Google</span>
                            <ExternalLink size={13} />
                          </a>

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate('/account/profile')}
                          >
                            Xem Hồ Sơ Cá Nhân
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-[0.82rem] text-content-secondary mb-6">
                      Sau khi đổi mật khẩu thành công, tất cả các phiên đăng nhập khác sẽ tự động bị đăng xuất.
                    </p>

                    <form onSubmit={handleChangePassword} className="flex flex-col gap-2 max-w-[440px]">
                      <Input
                        label="Mật khẩu hiện tại"
                        type="password"
                        placeholder="Nhập mật khẩu hiện tại"
                        value={passwordForm.oldPassword}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPasswordForm({ ...passwordForm, oldPassword: val });
                          if (val) {
                            setPasswordErrors((prev) => ({ ...prev, oldPassword: undefined }));
                          }
                        }}
                        onBlur={() => {
                          if (!passwordForm.oldPassword) {
                            setPasswordErrors((prev) => ({ ...prev, oldPassword: 'Vui lòng nhập mật khẩu hiện tại' }));
                          }
                        }}
                        error={passwordErrors.oldPassword}
                        required
                      />

                      <Input
                        label="Mật khẩu mới"
                        type="password"
                        placeholder="Tối thiểu 6 ký tự"
                        value={passwordForm.newPassword}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPasswordForm({ ...passwordForm, newPassword: val });
                          if (val.length >= 6) {
                            setPasswordErrors((prev) => ({ ...prev, newPassword: undefined }));
                          }
                        }}
                        onBlur={() => {
                          if (!passwordForm.newPassword) {
                            setPasswordErrors((prev) => ({ ...prev, newPassword: 'Vui lòng nhập mật khẩu mới' }));
                          } else if (passwordForm.newPassword.length < 6) {
                            setPasswordErrors((prev) => ({ ...prev, newPassword: 'Mật khẩu mới phải có ít nhất 6 ký tự' }));
                          }
                        }}
                        error={passwordErrors.newPassword}
                        required
                      />

                      <Input
                        label="Xác nhận mật khẩu mới"
                        type="password"
                        placeholder="Nhập lại mật khẩu mới"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPasswordForm({ ...passwordForm, confirmPassword: val });
                          if (val === passwordForm.newPassword) {
                            setPasswordErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                          }
                        }}
                        onBlur={() => {
                          if (!passwordForm.confirmPassword) {
                            setPasswordErrors((prev) => ({ ...prev, confirmPassword: 'Vui lòng xác nhận mật khẩu mới' }));
                          } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
                            setPasswordErrors((prev) => ({ ...prev, confirmPassword: 'Mật khẩu xác nhận không khớp' }));
                          }
                        }}
                        error={passwordErrors.confirmPassword}
                        required
                      />

                      <Button
                        type="submit"
                        variant="primary"
                        loading={isLoading}
                        className="self-start mt-4"
                      >
                        Xác Nhận Đổi Mật Khẩu
                      </Button>
                    </form>
                  </>
                )}

                {/* XÓA TÀI KHOẢN */}
                <div className="mt-12 pt-8 border-t border-line-light">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={() => setConfirmDeleteAccount(true)}
                  >
                    Xóa Tài Khoản
                  </Button>
                </div>
              </div>
            )}

            {/* TAB MY ORDERS (C1) */}
            {activeTab === 'orders' && (
              <div>
                <CustomerOrdersTab />
              </div>
            )}

            {/* TAB 6: MY RETURNS (C3) */}
            {activeTab === 'returns' && (
              <div>
                <CustomerReturnsTab />
              </div>
            )}
          </div>
        </div>
      </div>

      <AddressFormModal
        key={`${isAddressModalOpen}-${editingAddress?.id ?? 'new'}`}
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        address={editingAddress}
        defaultAddress={addresses.length === 0}
        onSaved={() => {
          setSuccessMessage(editingAddress ? 'Cập nhật địa chỉ thành công!' : 'Thêm địa chỉ mới thành công!');
          void fetchAddresses();
        }}
      />

      <Modal
        isOpen={Boolean(confirmDeleteAddress)}
        onClose={() => !deletingAddress && setConfirmDeleteAddress(null)}
        title="Xác nhận xóa địa chỉ"
      >
        {confirmDeleteAddress && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 p-3.5 bg-red-50/70 border border-red-200 text-red-900">
              <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div className="text-[0.85rem] leading-relaxed">
                Bạn có chắc chắn muốn xóa địa chỉ{' '}
                <span className="font-bold">
                  {[confirmDeleteAddress.fullAddress, confirmDeleteAddress.wardName, confirmDeleteAddress.provinceName]
                    .filter(Boolean)
                    .join(', ')}
                </span>
                ? Hệ thống sẽ lưu trữ ẩn (xóa mềm) để bảo toàn lịch sử đơn hàng đã giao.
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-line-light">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeleteAddress(null)}
                disabled={deletingAddress}
              >
                Hủy
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={deletingAddress}
                onClick={handleConfirmDeleteAddress}
              >
                Xác Nhận Xóa
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={confirmDeleteAccount}
        onClose={() => !isDeletingAccount && setConfirmDeleteAccount(false)}
        title="Xác nhận xóa tài khoản"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3.5 bg-red-50/70 border border-red-200 text-red-900">
            <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div className="text-[0.88rem] font-medium leading-relaxed">
              Bạn có chắc chắn muốn xóa tài khoản của mình không?
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-2 border-t border-line-light">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDeleteAccount(false)}
              disabled={isDeletingAccount}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={isDeletingAccount}
              onClick={handleDeleteMyAccount}
            >
              Xác Nhận Xóa
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isOrderSuccessModalOpen}
        onClose={() => setIsOrderSuccessModalOpen(false)}
        title="Đặt hàng thành công"
        maxWidth="480px"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100">
            <CheckCircle2 size={40} className="text-emerald-600" strokeWidth={2.5} />
          </div>
          <p className="text-base font-medium text-content-primary">
            Đơn hàng của bạn đã được đặt thành công
          </p>
          <Button
            type="button"
            variant="primary"
            className="mt-2"
            onClick={() => setIsOrderSuccessModalOpen(false)}
          >
            Đóng
          </Button>
        </div>
      </Modal>
    </div>
  );
}
