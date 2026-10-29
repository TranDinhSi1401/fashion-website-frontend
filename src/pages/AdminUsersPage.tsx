import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, Search, RefreshCw, MapPin } from 'lucide-react';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { UserResponse, UserAddressResponse } from '../types/user';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { extractErrorMessage } from '../utils/format';

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
    } catch (err: any) {
      alert(extractErrorMessage(err, 'Không thể tải sổ địa chỉ của người dùng này'));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingUser) {
        const payload: any = {
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
    } catch (err: any) {
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
    } catch (err: any) {
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
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">
        {/* Header toolbar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent-gold)', marginBottom: '4px' }}>
              <Shield size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Hệ Thống Quản Trị
              </span>
            </div>
            <h1
              style={{
                fontSize: '1.8rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Quản Lý Người Dùng
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
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
        <div style={{ maxWidth: '400px', marginBottom: '24px' }}>
          <Input
            placeholder="Tìm theo username, tên, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={Search}
          />
        </div>

        {/* Table */}
        <div
          style={{
            overflowX: 'auto',
            border: '1px solid var(--border-light)',
            backgroundColor: 'var(--bg-body)',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.85rem',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderBottom: '1px solid var(--border-light)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                }}
              >
                <th style={{ padding: '16px' }}>ID</th>
                <th style={{ padding: '16px' }}>Người Dùng</th>
                <th style={{ padding: '16px' }}>Email & SĐT</th>
                <th style={{ padding: '16px' }}>Vai Trò</th>
                <th style={{ padding: '16px' }}>Trạng Thái</th>
                <th style={{ padding: '16px', textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không tìm thấy người dùng phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid var(--border-light)',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <td style={{ padding: '16px', fontWeight: 700 }}>#{u.id}</td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {u.avt ? (
                          <img
                            src={u.avt}
                            alt={u.username}
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--bg-dark)',
                              color: 'var(--text-inverse)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                            }}
                          >
                            {(u.fullname || u.username || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.fullname || u.username}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div>{u.email}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.phone || 'Chưa cập nhật SĐT'}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <Badge variant={u.role === 'ADMIN' ? 'dark' : u.role === 'STAFF' ? 'warning' : 'default'}>
                        {u.role}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <Badge variant={u.status === 'INACTIVE' ? 'error' : 'success'}>
                        {u.status || 'ACTIVE'}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
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
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
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
          <p style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
            Người dùng này chưa có địa chỉ nào.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {selectedUserAddresses.map((addr) => (
              <div
                key={addr.id}
                style={{
                  padding: '14px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                  <Badge variant={addr.addressType === 'HOME' ? 'default' : 'dark'}>
                    {addr.addressType}
                  </Badge>
                  {addr.isDefault && <Badge variant="success">Mặc định</Badge>}
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{addr.fullAddress}</div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

