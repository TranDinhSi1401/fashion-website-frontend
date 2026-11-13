import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, KeyRound, MapPin, Camera, Trash2, Plus, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import PreferenceMatrixTab from '../components/profile/PreferenceMatrixTab';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import { UserAddressResponse } from '../types/user';
import AddressFormModal from '../components/profile/AddressFormModal';
import { Badge, Button, Input } from '../components/ui';
import { isValidVietnamPhone, extractErrorMessage } from '../utils/format';
import { cn } from '../utils/cn';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const { user, updateUserLocal, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const addressSectionRef = useRef<HTMLDivElement>(null);

  const activeTab = location.pathname.includes('/preferences')
    ? 'preferences'
    : location.pathname.includes('/password')
    ? 'password'
    : 'profile';

  const [profileForm, setProfileForm] = useState({
    fullname: '',
    email: '',
    phone: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [addresses, setAddresses] = useState<UserAddressResponse[]>([]);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState<boolean>(false);
  const [editingAddress, setEditingAddress] = useState<UserAddressResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [avatarUploading, setAvatarUploading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setProfileForm({
        fullname: user.fullname || '',
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.fullname.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên');
      return;
    }
    if (profileForm.phone && !isValidVietnamPhone(profileForm.phone)) {
      setErrorMessage('Số điện thoại không đúng chuẩn 10 số Việt Nam (bắt đầu bằng 0 hoặc +84)');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await userService.updateCurrentUser({
        fullname: profileForm.fullname.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
      });
      if (res?.data) {
        updateUserLocal(res.data);
      }
      setSuccessMessage('Cập nhật hồ sơ cá nhân thành công!');
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Cập nhật hồ sơ thất bại.'));
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
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.oldPassword) {
      setErrorMessage('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setErrorMessage('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp');
      return;
    }

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
      setErrorMessage(extractErrorMessage(err, 'Đổi mật khẩu không thành công. Kiểm tra lại mật khẩu cũ.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddressModal = (addr: UserAddressResponse | null = null) => {
    setEditingAddress(addr);
    setIsAddressModalOpen(true);
  };

  const handleSetDefaultAddress = async (id: number) => {
    try {
      await userService.setDefaultAddress(id);
      await fetchAddresses();
    } catch (err) {
      alert(extractErrorMessage(err, 'Không thể đặt làm mặc định'));
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) return;
    try {
      await userService.deleteAddress(id);
      await fetchAddresses();
    } catch (err) {
      alert(extractErrorMessage(err, 'Xóa địa chỉ thất bại'));
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
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-surface-dark text-content-inverse flex items-center justify-center text-[1.1rem] font-bold">
                  {(user?.fullname || user?.username || 'U')[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-[0.9rem] font-bold text-content-primary">{user?.fullname || user?.username}</div>
                <div className="text-[0.75rem] text-content-muted">@{user?.username}</div>
                {user?.role && <Badge variant="dark" className="mt-1">{user.role}</Badge>}
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
              onClick={() => navigate('/account/password', { state: { keepScroll: true } })}
              className={cn(
                'flex items-center gap-2.5 px-3.5 py-2.5 text-[0.85rem] text-left cursor-pointer rounded-btn border-0 transition-colors',
                activeTab === 'password'
                  ? 'bg-surface-dark text-content-inverse font-bold'
                  : 'bg-transparent text-content-primary hover:bg-surface-elevated font-medium'
              )}
            >
              <KeyRound size={16} />
              Đổi Mật Khẩu
            </button>

            <button
              type="button"
              onClick={() => navigate('/account/preferences', { state: { keepScroll: true } })}
              className={cn(
                'flex items-center gap-2.5 px-3.5 py-2.5 text-[0.85rem] text-left cursor-pointer rounded-btn border-0 transition-colors',
                activeTab === 'preferences'
                  ? 'bg-surface-dark text-accent-gold font-bold'
                  : 'bg-transparent text-content-primary hover:bg-surface-elevated font-medium'
              )}
            >
              <Sparkles size={16} className={activeTab === 'preferences' ? 'text-accent-gold' : ''} />
              Gu &amp; Sở Thích (AI)
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

                <div className="flex items-center gap-6 pb-6 mb-6 border-b border-line-light flex-wrap">
                  <div className="relative">
                    {user?.avt ? (
                      <img
                        src={user.avt}
                        alt="Avatar"
                        className="w-[84px] h-[84px] rounded-full object-cover border-2 border-line"
                      />
                    ) : (
                      <div className="w-[84px] h-[84px] bg-surface-dark text-content-inverse flex items-center justify-center text-[2rem] font-bold rounded-full">
                        {(user?.fullname || user?.username || 'U')[0].toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                    />
                    <div className="flex gap-2.5 mb-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        loading={avatarUploading}
                        icon={Camera}
                      >
                        Tải Ảnh Mới
                      </Button>
                      {user?.avt && (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={handleDeleteAvatar}
                          disabled={avatarUploading}
                          icon={Trash2}
                        >
                          Xóa
                        </Button>
                      )}
                    </div>
                    <p className="text-[0.75rem] text-content-muted m-0">
                      Dung lượng tối đa 5MB. Định dạng: JPG, PNG, WEBP.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="flex flex-col gap-2">
                  <Input
                    label="Tên đăng nhập"
                    value={user?.username || ''}
                    disabled
                    helperText="Tên đăng nhập không thể thay đổi"
                  />

                  <Input
                    label="Họ và tên"
                    name="fullname"
                    value={profileForm.fullname}
                    onChange={(e) => setProfileForm({ ...profileForm, fullname: e.target.value })}
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Email"
                      type="email"
                      name="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      required
                    />

                    <Input
                      label="Số điện thoại"
                      name="phone"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
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
                              onClick={() => handleDeleteAddress(addr.id)}
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

            {/* TAB 3: CHANGE PASSWORD */}
            {activeTab === 'password' && (
              <div>
                <h3 className="text-[1.2rem] font-bold uppercase tracking-[0.05em] mb-2 text-content-primary">
                  Đổi Mật Khẩu
                </h3>
                <p className="text-[0.82rem] text-content-secondary mb-6">
                  Sau khi đổi mật khẩu thành công, tất cả các phiên đăng nhập khác sẽ tự động bị đăng xuất.
                </p>

                <form onSubmit={handleChangePassword} className="flex flex-col gap-2 max-w-[440px]">
                  <Input
                    label="Mật khẩu hiện tại"
                    type="password"
                    placeholder="Nhập mật khẩu hiện tại"
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                    required
                  />

                  <Input
                    label="Mật khẩu mới"
                    type="password"
                    placeholder="Tối thiểu 6 ký tự"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                  />

                  <Input
                    label="Xác nhận mật khẩu mới"
                    type="password"
                    placeholder="Nhập lại mật khẩu mới"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
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
              </div>
            )}

            {/* TAB 4: PREFERENCE MATRIX & FEATURE STORE */}
            {activeTab === 'preferences' && (
              <div>
                <PreferenceMatrixTab />
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
    </div>
  );
}
