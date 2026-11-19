import React, { useState, useEffect, useRef } from 'react';
import { STORE_INFO, ShowcasePhoto } from '../data/catVillaData';
import { MultiPhotoLightbox } from './MultiPhotoLightbox';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { compressImage } from '../utils/imageCompressor';
import { useStoreOwner } from '../utils/adminAuth';
import { StoreOwnerAuthModal } from './StoreOwnerAuthModal';
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
  ArrowRight
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
}

const STORAGE_KEY = 'hhcat_instock_items_v2';
const DELETED_KEY = 'hhcat_deleted_instock_ids_v1';

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
  const [formFeatures, setFormFeatures] = useState('純實木厚度1.5cm, 高透安全壓克力門, 門市組裝好現品');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Subscribe to Firestore for live inventory updates across all devices
  useEffect(() => {
    try {
      const deletedJson = localStorage.getItem(DELETED_KEY);
      const deletedIds: string[] = deletedJson ? JSON.parse(deletedJson) : [];
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
        const deletedIdsFromCloud = new Set<string>();
        const remoteItems: InStockItem[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.deleted === true) {
            deletedIdsFromCloud.add(data.id || docSnap.id);
          } else if (data.fullItemData) {
            try {
              const item = JSON.parse(data.fullItemData);
              if (item && item.id) {
                remoteItems.push(item);
              }
            } catch (e) {
              console.warn('JSON parse error in remote item:', e);
            }
          } else if (data.id && data.title && data.mainImage) {
            const fallbackImgs = Array.isArray(data.images) && data.images.length > 0
              ? data.images
              : [data.mainImage, data.interiorImage, data.detailImage].filter(Boolean);
            remoteItems.push({
              id: data.id,
              title: data.title,
              sizeTag: data.sizeTag || '依標記尺寸',
              priceText: data.priceText || undefined,
              status: data.status || 'available',
              mainImage: fallbackImgs[0] || data.mainImage,
              interiorImage: fallbackImgs[1] || data.interiorImage || undefined,
              detailImage: fallbackImgs[2] || data.detailImage || undefined,
              images: fallbackImgs,
              description: data.description || '台中豐原店內現成款式，已組裝完畢',
              features: data.features || ['純實木厚度1.5cm'],
              isCustomUpload: true,
              dateAdded: '門店最新實拍'
            });
          }
        });

        setItems(() => {
          const activeDefaults = INITIAL_IN_STOCK_ITEMS.filter(
            (orig) => !deletedIdsFromCloud.has(orig.id) && !remoteItems.some((r) => r.id === orig.id)
          );
          const activeRemotes = remoteItems.filter((r) => !deletedIdsFromCloud.has(r.id));
          return [...activeRemotes, ...activeDefaults];
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'inStockItems');
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

  const resetForm = () => {
    setEditingItemId(null);
    setFormTitle('');
    setFormSizeTag('180-60-90 cm');
    setFormPriceText('');
    setFormDescription('');
    setFormFeatures('純實木厚度1.5cm, 高透安全壓克力門, 門市組裝好現品');
    setFormImages([]);
    setFormError('');
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
    setFormFeatures(item.features.join(', '));
    setFormImages(getItemImages(item));
    setFormError('');
    setIsUploadModalOpen(true);
  };

  const handleDeleteItem = async (item: InStockItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isOwner) {
      setAuthActionTitle('刪除現貨卡片');
      setIsAuthModalOpen(true);
      return;
    }

    if (
      window.confirm(
        `確定要刪除現貨【${item.title}】嗎？\n（當此款現貨已售出或已搬走，可執行刪除）`
      )
    ) {
      try {
        const deletedJson = localStorage.getItem(DELETED_KEY);
        const deletedIds: string[] = deletedJson ? JSON.parse(deletedJson) : [];
        if (!deletedIds.includes(item.id)) {
          deletedIds.push(item.id);
          localStorage.setItem(DELETED_KEY, JSON.stringify(deletedIds));
        }
      } catch (err) {
        console.warn(err);
      }

      const updated = items.filter((it) => it.id !== item.id);
      saveItems(updated);

      try {
        await setDoc(doc(db, 'inStockItems', item.id), {
          id: item.id,
          deleted: true,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `inStockItems/${item.id}`);
      }
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

    const newShowcasePhoto: ShowcasePhoto = {
      id: showcaseId,
      title: transferTitle.trim(),
      sizeCategory: transferSizeCategory,
      dimensionsText: transferDimensions.trim() || transferringItem.sizeTag || `${transferSizeCategory}cm 系列`,
      imageUrl: itemImages[0],
      images: itemImages,
      customerNote:
        transferCustomerNote.trim() ||
        '豐原門市已售出完工實品照，純實木厚度 1.5cm，支援同款專屬客製。',
      date: '門店售出實品',
      tags: parsedTags.length > 0 ? parsedTags : ['已售出實品', '客製實木'],
      isCustomUpload: true
    };

    try {
      await setDoc(doc(db, 'showcasePhotos', showcaseId), {
        id: showcaseId,
        title: newShowcasePhoto.title,
        sizeCategory: newShowcasePhoto.sizeCategory,
        dimensions: newShowcasePhoto.dimensionsText,
        description: newShowcasePhoto.customerNote,
        imageUrl: newShowcasePhoto.imageUrl,
        images: newShowcasePhoto.images || [],
        tags: newShowcasePhoto.tags,
        date: newShowcasePhoto.date,
        isCustomUpload: true,
        deleted: false,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `showcasePhotos/${showcaseId}`);
    }

    // Instantly update ShowcaseGallery UI & localStorage cache
    publishTransferredShowcasePhoto(newShowcasePhoto);

    // Optionally remove sold card from InStockSection (default true)
    if (removeFromInStock) {
      try {
        const deletedJson = localStorage.getItem(DELETED_KEY);
        const deletedIds: string[] = deletedJson ? JSON.parse(deletedJson) : [];
        if (!deletedIds.includes(transferringItem.id)) {
          deletedIds.push(transferringItem.id);
          localStorage.setItem(DELETED_KEY, JSON.stringify(deletedIds));
        }
      } catch (err) {
        console.warn(err);
      }

      const remainingStock = items.filter((it) => it.id !== transferringItem.id);
      saveItems(remainingStock);

      try {
        await setDoc(doc(db, 'inStockItems', transferringItem.id), {
          id: transferringItem.id,
          deleted: true,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `inStockItems/${transferringItem.id}`);
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

  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setFormError('');
      const compressedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const compressed = await compressImage(file, 960, 0.74);
          compressedList.push(compressed);
        }
      }
      if (compressedList.length > 0) {
        setFormImages((prev) => [...prev, ...compressedList]);
      } else {
        setFormError('請選擇有效圖片檔案（JPG / PNG / WebP）');
      }
    } catch {
      setFormError('圖片壓縮處理失敗，請重試');
    } finally {
      e.target.value = '';
    }
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

    setIsSubmitting(true);
    const targetId = editingItemId || `instock-custom-${Date.now()}`;
    const newItem: InStockItem = {
      id: targetId,
      title: formTitle.trim(),
      sizeTag: formSizeTag.trim() || '依標記尺寸',
      priceText: formPriceText.trim() || undefined,
      status: 'available',
      mainImage: formImages[0],
      interiorImage: formImages[1] || undefined,
      detailImage: formImages[2] || undefined,
      images: formImages,
      description:
        formDescription.trim() ||
        '台中豐原店內現成款式，已組裝完畢，可直接自取搬走或叫貨車拉走。',
      features: formFeatures
        .split(/[,，\n]+/)
        .map((f) => f.trim())
        .filter(Boolean),
      isCustomUpload: true,
      dateAdded: '門店最新實拍'
    };

    const existingIdx = items.findIndex((it) => it.id === targetId);
    const updated =
      existingIdx >= 0
        ? items.map((it) => (it.id === targetId ? newItem : it))
        : [newItem, ...items];
    saveItems(updated);

    try {
      await setDoc(doc(db, 'inStockItems', targetId), {
        id: targetId,
        title: newItem.title,
        sizeTag: newItem.sizeTag,
        priceText: newItem.priceText || '',
        status: newItem.status,
        mainImage: newItem.mainImage,
        images: newItem.images || [],
        description: newItem.description,
        features: newItem.features,
        isCustomUpload: true,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `inStockItems/${targetId}`);
    }

    setIsSubmitting(false);
    setIsUploadModalOpen(false);
    resetForm();
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

          {/* Store Owner Upload Button (visible only when owner is authenticated) */}
          {isOwner && (
            <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
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
                          className="p-2 rounded-xl bg-stone-50 border border-stone-200/90 flex flex-wrap items-center gap-1.5"
                        >
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
                            onClick={(e) => handleDeleteItem(item, e)}
                            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1 whitespace-nowrap"
                            title="直接刪除現貨卡片"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>刪除</span>
                          </button>
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
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200 overflow-y-auto max-h-[90vh]">
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
                    支援連續多選上傳（第 1 張為主圖，其餘為開門/關門/內部/內飾圖）
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm font-bold p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Multi-Photo Upload Section */}
              <div>
                <label className="block font-bold text-stone-800 mb-1.5">
                  現貨多角度實拍照 * （可連續選取多張：主圖關門、開門、內部、內飾等）
                </label>
                <input
                  type="file"
                  ref={multiFileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleMultipleImagesUpload}
                  className="hidden"
                />

                {formImages.length > 0 ? (
                  <div className="space-y-2.5">
                    <div className="relative aspect-16/10 rounded-xl overflow-hidden bg-stone-100 border border-stone-300 flex items-center justify-center">
                      <img src={formImages[0]} alt="現貨主圖預覽" className="w-full h-full object-contain" />
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-amber-900 text-white text-[10px] font-bold rounded">
                        預設主圖 · 共 {formImages.length} 張
                      </span>
                      <button
                        type="button"
                        onClick={() => multiFileInputRef.current?.click()}
                        className="absolute bottom-2 right-2 px-3 py-1.5 bg-stone-900/85 hover:bg-stone-900 text-white rounded-lg text-xs font-semibold shadow-xs"
                      >
                        + 繼續添加照片 (可多選)
                      </button>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {formImages.map((imgUrl, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-stone-300 shrink-0">
                          <img src={imgUrl} alt={`實拍 ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setFormImages(formImages.filter((_, idx) => idx !== i))}
                            className="absolute top-0 right-0 bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-bl font-bold"
                            title="刪除此張照片"
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
                    onClick={() => multiFileInputRef.current?.click()}
                    className="border-2 border-dashed border-stone-300 hover:border-amber-700 bg-stone-50 rounded-xl p-6 text-center cursor-pointer transition-colors"
                  >
                    <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                    <p className="font-semibold text-stone-700">點擊連續上傳多張現貨實拍照片（可多選）</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">第 1 張預設為卡片主圖，點開可左右滑動觀看全角度</p>
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

              {/* Features list */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  特色標籤（以逗號分隔）
                </label>
                <input
                  type="text"
                  value={formFeatures}
                  onChange={(e) => setFormFeatures(e.target.value)}
                  placeholder="純實木厚度1.5cm, 高透安全壓克力門, 附通天抓柱"
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs"
                />
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
