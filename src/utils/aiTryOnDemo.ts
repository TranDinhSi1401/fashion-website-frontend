import { DemoModel, TryOnCategory } from '../types/aiTryOn';

/**
 * Danh sách người mẫu Studio chuẩn form để khách hàng thử ngay trong 1-click
 * Sử dụng hình ảnh chuẩn studio với tư thế đứng thẳng tối ưu cho mô hình Diffusion IDM-VTON
 */
export const DEMO_MODELS: DemoModel[] = [
  {
    id: 'model-male-1',
    name: 'Quang Huy (Nam)',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=768&q=80',
    height: '1m78',
    weight: '68kg',
    fit: 'Vóc dáng thể thao chuẩn',
  },
  {
    id: 'model-female-1',
    name: 'Mai Linh (Nữ)',
    gender: 'female',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=768&q=80',
    height: '1m66',
    weight: '49kg',
    fit: 'Form người thanh mảnh',
  },
  {
    id: 'model-male-2',
    name: 'Tuấn Kiệt (Nam)',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=768&q=80',
    height: '1m75',
    weight: '72kg',
    fit: 'Form người công sở săn chắc',
  },
];

/**
 * Mẹo thời trang xuất hiện luân phiên trong lúc chờ AI Diffusion chạy
 */
export const FASHION_TIPS: string[] = [
  'Mẹo: Với Quần hoặc Váy, chụp ảnh thấy rõ phần chân và thắt lưng để AI cắt ghép tự nhiên nhất.',
  'IDM-VTON áp dụng công nghệ DensePose để phân tách các lớp vải và đổ bóng theo ánh sáng môi trường.',
  'Bạn có thể nhấn và giữ nút "So sánh" ở màn hình kết quả để xem sự thay đổi Before / After.',
  'AI Diffusion tái tạo nếp nhăn và độ rủ của vải dựa trên tư thế đứng của bạn.',
  'Đứng thẳng lưng, hai tay buông nhẹ sẽ giúp trang phục ôm trọn vóc dáng hoàn hảo nhất.',
];

/**
 * Tự động phân loại danh mục trang phục dựa vào tên sản phẩm
 */
export function detectCategory(productName: string): TryOnCategory {
  const lower = productName.toLowerCase();
  if (lower.includes('quần') || lower.includes('short') || lower.includes('pant') || lower.includes('trouser') || lower.includes('jean')) {
    return 'lower_body';
  }
  if (lower.includes('váy') || lower.includes('đầm') || lower.includes('dress') || lower.includes('jumpsuit')) {
    return 'dresses';
  }
  return 'upper_body';
}

/**
 * Tạo mô tả trang phục bằng tiếng Anh chuẩn cho AI Diffusion
 * Giúp AI hiểu chính xác đây là QUẦN (bottom wear/shorts) hay ÁO (top/jacket)
 */
export function translateGarmentDescription(productName: string, category: TryOnCategory): string {
  const lower = productName.toLowerCase();

  if (category === 'lower_body') {
    if (lower.includes('short')) {
      return 'a pair of casual short pants, bermuda shorts, bottom wear, lower body clothing';
    }
    if (lower.includes('tây') || lower.includes('âu')) {
      return 'a pair of formal trousers, dress pants, bottom wear, lower body clothing';
    }
    if (lower.includes('jean')) {
      return 'a pair of denim jeans, trousers, bottom wear, lower body clothing';
    }
    return 'a pair of pants, trousers, bottom wear, lower body clothing';
  }

  if (category === 'dresses') {
    return 'an elegant one-piece dress, full body women clothing';
  }

  // Upper body
  if (lower.includes('sơ mi') || lower.includes('shirt')) {
    return 'a stylish collared shirt, long sleeve dress shirt, upper body top';
  }
  if (lower.includes('thun') || lower.includes('t-shirt') || lower.includes('polo')) {
    return 'a casual t-shirt, short sleeve polo top, upper body garment';
  }
  if (lower.includes('khoác') || lower.includes('jacket') || lower.includes('blazer')) {
    return 'a modern jacket, blazer coat, outerwear, upper body garment';
  }

  return 'an upper body fashion top, shirt, clothing';
}

/**
 * Tự động tạo Mask Canvas cho Thân dưới (Quần) hoặc Váy đầm
 * Khi thử Quần: Mask bao phủ từ thắt lưng (Y ~ 48%) xuống đến ống chân (Y ~ 95%)
 * Màu trắng (#FFFFFF) là vùng AI sẽ xóa đồ cũ và may quần mới vào
 * Nền trong suốt (alpha = 0) là vùng giữ nguyên (áo, mặt, thân trên)
 */
export async function generateSmartMask(
  category: TryOnCategory,
  targetWidth = 768,
  targetHeight = 1024
): Promise<Blob | null> {
  if (category === 'upper_body') {
    // Thân trên có thể tận dụng auto-masking của mô hình
    return null;
  }

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve(null);
      return;
    }

    // Xóa nền trong suốt
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    // Vẽ vùng mask màu trắng đặc (#FFFFFF) với độ mờ nhẹ ở mép để hòa trộn tự nhiên
    ctx.fillStyle = '#FFFFFF';

    if (category === 'lower_body') {
      // Vùng thân dưới (Quần / Váy ngắn):
      // Bắt đầu từ thắt lưng (Y: 480px) đến mắt cá chân (Y: 960px)
      const startY = targetHeight * 0.46;
      const endY = targetHeight * 0.95;
      const startX = targetWidth * 0.16;
      const width = targetWidth * 0.68;
      const height = endY - startY;

      // Vẽ hình chữ nhật bo tròn bao trọn hông và 2 chân
      ctx.beginPath();
      ctx.roundRect(startX, startY, width, height, 16);
      ctx.fill();
    } else if (category === 'dresses') {
      // Váy đầm (từ ngực/vai đến bắp chân)
      const startY = targetHeight * 0.22;
      const endY = targetHeight * 0.88;
      const startX = targetWidth * 0.15;
      const width = targetWidth * 0.70;
      const height = endY - startY;

      ctx.beginPath();
      ctx.roundRect(startX, startY, width, height, 20);
      ctx.fill();
    }

    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      'image/png'
    );
  });
}

/**
 * Chuyển URL hoặc File thành Blob
 */
export async function urlToBlob(url: string): Promise<Blob> {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`Không thể tải ảnh từ URL: ${response.statusText}`);
  }
  return await response.blob();
}

/**
 * Tối ưu hóa kích thước và nén ảnh về tỉ lệ chuẩn 3:4 (768 x 1024) của IDM-VTON
 */
export async function resizeAndOptimizeImage(
  source: Blob | File | string,
  targetWidth = 768,
  targetHeight = 1024
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      let imageBlob: Blob;
      if (typeof source === 'string') {
        imageBlob = await urlToBlob(source);
      } else {
        imageBlob = source;
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(imageBlob);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(imageBlob);
          return;
        }

        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
        const x = (targetWidth - img.width * scale) / 2;
        const y = (targetHeight - img.height * scale) / 2;

        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(imageBlob);
            }
          },
          'image/jpeg',
          0.88
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Không thể đọc file ảnh để tối ưu kích thước.'));
      };

      img.src = objectUrl;
    } catch (err) {
      reject(err);
    }
  });
}
