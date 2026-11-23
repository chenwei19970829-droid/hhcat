import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShowcasePhoto, INITIAL_SHOWCASE_PHOTOS, STORE_INFO } from '../data/catVillaData';
import { MultiPhotoLightbox } from './MultiPhotoLightbox';
import { ImageProtectionLayer, protectedMediaContainerProps } from './ImageProtectionLayer';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, getDocsFromServer, onSnapshot, setDoc } from 'firebase/firestore';
import { compressImage } from '../utils/imageCompressor';
import { useStoreOwner } from '../utils/adminAuth';
import { StoreOwnerAuthModal } from './StoreOwnerAuthModal';
import { CloudErrorState, CloudSyncStatusBar } from './CloudSyncStatusBar';
import {
  fitImagesWithinFirestoreLimit,
  formatFirestoreActionError,
  isQuotaError,
  loadRecoveryQueue,
  saveRecoveryQueue
} from '../utils/cloudSync';
import {
  SHOWCASE_ADDED_EVENT,
  SHOWCASE_FOCUS_EVENT,
  SHOWCASE_STORAGE_KEY,
  ShowcaseSizeCategory
} from '../utils/showcaseSync';
import {
  Upload,
  Plus,
  Filter,
  Maximize2,
  Trash2,
  Edit3,
  CheckCircle,
  Image as ImageIcon,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Images,
  RefreshCw,
  X,
  ShieldCheck
} from 'lucide-react';

interface ShowcaseGalleryProps {
  onOpenImageZoom?: (title: string, imageUrl: string, subtitle?: string) => void;
}

const STORAGE_KEY = SHOWCASE_STORAGE_KEY;
const DELETED_SHOWCASE_KEY = 'hhcat_deleted_showcase_ids_v1';
const SHOWCASE_RECOVERY_KEY = 'hhcat_showcase_unsynced_recovery_v1';
const DEFAULT_SHOWCASE_IDS = new Set(INITIAL_SHOWCASE_PHOTOS.map((p) => p.id));

const getLocalDeletedShowcaseIds = (): string[] => {
  try {
    const raw = localStorage.getItem(DELETED_SHOWCASE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

const addLocalDeletedShowcaseId = (id: string) => {
  try {
    const deletedIds = getLocalDeletedShowcaseIds();
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem(DELETED_SHOWCASE_KEY, JSON.stringify(deletedIds));
    }
  } catch (err) {
    console.warn('Could not save deleted showcase id:', err);
  }
};

const removeLocalDeletedShowcaseId = (id: string) => {
  try {
    const deletedIds = getLocalDeletedShowcaseIds();
    if (deletedIds.includes(id)) {
      localStorage.setItem(
        DELETED_SHOWCASE_KEY,
        JSON.stringify(deletedIds.filter((existing) => existing !== id))
      );
    }
  } catch (err) {
    console.warn('Could not remove deleted showcase id:', err);
  }
};

export const ShowcaseGallery: React.FC<ShowcaseGalleryProps> = () => {
  const { isOwner, logout } = useStoreOwner();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authActionTitle, setAuthActionTitle] = useState('店主管理操作');
  const [photos, setPhotos] = useState<ShowcasePhoto[]>([]);
  const [selectedSize, setSelectedSize] = useState<'all' | '60' | '90' | '120' | '150' | '180' | 'custom'>('all');
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Cloud sync & recovery state
  const [cloudStatus, setCloudStatus] = useState<'loading' | 'synced' | 'error'>('loading');
  const [cloudError, setCloudError] = useState<CloudErrorState | null>(null);
  const [cloudItemIds, setCloudItemIds] = useState<Set<string>>(() => new Set());
  const [unsyncedLocalPhotos, setUnsyncedLocalPhotos] = useState<ShowcasePhoto[]>(() =>
    loadRecoveryQueue<ShowcasePhoto>(SHOWCASE_RECOVERY_KEY)
  );
  const [isSyncingManual, setIsSyncingManual] = useState(false);
  const [syncNoticeBanner, setSyncNoticeBanner] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSize, showAllPhotos]);

  // Upload & Edit Form State
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSizeCategory, setUploadSizeCategory] = useState<'60' | '90' | '120' | '150' | '180' | 'custom'>('120');
  const [uploadDimensions, setUploadDimensions] = useState('150-60-120');
  const [uploadCustomerNote, setUploadCustomerNote] = useState('');
  const [uploadTags, setUploadTags] = useState('客製實品, 實木貓屋');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadImages, setUploadImages] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const imageDragDepthRef = useRef(0);

  // In-app delete confirmation modal
  const [deletingPhoto, setDeletingPhoto] = useState<ShowcasePhoto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [autoWatermark, setAutoWatermark] = useState(true);
  const [hadUnwatermarkedExisting, setHadUnwatermarkedExisting] = useState(false);
  const [sessionUploadedWatermarked, setSessionUploadedWatermarked] = useState(false);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [lightboxSubtitle, setLightboxSubtitle] = useState('');
  const [lightboxWatermarked, setLightboxWatermarked] = useState(false);

  const openLightbox = (
    title: string,
    images: string[],
    subtitle?: string,
    watermarkedBaked = false
  ) => {
    setLightboxTitle(title);
    setLightboxImages(images.filter(Boolean));
    setLightboxSubtitle(subtitle || '');
    setLightboxWatermarked(watermarkedBaked);
    setLightboxOpen(true);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyFirestoreSnapshotDocs = useCallback(
    (docs: Array<{ id: string; data: () => Record<string, unknown> }>) => {
      const deletedFromCloud = new Set<string>();
      const remotePhotos: Array<ShowcasePhoto & { updatedAt?: string }> = [];

      docs.forEach((docSnap) => {
        const data = docSnap.data();
        const resolvedId = (typeof data.id === 'string' && data.id) || docSnap.id;
        if (data.deleted === true) {
          deletedFromCloud.add(resolvedId);
        } else if (typeof data.fullPhotoData === 'string') {
          try {
            const parsed = JSON.parse(data.fullPhotoData) as ShowcasePhoto;
            if (parsed && parsed.id) {
              remotePhotos.push({
                ...parsed,
                updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined
              });
            }
          } catch (e) {
            console.warn(e);
          }
        } else if (resolvedId && typeof data.title === 'string' && typeof data.imageUrl === 'string') {
          const fallbackImgs =
            Array.isArray(data.images) && data.images.length > 0
              ? data.images.filter((x): x is string => typeof x === 'string' && Boolean(x))
              : [data.imageUrl];
          const dimText =
            typeof data.dimensions === 'string' && data.dimensions ? data.dimensions : '150-60-120';
          const inferredCat = dimText.split('-')[0];
          const validCat: ShowcasePhoto['sizeCategory'] =
            data.sizeCategory === '60' ||
            data.sizeCategory === '90' ||
            data.sizeCategory === '120' ||
            data.sizeCategory === '150' ||
            data.sizeCategory === '180' ||
            data.sizeCategory === 'custom'
              ? data.sizeCategory
              : inferredCat === '60' ||
                  inferredCat === '90' ||
                  inferredCat === '120' ||
                  inferredCat === '150' ||
                  inferredCat === '180'
                ? inferredCat
                : '150';

          remotePhotos.push({
            id: resolvedId,
            title: data.title,
            sizeCategory: validCat,
            dimensionsText: dimText,
            imageUrl: fallbackImgs[0] || data.imageUrl,
            images: fallbackImgs,
            customerNote:
              typeof data.description === 'string' && data.description
                ? data.description
                : '店主精選客製實品照',
            date: typeof data.date === 'string' && data.date ? data.date : '客製實品照',
            tags: Array.isArray(data.tags)
              ? data.tags.filter((x): x is string => typeof x === 'string')
              : ['客製實品'],
            isCustomUpload: true,
            watermarked: data.watermarked === true,
            updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined
          });
        }
      });

      remotePhotos.sort((a, b) => {
        const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0;
        const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0;
        if (!Number.isNaN(tb) && !Number.isNaN(ta) && tb !== ta) {
          return tb - ta;
        }
        return b.id.localeCompare(a.id);
      });

      const mergedDeletedIds = new Set<string>([
        ...Array.from(deletedFromCloud),
        ...getLocalDeletedShowcaseIds()
      ]);

      const activeDefaults = INITIAL_SHOWCASE_PHOTOS.filter(
        (orig) => !remotePhotos.some((r) => r.id === orig.id) && !mergedDeletedIds.has(orig.id)
      );
      const activeRemotes: ShowcasePhoto[] = remotePhotos
        .filter((r) => !mergedDeletedIds.has(r.id))
        .map(({ updatedAt: _u, ...rest }) => rest);
      const cloudIdsSet = new Set(activeRemotes.map((r) => r.id));

      // Rescue any custom showcase items stranded only on this device
      const strandedMap = new Map<string, ShowcasePhoto>();
      loadRecoveryQueue<ShowcasePhoto>(SHOWCASE_RECOVERY_KEY).forEach((p) => {
        if (p && p.id && !cloudIdsSet.has(p.id) && !mergedDeletedIds.has(p.id)) {
          strandedMap.set(p.id, p);
        }
      });

      try {
        const cachedRaw = localStorage.getItem(STORAGE_KEY);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          if (Array.isArray(parsed)) {
            parsed.forEach((p) => {
              if (
                p &&
                p.id &&
                p.isCustomUpload &&
                !DEFAULT_SHOWCASE_IDS.has(p.id) &&
                !cloudIdsSet.has(p.id) &&
                !mergedDeletedIds.has(p.id)
              ) {
                strandedMap.set(p.id, p as ShowcasePhoto);
              }
            });
          }
        }
      } catch {
        // ignore parse errors
      }

      const strandedList = Array.from(strandedMap.values());
      saveRecoveryQueue(SHOWCASE_RECOVERY_KEY, strandedList);

      const nextPhotos = [...activeRemotes, ...activeDefaults];
      setCloudStatus('synced');
      setCloudError(null);
      setCloudItemIds(cloudIdsSet);
      setUnsyncedLocalPhotos(strandedList);
      setPhotos(nextPhotos);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPhotos));
      } catch (err) {
        console.warn('Could not sync showcase cache:', err);
      }
    },
    []
  );

  // Load initial cache and subscribe to Firestore for real-time cloud sync across phones & PCs
  useEffect(() => {
    try {
      const deletedIds = getLocalDeletedShowcaseIds();
      const saved = localStorage.getItem(STORAGE_KEY);
      let combined: ShowcasePhoto[] = [];
      if (saved) {
        const parsed: ShowcasePhoto[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const customs = parsed.filter((p) => p && p.isCustomUpload);
          const validCustoms = customs.filter((p) => !DEFAULT_SHOWCASE_IDS.has(p.id));
          combined = [...validCustoms, ...INITIAL_SHOWCASE_PHOTOS];
        } else {
          combined = INITIAL_SHOWCASE_PHOTOS;
        }
      } else {
        combined = INITIAL_SHOWCASE_PHOTOS;
      }
      setPhotos(combined.filter((p) => !deletedIds.includes(p.id)));
    } catch (e) {
      console.warn('Error reading showcase photos:', e);
      setPhotos(INITIAL_SHOWCASE_PHOTOS);
    }

    // Listen to instant transfers from InStockSection (only dispatched AFTER Firestore write succeeds) & focus requests
    const handleShowcaseAdded = (e: Event) => {
      const added = (e as CustomEvent<ShowcasePhoto>).detail;
      if (!added || !added.id) return;
      setPhotos((prev) => [added, ...prev.filter((p) => p.id !== added.id)]);
      setCloudItemIds((prev) => new Set(prev).add(added.id));
    };

    const handleShowcaseFocus = (e: Event) => {
      const targetSize = (e as CustomEvent<ShowcaseSizeCategory | 'all'>).detail;
      if (targetSize) {
        setSelectedSize(targetSize);
        setShowAllPhotos(false);
        setCurrentPage(1);
      }
    };

    window.addEventListener(SHOWCASE_ADDED_EVENT, handleShowcaseAdded);
    window.addEventListener(SHOWCASE_FOCUS_EVENT, handleShowcaseFocus);

    const unsubscribe = onSnapshot(
      collection(db, 'showcasePhotos'),
      (snapshot) => {
        applyFirestoreSnapshotDocs(snapshot.docs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'showcasePhotos');
        setCloudStatus('error');
        setCloudError({
          message: formatFirestoreActionError(error, '讀取雲端客製實品相冊'),
          isQuota: isQuotaError(error)
        });
      }
    );

    return () => {
      window.removeEventListener(SHOWCASE_ADDED_EVENT, handleShowcaseAdded);
      window.removeEventListener(SHOWCASE_FOCUS_EVENT, handleShowcaseFocus);
      unsubscribe();
    };
  }, [applyFirestoreSnapshotDocs]);

  const handleManualCloudRefresh = async () => {
    if (isSyncingManual) return;
    setIsSyncingManual(true);
    setSyncNoticeBanner(null);
    try {
      const serverSnap = await getDocsFromServer(collection(db, 'showcasePhotos'));
      applyFirestoreSnapshotDocs(serverSnap.docs);
      const activeCount = serverSnap.docs.filter((d) => d.data().deleted !== true).length;
      setSyncNoticeBanner(
        `已完成雲端相冊校對（雲端共 ${activeCount} 筆客製實品），手機與電腦現為完全一致內容。`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'showcasePhotos');
      setCloudStatus('error');
      setCloudError({
        message: formatFirestoreActionError(err, '手動重整雲端相冊'),
        isQuota: isQuotaError(err)
      });
    } finally {
      setIsSyncingManual(false);
    }
  };

  const syncStrandedShowcasePhoto = async (localPhoto: ShowcasePhoto): Promise<boolean> => {
    const imgs =
      localPhoto.images && localPhoto.images.length > 0
        ? localPhoto.images.filter(Boolean)
        : [localPhoto.imageUrl].filter(Boolean);
    const nowIso = new Date().toISOString();
    const baseMeta = {
      id: localPhoto.id,
      title: localPhoto.title,
      sizeCategory: localPhoto.sizeCategory,
      dimensions: localPhoto.dimensionsText,
      description: localPhoto.customerNote,
      tags: localPhoto.tags || ['客製實品'],
      date: localPhoto.date || '客製實品照',
      isCustomUpload: true,
      watermarked: Boolean(localPhoto.watermarked),
      deleted: false,
      updatedAt: nowIso
    };

    try {
      const fitted = await fitImagesWithinFirestoreLimit(imgs, baseMeta, {
        primaryField: 'imageUrl',
        arrayField: 'images'
      });

      if (!fitted.ok) {
        setCloudError({ message: fitted.reason, isQuota: false });
        return false;
      }

      await setDoc(doc(db, 'showcasePhotos', localPhoto.id), {
        ...baseMeta,
        imageUrl: fitted.images[0],
        images: fitted.images
      });

      const syncedPhoto: ShowcasePhoto = {
        ...localPhoto,
        imageUrl: fitted.images[0],
        images: fitted.images
      };

      removeLocalDeletedShowcaseId(localPhoto.id);
      setUnsyncedLocalPhotos((prev) => {
        const next = prev.filter((p) => p.id !== localPhoto.id);
        saveRecoveryQueue(SHOWCASE_RECOVERY_KEY, next);
        return next;
      });
      setCloudItemIds((prev) => new Set(prev).add(localPhoto.id));
      setCloudStatus('synced');
      setCloudError(null);
      setPhotos((prev) => {
        const updated = [syncedPhoto, ...prev.filter((p) => p.id !== syncedPhoto.id)];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `showcasePhotos/${localPhoto.id}`);
      const msg = formatFirestoreActionError(err, `補傳「${localPhoto.title}」至雲端`);
      setCloudError({ message: msg, isQuota: isQuotaError(err) });
      if (isQuotaError(err)) setCloudStatus('error');
      return false;
    }
  };

  const handleSyncRecoveryItem = async (photoId: string) => {
    const target = unsyncedLocalPhotos.find((p) => p.id === photoId);
    if (!target || isSyncingManual) return;
    setIsSyncingManual(true);
    setSyncNoticeBanner(null);
    const ok = await syncStrandedShowcasePhoto(target);
    if (ok) {
      setSyncNoticeBanner(`已將「${target.title}」壓縮並補傳至雲端，手機現在也可以看到了！`);
    }
    setIsSyncingManual(false);
  };

  const handleSyncAllRecoveryItems = async () => {
    if (isSyncingManual || unsyncedLocalPhotos.length === 0) return;
    setIsSyncingManual(true);
    setSyncNoticeBanner(null);
    const queue = [...unsyncedLocalPhotos];
    let successCount = 0;
    for (const p of queue) {
      const ok = await syncStrandedShowcasePhoto(p);
      if (ok) successCount += 1;
      else break;
    }
    if (successCount > 0) {
      setSyncNoticeBanner(`已成功補傳 ${successCount} 筆實品作品至雲端資料庫，手機／電腦皆可看到！`);
    }
    setIsSyncingManual(false);
  };

  const hasDraggedFiles = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types || []).includes('Files');

  const processImageFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
    if (files.length === 0) {
      setUploadError('請拖曳或選擇有效圖片檔案（JPG / PNG / WebP）');
      return;
    }

    try {
      setIsProcessingImages(true);
      setUploadError(null);
      const compressedList: string[] = [];
      for (const file of files) {
        const compressed = await compressImage(file, 840, 0.7, { watermark: autoWatermark });
        compressedList.push(compressed);
      }
      if (compressedList.length > 0) {
        if (autoWatermark) {
          setSessionUploadedWatermarked(true);
        }
        setUploadImages((prev) => {
          const updated = [...prev, ...compressedList];
          setPreviewImage(updated[0]);
          return updated;
        });
      }
    } catch {
      setUploadError('多張照片處理失敗，請換一張再試');
    } finally {
      setIsProcessingImages(false);
    }
  };

  const handleMultipleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processImageFiles(files);
    e.target.value = '';
  };

  const resetUploadForm = () => {
    setEditingPhotoId(null);
    setUploadTitle('');
    setUploadCustomerNote('');
    setUploadTags('客製實品, 實木貓屋');
    setPreviewImage(null);
    setUploadImages([]);
    setUploadError(null);
    setAutoWatermark(true);
    setHadUnwatermarkedExisting(false);
    setSessionUploadedWatermarked(false);
    setIsDraggingImages(false);
    imageDragDepthRef.current = 0;
  };

  const handleSavePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;
    const finalImages = uploadImages.length > 0 ? uploadImages : (previewImage ? [previewImage] : []);
    if (finalImages.length === 0) {
      setUploadError('請至少上傳一張貓別墅實品照片！');
      return;
    }

    if (!uploadTitle.trim()) {
      setUploadError('請輸入作品名稱或款式標題');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const existingPhoto = editingPhotoId ? photos.find((p) => p.id === editingPhotoId) : undefined;
    const isWatermarkedBaked = existingPhoto
      ? Boolean(existingPhoto.watermarked) ||
        (!hadUnwatermarkedExisting && sessionUploadedWatermarked)
      : sessionUploadedWatermarked || autoWatermark;

    const targetId = editingPhotoId || `custom-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const parsedTags = uploadTags.split(/[,， ]+/).filter(Boolean);
    const draftPhoto: ShowcasePhoto = {
      id: targetId,
      title: uploadTitle.trim(),
      sizeCategory: uploadSizeCategory,
      dimensionsText: uploadDimensions.trim() || `${uploadSizeCategory}cm 系列`,
      imageUrl: finalImages[0],
      images: finalImages,
      customerNote: uploadCustomerNote.trim() || '店主精選客製實品照，支援同款專屬訂製。',
      date: editingPhotoId ? '已更新實拍' : '剛剛新增',
      tags: parsedTags.length > 0 ? parsedTags : ['客製實品'],
      isCustomUpload: true,
      watermarked: isWatermarkedBaked
    };

    const firestoreMeta = {
      id: targetId,
      title: draftPhoto.title,
      sizeCategory: draftPhoto.sizeCategory,
      dimensions: draftPhoto.dimensionsText,
      description: draftPhoto.customerNote,
      tags: draftPhoto.tags,
      date: draftPhoto.date,
      isCustomUpload: true,
      watermarked: isWatermarkedBaked,
      deleted: false,
      updatedAt: nowIso
    };

    try {
      const fitted = await fitImagesWithinFirestoreLimit(finalImages, firestoreMeta, {
        primaryField: 'imageUrl',
        arrayField: 'images'
      });

      if (!fitted.ok) {
        setUploadError(fitted.reason);
        setIsUploading(false);
        return;
      }

      // Firestore-first write so we never fake success when cloud rejects/exceeds quota
      await setDoc(doc(db, 'showcasePhotos', targetId), {
        ...firestoreMeta,
        imageUrl: fitted.images[0],
        images: fitted.images
      });

      const syncedPhoto: ShowcasePhoto = {
        ...draftPhoto,
        imageUrl: fitted.images[0],
        images: fitted.images
      };

      removeLocalDeletedShowcaseId(targetId);

      const existingIdx = photos.findIndex((p) => p.id === targetId);
      const updated =
        existingIdx >= 0
          ? photos.map((p) => (p.id === targetId ? syncedPhoto : p))
          : [syncedPhoto, ...photos];
      setPhotos(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('LocalStorage limit reached or disabled:', err);
      }

      setUnsyncedLocalPhotos((prev) => {
        const next = prev.filter((p) => p.id !== targetId);
        saveRecoveryQueue(SHOWCASE_RECOVERY_KEY, next);
        return next;
      });
      setCloudItemIds((prev) => new Set(prev).add(targetId));
      setCloudStatus('synced');
      setCloudError(null);
      setSyncNoticeBanner(
        `「${syncedPhoto.title}」已上傳並寫入雲端資料庫，手機、電腦、平板現在皆會即時顯示！`
      );

      setIsUploadModalOpen(false);
      resetUploadForm();
      setSelectedSize(syncedPhoto.sizeCategory);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `showcasePhotos/${targetId}`);
      const msg = formatFirestoreActionError(err, '上傳客製實品照至雲端');
      setUploadError(msg);
      if (isQuotaError(err)) {
        setCloudStatus('error');
        setCloudError({ message: msg, isQuota: true });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenUpload = (targetSize?: '60' | '90' | '120' | '150' | '180' | 'custom') => {
    resetUploadForm();
    if (targetSize) {
      setUploadSizeCategory(targetSize);
      if (targetSize === 'custom') {
        setUploadDimensions('183-73-142');
      }
    }
    if (isOwner) {
      setIsUploadModalOpen(true);
    } else {
      setAuthActionTitle('上傳客製實體貓別墅照片');
      setIsAuthModalOpen(true);
    }
  };

  const handleOpenEdit = (photo: ShowcasePhoto, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) {
      setAuthActionTitle('編輯客製相冊卡片');
      setIsAuthModalOpen(true);
      return;
    }
    setEditingPhotoId(photo.id);
    setUploadTitle(photo.title);
    setUploadSizeCategory(photo.sizeCategory);
    setUploadDimensions(photo.dimensionsText);
    setUploadCustomerNote(photo.customerNote);
    setUploadTags((photo.tags || []).join(', '));
    const imgs = photo.images && photo.images.length > 0 ? photo.images : [photo.imageUrl];
    setUploadImages(imgs);
    setPreviewImage(imgs[0]);
    setUploadError(null);
    setAutoWatermark(true);
    setHadUnwatermarkedExisting(!photo.watermarked);
    setSessionUploadedWatermarked(false);
    setIsUploadModalOpen(true);
  };

  const handleRequestDeletePhoto = (photo: ShowcasePhoto, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) {
      setAuthActionTitle('刪除客製相冊照片');
      setIsAuthModalOpen(true);
      return;
    }
    setDeleteError(null);
    setDeletingPhoto(photo);
  };

  const handleConfirmDeletePhoto = async () => {
    if (!deletingPhoto || isDeleting) return;
    const targetPhoto = deletingPhoto;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await setDoc(doc(db, 'showcasePhotos', targetPhoto.id), {
        id: targetPhoto.id,
        deleted: true,
        updatedAt: new Date().toISOString()
      });

      addLocalDeletedShowcaseId(targetPhoto.id);
      const updated = photos.filter((p) => p.id !== targetPhoto.id);
      setPhotos(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn(err);
      }

      setUnsyncedLocalPhotos((prev) => {
        const next = prev.filter((p) => p.id !== targetPhoto.id);
        saveRecoveryQueue(SHOWCASE_RECOVERY_KEY, next);
        return next;
      });
      setCloudItemIds((prev) => {
        const next = new Set(prev);
        next.delete(targetPhoto.id);
        return next;
      });
      setDeletingPhoto(null);
      setSyncNoticeBanner(`已將「${targetPhoto.title}」從雲端與所有裝置的客製實品相冊移除。`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `showcasePhotos/${targetPhoto.id}`);
      const msg = formatFirestoreActionError(err, '雲端刪除實品照');
      setDeleteError(msg);
      if (isQuotaError(err)) {
        setCloudStatus('error');
        setCloudError({ message: msg, isQuota: true });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPhotos = photos.filter((photo) => {
    if (selectedSize === 'all') return true;
    return photo.sizeCategory === selectedSize;
  });

  const PAGE_SIZE = 12;
  const totalPages = Math.ceil(filteredPhotos.length / PAGE_SIZE);

  let displayedPhotos: ShowcasePhoto[] = [];
  if (!showAllPhotos) {
    displayedPhotos = filteredPhotos.slice(0, 6);
  } else {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    displayedPhotos = filteredPhotos.slice(startIndex, startIndex + PAGE_SIZE);
  }

  const sectionRef = useRef<HTMLElement>(null);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      document.getElementById('showcase')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section id="showcase" ref={sectionRef} className="py-16 sm:py-20 bg-[#FAF7F2] border-b border-stone-200 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading & Owner Upload Button */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Customer Gallery & Showcase
            </div>
            <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
              客製實品相冊 · 依尺寸一目瞭然
            </h2>
            <p className="text-sm text-stone-600 mt-1.5 max-w-2xl leading-relaxed">
              店主用心為每位毛孩量身打造的真實完工照！
              <br />
              您可以直接依照尺寸分類快速瀏覽對應款式，店主亦可隨時在線擴充最新完工作品。
            </p>
          </div>

          {/* Action: Open Upload Modal & Cloud Sync Check (Restricted to Store Owner) */}
          {isOwner && (
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0 z-10">
              <button
                type="button"
                onClick={handleManualCloudRefresh}
                disabled={isSyncingManual}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl shadow-2xs transition-colors disabled:opacity-60"
                title="向雲端資料庫重新抓取最新清單，確認手機與電腦完全一致"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingManual ? 'animate-spin' : ''}`} />
                <span>同步檢查 ({cloudItemIds.size} 筆雲端)</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleOpenUpload();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>店主上傳客製實品照</span>
              </button>
              <button
                type="button"
                onClick={logout}
                className="px-2.5 py-2 text-[11px] text-stone-500 hover:text-stone-800 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors cursor-pointer"
                title="登出店主管理狀態"
              >
                鎖定
              </button>
            </div>
          )}
        </div>

        {/* Owner Cloud Status, Quota Alerts & Stranded Recovery */}
        {isOwner && (
          <CloudSyncStatusBar
            sectionLabel="客製實品相冊"
            cloudError={cloudError}
            onDismissError={() => setCloudError(null)}
            onRetrySync={handleManualCloudRefresh}
            syncNoticeBanner={syncNoticeBanner}
            onDismissNotice={() => setSyncNoticeBanner(null)}
            recoveryItems={unsyncedLocalPhotos.map((p) => ({
              id: p.id,
              title: p.title,
              subtitle: `${p.dimensionsText} · 共 ${(p.images && p.images.length) || 1} 張照片`,
              thumbnailUrl: (p.images && p.images[0]) || p.imageUrl
            }))}
            isSyncing={isSyncingManual}
            onSyncRecoveryItem={handleSyncRecoveryItem}
            onDiscardRecoveryItem={(id) => {
              setUnsyncedLocalPhotos((prev) => {
                const next = prev.filter((p) => p.id !== id);
                saveRecoveryQueue(SHOWCASE_RECOVERY_KEY, next);
                return next;
              });
              setSyncNoticeBanner('已移除該筆僅存於本機的未同步相冊暫存資料。');
            }}
            onSyncAllRecoveryItems={handleSyncAllRecoveryItems}
          />
        )}

        {/* Size Filter Pills / Segmented Bar */}
        <div className="flex flex-wrap items-center gap-2 pb-6 border-b border-stone-200">
          <span className="text-xs text-stone-500 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <span>尺寸篩選：</span>
          </span>

          <button
            type="button"
            onClick={() => {
              setSelectedSize('all');
              setShowAllPhotos(false);
            }}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
              selectedSize === 'all'
                ? 'bg-amber-900 text-white shadow-xs font-semibold'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            全部實品 ({photos.length})
          </button>

          {(['60', '90', '120', '150', '180'] as const).map((size) => {
            const count = photos.filter((p) => p.sizeCategory === size).length;
            return (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setSelectedSize(size);
                  setShowAllPhotos(false);
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  selectedSize === size
                    ? 'bg-amber-900 text-white shadow-xs font-semibold'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                {size}cm 系列 ({count})
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setSelectedSize('custom');
              setShowAllPhotos(false);
            }}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
              selectedSize === 'custom'
                ? 'bg-amber-900 text-white shadow-xs font-semibold'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <span>客製化尺寸 ({photos.filter((p) => p.sizeCategory === 'custom').length})</span>
          </button>
        </div>

        {/* Photos Grid */}
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-stone-300 mt-6">
            <ImageIcon className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-sm text-stone-600 font-medium">
              目前 {selectedSize === 'custom' ? '客製化特殊尺寸' : `${selectedSize}cm 系列`}尚未有實品照
            </p>
            <p className="text-xs text-stone-400 mt-1">
              {isOwner
                ? '您可以隨時點擊下方按鈕上傳此尺寸的實拍作品！'
                : '此尺寸即將陸續更新實拍！客製諮詢請直接加 LINE：hhcat.cc'}
            </p>
            {isOwner && (
              <button
                type="button"
                onClick={() => handleOpenUpload(selectedSize === 'all' ? 'custom' : selectedSize)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-900 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>獨立上傳此尺寸照片</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {displayedPhotos.map((photo) => {
              const imgs = photo.images && photo.images.length > 0 ? photo.images : [photo.imageUrl];
              return (
              <div
                key={photo.id}
                onClick={() => {
                  openLightbox(
                    photo.title,
                    imgs,
                    `${photo.dimensionsText} · ${photo.customerNote}`,
                    Boolean(photo.watermarked)
                  );
                }}
                className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md hover:border-amber-800/40 transition-all cursor-pointer group flex flex-col"
              >
                {/* Image Container */}
                <div
                  {...protectedMediaContainerProps}
                  className="relative aspect-4/3 bg-stone-100 overflow-hidden flex items-center justify-center p-2 protected-media"
                >
                  <img
                    src={imgs[0] || photo.imageUrl}
                    alt={`花花招財貓-台中豐原客製化1.5cm松木貓別墅-${photo.dimensionsText}（${photo.title}）`}
                    draggable={false}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = STORE_INFO.storefrontImage;
                    }}
                  />

                  <ImageProtectionLayer
                    showVisualLogo={!photo.watermarked}
                    badgePosition={isOwner ? 'above-bottom-right' : 'bottom-right'}
                    size="md"
                  />

                  {/* Size Pill */}
                  <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-mono px-2 py-0.5 rounded z-20">
                    {photo.sizeCategory === 'custom' ? '客製化特殊尺寸' : `長度 ${photo.sizeCategory}cm 系列`}
                  </div>

                  {/* Top Right Photo Count + Zoom Icon */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                    {imgs.length > 1 && (
                      <span className="px-2 py-0.5 bg-stone-900/75 text-white text-[11px] font-semibold rounded backdrop-blur-xs flex items-center gap-1">
                        <Images className="w-3 h-3 text-amber-300" />
                        <span>{imgs.length} 張</span>
                      </span>
                    )}
                    <div className="p-1.5 bg-white/90 rounded-md text-stone-700 shadow-xs group-hover:bg-amber-900 group-hover:text-white transition-colors">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Store Owner Edit & Delete Options */}
                  {isOwner && (
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 z-20">
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(photo, e)}
                        className="bg-amber-900/95 hover:bg-amber-900 text-white px-2.5 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-xs"
                        title="編輯與新增多張照片"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>編輯/加圖</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleRequestDeletePhoto(photo, e)}
                        className="bg-red-600/95 hover:bg-red-700 text-white px-2.5 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-xs"
                        title="刪除此相片卡片"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>刪除</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Owner Cloud Sync Strip */}
                {isOwner && (
                  <div className="px-4 pt-2.5 pb-0 flex items-center justify-between text-[10px]">
                    {cloudItemIds.has(photo.id) ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        雲端已同步（手機／電腦皆可見）
                      </span>
                    ) : DEFAULT_SHOWCASE_IDS.has(photo.id) ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-stone-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                        系統內建作品（所有裝置皆有）
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                        {cloudStatus === 'error' ? '離線／額度滿快取中' : '等待雲端確認...'}
                      </span>
                    )}
                  </div>
                )}

                {/* Details Footer */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h3 className="font-serif-title font-bold text-stone-900 text-sm group-hover:text-amber-900 transition-colors line-clamp-1">
                      {photo.title}
                    </h3>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                      {photo.customerNote}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                    <span className="font-mono text-stone-600 font-medium">
                      {photo.dimensionsText}
                    </span>
                    <span className="inline-flex items-center gap-1 text-amber-900 font-semibold">
                      <Images className="w-3 h-3" />
                      <span>查看多角度 ({imgs.length}張)</span>
                    </span>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* View More & Pagination Controls */}
        <div className="mt-10 space-y-4 text-center">
          {!showAllPhotos && filteredPhotos.length > 6 && (
            <button
              type="button"
              onClick={() => {
                setShowAllPhotos(true);
                setCurrentPage(1);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
              <span>查看全部客製實品照（共 {filteredPhotos.length} 張照片）</span>
            </button>
          )}

          {showAllPhotos && (
            <div className="space-y-4">
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    上一頁
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePageChange(p)}
                      className={`w-8 h-8 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        currentPage === p
                          ? 'bg-amber-900 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    下一頁
                  </button>
                </div>
              )}

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAllPhotos(false);
                    setCurrentPage(1);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-stone-600 bg-stone-200/80 hover:bg-stone-300 rounded-xl transition-all cursor-pointer"
                >
                  <ChevronUp className="w-4 h-4" />
                  <span>收起部分照片（恢復顯示預設前 6 張）</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Upload Modal for Store Owner */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-fadeIn">
            <div
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 overflow-y-auto max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif-title font-bold text-stone-900 text-base">
                      {editingPhotoId ? '編輯客製實品與多角度照片' : '上傳客製實品照片'}
                    </h3>
                    <p className="text-xs text-stone-500">
                      點擊視窗外不會誤關 · 支援桌面直接拖入或連續多選圖片
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setIsUploadModalOpen(false)}
                  className="text-stone-400 hover:text-stone-700 text-lg font-bold p-1"
                  title="關閉視窗"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSavePhoto} className="mt-4 space-y-4">
                {uploadError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Image Picker with Desktop Drag & Drop */}
                <div
                  onDragEnter={(e) => {
                    if (!hasDraggedFiles(e)) return;
                    e.preventDefault();
                    e.stopPropagation();
                    imageDragDepthRef.current += 1;
                    setIsDraggingImages(true);
                  }}
                  onDragOver={(e) => {
                    if (!hasDraggedFiles(e)) return;
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'copy';
                  }}
                  onDragLeave={(e) => {
                    if (!hasDraggedFiles(e)) return;
                    e.preventDefault();
                    e.stopPropagation();
                    imageDragDepthRef.current = Math.max(0, imageDragDepthRef.current - 1);
                    if (imageDragDepthRef.current === 0) setIsDraggingImages(false);
                  }}
                  onDrop={async (e) => {
                    if (!hasDraggedFiles(e)) return;
                    e.preventDefault();
                    e.stopPropagation();
                    imageDragDepthRef.current = 0;
                    setIsDraggingImages(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      await processImageFiles(e.dataTransfer.files);
                    }
                  }}
                  className="relative rounded-xl"
                >
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-stone-700">
                      實品照片檔案 * (支援桌面拖入／連續多選，第 1 張為主圖)
                    </label>
                    {isProcessingImages && (
                      <span className="text-[11px] font-semibold text-amber-800 animate-pulse">
                        壓縮處理中...
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleMultipleFilesUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />

                  {isDraggingImages && (
                    <div className="absolute inset-0 z-20 rounded-xl border-2 border-dashed border-amber-700 bg-amber-50/95 backdrop-blur-xs flex flex-col items-center justify-center text-amber-950 pointer-events-none">
                      <Upload className="w-8 h-8 mb-1.5 text-amber-800 animate-bounce" />
                      <span className="font-bold text-sm">放開滑鼠即可直接上傳照片</span>
                    </div>
                  )}

                  {uploadImages.length > 0 ? (
                    <div className="space-y-2">
                      <div className="relative aspect-16/9 bg-stone-100 rounded-xl overflow-hidden border border-stone-200 flex items-center justify-center">
                        <img
                          src={previewImage || uploadImages[0]}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute bottom-2 right-2 bg-stone-900/80 hover:bg-stone-900 text-white text-xs px-3 py-1.5 rounded-md font-semibold"
                        >
                          + 繼續添加照片 (可多選)
                        </button>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {uploadImages.map((imgUrl, i) => (
                          <div
                            key={i}
                            className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 group ${
                              i === 0 ? 'border-amber-800' : 'border-stone-300'
                            }`}
                          >
                            <img
                              src={imgUrl}
                              alt={`預覽 ${i + 1}`}
                              onClick={() => {
                                if (i > 0) {
                                  const next = [...uploadImages];
                                  const [chosen] = next.splice(i, 1);
                                  next.unshift(chosen);
                                  setUploadImages(next);
                                  setPreviewImage(next[0]);
                                }
                              }}
                              className="w-full h-full object-cover cursor-pointer"
                              title={i === 0 ? '目前為主圖' : '點擊設為主圖'}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = uploadImages.filter((_, idx) => idx !== i);
                                setUploadImages(updated);
                                setPreviewImage(updated[0] || null);
                              }}
                              className="absolute top-0 right-0 bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-bl font-bold"
                              title="刪除此張"
                            >
                              ✕
                            </button>
                            {i === 0 && (
                              <span className="absolute bottom-0 inset-x-0 bg-amber-900 text-white text-[8px] text-center font-bold">
                                主圖
                              </span>
                            )}
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
                      <p className="text-xs font-medium text-stone-700">
                        從桌面拖曳多張照片到此處，或點擊批次選取上傳
                      </p>
                      <p className="text-[11px] text-stone-400 mt-1">
                        支援一次選取多張主圖、開關門、內部及配件實拍
                      </p>
                    </div>
                  )}

                  {/* Auto Watermark Protection Toggle */}
                  <label className="mt-2.5 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200 cursor-pointer select-none text-xs">
                    <input
                      type="checkbox"
                      checked={autoWatermark}
                      onChange={(e) => setAutoWatermark(e.target.checked)}
                      className="mt-0.5 rounded border-amber-400 text-amber-900 focus:ring-amber-800"
                    />
                    <div className="space-y-0.5">
                      <div className="font-bold text-amber-950 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                        <span>自動加上「花花招財貓 LOGO」防盜浮水印（建議開啟）</span>
                      </div>
                      <p className="text-[11px] text-amber-900/80 leading-relaxed">
                        尤其適合客製化成品圖！上傳時自動將門市官方 LOGO 印章與防裁切斜紋烙印入像素中，避免有心人盜圖冒用。
                      </p>
                    </div>
                  </label>
                </div>

                {/* Size Category */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    尺寸分類 (規格歸類) *
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {(['60', '90', '120', '150', '180'] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setUploadSizeCategory(size);
                          if (uploadDimensions === '183-73-142' || !uploadDimensions) {
                            setUploadDimensions(`${size}-60-${size}`);
                          }
                        }}
                        className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                          uploadSizeCategory === size
                            ? 'bg-amber-900 text-white border-amber-900 font-semibold shadow-xs'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        {size}cm
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setUploadSizeCategory('custom');
                        setUploadDimensions('183-73-142');
                      }}
                      className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                        uploadSizeCategory === 'custom'
                          ? 'bg-amber-900 text-white border-amber-900 font-semibold shadow-xs'
                          : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      客製化尺寸
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    作品名稱 / 款式標題 *
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="例如：台中南屯 150-60-120 雙太空艙實裝"
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-800"
                    required
                  />
                </div>

                {/* Dimensions */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    尺寸標記 (高-深-長)
                  </label>
                  <input
                    type="text"
                    value={uploadDimensions}
                    onChange={(e) => setUploadDimensions(e.target.value)}
                    placeholder={uploadSizeCategory === 'custom' ? '例如：高183-深73-長142 cm' : '例如：150-60-120 cm'}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-800"
                  />
                </div>

                {/* Customer Note */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    客製內容與客人反饋說明
                  </label>
                  <textarea
                    rows={2}
                    value={uploadCustomerNote}
                    onChange={(e) => setUploadCustomerNote(e.target.value)}
                    placeholder="例如：客人加裝抽屜、全景太空艙與天然劍麻抓柱，雙貓入住超適應！"
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-800"
                  />
                </div>

                {/* Modal Buttons */}
                <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-5 py-2 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>
                      {isUploading
                        ? '正在寫入雲端資料庫...'
                        : editingPhotoId
                          ? '儲存並同步雲端'
                          : '確認上傳至雲端發佈'}
                    </span>
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
                      確定要刪除此客製實品照片？
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
                  src={(deletingPhoto.images && deletingPhoto.images[0]) || deletingPhoto.imageUrl}
                  alt={deletingPhoto.title}
                  className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0"
                />
                <div className="min-w-0">
                  <div className="inline-block px-2 py-0.5 rounded bg-amber-900 text-white text-[10px] font-bold font-mono mb-1">
                    {deletingPhoto.dimensionsText}
                  </div>
                  <div className="font-bold text-stone-900 text-xs truncate">
                    {deletingPhoto.title}
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
                  <span>{isDeleting ? '雲端刪除同步中...' : '確認刪除實品'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Store Owner Authentication Modal */}
      <StoreOwnerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          if (authActionTitle.includes('上傳')) {
            setIsUploadModalOpen(true);
          }
        }}
        actionTitle={authActionTitle}
      />
      {/* Multi-photo Lightbox Modal */}
      <MultiPhotoLightbox
        isOpen={lightboxOpen}
        title={lightboxTitle}
        images={lightboxImages}
        subtitle={lightboxSubtitle}
        watermarkedBaked={lightboxWatermarked}
        onClose={() => setLightboxOpen(false)}
      />
    </section>
  );
};
