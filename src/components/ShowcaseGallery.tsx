import React, { useState, useEffect, useRef } from 'react';
import { ShowcasePhoto, INITIAL_SHOWCASE_PHOTOS, STORE_INFO } from '../data/catVillaData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { compressImage } from '../utils/imageCompressor';
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
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load photos: from localStorage and subscribe to Firestore for real-time cloud sync across phones & PCs
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

    // Subscribe to Firestore real-time photo updates
    const unsubscribe = onSnapshot(
      collection(db, 'showcasePhotos'),
      (snapshot) => {
        const deletedIdsFromCloud = new Set<string>();
        const remotePhotos: ShowcasePhoto[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.deleted === true) {
            deletedIdsFromCloud.add(data.id || docSnap.id);
          } else if (data.fullPhotoData) {
            try {
              const photo = JSON.parse(data.fullPhotoData);
              if (photo && photo.id) {
                remotePhotos.push(photo);
              }
            } catch (e) {
              console.warn('JSON parse error:', e);
            }
          } else if (data.id && data.title && data.imageUrl) {
            remotePhotos.push({
              id: data.id,
              title: data.title,
              sizeCategory: (data.dimensions?.split('-')[0] as any) || '150',
              dimensionsText: data.dimensions || '150-60-120',
              imageUrl: data.imageUrl,
              customerNote: data.description || '店主精選客製實品照',
              date: '剛剛新增',
              tags: data.tags || ['客製實品'],
              isCustomUpload: true
            });
          }
        });

        setPhotos(() => {
          const activeDefaults = INITIAL_SHOWCASE_PHOTOS.filter(
            (orig) => !deletedIdsFromCloud.has(orig.id) && !remotePhotos.some((r) => r.id === orig.id)
          );
          const activeRemotes = remotePhotos.filter((r) => !deletedIdsFromCloud.has(r.id));
          return [...activeRemotes, ...activeDefaults];
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'showcasePhotos');
      }
    );

    return () => unsubscribe();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('請上傳有效的圖片檔案（JPG、PNG、WEBP 等）');
      return;
    }

    try {
      setUploadError(null);
      const compressed = await compressImage(file, 900, 0.72);
      setPreviewImage(compressed);
    } catch (err) {
      setUploadError('圖片處理失敗，請換一張再試');
    }
  };

  const handleSavePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewImage) {
      setUploadError('請先選擇要上傳的貓別墅實品照片！');
      return;
    }

    if (!uploadTitle.trim()) {
      setUploadError('請輸入作品名稱或款式標題');
      return;
    }

    setIsUploading(true);

    const newId = `custom-${Date.now()}`;
    const newPhoto: ShowcasePhoto = {
      id: newId,
      title: uploadTitle.trim(),
      sizeCategory: uploadSizeCategory,
      dimensionsText: uploadDimensions.trim() || `${uploadSizeCategory}cm 系列`,
      imageUrl: previewImage,
      customerNote: uploadCustomerNote.trim() || '店主精選客製實品照，支援同款專屬訂製。',
      date: '剛剛新增',
      tags: uploadTags.split(/[,， ]+/).filter(Boolean),
      isCustomUpload: true
    };

    const updated = [newPhoto, ...photos];
    setPhotos(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('LocalStorage limit reached or disabled:', err);
    }

    // Save to Cloud Firestore for cross-device real-time sync
    try {
      await setDoc(doc(db, 'showcasePhotos', newId), {
        id: newId,
        title: newPhoto.title,
        client: '台中店主實品',
        location: '臺中豐原門店',
        dimensions: newPhoto.dimensionsText,
        description: newPhoto.customerNote,
        imageUrl: newPhoto.imageUrl,
        tags: newPhoto.tags,
        likes: 12,
        isCustomUpload: true,
        fullPhotoData: JSON.stringify(newPhoto),
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `showcasePhotos/${newId}`);
    }

    // Reset Form
    setIsUploading(false);
    setIsUploadModalOpen(false);
    setPreviewImage(null);
    setUploadTitle('');
    setUploadCustomerNote('');
    setSelectedSize(uploadSizeCategory);
  };

  const handleOpenUpload = (targetSize?: '60' | '90' | '120' | '150' | '180' | 'custom') => {
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

  const handleDeletePhoto = async (photo: ShowcasePhoto, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) {
      setAuthActionTitle('刪除客製相冊照片');
      setIsAuthModalOpen(true);
      return;
    }
    if (!window.confirm(`確定要刪除「${photo.title}」這張客製實品照片嗎？`)) return;

    try {
      const deletedJson = localStorage.getItem(DELETED_SHOWCASE_KEY);
      const deletedIds: string[] = deletedJson ? JSON.parse(deletedJson) : [];
      if (!deletedIds.includes(photo.id)) {
        deletedIds.push(photo.id);
        localStorage.setItem(DELETED_SHOWCASE_KEY, JSON.stringify(deletedIds));
      }
    } catch (err) {
      console.error(err);
    }

    const updated = photos.filter((p) => p.id !== photo.id);
    setPhotos(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    // Mark as tombstone deleted in Cloud Firestore for cross-device real-time sync
    try {
      await setDoc(doc(db, 'showcasePhotos', photo.id), {
        id: photo.id,
        deleted: true,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `showcasePhotos/${photo.id}`);
    }
  };

  const filteredPhotos = photos.filter((photo) => {
    if (selectedSize === 'all') return true;
    return photo.sizeCategory === selectedSize;
  });

  const displayedPhotos = showAllPhotos ? filteredPhotos : filteredPhotos.slice(0, 12);

  return (
    <section id="showcase" className="py-16 sm:py-20 bg-[#FAF7F2] border-b border-stone-200 scroll-mt-20">
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

          {/* Action: Open Upload Modal (Restricted to Store Owner) */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleOpenUpload();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              {isOwner ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <Plus className="w-4 h-4" />
                  <span>店主上傳客製實品照</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-200" />
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span>店主專用 · 上傳客製實品照</span>
                </>
              )}
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={logout}
                className="px-2.5 py-2 text-[11px] text-stone-500 hover:text-stone-800 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors cursor-pointer"
                title="登出店主管理狀態"
              >
                鎖定
              </button>
            )}
          </div>
        </div>

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
            <span>✨ 客製化尺寸 ({photos.filter((p) => p.sizeCategory === 'custom').length})</span>
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
                <span>立即上傳此尺寸照片</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {displayedPhotos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => onOpenImageZoom(photo.title, photo.imageUrl, photo.customerNote)}
                className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md hover:border-amber-800/40 transition-all cursor-pointer group flex flex-col"
              >
                {/* Image Container */}
                <div className="relative aspect-4/3 bg-stone-100 overflow-hidden flex items-center justify-center p-2">
                  <img
                    src={photo.imageUrl}
                    alt={photo.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = STORE_INFO.storefrontImage;
                    }}
                  />

                  {/* Size Pill */}
                  <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-mono px-2 py-0.5 rounded">
                    {photo.sizeCategory === 'custom' ? '✨ 客製化特殊尺寸' : `長度 ${photo.sizeCategory}cm 系列`}
                  </div>

                  {/* Zoom Icon */}
                  <div className="absolute top-3 right-3 p-1.5 bg-white/90 rounded-md text-stone-700 shadow-xs group-hover:bg-amber-900 group-hover:text-white transition-colors">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>

                  {/* Custom Upload Badge & Delete Option for Store Owner */}
                  {isOwner && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      {photo.isCustomUpload && (
                        <span className="bg-amber-800 text-white text-[10px] px-2 py-0.5 rounded font-medium">
                          店主新增
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDeletePhoto(photo, e)}
                        className="bg-red-600/90 hover:bg-red-700 text-white px-2 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-xs"
                        title="刪除此相片卡片"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>刪除卡片</span>
                      </button>
                    </div>
                  )}
                </div>

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
                    <a
                      href={`${STORE_INFO.lineUrl}?text=${encodeURIComponent(
                        `您好！我在相冊看到這款【${photo.title} (${photo.dimensionsText})】，想詢問客製相同規格報價！`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>洽詢此實例</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View More / Collapse Toggle Button */}
        {filteredPhotos.length > 12 && (
          <div className="text-center pt-8">
            <button
              type="button"
              onClick={() => setShowAllPhotos(!showAllPhotos)}
              className="inline-flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-xl transition-all shadow-xs active:scale-[0.98]"
            >
              {showAllPhotos ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>收起照片（顯示前 12 張）</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>查看更多客製實品照（還有 {filteredPhotos.length - 12} 張照片）</span>
                </>
              )}
            </button>
          </div>
        )}

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
                      上傳客製實品照片
                    </h3>
                    <p className="text-xs text-stone-500">
                      填寫尺寸與客戶作品備註，方便訪客依尺寸快速檢索
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="text-stone-400 hover:text-stone-700 text-lg font-bold p-1"
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

                {/* Image Picker */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    實品照片檔案 *
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  {previewImage ? (
                    <div className="relative aspect-16/9 bg-stone-100 rounded-xl overflow-hidden border border-stone-200 flex items-center justify-center">
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-2 right-2 bg-stone-900/80 text-white text-xs px-2.5 py-1 rounded-md"
                      >
                        更換圖片
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-stone-300 hover:border-amber-700 bg-stone-50 rounded-xl p-8 text-center cursor-pointer transition-colors"
                    >
                      <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                      <p className="text-xs font-medium text-stone-700">
                        點擊選擇照片 或 拖曳檔案至此
                      </p>
                      <p className="text-[11px] text-stone-400 mt-1">
                        支援 JPG、PNG、WEBP，系統將自動秒速微縮壓縮上傳
                      </p>
                    </div>
                  )}
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
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-5 py-2 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{isUploading ? '儲存中...' : '確認上傳發佈'}</span>
                  </button>
                </div>
              </form>
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
    </section>
  );
};
