import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, RefreshCw, MapPin, Eye, Calendar, Mail, Phone, ShieldCheck, CheckCircle2 } from 'lucide-react';
import AdminNav from '../components/admin/AdminNav';
import AddressFormModal from '../components/profile/AddressFormModal';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { UserResponse, UserAddressResponse } from '../types/user';
import { Badge, Button, Input, Modal, Select } from '../components/ui';
import { extractErrorMessage } from '../utils/format';
import styles from './AdminPages.module.css';

export default function AdminUsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // User Edit / Create Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullname: '',
    email: '',
    phone: '',
    role: 'CUSTOMER',
    status: 'ACTIVE',
  });
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
    setFormData({
      username: '',
      password: '',
      fullname: '',
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
    setFormData({
      username: u.username || '',
      password: '',
      fullname: u.fullname || '',
      email: u.email || '',
      phone: u.phone || '',
      role: u.role || 'CUSTOMER',
      status: u.status || 'ACTIVE',
    });
    setIsModalOpen(true);
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
      alert(extractErrorMessage(err, 'Không thể tải chi tiết địa chỉ này.'));
    }
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

  // Delete Address
  const handleDeleteAddress = async (addressId: number) => {
    if (!isAdmin) {
      alert('Chỉ ADMIN mới có quyền xóa địa chỉ.');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) return;

    try {
      await userService.deleteAddress(addressId);
      if (detailUser) {
        const res = await userService.getUserAddressesByAdmin(detailUser.id);
        setDetailAddresses(res.data || []);
      }
    } catch (err) {
      alert(extractErrorMessage(err, 'Xóa địa chỉ thất bại.'));
    }
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

    if (!cleanEmail) {
      setFormError('Vui lòng nhập email.');
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
      } else {
        // Tạo người dùng mới
        const payload: Record<string, any> = {
          username: formData.username.trim(),
          password: cleanPassword,
          fullname: cleanFullname,
          email: cleanEmail,
          role: formData.role,
        };
        if (cleanPhone) {
          payload.phone = cleanPhone;
        }

        await userService.createUser(payload);
      }

      setIsModalOpen(false);
      await fetchUsers();
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Lưu người dùng thất bại. Vui lòng kiểm tra lại dữ liệu.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (id: number, name: string) => {
    if (!isAdmin) {
      alert('Chỉ ADMIN mới có quyền xóa người dùng.');
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${name}"?`)) return;

    try {
      await userService.deleteUser(id);
      await fetchUsers();
      if (isDetailModalOpen && detailUser?.id === id) {
        setIsDetailModalOpen(false);
      }
    } catch (err) {
      alert(extractErrorMessage(err, 'Xóa người dùng thất bại'));
    }
  };

  const filtered = users.filter(
    (u) =>
      (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.fullname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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

        {/* Search Toolbar */}
        <div className="max-w-[360px] mb-5">
          <Input
            placeholder="Tìm theo username, tên, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={Search}
          />
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto border border-line-light bg-surface-body shadow-sm">
          <table className="w-full border-collapse text-left text-[0.85rem]">
            <thead>
              <tr className="bg-surface border-b border-line-light uppercase tracking-wider text-[0.72rem] font-bold text-content-secondary">
                <th className="p-3.5 pl-4">ID</th>
                <th className="p-3.5">Người Dùng</th>
                <th className="p-3.5">Liên Hệ</th>
                <th className="p-3.5">Vai Trò</th>
                <th className="p-3.5">Trạng Thái</th>
                <th className="p-3.5 pr-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-content-muted">
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-content-muted">
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
                            title="Xóa tài khoản"
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

      {/* USER DETAIL MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={detailUser ? `Chi Tiết Người Dùng #${detailUser.id}` : 'Chi Tiết Người Dùng'}
        maxWidth="640px"
      >
        {detailUser && (
          <div className="flex flex-col gap-5">
            {/* User Profile Header */}
            <div className="flex items-center gap-4 p-4 bg-surface border border-line-light rounded-sm">
              {detailUser.avt ? (
                <img
                  src={detailUser.avt}
                  alt={detailUser.username}
                  className="w-16 h-16 rounded-full object-cover border-2 border-accent-gold"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-surface-dark text-content-inverse flex items-center justify-center font-bold text-xl">
                  {(detailUser.fullname || detailUser.username || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-lg font-bold text-content-primary m-0">
                    {detailUser.fullname || detailUser.username}
                  </h3>
                  <Badge variant={detailUser.role === 'ADMIN' ? 'dark' : detailUser.role === 'STAFF' ? 'warning' : 'default'}>
                    {detailUser.role}
                  </Badge>
                  <Badge variant={detailUser.status === 'INACTIVE' ? 'error' : 'success'}>
                    {detailUser.status || 'ACTIVE'}
                  </Badge>
                </div>
                <div className="text-xs text-content-muted">Tên đăng nhập: @{detailUser.username} (ID: #{detailUser.id})</div>
              </div>
            </div>

            {/* Contact Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 border border-line-light bg-surface-body flex items-center gap-3">
                <Mail size={18} className="text-accent-gold shrink-0" />
                <div>
                  <div className="text-[0.72rem] uppercase font-bold text-content-muted">Email</div>
                  <div className="text-sm font-semibold text-content-primary break-all">{detailUser.email || 'Chưa cập nhật'}</div>
                </div>
              </div>

              <div className="p-3 border border-line-light bg-surface-body flex items-center gap-3">
                <Phone size={18} className="text-accent-gold shrink-0" />
                <div>
                  <div className="text-[0.72rem] uppercase font-bold text-content-muted">Số điện thoại</div>
                  <div className="text-sm font-semibold text-content-primary">{detailUser.phone || 'Chưa cập nhật'}</div>
                </div>
              </div>
            </div>

            {/* Addresses Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-bold text-sm text-content-primary">
                  <MapPin size={16} className="text-accent-gold" />
                  <span>Sổ Địa Chỉ Giao Hàng ({detailAddresses.length})</span>
                </div>
              </div>

              {isDetailLoading ? (
                <p className="text-center p-4 text-xs text-content-muted">Đang tải sổ địa chỉ...</p>
              ) : detailAddresses.length === 0 ? (
                <div className="p-4 border border-dashed border-line-light text-center text-xs text-content-muted bg-surface">
                  Người dùng @{detailUser.username} chưa lưu địa chỉ nhận hàng nào.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {detailAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-3 border border-line-light bg-surface flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-bold text-content-muted">#{addr.id}</span>
                          <Badge variant={addr.addressType === 'HOME' ? 'default' : 'dark'}>
                            {addr.addressType === 'HOME' ? 'Nhà riêng' : addr.addressType === 'OFFICE' ? 'Văn phòng' : 'Khác'}
                          </Badge>
                          {addr.isDefault && <Badge variant="success">Mặc định</Badge>}
                        </div>
                        <div className="font-semibold text-content-primary text-sm mb-0.5">
                          {addr.fullAddress}
                        </div>
                        <div className="text-content-secondary">
                          {[addr.wardName, addr.provinceName].filter(Boolean).join(', ')}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenAddressDetail(detailUser.id, addr.id)}
                          className="text-[0.72rem]"
                        >
                          Chi Tiết
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Edit2}
                          onClick={() => handleOpenEditAddress(addr)}
                          className="text-[0.72rem]"
                        >
                          Sửa
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="text-[0.72rem]"
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

      {/* SINGLE ADDRESS DETAIL MODAL */}
      <Modal
        isOpen={isAddressDetailModalOpen}
        onClose={() => setIsAddressDetailModalOpen(false)}
        title={selectedAddressDetail ? `Chi Tiết Địa Chỉ #${selectedAddressDetail.id}` : 'Chi Tiết Địa Chỉ'}
        maxWidth="500px"
      >
        {selectedAddressDetail && (
          <div className="flex flex-col gap-3.5 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-line-light">
              <span className="text-content-muted font-bold">Mã địa chỉ (ID):</span>
              <span className="font-bold text-sm text-content-primary">#{selectedAddressDetail.id}</span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-line-light">
              <span className="text-content-muted font-bold">Loại địa chỉ:</span>
              <Badge variant={selectedAddressDetail.addressType === 'HOME' ? 'default' : 'dark'}>
                {selectedAddressDetail.addressType === 'HOME' ? 'Nhà riêng' : selectedAddressDetail.addressType === 'OFFICE' ? 'Văn phòng' : 'Khác'}
              </Badge>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-line-light">
              <span className="text-content-muted font-bold">Địa chỉ mặc định:</span>
              <Badge variant={selectedAddressDetail.isDefault ? 'success' : 'default'}>
                {selectedAddressDetail.isDefault ? 'Có (Mặc định)' : 'Không'}
              </Badge>
            </div>

            <div className="flex flex-col gap-1 pb-3 border-b border-line-light">
              <span className="text-content-muted font-bold">Địa chỉ chi tiết (Số nhà, tên đường):</span>
              <span className="font-semibold text-sm text-content-primary">{selectedAddressDetail.fullAddress}</span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-line-light">
              <span className="text-content-muted font-bold">Phường / Xã:</span>
              <span className="font-semibold text-content-primary">{selectedAddressDetail.wardName || '—'}</span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-line-light">
              <span className="text-content-muted font-bold">Tỉnh / Thành phố:</span>
              <span className="font-semibold text-content-primary">{selectedAddressDetail.provinceName || '—'}</span>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" type="button" onClick={() => setIsAddressDetailModalOpen(false)}>
                Đóng
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

          <Input
            label="Họ và tên"
            value={formData.fullname}
            onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
            placeholder="Ví dụ: Nguyễn Văn A"
            required
          />

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

      {/* ADMIN EDIT USER ADDRESS MODAL */}
      <AddressFormModal
        key={`${isEditAddressModalOpen}-${editingAddress?.id ?? 'none'}`}
        isOpen={isEditAddressModalOpen}
        address={editingAddress}
        defaultAddress={editingAddress?.isDefault ?? false}
        onClose={() => {
          setIsEditAddressModalOpen(false);
          setEditingAddress(null);
        }}
        onSaved={handleAddressSaved}
      />
    </div>
  );
}
