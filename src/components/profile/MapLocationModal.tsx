import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, LocateFixed, Check, X, Loader2, Edit3, Compass, RotateCcw } from 'lucide-react';
import { ShippingLocation } from '../../services/shippingService';
import { Button, Modal } from '../ui';

interface MapLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  provinces: ShippingLocation[];
  initialStreet?: string;
  onSelectLocation: (result: {
    fullAddress: string;
    provinceName: string;
    wardName: string;
    districtName?: string;
    displayName?: string;
  }) => void;
}

interface AddressDetail {
  houseNumber: string;
  road: string;
  suburb: string; // Phường / Xã
  district: string; // Quận / Huyện
  city: string; // Tỉnh / Thành phố
  displayName: string;
}

const VIETNAM_PROVINCE_ANCHORS: { name: string; lat: number; lng: number }[] = [
  { name: 'Hồ Chí Minh', lat: 10.7769, lng: 106.7009 },
  { name: 'Hà Nội', lat: 21.0285, lng: 105.8542 },
  { name: 'Đà Nẵng', lat: 16.0544, lng: 108.2022 },
  { name: 'Cần Thơ', lat: 10.0452, lng: 105.7469 },
  { name: 'Hải Phòng', lat: 20.8449, lng: 106.6881 },
  { name: 'Bình Dương', lat: 10.9805, lng: 106.6519 },
  { name: 'Đồng Nai', lat: 10.9431, lng: 106.8174 },
  { name: 'Bà Rịa - Vũng Tàu', lat: 10.4114, lng: 107.1362 },
  { name: 'Bình Định', lat: 13.9833, lng: 109.0000 },
  { name: 'Gia Lai', lat: 13.9833, lng: 108.0000 },
];

function normalizeLocation(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(tỉnh|thành phố|thành phố trực thuộc trung ương|tp\.|tx\.|huyện|quận|thị xã|xã|phường|thị trấn)\s+/gi, '')
    .trim();
}

function findNearestProvince(lat: number, lng: number, provincesList: ShippingLocation[]): string {
  let minDistance = Infinity;
  let bestName = 'Hồ Chí Minh';

  for (const anchor of VIETNAM_PROVINCE_ANCHORS) {
    const d = Math.hypot(lat - anchor.lat, lng - anchor.lng);
    if (d < minDistance) {
      minDistance = d;
      bestName = anchor.name;
    }
  }

  const normBest = normalizeLocation(bestName);
  const matched = provincesList.find((p) => {
    const normP = normalizeLocation(p.name);
    return normP.includes(normBest) || normBest.includes(normP);
  });

  return matched ? matched.name : bestName;
}

export default function MapLocationModal({
  isOpen,
  onClose,
  provinces,
  initialStreet = '',
  onSelectLocation,
}: MapLocationModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const moveTimerRef = useRef<any>(null);

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: 10.8231, // Mặc định: Gò Vấp, TP. Hồ Chí Minh
    lng: 106.6872,
  });

  const [detectedAddress, setDetectedAddress] = useState<AddressDetail>({
    houseNumber: '',
    road: 'Đường Nguyễn Oanh',
    suburb: 'Phường 6',
    district: 'Gò Vấp',
    city: 'Hồ Chí Minh',
    displayName: 'Nguyễn Oanh, Gò Vấp, Hồ Chí Minh',
  });

  const [customStreet, setCustomStreet] = useState<string>(initialStreet || 'Nguyễn Oanh, Gò Vấp');
  const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (initialStreet && initialStreet.trim().length > 0) {
        setCustomStreet(initialStreet.trim());
      }
    }
  }, [isOpen, initialStreet]);

  // Reverse Geocoding qua Photon Komoot + BigDataCloud (Không bị chặn ở VN)
  const fetchAddressByCoords = async (lat: number, lng: number, forceUpdate = false) => {
    setIsLoadingAddress(true);

    try {
      // 1. Thử Photon Komoot Reverse (Cực nhanh, mở, hỗ trợ Việt Nam)
      const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
      const photonRes = await fetch(photonUrl).catch(() => null);

      if (photonRes && photonRes.ok) {
        const photonData = await photonRes.json();
        const p = photonData.features?.[0]?.properties;

        if (p) {
          const road = p.name || p.street || '';
          const district = p.district || 'Gò Vấp';
          const suburb = p.locality || 'Phường 6';
          const rawCity = p.city || 'Hồ Chí Minh';
          const city = findNearestProvince(lat, lng, provinces) || rawCity;

          const streetFound = road || 'Đường Nguyễn Oanh';

          setDetectedAddress({
            houseNumber: '',
            road: streetFound,
            suburb,
            district,
            city,
            displayName: `${streetFound}, ${district}, ${city}`,
          });

          if (forceUpdate) {
            setCustomStreet(streetFound);
          } else {
            setCustomStreet((prev) => {
              if (!prev || prev === 'Nguyễn Oanh, Gò Vấp' || prev.toLowerCase().includes('hồ chí minh')) {
                return streetFound;
              }
              const numMatch = prev.match(/^(\d+[\w\/\-]*)\s*(.*)$/);
              if (numMatch && numMatch[1] && road) {
                return `${numMatch[1]} ${road}`;
              }
              return streetFound;
            });
          }

          setIsLoadingAddress(false);
          return;
        }
      }

      // 2. Thử BigDataCloud Reverse Geocoding
      const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`;
      const bdcRes = await fetch(bdcUrl).catch(() => null);

      if (bdcRes && bdcRes.ok) {
        const bdcData = await bdcRes.json();
        const city = findNearestProvince(lat, lng, provinces);
        const district = bdcData.locality || 'Gò Vấp';
        const road = bdcData.localityInfo?.administrative?.[3]?.name || district;

        setDetectedAddress({
          houseNumber: '',
          road,
          suburb: 'Phường 6',
          district,
          city,
          displayName: `${road}, ${district}, ${city}`,
        });

        if (forceUpdate) {
          setCustomStreet(road);
        } else {
          setCustomStreet((prev) => {
            if (!prev || prev === 'Nguyễn Oanh, Gò Vấp' || prev.toLowerCase().includes('hồ chí minh')) {
              return road;
            }
            return prev;
          });
        }

        setIsLoadingAddress(false);
        return;
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err);
    } finally {
      // 3. Fallback Offline
      setDetectedAddress((prev) => ({
        ...prev,
        city: prev.city || findNearestProvince(lat, lng, provinces),
        displayName: prev.displayName || `Vị trí (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      }));
      setIsLoadingAddress(false);
    }
  };

  // Khởi tạo bản đồ Leaflet
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [currentCoords.lat, currentCoords.lng],
        zoom: 16,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Google Maps Roadmap Tiles
      const googleTileLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
        attribution: '&copy; Google Maps',
      });

      googleTileLayer.addTo(map);

      // Click vào bản đồ để chuyển tâm
      map.on('click', (e: L.LeafletMouseEvent) => {
        map.flyTo(e.latlng, map.getZoom() < 16 ? 16 : map.getZoom(), { duration: 0.35 });
      });

      // Kéo bản đồ: Debounce 300ms
      map.on('moveend', () => {
        const center = map.getCenter();
        setCurrentCoords({ lat: center.lat, lng: center.lng });

        if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
        moveTimerRef.current = setTimeout(() => {
          fetchAddressByCoords(center.lat, center.lng);
        }, 300);
      });

      mapInstanceRef.current = map;

      map.invalidateSize();
      setTimeout(() => map.invalidateSize(), 150);
      setTimeout(() => map.invalidateSize(), 400);

      fetchAddressByCoords(currentCoords.lat, currentCoords.lng);
    }, 80);

    return () => {
      clearTimeout(timer);
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Tìm kiếm thông minh trên bản đồ qua Photon Komoot
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      let searchKeyword = query;
      let housePrefix = '';
      const alleyMatch = query.match(/^(\d+[\w\/\-]*)\s*(.*)$/);

      if (alleyMatch) {
        housePrefix = alleyMatch[1];
        const restStreet = alleyMatch[2];
        if (restStreet && restStreet.length >= 2) {
          searchKeyword = `${restStreet} Gò Vấp`;
          setCustomStreet(query);
        } else {
          searchKeyword = 'Lê Đức Thọ Gò Vấp';
          setCustomStreet(`${housePrefix} Lê Đức Thọ, Gò Vấp`);
        }
      } else {
        setCustomStreet(query);
        if (!query.toLowerCase().includes('hồ chí minh') && !query.toLowerCase().includes('gò vấp')) {
          searchKeyword = `${query} Gò Vấp`;
        }
      }

      // Gọi Photon Komoot Search (Không bị chặn mạng)
      const photonSearchUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(searchKeyword)}&limit=6`;
      const res = await fetch(photonSearchUrl);
      const data = res.ok ? await res.json() : { features: [] };
      const features = data.features || [];

      if (features.length > 0) {
        const parsedResults = features.map((f: any) => {
          const p = f.properties || {};
          const [lon, lat] = f.geometry.coordinates;
          const road = p.name || p.street || query;
          const disp = [road, p.district, p.city || 'Hồ Chí Minh'].filter(Boolean).join(', ');
          return {
            lat,
            lon,
            road,
            display_name: disp,
          };
        });

        setSearchResults(parsedResults);

        // Tự động bay ngay đến kết quả đầu tiên
        const first = parsedResults[0];
        if (first && mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([first.lat, first.lon], 17);
          const fullStreetName = housePrefix ? `${housePrefix} ${first.road}` : first.road;
          setCustomStreet(fullStreetName);
          fetchAddressByCoords(first.lat, first.lon, true);
        }
      } else {
        // Fallback: Nếu không ra, tìm từ khóa gốc
        const fallbackRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
        const fallbackData = fallbackRes.ok ? await fallbackRes.json() : { features: [] };
        if (fallbackData.features?.length > 0) {
          const first = fallbackData.features[0];
          const [lon, lat] = first.geometry.coordinates;
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([lat, lon], 17);
            fetchAddressByCoords(lat, lon, true);
          }
        }
      }
    } catch (err) {
      console.warn('Search on map failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Nút bay nhanh đến khu vực phổ biến
  const handleQuickJump = (lat: number, lng: number, zoom = 16, streetHint = '') => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom);
      if (streetHint) setCustomStreet(streetHint);
      fetchAddressByCoords(lat, lng, true);
    }
  };

  // Chọn từ danh sách gợi ý tìm kiếm
  const handleSelectSearchItem = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lon) && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lon], 17);
      if (item.road) {
        setCustomStreet((prev) => {
          const match = prev.match(/^(\d+[\w\/\-]*)/);
          return match ? `${match[1]} ${item.road}` : item.road;
        });
      }
      setSearchResults([]);
      setSearchQuery('');
      fetchAddressByCoords(lat, lon, false);
    }
  };

  // Định vị vị trí GPS người dùng và ép buộc cập nhật địa chỉ
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ định vị GPS.');
      return;
    }

    setIsLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGPS(false);
        const { latitude, longitude } = pos.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 17);
        }
        // Cập nhật ngay tên đường & số nhà theo GPS
        fetchAddressByCoords(latitude, longitude, true);
      },
      (err) => {
        setIsLocatingGPS(false);
        let msg = 'Không thể lấy vị trí hiện tại.';
        if (err.code === 1) msg = 'Bạn đã từ chối quyền truy cập vị trí trên trình duyệt.';
        alert(msg);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Làm mới tên đường từ vị trí ghim hiện tại
  const handleRefreshFromPin = () => {
    const roadComponents = [detectedAddress.houseNumber, detectedAddress.road].filter(Boolean);
    const addr = roadComponents.join(' ') || detectedAddress.road || detectedAddress.displayName.split(',')[0];
    if (addr) {
      setCustomStreet(addr);
    }
  };

  // Xác nhận vị trí và gửi về form
  const handleConfirmLocation = () => {
    // 1. Phân giải Tỉnh / Thành phố
    let matchedProvinceName = '';
    const cityName = detectedAddress.city || findNearestProvince(currentCoords.lat, currentCoords.lng, provinces);

    if (cityName) {
      const normCity = normalizeLocation(cityName);
      const matched = provinces.find((p) => {
        const normP = normalizeLocation(p.name);
        return normCity.includes(normP) || normP.includes(normCity);
      });
      matchedProvinceName = matched ? matched.name : cityName;
    } else {
      matchedProvinceName = 'Hồ Chí Minh';
    }

    // 2. Phân giải Phường / Xã
    const wardName = detectedAddress.suburb || 'Phường 6';

    // 3. Phân giải Số nhà & tên đường
    let fullAddress = customStreet.trim();
    if (!fullAddress || normalizeLocation(fullAddress) === normalizeLocation(matchedProvinceName)) {
      const roadComponents = [detectedAddress.houseNumber, detectedAddress.road].filter(Boolean);
      fullAddress = roadComponents.join(' ') || detectedAddress.road || 'Nguyễn Oanh, Gò Vấp';
    }

    onSelectLocation({
      fullAddress,
      provinceName: matchedProvinceName,
      wardName,
      districtName: detectedAddress.district,
      displayName: detectedAddress.displayName,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chọn Vị Trí Trên Bản Đồ"
      maxWidth="780px"
    >
      <div className="flex flex-col gap-2.5 max-h-[82vh]">
        {/* Thanh tìm kiếm & Định vị GPS */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex-1 relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Gõ tên đường, khu vực... (Ví dụ: 730/46 Lê Đức Thọ, Quang Trung)"
              className="w-full text-xs pl-8 pr-16 py-2 bg-surface border border-line rounded-sm focus:outline-none focus:border-accent-gold transition-colors text-content-primary"
            />
            <Search size={14} className="absolute left-2.5 text-content-muted pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-14 text-content-muted hover:text-content-primary p-1"
              >
                <X size={12} />
              </button>
            )}
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-1 text-[0.7rem] font-bold uppercase tracking-wider text-accent-gold hover:text-accent-gold/80 px-2 py-1"
            >
              {isSearching ? 'Đang tìm…' : 'Tìm Kiếm'}
            </button>
          </form>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleLocateMe}
            loading={isLocatingGPS}
            icon={LocateFixed}
            className="text-xs shrink-0 py-2 font-semibold"
            title="Định vị đến vị trí hiện tại của thiết bị"
          >
            Vị Trí Của Tôi
          </Button>
        </div>

        {/* Nút chọn nhanh khu vực */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[0.72rem] text-content-secondary pb-0.5 scrollbar-none">
          <span className="shrink-0 text-content-muted font-medium">Khu vực nhanh:</span>
          <button
            type="button"
            onClick={() => handleQuickJump(10.8402, 106.6784, 16, 'Lê Đức Thọ, Gò Vấp')}
            className="px-2 py-0.5 rounded bg-surface border border-line hover:border-accent-gold hover:text-accent-gold shrink-0 transition-colors"
          >
            📍 Lê Đức Thọ (Gò Vấp)
          </button>
          <button
            type="button"
            onClick={() => handleQuickJump(10.8231, 106.6872, 16, 'Nguyễn Oanh, Gò Vấp')}
            className="px-2 py-0.5 rounded bg-surface border border-line hover:border-accent-gold hover:text-accent-gold shrink-0 transition-colors"
          >
            📍 Nguyễn Oanh (Gò Vấp)
          </button>
          <button
            type="button"
            onClick={() => handleQuickJump(10.7769, 106.7009, 16, 'Nguyễn Huệ, Quận 1')}
            className="px-2 py-0.5 rounded bg-surface border border-line hover:border-accent-gold hover:text-accent-gold shrink-0 transition-colors"
          >
            📍 Quận 1
          </button>
          <button
            type="button"
            onClick={() => handleQuickJump(21.0285, 105.8542, 16, 'Tràng Tiền, Hoàn Kiếm, Hà Nội')}
            className="px-2 py-0.5 rounded bg-surface border border-line hover:border-accent-gold hover:text-accent-gold shrink-0 transition-colors"
          >
            📍 Hà Nội
          </button>
        </div>

        {/* Danh sách kết quả tìm kiếm thả xuống */}
        {searchResults.length > 0 && (
          <div className="max-h-36 overflow-y-auto border border-line-light bg-surface-elevated rounded-sm shadow-dropdown text-xs divide-y divide-line-light">
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSearchItem(item)}
                className="w-full text-left p-2 hover:bg-surface flex items-start gap-2 transition-colors"
              >
                <MapPin size={13} className="text-accent-gold shrink-0 mt-0.5" />
                <span className="text-content-primary line-clamp-1">{item.display_name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Khung bản đồ */}
        <div className="relative w-full h-[250px] sm:h-[280px] border border-line rounded-sm overflow-hidden bg-surface">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Ghim trung tâm cố định */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-20 pointer-events-none flex flex-col items-center">
            <div className="w-9 h-9 bg-surface-dark border-2 border-accent-gold rounded-full rounded-br-none -rotate-45 flex items-center justify-center shadow-lg">
              <div className="w-2.5 h-2.5 bg-accent-gold rounded-full rotate-45" />
            </div>
            <div className="w-3 h-1 bg-black/40 rounded-full mt-0.5 filter blur-[1px]" />
          </div>

          {/* Hướng dẫn trên góc bản đồ */}
          <div className="absolute top-2 left-2 z-20 bg-surface/95 backdrop-blur-sm border border-line-light px-2 py-1 text-[0.68rem] font-medium text-content-primary rounded shadow-sm pointer-events-none flex items-center gap-1">
            <Compass size={12} className="text-accent-gold" />
            <span>Kéo bản đồ để đặt ghim đúng vị trí nhà bạn</span>
          </div>
        </div>

        {/* Panel Xem trước & Cho phép sửa trực tiếp Số nhà/Đường */}
        <div className="p-2.5 bg-surface border border-line rounded-sm space-y-2">
          <div className="flex items-center justify-between text-[0.68rem] font-bold uppercase tracking-wider text-content-muted">
            <span className="flex items-center gap-1 text-accent-gold">
              <MapPin size={13} />
              Vị trí đang ghim:
            </span>
            {isLoadingAddress && (
              <span className="flex items-center gap-1 text-content-muted normal-case font-normal text-[0.7rem]">
                <Loader2 size={11} className="animate-spin text-accent-gold" />
                Đang đọc tên đường…
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            <div className="sm:col-span-7">
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[0.68rem] font-medium text-content-secondary">
                  Số nhà, hẻm, tên đường (sửa hoặc bấm nút làm mới):
                </label>
                <button
                  type="button"
                  onClick={handleRefreshFromPin}
                  className="text-[0.65rem] text-accent-gold hover:underline flex items-center gap-0.5"
                  title="Lấy tên đường tại điểm ghim"
                >
                  <RotateCcw size={10} />
                  Lấy từ ghim
                </button>
              </div>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={customStreet}
                  onChange={(e) => setCustomStreet(e.target.value)}
                  placeholder="Ví dụ: 730/46 Lê Đức Thọ"
                  className="w-full text-xs font-semibold pl-2.5 pr-8 py-1.5 bg-surface-elevated border border-line rounded-sm focus:outline-none focus:border-accent-gold text-content-primary"
                />
                <button
                  type="button"
                  onClick={handleRefreshFromPin}
                  className="absolute right-2 text-content-muted hover:text-accent-gold p-0.5 transition-colors"
                  title="Cập nhật theo vị trí ghim"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            </div>

            <div className="sm:col-span-5 bg-surface-elevated p-1.5 rounded-sm border border-line-light text-[0.72rem]">
              <div className="text-content-muted text-[0.65rem] uppercase font-bold">Khu vực tự động:</div>
              <div className="font-medium text-content-primary truncate" title={detectedAddress.suburb || detectedAddress.district}>
                {detectedAddress.suburb ? `${detectedAddress.suburb}, ` : ''}{detectedAddress.district || 'Gò Vấp'}
              </div>
              <div className="text-content-secondary truncate text-[0.68rem]">
                {detectedAddress.city || 'Hồ Chí Minh'}
              </div>
            </div>
          </div>
        </div>

        {/* Nút Thao Tác (Hủy / Xác Nhận Vị Trí Này) */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-line-light">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="button"
            icon={Check}
            onClick={handleConfirmLocation}
            className="px-5 shadow-sm font-semibold"
          >
            Xác Nhận Vị Trí Này
          </Button>
        </div>
      </div>
    </Modal>
  );
}