/**
 * Danh sách các ngân hàng phổ biến tại Việt Nam (kèm mã BIN, mã VietQR, logo và màu nhận diện)
 * cùng tiện ích tạo URL VietQR động có nhúng ghi chú chuyển khoản.
 */

export interface BankOption {
  code: string;
  bin: string;
  shortName: string;
  fullName: string;
  logoUrl: string;
  brandColor: string;
}

export const VIETNAM_BANKS: BankOption[] = [
  {
    code: 'VCB',
    bin: '970436',
    shortName: 'Vietcombank',
    fullName: 'Ngân hàng TMCP Ngoại thương Việt Nam',
    logoUrl: 'https://api.vietqr.io/img/VCB.png',
    brandColor: '#006B3F',
  },
  {
    code: 'TCB',
    bin: '970407',
    shortName: 'Techcombank',
    fullName: 'Ngân hàng TMCP Kỹ thương Việt Nam',
    logoUrl: 'https://api.vietqr.io/img/TCB.png',
    brandColor: '#E31937',
  },
  {
    code: 'MB',
    bin: '970422',
    shortName: 'MB Bank',
    fullName: 'Ngân hàng TMCP Quân đội',
    logoUrl: 'https://api.vietqr.io/img/MB.png',
    brandColor: '#141ED2',
  },
  {
    code: 'BIDV',
    bin: '970418',
    shortName: 'BIDV',
    fullName: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',
    logoUrl: 'https://api.vietqr.io/img/BIDV.png',
    brandColor: '#005BAC',
  },
  {
    code: 'ICB',
    bin: '970415',
    shortName: 'VietinBank',
    fullName: 'Ngân hàng TMCP Công thương Việt Nam',
    logoUrl: 'https://api.vietqr.io/img/ICB.png',
    brandColor: '#0055A5',
  },
  {
    code: 'VBA',
    bin: '970405',
    shortName: 'Agribank',
    fullName: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam',
    logoUrl: 'https://api.vietqr.io/img/VBA.png',
    brandColor: '#AE1C3F',
  },
  {
    code: 'ACB',
    bin: '970416',
    shortName: 'ACB',
    fullName: 'Ngân hàng TMCP Á Châu',
    logoUrl: 'https://api.vietqr.io/img/ACB.png',
    brandColor: '#0066B3',
  },
  {
    code: 'VPB',
    bin: '970432',
    shortName: 'VPBank',
    fullName: 'Ngân hàng TMCP Việt Nam Thịnh Vượng',
    logoUrl: 'https://api.vietqr.io/img/VPB.png',
    brandColor: '#00A859',
  },
  {
    code: 'TPB',
    bin: '970423',
    shortName: 'TPBank',
    fullName: 'Ngân hàng TMCP Tiên Phong',
    logoUrl: 'https://api.vietqr.io/img/TPB.png',
    brandColor: '#6C2C91',
  },
  {
    code: 'STB',
    bin: '970403',
    shortName: 'Sacombank',
    fullName: 'Ngân hàng TMCP Sài Gòn Thương Tín',
    logoUrl: 'https://api.vietqr.io/img/STB.png',
    brandColor: '#0057A8',
  },
  {
    code: 'VIB',
    bin: '970441',
    shortName: 'VIB',
    fullName: 'Ngân hàng TMCP Quốc tế Việt Nam',
    logoUrl: 'https://api.vietqr.io/img/VIB.png',
    brandColor: '#005BAA',
  },
  {
    code: 'HDB',
    bin: '970437',
    shortName: 'HDBank',
    fullName: 'Ngân hàng TMCP Phát triển TP. Hồ Chí Minh',
    logoUrl: 'https://api.vietqr.io/img/HDB.png',
    brandColor: '#D71920',
  },
  {
    code: 'SHB',
    bin: '970443',
    shortName: 'SHB',
    fullName: 'Ngân hàng TMCP Sài Gòn - Hà Nội',
    logoUrl: 'https://api.vietqr.io/img/SHB.png',
    brandColor: '#F37021',
  },
  {
    code: 'MSB',
    bin: '970426',
    shortName: 'MSB',
    fullName: 'Ngân hàng TMCP Hàng Hải Việt Nam',
    logoUrl: 'https://api.vietqr.io/img/MSB.png',
    brandColor: '#E50914',
  },
  {
    code: 'OCB',
    bin: '970448',
    shortName: 'OCB',
    fullName: 'Ngân hàng TMCP Phương Đông',
    logoUrl: 'https://api.vietqr.io/img/OCB.png',
    brandColor: '#008C45',
  },
  {
    code: 'SEAB',
    bin: '970440',
    shortName: 'SeABank',
    fullName: 'Ngân hàng TMCP Đông Nam Á',
    logoUrl: 'https://api.vietqr.io/img/SEAB.png',
    brandColor: '#C8102E',
  },
  {
    code: 'LPB',
    bin: '970449',
    shortName: 'LPBank',
    fullName: 'Ngân hàng TMCP Lộc Phát Việt Nam',
    logoUrl: 'https://api.vietqr.io/img/LPB.png',
    brandColor: '#F58220',
  },
  {
    code: 'EIB',
    bin: '970431',
    shortName: 'Eximbank',
    fullName: 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam',
    logoUrl: 'https://api.vietqr.io/img/EIB.png',
    brandColor: '#0072BC',
  },
];

/**
 * Tìm ngân hàng trong danh sách theo tên ngắn, mã code hoặc tên đầy đủ (không phân biệt hoa thường).
 */
export function findBankByName(value?: string | null): BankOption | undefined {
  const normalized = (value || '').trim().toLowerCase();
  if (!normalized) return undefined;
  return VIETNAM_BANKS.find(
    (b) =>
      b.shortName.toLowerCase() === normalized ||
      b.code.toLowerCase() === normalized ||
      b.bin === normalized ||
      b.shortName.toLowerCase().replace(/\s+/g, '') === normalized.replace(/\s+/g, '') ||
      b.fullName.toLowerCase() === normalized
  );
}

/**
 * Tạo URL mã VietQR động kèm nội dung chuyển khoản (addInfo) theo ghi chú kế toán nhập.
 * Nếu ghi chú trống, giữ nguyên nội dung mặc định từ URL gốc hoặc dùng "Hoan tien <returnCode>".
 */
export function buildDynamicVietQrUrl(params: {
  baseQrUrl?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
  refundAmount?: number | null;
  returnCode?: string | null;
  customNote?: string | null;
}): { qrUrl: string | null; activeNote: string; defaultNote: string } {
  const fallbackDefaultNote = params.returnCode
    ? `Hoan tien ${params.returnCode}`
    : 'Hoan tien don hang';

  let defaultNote = fallbackDefaultNote;
  const trimmedBase = (params.baseQrUrl || '').trim();
  const trimmedCustom = (params.customNote || '').trim();

  if (trimmedBase && /^https?:\/\//i.test(trimmedBase)) {
    try {
      const parsed = new URL(trimmedBase);
      const existingAddInfo = parsed.searchParams.get('addInfo');
      if (existingAddInfo && existingAddInfo.trim() !== '') {
        defaultNote = existingAddInfo.trim();
      }
      const activeNote = trimmedCustom || defaultNote;
      parsed.searchParams.set('addInfo', activeNote);
      return {
        qrUrl: parsed.toString(),
        activeNote,
        defaultNote,
      };
    } catch {
      // Nếu URL không hợp lệ, rơi xuống nhánh fallback bên dưới
    }
  }

  const activeNote = trimmedCustom || defaultNote;

  if (trimmedBase) {
    return {
      qrUrl: trimmedBase,
      activeNote,
      defaultNote,
    };
  }

  const bank = findBankByName(params.bankName);
  const cleanAccount = (params.accountNumber || '').trim();
  if (bank && cleanAccount) {
    const qrUrl = new URL(`https://img.vietqr.io/image/${bank.bin}-${cleanAccount}-compact2.png`);
    if (typeof params.refundAmount === 'number' && params.refundAmount > 0) {
      qrUrl.searchParams.set('amount', String(Math.round(params.refundAmount)));
    }
    qrUrl.searchParams.set('addInfo', activeNote);
    if (params.accountHolder && params.accountHolder.trim() !== '') {
      qrUrl.searchParams.set('accountName', params.accountHolder.trim());
    }
    return {
      qrUrl: qrUrl.toString(),
      activeNote,
      defaultNote,
    };
  }

  return {
    qrUrl: null,
    activeNote,
    defaultNote,
  };
}

// Lưu trạng thái "khách tự mang hàng đến cửa hàng" cục bộ theo mã phiếu để giữ trải nghiệm liền mạch khi sửa phiếu
const SELF_DROPOFF_STORAGE_KEY = 'fashion_return_self_dropoff_map';

export function getSelfDropOffFlag(returnId?: number | null): boolean {
  if (!returnId) return false;
  try {
    const raw = localStorage.getItem(SELF_DROPOFF_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return Boolean(parsed[String(returnId)]);
  } catch {
    return false;
  }
}

export function setSelfDropOffFlag(returnId: number | undefined | null, isSelfDropOff: boolean): void {
  if (!returnId) return;
  try {
    const raw = localStorage.getItem(SELF_DROPOFF_STORAGE_KEY);
    const parsed: Record<string, boolean> = raw ? JSON.parse(raw) : {};
    if (isSelfDropOff) {
      parsed[String(returnId)] = true;
    } else {
      delete parsed[String(returnId)];
    }
    localStorage.setItem(SELF_DROPOFF_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage
  }
}
