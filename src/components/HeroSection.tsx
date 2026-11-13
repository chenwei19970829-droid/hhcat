import React, { useState, useEffect, useRef } from 'react';
import { STORE_INFO } from '../data/catVillaData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { compressImage } from '../utils/imageCompressor';
import { useStoreOwner } from '../utils/adminAuth';
import { StoreOwnerAuthModal } from './StoreOwnerAuthModal';
import { MultiPhotoLightbox } from './MultiPhotoLightbox';
import {
  Sparkles,
  Truck,
  MessageCircle,
  Calculator,
  MapPin,
  Eye,
  Hammer,
  ShieldCheck,
  Phone,
  ChevronLeft,
  ChevronRight,
  Upload,
  Trash2,
  Lock,
  Navigation,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface StorefrontPhotoItem {
  id: string;
  imageUrl: string;
  caption?: string;
  isDefault?: boolean;
}

interface HeroSectionProps {
  onOpenEstimator: () => void;
  onViewMenuImages: () => void;
  onOpenImageZoom?: (title: string, imageUrl: string, subtitle?: string) => void;
}

const STOREFRONT_STORAGE_KEY = 'hhcat_storefront_photos_v1';
const DELETED_STOREFRONT_KEY = 'hhcat_deleted_storefront_ids_v1';

const DEFAULT_STOREFRONT_PHOTO: StorefrontPhotoItem = {
  id: 'default-storefront',
  imageUrl: STORE_INFO.storefrontImage,
  caption: '實體門店現場實景 · 臺中豐原',
  isDefault: true
};

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenEstimator,
  onViewMenuImages
}) => {
  const { isOwner, logout } = useStoreOwner();

  const [storefrontPhotos, setStorefrontPhotos] = useState<StorefrontPhotoItem[]>([DEFAULT_STOREFRONT_PHOTO]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Lightbox state for storefront carousel
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Owner auth & upload modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authActionTitle, setAuthActionTitle] = useState('管理門店實景照片');
  const [pendingAuthAction, setPendingAuthAction] = useState<'upload' | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadImages, setUploadImages] = useState<string[]>([]);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial localStorage & subscribe to Firestore storefrontPhotos
  useEffect(() => {
    try {
      const deletedJson = localStorage.getItem(DELETED_STOREFRONT_KEY);
      const deletedIds: string[] = deletedJson ? JSON.parse(deletedJson) : [];
      const savedJson = localStorage.getItem(STOREFRONT_STORAGE_KEY);
      if (savedJson) {
        const parsed: StorefrontPhotoItem[] = JSON.parse(savedJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter((p) => p && p.imageUrl && !deletedIds.includes(p.id));
          if (valid.length > 0) {
            setStorefrontPhotos(valid);
          }
        }
      }
    } catch (e) {
      console.warn('Error loading storefront photos:', e);
    }

    const unsubscribe = onSnapshot(
      collection(db, 'storefrontPhotos'),
      (snapshot) => {
        const deletedFromCloud = new Set<string>();
        const remotePhotos: StorefrontPhotoItem[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.deleted === true) {
            deletedFromCloud.add(data.id || docSnap.id);
          } else if (data.id && data.imageUrl) {
            remotePhotos.push({
              id: data.id,
              imageUrl: data.imageUrl,
              caption: data.caption || '實體門店現場實景 · 臺中豐原'
            });
          }
        });

        // Sort newest uploaded first, keep default if not deleted
        remotePhotos.sort((a, b) => (b.id > a.id ? 1 : -1));
        const hasDefault = !deletedFromCloud.has(DEFAULT_STOREFRONT_PHOTO.id);
        const combined = hasDefault
          ? [DEFAULT_STOREFRONT_PHOTO, ...remotePhotos]
          : remotePhotos.length > 0
          ? remotePhotos
          : [DEFAULT_STOREFRONT_PHOTO];

        setStorefrontPhotos(combined);
        try {
          localStorage.setItem(STOREFRONT_STORAGE_KEY, JSON.stringify(combined));
        } catch (err) {
          console.warn(err);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'storefrontPhotos');
      }
    );

    return () => unsubscribe();
  }, []);

  // Keep activeIndex valid when photos array changes
  useEffect(() => {
    if (activeIndex >= storefrontPhotos.length) {
      setActiveIndex(0);
    }
  }, [storefrontPhotos.length, activeIndex]);

  // Auto-advance carousel every 4.5 seconds when >1 photo
  useEffect(() => {
    if (storefrontPhotos.length <= 1 || isPaused || isUploadModalOpen || lightboxOpen) {
      return;
    }
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % storefrontPhotos.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [storefrontPhotos.length, isPaused, isUploadModalOpen, lightboxOpen]);

  const handlePrevSlide = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (storefrontPhotos.length <= 1) return;
    setActiveIndex((prev) => (prev === 0 ? storefrontPhotos.length - 1 : prev - 1));
  };

  const handleNextSlide = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (storefrontPhotos.length <= 1) return;
    setActiveIndex((prev) => (prev + 1) % storefrontPhotos.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches && e.touches.length > 0) {
      setTouchStartX(e.touches[0].clientX);
      setIsPaused(true);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX !== null && storefrontPhotos.length > 1) {
      const endX = e.changedTouches?.[0]?.clientX;
      if (typeof endX === 'number') {
        const diff = touchStartX - endX;
        if (diff > 40) {
          handleNextSlide();
        } else if (diff < -40) {
          handlePrevSlide();
        }
      }
    }
    setTouchStartX(null);
    setTimeout(() => setIsPaused(false), 2000);
  };

  const handleOpenUpload = () => {
    if (!isOwner) {
      setAuthActionTitle('上傳門店實景照片');
      setPendingAuthAction('upload');
      setIsAuthModalOpen(true);
      return;
    }
    setIsUploadModalOpen(true);
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      setUploadError(null);
      const compressedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const compressed = await compressImage(file, 960, 0.74);
          compressedList.push(compressed);
        }
      }
      if (compressedList.length > 0) {
        setUploadImages((prev) => [...prev, ...compressedList]);
      }
    } catch {
      setUploadError('照片處理失敗，請換一張再試');
    } finally {
      e.target.value = '';
    }
  };

  const handleSaveStorefrontPhotos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadImages.length === 0) {
      setUploadError('請至少選擇一張門店實景照片');
      return;
    }
    setIsSaving(true);
    setUploadError(null);

    try {
      const createdItems: StorefrontPhotoItem[] = [];
      for (let i = 0; i < uploadImages.length; i++) {
        const newId = `sf-${Date.now()}-${i}`;
        const item: StorefrontPhotoItem = {
          id: newId,
          imageUrl: uploadImages[i],
          caption: uploadCaption.trim() || '臺中豐原門店實景展示'
        };
        createdItems.push(item);

        await setDoc(doc(db, 'storefrontPhotos', newId), {
          id: newId,
          imageUrl: item.imageUrl,
          caption: item.caption,
          deleted: false,
          createdAt: new Date().toISOString()
        });
      }

      const updated = [...storefrontPhotos, ...createdItems];
      setStorefrontPhotos(updated);
      try {
        localStorage.setItem(STOREFRONT_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn(err);
      }
      setActiveIndex(updated.length - 1);
      setUploadImages([]);
      setUploadCaption('');
      setIsUploadModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'storefrontPhotos');
      setUploadError('上傳雲端時發生錯誤，請稍後再試');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCurrentPhoto = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) {
      setAuthActionTitle('刪除門店實景照片');
      setPendingAuthAction(null);
      setIsAuthModalOpen(true);
      return;
    }

    const currentPhoto = storefrontPhotos[activeIndex];
    if (!currentPhoto) return;
    if (storefrontPhotos.length <= 1) {
      setUploadError('門店實景至少需保留一張照片展示');
      return;
    }
    if (!window.confirm('確定要刪除目前這張門店實景照片嗎？')) return;

    try {
      const deletedJson = localStorage.getItem(DELETED_STOREFRONT_KEY);
      const deletedIds: string[] = deletedJson ? JSON.parse(deletedJson) : [];
      if (!deletedIds.includes(currentPhoto.id)) {
        deletedIds.push(currentPhoto.id);
        localStorage.setItem(DELETED_STOREFRONT_KEY, JSON.stringify(deletedIds));
      }
    } catch (err) {
      console.warn(err);
    }

    const updated = storefrontPhotos.filter((p) => p.id !== currentPhoto.id);
    setStorefrontPhotos(updated);
    setActiveIndex(0);
    try {
      localStorage.setItem(STOREFRONT_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn(err);
    }

    try {
      await setDoc(doc(db, 'storefrontPhotos', currentPhoto.id), {
        id: currentPhoto.id,
        deleted: true,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `storefrontPhotos/${currentPhoto.id}`);
    }
  };

  const currentPhoto = storefrontPhotos[activeIndex] || DEFAULT_STOREFRONT_PHOTO;

  return (
    <section className="relative overflow-hidden pt-6 pb-16 lg:pt-14 lg:pb-22 border-b border-stone-200">
      {/* Subtle Warm Background Accent */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-stone-200/40 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Headlines & Brand Proposition (order-2 on mobile, order-1 on desktop) */}
          <div className="order-2 lg:order-1 lg:col-span-7 space-y-6">
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-3 bg-white/90 border border-amber-900/15 shadow-sm rounded-2xl p-2.5 pr-4 w-fit">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white p-0.5 border border-amber-900/20 shrink-0">
                <img
                  src={STORE_INFO.logoImage || '/assets/aistudio/logo_6994c231.jpg'}
                  alt="花花招財貓 LOGO"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-serif-title font-bold text-stone-900 text-base sm:text-lg block leading-tight">
                  {STORE_INFO.name}
                </span>
                <span className="text-[11px] text-stone-500 font-medium block">
                  手工客製實木貓別墅 · 臺中豐原門店
                </span>
              </div>
            </div>

            <h1 className="font-serif-title text-lg min-[380px]:text-xl sm:text-3xl lg:text-4xl font-bold text-stone-900 tracking-tight leading-snug sm:leading-[1.35]">
              <span className="block">捨棄華麗包裝，只留頂級好木頭，</span>
              <span className="block text-amber-900 mt-1 sm:mt-1.5">為貓貓築起最安心的專屬城堡</span>
            </h1>

            {/* Core Craft & Service Highlights (Concise, Non-repetitive) */}
            <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 max-w-2xl shadow-xs">
              <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-amber-950">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-amber-800 text-white text-xs">★</span>
                <span>堅持做自己也敢讓花花住的好木頭</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-[13px] text-stone-700">
                <div className="bg-white/85 p-3.5 rounded-xl border border-amber-200/60 flex items-start gap-2.5 shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-stone-900 block font-semibold">天然松木無甲醛・1.5cm 實木板</strong>
                    <span className="text-stone-600 text-xs leading-relaxed block mt-1">
                      微防水防潮塗裝搭配高透安全壓克力門片，穩固耐用不搖晃。
                    </span>
                  </div>
                </div>

                <div className="bg-white/85 p-3.5 rounded-xl border border-amber-200/60 flex items-start gap-2.5 shadow-2xs">
                  <Hammer className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-stone-900 block font-semibold">1:1 依圖客製・預留精準孔位</strong>
                    <span className="text-stone-600 text-xs leading-relaxed block mt-1">
                      長寬高與內部跳台全客製，特別訂製款出貨前提供實拍確認。
                    </span>
                  </div>
                </div>

                <div className="bg-white/85 p-3.5 rounded-xl border border-amber-200/60 flex items-start gap-2.5 shadow-2xs">
                  <Truck className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-stone-900 block font-semibold">工廠直寄台灣免運配送</strong>
                    <span className="text-stone-600 text-xs leading-relaxed block mt-1">
                      新竹物流加固宅配至一樓（偏遠及離島除外），也可預約到府安裝。
                    </span>
                  </div>
                </div>

                <div className="bg-white/85 p-3.5 rounded-xl border border-amber-200/60 flex items-start gap-2.5 shadow-2xs">
                  <Sparkles className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-stone-900 block font-semibold">1 年保固・專屬組裝教學</strong>
                    <span className="text-stone-600 text-xs leading-relaxed block mt-1">
                      憑拆箱全程錄影享非人為損壞補件，並附店長親自示範教學影片。
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTAs (Streamlined: Single Primary LINE CTA + Estimator + Paper Menu) */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={STORE_INFO.lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-semibold text-white bg-[#06C755] hover:bg-[#05b34c] rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>加 LINE 諮詢客製（{STORE_INFO.lineId}）</span>
              </a>

              <button
                type="button"
                onClick={onOpenEstimator}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-semibold text-stone-800 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl shadow-xs hover:border-amber-800 transition-all active:scale-[0.98]"
              >
                <Calculator className="w-4 h-4 text-amber-800" />
                <span>線上即時試算估價</span>
              </button>

              <button
                type="button"
                onClick={onViewMenuImages}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-3.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-stone-400" />
                <span>查看門店原裝價目單 (5張)</span>
              </button>
            </div>
          </div>

          {/* Storefront Photo Showcase Carousel (order-1 on mobile: appears FIRST at top of phone screen) */}
          <div className="order-1 lg:order-2 lg:col-span-5">
            <div
              className="relative bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-md hover:shadow-lg transition-shadow"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {/* Card Header info + Owner Controls */}
              <div className="flex items-start justify-between gap-2 pb-3.5 border-b border-stone-100">
                <div>
                  <div className="text-[11px] font-bold tracking-wider text-amber-800 uppercase">
                    實體門店展示倉儲中心 · 臺中豐原
                  </div>
                  <div className="font-serif-title font-bold text-stone-900 text-lg sm:text-xl mt-0.5">
                    花花招財貓 · 門店實景
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isOwner ? (
                    <>
                      <button
                        type="button"
                        onClick={handleOpenUpload}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-lg transition-colors"
                        title="上傳門店實景照片"
                      >
                        <Upload className="w-3 h-3" />
                        <span>上傳</span>
                      </button>
                      {storefrontPhotos.length > 1 && (
                        <button
                          type="button"
                          onClick={handleDeleteCurrentPhoto}
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                          title="刪除目前這張照片"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>刪除</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={logout}
                        className="px-2 py-1.5 text-[11px] text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                        title="鎖定店主管理權限"
                      >
                        鎖定
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleOpenUpload}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                      title="店主上傳/管理門店實景照"
                    >
                      <Lock className="w-3 h-3 text-amber-800" />
                      <span>店主管理</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Storefront Multi-Photo Auto-Advancing Carousel */}
              <div
                onClick={() => setLightboxOpen(true)}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="relative mt-3.5 rounded-xl overflow-hidden aspect-4/3 sm:aspect-16/11 bg-stone-100 border border-amber-900/10 cursor-pointer group select-none touch-pan-y"
              >
                <img
                  src={currentPhoto.imageUrl}
                  alt={currentPhoto.caption || '花花招財貓實體門店'}
                  className="w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.02]"
                  draggable={false}
                />

                {/* Gradient vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20 pointer-events-none" />

                {/* Top Overlay: Counter & Zoom Hint */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <div className="bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-md border border-white/20">
                    {currentPhoto.caption || '實體門店現場實景 · 臺中豐原'}
                  </div>
                  {storefrontPhotos.length > 1 && (
                    <div className="bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-mono font-bold px-2 py-1 rounded-md">
                      {activeIndex + 1} / {storefrontPhotos.length}
                    </div>
                  )}
                </div>

                {/* Manual Left / Right Navigation Arrows */}
                {storefrontPhotos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevSlide}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/85 hover:bg-white text-stone-900 shadow-lg backdrop-blur-xs transition-all hover:scale-105 active:scale-95 z-10"
                      aria-label="上一張門店實景"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextSlide}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/85 hover:bg-white text-stone-900 shadow-lg backdrop-blur-xs transition-all hover:scale-105 active:scale-95 z-10"
                      aria-label="下一張門店實景"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Bottom Info & Pagination Dots */}
                <div className="absolute bottom-3 left-3 right-3 text-white flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold leading-snug drop-shadow-sm truncate">
                      客製化 精品實木貓別墅 倉儲中心
                    </div>
                    <div className="text-[11px] text-stone-200/90 drop-shadow-xs truncate">
                      歡迎預約親臨看實木樣板 · 點擊照片可放大瀏覽
                    </div>
                  </div>

                  {storefrontPhotos.length > 1 && (
                    <div className="flex items-center gap-1.5 shrink-0 pb-0.5" onClick={(e) => e.stopPropagation()}>
                      {storefrontPhotos.map((p, idx) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setActiveIndex(idx)}
                          className={`h-2 rounded-full transition-all ${
                            activeIndex === idx ? 'w-5 bg-amber-400' : 'w-2 bg-white/60 hover:bg-white'
                          }`}
                          aria-label={`切換至第 ${idx + 1} 張實景`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Storefront Specs Footer: Clickable Full Address (Map Navigation) + Clickable Phone Reservation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4 pt-3.5 border-t border-stone-100 text-xs">
                <a
                  href={STORE_INFO.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 hover:bg-amber-50 border border-stone-200/80 hover:border-amber-300 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 group-hover:bg-amber-900 group-hover:text-white transition-colors">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] text-stone-500">門店實體展示（點擊導航）</span>
                    <span className="font-bold text-stone-900 block leading-snug mt-0.5">
                      {STORE_INFO.address}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 font-semibold mt-0.5">
                      <Navigation className="w-2.5 h-2.5" />
                      <span>開啟 Google 地圖</span>
                    </span>
                  </div>
                </a>

                <a
                  href={`tel:${STORE_INFO.phone}`}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/80 hover:border-amber-400 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-900 text-white flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] text-amber-900 font-medium">來店預約專線（點擊撥打）</span>
                    <span className="font-mono font-bold text-stone-900 text-sm block leading-snug mt-0.5">
                      {STORE_INFO.phoneDisplay}
                    </span>
                    <span className="block text-[10px] text-stone-500 mt-0.5">
                      來店前請先預約避免跑空
                    </span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Store Owner Multi-Photo Upload Modal */}
      {isUploadModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setIsUploadModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200 overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif-title font-bold text-stone-900 text-base">
                    上傳門店實景照片
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    支援連續選取多張照片，上傳後立即同步首頁輪播
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStorefrontPhotos} className="space-y-4 text-xs">
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleFilesSelected}
                  className="hidden"
                />

                {uploadImages.length > 0 ? (
                  <div className="space-y-2.5">
                    <div className="relative aspect-16/10 bg-stone-100 rounded-xl overflow-hidden border border-stone-200 flex items-center justify-center">
                      <img
                        src={uploadImages[0]}
                        alt="門市實景預覽"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-2 right-2 bg-stone-900/85 hover:bg-stone-900 text-white text-xs px-3 py-1.5 rounded-lg font-semibold"
                      >
                        + 繼續新增照片
                      </button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {uploadImages.map((imgUrl, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-stone-300 shrink-0">
                          <img src={imgUrl} alt={`預覽 ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setUploadImages((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-0 right-0 bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-bl font-bold"
                            title="移除此張"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-stone-300 hover:border-amber-700 bg-stone-50 rounded-xl p-8 text-center cursor-pointer transition-colors"
                  >
                    <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                    <p className="font-semibold text-stone-700">點擊選取門店實景照片（支援多張）</p>
                    <p className="text-[11px] text-stone-400 mt-1">上傳後自動壓縮並同步顯示於所有訪客手機與電腦</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  照片簡短說明（選填）
                </label>
                <input
                  type="text"
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="例如：豐原門市一樓展示區實景"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-800/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-amber-900 hover:bg-amber-800 text-white font-semibold rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-60"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{isSaving ? '上傳同步中...' : '確認發佈實景照'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Store Owner Auth Modal */}
      <StoreOwnerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingAuthAction(null);
        }}
        onSuccess={() => {
          if (pendingAuthAction === 'upload') {
            setIsUploadModalOpen(true);
          }
          setPendingAuthAction(null);
        }}
        actionTitle={authActionTitle}
      />

      {/* Multi-Photo Lightbox for Storefront */}
      <MultiPhotoLightbox
        isOpen={lightboxOpen}
        title="花花招財貓 · 臺中豐原門店實景"
        images={storefrontPhotos.map((p) => p.imageUrl)}
        initialIndex={activeIndex}
        subtitle={`${STORE_INFO.address} · 預約專線 ${STORE_INFO.phoneDisplay}`}
        onClose={() => setLightboxOpen(false)}
      />
    </section>
  );
};
