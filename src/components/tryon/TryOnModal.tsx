import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Camera,
  Upload,
  X,
  RefreshCw,
  Download,
  Eye,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  SwitchCamera,
  Smartphone,
} from 'lucide-react';
import './TryOnModal.css';
import { TryOnCategory, TryOnProgress, TryOnResult, TryOnStatus } from '../../types/aiTryOn';
import {
  FASHION_TIPS,
  detectCategory,
  resizeAndOptimizeImage,
} from '../../utils/aiTryOnDemo';
import { aiTryOnService } from '../../services/aiTryOnService';
import { cn } from '../../utils/cn';

interface TryOnModalProps {
  productId?: number | string;
  productName: string;
  productImage: string;
  categoryHint?: string;
  onClose: () => void;
}

export default function TryOnModal({
  productName,
  productImage,
  categoryHint,
  onClose,
}: TryOnModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('upload');
  const [customPersonBlob, setCustomPersonBlob] = useState<Blob | null>(null);
  const [customPersonPreviewUrl, setCustomPersonPreviewUrl] = useState<string>('');

  // Tự động nhận diện danh mục: Áo (upper_body), Quần (lower_body), Váy (dresses)
  const [category, setCategory] = useState<TryOnCategory>(() => {
    if (categoryHint) return categoryHint as TryOnCategory;
    return detectCategory(productName);
  });

  // Trạng thái AI Try-on
  const [status, setStatus] = useState<TryOnStatus>('idle');
  const [progress, setProgress] = useState<TryOnProgress>({
    percent: 0,
    stage: 'Sẵn sàng',
    detail: 'Chụp ảnh hoặc tải ảnh cá nhân để bắt đầu thử đồ AI',
  });
  const [result, setResult] = useState<TryOnResult | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [tipIndex, setTipIndex] = useState<number>(0);

  // Quản lý trạng thái Token và cảnh báo chuyển đổi tự động
  const [tokenNotice, setTokenNotice] = useState<string>('');
  const [tokenStatus, setTokenStatus] = useState(() => aiTryOnService.getTokenPoolStatus());

  useEffect(() => {
    const unsubscribe = aiTryOnService.onTokenSwitched((event) => {
      setTokenStatus(aiTryOnService.getTokenPoolStatus());
      setTokenNotice(
        `⚠️ Token [${event.oldTokenMasked}] hết hạn mức GPU! Đã tự động kích hoạt Token dự phòng #${event.tokenIndex + 1} [${event.newTokenMasked}].`
      );
    });
    return () => unsubscribe();
  }, []);

  // Camera WebRTC Refs & States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);
  const cameraStartFrameRef = useRef<number | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = useCallback(() => {
    if (cameraStartFrameRef.current !== null) {
      cancelAnimationFrame(cameraStartFrameRef.current);
      cameraStartFrameRef.current = null;
    }
    cameraRequestRef.current += 1;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(async (preferredFacing: 'user' | 'environment' = facingMode) => {
    const requestId = ++cameraRequestRef.current;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;

    let stream: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ truy cập camera trực tiếp.');
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: preferredFacing },
          aspectRatio: { ideal: 3 / 4 },
          width: { ideal: 1080, max: 1920 },
          height: { ideal: 1440, max: 1920 },
        },
        audio: false,
      });

      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const video = videoRef.current;
      if (!video) {
        throw new Error('Không tìm thấy khung hình camera.');
      }

      // Đảm bảo iOS Safari / WebKit phát inline trong trình duyệt, KHÔNG mở AVPlayer toàn màn hình
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('x5-playsinline', 'true');
      video.playsInline = true;
      video.muted = true;
      video.defaultMuted = true;
      video.controls = false;
      video.disablePictureInPicture = true;

      cameraStreamRef.current = stream;
      video.srcObject = stream;
      try {
        await video.play();
      } catch (err) {
        console.warn('Lỗi video.play():', err);
      }

      if (requestId === cameraRequestRef.current) setIsCameraActive(true);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      if (requestId !== cameraRequestRef.current) return;
      console.warn('Lỗi mở Camera:', error);
      cameraStreamRef.current = null;
      setIsCameraActive(false);
      setCameraError(
        'Không thể mở camera web trực tiếp. Bạn có thể cấp quyền truy cập hoặc nhấn "Mở camera điện thoại" bên dưới để chụp.'
      );
    }
  }, [facingMode]);

  const toggleFacingMode = useCallback(() => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    setIsCameraActive(false);
    void startCamera(nextMode);
  }, [facingMode, startCamera]);

  const scheduleCameraStart = useCallback((preferredFacing?: 'user' | 'environment') => {
    if (cameraStartFrameRef.current !== null) {
      cancelAnimationFrame(cameraStartFrameRef.current);
    }
    cameraStartFrameRef.current = requestAnimationFrame(() => {
      cameraStartFrameRef.current = null;
      void startCamera(preferredFacing ?? facingMode);
    });
  }, [facingMode, startCamera]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [onClose, stopCamera]);

  useEffect(() => {
    return () => {
      if (customPersonPreviewUrl) URL.revokeObjectURL(customPersonPreviewUrl);
    };
  }, [customPersonPreviewUrl]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Đổi tip thời trang định kỳ trong lúc chờ
  useEffect(() => {
    if (status === 'processing' || status === 'preparing') {
      const tipTimer = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % FASHION_TIPS.length);
      }, 4500);
      return () => clearInterval(tipTimer);
    }
  }, [status]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status !== 'processing') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, status]);

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) {
      setCameraError('Camera chưa sẵn sàng. Vui lòng đợi hình ảnh xuất hiện rồi thử lại.');
      stopCamera();
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCameraError('Không thể xử lý ảnh chụp trên thiết bị này.');
      stopCamera();
      return;
    }

    // Chỉ preview được lật gương bằng CSS; canvas phải giữ nguyên hướng ảnh thật.
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError('Không thể tạo ảnh chụp. Vui lòng thử chụp lại.');
        stopCamera();
        return;
      }
      setCustomPersonBlob(blob);
      setCustomPersonPreviewUrl(URL.createObjectURL(blob));
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const optimizedBlob = await resizeAndOptimizeImage(file, 768, 1024);
      setCustomPersonBlob(optimizedBlob);
      const url = URL.createObjectURL(optimizedBlob);
      setCustomPersonPreviewUrl(url);
      stopCamera();
    } catch {
      alert('Không thể đọc file ảnh này. Vui lòng chọn ảnh định dạng JPG hoặc PNG.');
    } finally {
      e.target.value = '';
    }
  };

  // Kích hoạt mô hình AI Diffusion IDM-VTON
  const handleStartTryOn = async () => {
    setErrorMessage('');
    setStatus('preparing');

    if (!customPersonBlob) {
      setErrorMessage('Vui lòng chụp ảnh hoặc tải ảnh cá nhân lên trước khi thử đồ.');
      setStatus('idle');
      return;
    }

    try {
      setStatus('processing');
      const tryOnResult = await aiTryOnService.generateTryOn({
        personImage: customPersonBlob,
        garmentImage: productImage,
        garmentDescription: productName,
        category: category,
        denoiseSteps: 30,
        seed: 42,
        onProgress: (p) => setProgress(p),
      });

      setResult(tryOnResult);
      setStatus('success');
    } catch (err: any) {
      console.error('TryOn Failed:', err);
      setStatus('error');
      setErrorMessage(
        err?.message ||
          'Không gian máy chủ GPU Hugging Face hiện đang có nhiều lượt xếp hàng. Vui lòng thử lại sau giây lát!'
      );
    }
  };

  const handleDownloadResult = () => {
    if (!result?.outputImageUrl) return;
    const a = document.createElement('a');
    a.href = result.outputImageUrl;
    a.download = `AI-TryOn-${productName.replace(/\s+/g, '-')}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReset = () => {
    setResult(null);
    setStatus('idle');
    setErrorMessage('');
    if (activeTab === 'camera') {
      setCustomPersonBlob(null);
      setCustomPersonPreviewUrl('');
      setCameraError('');
      setIsCameraActive(false);
      scheduleCameraStart();
    }
  };

  return (
    <div className="tryon-overlay" onClick={handleClose}>
      <div
        className="tryon-modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tryon-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="tryon-header">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="tryon-header-icon-box">
              <Sparkles size={18} className="text-accent-gold" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="tryon-dialog-title" className="tryon-header-title">
                  PHÒNG THỬ ĐỒ ẢO AI
                </h3>
                <span className="tryon-badge-engine">
                  <Sparkles size={10} />
                  {category === 'upper_body' ? 'IDM-VTON Diffusion' : 'OOTDiffusion DressCode'}
                </span>
              </div>
              <div className="tryon-header-meta">
                <span className="tryon-product-tag">Sản phẩm:</span>
                <span className="tryon-product-name" title={productName}>
                  {productName}
                </span>
                <span className="tryon-meta-dot">•</span>
                <span className="tryon-mode-badge">
                  {category === 'lower_body'
                    ? '👖 Chế độ: Quần (Thân dưới)'
                    : category === 'dresses'
                    ? '👗 Chế độ: Váy / Đầm'
                    : '👕 Chế độ: Áo (Thân trên)'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* GPU Token Status Pill */}
            <div
              className="tryon-token-pill"
              title={`Token đang hoạt động: ${tokenStatus.currentMasked} (${tokenStatus.currentIndex + 1}/${tokenStatus.totalTokens})`}
            >
              <span className="tryon-token-dot" />
              <span className="tryon-token-label">GPU Token:</span>
              <span className="tryon-token-value">
                #{tokenStatus.currentIndex + 1}/{tokenStatus.totalTokens}
              </span>
            </div>

            <button
              type="button"
              className="tryon-close-btn"
              onClick={handleClose}
              title="Đóng phòng thử đồ (ESC)"
              aria-label="Đóng phòng thử đồ"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Màn hình kết quả đã hoàn thành */}
        {status === 'success' && result ? (
          <div className="tryon-body">
            <div className="tryon-result-view">
              <div className="text-center space-y-1 mb-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-accent-gold uppercase tracking-wider">
                  <CheckCircle2 size={14} />
                  Kết quả thử đồ AI hoàn tất ({result.executionTimeSec}s)
                </div>
                <p className="text-xs text-content-muted">
                  Giữ nút <strong>"Xem ảnh gốc"</strong> bên dưới để so sánh Before / After
                </p>
              </div>

              {/* Khung hiển thị ảnh kết quả với tính năng Giữ để so sánh ảnh gốc */}
              <div className="tryon-result-container">
                <img
                  src={isComparing ? result.originalPersonImageUrl : result.outputImageUrl}
                  alt="AI Try-On Result"
                />
                <span className="tryon-duo-tag">
                  {isComparing
                    ? 'Ảnh cá nhân gốc'
                    : `Đã mặc đồ AI (${category === 'upper_body' ? 'IDM-VTON' : 'OOTDiffusion'})`}
                </span>

                <button
                  type="button"
                  className="tryon-btn-compare"
                  onMouseDown={() => setIsComparing(true)}
                  onMouseUp={() => setIsComparing(false)}
                  onTouchStart={() => setIsComparing(true)}
                  onTouchEnd={() => setIsComparing(false)}
                >
                  <Eye size={12} />
                  {isComparing ? 'Đang hiện ảnh gốc...' : 'Giữ để so sánh ảnh gốc'}
                </button>
              </div>

              {/* Nút hành động sau khi thử đồ */}
              <div className="flex items-center gap-3 mt-2 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={handleDownloadResult}
                  className="px-5 py-2.5 rounded bg-accent-gold hover:bg-accent-gold/90 text-surface-dark font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all"
                >
                  <Download size={14} />
                  Tải Ảnh HD Về Máy
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded bg-surface border border-line-light hover:border-accent-gold text-content-primary text-xs font-semibold flex items-center gap-2 transition-all"
                >
                  <RefreshCw size={13} />
                  Thử Lại Với Ảnh Khác
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chọn camera hoặc tải ảnh cá nhân */}
            <div className="tryon-tabs">
              <button
                type="button"
                className={`tryon-tab-item ${activeTab === 'camera' ? 'active' : ''}`}
                onClick={() => {
                  setCameraError('');
                  setIsCameraActive(false);
                  setActiveTab('camera');
                  if (!customPersonPreviewUrl) scheduleCameraStart();
                }}
                disabled={status === 'processing'}
                aria-pressed={activeTab === 'camera'}
              >
                <Camera size={14} />
                Chụp ảnh
              </button>
              <button
                type="button"
                className={`tryon-tab-item ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => {
                  stopCamera();
                  setActiveTab('upload');
                }}
                disabled={status === 'processing'}
                aria-pressed={activeTab === 'upload'}
              >
                <Upload size={14} />
                Tải ảnh
              </button>
            </div>

            {/* Nội dung chính */}
            <div className="tryon-body">
              {/* Cột trái: Ảnh cá nhân */}
              <div>
                {/* Camera WebRTC */}
                {activeTab === 'camera' && (
                  <div className="space-y-3">
                    {/* Input ẩn hỗ trợ mở trực tiếp Native Camera app trên điện thoại */}
                    <input
                      ref={nativeCameraInputRef}
                      type="file"
                      accept="image/*"
                      capture={facingMode === 'user' ? 'user' : 'environment'}
                      className="hidden"
                      onChange={handleFileUpload}
                    />

                    {customPersonPreviewUrl ? (
                      <div className="tryon-camera-wrapper">
                        <img
                          src={customPersonPreviewUrl}
                          alt="Ảnh đã chụp"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCustomPersonBlob(null);
                            setCustomPersonPreviewUrl('');
                            setCameraError('');
                            setIsCameraActive(false);
                            scheduleCameraStart();
                          }}
                          className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black text-white text-[0.72rem] font-bold flex items-center gap-1.5 border border-white/20"
                        >
                          <RefreshCw size={12} />
                          Chụp lại
                        </button>
                      </div>
                    ) : (
                      <div className="tryon-camera-wrapper">
                        {cameraError ? (
                          <div
                            className="flex flex-col items-center justify-center h-full p-4 text-center text-status-error text-xs gap-3"
                            role="alert"
                          >
                            <ShieldAlert size={28} />
                            <span>{cameraError}</span>
                            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setCameraError('');
                                  setIsCameraActive(false);
                                  scheduleCameraStart();
                                }}
                                className="px-3 py-1.5 bg-surface border border-line rounded text-content-primary hover:bg-white/5"
                              >
                                Thử lại
                              </button>
                              <button
                                type="button"
                                onClick={() => nativeCameraInputRef.current?.click()}
                                className="px-3 py-1.5 bg-accent-gold text-dark font-bold rounded flex items-center gap-1.5 hover:opacity-90"
                              >
                                <Camera size={14} />
                                Chụp bằng máy ảnh điện thoại
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              controls={false}
                              disablePictureInPicture
                              disableRemotePlayback
                              aria-label="Hình ảnh camera trực tiếp"
                              className={`tryon-camera-video ${facingMode === 'user' ? 'mirrored' : 'normal'}`}
                              {...{ 'webkit-playsinline': 'true', 'x5-playsinline': 'true' }}
                            />

                            {/* Nút lật camera trước / sau */}
                            <button
                              type="button"
                              onClick={toggleFacingMode}
                              className="tryon-camera-flip-btn"
                              aria-label="Đổi camera trước/sau"
                              title="Đổi camera trước/sau"
                            >
                              <SwitchCamera size={16} />
                            </button>

                            <div className="tryon-camera-guide" aria-hidden="true" />

                            <div className="tryon-camera-controls">
                              <button
                                type="button"
                                onClick={handleCapturePhoto}
                                className="tryon-camera-capture"
                                disabled={!isCameraActive}
                                aria-label="Chụp ảnh ngay"
                              >
                                <Camera size={26} />
                              </button>
                              <span className="tryon-camera-capture-label" aria-live="polite">
                                {isCameraActive ? 'Chạm nút vàng để chụp ảnh' : 'Đang kết nối camera…'}
                              </span>
                              <button
                                type="button"
                                onClick={() => nativeCameraInputRef.current?.click()}
                                className="tryon-camera-native-alt"
                              >
                                <Smartphone size={12} />
                                Hoặc mở Máy ảnh gốc trên điện thoại
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Tải ảnh từ máy */}
                {activeTab === 'upload' && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    {customPersonPreviewUrl ? (
                      <div className="tryon-camera-wrapper">
                        <img
                          src={customPersonPreviewUrl}
                          alt="Ảnh đã tải lên"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black text-white text-[0.72rem] font-bold flex items-center gap-1.5 border border-white/20"
                        >
                          <Upload size={12} />
                          Đổi ảnh khác
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="tryon-dropzone"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Chọn ảnh cá nhân để tải lên"
                      >
                        <Upload size={32} className="text-accent-gold mb-2" />
                        <div className="font-bold text-xs text-content-primary mb-1">
                          Nhấn để tải ảnh chân dung / toàn thân
                        </div>
                        <div className="text-[0.7rem] text-content-muted max-w-[240px]">
                          Hỗ trợ định dạng JPG, PNG, WEBP. Tỉ lệ ảnh đứng (3:4) cho độ ôm dáng tốt nhất.
                        </div>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Cột phải: Xem trước bộ ghép & Nút kích hoạt AI */}
              <div className="tryon-preview-panel">
                {/* Bộ chọn Vùng thử đồ thông minh (Áo vs Quần vs Váy) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[0.7rem] text-content-secondary font-semibold uppercase tracking-wider">
                    <span>Vùng thử trang phục:</span>
                    <span className="text-accent-gold font-bold normal-case">
                      {category === 'lower_body'
                        ? '👖 Thân dưới (Quần / Short)'
                        : category === 'dresses'
                        ? '👗 Toàn thân (Váy / Đầm)'
                        : '👕 Thân trên (Áo)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-surface-dark p-1 border border-line-light rounded-md text-[0.7rem]">
                    <button
                      type="button"
                      onClick={() => setCategory('upper_body')}
                      disabled={status === 'processing'}
                      className={cn(
                        'py-1 rounded font-semibold transition-all',
                        category === 'upper_body'
                          ? 'bg-accent-gold text-surface-dark font-bold shadow-sm'
                          : 'text-content-muted hover:text-white'
                      )}
                    >
                      👕 Áo
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategory('lower_body')}
                      disabled={status === 'processing'}
                      className={cn(
                        'py-1 rounded font-semibold transition-all',
                        category === 'lower_body'
                          ? 'bg-accent-gold text-surface-dark font-bold shadow-sm'
                          : 'text-content-muted hover:text-white'
                      )}
                    >
                      👖 Quần
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategory('dresses')}
                      disabled={status === 'processing'}
                      className={cn(
                        'py-1 rounded font-semibold transition-all',
                        category === 'dresses'
                          ? 'bg-accent-gold text-surface-dark font-bold shadow-sm'
                          : 'text-content-muted hover:text-white'
                      )}
                    >
                      👗 Váy/Đầm
                    </button>
                  </div>
                </div>

                <div className="tryon-duo-preview">
                  <div className="tryon-duo-card">
                    {customPersonPreviewUrl ? (
                      <img src={customPersonPreviewUrl} alt="Ảnh cá nhân của bạn" />
                    ) : (
                      <div className="tryon-empty-person">
                        <Camera size={22} />
                        <span>Ảnh của bạn sẽ hiển thị tại đây</span>
                      </div>
                    )}
                    <span className="tryon-duo-tag">Ảnh của bạn</span>
                  </div>

                  {/* Sản phẩm của shop */}
                  <div className="tryon-duo-card">
                    <img src={productImage} alt={productName} />
                    <span className="tryon-duo-tag">Sản phẩm shop</span>
                  </div>
                </div>

                {/* Khu vực trạng thái tiến trình AI */}
                {status === 'processing' && (
                  <div className="p-3 bg-surface border border-accent-gold/30 rounded-md space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-accent-gold flex items-center gap-1.5">
                        <Sparkles size={13} className="animate-spin" />
                        {progress.stage}
                      </span>
                      <span className="font-mono text-content-primary font-bold">{progress.percent}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-surface-dark h-2 rounded-full overflow-hidden border border-line-light">
                      <div
                        className="h-full bg-gradient-to-r from-accent-gold/80 to-accent-gold transition-all duration-300"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>

                    <div className="text-[0.7rem] text-content-secondary line-clamp-1">{progress.detail}</div>

                    {/* Fashion Tip */}
                    <div className="pt-1.5 border-t border-line-light text-[0.68rem] text-content-muted italic">
                      💡 {FASHION_TIPS[tipIndex]}
                    </div>
                  </div>
                )}

                {/* Cảnh báo tự động đổi Token khi hết hạn mức GPU */}
                {tokenNotice && (
                  <div className="p-2.5 bg-accent-gold/15 border border-accent-gold/50 rounded-md text-xs text-accent-gold flex items-center gap-2">
                    <RefreshCw size={13} className="shrink-0 animate-spin" />
                    <span className="font-medium text-[0.72rem] leading-tight">{tokenNotice}</span>
                  </div>
                )}

                {/* Thông báo lỗi nếu có */}
                {status === 'error' && (
                  <div className="p-3 bg-status-error/10 border border-status-error/30 rounded-md text-xs text-status-error flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Không thể hoàn thành thử đồ</div>
                      <div className="text-[0.7rem] opacity-90 mt-0.5">{errorMessage}</div>
                    </div>
                  </div>
                )}

                {!customPersonBlob && status !== 'processing' && (
                  <p className="tryon-photo-hint">
                    Chụp hoặc tải ảnh toàn thân để bắt đầu thử trang phục.
                  </p>
                )}

                {/* Nút bấm Thử Đồ Bằng AI Engine */}
                <button
                  type="button"
                  className="tryon-btn-action"
                  onClick={handleStartTryOn}
                  disabled={status === 'processing' || !customPersonBlob}
                >
                  <Sparkles size={16} />
                  {status === 'processing'
                    ? 'AI Đang May Đồ…'
                    : category === 'lower_body'
                    ? 'Thử Quần Bằng AI OOTDiffusion'
                    : category === 'dresses'
                    ? 'Thử Váy Bằng AI OOTDiffusion'
                    : 'Thử Áo Bằng AI IDM-VTON'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
