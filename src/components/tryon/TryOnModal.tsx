import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Camera,
  Upload,
  UserCheck,
  X,
  RefreshCw,
  Download,
  Eye,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import './TryOnModal.css';
import { DemoModel, TryOnCategory, TryOnProgress, TryOnResult, TryOnStatus } from '../../types/aiTryOn';
import {
  DEMO_MODELS,
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
  productId,
  productName,
  productImage,
  categoryHint,
  onClose,
}: TryOnModalProps) {
  const [activeTab, setActiveTab] = useState<'models' | 'camera' | 'upload'>('models');
  const [selectedModel, setSelectedModel] = useState<DemoModel>(DEMO_MODELS[0]);
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
    detail: 'Chọn người mẫu hoặc chụp ảnh để bắt đầu thử đồ AI',
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

  // Camera WebRTC Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Đổi tip thời trang định kỳ trong lúc chờ
  useEffect(() => {
    if (status === 'processing' || status === 'preparing') {
      const tipTimer = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % FASHION_TIPS.length);
      }, 4500);
      return () => clearInterval(tipTimer);
    }
  }, [status]);

  // Hỗ trợ phím ESC để đóng modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status !== 'processing') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status]);

  // Khởi động Camera khi chuyển sang tab camera
  useEffect(() => {
    if (activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab]);

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Lỗi mở Camera:', err);
      setIsCameraActive(false);
      setCameraError('Không thể mở Camera. Vui lòng cấp quyền truy cập máy ảnh trên trình duyệt.');
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 768;
    canvas.height = video.videoHeight || 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Lật ngược lại cho đúng hướng ảnh thật (vì video đang lật gương)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        setCustomPersonBlob(blob);
        const url = URL.createObjectURL(blob);
        setCustomPersonPreviewUrl(url);
        stopCamera();
      }
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
    } catch (err) {
      alert('Không thể đọc file ảnh này. Vui lòng chọn ảnh định dạng JPG hoặc PNG.');
    }
  };

  // Kích hoạt mô hình AI Diffusion IDM-VTON
  const handleStartTryOn = async () => {
    setErrorMessage('');
    setStatus('preparing');

    // Xác định ảnh người mẫu nguồn
    let personInput: Blob | string;
    if (activeTab === 'models') {
      personInput = selectedModel.imageUrl;
    } else {
      if (!customPersonBlob) {
        setErrorMessage('Vui lòng chụp ảnh hoặc tải ảnh lên trước khi thử đồ.');
        setStatus('idle');
        return;
      }
      personInput = customPersonBlob;
    }

    try {
      setStatus('processing');
      const tryOnResult = await aiTryOnService.generateTryOn({
        personImage: personInput,
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
      startCamera();
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  // Lấy ảnh người mẫu hiện tại để hiển thị preview
  const currentPersonPreview =
    activeTab === 'models' ? selectedModel.imageUrl : customPersonPreviewUrl || selectedModel.imageUrl;

  return (
    <div className="tryon-overlay" onClick={handleClose}>
      <div className="tryon-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tryon-header">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="tryon-header-icon-box">
              <Sparkles size={18} className="text-accent-gold" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="tryon-header-title">
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

            <button className="tryon-close-btn" onClick={handleClose} title="Đóng phòng thử đồ (ESC)">
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
                    ? 'Ảnh người mẫu gốc'
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
            {/* Thanh Tab lựa chọn nguồn người mẫu */}
            <div className="tryon-tabs">
              <button
                type="button"
                className={`tryon-tab-item ${activeTab === 'models' ? 'active' : ''}`}
                onClick={() => setActiveTab('models')}
                disabled={status === 'processing'}
              >
                <UserCheck size={14} />
                Người Mẫu Chuẩn Form
              </button>
              <button
                type="button"
                className={`tryon-tab-item ${activeTab === 'camera' ? 'active' : ''}`}
                onClick={() => setActiveTab('camera')}
                disabled={status === 'processing'}
              >
                <Camera size={14} />
                Chụp Qua Camera
              </button>
              <button
                type="button"
                className={`tryon-tab-item ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => setActiveTab('upload')}
                disabled={status === 'processing'}
              >
                <Upload size={14} />
                Tải Ảnh Cá Nhân
              </button>
            </div>

            {/* Nội dung chính */}
            <div className="tryon-body">
              {/* Cột trái: Chọn hoặc chụp người mẫu */}
              <div>
                {/* TAB 1: Danh sách người mẫu có sẵn */}
                {activeTab === 'models' && (
                  <div>
                    <div className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-2.5">
                      Chọn người mẫu phù hợp vóc dáng:
                    </div>
                    <div className="tryon-models-grid">
                      {DEMO_MODELS.map((model) => (
                        <div
                          key={model.id}
                          className={`tryon-model-card ${selectedModel.id === model.id ? 'selected' : ''}`}
                          onClick={() => setSelectedModel(model)}
                        >
                          <img src={model.imageUrl} alt={model.name} />
                          <div className="tryon-model-card-info">
                            <div className="font-bold text-xs line-clamp-1">{model.name}</div>
                            <div className="text-[0.65rem] text-content-muted">
                              {model.height} • {model.weight}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 2: Camera WebRTC */}
                {activeTab === 'camera' && (
                  <div className="space-y-3">
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
                            startCamera();
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
                          <div className="flex flex-col items-center justify-center h-full p-4 text-center text-status-error text-xs gap-2">
                            <ShieldAlert size={28} />
                            <span>{cameraError}</span>
                            <button
                              type="button"
                              onClick={startCamera}
                              className="mt-2 px-3 py-1 bg-surface border border-line rounded text-content-primary"
                            >
                              Thử lại
                            </button>
                          </div>
                        ) : (
                          <>
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="tryon-camera-video"
                            />
                            <div className="tryon-camera-guide" />
                            <div className="absolute bottom-4 inset-x-0 flex justify-center z-10">
                              <button
                                type="button"
                                onClick={handleCapturePhoto}
                                className="w-14 h-14 rounded-full bg-accent-gold text-surface-dark flex items-center justify-center shadow-lg border-4 border-white/30 hover:scale-105 active:scale-95 transition-all"
                                title="Bấm chụp ảnh chân dung"
                              >
                                <Camera size={24} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: Tải ảnh từ máy */}
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
                      <div className="tryon-dropzone" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={32} className="text-accent-gold mb-2" />
                        <div className="font-bold text-xs text-content-primary mb-1">
                          Nhấn để tải ảnh chân dung / toàn thân
                        </div>
                        <div className="text-[0.7rem] text-content-muted max-w-[240px]">
                          Hỗ trợ định dạng JPG, PNG, WEBP. Tỉ lệ ảnh đứng (3:4) cho độ ôm dáng tốt nhất.
                        </div>
                      </div>
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
                  {/* Người mẫu được chọn */}
                  <div className="tryon-duo-card">
                    <img src={currentPersonPreview} alt="Người mẫu" />
                    <span className="tryon-duo-tag">Người mẫu</span>
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

                {/* Nút bấm Thử Đồ Bằng AI Engine */}
                <button
                  type="button"
                  className="tryon-btn-action"
                  onClick={handleStartTryOn}
                  disabled={status === 'processing'}
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
