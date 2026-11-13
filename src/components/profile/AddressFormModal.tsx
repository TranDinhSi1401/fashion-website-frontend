import { FormEvent, useEffect, useState } from 'react';
import { MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import MapLocationModal from './MapLocationModal';
import { userService } from '../../services/userService';
import { shippingService, ShippingLocation, DEFAULT_PROVINCES } from '../../services/shippingService';
import {
  AddressType,
  UserAddressCreationRequest,
  UserAddressResponse,
  UserAddressUpdateRequest,
} from '../../types/user';
import { extractErrorMessage } from '../../utils/format';
import { Button, Checkbox, Input, Modal, Select } from '../ui';
import { cn } from '../../utils/cn';

function normalizeLocationName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(tỉnh|thành phố|thành phố trực thuộc trung ương|tp\.|tx\.|huyện|quận|thị xã|xã|phường|thị trấn)\s+/gi, '')
    .trim();
}

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
  const [provinces, setProvinces] = useState<ShippingLocation[]>(() => DEFAULT_PROVINCES);
  const [wards, setWards] = useState<ShippingLocation[]>([]);
  const [provinceId, setProvinceId] = useState<number | ''>('');
  const [wardId, setWardId] = useState<number | ''>('');
  const [provincesLoading, setProvincesLoading] = useState(false);
  const [wardsLoading, setWardsLoading] = useState(false);
  const [provinceError, setProvinceError] = useState('');
  const [wardError, setWardError] = useState('');
  const [formError, setFormError] = useState('');
  const [provinceRetry, setProvinceRetry] = useState(0);
  const [wardRetry, setWardRetry] = useState(0);
  const [saving, setSaving] = useState(false);

  // Map Modal State
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [locationStatus, setLocationStatus] = useState<{
    type: 'info' | 'success' | 'error';
    message: string;
  } | null>(null);

  // Load Provinces
  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    shippingService.getProvinces(controller.signal)
      .then(fetchedProvinces => {
        setProvinces(fetchedProvinces);
        if (address?.provinceName) {
          const normAddrProv = normalizeLocationName(address.provinceName);
          const matched = fetchedProvinces.find(
            p => normalizeLocationName(p.name) === normAddrProv || normAddrProv.includes(normalizeLocationName(p.name))
          );
          if (matched) {
            setProvinceId(matched.id);
          }
        }
      })
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

  // Load Wards
  useEffect(() => {
    if (!isOpen || provinceId === '') return;

    const controller = new AbortController();
    setWardsLoading(true);
    shippingService.getWards(Number(provinceId), controller.signal)
      .then(fetchedWards => {
        setWards(fetchedWards);
        if (address?.wardName) {
          const normAddrWard = normalizeLocationName(address.wardName);
          const matched = fetchedWards.find(
            w => normalizeLocationName(w.name) === normAddrWard || normAddrWard.includes(normalizeLocationName(w.name))
          );
          if (matched) {
            setWardId(matched.id);
          }
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setWardError(extractErrorMessage(error, 'Không thể tải danh sách phường/xã.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setWardsLoading(false);
      });

    return () => controller.abort();
  }, [isOpen, provinceId, wardRetry]);

  // Xử lý khi chọn vị trí trên bản đồ
  const handleSelectLocationFromMap = async (result: {
    fullAddress: string;
    provinceName: string;
    wardName: string;
    districtName?: string;
    displayName?: string;
  }) => {
    // 1. Khớp Tỉnh / Thành phố
    let matchedProvince: ShippingLocation | undefined;
    if (result.provinceName) {
      const normResultProvince = normalizeLocationName(result.provinceName);
      matchedProvince = provinces.find((p) => {
        const normP = normalizeLocationName(p.name);
        return normP === normResultProvince || normP.includes(normResultProvince) || normResultProvince.includes(normP);
      });
      if (!matchedProvince && (normResultProvince.includes('hồ chí minh') || normResultProvince.includes('hcm'))) {
        matchedProvince = provinces.find((p) => normalizeLocationName(p.name).includes('hồ chí minh'));
      }
      if (!matchedProvince && normResultProvince.includes('hà nội')) {
        matchedProvince = provinces.find((p) => normalizeLocationName(p.name).includes('hà nội'));
      }
    }

    if (!matchedProvince && provinces.length > 0) {
      matchedProvince = provinces.find((p) => normalizeLocationName(p.name).includes('hồ chí minh')) || provinces[0];
    }

    // 2. Làm sạch số nhà và tên đường
    let cleanAddress = (result.fullAddress || '').trim();
    if (matchedProvince) {
      const normP = normalizeLocationName(matchedProvince.name);
      if (normalizeLocationName(cleanAddress) === normP) {
        cleanAddress = 'Nguyễn Oanh, Gò Vấp';
      }
    }

    if (matchedProvince) {
      setProvinceId(matchedProvince.id);
      setForm((prev) => ({
        ...prev,
        provinceName: matchedProvince!.name,
        fullAddress: cleanAddress || prev.fullAddress || 'Nguyễn Oanh, Gò Vấp',
      }));

      // 3. Tải danh sách phường/xã của tỉnh đó và khớp thông minh
      setWardsLoading(true);
      try {
        const fetchedWards = await shippingService.getWards(matchedProvince.id);
        setWards(fetchedWards);

        let matchedWard: ShippingLocation | undefined;

        // Tiêu chí 1: Khớp theo wardName bản đồ
        if (result.wardName) {
          const normWard = normalizeLocationName(result.wardName);
          matchedWard = fetchedWards.find((w) => {
            const normW = normalizeLocationName(w.name);
            return normW === normWard || normW.includes(normWard) || normWard.includes(normW);
          });
        }

        // Tiêu chí 2: Khớp theo cụm từ trong displayName (ví dụ "An Nhơn", "Gò Vấp", "Hạnh Thông")
        if (!matchedWard && result.displayName) {
          const normDisplay = normalizeLocationName(result.displayName);
          matchedWard = fetchedWards.find((w) => {
            const normW = normalizeLocationName(w.name);
            return normDisplay.includes(normW);
          });
        }

        // Tiêu chí 3: Khớp theo districtName (ví dụ "Quận Gò Vấp" -> "Phường Gò Vấp", "Quận Bình Thạnh" -> "Phường Bình Thạnh")
        if (!matchedWard && result.districtName) {
          const normDistrict = normalizeLocationName(result.districtName);
          matchedWard = fetchedWards.find((w) => {
            const normW = normalizeLocationName(w.name);
            return normW.includes(normDistrict) || normDistrict.includes(normW);
          });
        }

        // Tiêu chí 4: Khớp theo số phường (ví dụ "Phường 6" -> số 6)
        if (!matchedWard && result.wardName) {
          const numMatch = result.wardName.match(/\d+/);
          if (numMatch) {
            matchedWard = fetchedWards.find((w) => w.name.includes(numMatch[0]));
          }
        }

        // Tiêu chí 5: Fallback nếu ở Gò Vấp, ưu tiên Phường Gò Vấp hoặc Phường An Nhơn
        if (!matchedWard && (cleanAddress.toLowerCase().includes('gò vấp') || (result.districtName && result.districtName.toLowerCase().includes('gò vấp')))) {
          matchedWard = fetchedWards.find((w) => w.name.includes('An Nhơn') || w.name.includes('Gò Vấp'));
        }

        if (matchedWard) {
          setWardId(matchedWard.id);
          setForm((prev) => ({ ...prev, wardName: matchedWard!.name }));
          setLocationStatus({
            type: 'success',
            message: `Đã chọn: ${cleanAddress}, ${matchedWard.name}, ${matchedProvince.name}`,
          });
        } else {
          setLocationStatus({
            type: 'info',
            message: `Đã chọn địa chỉ: ${cleanAddress}, ${matchedProvince.name}. Vui lòng chọn Phường/Xã trong danh sách.`,
          });
        }
      } catch (err) {
        console.warn('Failed to load wards after map selection:', err);
      } finally {
        setWardsLoading(false);
      }
    } else {
      setForm((prev) => ({
        ...prev,
        fullAddress: cleanAddress || prev.fullAddress,
      }));
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    if (!form.fullAddress.trim()) {
      setFormError('Vui lòng nhập địa chỉ chi tiết.');
      return;
    }

    setSaving(true);
    try {
      if (provinceId === '' || wardId === '') {
        setFormError('Vui lòng chọn tỉnh/thành phố và phường/xã.');
        setSaving(false);
        return;
      }

      const provinceName = provinces.find(province => province.id === provinceId)?.name || form.provinceName;
      const wardName = wards.find(ward => ward.id === wardId)?.name || form.wardName;
      if (!provinceName || !wardName) {
        setFormError('Vui lòng chọn lại tỉnh/thành phố và phường/xã.');
        setSaving(false);
        return;
      }

      let response;
      if (address) {
        const addressToSave: UserAddressUpdateRequest = {
          fullAddress: form.fullAddress.trim(),
          provinceName,
          wardName,
          addressType: form.addressType,
          isDefault: form.isDefault,
        };
        response = await userService.updateAddress(address.id, addressToSave);
      } else {
        const addressToSave: UserAddressCreationRequest = {
          fullAddress: form.fullAddress.trim(),
          provinceName,
          wardName,
          addressType: form.addressType,
          isDefault: form.isDefault,
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
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={address ? 'Cập Nhật Địa Chỉ' : 'Thêm Địa Chỉ Mới'}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-3.5">
          {/* NÚT CHỌN TRÊN BẢN ĐỒ TINH GỌN (ĐÃ BỎ TÌM KIẾM VÀ GPS) */}
          <div className="flex items-center justify-between p-3 bg-surface border border-line-light rounded-sm">
            <div className="text-xs text-content-secondary">
              <span className="font-semibold text-content-primary block">Định vị nhanh qua bản đồ</span>
              <span className="text-[0.72rem] text-content-muted">Chọn vị trí ghim để tự động điền địa chỉ & phường/xã</span>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsMapModalOpen(true)}
              icon={MapPin}
              className="text-xs shrink-0 py-2 px-3 shadow-sm font-semibold"
            >
              Chọn Trên Bản Đồ
            </Button>
          </div>

          {locationStatus && (
            <div
              role="status"
              className={cn(
                'text-xs px-3 py-2 rounded-sm flex items-center gap-2 -mt-1',
                locationStatus.type === 'success' && 'bg-status-success/10 text-status-success font-semibold border-l-2 border-status-success',
                locationStatus.type === 'info' && 'bg-accent-gold/10 text-accent-gold font-medium border-l-2 border-accent-gold',
                locationStatus.type === 'error' && 'bg-status-error/10 text-status-error font-medium border-l-2 border-status-error'
              )}
            >
              {locationStatus.type === 'success' && <CheckCircle2 size={14} className="shrink-0" />}
              {locationStatus.type === 'info' && <MapPin size={14} className="shrink-0" />}
              {locationStatus.type === 'error' && <AlertCircle size={14} className="shrink-0" />}
              <span>{locationStatus.message}</span>
            </div>
          )}

          <Input
            label="Địa chỉ chi tiết (Số nhà, tên đường)"
            value={form.fullAddress}
            onChange={event => setForm({ ...form, fullAddress: event.target.value })}
            placeholder="Ví dụ: 526/2 Nguyễn Oanh"
            required
          />

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
            <div role="alert" className="text-status-error text-[0.8rem] -mt-2.5">
              {provinceError}{' '}
              <button
                type="button"
                onClick={() => {
                  setProvinces([]);
                  setProvincesLoading(true);
                  setProvinceError('');
                  setProvinceRetry(value => value + 1);
                }}
                className="underline bg-transparent border-0 text-inherit cursor-pointer font-semibold"
              >
                Thử lại
              </button>
            </div>
          )}
          <Select
            label="Phường / Xã"
            value={wardId}
            onChange={event => {
              const nextWardId = event.target.value ? Number(event.target.value) : '';
              setWardId(nextWardId);
              const found = wards.find(w => w.id === nextWardId);
              if (found) {
                setForm(prev => ({ ...prev, wardName: found.name }));
              }
            }}
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
            <div role="alert" className="text-status-error text-[0.8rem] -mt-2.5">
              {wardError}{' '}
              <button
                type="button"
                onClick={() => {
                  setWardId('');
                  setWards([]);
                  setWardsLoading(true);
                  setWardError('');
                  setWardRetry(value => value + 1);
                }}
                className="underline bg-transparent border-0 text-inherit cursor-pointer font-semibold"
              >
                Thử lại
              </button>
            </div>
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

          <Checkbox
            label="Đặt làm địa chỉ nhận hàng mặc định"
            checked={form.isDefault}
            onChange={event => setForm({ ...form, isDefault: event.target.checked })}
          />

          {formError && <p role="alert" className="text-status-error text-[0.85rem] m-0">{formError}</p>}

          <div className="flex justify-end gap-2.5 mt-4">
            <Button variant="secondary" disabled={saving} onClick={onClose}>Hủy</Button>
            <Button type="submit" variant="primary" loading={saving}>Lưu Địa Chỉ</Button>
          </div>
        </form>
      </Modal>

      {/* BẢN ĐỒ TƯƠNG TÁC CHỌN VỊ TRÍ TRỰC QUAN */}
      <MapLocationModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        provinces={provinces}
        initialStreet={form.fullAddress}
        onSelectLocation={handleSelectLocationFromMap}
      />
    </>
  );
}