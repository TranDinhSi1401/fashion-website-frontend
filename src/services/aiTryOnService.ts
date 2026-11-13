import { Client, handle_file } from '@gradio/client';
import { TryOnRequestOptions, TryOnResult } from '../types/aiTryOn';
import {
  generateSmartMask,
  resizeAndOptimizeImage,
  translateGarmentDescription,
  urlToBlob,
} from '../utils/aiTryOnDemo';

const RAW_TOKEN_LIST = (import.meta.env.VITE_HF_TOKENS || '')
  .split(/[,;\s]+/)
  .map((t: string) => t.trim())
  .filter(Boolean);

const SINGLE_TOKEN = (import.meta.env.VITE_HF_TOKEN || '').trim();

// Tập hợp danh sách các token duy nhất (hỗ trợ nhiều token dự phòng)
const INITIAL_TOKENS: string[] = Array.from(
  new Set([SINGLE_TOKEN, ...RAW_TOKEN_LIST].filter(Boolean))
);

const HF_IDM_SPACE = import.meta.env.VITE_HF_SPACE || 'yisol/IDM-VTON';
const HF_OOTD_SPACE = import.meta.env.VITE_HF_OOTD_SPACE || 'levihsu/OOTDiffusion';

function maskToken(token: string): string {
  if (!token) return 'Không có Token';
  if (token.length <= 10) return token.slice(0, 3) + '***';
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

function extractOutputUrl(data: any): string {
  if (!data) return '';
  if (Array.isArray(data)) {
    const first = data[0];
    if (typeof first === 'string') return first;
    if (Array.isArray(first)) {
      return extractOutputUrl(first);
    }
    if (first?.image?.url) return first.image.url;
    if (first?.url) return first.url;
    if (first?.image && typeof first.image === 'string') return first.image;
    if (first?.image?.path) return first.image.path;
  }
  if (data?.url) return data.url;
  return '';
}

export class AiTryOnService {
  private tokens: string[] = INITIAL_TOKENS.length > 0 ? INITIAL_TOKENS : [''];
  private currentTokenIndex: number = 0;
  private idmClientPromise: Promise<any> | null = null;
  private ootdClientPromise: Promise<any> | null = null;
  private onTokenSwitchedListeners: Array<(event: {
    oldTokenMasked: string;
    newTokenMasked: string;
    tokenIndex: number;
    totalTokens: number;
    reason: string;
  }) => void> = [];

  /**
   * Đăng ký lắng nghe sự kiện khi hệ thống tự động đổi token
   */
  public onTokenSwitched(
    listener: (event: {
      oldTokenMasked: string;
      newTokenMasked: string;
      tokenIndex: number;
      totalTokens: number;
      reason: string;
    }) => void
  ) {
    this.onTokenSwitchedListeners.push(listener);
    return () => {
      this.onTokenSwitchedListeners = this.onTokenSwitchedListeners.filter(
        (l) => l !== listener
      );
    };
  }

  /**
   * Lấy thông tin trạng thái Token pool hiện tại
   */
  public getTokenPoolStatus() {
    const currentToken = this.tokens[this.currentTokenIndex] || '';
    return {
      currentToken,
      currentMasked: maskToken(currentToken),
      currentIndex: this.currentTokenIndex,
      totalTokens: this.tokens.length,
      allTokensMasked: this.tokens.map((t) => maskToken(t)),
      hasBackupTokens: this.tokens.length > 1,
    };
  }

  /**
   * Lấy token hiện tại đang kích hoạt
   */
  private getCurrentToken(): string {
    return this.tokens[this.currentTokenIndex] || '';
  }

  /**
   * Chuyển sang token dự phòng tiếp theo
   */
  public rotateToken(reason = 'Hết hạn mức GPU (Quota exceeded)'): boolean {
    if (this.currentTokenIndex + 1 < this.tokens.length) {
      const oldToken = this.tokens[this.currentTokenIndex];
      this.currentTokenIndex += 1;
      const newToken = this.tokens[this.currentTokenIndex];

      // Đặt lại các kết nối Client để tái kết nối bằng token mới
      this.idmClientPromise = null;
      this.ootdClientPromise = null;

      const eventData = {
        oldTokenMasked: maskToken(oldToken),
        newTokenMasked: maskToken(newToken),
        tokenIndex: this.currentTokenIndex,
        totalTokens: this.tokens.length,
        reason,
      };

      console.warn(
        `[AiTryOnService] Chuyển đổi Token tự động: ${eventData.oldTokenMasked} -> ${eventData.newTokenMasked} (${eventData.tokenIndex + 1}/${eventData.totalTokens}) - Lý do: ${reason}`
      );

      this.onTokenSwitchedListeners.forEach((listener) => {
        try {
          listener(eventData);
        } catch (e) {
          console.error('Error in token listener:', e);
        }
      });

      return true;
    }
    return false;
  }

  /**
   * Kiểm tra lỗi có phải do hết Token / Quota / Rate limit không
   */
  private isQuotaOrTokenError(error: any): boolean {
    const msg = (
      (error?.message || '') +
      ' ' +
      (typeof error === 'string' ? error : JSON.stringify(error || {}))
    ).toLowerCase();

    return (
      msg.includes('quota') ||
      msg.includes('rate limit') ||
      msg.includes('exceeded') ||
      msg.includes('429') ||
      msg.includes('zerogpu') ||
      msg.includes('zero-gpu') ||
      msg.includes('too many requests') ||
      msg.includes('gpu grant') ||
      msg.includes('unauthorized') ||
      msg.includes('401') ||
      msg.includes('forbidden') ||
      msg.includes('403') ||
      msg.includes('invalid token')
    );
  }

  /**
   * Kết nối Client tới yisol/IDM-VTON (Chuyên Upper-body / Áo)
   */
  private async getIdmClient() {
    const token = this.getCurrentToken();
    if (!this.idmClientPromise) {
      this.idmClientPromise = Client.connect(HF_IDM_SPACE, {
        token: (token as any) || undefined,
      }).catch((err) => {
        this.idmClientPromise = null;
        throw err;
      });
    }
    return this.idmClientPromise;
  }

  /**
   * Kết nối Client tới levihsu/OOTDiffusion (Chuyên Lower-body / Quần và Dress / Váy)
   */
  private async getOotdClient() {
    const token = this.getCurrentToken();
    if (!this.ootdClientPromise) {
      this.ootdClientPromise = Client.connect(HF_OOTD_SPACE, {
        token: (token as any) || undefined,
      }).catch((err) => {
        this.ootdClientPromise = null;
        throw err;
      });
    }
    return this.ootdClientPromise;
  }

  /**
   * Xử lý thử đồ AI thông minh với kiến trúc Dual AI Engine & Auto Token Failover
   */
  public async generateTryOn(options: TryOnRequestOptions): Promise<TryOnResult> {
    const startTime = Date.now();
    const {
      personImage,
      garmentImage,
      garmentDescription,
      category = 'upper_body',
      denoiseSteps = 30,
      seed = 42,
      onProgress,
    } = options;

    const isLowerOrDress = category === 'lower_body' || category === 'dresses';
    const engineName = isLowerOrDress
      ? 'OOTDiffusion (DressCode Full-body)'
      : 'IDM-VTON (VITON-HD High-res)';

    // 1. Chuẩn bị và tối ưu hóa ảnh đầu vào
    onProgress?.({
      percent: 15,
      stage: 'Chuẩn bị dữ liệu',
      detail: `Đang tối ưu ảnh cho mô hình ${engineName}...`,
    });

    const [personOptimizedBlob, garmentOptimizedBlob] = await Promise.all([
      resizeAndOptimizeImage(personImage, 768, 1024),
      typeof garmentImage === 'string'
        ? resizeAndOptimizeImage(await urlToBlob(garmentImage), 768, 1024)
        : resizeAndOptimizeImage(garmentImage, 768, 1024),
    ]);

    const personBlobUrl = URL.createObjectURL(personOptimizedBlob);

    // 2. Vòng lặp thử nghiệm với cơ chế Auto-Token Failover
    let lastError: any = null;
    const maxAttempts = this.tokens.length;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const activeTokenMasked = maskToken(this.getCurrentToken());
      try {
        if (isLowerOrDress) {
          // ==========================================
          // ENGINE 1: OOTDiffusion DressCode (QUẦN & VÁY)
          // ==========================================
          onProgress?.({
            percent: 30,
            stage: 'Kết nối máy chủ GPU',
            detail: `Đang liên kết ${HF_OOTD_SPACE} qua Token [${activeTokenMasked}]...`,
          });

          const ootdClient = await this.getOotdClient();

          onProgress?.({
            percent: 55,
            stage: 'Mô hình đang may đo Quần/Váy',
            detail: 'Đang bóc tách phần thân dưới và may đo nếp gấp trang phục vào vóc dáng...',
          });

          const ootdCategory = category === 'lower_body' ? 'Lower-body' : 'Dress';

          const result = await ootdClient.predict('/process_dc', {
            vton_img: handle_file(personOptimizedBlob),
            garm_img: handle_file(garmentOptimizedBlob),
            category: ootdCategory,
            n_samples: 1,
            n_steps: Math.min(25, denoiseSteps),
            image_scale: 2.0,
            seed: seed === 42 ? -1 : seed,
          });

          onProgress?.({
            percent: 96,
            stage: 'Hoàn thiện kết quả',
            detail: 'Đang tải bức ảnh trang phục hoàn chỉnh về máy...',
          });

          const outputUrl = extractOutputUrl(result.data);
          if (!outputUrl) {
            throw new Error('Mô hình OOTDiffusion không trả về ảnh kết quả hợp lệ.');
          }

          const executionTimeSec = Math.round((Date.now() - startTime) / 1000);
          return {
            outputImageUrl: outputUrl,
            originalPersonImageUrl: personBlobUrl,
            garmentImageUrl:
              typeof garmentImage === 'string'
                ? garmentImage
                : URL.createObjectURL(garmentImage),
            productName: garmentDescription,
            executionTimeSec,
          };
        } else {
          // ==========================================
          // ENGINE 2: IDM-VTON (ÁO / UPPER-BODY)
          // ==========================================
          onProgress?.({
            percent: 30,
            stage: 'Kết nối máy chủ GPU',
            detail: `Đang liên kết ${HF_IDM_SPACE} qua Token [${activeTokenMasked}]...`,
          });

          const idmClient = await this.getIdmClient();

          onProgress?.({
            percent: 50,
            stage: 'Mô hình Diffusion đang may áo',
            detail: 'Đang tái tạo cổ áo, sợi vải và bóng đổ chân thực...',
          });

          const englishDescription = translateGarmentDescription(
            garmentDescription,
            'upper_body'
          );

          const result = await idmClient.predict('/tryon', {
            dict: {
              background: handle_file(personOptimizedBlob),
              layers: [],
              composite: null,
            },
            garm_img: handle_file(garmentOptimizedBlob),
            garment_des: englishDescription,
            is_checked: true,
            is_checked_crop: false,
            denoise_steps: denoiseSteps,
            seed: seed,
          });

          onProgress?.({
            percent: 96,
            stage: 'Hoàn thiện kết quả',
            detail: 'Đang tải bức ảnh thử áo chất lượng cao về máy...',
          });

          const outputUrl = extractOutputUrl(result.data);
          if (!outputUrl) {
            throw new Error('Mô hình IDM-VTON không trả về ảnh kết quả hợp lệ.');
          }

          const executionTimeSec = Math.round((Date.now() - startTime) / 1000);
          return {
            outputImageUrl: outputUrl,
            originalPersonImageUrl: personBlobUrl,
            garmentImageUrl:
              typeof garmentImage === 'string'
                ? garmentImage
                : URL.createObjectURL(garmentImage),
            productName: garmentDescription,
            executionTimeSec,
          };
        }
      } catch (error: any) {
        lastError = error;
        console.warn(
          `[AiTryOnService] Lỗi với Token [${activeTokenMasked}]:`,
          error
        );

        // Kiểm tra xem lỗi có phải do Quota / Token hay không
        const isQuotaErr = this.isQuotaOrTokenError(error);

        if (isQuotaErr && this.currentTokenIndex + 1 < this.tokens.length) {
          const oldMasked = activeTokenMasked;
          this.rotateToken('Hạn mức GPU ZeroGPU của Token đã đạt giới hạn (429/Quota limit)');
          const newMasked = maskToken(this.getCurrentToken());

          onProgress?.({
            percent: 25,
            stage: 'Tự động đổi Token dự phòng',
            detail: `⚠️ Token [${oldMasked}] hết hạn mức GPU! Đang tự động kích hoạt Token #${this.currentTokenIndex + 1} [${newMasked}]...`,
          });

          // Nghỉ 1 giây rồi retry với token mới
          await new Promise((res) => setTimeout(res, 1000));
          continue;
        }

        // Nếu không thể chuyển token hoặc lỗi khác, ném lỗi ra
        break;
      }
    }

    // Nếu đã duyệt hết tất cả token mà vẫn lỗi
    const errorMsg =
      lastError?.message ||
      (this.tokens.length > 1
        ? `Tất cả ${this.tokens.length} Token Hugging Face dự phòng đều đã đạt giới hạn hạn mức GPU. Vui lòng thêm token mới vào VITE_HF_TOKENS trong .env hoặc thử lại sau!`
        : 'Không thể hoàn thành thử đồ bằng AI. Máy chủ GPU có thể đang quá tải hàng đợi, vui lòng thử lại sau giây lát!');

    throw new Error(errorMsg);
  }
}

export const aiTryOnService = new AiTryOnService();
