import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  MapPin,
  Eye,
  Calendar,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Camera,
  AlertTriangle,
  X,
  Home,
  Building2,
  User as UserIcon,
  Filter,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import AdminNav from '../components/admin/AdminNav';
import AddressFormModal from '../components/profile/AddressFormModal';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { UserResponse, UserAddressResponse } from '../types/user';
import { Badge, Button, Input, Modal, Select } from '../components/ui';
import { extractErrorMessage } from '../utils/format';
import { cn } from '../utils/cn';
import styles from './AdminPages.module.css';

export default function AdminUsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [genderFilter, setGenderFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('id_desc');

  const formatGender = (gender?: string | null) => {
    if (gender === 'MALE') return 'Nam';
    if (gender === 'FEMALE') return 'Nữ';
    if (gender === 'OTHER') return 'Khác';
    return 'Chưa cập nhật';
  };

  // Confirmation / Alert Dialog State (Replaces native window.confirm & alert)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary' | 'warning';
    onConfirm: () => Promise<void> | void;
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // User Edit / Create Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullname: '',
    gender: 'MALE',
    email: '',
    phone: '',
    role: 'CUSTOMER',
    status: 'ACTIVE',
  });
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Avatar State for Create / Edit Modal
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [removeAvatar, setRemoveAvatar] = useState<boolean>(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // User Detail View Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [detailUser, setDetailUser] = useState<UserResponse | null>(null);
  const [detailAddresses, setDetailAddresses] = useState<UserAddressResponse[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);

  // Address Detail Modal State
  const [selectedAddressDetail, setSelectedAddressDetail] = useState<UserAddressResponse | null>(null);
  const [isAddressDetailModalOpen, setIsAddressDetailModalOpen] = useState<boolean>(false);

  // Address Edit Modal State
  const [editingAddress, setEditingAddress] = useState<UserAddressResponse | null>(null);
  const [isEditAddressModalOpen, setIsEditAddressModalOpen] = useState<boolean>(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await userService.getAllUsers();
      if (res && res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch users for admin table:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormError('');
    setAvatarFile(null);
    setAvatarPreview('');
    setRemoveAvatar(false);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
    setFormData({
      username: '',
      password: '',
      fullname: '',
      gender: 'MALE',
      email: '',
      phone: '',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (u: UserResponse) => {
    setEditingUser(u);
    setFormError('');
    setAvatarFile(null);
    setAvatarPreview(u.avt || '');
    setRemoveAvatar(false);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
    setFormData({
      username: u.username || '',
      password: '',
      fullname: u.fullname || '',
      gender: u.gender || 'OTHER',
      email: u.email || '',
      phone: u.phone || '',
      role: u.role || 'CUSTOMER',
      status: u.status || 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  // Avatar change handler
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFormError('Chỉ hỗ trợ file ảnh định dạng JPG, PNG hoặc WEBP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Dung lượng ảnh tối đa là 5MB.');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setRemoveAvatar(false);
    setFormError('');
  };

  // Avatar remove handler
  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
    setRemoveAvatar(true);
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  // Open User Detail View Modal
  const handleOpenDetailModal = async (u: UserResponse) => {
    setDetailUser(u);
    setIsDetailLoading(true);
    setIsDetailModalOpen(true);
    try {
      const [userRes, addressRes] = await Promise.all([
        userService.getUserById(u.id),
        userService.getUserAddressesByAdmin(u.id).catch(() => ({ data: [] })),
      ]);
      if (userRes?.data) setDetailUser(userRes.data);
      setDetailAddresses(addressRes?.data || []);
    } catch (err) {
      console.warn('Could not fetch user details:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Open Address Detail Modal
  const handleOpenAddressDetail = async (userId: number, addressId: number) => {
    try {
      const res = await userService.getUserAddressDetailByAdmin(userId, addressId);
      if (res?.data) {
        setSelectedAddressDetail(res.data);
        setIsAddressDetailModalOpen(true);
      }
    } catch (err) {
      setConfirmDialog({
        isOpen: true,
        title: 'Thông Báo',
        message: extractErrorMessage(err, 'Không thể tải chi tiết địa chỉ này.'),
        confirmText: 'Đã hiểu',
        variant: 'primary',
        onConfirm: () => setConfirmDialog((p) => ({ ...p, isOpen: false })),
      });
    }
  };

  // Open Add Address Modal for current detailUser
  const handleOpenAddAddressForUser = () => {
    setEditingAddress(null);
    setIsEditAddressModalOpen(true);
  };

  // Open Edit Address Modal
  const handleOpenEditAddress = (addr: UserAddressResponse) => {
    setEditingAddress(addr);
    setIsEditAddressModalOpen(true);
  };

  // On Address Saved
  const handleAddressSaved = async (_saved: UserAddressResponse) => {
    if (detailUser) {
      try {
        const res = await userService.getUserAddressesByAdmin(detailUser.id);
        setDetailAddresses(res.data || []);
      } catch (err) {
        console.warn('Could not refresh addresses:', err);
      }
    }
  };

  // Delete Address with Luxury Confirm Dialog
  const handleDeleteAddress = (addressId: number) => {
    if (!isAdmin) {
      setConfirmDialog({
        isOpen: true,
        title: 'Quyền Hạn Bị Từ Chối',
        message: 'Chỉ Quản trị viên (ADMIN) mới có quyền xóa địa chỉ của người dùng.',
        confirmText: 'Đã hiểu',
        variant: 'primary',
        onConfirm: () => setConfirmDialog((p) => ({ ...p, isOpen: false })),
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Xác Nhận Xóa Địa Chỉ',
      message: 'Bạn có chắc chắn muốn xóa địa chỉ này? Hệ thống sẽ chuyển sang xóa mềm để bảo vệ lịch sử đơn hàng.',
      confirmText: 'Xóa Địa Chỉ',
      cancelText: 'Hủy Bỏ',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setConfirmDialog((p) => ({ ...p, isLoading: true }));
          await userService.deleteAddress(addressId);
          if (detailUser) {
            const res = await userService.getUserAddressesByAdmin(detailUser.id);
            setDetailAddresses(res.data || []);
          }
          setConfirmDialog((p) => ({ ...p, isOpen: false, isLoading: false }));
        } catch (err) {
          setConfirmDialog((p) => ({
            ...p,
            isLoading: false,
            title: 'Lỗi Xóa Địa Chỉ',
            message: extractErrorMessage(err, 'Xóa địa chỉ thất bại.'),
            confirmText: 'Đóng',
            variant: 'danger',
            onConfirm: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
          }));
        }
      },
    });
  };

  // Delete User with Luxury Confirm Dialog
  const handleDeleteUser = (id: number, name: string) => {
    if (!isAdmin) {
      setConfirmDialog({
        isOpen: true,
        title: 'Quyền Hạn Bị Từ Chối',
        message: 'Chỉ Quản trị viên (ADMIN) mới có quyền vô hiệu hóa tài khoản người dùng.',
        confirmText: 'Đã hiểu',
        variant: 'primary',
        onConfirm: () => setConfirmDialog((p) => ({ ...p, isOpen: false })),
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Vô Hiệu Hóa (Xóa Mềm) Tài Khoản',
      message: `Bạn có chắc chắn muốn vô hiệu hóa tài khoản "${name}" (#${id})? Tài khoản này sẽ chuyển sang trạng thái KHÓA và ngay lập tức bị thu hồi quyền truy cập.`,
      confirmText: 'Vô Hiệu Hóa',
      cancelText: 'Hủy Bỏ',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setConfirmDialog((p) => ({ ...p, isLoading: true }));
          await userService.deleteUser(id);
          await fetchUsers();
          if (isDetailModalOpen && detailUser?.id === id) {
            setIsDetailModalOpen(false);
          }
          setConfirmDialog((p) => ({ ...p, isOpen: false, isLoading: false }));
        } catch (err) {
          setConfirmDialog((p) => ({
            ...p,
            isLoading: false,
            title: 'Thao Tác Thất Bại',
            message: extractErrorMessage(err, 'Vô hiệu hóa tài khoản thất bại.'),
            confirmText: 'Đóng',
            variant: 'danger',
            onConfirm: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
          }));
        }
      },
    });
  };

  // Submit User Create / Update
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanFullname = formData.fullname.trim();
    const cleanEmail = formData.email.trim();
    const cleanPhone = formData.phone.trim();
    const cleanPassword = formData.password.trim();

    if (!cleanFullname) {
      setFormError('Vui lòng nhập họ và tên.');
      return;
    }

    if (!['MALE', 'FEMALE', 'OTHER'].includes(formData.gender)) {
      setFormError('Vui lòng chọn giới tính hợp lệ.');
      return;
    }

    if (!cleanEmail) {
      setFormError('Vui lòng nhập email.');
      return;
    }

    if (!editingUser && !cleanPhone) {
      setFormError('Vui lòng nhập số điện thoại khi tạo tài khoản mới.');
      return;
    }

    if (cleanPhone && !/^(0|\+84)[0-9]{9}$/.test(cleanPhone)) {
      setFormError('Số điện thoại không đúng định dạng 10 số Việt Nam (bắt đầu bằng 0 hoặc +84).');
      return;
    }

    if (!editingUser && !cleanPassword) {
      setFormError('Vui lòng nhập mật khẩu khi tạo tài khoản mới.');
      return;
    }

    if (cleanPassword && cleanPassword.length < 6) {
      setFormError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingUser) {
        // Cập nhật người dùng: chỉ gửi phone và password nếu có giá trị
        const payload: Record<string, any> = {
          fullname: cleanFullname,
          gender: formData.gender,
          email: cleanEmail,
          role: formData.role,
          status: formData.status,
        };
        if (cleanPhone) {
          payload.phone = cleanPhone;
        }
        if (cleanPassword) {
          payload.password = cleanPassword;
        }

        await userService.updateUser(editingUser.id, payload);

        // Xử lý cập nhật avatar riêng biệt
        if (avatarFile) {
          await userService.uploadAvatarByAdmin(editingUser.id, avatarFile);
        } else if (removeAvatar && editingUser.avt) {
          await userService.deleteAvatarByAdmin(editingUser.id);
        }
      } else {
        // Tạo người dùng mới
        if (avatarFile) {
          const formPayload = new FormData();
          formPayload.append('username', formData.username.trim());
          formPayload.append('password', cleanPassword);
          formPayload.append('fullname', cleanFullname);
          formPayload.append('gender', formData.gender);
          formPayload.append('email', cleanEmail);
          formPayload.append('role', formData.role);
          if (cleanPhone) {
            formPayload.append('phone', cleanPhone);
          }
          formPayload.append('file', avatarFile);
          await userService.createUser(formPayload);
        } else {
          const payload: Record<string, any> = {
            username: formData.username.trim(),
            password: cleanPassword,
            fullname: cleanFullname,
            gender: formData.gender,
            email: cleanEmail,
            role: formData.role,
          };
          if (cleanPhone) {
            payload.phone = cleanPhone;
          }

          await userService.createUser(payload);
        }
      }

      setIsModalOpen(false);
      await fetchUsers();
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Lưu người dùng thất bại. Vui lòng kiểm tra lại dữ liệu.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFiltered =
    searchTerm.trim() !== '' ||
    roleFilter !== 'ALL' ||
    genderFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    sortBy !== 'id_desc';

  const handleResetFilters = () => {
    setSearchTerm('');
    setRoleFilter('ALL');
    setGenderFilter('ALL');
    setStatusFilter('ALL');
    setSortBy('id_desc');
  };

  const filtered = users
    .filter((u) => {
      // Tìm kiếm theo username, họ tên, email, số điện thoại
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        (u.username || '').toLowerCase().includes(term) ||
        (u.fullname || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (u.phone || '').toLowerCase().includes(term);

      // Lọc theo vai trò
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;

      // Lọc theo giới tính
      const matchGender = genderFilter === 'ALL' || u.gender === genderFilter;

      // Lọc theo trạng thái
      const currentStatus = u.status || 'ACTIVE';
      const matchStatus = statusFilter === 'ALL' || currentStatus === statusFilter;

      return matchSearch && matchRole && matchGender && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'id_desc') return b.id - a.id;
      if (sortBy === 'id_asc') return a.id - b.id;
      if (sortBy === 'name_asc') {
        const nameA = (a.fullname || a.username || '').toLowerCase();
        const nameB = (b.fullname || b.username || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'name_desc') {
        const nameA = (a.fullname || a.username || '').toLowerCase();
        const nameB = (b.fullname || b.username || '').toLowerCase();
        return nameB.localeCompare(nameA);
      }
      return 0;
    });

  return (
    <div className="py-8">
      <div className="container">
        {/* Admin Navigation & Header */}
        <AdminNav
          title="Quản Lý Người Dùng & Sổ Địa Chỉ"
          subtitle={`Quản lý tài khoản, phân quyền vai trò (Admin, Staff, Customer) và kiểm tra sổ địa chỉ của ${users.length} người dùng.`}
          actions={
            <>
              <Button variant="secondary" size="sm" onClick={fetchUsers} icon={RefreshCw}>
                Làm Mới
              </Button>
              {isAdmin && (
                <Button variant="primary" size="sm" onClick={handleOpenCreateModal} icon={Plus}>
                  Tạo Tài Khoản
                </Button>
              )}
            </>
          }
        />

        {/* Search & Advanced Filters Toolbar */}
        <div className="bg-surface-body border border-line-light p-4 rounded-sm shadow-xs mb-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            {/* Search Input */}
            <div className="lg:col-span-4">
              <label className="block text-[0.72rem] uppercase tracking-wider font-bold text-content-secondary mb-1.5">
                Tìm kiếm
              </label>
              <Input
                placeholder="Tìm theo username, họ tên, email, SĐT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={Search}
                rightElement={
                  searchTerm ? (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="text-content-muted hover:text-content-primary p-1 focus:outline-none"
                      title="Xóa tìm kiếm"
                    >
                      <X size={15} />
                    </button>
                  ) : null
                }
              />
            </div>

            {/* Role Filter */}
            <div className="lg:col-span-2">
              <label className="block text-[0.72rem] uppercase tracking-wider font-bold text-content-secondary mb-1.5">
                Vai trò
              </label>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'Tất cả vai trò' },
                  { value: 'CUSTOMER', label: 'CUSTOMER' },
                  { value: 'STAFF', label: 'STAFF' },
                  { value: 'ADMIN', label: 'ADMIN' },
                ]}
              />
            </div>

            {/* Gender Filter */}
            <div className="lg:col-span-2">
              <label className="block text-[0.72rem] uppercase tracking-wider font-bold text-content-secondary mb-1.5">
                Giới tính
              </label>
              <Select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'Tất cả giới tính' },
                  { value: 'MALE', label: 'Nam (MALE)' },
                  { value: 'FEMALE', label: 'Nữ (FEMALE)' },
                  { value: 'OTHER', label: 'Khác (OTHER)' },
                ]}
              />
            </div>

            {/* Status Filter */}
            <div className="lg:col-span-2">
              <label className="block text-[0.72rem] uppercase tracking-wider font-bold text-content-secondary mb-1.5">
                Trạng thái
              </label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'Tất cả trạng thái' },
                  { value: 'ACTIVE', label: 'ACTIVE (Kích hoạt)' },
                  { value: 'INACTIVE', label: 'INACTIVE (Đã khóa)' },
                ]}
              />
            </div>

            {/* Sort Filter */}
            <div className="lg:col-span-2">
              <label className="block text-[0.72rem] uppercase tracking-wider font-bold text-content-secondary mb-1.5">
                Sắp xếp
              </label>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                options={[
                  { value: 'id_desc', label: 'Mới nhất' },
                  { value: 'id_asc', label: 'Cũ nhất' },
                  { value: 'name_asc', label: 'Tên (A → Z)' },
                  { value: 'name_desc', label: 'Tên (Z → A)' },
                ]}
              />
            </div>
          </div>

          {/* Filter Summary & Active Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-line-light/60 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-content-muted font-medium">
                Hiển thị <strong className="text-content-primary">{filtered.length}</strong> / {users.length} người dùng
              </span>

              {/* Active Filter Chips */}
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface border border-line-light text-content-primary">
                  Tìm: "{searchTerm}"
                  <button type="button" onClick={() => setSearchTerm('')} className="hover:text-status-error">
                    <X size={12} />
                  </button>
                </span>
              )}

              {roleFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface border border-line-light text-content-primary">
                  Vai trò: {roleFilter}
                  <button type="button" onClick={() => setRoleFilter('ALL')} className="hover:text-status-error">
                    <X size={12} />
                  </button>
                </span>
              )}

              {genderFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface border border-line-light text-content-primary">
                  Giới tính: {formatGender(genderFilter)}
                  <button type="button" onClick={() => setGenderFilter('ALL')} className="hover:text-status-error">
                    <X size={12} />
                  </button>
                </span>
              )}

              {statusFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface border border-line-light text-content-primary">
                  Trạng thái: {statusFilter}
                  <button type="button" onClick={() => setStatusFilter('ALL')} className="hover:text-status-error">
                    <X size={12} />
                  </button>
                </span>
              )}

              {sortBy !== 'id_desc' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface border border-line-light text-content-primary">
                  Sắp xếp: {sortBy === 'id_asc' ? 'Cũ nhất' : sortBy === 'name_asc' ? 'Tên A-Z' : 'Tên Z-A'}
                  <button type="button" onClick={() => setSortBy('id_desc')} className="hover:text-status-error">
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>

            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={handleResetFilters}
                className="text-xs text-accent-gold hover:text-accent-gold hover:bg-accent-gold/10 h-7 px-2"
              >
                Đặt lại bộ lọc
              </Button>
            )}
          </div>
        </div>

        {/* Mobile View: User Cards (Visible on screens < 768px) */}
        <div className="block md:hidden space-y-3.5 mb-6">
          {isLoading ? (
            <div className="p-8 text-center text-content-muted bg-surface-body border border-line-light rounded-sm">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-accent-gold" />
              Đang tải danh sách người dùng...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-content-muted bg-surface-body border border-line-light rounded-sm">
              Không tìm thấy người dùng phù hợp.
            </div>
          ) : (
            filtered.map((u) => (
              <div
                key={u.id}
                className="p-4 bg-surface-body border border-line-light rounded-sm shadow-xs flex flex-col gap-3 transition-colors hover:border-accent-gold/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
                    onClick={() => handleOpenDetailModal(u)}
                  >
                    {u.avt ? (
                      <img
                        src={u.avt}
                        alt={u.username}
                        className="w-12 h-12 rounded-full object-cover shrink-0 border border-line-light shadow-xs"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-surface-dark text-content-inverse flex items-center justify-center font-bold text-base shrink-0">
                        {(u.fullname || u.username || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-content-primary group-hover:text-accent-gold transition-colors truncate">
                        {u.fullname || u.username}
                      </div>
                      <div className="text-xs text-content-muted truncate">
                        @{u.username} • #{u.id} • {formatGender(u.gender)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={u.role === 'ADMIN' ? 'dark' : u.role === 'STAFF' ? 'warning' : 'default'}>
                      {u.role}
                    </Badge>
                    <Badge variant={u.status === 'INACTIVE' ? 'error' : 'success'}>
                      {u.status || 'ACTIVE'}
                    </Badge>
                  </div>
                </div>

                <div className="text-xs text-content-secondary space-y-1.5 bg-surface p-3 rounded-sm border border-line-light/70">
                  <div className="flex items-center gap-2 truncate">
                    <Mail size={14} className="text-accent-gold shrink-0" />
                    <span className="truncate">{u.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-accent-gold shrink-0" />
                    <span>{u.phone || 'Chưa cập nhật SĐT'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line-light">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Eye}
                    onClick={() => handleOpenDetailModal(u)}
                    className="w-full text-xs justify-center"
                  >
                    Chi Tiết
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Edit2}
                    onClick={() => handleOpenEditModal(u)}
                    className="w-full text-xs justify-center"
                  >
                    Sửa
                  </Button>
                  {isAdmin ? (
                    <Button
                      variant="danger"
                      size="sm"
                      icon={Trash2}
                      onClick={() => handleDeleteUser(u.id, u.username)}
                      className="w-full text-xs justify-center"
                    >
                      Xóa
                    </Button>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Users Table (Visible on screens >= 768px) */}
        <div className="hidden md:block overflow-x-auto border border-line-light bg-surface-body shadow-sm">
          <table className="w-full border-collapse text-left text-[0.85rem]">
            <thead>
              <tr className="bg-surface border-b border-line-light uppercase tracking-wider text-[0.72rem] font-bold text-content-secondary">
                <th className="p-3.5 pl-4">ID</th>
                <th className="p-3.5">Người Dùng</th>
                <th className="p-3.5">Giới Tính</th>
                <th className="p-3.5">Liên Hệ</th>
                <th className="p-3.5">Vai Trò</th>
                <th className="p-3.5">Trạng Thái</th>
                <th className="p-3.5 pr-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-content-muted">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-accent-gold" />
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-content-muted">
                    Không tìm thấy người dùng phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className={styles.tableRow}>
                    <td className="p-3.5 pl-4 font-bold text-content-muted">#{u.id}</td>
                    <td className="p-3.5">
                      <div
                        className="flex items-center gap-2.5 cursor-pointer group"
                        onClick={() => handleOpenDetailModal(u)}
                        title="Bấm để xem chi tiết người dùng"
                      >
                        {u.avt ? (
                          <img
                            src={u.avt}
                            alt={u.username}
                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-line-light"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-surface-dark text-content-inverse flex items-center justify-center font-bold text-[0.8rem] shrink-0">
                            {(u.fullname || u.username || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-content-primary group-hover:text-accent-gold transition-colors">
                            {u.fullname || u.username}
                          </div>
                          <div className="text-[0.72rem] text-content-muted">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <Badge variant="default">
                        {formatGender(u.gender)}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <div className="text-content-primary">{u.email}</div>
                      <div className="text-[0.75rem] text-content-muted">{u.phone || 'Chưa có SĐT'}</div>
                    </td>
                    <td className="p-3.5">
                      <Badge variant={u.role === 'ADMIN' ? 'dark' : u.role === 'STAFF' ? 'warning' : 'default'}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <Badge variant={u.status === 'INACTIVE' ? 'error' : 'success'}>
                        {u.status || 'ACTIVE'}
                      </Badge>
                    </td>
                    <td className="p-3.5 pr-4 text-right">
                      <div className="inline-flex gap-1.5 items-center justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Eye}
                          onClick={() => handleOpenDetailModal(u)}
                          title="Xem chi tiết người dùng và sổ địa chỉ"
                        >
                          Chi Tiết
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Edit2}
                          onClick={() => handleOpenEditModal(u)}
                          title="Chỉnh sửa thông tin"
                        >
                          Sửa
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            title="Vô hiệu hóa tài khoản"
                          >
                            Xóa
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* USER DETAIL MODAL - LUXURY EDITION */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={detailUser ? `Chi Tiết Người Dùng #${detailUser.id}` : 'Chi Tiết Người Dùng'}
        maxWidth="680px"
      >
        {detailUser && (
          <div className="flex flex-col gap-5">
            {/* User Profile Header Card */}
            <div className="relative overflow-hidden p-4 sm:p-5 bg-gradient-to-r from-surface to-surface-body border border-line-light rounded-sm shadow-xs">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="relative shrink-0">
                  {detailUser.avt ? (
                    <img
                      src={detailUser.avt}
                      alt={detailUser.username}
                      className="w-20 h-20 rounded-full object-cover border-2 border-accent-gold shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-surface-dark text-content-inverse flex items-center justify-center font-bold text-2xl border-2 border-line-light shadow-md">
                      {(detailUser.fullname || detailUser.username || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-surface-body border border-line-light rounded-full p-1 shadow-xs">
                    <UserIcon size={14} className="text-accent-gold" />
                  </div>
                </div>

                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                    <h3 className="text-xl font-bold text-content-primary m-0 tracking-tight">
                      {detailUser.fullname || detailUser.username}
                    </h3>
                    <Badge variant={detailUser.role === 'ADMIN' ? 'dark' : detailUser.role === 'STAFF' ? 'warning' : 'default'}>
                      {detailUser.role}
                    </Badge>
                    <Badge variant={detailUser.status === 'INACTIVE' ? 'error' : 'success'}>
                      {detailUser.status || 'ACTIVE'}
                    </Badge>
                  </div>

                  <div className="text-xs text-content-muted flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    <span>Tên đăng nhập: <strong className="text-content-primary">@{detailUser.username}</strong></span>
                    <span>•</span>
                    <span>Giới tính: <strong className="text-content-primary">{formatGender(detailUser.gender)}</strong></span>
                    <span>•</span>
                    <span>Mã tài khoản: <strong className="text-content-primary">#{detailUser.id}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 border border-line-light bg-surface-body flex items-center gap-3 rounded-sm shadow-xs">
                <div className="w-9 h-9 rounded-full bg-accent-gold/10 flex items-center justify-center shrink-0 text-accent-gold">
                  <Mail size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-[0.7rem] uppercase tracking-wider font-bold text-content-muted">Email liên hệ</div>
                  <div className="text-sm font-semibold text-content-primary truncate">{detailUser.email || 'Chưa cập nhật'}</div>
                </div>
              </div>

              <div className="p-3.5 border border-line-light bg-surface-body flex items-center gap-3 rounded-sm shadow-xs">
                <div className="w-9 h-9 rounded-full bg-accent-gold/10 flex items-center justify-center shrink-0 text-accent-gold">
                  <Phone size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-[0.7rem] uppercase tracking-wider font-bold text-content-muted">Số điện thoại</div>
                  <div className="text-sm font-semibold text-content-primary">{detailUser.phone || 'Chưa cập nhật'}</div>
                </div>
              </div>

              <div className="p-3.5 border border-line-light bg-surface-body flex items-center gap-3 rounded-sm shadow-xs">
                <div className="w-9 h-9 rounded-full bg-accent-gold/10 flex items-center justify-center shrink-0 text-accent-gold">
                  <UserIcon size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-[0.7rem] uppercase tracking-wider font-bold text-content-muted">Giới tính</div>
                  <div className="text-sm font-semibold text-content-primary">{formatGender(detailUser.gender)}</div>
                </div>
              </div>
            </div>

            {/* Addresses Section with Add Button */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-line-light">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-accent-gold" />
                  <span className="font-bold text-xs uppercase tracking-wider text-content-primary">
                    Sổ Địa Chỉ Giao Hàng ({detailAddresses.length})
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={handleOpenAddAddressForUser}
                  className="text-xs font-semibold py-1 px-3"
                >
                  Thêm Địa Chỉ
                </Button>
              </div>

              {isDetailLoading ? (
                <div className="p-6 text-center text-xs text-content-muted bg-surface rounded-sm">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1.5 text-accent-gold" />
                  Đang tải danh sách địa chỉ...
                </div>
              ) : detailAddresses.length === 0 ? (
                <div className="p-6 border border-dashed border-line-light text-center rounded-sm bg-surface flex flex-col items-center gap-2">
                  <MapPin size={24} className="text-content-muted/60" />
                  <p className="text-xs text-content-muted m-0">
                    Người dùng @{detailUser.username} chưa có địa chỉ nhận hàng nào.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Plus}
                    onClick={handleOpenAddAddressForUser}
                    className="mt-1 text-xs"
                  >
                    Thêm Địa Chỉ Đầu Tiên
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {detailAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={cn(
                        'p-3.5 border rounded-sm bg-surface transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                        addr.isDefault ? 'border-accent-gold/40 shadow-xs' : 'border-line-light'
                      )}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-content-muted">#{addr.id}</span>
                          <Badge variant={addr.addressType === 'HOME' ? 'default' : 'dark'}>
                            {addr.addressType === 'HOME' ? 'Nhà riêng' : addr.addressType === 'OFFICE' ? 'Văn phòng' : 'Khác'}
                          </Badge>
                          {addr.isDefault && (
                            <Badge variant="success">Mặc định</Badge>
                          )}
                        </div>
                        <div className="font-semibold text-content-primary text-sm">
                          {addr.fullAddress}
                        </div>
                        <div className="text-xs text-content-secondary">
                          {[addr.wardName, addr.provinceName].filter(Boolean).join(', ')}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Eye}
                          onClick={() => handleOpenAddressDetail(detailUser.id, addr.id)}
                          className="text-xs px-2.5 py-1"
                          title="Xem chi tiết"
                        >
                          Chi Tiết
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Edit2}
                          onClick={() => handleOpenEditAddress(addr)}
                          className="text-xs px-2.5 py-1"
                          title="Chỉnh sửa địa chỉ"
                        >
                          Sửa
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="text-xs px-2.5 py-1"
                            title="Xóa mềm địa chỉ"
                          >
                            Xóa
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-line-light">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Đóng
              </Button>
              <Button
                variant="primary"
                icon={Edit2}
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenEditModal(detailUser);
                }}
              >
                Sửa Thông Tin
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* SINGLE ADDRESS DETAIL MODAL - LUXURY EDITION */}
      <Modal
        isOpen={isAddressDetailModalOpen}
        onClose={() => setIsAddressDetailModalOpen(false)}
        title={selectedAddressDetail ? `Chi Tiết Địa Chỉ #${selectedAddressDetail.id}` : 'Chi Tiết Địa Chỉ'}
        maxWidth="520px"
      >
        {selectedAddressDetail && (
          <div className="flex flex-col gap-4 text-xs">
            {/* Header Banner */}
            <div className="p-4 bg-gradient-to-r from-surface to-surface-body border border-line-light rounded-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent-gold/10 flex items-center justify-center text-accent-gold shrink-0 border border-accent-gold/20">
                  <MapPin size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm text-content-primary">Mã Địa Chỉ #{selectedAddressDetail.id}</div>
                  <div className="text-content-muted text-[0.72rem]">Địa chỉ giao hàng người dùng</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Badge variant={selectedAddressDetail.addressType === 'HOME' ? 'default' : 'dark'}>
                  {selectedAddressDetail.addressType === 'HOME' ? 'Nhà riêng' : selectedAddressDetail.addressType === 'OFFICE' ? 'Văn phòng' : 'Khác'}
                </Badge>
                {selectedAddressDetail.isDefault && (
                  <Badge variant="success">Mặc định</Badge>
                )}
              </div>
            </div>

            {/* Full Street Address Box */}
            <div className="p-3.5 bg-surface border border-line-light rounded-sm space-y-1">
              <span className="text-[0.7rem] uppercase tracking-wider font-bold text-content-muted">
                Địa chỉ chi tiết (Số nhà, tên đường):
              </span>
              <p className="font-semibold text-sm text-content-primary m-0 leading-relaxed">
                {selectedAddressDetail.fullAddress}
              </p>
            </div>

            {/* Ward & Province Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-surface-body border border-line-light rounded-sm space-y-1">
                <span className="text-[0.7rem] uppercase tracking-wider font-bold text-content-muted">
                  Phường / Xã:
                </span>
                <p className="font-semibold text-content-primary text-sm m-0">
                  {selectedAddressDetail.wardName || '—'}
                </p>
              </div>

              <div className="p-3 bg-surface-body border border-line-light rounded-sm space-y-1">
                <span className="text-[0.7rem] uppercase tracking-wider font-bold text-content-muted">
                  Tỉnh / Thành phố:
                </span>
                <p className="font-semibold text-content-primary text-sm m-0">
                  {selectedAddressDetail.provinceName || '—'}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line-light mt-1">
              <Button variant="secondary" type="button" onClick={() => setIsAddressDetailModalOpen(false)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                icon={Edit2}
                onClick={() => {
                  setIsAddressDetailModalOpen(false);
                  handleOpenEditAddress(selectedAddressDetail);
                }}
              >
                Chỉnh Sửa Địa Chỉ
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* USER CREATE / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? `Cập Nhật Tài Khoản #${editingUser.id}` : 'Tạo Tài Khoản Mới'}
        maxWidth="540px"
      >
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-3.5">
          {/* Avatar Section */}
          <div className="flex items-center gap-4 p-3.5 bg-surface border border-line-light rounded-sm">
            <div className="relative shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Ảnh đại diện"
                  className="w-16 h-16 rounded-full object-cover border-2 border-accent-gold shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-surface-dark text-content-inverse flex items-center justify-center font-bold text-xl border-2 border-line-light">
                  {(formData.fullname || formData.username || 'U')[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <label className="block text-xs font-bold uppercase tracking-wider text-content-primary mb-1.5">
                Ảnh Đại Diện (Avatar)
              </label>
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarChange}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={Camera}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {avatarPreview ? 'Đổi Ảnh Khác' : 'Tải Ảnh Lên'}
                </Button>

                {avatarPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    className="text-status-error hover:bg-status-error/10 hover:text-status-error"
                    onClick={handleRemoveAvatar}
                  >
                    Xóa Ảnh
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-content-muted mt-1.5 mb-0">
                Hỗ trợ JPG, PNG, WEBP (tối đa 5MB)
              </p>
            </div>
          </div>

          <Input
            label="Tên đăng nhập"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            disabled={!!editingUser}
            required={!editingUser}
          />

          <Input
            label={editingUser ? 'Mật khẩu mới (bỏ trống nếu giữ nguyên mật khẩu cũ)' : 'Mật khẩu'}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder={editingUser ? 'Nhập mật khẩu mới nếu muốn đổi (tối thiểu 6 ký tự)' : 'Nhập mật khẩu (tối thiểu 6 ký tự)'}
            required={!editingUser}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Họ và tên"
              value={formData.fullname}
              onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
              placeholder="Ví dụ: Nguyễn Văn A"
              required
            />

            <Select
              label="Giới tính"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              options={[
                { value: 'MALE', label: 'Nam (MALE)' },
                { value: 'FEMALE', label: 'Nữ (FEMALE)' },
                { value: 'OTHER', label: 'Khác (OTHER)' },
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="example@gmail.com"
              required
            />

            <Input
              label="Số điện thoại"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Ví dụ: 0901000001"
              required={!editingUser}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Select
              label="Vai trò (Role)"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              options={[
                { value: 'CUSTOMER', label: 'CUSTOMER (Khách hàng)' },
                { value: 'STAFF', label: 'STAFF (Nhân viên)' },
                { value: 'ADMIN', label: 'ADMIN (Quản trị viên)' },
              ]}
            />

            <Select
              label="Trạng thái (Status)"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'ACTIVE', label: 'ACTIVE (Kích hoạt)' },
                { value: 'INACTIVE', label: 'INACTIVE (Khóa tài khoản)' },
              ]}
            />
          </div>

          {formError && (
            <div role="alert" className="p-2.5 bg-status-error/10 border-l-4 border-status-error text-status-error text-xs font-semibold">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2.5 mt-3 pt-3 border-t border-line-light">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {editingUser ? 'Cập Nhật' : 'Tạo Mới'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ADMIN EDIT / CREATE USER ADDRESS MODAL */}
      <AddressFormModal
        key={`${isEditAddressModalOpen}-${editingAddress?.id ?? 'create'}-${detailUser?.id ?? 'none'}`}
        isOpen={isEditAddressModalOpen}
        address={editingAddress}
        targetUserId={detailUser?.id}
        defaultAddress={editingAddress?.isDefault ?? false}
        onClose={() => {
          setIsEditAddressModalOpen(false);
          setEditingAddress(null);
        }}
        onSaved={handleAddressSaved}
      />

      {/* LUXURY CONFIRMATION / ALERT DIALOG MODAL */}
      <Modal
        isOpen={confirmDialog.isOpen}
        onClose={() => {
          if (!confirmDialog.isLoading) {
            setConfirmDialog((p) => ({ ...p, isOpen: false }));
          }
        }}
        title={confirmDialog.title}
        maxWidth="440px"
      >
        <div className="flex flex-col gap-4 text-center items-center py-2">
          <div
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center shrink-0 border',
              confirmDialog.variant === 'danger'
                ? 'bg-status-error/10 border-status-error/30 text-status-error'
                : confirmDialog.variant === 'warning'
                ? 'bg-status-warning/10 border-status-warning/30 text-status-warning'
                : 'bg-accent-gold/10 border-accent-gold/30 text-accent-gold'
            )}
          >
            {confirmDialog.variant === 'danger' ? (
              <AlertTriangle size={28} />
            ) : (
              <ShieldCheck size={28} />
            )}
          </div>

          <div className="flex flex-col gap-1.5 px-2">
            <p className="text-sm text-content-secondary leading-relaxed m-0">
              {confirmDialog.message}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2.5 w-full pt-3 border-t border-line-light mt-1">
            {confirmDialog.cancelText && (
              <Button
                variant="secondary"
                disabled={confirmDialog.isLoading}
                onClick={() => setConfirmDialog((p) => ({ ...p, isOpen: false }))}
                className="flex-1"
              >
                {confirmDialog.cancelText}
              </Button>
            )}
            <Button
              variant={confirmDialog.variant === 'danger' ? 'danger' : 'primary'}
              loading={confirmDialog.isLoading}
              onClick={confirmDialog.onConfirm}
              className={confirmDialog.cancelText ? 'flex-1' : 'w-full'}
            >
              {confirmDialog.confirmText || 'Đồng Ý'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
