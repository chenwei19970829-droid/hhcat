import React, { useCallback, useEffect, useRef, useState } from 'react';
import { STORE_INFO } from '../data/catVillaData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, getDocsFromServer, onSnapshot, setDoc } from 'firebase/firestore';
import { compressImage } from '../utils/imageCompressor';
import { useStoreOwner } from '../utils/adminAuth';
import { StoreOwnerAuthModal } from './StoreOwnerAuthModal';
import { MultiPhotoLightbox } from './MultiPhotoLightbox';
import { ImageProtectionLayer, protectedMediaContainerProps } from './ImageProtectionLayer';
import { CloudErrorState, CloudSyncStatusBar } from './CloudSyncStatusBar';
import {
  fitImagesWithinFirestoreLimit,
  formatFirestoreActionError,
  isQuotaError,
  loadRecoveryQueue,
  saveRecoveryQueue
} from '../utils/cloudSync';
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
  Navigation,
  X,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

interface StorefrontPhotoItem {
  id: string;
  imageUrl: string;
  caption?: string;
  isDefault?: boolean;
  watermarked?: boolean;
}

interface HeroSectionProps {
  onOpenEstimator: () => void;
  onViewMenuImages: () => void;
  onOpenImageZoom?: (title: string, imageUrl: string, subtitle?: string) => void;
  onNavigateToPath?: (path: string) => void;
}

const STOREFRONT_STORAGE_KEY = 'hhcat_storefront_photos_v1';
const DELETED_STOREFRONT_KEY = 'hhcat_deleted_storefront_ids_v1';
const STOREFRONT_RECOVERY_KEY = 'hhcat_storefront_unsynced_recovery_v1';

const DEFAULT_STOREFRONT_PHOTO: StorefrontPhotoItem = {
  id: 'default-storefront',
  imageUrl: STORE_INFO.storefrontImage,
  caption: '實體門店現場實景 · 臺中豐原',
  isDefault: true
};

const getLocalDeletedStorefrontIds = (): string[] => {
  try {
    const raw = localStorage.getItem(DELETED_STOREFRONT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

const addLocalDeletedStorefrontId = (id: string) => {
  try {
    const ids = getLocalDeletedStorefrontIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(DELETED_STOREFRONT_KEY, JSON.stringify(ids));
    }
  } catch (err) {
    console.warn('Could not save deleted storefront id:', err);
  }
};

const removeLocalDeletedStorefrontId = (id: string) => {
  try {
    const ids = getLocalDeletedStorefrontIds();
    if (ids.includes(id)) {
      localStorage.setItem(
        DELETED_STOREFRONT_KEY,
        JSON.stringify(ids.filter((x) => x !== id))
      );
    }
  } catch (err) {
    console.warn('Could not remove deleted storefront id:', err);
  }
};

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenEstimator,
  onViewMenuImages,
  onNavigateToPath
}) => {
  const { isOwner, logout } = useStoreOwner();

  const [storefrontPhotos, setStorefrontPhotos] = useState<StorefrontPhotoItem[]>([DEFAULT_STOREFRONT_PHOTO]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Cloud sync & recovery state
  const [cloudError, setCloudError] = useState<CloudErrorState | null>(null);
  const [cloudItemIds, setCloudItemIds] = useState<Set<string>>(() => new Set());
  const [unsyncedLocalPhotos, setUnsyncedLocalPhotos] = useState<StorefrontPhotoItem[]>(() =>
    loadRecoveryQueue<StorefrontPhotoItem>(STOREFRONT_RECOVERY_KEY)
  );
  const [isSyncingManual, setIsSyncingManual] = useState(false);
  const [syncNoticeBanner, setSyncNoticeBanner] = useState<string | null>(null);

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
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [autoWatermark, setAutoWatermark] = useState(true);

  // In-app delete confirmation modal
  const [deletingPhoto, setDeletingPhoto] = useState<StorefrontPhotoItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyFirestoreSnapshotDocs = useCallback(
    (docs: Array<{ id: string; data: () => Record<string, unknown> }>) => {
      const deletedFromCloud = new Set<string>();
      const remotePhotos: StorefrontPhotoItem[] = [];

      docs.forEach((docSnap) => {
        const data = docSnap.data();
        const resolvedId = (typeof data.id === 'string' && data.id) || docSnap.id;
        if (data.deleted === true) {
          deletedFromCloud.add(resolvedId);
        } else if (resolvedId && typeof data.imageUrl === 'string' && data.imageUrl) {
          remotePhotos.push({
            id: resolvedId,
            imageUrl: data.imageUrl,
            caption:
              typeof data.caption === 'string' && data.caption
                ? data.caption
                : '實體門店現場實景 · 臺中豐原',
            watermarked: data.watermarked === true
          });
        }
      });

      remotePhotos.sort((a, b) => (b.id > a.id ? 1 : -1));
      const mergedDeleted = new Set<string>([
        ...Array.from(deletedFromCloud),
        ...getLocalDeletedStorefrontIds()
      ]);

      const activeRemotes = remotePhotos.filter((r) => !mergedDeleted.has(r.id));
      const cloudIdsSet = new Set(activeRemotes.map((r) => r.id));

      // Rescue any storefront photos stranded in localStorage
      const strandedMap = new Map<string, StorefrontPhotoItem>();
      loadRecoveryQueue<StorefrontPhotoItem>(STOREFRONT_RECOVERY_KEY).forEach((p) => {
        if (p && p.id && !p.isDefault && !cloudIdsSet.has(p.id) && !mergedDeleted.has(p.id)) {
          strandedMap.set(p.id, p);
        }
      });

      try {
        const cachedRaw = localStorage.getItem(STOREFRONT_STORAGE_KEY);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          if (Array.isArray(parsed)) {
            parsed.forEach((p) => {
              if (
                p &&
                p.id &&
                p.id !== DEFAULT_STOREFRONT_PHOTO.id &&
                !p.isDefault &&
                !cloudIdsSet.has(p.id) &&
                !mergedDeleted.has(p.id)
              ) {
                strandedMap.set(p.id, p as StorefrontPhotoItem);
              }
            });
          }
        }
      } catch {
        // ignore
      }

      const strandedList = Array.from(strandedMap.values());
      saveRecoveryQueue(STOREFRONT_RECOVERY_KEY, strandedList);

      const hasDefault = !mergedDeleted.has(DEFAULT_STOREFRONT_PHOTO.id);
      const combined = hasDefault
        ? [DEFAULT_STOREFRONT_PHOTO, ...activeRemotes]
        : activeRemotes.length > 0
          ? activeRemotes
          : [DEFAULT_STOREFRONT_PHOTO];

      setCloudError(null);
      setCloudItemIds(cloudIdsSet);
      setUnsyncedLocalPhotos(strandedList);
      setStorefrontPhotos(combined);
      try {
        localStorage.setItem(STOREFRONT_STORAGE_KEY, JSON.stringify(combined));
      } catch (err) {
        console.warn(err);
      }
    },
    []
  );

  // Load initial localStorage & subscribe to Firestore storefrontPhotos
  useEffect(() => {
    try {
      const deletedIds = getLocalDeletedStorefrontIds();
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
        applyFirestoreSnapshotDocs(snapshot.docs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'storefrontPhotos');
        setCloudError({
          message: formatFirestoreActionError(error, '讀取雲端門店實景照片'),
          isQuota: isQuotaError(error)
        });
      }
    );

    return () => unsubscribe();
  }, [applyFirestoreSnapshotDocs]);

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

  const handleManualCloudRefresh = async () => {
    if (isSyncingManual) return;
    setIsSyncingManual(true);
    setSyncNoticeBanner(null);
    try {
      const serverSnap = await getDocsFromServer(collection(db, 'storefrontPhotos'));
      applyFirestoreSnapshotDocs(serverSnap.docs);
      const activeCount = serverSnap.docs.filter((d) => d.data().deleted !== true).length;
      setSyncNoticeBanner(
        `已完成門店實景雲端校對（雲端共 ${activeCount} 張照片），手機與電腦現為完全一致內容。`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'storefrontPhotos');
      setCloudError({
        message: formatFirestoreActionError(err, '手動重整門店實景雲端'),
        isQuota: isQuotaError(err)
      });
    } finally {
      setIsSyncingManual(false);
    }
  };

  const syncStrandedStorefrontPhoto = async (localPhoto: StorefrontPhotoItem): Promise<boolean> => {
    const nowIso = new Date().toISOString();
    const meta = {
      id: localPhoto.id,
      caption: localPhoto.caption || '臺中豐原門店實景展示',
      watermarked: Boolean(localPhoto.watermarked),
      deleted: false,
      createdAt: nowIso
    };
    try {
      const fitted = await fitImagesWithinFirestoreLimit([localPhoto.imageUrl], meta, {
        primaryField: 'imageUrl'
      });
      if (!fitted.ok) {
        setCloudError({ message: fitted.reason, isQuota: false });
        return false;
      }

      await setDoc(doc(db, 'storefrontPhotos', localPhoto.id), {
        ...meta,
        imageUrl: fitted.images[0]
      });

      const synced: StorefrontPhotoItem = {
        ...localPhoto,
        imageUrl: fitted.images[0]
      };
      removeLocalDeletedStorefrontId(localPhoto.id);
      setUnsyncedLocalPhotos((prev) => {
        const next = prev.filter((p) => p.id !== localPhoto.id);
        saveRecoveryQueue(STOREFRONT_RECOVERY_KEY, next);
        return next;
      });
      setCloudItemIds((prev) => new Set(prev).add(localPhoto.id));
      setCloudError(null);
      setStorefrontPhotos((prev) => {
        const updated = [...prev.filter((p) => p.id !== synced.id), synced];
        try {
          localStorage.setItem(STOREFRONT_STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `storefrontPhotos/${localPhoto.id}`);
      setCloudError({
        message: formatFirestoreActionError(err, '補傳門店實景照片至雲端'),
        isQuota: isQuotaError(err)
      });
      return false;
    }
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      setIsProcessingImages(true);
      setUploadError(null);
      const compressedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const compressed = await compressImage(file, 840, 0.7, { watermark: autoWatermark });
          compressedList.push(compressed);
        }
      }
      if (compressedList.length > 0) {
        setUploadImages((prev) => [...prev, ...compressedList]);
      }
    } catch {
      setUploadError('照片處理失敗，請換一張再試');
    } finally {
      setIsProcessingImages(false);
      e.target.value = '';
    }
  };

  const handleSaveStorefrontPhotos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (uploadImages.length === 0) {
      setUploadError('請至少選擇一張門店實景照片');
      return;
    }
    setIsSaving(true);
    setUploadError(null);

    const createdItems: StorefrontPhotoItem[] = [];
    const captionText = uploadCaption.trim() || '臺中豐原門店實景展示';

    try {
      for (let i = 0; i < uploadImages.length; i++) {
        const newId = `sf-${Date.now()}-${i}`;
        const nowIso = new Date().toISOString();
        const meta = {
          id: newId,
          caption: captionText,
          watermarked: autoWatermark,
          deleted: false,
          createdAt: nowIso
        };

        const fitted = await fitImagesWithinFirestoreLimit([uploadImages[i]], meta, {
          primaryField: 'imageUrl'
        });
        if (!fitted.ok) {
          throw new Error(fitted.reason);
        }

        const item: StorefrontPhotoItem = {
          id: newId,
          imageUrl: fitted.images[0],
          caption: captionText,
          watermarked: autoWatermark
        };

        await setDoc(doc(db, 'storefrontPhotos', newId), {
          ...meta,
          imageUrl: item.imageUrl
        });

        createdItems.push(item);
      }

      const updated = [...storefrontPhotos, ...createdItems];
      setStorefrontPhotos(updated);
      try {
        localStorage.setItem(STOREFRONT_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn(err);
      }
      setCloudItemIds((prev) => {
        const next = new Set(prev);
        createdItems.forEach((c) => next.add(c.id));
        return next;
      });
      setCloudError(null);
      setActiveIndex(updated.length - 1);
      setUploadImages([]);
      setUploadCaption('');
      setIsUploadModalOpen(false);
      setSyncNoticeBanner(
        `已成功上傳 ${createdItems.length} 張門店實景照並寫入雲端資料庫，手機、電腦、平板訪客皆可即時查看！`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'storefrontPhotos');
      if (createdItems.length > 0) {
        const updated = [...storefrontPhotos, ...createdItems];
        setStorefrontPhotos(updated);
        setUploadImages((prev) => prev.slice(createdItems.length));
      }
      const msg = formatFirestoreActionError(err, '上傳門店實景照至雲端');
      setUploadError(msg);
      if (isQuotaError(err)) {
        setCloudError({ message: msg, isQuota: true });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestDeleteCurrentPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) {
      setAuthActionTitle('刪除門店實景照片');
      setPendingAuthAction(null);
      setIsAuthModalOpen(true);
      return;
    }

    const photoToDelete = storefrontPhotos[activeIndex];
    if (!photoToDelete) return;
    if (storefrontPhotos.length <= 1) {
      setCloudError({ message: '門店實景至少需保留一張照片展示，無法刪除最後一張。', isQuota: false });
      return;
    }
    setDeleteError(null);
    setDeletingPhoto(photoToDelete);
  };

  const handleConfirmDeletePhoto = async () => {
    if (!deletingPhoto || isDeleting) return;
    const targetPhoto = deletingPhoto;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await setDoc(doc(db, 'storefrontPhotos', targetPhoto.id), {
        id: targetPhoto.id,
        deleted: true,
        updatedAt: new Date().toISOString()
      });

      addLocalDeletedStorefrontId(targetPhoto.id);
      const updated = storefrontPhotos.filter((p) => p.id !== targetPhoto.id);
      setStorefrontPhotos(updated);
      setActiveIndex(0);
      try {
        localStorage.setItem(STOREFRONT_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn(err);
      }
      setCloudItemIds((prev) => {
        const next = new Set(prev);
        next.delete(targetPhoto.id);
        return next;
      });
      setDeletingPhoto(null);
      setSyncNoticeBanner('已從雲端移除該張門店實景照片，手機與電腦已同步更新。');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `storefrontPhotos/${targetPhoto.id}`);
      const msg = formatFirestoreActionError(err, '雲端刪除門店實景照片');
      setDeleteError(msg);
      if (isQuotaError(err)) {
        setCloudError({ message: msg, isQuota: true });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const currentPhoto = storefrontPhotos[activeIndex] || DEFAULT_STOREFRONT_PHOTO;

  return (
    <section className="relative overflow-hidden pt-6 pb-16 lg:pt-14 lg:pb-22 border-b border-stone-200">
      {/* Subtle Warm Background Accent */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-stone-200/40 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {isOwner && (
          <CloudSyncStatusBar
            sectionLabel="門店實景輪播照片"
            cloudError={cloudError}
            onDismissError={() => setCloudError(null)}
            onRetrySync={handleManualCloudRefresh}
            syncNoticeBanner={syncNoticeBanner}
            onDismissNotice={() => setSyncNoticeBanner(null)}
            recoveryItems={unsyncedLocalPhotos.map((p) => ({
              id: p.id,
              title: p.caption || '門店實景照',
              subtitle: `ID: ${p.id}`,
              thumbnailUrl: p.imageUrl
            }))}
            isSyncing={isSyncingManual}
            onSyncRecoveryItem={async (id) => {
              const target = unsyncedLocalPhotos.find((p) => p.id === id);
              if (!target || isSyncingManual) return;
              setIsSyncingManual(true);
              const ok = await syncStrandedStorefrontPhoto(target);
              if (ok) {
                setSyncNoticeBanner('已將該張門店實景照片補傳至雲端，手機現在也可以看到了！');
              }
              setIsSyncingManual(false);
            }}
            onDiscardRecoveryItem={(id) => {
              setUnsyncedLocalPhotos((prev) => {
                const next = prev.filter((p) => p.id !== id);
                saveRecoveryQueue(STOREFRONT_RECOVERY_KEY, next);
                return next;
              });
              setSyncNoticeBanner('已移除僅存於本機的未同步實景照暫存。');
            }}
          />
        )}
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

            <h1 className="font-serif-title text-xl min-[380px]:text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-900 tracking-tight leading-snug sm:leading-[1.35]">
              <span className="block">
                <span className="inline-block whitespace-nowrap">純天然松木</span>
                <span className="mx-1.5 text-amber-800/70" aria-hidden="true">·</span>
                <span className="inline-block whitespace-nowrap">無甲醛實作</span>
              </span>
              <span className="block text-amber-900 mt-1.5">
                <span className="inline-block whitespace-nowrap">台中豐原實體店</span>
                <span className="inline-block whitespace-nowrap">客製貓別墅</span>
              </span>
            </h1>

            <ul className="space-y-1.5 text-xs sm:text-sm text-stone-600 leading-relaxed max-w-2xl">
              <li className="flex items-start gap-2">
                <span className="text-amber-800 font-bold shrink-0">•</span>
                <span>
                  <strong className="text-stone-900 inline-block whitespace-nowrap">足厚 1.5cm 純松木</strong>：穩固承重不搖晃，拒絕劣質貼皮薄板
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-800 font-bold shrink-0">•</span>
                <span>
                  <strong className="text-stone-900 inline-block whitespace-nowrap">微防水漆＋安全壓克力</strong>：防潮易擦拭，防爆高透不夾傷
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-800 font-bold shrink-0">•</span>
                <span>
                  <strong className="text-stone-900 inline-block whitespace-nowrap">門店看樣＋預組裝實拍</strong>：現場摸得到木料，客製出貨先驗收
                </span>
              </li>
            </ul>

            {/* Core Craft & Service Highlights */}
            <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 sm:p-5 space-y-4 max-w-2xl shadow-xs">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm sm:text-base font-bold text-amber-950">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-amber-800 text-white text-xs shrink-0">★</span>
                    <span>堅持做自己也敢讓花花住的好木頭</span>
                  </div>
                  {onNavigateToPath && (
                    <a
                      href="/guides/solid-wood-craft"
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigateToPath('/guides/solid-wood-craft');
                      }}
                      className="text-xs font-semibold text-amber-900 hover:underline whitespace-nowrap shrink-0"
                    >
                      1.5cm 實木 vs 市售薄板差異 →
                    </a>
                  )}
                </div>

                <p className="text-xs sm:text-[13px] text-stone-700 leading-relaxed">
                  我們深信，一座好的貓別墅不只是寵物家具，更是完美融入居家裝潢的美學延伸，以及守護毛孩健康的溫暖堡壘。
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-[13px] text-stone-700">
                <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200/60 flex items-start gap-2.5 shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-stone-900 block font-semibold leading-snug">
                      1.5cm 實木的厚實守護，告別搖晃不安
                    </strong>
                    <span className="text-stone-600 text-xs leading-relaxed block mt-1.5">
                      嚴選<span className="font-medium text-stone-800 whitespace-nowrap">天然松木無甲醛</span>，以 <span className="font-medium text-stone-800 whitespace-nowrap">1.5cm 實木板</span>打造卓越承重力，毛孩跑跳也<span className="font-medium text-stone-800 whitespace-nowrap">穩固耐用不搖晃</span>；搭配微防水防潮塗裝與高透安全壓克力門片，兼顧防護與透視美感。
                    </span>
                  </div>
                </div>

                <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200/60 flex items-start gap-2.5 shadow-2xs">
                  <Hammer className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-stone-900 block font-semibold leading-snug">
                      專業客製，完美契合您的想像
                    </strong>
                    <span className="text-stone-600 text-xs leading-relaxed block mt-1.5">
                      提供高度、深度、長度與內部跳台<span className="font-medium text-stone-800 whitespace-nowrap">全客製服務</span>，貼合居家動線；選擇特別訂製款的家長，出貨前更提供<span className="font-medium text-stone-800 whitespace-nowrap">專屬實拍確認</span>，安心見證每個細節。
                    </span>
                  </div>
                </div>

                <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200/60 flex items-start gap-2.5 shadow-2xs">
                  <Truck className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-stone-900 block font-semibold leading-snug">
                      尊榮配送與安心承諾
                    </strong>
                    <span className="text-stone-600 text-xs leading-relaxed block mt-1.5">
                      提供<span className="font-medium text-stone-800 whitespace-nowrap">工廠直寄台灣免運</span>，透過新竹物流加固宅配至一樓，亦可輕鬆預約<span className="font-medium text-stone-800 whitespace-nowrap">到府安裝服務</span>（偏遠及離島除外）。
                    </span>
                  </div>
                </div>

                <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200/60 flex items-start gap-2.5 shadow-2xs">
                  <Sparkles className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-stone-900 block font-semibold leading-snug">
                      頂級質感與售後保障
                    </strong>
                    <span className="text-stone-600 text-xs leading-relaxed block mt-1.5">
                      歡迎蒞臨<span className="font-medium text-stone-800 whitespace-nowrap">台中豐原實體門店</span>感受<span className="font-medium text-stone-800 whitespace-nowrap">看得到摸得到</span>的溫潤工藝；
                      <br />
                      拆箱全程錄影即享非人為損壞 <span className="font-medium text-stone-800 whitespace-nowrap">1 年免費補件</span>。
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-1 border-t border-amber-200/70 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950">
                <span>
                  立即探索更多客製靈感，為毛孩打造理想之境
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <a
                    href="#models"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('models')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="font-semibold text-amber-900 hover:underline whitespace-nowrap"
                  >
                    瀏覽精選款式 →
                  </a>
                  {onNavigateToPath && (
                    <a
                      href="/taichung-showroom"
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigateToPath('/taichung-showroom');
                      }}
                      className="font-semibold text-stone-800 hover:text-amber-900 hover:underline whitespace-nowrap"
                    >
                      預約豐原門市體驗 →
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* CTAs (Streamlined: Single Primary LINE CTA + Estimator + Showroom + Paper Menu) */}
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
                <span>30秒試算客製報價</span>
              </button>

              {onNavigateToPath && (
                <a
                  href="/taichung-showroom"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateToPath('/taichung-showroom');
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-3.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>預約豐原店看實木</span>
                </a>
              )}

              <button
                type="button"
                onClick={onViewMenuImages}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-3.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-stone-400" />
                <span>查看原裝價目單 (5張)</span>
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

                {isOwner && (
                  <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleManualCloudRefresh}
                      disabled={isSyncingManual}
                      className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors disabled:opacity-60"
                      title="檢查雲端最新實景照片"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncingManual ? 'animate-spin' : ''}`} />
                      <span>同步 ({cloudItemIds.size})</span>
                    </button>
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
                        onClick={handleRequestDeleteCurrentPhoto}
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
                  </div>
                )}
              </div>

              {/* Storefront Multi-Photo Auto-Advancing Carousel */}
              <div
                onClick={() => setLightboxOpen(true)}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                {...protectedMediaContainerProps}
                className="relative mt-3.5 rounded-xl overflow-hidden aspect-4/3 sm:aspect-16/11 bg-stone-100 border border-amber-900/10 cursor-pointer group select-none touch-pan-y protected-media"
              >
                <img
                  src={currentPhoto.imageUrl}
                  alt={`花花招財貓-台中豐原客製化1.5cm松木貓別墅-實體門店實景（${currentPhoto.caption || '臺中市豐原區圓環西路97號'}）`}
                  className="w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.02]"
                  draggable={false}
                />

                {/* Gradient vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20 pointer-events-none" />

                <ImageProtectionLayer
                  showVisualLogo={!currentPhoto.watermarked}
                  badgePosition="top-right-below"
                  size="md"
                />

                {/* Top Overlay: Counter & Zoom Hint */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
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
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/85 hover:bg-white text-stone-900 shadow-lg backdrop-blur-xs transition-all hover:scale-105 active:scale-95 z-20"
                      aria-label="上一張門店實景"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextSlide}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/85 hover:bg-white text-stone-900 shadow-lg backdrop-blur-xs transition-all hover:scale-105 active:scale-95 z-20"
                      aria-label="下一張門店實景"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Bottom Info & Pagination Dots */}
                <div className="absolute bottom-3 left-3 right-3 text-white flex items-end justify-between gap-2 z-20">
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
                    點擊視窗外不會誤關 · 上傳成功後同步所有手機與電腦
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSaving}
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
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-stone-700">選擇門店實景照片 *</span>
                  {isProcessingImages && (
                    <span className="text-[11px] font-semibold text-amber-800 animate-pulse">
                      壓縮處理中...
                    </span>
                  )}
                </div>
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

                <label className="mt-2.5 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoWatermark}
                    onChange={(e) => setAutoWatermark(e.target.checked)}
                    className="mt-0.5 rounded border-amber-400 text-amber-900 focus:ring-amber-800"
                  />
                  <div className="space-y-0.5">
                    <div className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                      <span>自動加上「花花招財貓 LOGO」防盜浮水印（建議開啟）</span>
                    </div>
                    <p className="text-[11px] text-amber-900/80 leading-relaxed">
                      上傳門店實景照時自動將官方 LOGO 印章與防裁切斜紋烙印入圖檔像素中，防止盜圖。
                    </p>
                  </div>
                </label>
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
                  disabled={isSaving}
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-medium disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-amber-900 hover:bg-amber-800 text-white font-semibold rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-60"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{isSaving ? '正在寫入雲端資料庫...' : '確認上傳至雲端發佈'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {deletingPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif-title font-bold text-stone-900 text-base">
                    確定要刪除此門店實景照片？
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    刪除後將同步從手機、電腦、平板所有裝置移除
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeletingPhoto(null);
                  setDeleteError(null);
                }}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg"
                title="關閉視窗"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200">
              <img
                src={deletingPhoto.imageUrl}
                alt={deletingPhoto.caption || '門店實景'}
                className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0"
              />
              <div className="min-w-0">
                <div className="font-bold text-stone-900 text-xs truncate">
                  {deletingPhoto.caption || '門店實景展示照'}
                </div>
              </div>
            </div>

            {deleteError && (
              <div className="p-2.5 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-1.5 border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeletingPhoto(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeletePhoto}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? '雲端刪除同步中...' : '確認刪除照片'}</span>
              </button>
            </div>
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
        watermarkedBaked={Boolean(currentPhoto.watermarked)}
        onClose={() => setLightboxOpen(false)}
      />
    </section>
  );
};
