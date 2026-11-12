import React, { useState, useEffect, useRef } from 'react';
import { STORE_INFO } from '../data/catVillaData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { compressImage } from '../utils/imageCompressor';
import {
  PackageCheck,
  Plus,
  Trash2,
  Maximize2,
  MessageCircle,
  AlertTriangle,
  Sparkles,
  Camera,
  CheckCircle,
  Lock,
  ChevronRight,
  Truck,
  MapPin,
  X
} from 'lucide-react';

// Store Owner Auth Inline Helper for InStockSection
const AUTH_STORAGE_KEY = 'hhcat_store_owner_auth_v1';
const VALID_PASSKEYS = ['david19970829'];

const isStoreOwnerLoggedIn = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const useStoreOwner = () => {
  const [isOwner, setIsOwner] = useState<boolean>(() => isStoreOwnerLoggedIn());

  useEffect(() => {
    const handleUpdate = () => {
      setIsOwner(isStoreOwnerLoggedIn());
    };

    window.addEventListener('hhcat_owner_auth_change', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('hhcat_owner_auth_change', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const logout = () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      window.dispatchEvent(new Event('hhcat_owner_auth_change'));
    } catch (e) {
      console.warn(e);
    }
  };

  return { isOwner, logout };
};

interface StoreOwnerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionTitle?: string;
}

const StoreOwnerAuthModal: React.FC<StoreOwnerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionTitle = '使用上傳照片功能'
}) => {
  const [passkey, setPasskey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passkey.trim()) {
      setErrorMsg('請輸入店主管理通關密碼');
      return;
    }

    if (VALID_PASSKEYS.includes(passkey.trim().toLowerCase())) {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        window.dispatchEvent(new Event('hhcat_owner_auth_change'));
      } catch (err) {
        console.warn(err);
      }
      setErrorMsg('');
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setPasskey('');
        onClose();
        onSuccess();
      }, 700);
    } else {
      setErrorMsg('密碼不正確！此功能僅限【花花招財貓】店主陳店長本人使用。一般訪客如需諮詢或提供照片客製，請直接加 LINE。');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        <div className="bg-amber-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-800/80 text-amber-200">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-title font-bold text-base">店主身分安全驗證</h3>
              <p className="text-xs text-amber-200/80">花花招財貓 · 後台照片管理專區</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-amber-800/60 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/80 text-xs text-stone-700 space-y-1.5">
            <div className="font-bold text-amber-950">
              <span>僅限店主本人操作：{actionTitle}</span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              為維護官網展示照片品質，上傳照片與相冊管理權限僅開放給店主本人使用。訪客如欲訂製貓別墅或提供參考照片，歡迎直接加入店長官方 LINE 諮詢。
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <span>{errorMsg}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-2">
              <div className="text-sm font-bold text-emerald-900">店主身分驗證成功！</div>
              <p className="text-xs text-emerald-700">正在開啟管理面板...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  店主管理通關密碼：
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passkey}
                    onChange={(e) => setPasskey(e.target.value)}
                    placeholder="請輸入店主專屬管理密碼"
                    autoFocus
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-800 focus:border-amber-800 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? '隱藏' : '顯示'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-xl shadow-xs transition-colors"
                >
                  確認驗證解鎖
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export interface InStockItem {
  id: string;
  title: string;
  sizeTag: string; // e.g. "180-60-90 cm"
  priceText?: string; // e.g. "NT$ 21,900"
  status: 'available' | 'reserved' | 'sold';
  mainImage: string; // 整體主圖
  interiorImage?: string; // 內飾圖
  detailImage?: string; // 加裝詳細圖
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

export const InStockSection: React.FC<InStockSectionProps> = ({ onOpenImageZoom }) => {
  const { isOwner, logout } = useStoreOwner();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authActionTitle, setAuthActionTitle] = useState('店主管理操作');
  const [items, setItems] = useState<InStockItem[]>([]);
  const [selectedItemForModal, setSelectedItemForModal] = useState<InStockItem | null>(null);
  const [activePhotoTab, setActivePhotoTab] = useState<'main' | 'interior' | 'detail'>('main');

  // Upload Form Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formSizeTag, setFormSizeTag] = useState('180-60-90 cm');
  const [formPriceText, setFormPriceText] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formFeatures, setFormFeatures] = useState('純實木厚度1.5cm, 高透安全壓克力門, 門市組裝好現品');
  const [mainImagePreview, setMainImagePreview] = useState<string>('');
  const [interiorImagePreview, setInteriorImagePreview] = useState<string>('');
  const [detailImagePreview, setDetailImagePreview] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const interiorFileInputRef = useRef<HTMLInputElement>(null);
  const detailFileInputRef = useRef<HTMLInputElement>(null);

  // Load in-stock items from localStorage & subscribe to Firestore real-time cloud sync
  useEffect(() => {
    try {
      const deletedJson = localStorage.getItem(DELETED_KEY);
      const deletedIds: string[] = deletedJson ? JSON.parse(deletedJson) : [];

      const savedJson = localStorage.getItem(STORAGE_KEY);
      let combined: InStockItem[] = [];

      if (savedJson) {
        const parsed: InStockItem[] = JSON.parse(savedJson);
        if (Array.isArray(parsed)) {
          const customItems = parsed.filter((it) => it.isCustomUpload);
          const baseFiltered = INITIAL_IN_STOCK_ITEMS.filter((it) => !deletedIds.includes(it.id));
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
      console.warn('Failed to load in-stock items', err);
      setItems(INITIAL_IN_STOCK_ITEMS);
    }

    // Subscribe to Firestore for live inventory updates
    const unsubscribe = onSnapshot(
      collection(db, 'inStockItems'),
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteItems: InStockItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.fullItemData) {
              try {
                remoteItems.push(JSON.parse(data.fullItemData));
              } catch (e) {
                console.warn(e);
              }
            } else if (data.id && data.title && data.mainImage) {
              remoteItems.push({
                id: data.id,
                title: data.title,
                sizeTag: data.sizeTag || '依標記尺寸',
                priceText: data.priceText,
                status: (data.status as any) || 'available',
                mainImage: data.mainImage,
                interiorImage: data.interiorImage,
                detailImage: data.detailImage,
                description: data.description || '門店現成款式，已組裝完成',
                features: data.features || ['純實木厚度足 1.5cm', '高透安全壓克力門'],
                isCustomUpload: true,
                dateAdded: data.dateAdded || '最新門市實拍'
              });
            }
          });

          if (remoteItems.length > 0) {
            setItems((prev) => {
              const remainingDefaults = INITIAL_IN_STOCK_ITEMS.filter(
                (orig) => !remoteItems.some((r) => r.id === orig.id)
              );
              return [...remoteItems, ...remainingDefaults];
            });
          }
        }
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

  const handleOpenUploadModal = () => {
    if (!isOwner) {
      setAuthActionTitle('上傳門店現貨實拍');
      setIsAuthModalOpen(true);
      return;
    }
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
      if (selectedItemForModal?.id === item.id) {
        setSelectedItemForModal(null);
      }

      // Delete from cloud Firestore
      try {
        await deleteDoc(doc(db, 'inStockItems', item.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `inStockItems/${item.id}`);
      }
    }
  };

  const handleFileReader = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('請選擇有效圖片檔案（JPG / PNG / WebP）');
      return;
    }

    try {
      setFormError('');
      const compressed = await compressImage(file, 1200, 0.82);
      setter(compressed);
    } catch (err) {
      setFormError('圖片處理失敗，請重試');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainImagePreview) {
      setFormError('請至少上傳「整體主圖」！');
      return;
    }
    if (!formTitle.trim()) {
      setFormError('請填寫現貨款式標題！');
      return;
    }

    const newId = `instock-custom-${Date.now()}`;
    const newItem: InStockItem = {
      id: newId,
      title: formTitle.trim(),
      sizeTag: formSizeTag.trim() || '依標記尺寸',
      priceText: formPriceText.trim() || undefined,
      status: 'available',
      mainImage: mainImagePreview,
      interiorImage: interiorImagePreview || undefined,
      detailImage: detailImagePreview || undefined,
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

    const updated = [newItem, ...items];
    saveItems(updated);

    // Save to Cloud Firestore
    try {
      await setDoc(doc(db, 'inStockItems', newId), {
        id: newId,
        title: newItem.title,
        sizeTag: newItem.sizeTag,
        priceText: newItem.priceText || '',
        status: newItem.status,
        mainImage: newItem.mainImage,
        interiorImage: newItem.interiorImage || '',
        detailImage: newItem.detailImage || '',
        description: newItem.description,
        features: newItem.features,
        isCustomUpload: true,
        fullItemData: JSON.stringify(newItem),
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `inStockItems/${newId}`);
    }

    // Reset Form
    setIsUploadModalOpen(false);
    setFormTitle('');
    setFormPriceText('');
    setFormDescription('');
    setMainImagePreview('');
    setInteriorImagePreview('');
    setDetailImagePreview('');
    setFormError('');
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
            <h2 className="font-serif-title text-2xl sm:text-4xl font-bold text-stone-900 tracking-tight">
              現貨實拍展示，拒絕修圖，滿意直接帶走！
            </h2>
            <p className="text-sm sm:text-base text-stone-700 mt-2.5 max-w-3xl leading-relaxed font-medium">
              純實木別墅製作費時，門市現貨更是搶手。這裡展示目前在台中豐原店內的現成款式，看中哪一款？別猶豫，因為下一秒可能就被其他貓奴帶回家了！
            </p>
          </div>

          {/* Store Owner Upload Button */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={handleOpenUploadModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-xl shadow-xs transition-all active:scale-95"
            >
              {isOwner ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <Camera className="w-4 h-4" />
                  <span>店主上傳門店現貨實拍</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-200" />
                  <Camera className="w-3.5 h-3.5 text-white" />
                  <span>店主專用 · 上傳門店現貨實拍</span>
                </>
              )}
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={logout}
                className="px-2.5 py-2 text-[11px] text-stone-500 hover:text-stone-800 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors"
                title="登出店主管理狀態"
              >
                鎖定
              </button>
            )}
          </div>
        </div>

        {/* Important In-Stock Shipping & Self-Pickup Disclaimer Banner */}
        <div className="mb-10 p-4 sm:p-5 bg-amber-100/80 border-2 border-amber-300 rounded-2xl flex items-start gap-3.5 text-stone-800 shadow-xs">
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
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-amber-700/50 transition-all flex flex-col group relative"
              >
                {/* Photo Gallery Area */}
                <div className="relative aspect-4/3 bg-stone-100 overflow-hidden">
                  <img
                    src={item.mainImage}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                    onClick={() => {
                      if (onOpenImageZoom) {
                        onOpenImageZoom(
                          item.title,
                          item.mainImage,
                          `${item.sizeTag} · 門市現場實品實拍 · ${item.description}`
                        );
                      } else {
                        setSelectedItemForModal(item);
                      }
                    }}
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-black/20 pointer-events-none" />

                  {/* Top Badges */}
                  <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-amber-900 text-white text-[11px] font-bold rounded-lg shadow-sm font-mono tracking-wide">
                      {item.sizeTag}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-600/90 text-white text-[10px] font-semibold rounded-md shadow-2xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      豐原門市現貨
                    </span>
                  </div>

                  {/* Zoom indicator button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenImageZoom) {
                        onOpenImageZoom(item.title, item.mainImage, item.description);
                      } else {
                        setSelectedItemForModal(item);
                      }
                    }}
                    className="absolute top-3.5 right-3.5 p-2 bg-stone-900/60 hover:bg-stone-900 text-white rounded-xl backdrop-blur-xs transition-colors"
                    title="點擊放大查看整體主圖"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>

                  {/* Multiple Detail Thumbnails bar if available */}
                  {(item.interiorImage || item.detailImage) && (
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-xs">
                          多角度實拍：
                        </span>
                        {item.interiorImage && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenImageZoom) {
                                onOpenImageZoom(
                                  `${item.title} - 內飾空間實拍`,
                                  item.interiorImage!,
                                  '內部躍升跳台、貓頭休息房與動線配置'
                                );
                              } else {
                                setSelectedItemForModal(item);
                                setActivePhotoTab('interior');
                              }
                            }}
                            className="text-[10px] bg-white/90 text-stone-800 hover:bg-amber-100 hover:text-amber-900 px-2 py-0.5 rounded font-semibold transition-colors shadow-xs"
                          >
                            內飾圖 🔍
                          </button>
                        )}
                        {item.detailImage && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenImageZoom) {
                                onOpenImageZoom(
                                  `${item.title} - 加裝細節實拍`,
                                  item.detailImage!,
                                  '壓克力門片、通風百葉、五金鉸鏈與通天柱細節'
                                );
                              } else {
                                setSelectedItemForModal(item);
                                setActivePhotoTab('detail');
                              }
                            }}
                            className="text-[10px] bg-white/90 text-stone-800 hover:bg-amber-100 hover:text-amber-900 px-2 py-0.5 rounded font-semibold transition-colors shadow-xs"
                          >
                            細節圖 🔍
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItemForModal(item);
                        }}
                        className="text-[10px] text-amber-200 underline hover:text-white"
                      >
                        看全部細節
                      </button>
                    </div>
                  )}

                  {/* Owner Delete Button */}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(item, e)}
                      className="absolute bottom-3 right-3 z-10 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded-lg shadow-md transition-colors flex items-center gap-1"
                      title="現貨賣出後刪除此卡片"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>現貨賣出/刪除</span>
                    </button>
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

                  {/* Card Bottom: In-Stock Self-Pickup Note & Direct Booking CTA */}
                  <div className="pt-3 border-t border-stone-100 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span className="flex items-center gap-1 text-amber-950 font-medium">
                        <MapPin className="w-3 h-3 text-amber-800" />
                        <span>門店現品已組裝 · 豐原自取</span>
                      </span>
                      <span className="text-stone-400 font-mono">現貨僅 1 台</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedItemForModal(item)}
                        className="py-2.5 px-3 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors text-center"
                      >
                        查看細節多圖
                      </button>

                      <a
                        href={`${STORE_INFO.lineUrl}?text=${encodeURIComponent(
                          `您好！我在官網看到門市現貨【${item.title} (${item.sizeTag})】，想詢問目前豐原店內是否還在庫？我想安排前往自取或叫車拉走！`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 px-3 text-xs font-semibold text-white bg-[#06C755] hover:bg-[#05b34c] rounded-xl shadow-xs transition-colors text-center flex items-center justify-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>搶訂此款現貨</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Multi-photo Detail Inspection Modal for In-Stock Item */}
      {selectedItemForModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setSelectedItemForModal(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-stone-200 max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-amber-800 tracking-wider uppercase">
                  門市實拍照細節展示
                </div>
                <h3 className="font-serif-title font-bold text-stone-900 text-base sm:text-lg">
                  {selectedItemForModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemForModal(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Active Image Display */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {/* Photo Selector Tabs */}
              <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                <button
                  type="button"
                  onClick={() => setActivePhotoTab('main')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activePhotoTab === 'main'
                      ? 'bg-amber-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  整體主圖
                </button>
                {selectedItemForModal.interiorImage && (
                  <button
                    type="button"
                    onClick={() => setActivePhotoTab('interior')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      activePhotoTab === 'interior'
                        ? 'bg-amber-900 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    內飾空間圖
                  </button>
                )}
                {selectedItemForModal.detailImage && (
                  <button
                    type="button"
                    onClick={() => setActivePhotoTab('detail')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      activePhotoTab === 'detail'
                        ? 'bg-amber-900 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    加裝詳細圖
                  </button>
                )}
              </div>

              {/* Displayed Image */}
              <div className="relative aspect-4/3 bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 flex items-center justify-center">
                <img
                  src={
                    activePhotoTab === 'interior' && selectedItemForModal.interiorImage
                      ? selectedItemForModal.interiorImage
                      : activePhotoTab === 'detail' && selectedItemForModal.detailImage
                      ? selectedItemForModal.detailImage
                      : selectedItemForModal.mainImage
                  }
                  alt={selectedItemForModal.title}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Details & Self-Pickup Reminder */}
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-stone-100 rounded">
                    尺寸：{selectedItemForModal.sizeTag}
                  </span>
                  {selectedItemForModal.priceText && (
                    <span className="text-amber-900 font-bold font-mono text-base">
                      {selectedItemForModal.priceText}
                    </span>
                  )}
                </div>

                <p className="text-stone-700 leading-relaxed">
                  {selectedItemForModal.description}
                </p>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">現貨搬運自理須知：</strong>
                    <span>店內現貨有需要都是可以搬走，不包含運費！如需現貨請自行來店自取或叫貨車拉走。門店地址：臺中市豐原區圓環西路97號（參觀請提前預約避免跑空）。</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
              {isOwner ? (
                <button
                  type="button"
                  onClick={() => handleDeleteItem(selectedItemForModal)}
                  className="px-4 py-2.5 text-xs font-semibold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>現貨已售出 · 刪除此現貨</span>
                </button>
              ) : (
                <div className="text-[11px] text-stone-500">
                  門店預約電話：0966-129-569
                </div>
              )}

              <a
                href={`${STORE_INFO.lineUrl}?text=${encodeURIComponent(
                  `您好！我在網站看到門市現貨【${selectedItemForModal.title} (${selectedItemForModal.sizeTag})】，想預約門店看實品與確認現貨是否還在！`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 py-2.5 px-5 text-xs font-semibold text-white bg-[#06C755] hover:bg-[#05b34c] rounded-xl shadow-xs transition-colors ml-auto"
              >
                <MessageCircle className="w-4 h-4" />
                <span>加 LINE 詢問 / 搶訂現貨</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal (Store Owner Only) */}
      {isUploadModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setIsUploadModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200 overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif-title font-bold text-stone-900 text-base">
                    上傳台中豐原門店現貨實拍
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    可上傳整體主圖、內飾圖與加裝詳細圖，賣出後可隨時刪除
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

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

              {/* 1. Overall Main Image */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-800">
                    1. 整體主圖 * (外觀全景)
                  </label>
                  {mainImagePreview && (
                    <span className="text-[10px] text-emerald-600 font-semibold">已選擇</span>
                  )}
                </div>
                <input
                  type="file"
                  ref={mainFileInputRef}
                  accept="image/*"
                  onChange={(e) => handleFileReader(e, setMainImagePreview)}
                  className="w-full text-xs text-stone-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-md file:border-0 file:bg-amber-100 file:text-amber-900 file:font-semibold cursor-pointer"
                />
                {mainImagePreview && (
                  <div className="relative aspect-16/9 rounded-lg overflow-hidden border border-stone-300 max-h-32">
                    <img src={mainImagePreview} alt="主圖預覽" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>

              {/* 2. Interior Layout Image */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-800">
                    2. 內飾圖 (跳台/隔層/貓砂空間，選填)
                  </label>
                  {interiorImagePreview && (
                    <span className="text-[10px] text-emerald-600 font-semibold">已選擇</span>
                  )}
                </div>
                <input
                  type="file"
                  ref={interiorFileInputRef}
                  accept="image/*"
                  onChange={(e) => handleFileReader(e, setInteriorImagePreview)}
                  className="w-full text-xs text-stone-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-md file:border-0 file:bg-stone-200 file:text-stone-800 file:font-semibold cursor-pointer"
                />
                {interiorImagePreview && (
                  <div className="relative aspect-16/9 rounded-lg overflow-hidden border border-stone-300 max-h-32">
                    <img src={interiorImagePreview} alt="內飾預覽" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>

              {/* 3. Detail Hardware & Add-ons Image */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-800">
                    3. 加裝詳細圖 (五金/通風孔/通天柱，選填)
                  </label>
                  {detailImagePreview && (
                    <span className="text-[10px] text-emerald-600 font-semibold">已選擇</span>
                  )}
                </div>
                <input
                  type="file"
                  ref={detailFileInputRef}
                  accept="image/*"
                  onChange={(e) => handleFileReader(e, setDetailImagePreview)}
                  className="w-full text-xs text-stone-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-md file:border-0 file:bg-stone-200 file:text-stone-800 file:font-semibold cursor-pointer"
                />
                {detailImagePreview && (
                  <div className="relative aspect-16/9 rounded-lg overflow-hidden border border-stone-300 max-h-32">
                    <img src={detailImagePreview} alt="細節預覽" className="w-full h-full object-contain" />
                  </div>
                )}
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
                  className="flex-1 py-2.5 px-4 bg-amber-900 hover:bg-amber-800 text-white font-semibold rounded-xl transition-colors shadow-xs"
                >
                  發佈門店現貨
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

      {/* Store Owner Auth Modal */}
      <StoreOwnerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          if (authActionTitle === '上傳門店現貨實拍') {
            setIsUploadModalOpen(true);
          }
        }}
        actionTitle={authActionTitle}
      />
    </section>
  );
};
