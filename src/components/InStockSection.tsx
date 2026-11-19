import React, { useState, useEffect, useRef } from 'react';
import { STORE_INFO, ShowcasePhoto } from '../data/catVillaData';
import { MultiPhotoLightbox } from './MultiPhotoLightbox';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, setDoc, getDocsFromServer } from 'firebase/firestore';
import { compressImage } from '../utils/imageCompressor';
import { useStoreOwner } from '../utils/adminAuth';
import { StoreOwnerAuthModal } from './StoreOwnerAuthModal';
import { CloudSyncStatusBar } from './CloudSyncStatusBar';
import {
  formatFirestoreActionError,
  fitImagesWithinFirestoreLimit,
  isQuotaError,
  loadRecoveryQueue,
  saveRecoveryQueue
} from '../utils/cloudSync';
import {
  ShowcaseSizeCategory,
  focusShowcaseSizeCategory,
  inferShowcaseSizeCategory,
  publishTransferredShowcasePhoto
} from '../utils/showcaseSync';
import {
  PackageCheck,
  Plus,
  Trash2,
  Edit3,
  Upload,
  Maximize2,
  MessageCircle,
  AlertTriangle,
  Camera,
  CheckCircle,
  Truck,
  MapPin,
  X,
  Images,
  ArrowRightLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  RefreshCw
} from 'lucide-react';

export interface InStockItem {
  id: string;
  title: string;
  sizeTag: string; // e.g. "180-60-90 cm"
  priceText?: string; // e.g. "NT$ 21,900"
  status: 'available' | 'reserved' | 'sold';
  mainImage: string; // 整體主圖
  interiorImage?: string; // 內飾圖
  detailImage?: string; // 加裝詳細圖
  images?: string[]; // 多張照片陣列（包含主體關門、開門、內部、內飾等詳細視角）
  description: string;
  features: string[];
  isCustomUpload?: boolean;
  dateAdded?: string;
  updatedAt?: string;
}

const STORAGE_KEY = 'hhcat_instock_items_v2';
const DELETED_KEY = 'hhcat_deleted_instock_ids_v1';
const INSTOCK_RECOVERY_KEY = 'hhcat_instock_unsynced_recovery_v1';

const INITIAL_IN_STOCK_ITEMS: InStockItem[] = [
  {
    id: 'stock-180-60-90',
    title: '台中豐原門店現貨 · 180-60-90 雙層旗艦款',
    sizeTag: '180-60-90 cm',
    priceText: 'NT$ 21,900',
    status: 'available',
    mainImage: '/assets/aistudio/B180-60-120_c81f8495.jpg',
    interiorImage: '/assets/aistudio/180-60-120_d83cbc2e.jpg',
    detailImage: '/assets/aistudio/C180-60-120_080ab68b.jpg',
    description: '門市實品已組裝完成！高挑1.8米霸氣雙層，純天然松木無甲醛厚度足1.5cm，配備高透耐磨安全壓克力雙門、貓頭造型休息房、加厚階梯與獨立貓砂盆收納位。現貨免等工期，可直接來店自取或叫車拉走！',
    features: ['純實木厚度足 1.5cm', '高透安全壓克力門', '貓頭景觀房+原木階梯', '門市已組裝好現品', '免排單製作等待'],
    dateAdded: '豐原門店展示中'
  },
  {
    id: 'stock-150-60-90',
    title: '門市現貨展示 · 150-60-90 經典三層大空間別墅',
    sizeTag: '150-60-90 cm',
    priceText: 'NT$ 17,900',
    status: 'available',
    mainImage: '/assets/aistudio/150-60-90_4f890318.jpg',
    interiorImage: '/assets/aistudio/B150-60-90_7092476a.jpg',
    detailImage: '/assets/aistudio/150-60-60_bc590492.jpg',
    description: '店內超熱門實用款！150cm適中高度好打理，加裝對流百葉氣孔與雙開大壓克力門，附帶靜音萬向煞車輪好移動。現貨陳列於圓環西路門店，可隨時驗貨搬走。',
    features: ['天然松木無甲醛', '雙開防撞壓克力', '靜音煞車萬向輪', '加寬躍升平台'],
    dateAdded: '豐原門店展示中'
  },
  {
    id: 'stock-120-60-90',
    title: '熱門現貨 · 120-60-90 寬敞矮櫃雙門款',
    sizeTag: '120-60-90 cm',
    priceText: 'NT$ 14,900',
    status: 'available',
    mainImage: '/assets/aistudio/120-60-90_d44f97fc.jpg',
    interiorImage: '/assets/aistudio/B120-60-90_c49b37e1.jpg',
    detailImage: '/assets/aistudio/90-60-60_f18b59e3.jpg',
    description: '客廳黃金百搭款，不壓迫空間又能給愛貓安心獨立天地。通風防潮微防水塗裝，已組裝完成，現場看完直接帶回家。',
    features: ['1.5cm 紮實木板', '全景通透視野', '底層防漏貓砂格', '現貨先搶先贏'],
    dateAdded: '豐原門店展示中'
  }
];

interface InStockSectionProps {
  onOpenImageZoom?: (title: string, imageUrl: string, subtitle?: string) => void;
}

const getLocalDeletedIds = (): string[] => {
  try {
    const deletedJson = localStorage.getItem(DELETED_KEY);
    const parsed = deletedJson ? JSON.parse(deletedJson) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

const addLocalDeletedId = (id: string) => {
  try {
    const deletedIds = getLocalDeletedIds();
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem(DELETED_KEY, JSON.stringify(deletedIds));
    }
  } catch (err) {
    console.warn('Failed to save deleted ID to localStorage', err);
  }
};

const removeLocalDeletedId = (id: string) => {
  try {
    const deletedIds = getLocalDeletedIds();
    if (deletedIds.includes(id)) {
      localStorage.setItem(
        DELETED_KEY,
        JSON.stringify(deletedIds.filter((existingId) => existingId !== id))
      );
    }
  } catch (err) {
    console.warn('Failed to remove deleted ID from localStorage', err);
  }
};

const DEFAULT_FEATURE_TAGS = ['純實木厚度1.5cm', '高透安全壓克力門', '門市組裝好現品'];

const getItemImages = (item: InStockItem): string[] => {
  if (item.images && item.images.length > 0) {
    return item.images.filter(Boolean);
  }
  return [item.mainImage, item.interiorImage, item.detailImage].filter((x): x is string => Boolean(x));
};

export const InStockSection: React.FC<InStockSectionProps> = () => {
  const { isOwner, logout } = useStoreOwner();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authActionTitle, setAuthActionTitle] = useState('店主管理操作');
  const [items, setItems] = useState<InStockItem[]>([]);
  const [cloudStatus, setCloudStatus] = useState<'loading' | 'synced' | 'error'>('loading');
  const [cloudError, setCloudError] = useState<{ message: string; isQuota: boolean } | null>(null);
  const [cloudItemIds, setCloudItemIds] = useState<Set<string>>(() => new Set());
  const [unsyncedLocalItems, setUnsyncedLocalItems] = useState<InStockItem[]>([]);
  const [isSyncingManual, setIsSyncingManual] = useState(false);
  const [syncNoticeBanner, setSyncNoticeBanner] = useState<string | null>(null);

  // MultiPhotoLightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [lightboxSubtitle, setLightboxSubtitle] = useState('');
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);

  // Upload / Edit Form Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSizeTag, setFormSizeTag] = useState('180-60-90 cm');
  const [formPriceText, setFormPriceText] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formFeatureTags, setFormFeatureTags] = useState<string[]>(DEFAULT_FEATURE_TAGS);
  const [newFeatureTagInput, setNewFeatureTagInput] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drag & Drop States (Desktop file drop, photo reordering, and feature tag reordering)
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const imageDragDepthRef = useRef(0);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null);
  const [draggedFeatureTagIndex, setDraggedFeatureTagIndex] = useState<number | null>(null);
  const [dragOverFeatureTagIndex, setDragOverFeatureTagIndex] = useState<number | null>(null);

  // Delete Confirmation Modal State (replaces window.confirm for reliable cross-browser / iframe deletion)
  const [deletingItem, setDeletingItem] = useState<InStockItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Transfer Sold In-Stock Item -> Showcase Gallery Modal State
  const [transferringItem, setTransferringItem] = useState<InStockItem | null>(null);
  const [transferTitle, setTransferTitle] = useState('');
  const [transferSizeCategory, setTransferSizeCategory] = useState<ShowcaseSizeCategory>('120');
  const [transferDimensions, setTransferDimensions] = useState('');
  const [transferCustomerNote, setTransferCustomerNote] = useState('');
  const [transferTags, setTransferTags] = useState('');
  const [removeFromInStock, setRemoveFromInStock] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccessBanner, setTransferSuccessBanner] = useState<{
    title: string;
    sizeCategory: ShowcaseSizeCategory;
    removedFromStock: boolean;
  } | null>(null);

  const multiFileInputRef = useRef<HTMLInputElement>(null);

  const openItemLightbox = (item: InStockItem, startIndex = 0) => {
    const imgs = getItemImages(item);
    setLightboxTitle(item.title);
    setLightboxImages(imgs);
    setLightboxSubtitle(`${item.sizeTag}${item.priceText ? ` · ${item.priceText}` : ''} · 豐原門店現貨實拍（可現場自取或叫車載回）`);
    setLightboxInitialIndex(startIndex);
    setLightboxOpen(true);
  };

  const applyFirestoreSnapshotDocs = (
    docs: Array<{ id: string; data: () => Record<string, unknown> }>
  ) => {
    const deletedIdsFromCloud = new Set<string>();
    const remoteItems: InStockItem[] = [];

    docs.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = (typeof data.id === 'string' && data.id) || docSnap.id;
      if (data.deleted === true) {
        deletedIdsFromCloud.add(docId);
      } else if (typeof data.fullItemData === 'string') {
        try {
          const item = JSON.parse(data.fullItemData) as InStockItem;
          if (item && item.id) {
            remoteItems.push({
              ...item,
              updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : item.updatedAt
            });
          }
        } catch (e) {
          console.warn('JSON parse error in remote item:', e);
        }
      } else if (docId && typeof data.title === 'string' && typeof data.mainImage === 'string') {
        const fallbackImgs =
          Array.isArray(data.images) && data.images.length > 0
            ? data.images.filter((x): x is string => typeof x === 'string' && Boolean(x))
            : [data.mainImage, data.interiorImage, data.detailImage].filter(
                (x): x is string => typeof x === 'string' && Boolean(x)
              );
        remoteItems.push({
          id: docId,
          title: data.title,
          sizeTag: typeof data.sizeTag === 'string' && data.sizeTag ? data.sizeTag : '依標記尺寸',
          priceText: typeof data.priceText === 'string' && data.priceText ? data.priceText : undefined,
          status:
            data.status === 'reserved' || data.status === 'sold' ? data.status : 'available',
          mainImage: fallbackImgs[0] || data.mainImage,
          interiorImage:
            fallbackImgs[1] ||
            (typeof data.interiorImage === 'string' ? data.interiorImage : undefined),
          detailImage:
            fallbackImgs[2] ||
            (typeof data.detailImage === 'string' ? data.detailImage : undefined),
          images: fallbackImgs,
          description:
            typeof data.description === 'string' && data.description
              ? data.description
              : '台中豐原店內現成款式，已組裝完畢',
          features: Array.isArray(data.features)
            ? data.features.filter((x): x is string => typeof x === 'string')
            : ['純實木厚度1.5cm'],
          isCustomUpload: true,
          dateAdded: '門店最新實拍',
          updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined
        });
      }
    });

    // Sort newest updated/uploaded first so desktop & mobile display identical order
    remoteItems.sort((a, b) => {
      const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      if (!Number.isNaN(tb) && !Number.isNaN(ta) && tb !== ta) {
        return tb - ta;
      }
      return b.id.localeCompare(a.id);
    });

    const mergedDeletedIds = new Set<string>([
      ...Array.from(deletedIdsFromCloud),
      ...getLocalDeletedIds()
    ]);

    const activeDefaults = INITIAL_IN_STOCK_ITEMS.filter(
      (orig) => !mergedDeletedIds.has(orig.id) && !remoteItems.some((r) => r.id === orig.id)
    );
    const activeRemotes = remoteItems.filter((r) => !mergedDeletedIds.has(r.id));
    const cloudIdsSet = new Set(activeRemotes.map((r) => r.id));

    // Preserve any custom items stranded only in this device's localStorage or prior recovery queue
    const strandedMap = new Map<string, InStockItem>();
    try {
      const existingRecovery = loadRecoveryQueue<InStockItem>(INSTOCK_RECOVERY_KEY);
      existingRecovery.forEach((it) => {
        if (it && it.id && !cloudIdsSet.has(it.id) && !mergedDeletedIds.has(it.id)) {
          strandedMap.set(it.id, it);
        }
      });

      const cachedRaw = localStorage.getItem(STORAGE_KEY);
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw);
        if (Array.isArray(parsed)) {
          parsed.forEach((it: InStockItem) => {
            if (
              it &&
              it.id &&
              it.isCustomUpload &&
              !cloudIdsSet.has(it.id) &&
              !mergedDeletedIds.has(it.id)
            ) {
              strandedMap.set(it.id, it);
            }
          });
        }
      }
    } catch {
      // Keep whatever was collected so far
    }

    const strandedList = Array.from(strandedMap.values());
    saveRecoveryQueue(INSTOCK_RECOVERY_KEY, strandedList);

    const nextItems = [...activeRemotes, ...activeDefaults];

    setCloudStatus('synced');
    setCloudError(null);
    setCloudItemIds(cloudIdsSet);
    setUnsyncedLocalItems(strandedList);
    setItems(nextItems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
    } catch (err) {
      console.warn('Failed to sync snapshot to localStorage', err);
    }
  };

  // Subscribe to Firestore for live inventory updates across all devices
  useEffect(() => {
    try {
      const deletedIds = getLocalDeletedIds();
      const savedJson = localStorage.getItem(STORAGE_KEY);
      let combined: InStockItem[] = [];

      if (savedJson) {
        const parsed: InStockItem[] = JSON.parse(savedJson);
        if (Array.isArray(parsed)) {
          const customItems = parsed.filter((it) => it && it.id);
          const baseFiltered = INITIAL_IN_STOCK_ITEMS.filter(
            (it) => !deletedIds.includes(it.id) && !customItems.some((c) => c.id === it.id)
          );
          const customFiltered = customItems.filter((it) => !deletedIds.includes(it.id));
          combined = [...customFiltered, ...baseFiltered];
        } else {
          combined = INITIAL_IN_STOCK_ITEMS.filter((it) => !deletedIds.includes(it.id));
        }
      } else {
        combined = INITIAL_IN_STOCK_ITEMS.filter((it) => !deletedIds.includes(it.id));
      }
      setItems(combined);
    } catch (err) {
      console.warn('Failed to load in-stock items from storage', err);
      setItems(INITIAL_IN_STOCK_ITEMS);
    }

    const unsubscribe = onSnapshot(
      collection(db, 'inStockItems'),
      (snapshot) => {
        applyFirestoreSnapshotDocs(snapshot.docs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'inStockItems');
        setCloudStatus('error');
        setCloudError({
          message: formatFirestoreActionError(error, '讀取雲端門市現貨'),
          isQuota: isQuotaError(error)
        });
      }
    );

    return () => unsubscribe();
  }, []);

  const saveItems = (updated: InStockItem[]) => {
    setItems(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to write to localStorage', e);
    }
  };

  const handleManualCloudRefresh = async () => {
    if (isSyncingManual) return;
    setIsSyncingManual(true);
    setSyncNoticeBanner(null);
    try {
      const serverSnap = await getDocsFromServer(collection(db, 'inStockItems'));
      applyFirestoreSnapshotDocs(serverSnap.docs);
      setSyncNoticeBanner('已與雲端資料庫完成即時校對，手機與電腦現已為同一份最新現貨清單。');
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'inStockItems');
      setCloudStatus('error');
      setCloudError({
        message: formatFirestoreActionError(err, '手動重整雲端現貨'),
        isQuota: isQuotaError(err)
      });
    } finally {
      setIsSyncingManual(false);
    }
  };

  const syncSingleStrandedItem = async (localItem: InStockItem): Promise<InStockItem> => {
    const imgs = getItemImages(localItem);
    const nowIso = new Date().toISOString();
    const baseMeta = {
      id: localItem.id,
      title: localItem.title,
      sizeTag: localItem.sizeTag,
      priceText: localItem.priceText || '',
      status: localItem.status,
      description: localItem.description,
      features: localItem.features || [],
      isCustomUpload: true,
      deleted: false,
      updatedAt: nowIso
    };
    const fitted = await fitImagesWithinFirestoreLimit(imgs, baseMeta, {
      primaryField: 'mainImage',
      arrayField: 'images'
    });
    if (!fitted.ok) {
      throw new Error(fitted.reason);
    }

    await setDoc(doc(db, 'inStockItems', localItem.id), {
      ...baseMeta,
      mainImage: fitted.images[0],
      images: fitted.images
    });

    const syncedItem: InStockItem = {
      ...localItem,
      mainImage: fitted.images[0],
      interiorImage: fitted.images[1] || undefined,
      detailImage: fitted.images[2] || undefined,
      images: fitted.images,
      updatedAt: nowIso
    };
    removeLocalDeletedId(localItem.id);
    return syncedItem;
  };

  const handleSyncStrandedItem = async (localItemId: string) => {
    const localItem = unsyncedLocalItems.find((x) => x.id === localItemId);
    if (!localItem) return;
    setIsSyncingManual(true);
    setSyncNoticeBanner(null);
    try {
      const syncedItem = await syncSingleStrandedItem(localItem);
      const remainingQueue = unsyncedLocalItems.filter((x) => x.id !== localItem.id);
      saveRecoveryQueue(INSTOCK_RECOVERY_KEY, remainingQueue);
      setUnsyncedLocalItems(remainingQueue);
      setCloudItemIds((prev) => new Set(prev).add(localItem.id));
      setCloudStatus('synced');
      setCloudError(null);
      saveItems([syncedItem, ...items.filter((x) => x.id !== localItem.id)]);
      setSyncNoticeBanner(`已將「${localItem.title}」壓縮並補傳至雲端，手機／平板現在也可看到了！`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `inStockItems/${localItem.id}`);
      setCloudStatus('error');
      setCloudError({
        message: formatFirestoreActionError(err, '補傳至雲端'),
        isQuota: isQuotaError(err)
      });
    } finally {
      setIsSyncingManual(false);
    }
  };

  const handleSyncAllStrandedItems = async () => {
    if (unsyncedLocalItems.length === 0 || isSyncingManual) return;
    setIsSyncingManual(true);
    setSyncNoticeBanner(null);

    const syncedList: InStockItem[] = [];
    const remaining: InStockItem[] = [];
    let firstError: unknown = null;

    for (const candidate of unsyncedLocalItems) {
      try {
        const synced = await syncSingleStrandedItem(candidate);
        syncedList.push(synced);
      } catch (err) {
        if (!firstError) firstError = err;
        remaining.push(candidate);
      }
    }

    saveRecoveryQueue(INSTOCK_RECOVERY_KEY, remaining);
    setUnsyncedLocalItems(remaining);

    if (syncedList.length > 0) {
      const syncedIds = new Set(syncedList.map((s) => s.id));
      setCloudItemIds((prev) => {
        const next = new Set(prev);
        syncedList.forEach((s) => next.add(s.id));
        return next;
      });
      saveItems([...syncedList, ...items.filter((x) => !syncedIds.has(x.id))]);
    }

    if (remaining.length === 0) {
      setCloudStatus('synced');
      setCloudError(null);
      setSyncNoticeBanner(`已成功將全部 ${syncedList.length} 筆本機現貨壓縮補傳至雲端，所有裝置現在已同步！`);
    } else {
      setCloudStatus('error');
      setCloudError({
        message: formatFirestoreActionError(firstError, '批次補傳至雲端'),
        isQuota: isQuotaError(firstError)
      });
    }
    setIsSyncingManual(false);
  };

  const handleDiscardStrandedItem = (localItemId: string) => {
    const remaining = unsyncedLocalItems.filter((x) => x.id !== localItemId);
    saveRecoveryQueue(INSTOCK_RECOVERY_KEY, remaining);
    setUnsyncedLocalItems(remaining);
    setSyncNoticeBanner('已移除該筆僅存於本機的未同步暫存資料。');
  };

  const handleHideAllDefaultDemos = async () => {
    const activeDefaultIds = items
      .filter((it) => INITIAL_IN_STOCK_ITEMS.some((d) => d.id === it.id) && !cloudItemIds.has(it.id))
      .map((it) => it.id);
    if (activeDefaultIds.length === 0) return;

    setIsSyncingManual(true);
    try {
      const nowIso = new Date().toISOString();
      for (const defId of activeDefaultIds) {
        addLocalDeletedId(defId);
        await setDoc(doc(db, 'inStockItems', defId), {
          id: defId,
          deleted: true,
          updatedAt: nowIso
        });
      }
      saveItems(items.filter((it) => !activeDefaultIds.includes(it.id)));
      setSyncNoticeBanner('已清除全部系統預設範例款，手機與電腦將只顯示您實際上傳的門市現貨。');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'inStockItems/defaults');
      setCloudError({
        message: formatFirestoreActionError(err, '清除系統預設範例'),
        isQuota: isQuotaError(err)
      });
    } finally {
      setIsSyncingManual(false);
    }
  };

  const resetForm = () => {
    setEditingItemId(null);
    setFormTitle('');
    setFormSizeTag('180-60-90 cm');
    setFormPriceText('');
    setFormDescription('');
    setFormFeatureTags([...DEFAULT_FEATURE_TAGS]);
    setNewFeatureTagInput('');
    setFormImages([]);
    setFormError('');
    setIsDraggingImages(false);
    imageDragDepthRef.current = 0;
    setDraggedImageIndex(null);
    setDragOverImageIndex(null);
    setDraggedFeatureTagIndex(null);
    setDragOverFeatureTagIndex(null);
  };

  const handleOpenUploadModal = () => {
    if (!isOwner) {
      setAuthActionTitle('上傳門店現貨實拍');
      setIsAuthModalOpen(true);
      return;
    }
    resetForm();
    setIsUploadModalOpen(true);
  };

  const handleOpenEditModal = (item: InStockItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) {
      setAuthActionTitle('編輯門店現貨卡片');
      setIsAuthModalOpen(true);
      return;
    }
    setEditingItemId(item.id);
    setFormTitle(item.title);
    setFormSizeTag(item.sizeTag);
    setFormPriceText(item.priceText || '');
    setFormDescription(item.description);
    setFormFeatureTags(Array.isArray(item.features) ? [...item.features] : []);
    setNewFeatureTagInput('');
    setFormImages(getItemImages(item));
    setFormError('');
    setIsDraggingImages(false);
    imageDragDepthRef.current = 0;
    setDraggedImageIndex(null);
    setDragOverImageIndex(null);
    setDraggedFeatureTagIndex(null);
    setDragOverFeatureTagIndex(null);
    setIsUploadModalOpen(true);
  };

  const handleRequestDeleteItem = (item: InStockItem, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isOwner) {
      setAuthActionTitle('刪除現貨卡片');
      setIsAuthModalOpen(true);
      return;
    }
    setDeleteError('');
    setDeletingItem(item);
  };

  const handleConfirmDeleteItem = async () => {
    if (!deletingItem || isDeleting) return;
    const targetItem = deletingItem;

    setIsDeleting(true);
    setDeleteError('');

    try {
      await setDoc(doc(db, 'inStockItems', targetItem.id), {
        id: targetItem.id,
        deleted: true,
        updatedAt: new Date().toISOString()
      });

      addLocalDeletedId(targetItem.id);
      const remainingRecovery = unsyncedLocalItems.filter((x) => x.id !== targetItem.id);
      saveRecoveryQueue(INSTOCK_RECOVERY_KEY, remainingRecovery);
      setUnsyncedLocalItems(remainingRecovery);
      const updated = items.filter((it) => it.id !== targetItem.id);
      saveItems(updated);
      setCloudItemIds((prev) => {
        const next = new Set(prev);
        next.delete(targetItem.id);
        return next;
      });
      setDeletingItem(null);
      setSyncNoticeBanner(`已將「${targetItem.title}」從雲端與所有裝置的門市現貨清單移除。`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `inStockItems/${targetItem.id}`);
      setDeleteError(formatFirestoreActionError(err, '雲端刪除現貨'));
      if (isQuotaError(err)) {
        setCloudStatus('error');
        setCloudError({
          message: formatFirestoreActionError(err, '雲端刪除現貨'),
          isQuota: true
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenTransferModal = (item: InStockItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) {
      setAuthActionTitle('現貨已售出轉移至客製實品相冊');
      setIsAuthModalOpen(true);
      return;
    }

    const inferredSize = inferShowcaseSizeCategory(item.sizeTag, item.title);
    const cleanedBaseTitle = item.title
      .replace(/^(台中豐原門店現貨|門市現貨展示|熱門現貨|門市實品)\s*[·・:-]*\s*/u, '')
      .trim();

    setTransferringItem(item);
    setTransferTitle(`豐原門店完工實拍 · ${cleanedBaseTitle || item.title}`);
    setTransferSizeCategory(inferredSize);
    setTransferDimensions(item.sizeTag || '依標記尺寸');
    setTransferCustomerNote(
      item.description || '門市已售出完工實品，純松木足 1.5cm 無甲醛打造，支援同款 1:1 客製。'
    );
    const mergedTags = Array.from(new Set(['已售出實品', ...(item.features || [])])).slice(0, 6);
    setTransferTags(mergedTags.join(', '));
    setRemoveFromInStock(true);
    setTransferError('');
  };

  const handleConfirmTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringItem) return;

    const itemImages = getItemImages(transferringItem);
    if (itemImages.length === 0) {
      setTransferError('此現貨卡片缺少圖片，無法轉移至相冊');
      return;
    }
    if (!transferTitle.trim()) {
      setTransferError('請填寫轉入客製實品相冊後的作品標題');
      return;
    }

    setIsTransferring(true);
    setTransferError('');

    const showcaseId = `showcase-from-${transferringItem.id}-${Date.now()}`;
    const parsedTags = transferTags
      .split(/[,，\n]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const nowIso = new Date().toISOString();

    const showcaseMeta = {
      id: showcaseId,
      title: transferTitle.trim(),
      sizeCategory: transferSizeCategory,
      dimensions: transferDimensions.trim() || transferringItem.sizeTag || `${transferSizeCategory}cm 系列`,
      description:
        transferCustomerNote.trim() ||
        '豐原門市已售出完工實品照，純實木厚度 1.5cm，支援同款專屬客製。',
      tags: parsedTags.length > 0 ? parsedTags : ['已售出實品', '客製實木'],
      date: '門店售出實品',
      isCustomUpload: true,
      deleted: false,
      updatedAt: nowIso
    };

    let fittedImages: string[];
    try {
      const fitted = await fitImagesWithinFirestoreLimit(itemImages, showcaseMeta, {
        primaryField: 'imageUrl',
        arrayField: 'images'
      });
      if (!fitted.ok) {
        setTransferError(fitted.reason);
        setIsTransferring(false);
        return;
      }
      fittedImages = fitted.images;

      await setDoc(doc(db, 'showcasePhotos', showcaseId), {
        ...showcaseMeta,
        imageUrl: fittedImages[0],
        images: fittedImages
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `showcasePhotos/${showcaseId}`);
      const msg = formatFirestoreActionError(err, '轉移寫入客製實品相冊（雲端）');
      setTransferError(msg);
      if (isQuotaError(err)) {
        setCloudStatus('error');
        setCloudError({ message: msg, isQuota: true });
      }
      setIsTransferring(false);
      return;
    }

    const newShowcasePhoto: ShowcasePhoto = {
      id: showcaseId,
      title: showcaseMeta.title,
      sizeCategory: showcaseMeta.sizeCategory,
      dimensionsText: showcaseMeta.dimensions,
      imageUrl: fittedImages[0],
      images: fittedImages,
      customerNote: showcaseMeta.description,
      date: showcaseMeta.date,
      tags: showcaseMeta.tags,
      isCustomUpload: true
    };

    // Update ShowcaseGallery UI & localStorage cache only AFTER cloud write succeeded
    publishTransferredShowcasePhoto(newShowcasePhoto);

    // Optionally remove sold card from InStockSection (write to cloud BEFORE updating local UI)
    if (removeFromInStock) {
      try {
        await setDoc(doc(db, 'inStockItems', transferringItem.id), {
          id: transferringItem.id,
          deleted: true,
          updatedAt: new Date().toISOString()
        });
        addLocalDeletedId(transferringItem.id);
        const remainingRecovery = unsyncedLocalItems.filter((x) => x.id !== transferringItem.id);
        saveRecoveryQueue(INSTOCK_RECOVERY_KEY, remainingRecovery);
        setUnsyncedLocalItems(remainingRecovery);
        saveItems(items.filter((it) => it.id !== transferringItem.id));
        setCloudItemIds((prev) => {
          const next = new Set(prev);
          next.delete(transferringItem.id);
          return next;
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `inStockItems/${transferringItem.id}`);
        const removeErrMsg = formatFirestoreActionError(err, '從門市現貨區雲端下架');
        setTransferError(`已成功寫入客製實品相冊，但無法從門市現貨區雲端下架：${removeErrMsg}`);
        if (isQuotaError(err)) {
          setCloudStatus('error');
          setCloudError({ message: removeErrMsg, isQuota: true });
        }
        setIsTransferring(false);
        return;
      }
    }

    setTransferSuccessBanner({
      title: newShowcasePhoto.title,
      sizeCategory: transferSizeCategory,
      removedFromStock: removeFromInStock
    });

    setIsTransferring(false);
    setTransferringItem(null);
  };

  const hasDraggedFiles = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types || []).includes('Files');

  const processImageFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
    if (files.length === 0) {
      setFormError('請拖曳或選擇有效圖片檔案（JPG / PNG / WebP）');
      return;
    }

    try {
      setIsProcessingImages(true);
      setFormError('');
      const compressedList: string[] = [];
      for (const file of files) {
        const compressed = await compressImage(file, 840, 0.7);
        compressedList.push(compressed);
      }
      if (compressedList.length > 0) {
        setFormImages((prev) => [...prev, ...compressedList]);
      }
    } catch {
      setFormError('圖片壓縮處理失敗，請重試');
    } finally {
      setIsProcessingImages(false);
    }
  };

  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processImageFiles(files);
    e.target.value = '';
  };

  const handleImageDragEnter = (e: React.DragEvent) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    imageDragDepthRef.current += 1;
    setIsDraggingImages(true);
  };

  const handleImageDragOver = (e: React.DragEvent) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleImageDragLeave = (e: React.DragEvent) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    imageDragDepthRef.current = Math.max(0, imageDragDepthRef.current - 1);
    if (imageDragDepthRef.current === 0) {
      setIsDraggingImages(false);
    }
  };

  const handleImageDrop = async (e: React.DragEvent) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    imageDragDepthRef.current = 0;
    setIsDraggingImages(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processImageFiles(e.dataTransfer.files);
    }
  };

  const moveFormImage = (fromIdx: number, toIdx: number) => {
    if (
      fromIdx === toIdx ||
      fromIdx < 0 ||
      toIdx < 0 ||
      fromIdx >= formImages.length ||
      toIdx >= formImages.length
    ) {
      return;
    }
    setFormImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const handleSetPrimaryImage = (index: number) => {
    if (index <= 0 || index >= formImages.length) return;
    moveFormImage(index, 0);
  };

  const parseTagTokens = (raw: string): string[] =>
    raw
      .split(/[,，\n]+/)
      .map((t) => t.trim())
      .filter(Boolean);

  const handleAddFeatureTag = () => {
    const tokens = parseTagTokens(newFeatureTagInput);
    if (tokens.length === 0) return;
    setFormFeatureTags((prev) => {
      const next = [...prev];
      tokens.forEach((tag) => {
        if (!next.includes(tag)) {
          next.push(tag);
        }
      });
      return next;
    });
    setNewFeatureTagInput('');
  };

  const handleRemoveFeatureTag = (idx: number) => {
    setFormFeatureTags((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveFeatureTag = (fromIdx: number, toIdx: number) => {
    if (
      fromIdx === toIdx ||
      fromIdx < 0 ||
      toIdx < 0 ||
      fromIdx >= formFeatureTags.length ||
      toIdx >= formFeatureTags.length
    ) {
      return;
    }
    setFormFeatureTags((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formImages.length === 0) {
      setFormError('請至少上傳一張實拍照（第 1 張將預設為主圖）！');
      return;
    }
    if (!formTitle.trim()) {
      setFormError('請填寫現貨款式標題！');
      return;
    }

    // Merge any pending text in the tag input field seamlessly
    const pendingTags = parseTagTokens(newFeatureTagInput);
    const finalFeatures = [...formFeatureTags];
    pendingTags.forEach((tag) => {
      if (!finalFeatures.includes(tag)) {
        finalFeatures.push(tag);
      }
    });

    setIsSubmitting(true);
    setFormError('');
    const targetId = editingItemId || `instock-custom-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const baseMeta = {
      id: targetId,
      title: formTitle.trim(),
      sizeTag: formSizeTag.trim() || '依標記尺寸',
      priceText: formPriceText.trim() || '',
      status: 'available' as const,
      description:
        formDescription.trim() ||
        '台中豐原店內現成款式，已組裝完畢，可直接自取搬走或叫貨車拉走。',
      features: finalFeatures,
      isCustomUpload: true,
      deleted: false,
      updatedAt: nowIso
    };

    try {
      const fitted = await fitImagesWithinFirestoreLimit(formImages, baseMeta, {
        primaryField: 'mainImage',
        arrayField: 'images'
      });
      if (!fitted.ok) {
        setFormError(fitted.reason);
        setIsSubmitting(false);
        return;
      }

      const finalImages = fitted.images;

      // Write to Firestore FIRST so desktop never fakes a success when cloud rejects/exceeds quota
      await setDoc(doc(db, 'inStockItems', targetId), {
        ...baseMeta,
        mainImage: finalImages[0],
        images: finalImages
      });

      removeLocalDeletedId(targetId);
      const remainingRecovery = unsyncedLocalItems.filter((x) => x.id !== targetId);
      saveRecoveryQueue(INSTOCK_RECOVERY_KEY, remainingRecovery);
      setUnsyncedLocalItems(remainingRecovery);

      const newItem: InStockItem = {
        id: targetId,
        title: baseMeta.title,
        sizeTag: baseMeta.sizeTag,
        priceText: baseMeta.priceText || undefined,
        status: 'available',
        mainImage: finalImages[0],
        interiorImage: finalImages[1] || undefined,
        detailImage: finalImages[2] || undefined,
        images: finalImages,
        description: baseMeta.description,
        features: finalFeatures,
        isCustomUpload: true,
        dateAdded: '門店最新實拍',
        updatedAt: nowIso
      };

      const existingIdx = items.findIndex((it) => it.id === targetId);
      const updated =
        existingIdx >= 0
          ? items.map((it) => (it.id === targetId ? newItem : it))
          : [newItem, ...items];
      saveItems(updated);
      setCloudItemIds((prev) => new Set(prev).add(targetId));
      setCloudStatus('synced');
      setCloudError(null);
      setSyncNoticeBanner(`「${newItem.title}」已發佈並寫入雲端，電腦、手機與平板皆會即時同步顯示！`);

      setIsUploadModalOpen(false);
      resetForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `inStockItems/${targetId}`);
      setFormError(formatFirestoreActionError(err, '上傳至雲端資料庫'));
      if (isQuotaError(err)) {
        setCloudStatus('error');
        setCloudError({
          message: formatFirestoreActionError(err, '上傳至雲端資料庫'),
          isQuota: true
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="instock" className="py-16 sm:py-24 bg-[#F5EFE6] border-b border-stone-300/80 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-amber-900 bg-amber-200/60 border border-amber-300/80 mb-2.5">
              <PackageCheck className="w-4 h-4 text-amber-900" />
              <span>Taichung Fengyuan Store · 門市現貨實拍區</span>
            </div>
            <h2 className="font-serif-title text-xl min-[380px]:text-2xl sm:text-4xl font-bold text-stone-900 tracking-tight leading-snug">
              <span className="inline-block whitespace-nowrap">門市現貨 · 零修圖實拍</span>
              <span className="hidden sm:inline mx-2 text-stone-300" aria-hidden="true">/</span>
              <span className="block sm:inline text-amber-900 mt-0.5 sm:mt-0 whitespace-nowrap">現場滿意 · 免等帶回家</span>
            </h2>
            <p className="text-xs sm:text-base text-stone-700 mt-2.5 max-w-2xl leading-relaxed font-medium">
              <span className="inline-block">台中豐原店內已組裝完畢的實木現貨，</span>
              <span className="inline-block">看中即可現場自取或叫車載回，免去等待訂製工期。</span>
            </p>
          </div>

          {/* Store Owner Upload & Sync Controls (visible only when owner is authenticated) */}
          {isOwner && (
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
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
              {items.some(
                (it) => INITIAL_IN_STOCK_ITEMS.some((d) => d.id === it.id) && !cloudItemIds.has(it.id)
              ) && (
                <button
                  type="button"
                  onClick={handleHideAllDefaultDemos}
                  disabled={isSyncingManual}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors disabled:opacity-60"
                  title="一鍵移除未上傳的系統內建範例款式"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>移除系統預設範例</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenUploadModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-xl shadow-xs transition-all active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>店主上傳門店現貨實拍</span>
              </button>
              <button
                type="button"
                onClick={logout}
                className="px-2.5 py-2 text-[11px] text-stone-500 hover:text-stone-800 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors"
                title="登出店主管理狀態"
              >
                鎖定
              </button>
            </div>
          )}
        </div>

        {isOwner && (
          <CloudSyncStatusBar
            sectionLabel="門市現貨 · 零修圖實拍"
            cloudError={cloudError}
            onDismissError={() => setCloudError(null)}
            onRetrySync={handleManualCloudRefresh}
            syncNoticeBanner={syncNoticeBanner}
            onDismissNotice={() => setSyncNoticeBanner(null)}
            isSyncing={isSyncingManual}
            recoveryItems={unsyncedLocalItems.map((it) => ({
              id: it.id,
              title: it.title,
              subtitle: `${it.sizeTag} · 共 ${getItemImages(it).length} 張照片`,
              thumbnailUrl: getItemImages(it)[0] || it.mainImage
            }))}
            onSyncRecoveryItem={handleSyncStrandedItem}
            onDiscardRecoveryItem={handleDiscardStrandedItem}
            onSyncAllRecoveryItems={handleSyncAllStrandedItems}
          />
        )}

        {/* Important In-Stock Shipping & Self-Pickup Disclaimer Banner */}
        <div className="mb-8 p-4 sm:p-5 bg-amber-100/80 border-2 border-amber-300 rounded-2xl flex items-start gap-3.5 text-stone-800 shadow-xs">
          <div className="p-2 bg-amber-500/20 text-amber-900 rounded-xl shrink-0 mt-0.5">
            <Truck className="w-5 h-5 text-amber-900" />
          </div>
          <div className="space-y-1 text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-800" />
              <span>現貨取貨須知：</span>
            </div>
            <p className="text-stone-800 font-semibold leading-relaxed">
              店內的現貨有需要都是可以搬走，不包含運費！如果需要現貨需要自行搬走或叫貨車拉走自理。
            </p>
          </div>
        </div>

        {/* Owner Transfer Success Notification Banner */}
        {isOwner && transferSuccessBanner && (
          <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-emerald-950 shadow-xs">
            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">
                  已將「{transferSuccessBanner.title}」轉移至「客製實品相冊 ·{' '}
                  {transferSuccessBanner.sizeCategory === 'custom'
                    ? '客製化尺寸'
                    : `${transferSuccessBanner.sizeCategory}cm 系列`}
                  」！
                </div>
                <div className="text-xs text-emerald-800 mt-0.5">
                  {transferSuccessBanner.removedFromStock
                    ? '已同步從門市現貨區下架（標記售出），實拍多圖已保留於相冊中供客人參考訂製。'
                    : '已複製一份至客製實品相冊，門市現貨卡片仍繼續保留顯示。'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => focusShowcaseSizeCategory(transferSuccessBanner.sizeCategory)}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <span>前往客製實品相冊查看</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTransferSuccessBanner(null)}
                className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg"
                title="關閉提示"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* In-Stock Items Grid */}
        {items.length === 0 ? (
          <div className="text-center py-16 bg-white/70 rounded-3xl border border-dashed border-stone-300">
            <PackageCheck className="w-12 h-12 text-stone-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-stone-800">目前門市現貨已被搶購一空</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
              純實木貓別墅製作費時，門市現成款式數量有限！如需客製訂製或確認下一批現貨到店時間，歡迎直接加 LINE 諮詢。
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <a
                href={STORE_INFO.lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#06C755] rounded-xl shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>加 LINE 詢問下一批現貨</span>
              </a>
              {isOwner && (
                <button
                  type="button"
                  onClick={handleOpenUploadModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-900 bg-amber-100 rounded-xl hover:bg-amber-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>店主上傳新現貨</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item) => {
              const allImgs = getItemImages(item);
              return (
                <div
                  key={item.id}
                  onClick={() => openItemLightbox(item, 0)}
                  className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-amber-700/50 transition-all flex flex-col group relative cursor-pointer"
                >
                  {/* Photo Gallery Area */}
                  <div className="relative aspect-4/3 bg-stone-100 overflow-hidden">
                    <img
                      src={allImgs[0] || item.mainImage}
                      alt={`花花招財貓-台中豐原客製化1.5cm松木貓別墅-${item.sizeTag}（${item.title}）`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-black/20 pointer-events-none" />

                    {/* Top Badges */}
                    <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-amber-900 text-white text-[11px] font-bold rounded-lg shadow-sm font-mono tracking-wide">
                        {item.sizeTag}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-700/90 text-white text-[10px] font-semibold rounded-md shadow-2xs">
                        豐原門市現貨
                      </span>
                    </div>

                    {/* Top Right Photo Count + Zoom indicator */}
                    <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5">
                      {allImgs.length > 1 && (
                        <span className="px-2 py-1 bg-stone-900/75 text-white text-[11px] font-semibold rounded-lg backdrop-blur-xs flex items-center gap-1">
                          <Images className="w-3.5 h-3.5 text-amber-300" />
                          <span>共 {allImgs.length} 張</span>
                        </span>
                      )}
                      <div
                        className="p-2 bg-stone-900/60 group-hover:bg-stone-900 text-white rounded-xl backdrop-blur-xs transition-colors"
                        title="點擊放大滑動查看全部角度實拍"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Multi-angle Hint Bar & Quick Jump */}
                    {allImgs.length > 1 && (
                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white text-xs">
                        <span className="text-[10px] bg-black/65 px-2 py-0.5 rounded-md backdrop-blur-xs">
                          點擊看主圖/關門/開門/內飾 ({allImgs.length}張)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-serif-title font-bold text-stone-900 text-base group-hover:text-amber-900 transition-colors leading-snug">
                          {item.title}
                        </h3>
                        {item.priceText && (
                          <span className="text-sm font-bold text-amber-900 font-mono shrink-0">
                            {item.priceText}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Features checklist */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.features.map((ft, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md border border-stone-200"
                          >
                            <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                            <span>{ft}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Card Bottom */}
                    <div className="pt-3 border-t border-stone-100 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] text-stone-500">
                        <span className="flex items-center gap-1 text-amber-950 font-medium">
                          <MapPin className="w-3 h-3 text-amber-800" />
                          <span>門店現品已組裝 · 豐原自取</span>
                        </span>
                        <span className="text-stone-400 font-mono">現貨僅 1 台</span>
                      </div>

                      {/* Owner Controls Row (Shown strictly to authenticated owner) */}
                      {isOwner && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-xl bg-stone-50 border border-stone-200/90 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[10px] px-0.5">
                            {cloudItemIds.has(item.id) ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                雲端已同步（手機與電腦一致）
                              </span>
                            ) : INITIAL_IN_STOCK_ITEMS.some((d) => d.id === item.id) ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                系統預設範例（未上傳商品）
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-semibold text-stone-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                                {cloudStatus === 'error' ? '離線/額度滿快取中' : '等待雲端確認...'}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleOpenTransferModal(item, e)}
                            className="flex-1 min-w-[140px] px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1 whitespace-nowrap"
                            title="現貨已售出，直接轉移到客製實品相冊依尺寸展示"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
                            <span>已售出→轉實品相冊</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditModal(item, e)}
                            className="px-2.5 py-1.5 bg-amber-900 hover:bg-amber-800 text-white text-[11px] font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1 whitespace-nowrap"
                            title="編輯與新增多張照片"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>編輯</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleRequestDeleteItem(item, e)}
                            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1 whitespace-nowrap"
                            title="刪除現貨卡片"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>刪除</span>
                          </button>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openItemLightbox(item, 0);
                        }}
                        className="w-full py-2.5 px-3 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-amber-900 hover:text-white rounded-xl transition-colors text-center flex items-center justify-center gap-1.5"
                      >
                        <Images className="w-3.5 h-3.5" />
                        <span>查看實拍多圖（共 {allImgs.length} 張）</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload / Edit Modal (Store Owner Only) */}
      {isUploadModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn"
        >
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-stone-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif-title font-bold text-stone-900 text-base">
                    {editingItemId ? '編輯門店現貨實拍與多張照片' : '上傳台中豐原門店現貨實拍'}
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    支援桌面拖入多張照片，可自由拖曳或點擊按鈕調整照片與標籤順序
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm font-bold p-1"
                title="關閉視窗"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {formError && (
                <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-1.5 border border-red-200">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Multi-Photo Upload & Reorder Section */}
              <div
                onDragEnter={handleImageDragEnter}
                onDragOver={handleImageDragOver}
                onDragLeave={handleImageDragLeave}
                onDrop={handleImageDrop}
                className="relative rounded-xl transition-all"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block font-bold text-stone-800">
                    現貨多角度實拍照 * （第 1 張為主圖，按住拖曳或點 ◀ / ▶ 自由調整順序）
                  </label>
                  {isProcessingImages && (
                    <span className="text-[11px] font-semibold text-amber-800 animate-pulse shrink-0">
                      正在壓縮處理照片...
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  ref={multiFileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleMultipleImagesUpload}
                  className="hidden"
                />

                {isDraggingImages && (
                  <div className="absolute inset-0 z-20 rounded-xl border-2 border-dashed border-amber-700 bg-amber-50/95 backdrop-blur-xs flex flex-col items-center justify-center text-amber-950 pointer-events-none">
                    <Upload className="w-8 h-8 mb-1.5 text-amber-800 animate-bounce" />
                    <span className="font-bold text-sm">放開滑鼠即可直接上傳照片</span>
                    <span className="text-[11px] text-amber-800 mt-0.5">支援從電腦桌面一次拖曳多張圖片</span>
                  </div>
                )}

                {formImages.length > 0 ? (
                  <div className="space-y-2.5">
                    <div
                      className={`relative aspect-16/10 rounded-xl overflow-hidden bg-stone-100 border-2 flex items-center justify-center transition-colors ${
                        isDraggingImages ? 'border-amber-700' : 'border-stone-300'
                      }`}
                    >
                      <img src={formImages[0]} alt="現貨主圖預覽" className="w-full h-full object-contain" />
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-amber-900 text-white text-[10px] font-bold rounded">
                        第 1 張為主圖 · 共 {formImages.length} 張
                      </span>
                      <div className="absolute bottom-2 inset-x-2 flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 bg-white/90 text-stone-600 rounded-lg text-[10px] font-medium shadow-2xs hidden sm:inline-block">
                          支援桌面直接拖曳圖片至此區補圖
                        </span>
                        <button
                          type="button"
                          onClick={() => multiFileInputRef.current?.click()}
                          className="ml-auto px-3 py-1.5 bg-stone-900/85 hover:bg-stone-900 text-white rounded-lg text-xs font-semibold shadow-xs"
                        >
                          + 繼續添加照片 (可多選)
                        </button>
                      </div>
                    </div>

                    {/* Draggable & Button-Reorderable Thumbnail Strip */}
                    <div className="p-2 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-stone-500">
                        <span className="font-medium">拖曳縮圖或點擊下方箭頭調整輪播顯示順序</span>
                        <span className="font-mono">{formImages.length} 張</span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {formImages.map((imgUrl, i) => {
                          const isDraggedImg = draggedImageIndex === i;
                          const isDragOverImg =
                            dragOverImageIndex === i && draggedImageIndex !== i;
                          return (
                            <div
                              key={`${imgUrl.slice(0, 48)}-${i}`}
                              draggable
                              onDragStart={(e) => {
                                setDraggedImageIndex(i);
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('text/plain', String(i));
                              }}
                              onDragOver={(e) => {
                                if (hasDraggedFiles(e)) return;
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = 'move';
                                if (dragOverImageIndex !== i) {
                                  setDragOverImageIndex(i);
                                }
                              }}
                              onDrop={(e) => {
                                if (hasDraggedFiles(e)) return;
                                e.preventDefault();
                                e.stopPropagation();
                                const rawFrom = e.dataTransfer.getData('text/plain');
                                const fromIdx =
                                  draggedImageIndex !== null
                                    ? draggedImageIndex
                                    : Number(rawFrom);
                                if (!Number.isNaN(fromIdx)) {
                                  moveFormImage(fromIdx, i);
                                }
                                setDraggedImageIndex(null);
                                setDragOverImageIndex(null);
                              }}
                              onDragEnd={() => {
                                setDraggedImageIndex(null);
                                setDragOverImageIndex(null);
                              }}
                              className={`shrink-0 w-22 rounded-xl border-2 bg-white overflow-hidden transition-all select-none cursor-grab active:cursor-grabbing ${
                                isDraggedImg
                                  ? 'opacity-45 scale-95 border-amber-500'
                                  : isDragOverImg
                                    ? 'border-amber-700 ring-2 ring-amber-500/40'
                                    : i === 0
                                      ? 'border-amber-800 shadow-xs'
                                      : 'border-stone-200 hover:border-amber-400'
                              }`}
                              title="按住拖曳調整照片順序"
                            >
                              <div className="relative h-16 bg-stone-100">
                                <img
                                  src={imgUrl}
                                  alt={`實拍 ${i + 1}`}
                                  className="w-full h-full object-cover pointer-events-none"
                                />
                                <span
                                  className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold leading-none ${
                                    i === 0
                                      ? 'bg-amber-900 text-white'
                                      : 'bg-stone-900/75 text-white'
                                  }`}
                                >
                                  {i === 0 ? '主圖' : `#${i + 1}`}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFormImages((prev) => prev.filter((_, idx) => idx !== i));
                                  }}
                                  className="absolute top-0 right-0 bg-red-600 hover:bg-red-700 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-bl font-bold"
                                  title="刪除此張照片"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="flex items-center justify-between px-1 py-1 bg-stone-50 border-t border-stone-200 gap-0.5">
                                <button
                                  type="button"
                                  disabled={i === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveFormImage(i, i - 1);
                                  }}
                                  className="p-0.5 rounded text-stone-600 hover:bg-amber-100 hover:text-amber-900 disabled:opacity-25 disabled:cursor-not-allowed"
                                  title="往前移"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                {i === 0 ? (
                                  <span className="text-[9px] font-bold text-amber-900 px-1">
                                    第1張
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSetPrimaryImage(i);
                                    }}
                                    className="text-[9px] font-semibold text-amber-900 hover:bg-amber-100 px-1 py-0.5 rounded transition-colors whitespace-nowrap"
                                    title="直接移到第 1 張設為主圖"
                                  >
                                    設為主圖
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={i === formImages.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveFormImage(i, i + 1);
                                  }}
                                  className="p-0.5 rounded text-stone-600 hover:bg-amber-100 hover:text-amber-900 disabled:opacity-25 disabled:cursor-not-allowed"
                                  title="往後移"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => multiFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      isDraggingImages
                        ? 'border-amber-700 bg-amber-50'
                        : 'border-stone-300 hover:border-amber-700 bg-stone-50'
                    }`}
                  >
                    <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                    <p className="font-semibold text-stone-700">
                      將桌面多張照片拖曳到此處，或點擊連續選取上傳
                    </p>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      第 1 張預設為卡片主圖，上傳後可自由拖曳或用箭頭調整前後順序
                    </p>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  現貨款式標題 *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="例如：門市實品 · 180-60-90 旗艦雙層款現貨"
                  required
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-amber-900/20"
                />
              </div>

              {/* Dimensions Tag & Price */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    尺寸規格 (如 180-60-90)
                  </label>
                  <input
                    type="text"
                    value={formSizeTag}
                    onChange={(e) => setFormSizeTag(e.target.value)}
                    placeholder="180-60-90 cm"
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    現貨特惠價 (選填)
                  </label>
                  <input
                    type="text"
                    value={formPriceText}
                    onChange={(e) => setFormPriceText(e.target.value)}
                    placeholder="例如：NT$ 21,900"
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  現貨狀態備註說明
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="例如：門市展示樣品99成新已組裝完成，附通天柱與造型護欄，可現場確認滿意後搬走！"
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-amber-900/20"
                />
              </div>

              {/* Interactive Draggable Feature Tags List */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-bold text-stone-800">
                    特色標籤（可自由新增、刪除與拖曳調整順序）
                  </label>
                  <span className="text-[11px] text-stone-400 shrink-0">
                    目前 {formFeatureTags.length} 個標籤
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 min-h-9 p-2 bg-white rounded-lg border border-stone-200">
                  {formFeatureTags.length === 0 && (
                    <span className="text-[11px] text-stone-400 py-0.5 px-1">
                      尚未新增特色標籤，請在下方輸入後新增
                    </span>
                  )}
                  {formFeatureTags.map((tag, idx) => {
                    const isDraggedTag = draggedFeatureTagIndex === idx;
                    const isDragOverTag =
                      dragOverFeatureTagIndex === idx && draggedFeatureTagIndex !== idx;
                    return (
                      <span
                        key={`${tag}-${idx}`}
                        draggable
                        onDragStart={(e) => {
                          setDraggedFeatureTagIndex(idx);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', String(idx));
                        }}
                        onDragOver={(e) => {
                          if (hasDraggedFiles(e)) return;
                          e.preventDefault();
                          e.stopPropagation();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverFeatureTagIndex !== idx) {
                            setDragOverFeatureTagIndex(idx);
                          }
                        }}
                        onDrop={(e) => {
                          if (hasDraggedFiles(e)) return;
                          e.preventDefault();
                          e.stopPropagation();
                          const rawFrom = e.dataTransfer.getData('text/plain');
                          const fromIdx =
                            draggedFeatureTagIndex !== null
                              ? draggedFeatureTagIndex
                              : Number(rawFrom);
                          if (!Number.isNaN(fromIdx)) {
                            moveFeatureTag(fromIdx, idx);
                          }
                          setDraggedFeatureTagIndex(null);
                          setDragOverFeatureTagIndex(null);
                        }}
                        onDragEnd={() => {
                          setDraggedFeatureTagIndex(null);
                          setDragOverFeatureTagIndex(null);
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border select-none cursor-grab active:cursor-grabbing transition-all ${
                          isDraggedTag
                            ? 'opacity-40 scale-95 bg-amber-100 border-amber-400 text-amber-950'
                            : isDragOverTag
                              ? 'bg-amber-100 border-amber-700 text-amber-950 ring-2 ring-amber-600/40'
                              : 'bg-amber-50 text-amber-950 border-amber-200 hover:border-amber-400'
                        }`}
                        title="按住拖曳或點左右箭頭調整標籤順序"
                      >
                        <GripVertical className="w-3 h-3 text-amber-700/70 shrink-0" />
                        <span>{tag}</span>
                        <span className="inline-flex items-center gap-0.5 ml-0.5 border-l border-amber-200/80 pl-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveFeatureTag(idx, idx - 1)}
                            className="text-stone-400 hover:text-amber-900 disabled:opacity-25 disabled:cursor-not-allowed p-0.5"
                            title="往前移"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === formFeatureTags.length - 1}
                            onClick={() => moveFeatureTag(idx, idx + 1)}
                            className="text-stone-400 hover:text-amber-900 disabled:opacity-25 disabled:cursor-not-allowed p-0.5"
                            title="往後移"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFeatureTag(idx)}
                            className="text-stone-400 hover:text-red-600 transition-colors p-0.5 ml-0.5 font-bold"
                            title="刪除此標籤"
                          >
                            ✕
                          </button>
                        </span>
                      </span>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-0.5">
                  <input
                    type="text"
                    value={newFeatureTagInput}
                    onChange={(e) => setNewFeatureTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeatureTag();
                      }
                    }}
                    placeholder="輸入特色標籤（可逗號一次輸入多個，如：附通天抓柱, 煞車萬向輪）"
                    className="flex-1 bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-amber-900/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeatureTag}
                    className="px-3.5 py-1.5 bg-amber-900 hover:bg-amber-800 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors shrink-0"
                  >
                    新增標籤
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 bg-amber-900 hover:bg-amber-800 text-white font-semibold rounded-xl transition-colors shadow-xs disabled:opacity-60"
                >
                  {isSubmitting ? '儲存中...' : editingItemId ? '儲存變更' : '發佈門店現貨'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Sold In-Stock Item -> Showcase Gallery Modal */}
      {transferringItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200 overflow-y-auto max-h-[92vh]">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif-title font-bold text-stone-900 text-base">
                    現貨已售出 · 轉移至「客製實品相冊」
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    將保留所有實拍多角度照片，依尺寸分類納入客製實品相冊展示
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTransferringItem(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
                title="關閉視窗"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmTransfer} className="space-y-4 text-xs">
              {transferError && (
                <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-1.5 border border-red-200">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{transferError}</span>
                </div>
              )}

              {/* Photo strip preview */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-stone-700">
                    將一併轉移以下實拍照片
                  </span>
                  <span className="text-amber-900 font-semibold font-mono">
                    共 {getItemImages(transferringItem).length} 張
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {getItemImages(transferringItem).map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="relative w-16 h-16 rounded-lg overflow-hidden border border-stone-300 shrink-0 bg-white"
                    >
                      <img
                        src={imgUrl}
                        alt={`實拍 ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {idx === 0 && (
                        <span className="absolute bottom-0 inset-x-0 bg-amber-900 text-white text-[9px] text-center font-bold py-0.5">
                          主圖
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Target Size Category in ShowcaseGallery */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-stone-800">
                    歸類至「客製實品相冊」尺寸分類 *
                  </label>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    已依現貨規格自動判斷
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {(['60', '90', '120', '150', '180'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setTransferSizeCategory(size)}
                      className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                        transferSizeCategory === size
                          ? 'bg-amber-900 text-white border-amber-900 font-semibold shadow-xs'
                          : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      {size}cm
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTransferSizeCategory('custom')}
                    className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                      transferSizeCategory === 'custom'
                        ? 'bg-amber-900 text-white border-amber-900 font-semibold shadow-xs'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    客製化尺寸
                  </button>
                </div>
              </div>

              {/* Showcase Title & Dimensions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-stone-700 mb-1">
                    相冊展示標題 *
                  </label>
                  <input
                    type="text"
                    value={transferTitle}
                    onChange={(e) => setTransferTitle(e.target.value)}
                    placeholder="例如：豐原門店完工實拍 · 180-60-90 雙層旗艦款"
                    required
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    尺寸標記
                  </label>
                  <input
                    type="text"
                    value={transferDimensions}
                    onChange={(e) => setTransferDimensions(e.target.value)}
                    placeholder="180-60-90 cm"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Showcase Note */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  相冊作品說明／客人反饋
                </label>
                <textarea
                  rows={2}
                  value={transferCustomerNote}
                  onChange={(e) => setTransferCustomerNote(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  標籤（以逗號分隔）
                </label>
                <input
                  type="text"
                  value={transferTags}
                  onChange={(e) => setTransferTags(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              {/* Remove sold item from In-Stock checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeFromInStock}
                  onChange={(e) => setRemoveFromInStock(e.target.checked)}
                  className="mt-0.5 rounded border-stone-300 text-amber-900 focus:ring-amber-800"
                />
                <span className="text-xs text-stone-800 leading-relaxed">
                  <strong className="text-amber-950 block">
                    轉入相冊後，同時從「門市現貨區」移除下架
                  </strong>
                  <span className="text-[11px] text-stone-600">
                    勾選代表此台現貨已賣出帶走；若店內還有第二台相同現貨，可取消勾選僅複製展示到相冊。
                  </span>
                </span>
              </label>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setTransferringItem(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isTransferring}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>{isTransferring ? '轉移同步中...' : '確認轉移至客製實品相冊'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal (reliable across iFrames, LINE webview & desktop) */}
      {deletingItem && (
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
                    確定要刪除此門市現貨卡片？
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    刪除後將同步從官網「門市現貨」區塊移除
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeletingItem(null);
                  setDeleteError('');
                }}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg"
                title="關閉視窗"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200">
              <img
                src={getItemImages(deletingItem)[0] || deletingItem.mainImage}
                alt={deletingItem.title}
                className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0"
              />
              <div className="min-w-0">
                <div className="inline-block px-2 py-0.5 rounded bg-amber-900 text-white text-[10px] font-bold font-mono mb-1">
                  {deletingItem.sizeTag}
                </div>
                <div className="font-bold text-stone-900 text-xs truncate">
                  {deletingItem.title}
                </div>
                {deletingItem.priceText && (
                  <div className="text-[11px] font-semibold text-amber-900 font-mono mt-0.5">
                    {deletingItem.priceText}
                  </div>
                )}
              </div>
            </div>

            {deleteError && (
              <div className="p-2.5 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-1.5 border border-red-200">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-2 text-[11px] text-emerald-950">
              <span>若此台是現場售出，也可先移到「客製實品相冊」保留實拍照展示！</span>
              <button
                type="button"
                disabled={isDeleting}
                onClick={(e) => {
                  const target = deletingItem;
                  setDeletingItem(null);
                  setDeleteError('');
                  handleOpenTransferModal(target, e);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shrink-0 transition-colors"
              >
                改為轉移相冊
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeletingItem(null);
                  setDeleteError('');
                }}
                className="px-4 py-2.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteItem}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? '刪除同步中...' : '確認刪除現貨'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Owner Auth Modal */}
      <StoreOwnerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          if (authActionTitle.includes('上傳')) {
            resetForm();
            setIsUploadModalOpen(true);
          }
        }}
        actionTitle={authActionTitle}
      />

      {/* Multi-Photo Swipe/Arrow Lightbox */}
      <MultiPhotoLightbox
        isOpen={lightboxOpen}
        title={lightboxTitle}
        images={lightboxImages}
        subtitle={lightboxSubtitle}
        initialIndex={lightboxInitialIndex}
        onClose={() => setLightboxOpen(false)}
      />
    </section>
  );
};
