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

export interface InStockItem {
  id: string;
  title: string;
  sizeTag: string;
  priceText?: string;
  status: 'available' | 'reserved' | 'sold';
  mainImage: string;
  interiorImage?: string;
  detailImage?: string;
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

  useEffect(() => {
    // 訂閱 Firebase 雲端資料庫（開放全權限 list 查詢）
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
            remoteItems.push({
              id: data.id,
              title: data.title,
              sizeTag: data.sizeTag || '依標記尺寸',
              priceText: data.priceText || undefined,
              status: data.status || 'available',
              mainImage: data.mainImage,
              interiorImage: data.interiorImage || undefined,
              detailImage: data.detailImage || undefined,
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
      const updated = items.filter((it) => it.id !== item.id);
      saveItems(updated);
      if (selectedItemForModal?.id === item.id) {
        setSelectedItemForModal(null);
      }

      // Mark tombstone in Cloud Firestore
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
      description: formDescription.trim() || '台中豐原店內現成款式，已組裝完畢，可直接自取搬走。',
      features: formFeatures.split(/[,，\n]+/).map((f) => f.trim()).filter(Boolean),
      isCustomUpload: true,
      dateAdded: '門店最新實拍'
    };

    const updated = [newItem, ...items];
    saveItems(updated);

    // Write to Cloud Firestore for cross-device sync
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
              >
                鎖定
              </button>
            )}
          </div>
        </div>

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

        {items.length === 0 ? (
          <div className="text-center py-16 bg-white/70 rounded-3xl border border-dashed border-stone-300">
            <PackageCheck className="w-12 h-12 text-stone-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-stone-800">目前門市現貨已被搶購一空</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
              純實木貓別墅製作費時，門市現成款式數量有限！如需客製訂製或確認下一批現貨到店時間，歡迎直接加 LINE 諮詢。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-amber-700/50 transition-all flex flex-col group relative"
              >
                <div className="relative aspect-4/3 bg-stone-100 overflow-hidden">
                  <img
                    src={item.mainImage}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                    onClick={() => {
                      if (onOpenImageZoom) {
                        onOpenImageZoom(item.title, item.mainImage, item.description);
                      }
                    }}
                  />

                  <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-amber-900 text-white text-[11px] font-bold rounded-lg shadow-sm font-mono tracking-wide">
                      {item.sizeTag}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-600/90 text-white text-[10px] font-semibold rounded-md shadow-2xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      豐原門市現貨
                    </span>
                  </div>

                  {isOwner && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(item, e)}
                      className="absolute bottom-3 right-3 z-10 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded-lg shadow-md transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>現貨賣出/刪除</span>
                    </button>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif-title font-bold text-stone-900 text-base group-hover:text-amber-900 transition-colors">
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
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-xs text-stone-500 font-medium">門店現品已組裝 · 豐原自取</span>
                    <a
                      href={`${STORE_INFO.lineUrl}?text=${encodeURIComponent(
                        `您好！我在官網看到門市現貨【${item.title}】，想詢問是否還在庫！`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3 text-xs font-semibold text-white bg-[#06C755] hover:bg-[#05b34c] rounded-xl"
                    >
                      搶訂此款現貨
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
