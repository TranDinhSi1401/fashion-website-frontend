import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, KeyRound, MapPin, Camera, Trash2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import { UserAddressResponse, AddressType } from '../types/user';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { isValidVietnamPhone, extractErrorMessage } from '../utils/format';

export default function ProfilePage() {
  const { user, updateUserLocal, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname.includes('/password')
    ? 'password'
    : location.pathname.includes('/addresses')
    ? 'addresses'
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
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressForm, setAddressForm] = useState<{
    fullAddress: string;
    addressType: AddressType;
    isDefault: boolean;
  }>({
    fullAddress: '',
    addressType: 'HOME',
    isDefault: false,
  });

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
    if (activeTab === 'addresses') {
      fetchAddresses();
    }
    setErrorMessage('');
    setSuccessMessage('');
  }, [activeTab]);

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
    } catch (err: any) {
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
    } catch (err: any) {
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
    } catch (err: any) {
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
    } catch (err: any) {
      setErrorMessage(extractErrorMessage(err, 'Đổi mật khẩu không thành công. Kiểm tra lại mật khẩu cũ.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddressModal = (addr: UserAddressResponse | null = null) => {
    if (addr) {
      setEditingAddressId(addr.id);
      setAddressForm({
        fullAddress: addr.fullAddress,
        addressType: addr.addressType || 'HOME',
        isDefault: !!addr.isDefault,
      });
    } else {
      setEditingAddressId(null);
      setAddressForm({
        fullAddress: '',
        addressType: 'HOME',
        isDefault: addresses.length === 0,
      });
    }
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.fullAddress.trim()) {
      alert('Vui lòng nhập địa chỉ chi tiết');
      return;
    }

    setIsLoading(true);
    try {
      if (editingAddressId) {
        await userService.updateAddress(editingAddressId, addressForm);
      } else {
        await userService.createAddress(addressForm);
      }
      setIsAddressModalOpen(false);
      await fetchAddresses();
      setSuccessMessage(editingAddressId ? 'Cập nhật địa chỉ thành công!' : 'Thêm địa chỉ mới thành công!');
    } catch (err: any) {
      alert(extractErrorMessage(err, 'Lưu địa chỉ thất bại'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefaultAddress = async (id: number) => {
    try {
      await userService.setDefaultAddress(id);
      await fetchAddresses();
    } catch (err: any) {
      alert(extractErrorMessage(err, 'Không thể đặt làm mặc định'));
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) return;
    try {
      await userService.deleteAddress(id);
      await fetchAddresses();
    } catch (err: any) {
      alert(extractErrorMessage(err, 'Xóa địa chỉ thất bại'));
    }
  };

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">
        <h1
          style={{
            fontSize: '1.8rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '32px',
          }}
        >
          Tài Khoản Của Tôi
        </h1>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '260px 1fr',
            gap: '32px',
            alignItems: 'start',
          }}
        >
          {/* Navigation Sidebar */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              {user?.avt ? (
                <img
                  src={user.avt}
                  alt={user.fullname || user.username}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: 'var(--bg-dark)',
                    color: 'var(--text-inverse)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                  }}
                >
                  {(user?.fullname || user?.username || 'U')[0].toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{user?.fullname || user?.username}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{user?.username}</div>
                {user?.role && <Badge variant="dark" style={{ marginTop: '4px' }}>{user.role}</Badge>}
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: 'var(--border-default)', margin: '4px 0 12px' }} />

            <button
              type="button"
              onClick={() => navigate('/account/profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                fontSize: '0.85rem',
                fontWeight: activeTab === 'profile' ? 700 : 500,
                backgroundColor: activeTab === 'profile' ? 'var(--bg-dark)' : 'transparent',
                color: activeTab === 'profile' ? 'var(--text-inverse)' : 'var(--text-primary)',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: 'var(--radius-btn)',
              }}
            >
              <User size={16} />
              Thông Tin Cá Nhân
            </button>

            <button
              type="button"
              onClick={() => navigate('/account/addresses')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                fontSize: '0.85rem',
                fontWeight: activeTab === 'addresses' ? 700 : 500,
                backgroundColor: activeTab === 'addresses' ? 'var(--bg-dark)' : 'transparent',
                color: activeTab === 'addresses' ? 'var(--text-inverse)' : 'var(--text-primary)',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: 'var(--radius-btn)',
              }}
            >
              <MapPin size={16} />
              Sổ Địa Chỉ ({addresses.length})
            </button>

            <button
              type="button"
              onClick={() => navigate('/account/password')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                fontSize: '0.85rem',
                fontWeight: activeTab === 'password' ? 700 : 500,
                backgroundColor: activeTab === 'password' ? 'var(--bg-dark)' : 'transparent',
                color: activeTab === 'password' ? 'var(--text-inverse)' : 'var(--text-primary)',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: 'var(--radius-btn)',
              }}
            >
              <KeyRound size={16} />
              Đổi Mật Khẩu
            </button>
          </div>

          {/* Tab Main Content */}
          <div
            style={{
              backgroundColor: 'var(--bg-body)',
              border: '1px solid var(--border-light)',
              padding: '36px',
            }}
          >
            {errorMessage && (
              <div
                className="animate-fade-in"
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--status-error-bg)',
                  borderLeft: '3px solid var(--status-error)',
                  color: 'var(--status-error)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '24px',
                }}
              >
                <AlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div
                className="animate-fade-in"
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--status-success-bg)',
                  borderLeft: '3px solid var(--status-success)',
                  color: 'var(--status-success)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '24px',
                }}
              >
                <CheckCircle2 size={18} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* TAB 1: PROFILE INFO */}
            {activeTab === 'profile' && (
              <div>
                <h3
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '24px',
                  }}
                >
                  Hồ Sơ Của Bạn
                </h3>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '24px',
                    paddingBottom: '24px',
                    marginBottom: '24px',
                    borderBottom: '1px solid var(--border-light)',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    {user?.avt ? (
                      <img
                        src={user.avt}
                        alt="Avatar"
                        style={{
                          width: '84px',
                          height: '84px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid var(--border-default)',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '84px',
                          height: '84px',
                          backgroundColor: 'var(--bg-dark)',
                          color: 'var(--text-inverse)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '2rem',
                          fontWeight: 700,
                          borderRadius: '50%',
                        }}
                      >
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
                      style={{ display: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
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
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Dung lượng tối đa 5MB. Định dạng: JPG, PNG, WEBP.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                    style={{ alignSelf: 'flex-start', marginTop: '16px' }}
                  >
                    Lưu Thay Đổi
                  </Button>
                </form>
              </div>
            )}

            {/* TAB 2: ADDRESSES */}
            {activeTab === 'addresses' && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Sổ Địa Chỉ Giao Hàng
                  </h3>

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
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '48px 20px',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <MapPin size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
                    <p>Bạn chưa lưu địa chỉ giao hàng nào.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        style={{
                          padding: '20px',
                          border: '1px solid',
                          borderColor: addr.isDefault ? 'var(--color-primary)' : 'var(--border-light)',
                          backgroundColor: addr.isDefault ? 'var(--bg-surface)' : 'transparent',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '16px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <Badge variant={addr.addressType === 'HOME' ? 'default' : 'dark'}>
                              {addr.addressType === 'HOME' ? 'Nhà riêng' : addr.addressType === 'OFFICE' ? 'Văn phòng' : 'Khác'}
                            </Badge>
                            {addr.isDefault && (
                              <Badge variant="success">Mặc định</Badge>
                            )}
                          </div>
                          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {addr.fullAddress}
                          </p>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
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
            )}

            {/* TAB 3: CHANGE PASSWORD */}
            {activeTab === 'password' && (
              <div>
                <h3
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '8px',
                  }}
                >
                  Đổi Mật Khẩu
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  Sau khi đổi mật khẩu thành công, tất cả các phiên đăng nhập khác sẽ tự động bị đăng xuất.
                </p>

                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '440px' }}>
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
                    style={{ alignSelf: 'flex-start', marginTop: '16px' }}
                  >
                    Xác Nhận Đổi Mật Khẩu
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        title={editingAddressId ? 'Cập Nhật Địa Chỉ' : 'Thêm Địa Chỉ Mới'}
      >
        <form onSubmit={handleSaveAddress} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Địa chỉ chi tiết (Số nhà, đường, phường, quận, TP)"
            value={addressForm.fullAddress}
            onChange={(e) => setAddressForm({ ...addressForm, fullAddress: e.target.value })}
            placeholder="Ví dụ: 12 Nguyễn Văn Bảo, Phường 4, Gò Vấp, TP.HCM"
            required
          />

          <Select
            label="Loại địa chỉ"
            value={addressForm.addressType}
            onChange={(e) => setAddressForm({ ...addressForm, addressType: e.target.value as AddressType })}
            options={[
              { value: 'HOME', label: 'Nhà riêng' },
              { value: 'OFFICE', label: 'Văn phòng / Công ty' },
              { value: 'OTHER', label: 'Khác' },
            ]}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={addressForm.isDefault}
              onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
            />
            <span>Đặt làm địa chỉ nhận hàng mặc định</span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <Button variant="secondary" onClick={() => setIsAddressModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={isLoading}>
              Lưu Địa Chỉ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

