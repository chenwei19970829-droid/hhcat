import React, { useState, useEffect, useRef } from 'react';
import { ShowcasePhoto, INITIAL_SHOWCASE_PHOTOS, STORE_INFO } from '../data/catVillaData';
import { MultiPhotoLightbox } from './MultiPhotoLightbox';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { compressImage } from '../utils/imageCompressor';
import { useStoreOwner } from '../utils/adminAuth';
import { StoreOwnerAuthModal } from './StoreOwnerAuthModal';
import { Upload, Plus, Filter, Maximize2, Trash2, Edit3, CheckCircle, Image as ImageIcon, AlertCircle, Lock, ChevronDown, ChevronUp, Images } from 'lucide-react';

interface ShowcaseGalleryProps {
  onOpenImageZoom?: (title: string, imageUrl: string, subtitle?: string) => void;
}

const STORAGE_KEY = 'huahua_custom_showcase_photos_v2';
const DELETED_SHOWCASE_KEY = 'hhcat_deleted_showcase_ids_v1';

export const ShowcaseGallery: React.FC<ShowcaseGalleryProps> = () => {
  const { isOwner, logout } = useStoreOwner();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authActionTitle, setAuthActionTitle] = useState('店主管理操作');
  const [photos, setPhotos] = useState<ShowcasePhoto[]>([]);
  const [selectedSize, setSelectedSize] = useState<'all' | '60' | '90' | '120' | '150' | '180' | 'custom'>('all');
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

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

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [lightboxSubtitle, setLightboxSubtitle] = useState('');

  const openLightbox = (title: string, images: string[], subtitle?: string) => {
    setLightboxTitle(title);
    setLightboxImages(images.filter(Boolean));
    setLightboxSubtitle(subtitle || '');
    setLightboxOpen(true);
  };

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

    // Subscribe to Firestore for live showcase photo sync
    const unsubscribe = onSnapshot(
      collection(db, 'showcasePhotos'),
      (snapshot) => {
        if (!snapshot.empty) {
          const deletedFromCloud = new Set<string>();
          const remotePhotos: ShowcasePhoto[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.deleted === true) {
              deletedFromCloud.add(data.id || docSnap.id);
            } else if (data.fullPhotoData) {
              try {
                remotePhotos.push(JSON.parse(data.fullPhotoData));
              } catch (e) {
                console.warn(e);
              }
            } else if (data.id && data.title && data.imageUrl) {
              const fallbackImgs = Array.isArray(data.images) && data.images.length > 0 ? data.images : [data.imageUrl];
              remotePhotos.push({
                id: data.id,
                title: data.title,
                sizeCategory: (data.sizeCategory as ShowcasePhoto['sizeCategory']) || (data.dimensions?.split('-')[0] as ShowcasePhoto['sizeCategory']) || '150',
                dimensionsText: data.dimensions || '150-60-120',
                imageUrl: fallbackImgs[0] || data.imageUrl,
                images: fallbackImgs,
                customerNote: data.description || '店主精選客製實品照',
                date: data.date || '客製實品照',
                tags: data.tags || ['客製實品'],
                isCustomUpload: true
              });
            }
          });

          let deletedIds: string[] = [];
          try {
            const deletedJson = localStorage.getItem(DELETED_SHOWCASE_KEY);
            deletedIds = deletedJson ? JSON.parse(deletedJson) : [];
          } catch {}
          setPhotos(() => {
            const remainingDefaults = INITIAL_SHOWCASE_PHOTOS.filter(
              (orig) => !remotePhotos.some((r) => r.id === orig.id) && !deletedFromCloud.has(orig.id)
            );
            const activeRemotes = remotePhotos.filter((r) => !deletedFromCloud.has(r.id));
            return [...activeRemotes, ...remainingDefaults].filter((p) => !deletedIds.includes(p.id));
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'showcasePhotos');
      }
    );

    return () => unsubscribe();
  }, []);

  const handleMultipleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const updated = [...uploadImages, ...compressedList];
        setUploadImages(updated);
        setPreviewImage(updated[0]);
      }
    } catch {
      setUploadError('多張照片處理失敗，請換一張再試');
    } finally {
      e.target.value = '';
    }
  };

  const resetUploadForm = () => {
    setEditingPhotoId(null);
    setUploadTitle('');
    setUploadCustomerNote('');
    setUploadTags('客製實品, 實木貓屋');
    setPreviewImage(null);
    setUploadImages([]);
    setUploadError(null);
  };

  const handleSavePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
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

    const targetId = editingPhotoId || `custom-${Date.now()}`;
    const newPhoto: ShowcasePhoto = {
      id: targetId,
      title: uploadTitle.trim(),
      sizeCategory: uploadSizeCategory,
      dimensionsText: uploadDimensions.trim() || `${uploadSizeCategory}cm 系列`,
      imageUrl: finalImages[0],
      images: finalImages,
      customerNote: uploadCustomerNote.trim() || '店主精選客製實品照，支援同款專屬訂製。',
      date: editingPhotoId ? '已更新實拍' : '剛剛新增',
      tags: uploadTags.split(/[,， ]+/).filter(Boolean),
      isCustomUpload: true
    };

    const existingIdx = photos.findIndex((p) => p.id === targetId);
    const updated =
      existingIdx >= 0
        ? photos.map((p) => (p.id === targetId ? newPhoto : p))
        : [newPhoto, ...photos];
    setPhotos(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('LocalStorage limit reached or disabled:', err);
    }

    try {
      await setDoc(doc(db, 'showcasePhotos', targetId), {
        id: targetId,
        title: newPhoto.title,
        sizeCategory: newPhoto.sizeCategory,
        dimensions: newPhoto.dimensionsText,
        description: newPhoto.customerNote,
        imageUrl: newPhoto.imageUrl,
        images: newPhoto.images || [],
        tags: newPhoto.tags,
        date: newPhoto.date,
        isCustomUpload: true,
        deleted: false,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `showcasePhotos/${targetId}`);
    }

    setIsUploading(false);
    setIsUploadModalOpen(false);
    resetUploadForm();
    setSelectedSize(uploadSizeCategory);
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
    setIsUploadModalOpen(true);
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

    // Mark deleted in Cloud Firestore so both default & custom photos stay deleted across devices
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

          {/* New Custom Size Category */}
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
                  openLightbox(photo.title, imgs, `${photo.dimensionsText} · ${photo.customerNote}`);
                }}
                className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md hover:border-amber-800/40 transition-all cursor-pointer group flex flex-col"
              >
                {/* Image Container */}
                <div className="relative aspect-4/3 bg-stone-100 overflow-hidden flex items-center justify-center p-2">
                  <img
                    src={imgs[0] || photo.imageUrl}
                    alt={photo.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = STORE_INFO.storefrontImage;
                    }}
                  />

                  {/* Size Pill */}
                  <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-mono px-2 py-0.5 rounded">
                    {photo.sizeCategory === 'custom' ? '客製化特殊尺寸' : `長度 ${photo.sizeCategory}cm 系列`}
                  </div>

                  {/* Top Right Photo Count + Zoom Icon */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
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
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
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
                        onClick={(e) => handleDeletePhoto(photo, e)}
                        className="bg-red-600/95 hover:bg-red-700 text-white px-2.5 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-xs"
                        title="刪除此相片卡片"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>刪除</span>
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
                      支援連續多選上傳（第 1 張為主圖，其餘為開門/關門/內部/內飾圖）
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
                    實品照片檔案 * (支援連續多選上傳：主圖、開門、關門、內部、內飾等)
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleMultipleFilesUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
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
                      {/* Thumbnails */}
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {uploadImages.map((imgUrl, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-stone-300 shrink-0">
                            <img src={imgUrl} alt={`預覽 ${i + 1}`} className="w-full h-full object-cover" />
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
                        點擊連續上傳多張實拍照片（可多選）
                      </p>
                      <p className="text-[11px] text-stone-400 mt-1">
                        支援一次選取多張主圖、開關門、內部及配件實拍
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
                    <span>{isUploading ? '儲存中...' : editingPhotoId ? '儲存變更' : '確認上傳發佈'}</span>
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
      {/* Multi-photo Lightbox Modal */}
      <MultiPhotoLightbox
        isOpen={lightboxOpen}
        title={lightboxTitle}
        images={lightboxImages}
        subtitle={lightboxSubtitle}
        onClose={() => setLightboxOpen(false)}
      />
    </section>
  );
};
