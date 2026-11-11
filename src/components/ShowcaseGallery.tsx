import React, { useState, useEffect, useRef } from 'react';
import { ShowcasePhoto, INITIAL_SHOWCASE_PHOTOS, STORE_INFO } from '../data/catVillaData';
import { Upload, Plus, Filter, Maximize2, Trash2, CheckCircle, Image as ImageIcon, MessageCircle, AlertCircle, Lock, ChevronDown, ChevronUp } from 'lucide-react';

// Store Owner Auth Inline Helper for ShowcaseGallery
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

interface ShowcaseGalleryProps {
  onOpenImageZoom: (title: string, imageUrl: string, subtitle?: string) => void;
}

const STORAGE_KEY = 'huahua_custom_showcase_photos_v2';
const DELETED_SHOWCASE_KEY = 'hhcat_deleted_showcase_ids_v1';

export const ShowcaseGallery: React.FC<ShowcaseGalleryProps> = ({ onOpenImageZoom }) => {
  const { isOwner, logout } = useStoreOwner();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authActionTitle, setAuthActionTitle] = useState('店主管理操作');
  const [photos, setPhotos] = useState<ShowcasePhoto[]>([]);
  const [selectedSize, setSelectedSize] = useState<'all' | '60' | '90' | '120' | '150' | '180' | 'custom'>('all');
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSizeCategory, setUploadSizeCategory] = useState<'60' | '90' | '120' | '150' | '180' | 'custom'>('120');
  const [uploadDimensions, setUploadDimensions] = useState('150-60-120');
  const [uploadCustomerNote, setUploadCustomerNote] = useState('');
  const [uploadTags, setUploadTags] = useState('客製實品, 實木貓屋');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const deletedJson = localStorage.getItem(DELETED_SHOWCASE_KEY);
      const deletedIds: string[] = deletedJson ? JSON.parse(deletedJson) : [];

      const saved = localStorage.getItem(STORAGE_KEY);
      let combined: ShowcasePhoto[] = [];
      if (saved) {
        const parsed: ShowcasePhoto[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const customs = parsed.filter((p) => p && p.isCustomUpload);
          const initialIds = new Set(INITIAL_SHOWCASE_PHOTOS.map((p) => p.id));
          const validCustoms = customs.filter((p) => !initialIds.has(p.id));
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
  }, []);

  const handleOpenUploadModal = () => {
    if (!isOwner) {
      setAuthActionTitle('上傳客製實品相冊');
      setIsAuthModalOpen(true);
      return;
    }
    setIsUploadModalOpen(true);
  };

  const handleDeletePhoto = (photo: ShowcasePhoto, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) {
      setAuthActionTitle('刪除客製實品卡片');
      setIsAuthModalOpen(true);
      return;
    }

    if (window.confirm(`確定要刪除「${photo.title}」這張作品卡片嗎？`)) {
      try {
        const deletedJson = localStorage.getItem(DELETED_SHOWCASE_KEY);
        const deletedIds: string[] = deletedJson ? JSON.parse(deletedJson) : [];
        if (!deletedIds.includes(photo.id)) {
          deletedIds.push(photo.id);
          localStorage.setItem(DELETED_SHOWCASE_KEY, JSON.stringify(deletedIds));
        }
      } catch (err) {
        console.warn(err);
      }

      const updated = photos.filter((p) => p.id !== photo.id);
      setPhotos(updated);
    }
  };

  const filteredPhotos = photos.filter((photo) => {
    if (selectedSize === 'all') return true;
    return photo.sizeCategory === selectedSize;
  });

  const displayedPhotos = showAllPhotos ? filteredPhotos : filteredPhotos.slice(0, 6);

  return (
    <section id="gallery" className="py-16 sm:py-24 bg-white border-b border-stone-200 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-amber-900 bg-amber-100 border border-amber-200 mb-2">
              <ImageIcon className="w-3.5 h-3.5 text-amber-800" />
              <span>Real Customer Works · 客製實品相冊</span>
            </div>
            <h2 className="font-serif-title text-2xl sm:text-4xl font-bold text-stone-900 tracking-tight">
              客製實品相冊 · 依尺寸一目了然
            </h2>
            <p className="text-sm sm:text-base text-stone-600 mt-2">
              精選全台屋主真實到府組裝實拍，純實木板厚度足 1.5cm，真材實料看的見！
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={handleOpenUploadModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-xl transition-all shadow-xs"
            >
              {isOwner ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <Upload className="w-4 h-4" />
                  <span>店主上傳作品照片</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-200" />
                  <Upload className="w-3.5 h-3.5 text-white" />
                  <span>店主專用 · 上傳作品照片</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-stone-100 pb-4">
          <span className="text-xs font-bold text-stone-400 mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>尺寸篩選：</span>
          </span>
          {[
            { id: 'all', label: '全部實品照片' },
            { id: '60', label: '60cm 系列' },
            { id: '90', label: '90cm 系列' },
            { id: '120', label: '120cm 系列' },
            { id: '150', label: '150cm 系列' },
            { id: '180', label: '180cm 系列' },
            { id: 'custom', label: '特殊訂製款' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSelectedSize(tab.id as any);
                setShowAllPhotos(false);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedSize === tab.id
                  ? 'bg-amber-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Photos Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedPhotos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => onOpenImageZoom(photo.title, photo.imageUrl, `${photo.dimensionsText} · ${photo.customerNote}`)}
              className="bg-stone-50 rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg hover:border-amber-800/40 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="relative aspect-4/3 bg-stone-200 overflow-hidden">
                <img
                  src={photo.imageUrl}
                  alt={photo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-md">
                  {photo.dimensionsText}
                </div>

                <div className="absolute top-3 right-3 p-1.5 bg-white/80 backdrop-blur-xs rounded-lg text-stone-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3.5 h-3.5" />
                </div>

                {isOwner && (
                  <button
                    type="button"
                    onClick={(e) => handleDeletePhoto(photo, e)}
                    className="absolute bottom-3 right-3 p-1.5 bg-red-600/90 text-white rounded-lg hover:bg-red-700 transition-colors shadow-xs z-10 text-[10px] flex items-center gap-1"
                    title="刪除此卡片"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>刪除卡片</span>
                  </button>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm group-hover:text-amber-900 transition-colors">
                    {photo.title}
                  </h4>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                    {photo.customerNote}
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-400">
                  <span>{photo.date}</span>
                  <span className="text-amber-900 font-semibold">點擊觀看大圖 🔍</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPhotos.length > 6 && (
          <div className="text-center pt-8">
            <button
              type="button"
              onClick={() => setShowAllPhotos(!showAllPhotos)}
              className="inline-flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-semibold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-all shadow-xs"
            >
              {showAllPhotos ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>收起相冊照片</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>查看更多實品相冊（還有 {filteredPhotos.length - 6} 張）</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

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
    </section>
  );
};
