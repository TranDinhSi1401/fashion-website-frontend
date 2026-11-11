import { FormEvent, useEffect, useState } from 'react';
import { userService } from '../../services/userService';
import { shippingService, ShippingLocation } from '../../services/shippingService';
import {
  AddressType,
  UserAddressCreationRequest,
  UserAddressResponse,
  UserAddressUpdateRequest,
} from '../../types/user';
import { extractErrorMessage } from '../../utils/format';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

interface AddressFormModalProps {
  isOpen: boolean;
  address?: UserAddressResponse | null;
  defaultAddress?: boolean;
  onClose: () => void;
  onSaved: (address: UserAddressResponse) => void;
}

interface AddressFormValues {
  fullAddress: string;
  provinceName: string;
  wardName: string;
  addressType: AddressType;
  isDefault: boolean;
}

export default function AddressFormModal({
  isOpen,
  address = null,
  defaultAddress = false,
  onClose,
  onSaved,
}: AddressFormModalProps) {
  const [form, setForm] = useState<AddressFormValues>(() => ({
    fullAddress: address?.fullAddress || '',
    provinceName: address?.provinceName || '',
    wardName: address?.wardName || '',
    addressType: address?.addressType || 'HOME',
    isDefault: address?.isDefault ?? defaultAddress,
  }));
  const [provinces, setProvinces] = useState<ShippingLocation[]>([]);
  const [wards, setWards] = useState<ShippingLocation[]>([]);
  const [provinceId, setProvinceId] = useState<number | ''>('');
  const [wardId, setWardId] = useState<number | ''>('');
  const [provincesLoading, setProvincesLoading] = useState(isOpen && !address);
  const [wardsLoading, setWardsLoading] = useState(false);
  const [provinceError, setProvinceError] = useState('');
  const [wardError, setWardError] = useState('');
  const [formError, setFormError] = useState('');
  const [provinceRetry, setProvinceRetry] = useState(0);
  const [wardRetry, setWardRetry] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || address) return;

    const controller = new AbortController();
    shippingService.getProvinces(controller.signal)
      .then(setProvinces)
      .catch(error => {
        if (!controller.signal.aborted) {
          setProvinceError(extractErrorMessage(error, 'Không thể tải danh sách tỉnh/thành phố.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setProvincesLoading(false);
      });

    return () => controller.abort();
  }, [isOpen, address, provinceRetry]);

  useEffect(() => {
    if (!isOpen || address || provinceId === '') return;

    const controller = new AbortController();
    shippingService.getWards(provinceId, controller.signal)
      .then(setWards)
      .catch(error => {
        if (!controller.signal.aborted) {
          setWardError(extractErrorMessage(error, 'Không thể tải danh sách phường/xã.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setWardsLoading(false);
      });

    return () => controller.abort();
  }, [isOpen, address, provinceId, wardRetry]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    if (!form.fullAddress.trim()) {
      setFormError('Vui lòng nhập địa chỉ chi tiết.');
      return;
    }

    setSaving(true);
    try {
      let response;
      if (address) {
        const addressToSave: UserAddressUpdateRequest = {
          ...form,
          fullAddress: form.fullAddress.trim(),
          ...(form.provinceName ? { provinceName: form.provinceName } : {}),
          ...(form.wardName ? { wardName: form.wardName } : {}),
        };
        response = await userService.updateAddress(address.id, addressToSave);
      } else {
        if (provinceId === '' || wardId === '') {
          setFormError('Vui lòng chọn tỉnh/thành phố và phường/xã.');
          return;
        }

        const provinceName = provinces.find(province => province.id === provinceId)?.name;
        const wardName = wards.find(ward => ward.id === wardId)?.name;
        if (!provinceName || !wardName) {
          setFormError('Vui lòng chọn lại tỉnh/thành phố và phường/xã.');
          return;
        }

        const addressToSave: UserAddressCreationRequest = {
          ...form,
          fullAddress: form.fullAddress.trim(),
          provinceName,
          wardName,
        };
        response = await userService.createAddress(addressToSave);
      }

      onSaved(response.data);
      onClose();
    } catch (error) {
      setFormError(extractErrorMessage(error, 'Lưu địa chỉ thất bại.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={address ? 'Cập Nhật Địa Chỉ' : 'Thêm Địa Chỉ Mới'}
    >
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Input
          label="Địa chỉ chi tiết (Số nhà, tên đường)"
          value={form.fullAddress}
          onChange={event => setForm({ ...form, fullAddress: event.target.value })}
          placeholder="Ví dụ: 12 Nguyễn Văn Bảo"
          required
        />

        {!address && (
          <>
            <Select
              label="Tỉnh / Thành phố"
              value={provinceId}
              onChange={event => {
                const value = event.target.value;
                const nextProvinceId = value ? Number(value) : '';
                setProvinceId(nextProvinceId);
                setWardId('');
                setWards([]);
                setWardsLoading(nextProvinceId !== '');
                setWardError('');
              }}
              options={[
                { value: '', label: provincesLoading ? 'Đang tải tỉnh/thành phố…' : 'Chọn tỉnh/thành phố' },
                ...provinces.map(province => ({ value: province.id, label: province.name })),
              ]}
              disabled={provincesLoading || provinces.length === 0}
              required
            />
            {provinceError && (
              <div role="alert" style={{ color: 'var(--status-error)', fontSize: '0.8rem', marginTop: '-10px' }}>
                {provinceError}{' '}
                <button type="button" onClick={() => {
                  setProvinces([]);
                  setProvincesLoading(true);
                  setProvinceError('');
                  setProvinceRetry(value => value + 1);
                }} style={{ textDecoration: 'underline' }}>
                  Thử lại
                </button>
              </div>
            )}
            <Select
              label="Phường / Xã"
              value={wardId}
              onChange={event => setWardId(event.target.value ? Number(event.target.value) : '')}
              options={[
                {
                  value: '',
                  label: provinceId === ''
                    ? 'Chọn tỉnh/thành phố trước'
                    : wardsLoading ? 'Đang tải phường/xã…' : 'Chọn phường/xã',
                },
                ...wards.map(ward => ({ value: ward.id, label: ward.name })),
              ]}
              disabled={provinceId === '' || wardsLoading || wards.length === 0}
              required
            />
            {wardError && (
              <div role="alert" style={{ color: 'var(--status-error)', fontSize: '0.8rem', marginTop: '-10px' }}>
                {wardError}{' '}
                <button type="button" onClick={() => {
                  setWardId('');
                  setWards([]);
                  setWardsLoading(true);
                  setWardError('');
                  setWardRetry(value => value + 1);
                }} style={{ textDecoration: 'underline' }}>
                  Thử lại
                </button>
              </div>
            )}
          </>
        )}

        <Select
          label="Loại địa chỉ"
          value={form.addressType}
          onChange={event => setForm({ ...form, addressType: event.target.value as AddressType })}
          options={[
            { value: 'HOME', label: 'Nhà riêng' },
            { value: 'OFFICE', label: 'Văn phòng / Công ty' },
            { value: 'OTHER', label: 'Khác' },
          ]}
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={event => setForm({ ...form, isDefault: event.target.checked })}
          />
          <span>Đặt làm địa chỉ nhận hàng mặc định</span>
        </label>

        {formError && <p role="alert" style={{ color: 'var(--status-error)', fontSize: '0.85rem' }}>{formError}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <Button variant="secondary" disabled={saving} onClick={onClose}>Hủy</Button>
          <Button type="submit" variant="primary" loading={saving}>Lưu Địa Chỉ</Button>
        </div>
      </form>
    </Modal>
  );
}
