import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, Search, RefreshCw, MapPin } from 'lucide-react';
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

  // User Edit / Create Modal
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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Address View Modal
  const [isAddressModalOpen, setIsAddressModalOpen] = useState<boolean>(false);
  const [selectedUserAddresses, setSelectedUserAddresses] = useState<UserAddressResponse[]>([]);
  const [selectedUsername, setSelectedUsername] = useState<string>('');

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

  const handleOpenCreateModal = () => {
    setEditingUser(null);
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

  const handleOpenEditModal = (u: UserResponse) => {
    setEditingUser(u);
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

  const handleViewAddresses = async (u: UserResponse) => {
    setSelectedUsername(u.fullname || u.username);
    try {
      const res = await userService.getUserAddressesByAdmin(u.id);
      setSelectedUserAddresses(res.data || []);
      setIsAddressModalOpen(true);
    } catch (err) {
      alert(extractErrorMessage(err, 'Không thể tải sổ địa chỉ của người dùng này'));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingUser) {
        const payload: Parameters<typeof userService.updateUser>[1] = {
          fullname: formData.fullname.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          role: formData.role,
          status: formData.status,
        };
        if (formData.password) {
          payload.password = formData.password;
        }
        await userService.updateUser(editingUser.id, payload);
      } else {
        await userService.createUser({
          username: formData.username.trim(),
          password: formData.password,
          fullname: formData.fullname.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          role: formData.role,
        });
      }
      setIsModalOpen(false);
      await fetchUsers();
    } catch (err) {
      alert(extractErrorMessage(err, 'Lưu người dùng thất bại'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: number, name: string) => {
    if (!isAdmin) {
      alert('Chỉ ADMIN mới có quyền xóa người dùng.');
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${name}"?`)) return;

    try {
      await userService.deleteUser(id);
      await fetchUsers();
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
    <div className="pt-10 pb-20">
      <div className="container">
        {/* Header toolbar */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-accent-gold mb-1">
              <Shield size={16} />
              <span className="text-[0.75rem] font-bold uppercase tracking-[0.08em]">
                Hệ Thống Quản Trị
              </span>
            </div>
            <h1 className="text-[1.8rem] font-extrabold uppercase tracking-[0.04em] text-content-primary m-0">
              Quản Lý Người Dùng
            </h1>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={fetchUsers} icon={RefreshCw}>
              Làm Mới
            </Button>
            {isAdmin && (
              <Button variant="primary" onClick={handleOpenCreateModal} icon={Plus}>
                Tạo Tài Khoản
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="max-w-[400px] mb-6">
          <Input
            placeholder="Tìm theo username, tên, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={Search}
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-line-light bg-surface-body">
          <table className="w-full border-collapse text-left text-[0.85rem]">
            <thead>
              <tr className="bg-surface border-b border-line-light uppercase tracking-[0.05em] text-[0.75rem] font-bold text-content-secondary">
                <th className="p-4">ID</th>
                <th className="p-4">Người Dùng</th>
                <th className="p-4">Email &amp; SĐT</th>
                <th className="p-4">Vai Trò</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4 text-right">Thao Tác</th>
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
                    <td className="p-4 font-bold">#{u.id}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        {u.avt ? (
                          <img
                            src={u.avt}
                            alt={u.username}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-surface-dark text-content-inverse flex items-center justify-center font-bold text-[0.8rem]">
                            {(u.fullname || u.username || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-content-primary">{u.fullname || u.username}</div>
                          <div className="text-[0.72rem] text-content-muted">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>{u.email}</div>
                      <div className="text-[0.75rem] text-content-muted">{u.phone || 'Chưa cập nhật SĐT'}</div>
                    </td>
                    <td className="p-4">
                      <Badge variant={u.role === 'ADMIN' ? 'dark' : u.role === 'STAFF' ? 'warning' : 'default'}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={u.status === 'INACTIVE' ? 'error' : 'success'}>
                        {u.status || 'ACTIVE'}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={MapPin}
                          onClick={() => handleViewAddresses(u)}
                        >
                          Địa Chỉ
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Edit2}
                              onClick={() => handleOpenEditModal(u)}
                            >
                              Sửa
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              icon={Trash2}
                              onClick={() => handleDeleteUser(u.id, u.username)}
                            >
                              Xóa
                            </Button>
                          </>
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

      {/* User Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? `Cập Nhật Tài Khoản #${editingUser.id}` : 'Tạo Tài Khoản Mới'}
        maxWidth="550px"
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
            label={editingUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder={editingUser ? '••••••••' : 'Nhập mật khẩu'}
            required={!editingUser}
          />

          <Input
            label="Họ và tên"
            value={formData.fullname}
            onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />

            <Input
              label="Số điện thoại"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Vai trò (Role)"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              options={[
                { value: 'CUSTOMER', label: 'CUSTOMER' },
                { value: 'STAFF', label: 'STAFF' },
                { value: 'ADMIN', label: 'ADMIN' },
              ]}
            />

            <Select
              label="Trạng thái (Status)"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'ACTIVE', label: 'ACTIVE (Kích hoạt)' },
                { value: 'INACTIVE', label: 'INACTIVE (Khóa)' },
              ]}
            />
          </div>

          <div className="flex justify-end gap-2.5 mt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {editingUser ? 'Cập Nhật' : 'Tạo Mới'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Address Viewer Modal */}
      <Modal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        title={`Sổ Địa Chỉ Của: ${selectedUsername}`}
      >
        {selectedUserAddresses.length === 0 ? (
          <p className="text-center p-6 text-content-muted m-0">
            Người dùng này chưa có địa chỉ nào.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {selectedUserAddresses.map((addr) => (
              <div
                key={addr.id}
                className="p-3.5 border border-line-light bg-surface"
              >
                <div className="flex gap-2 mb-1">
                  <Badge variant={addr.addressType === 'HOME' ? 'default' : 'dark'}>
                    {addr.addressType}
                  </Badge>
                  {addr.isDefault && <Badge variant="success">Mặc định</Badge>}
                </div>
                <div className="text-[0.88rem] font-semibold text-content-primary">
                  {[addr.fullAddress, addr.wardName, addr.provinceName].filter(Boolean).join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
