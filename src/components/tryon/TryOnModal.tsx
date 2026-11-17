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
  Trash2,
  Zap,
  Users,
  UserCheck,
} from 'lucide-react';
import './TryOnModal.css';
import { TryOnCategory, TryOnProgress, TryOnResult, TryOnStatus } from '../../types/aiTryOn';
import {
  FASHION_TIPS,
  detectCategory,
  resizeAndOptimizeImage,
  STUDIO_MODEL_PRESETS,
  StudioModelPreset,
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
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'preset'>('upload');

  // 1. Ảnh tải lên từ thiết bị (Upload)
  const [uploadBlob, setUploadBlob] = useState<Blob | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string>('');

  // 2. Ảnh chụp trực tiếp từ Camera
  const [cameraBlob, setCameraBlob] = useState<Blob | null>(null);
  const [cameraPreviewUrl, setCameraPreviewUrl] = useState<string>('');

  // 3. Người mẫu Studio có sẵn (Preset Models)
  const [presetBlob, setPresetBlob] = useState<Blob | null>(null);
  const [presetPreviewUrl, setPresetPreviewUrl] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [isLoadingPreset, setIsLoadingPreset] = useState<boolean>(false);

  // Trạng thái kéo thả file
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Ảnh cá nhân đang được kích hoạt để hiển thị và đưa vào mô hình AI:
  // Ưu tiên tab hiện tại; nếu tab đó chưa có ảnh thì lấy ảnh của các tab còn lại
  const activePersonBlob =
    activeTab === 'preset'
      ? (presetBlob || uploadBlob || cameraBlob)
      : activeTab === 'camera'
        ? (cameraBlob || uploadBlob || presetBlob)
        : (uploadBlob || cameraBlob || presetBlob);

  const activePersonPreviewUrl =
    activeTab === 'preset'
      ? (presetPreviewUrl || uploadPreviewUrl || cameraPreviewUrl)
      : activeTab === 'camera'
        ? (cameraPreviewUrl || uploadPreviewUrl || presetPreviewUrl)
        : (uploadPreviewUrl || cameraPreviewUrl || presetPreviewUrl);

  // Tự động nhận diện danh mục: Áo (upper_body), Quần (lower_body), Váy (dresses)
  const [category, setCategory] = useState<TryOnCategory>(() => {
    if (categoryHint) return categoryHint as TryOnCategory;
    return detectCategory(productName);
  });

  // Chế độ thử đồ: 'fast' (Thử nhanh ~12-15s, 22 steps) hoặc 'hd' (Chuẩn nét HD ~25s, 32 steps)
  const [qualityMode, setQualityMode] = useState<'fast' | 'hd'>('fast');

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
      if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
      if (cameraPreviewUrl) URL.revokeObjectURL(cameraPreviewUrl);
      if (presetPreviewUrl) URL.revokeObjectURL(presetPreviewUrl);
    };
  }, [uploadPreviewUrl, cameraPreviewUrl, presetPreviewUrl]);

  // Chọn người mẫu studio có sẵn
  const handleSelectPreset = async (preset: StudioModelPreset) => {
    setSelectedPresetId(preset.id);
    setIsLoadingPreset(true);
    try {
      const blob = await resizeAndOptimizeImage(preset.imageUrl, 768, 1024);
      setPresetBlob(blob);
      if (presetPreviewUrl) URL.revokeObjectURL(presetPreviewUrl);
      const url = URL.createObjectURL(blob);
      setPresetPreviewUrl(url);
    } catch (err) {
      console.error('Lỗi khi tải ảnh người mẫu studio:', err);
    } finally {
      setIsLoadingPreset(false);
    }
  };

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
      setCameraBlob(blob);
      if (cameraPreviewUrl) URL.revokeObjectURL(cameraPreviewUrl);
      setCameraPreviewUrl(URL.createObjectURL(blob));
      stopCamera();
    }, 'image/jpeg', 0.96);
  };

  const processUploadedFile = async (file: File) => {
    try {
      const optimizedBlob = await resizeAndOptimizeImage(file, 768, 1024);
      setUploadBlob(optimizedBlob);
      if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
      const url = URL.createObjectURL(optimizedBlob);
      setUploadPreviewUrl(url);
      stopCamera();
    } catch {
      alert('Không thể đọc file ảnh này. Vui lòng chọn ảnh định dạng JPG hoặc PNG.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUploadedFile(file);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng kéo thả file hình ảnh (JPG, PNG, WEBP).');
      return;
    }
    await processUploadedFile(file);
  };

  // Kích hoạt mô hình AI Diffusion IDM-VTON / OOTDiffusion
  const handleStartTryOn = async () => {
    setErrorMessage('');
    setStatus('preparing');

    if (!activePersonBlob) {
      setErrorMessage('Vui lòng chụp ảnh hoặc tải ảnh cá nhân lên trước khi thử đồ.');
      setStatus('idle');
      return;
    }

    try {
      setStatus('processing');
      const targetSteps = qualityMode === 'fast' ? 22 : 32;
      const tryOnResult = await aiTryOnService.generateTryOn({
        personImage: activePersonBlob,
        garmentImage: productImage,
        garmentDescription: productName,
        category: category,
        denoiseSteps: targetSteps,
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
      if (cameraPreviewUrl) URL.revokeObjectURL(cameraPreviewUrl);
      setCameraBlob(null);
      setCameraPreviewUrl('');
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
            {/* Hiển thị tiến trình % khi đang thử đồ hoặc Huy hiệu Studio HD */}
            {status === 'processing' ? (
              <div className="tryon-header-progress-pill">
                <span className="tryon-header-progress-dot" />
                <span>Tiến trình:</span>
                <strong className="font-mono text-accent-gold">{progress.percent}%</strong>
              </div>
            ) : (
              <div className="tryon-header-status-pill">
                {qualityMode === 'fast' ? (
                  <>
                    <Zap size={11} className="text-yellow-400" />
                    <span>Thử Nhanh (~15s)</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={11} className="text-accent-gold" />
                    <span>Chuẩn Nét HD (32 Steps)</span>
                  </>
                )}
              </div>
            )}

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
                  onMouseLeave={() => setIsComparing(false)}
                  onTouchStart={() => setIsComparing(true)}
                  onTouchEnd={() => setIsComparing(false)}
                  onTouchCancel={() => setIsComparing(false)}
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
                className={`tryon-tab-item ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => {
                  stopCamera();
                  setActiveTab('upload');
                }}
                disabled={status === 'processing'}
                aria-pressed={activeTab === 'upload'}
              >
                <Upload size={14} />
                <span>Tải ảnh từ máy</span>
                {uploadBlob && <span className="w-1.5 h-1.5 rounded-full bg-accent-gold" title="Đã có ảnh tải lên" />}
              </button>
              <button
                type="button"
                className={`tryon-tab-item ${activeTab === 'camera' ? 'active' : ''}`}
                onClick={() => {
                  setCameraError('');
                  setIsCameraActive(false);
                  setActiveTab('camera');
                  if (!cameraPreviewUrl) scheduleCameraStart();
                }}
                disabled={status === 'processing'}
                aria-pressed={activeTab === 'camera'}
              >
                <Camera size={14} />
                <span>Chụp ảnh trực tiếp</span>
                {cameraBlob && <span className="w-1.5 h-1.5 rounded-full bg-accent-gold" title="Đã có ảnh chụp camera" />}
              </button>
              <button
                type="button"
                className={`tryon-tab-item ${activeTab === 'preset' ? 'active' : ''}`}
                onClick={() => {
                  stopCamera();
                  setActiveTab('preset');
                  if (!selectedPresetId && STUDIO_MODEL_PRESETS.length > 0) {
                    void handleSelectPreset(STUDIO_MODEL_PRESETS[0]);
                  }
                }}
                disabled={status === 'processing'}
                aria-pressed={activeTab === 'preset'}
              >
                <Users size={14} />
                <span>Mẫu Studio có sẵn</span>
                {presetBlob && <span className="w-1.5 h-1.5 rounded-full bg-accent-gold" title="Đã chọn mẫu" />}
              </button>
            </div>

            {/* Nội dung chính */}
            <div className="tryon-body">
              {/* Cột trái: Ảnh cá nhân */}
              <div>
                {/* 1. Camera WebRTC */}
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

                    {cameraPreviewUrl ? (
                      <div className="tryon-camera-wrapper">
                        <img
                          src={cameraPreviewUrl}
                          alt="Ảnh đã chụp từ Camera"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (cameraPreviewUrl) URL.revokeObjectURL(cameraPreviewUrl);
                            setCameraBlob(null);
                            setCameraPreviewUrl('');
                            setCameraError('');
                            setIsCameraActive(false);
                            scheduleCameraStart();
                          }}
                          className="tryon-photo-btn"
                        >
                          <RefreshCw size={12} />
                          Chụp lại ảnh khác
                        </button>
                      </div>
                    ) : (
                      <div className="tryon-camera-wrapper">
                        {cameraError ? (
                          <div
                            className="tryon-camera-error flex flex-col items-center justify-center h-full p-4 text-center text-status-error text-xs gap-3"
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

                {/* 2. Tải ảnh từ máy */}
                {activeTab === 'upload' && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileUpload}
                    />

                    {uploadPreviewUrl ? (
                      <div className="tryon-camera-wrapper">
                        <img
                          src={uploadPreviewUrl}
                          alt="Ảnh đã tải lên"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-3 right-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="tryon-photo-btn"
                          >
                            <Upload size={12} />
                            Đổi ảnh khác
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
                              setUploadBlob(null);
                              setUploadPreviewUrl('');
                            }}
                            className="p-2 rounded-full bg-black/80 hover:bg-black text-status-error border border-white/20 transition-all cursor-pointer"
                            title="Xóa ảnh này"
                            aria-label="Xóa ảnh này"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          'tryon-dropzone',
                          isDragging && 'dragging'
                        )}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                        aria-label="Kéo thả hoặc nhấn để chọn ảnh cá nhân"
                      >
                        <div className="tryon-dropzone-pedestal">
                          <Upload size={28} className="text-accent-gold" />
                        </div>

                        <span className="tryon-dropzone-badge">
                          <Sparkles size={11} />
                          Phòng Thử Đồ Chuẩn Studio
                        </span>

                        <h4 className="tryon-dropzone-title">
                          Kéo & Thả Ảnh Vào Đây Hoặc Nhấn Tải Lên
                        </h4>

                        <p className="tryon-dropzone-desc">
                          Hỗ trợ định dạng <strong>JPG, PNG, WEBP</strong>. Tỉ lệ chuẩn <strong>3:4</strong> (768×1024) cho độ ôm dáng và hiển thị trang phục hoàn hảo nhất.
                        </p>

                        <button
                          type="button"
                          className="tryon-dropzone-cta-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          <Upload size={13} />
                          Chọn ảnh từ thiết bị
                        </button>

                        <div className="tryon-dropzone-tips">
                          <span className="tryon-dropzone-tip">
                            <CheckCircle2 size={12} className="text-accent-gold" />
                            Đứng thẳng người
                          </span>
                          <span className="tryon-dropzone-tip">
                            <CheckCircle2 size={12} className="text-accent-gold" />
                            Ánh sáng rõ nét
                          </span>
                          <span className="tryon-dropzone-tip">
                            <CheckCircle2 size={12} className="text-accent-gold" />
                            Thấy rõ vóc dáng
                          </span>
                        </div>

                        {/* Nút chuyển nhanh sang Người mẫu Studio */}
                        <button
                          type="button"
                          className="tryon-dropzone-preset-banner"
                          onClick={(e) => {
                            e.stopPropagation();
                            stopCamera();
                            setActiveTab('preset');
                            if (!selectedPresetId && STUDIO_MODEL_PRESETS.length > 0) {
                              void handleSelectPreset(STUDIO_MODEL_PRESETS[0]);
                            }
                          }}
                        >
                          <UserCheck size={13} />
                          <span>Đang mặc quần short? <strong>Thử trên Người mẫu Studio</strong></span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Người mẫu Studio có sẵn */}
                {activeTab === 'preset' && (
                  <div className="tryon-preset-container">
                    <div className="tryon-preset-banner">
                      <Sparkles size={16} className="shrink-0 text-accent-gold mt-0.5" />
                      <div>
                        <strong>Giải pháp khi bạn đang mặc quần short hoặc đồ ở nhà:</strong>
                        <p className="mt-0.5 opacity-90 text-[0.7rem]">
                          Các người mẫu studio bên dưới đều mặc sẵn <strong>Quần dài & Áo basic</strong> chuẩn form đứng thẳng. AI sẽ bóc tách và may đo chiếc quần tây/váy đầm trọn vẹn 100% xuống mắt cá chân!
                        </p>
                      </div>
                    </div>

                    <div className="tryon-preset-grid">
                      {STUDIO_MODEL_PRESETS.map((preset) => {
                        const isSelected = selectedPresetId === preset.id;
                        return (
                          <div
                            key={preset.id}
                            className={cn('tryon-preset-card', isSelected && 'selected')}
                            onClick={() => handleSelectPreset(preset)}
                            role="button"
                            tabIndex={0}
                            aria-label={`Chọn ${preset.name}`}
                          >
                            <img src={preset.imageUrl} alt={preset.name} loading="lazy" />
                            <div className="tryon-preset-overlay" />

                            {isSelected && (
                              <div className="tryon-preset-selected-check">
                                <CheckCircle2 size={14} />
                              </div>
                            )}

                            <div className="tryon-preset-info">
                              <span className="tryon-preset-name">{preset.name}</span>
                              <span className="tryon-preset-meta">
                                {preset.height} • {preset.weight} • {preset.outfit}
                              </span>
                              <span className="tryon-preset-badge">{preset.badge}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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

                {/* Bộ chọn Chế độ tốc độ & chất lượng (Nhanh vs HD) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[0.7rem] text-content-secondary font-semibold uppercase tracking-wider">
                    <span>Chế độ thử đồ:</span>
                    <span className="text-accent-gold font-bold normal-case">
                      {qualityMode === 'fast' ? '⚡ Thử nhanh (~12-15s)' : '✨ Chuẩn nét HD (~25s)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 bg-surface-dark p-1 border border-line-light rounded-md text-[0.7rem]">
                    <button
                      type="button"
                      onClick={() => setQualityMode('fast')}
                      disabled={status === 'processing'}
                      className={cn(
                        'py-1.5 px-2 rounded font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                        qualityMode === 'fast'
                          ? 'bg-accent-gold text-surface-dark font-bold shadow-sm'
                          : 'text-content-muted hover:text-white'
                      )}
                    >
                      <Zap size={11} className={qualityMode === 'fast' ? 'text-surface-dark' : 'text-yellow-400'} />
                      <span>⚡ Thử Nhanh (15s)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQualityMode('hd')}
                      disabled={status === 'processing'}
                      className={cn(
                        'py-1.5 px-2 rounded font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                        qualityMode === 'hd'
                          ? 'bg-accent-gold text-surface-dark font-bold shadow-sm'
                          : 'text-content-muted hover:text-white'
                      )}
                    >
                      <Sparkles size={11} className={qualityMode === 'hd' ? 'text-surface-dark' : 'text-accent-gold'} />
                      <span>✨ Nét HD Studio</span>
                    </button>
                  </div>
                </div>

                <div className="tryon-duo-preview">
                  <div className={cn("tryon-duo-card", activePersonPreviewUrl && "active")}>
                    {activePersonPreviewUrl ? (
                      <>
                        <img src={activePersonPreviewUrl} alt="Ảnh cá nhân của bạn" />
                        <span className="tryon-duo-tag">
                          <CheckCircle2 size={10} className="text-accent-gold inline mr-1" />
                          Ảnh của bạn
                        </span>
                      </>
                    ) : (
                      <div className="tryon-empty-person">
                        <div className="tryon-empty-icon-circle">
                          <Camera size={20} />
                        </div>
                        <span className="font-bold text-white text-xs">Chưa có ảnh</span>
                        <span className="text-[0.68rem] text-content-muted max-w-[120px]">
                          Tải hoặc chụp ảnh ở khung bên trái
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Sản phẩm của shop */}
                  <div className="tryon-duo-card">
                    <img src={productImage} alt={productName} />
                    <span className="tryon-duo-tag">Sản phẩm shop</span>
                  </div>
                </div>

                {/* Khu vực trạng thái tiến trình AI với % nổi bật */}
                {status === 'processing' && (
                  <div className="p-3.5 bg-surface-dark border border-accent-gold/40 rounded-lg space-y-2.5 shadow-lg">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-accent-gold flex items-center gap-1.5">
                        <Sparkles size={14} className="animate-spin text-accent-gold" />
                        {progress.stage}
                      </span>
                      <span className="font-mono text-accent-gold font-extrabold text-sm tracking-wide">
                        {progress.percent}%
                      </span>
                    </div>

                    {/* Progress Bar với gradient vàng bóng bẩy */}
                    <div className="w-full bg-black/60 h-2.5 rounded-full overflow-hidden border border-accent-gold/25 p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-accent-gold/80 via-accent-gold to-yellow-300 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(230,202,133,0.5)]"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>

                    <div className="text-[0.72rem] text-content-secondary line-clamp-1">
                      {progress.detail}
                    </div>

                    {/* Fashion Tip */}
                    <div className="pt-2 border-t border-line-light text-[0.68rem] text-content-muted italic flex items-start gap-1.5">
                      <span className="text-accent-gold shrink-0">💡</span>
                      <span className="line-clamp-2">{FASHION_TIPS[tipIndex]}</span>
                    </div>
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

                {!activePersonBlob && status !== 'processing' && (
                  <p className="tryon-photo-hint">
                    Chụp hoặc tải ảnh toàn thân để bắt đầu thử trang phục.
                  </p>
                )}

                {/* Nút bấm Thử Đồ Bằng AI Engine */}
                <button
                  type="button"
                  className="tryon-btn-action"
                  onClick={handleStartTryOn}
                  disabled={status === 'processing' || !activePersonBlob}
                >
                  {qualityMode === 'fast' ? <Zap size={16} /> : <Sparkles size={16} />}
                  {status === 'processing'
                    ? `AI Đang Xử Lý (${progress.percent}%)…`
                    : !activePersonBlob
                      ? 'Vui Lòng Thêm Ảnh Để Bắt Đầu'
                      : qualityMode === 'fast'
                        ? category === 'lower_body'
                          ? '⚡ Thử Quần Nhanh (~15s)'
                          : category === 'dresses'
                            ? '⚡ Thử Váy Nhanh (~15s)'
                            : '⚡ Thử Áo Nhanh (~15s)'
                        : category === 'lower_body'
                          ? '✨ Thử Quần Nét HD Studio'
                          : category === 'dresses'
                            ? '✨ Thử Váy Nét HD Studio'
                            : '✨ Thử Áo Nét HD IDM-VTON'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
