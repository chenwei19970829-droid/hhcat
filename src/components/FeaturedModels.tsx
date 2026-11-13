import React, { useState, useEffect, useRef } from 'react';
import { FEATURED_MODELS, VillaModel, STORE_INFO } from '../data/catVillaData';
import { MultiPhotoLightbox } from './MultiPhotoLightbox';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { compressImage } from '../utils/imageCompressor';
import { useStoreOwner } from '../utils/adminAuth';
import { StoreOwnerAuthModal } from './StoreOwnerAuthModal';
import {
  Maximize2,
  Calculator,
  Check,
  Plus,
  Trash2,
  Edit3,
  Upload,
  Lock,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
  Images
} from 'lucide-react';

interface FeaturedModelsProps {
  onSelectForQuote: (model: VillaModel) => void;
  onOpenImageZoom: (imageTitle: string, imageUrl: string, subtitle?: string) => void;
}

const STORAGE_KEY = 'hhcat_featured_custom_models_v2';
const DELETED_MODELS_KEY = 'hhcat_deleted_models_ids_v1';

export const FeaturedModels: React.FC<FeaturedModelsProps> = ({
  onSelectForQuote
}) => {
  const { isOwner, logout } = useStoreOwner();
  const [filter, setFilter] = useState<'all' | '90' | '120' | '150' | '180'>('all');
  const [showAllCards, setShowAllCards] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [models, setModels] = useState<VillaModel[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authActionTitle, setAuthActionTitle] = useState('店主管理操作');

  // Add / Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formBadge, setFormBadge] = useState('');
  const [formHeightGroup, setFormHeightGroup] = useState<'90' | '120' | '150' | '180'>('120');
  const [formHeight, setFormHeight] = useState(120);
  const [formDepth, setFormDepth] = useState(60);
  const [formLength, setFormLength] = useState(90);
  const [formPrice, setFormPrice] = useState(7500);
  const [formInstallFee, setFormInstallFee] = useState(1500);
  const [formRecommendedCats, setFormRecommendedCats] = useState('1-2 隻貓咪');
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formHighlights, setFormHighlights] = useState<string[]>([]);
  const [newHighlightInput, setNewHighlightInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

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

  // Load models & subscribe to Firestore
  useEffect(() => {
    try {
      const deletedJson = localStorage.getItem(DELETED_MODELS_KEY);
      const deletedIds: string[] = deletedJson ? JSON.parse(deletedJson) : [];

      const saved = localStorage.getItem(STORAGE_KEY);
      let combined: VillaModel[] = FEATURED_MODELS;
      if (saved) {
        const parsed: VillaModel[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const customOrUpdated = parsed.filter((m) => m && m.id);
          const remainingInitial = FEATURED_MODELS.filter(
            (m) => !customOrUpdated.some((c) => c.id === m.id)
          );
          combined = [...customOrUpdated, ...remainingInitial];
        }
      }
      setModels(combined.filter((m) => !deletedIds.includes(m.id)));
    } catch (e) {
      console.warn('Error reading models from storage:', e);
      setModels(FEATURED_MODELS);
    }

    const unsubscribe = onSnapshot(
      collection(db, 'featuredModels'),
      (snapshot) => {
        if (!snapshot.empty) {
          const deletedFromCloud = new Set<string>();
          const remoteModels: VillaModel[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.deleted === true) {
              deletedFromCloud.add(data.id || docSnap.id);
            } else if (data.fullModelData) {
              try {
                remoteModels.push(JSON.parse(data.fullModelData));
              } catch (e) {
                console.warn(e);
              }
            } else if (data.id && data.name && data.image) {
              remoteModels.push({
                id: data.id,
                name: data.name,
                subtitle: data.subtitle || '純實木無甲醛 · 高透耐磨安全壓克力門',
                heightGroup: data.heightGroup || '120',
                heightGroupLabel: `高${data.heightGroup || '120'}cm`,
                badge: data.badge || '',
                price: Number(data.price) || 8500,
                installFee: Number(data.installFee) || 1500,
                dimensions: {
                  height: Number(data.height) || 120,
                  depth: Number(data.depth) || 60,
                  length: Number(data.length) || 90,
                  dimensionCode: `${data.height || 120}-${data.depth || 60}-${data.length || 90}`
                },
                image: data.image,
                images: Array.isArray(data.images) && data.images.length > 0 ? data.images : [data.image],
                highlights: Array.isArray(data.highlights) ? data.highlights : ['天然松木', '安全壓克力'],
                includedAccessories: Array.isArray(data.highlights) ? data.highlights : ['天然松木', '安全壓克力'],
                recommendedCats: data.recommendedCats || '1-2 隻貓咪',
                suitableSpace: data.suitableSpace || '居家室內、客廳或陽台',
                description: data.subtitle || '花花招財貓實木客製貓別墅'
              });
            }
          });

          let deletedIds: string[] = [];
          try {
            const deletedJson = localStorage.getItem(DELETED_MODELS_KEY);
            deletedIds = deletedJson ? JSON.parse(deletedJson) : [];
          } catch {}
          setModels(() => {
            const remainingDefaults = FEATURED_MODELS.filter(
              (orig) => !remoteModels.some((r) => r.id === orig.id) && !deletedFromCloud.has(orig.id)
            );
            const activeRemotes = remoteModels.filter((r) => !deletedFromCloud.has(r.id));
            return [...activeRemotes, ...remainingDefaults].filter((m) => !deletedIds.includes(m.id));
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'featuredModels');
      }
    );

    return () => unsubscribe();
  }, []);

  const handleOpenAddModal = () => {
    if (!isOwner) {
      setAuthActionTitle('新增貓別墅款式');
      setIsAuthModalOpen(true);
      return;
    }
    setEditingModelId(null);
    setFormName('');
    setFormSubtitle('純實木無甲醛 · 靜音萬向輪 · 側邊格柵通風');
    setFormBadge('熱銷推薦');
    setFormHeightGroup('120');
    setFormHeight(120);
    setFormDepth(60);
    setFormLength(90);
    setFormPrice(7500);
    setFormInstallFee(1500);
    setFormRecommendedCats('1-2 隻貓咪');
    setFormImage(null);
    setFormImages([]);
    setFormHighlights(['天然松木無甲醛', '靜音萬向輪', '高透壓克力門', '側邊格柵通風']);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (model: VillaModel, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) {
      setAuthActionTitle('編輯貓別墅款式');
      setIsAuthModalOpen(true);
      return;
    }
    setEditingModelId(model.id);
    setFormName(model.name);
    setFormSubtitle(model.subtitle || '');
    setFormBadge(model.badge || '');
    setFormHeightGroup(model.heightGroup || '120');
    setFormHeight(model.dimensions.height);
    setFormDepth(model.dimensions.depth);
    setFormLength(model.dimensions.length);
    setFormPrice(model.price);
    setFormInstallFee(model.installFee);
    setFormRecommendedCats(model.recommendedCats || '1-2 隻貓咪');
    setFormImage(model.image);
    const existingImgs = model.images && model.images.length > 0 ? model.images : [model.image];
    setFormImages(existingImgs);
    setFormHighlights(
      model.includedAccessories && model.includedAccessories.length > 0
        ? [...model.includedAccessories]
        : [...model.highlights]
    );
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleDeleteModel = async (model: VillaModel, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) {
      setAuthActionTitle('刪除精選款式');
      setIsAuthModalOpen(true);
      return;
    }
    if (!window.confirm(`確定要刪除「${model.name}」這個精選款式嗎？`)) return;

    try {
      const deletedJson = localStorage.getItem(DELETED_MODELS_KEY);
      const deletedIds: string[] = deletedJson ? JSON.parse(deletedJson) : [];
      if (!deletedIds.includes(model.id)) {
        deletedIds.push(model.id);
        localStorage.setItem(DELETED_MODELS_KEY, JSON.stringify(deletedIds));
      }
    } catch (err) {
      console.error(err);
    }

    const updated = models.filter((m) => m.id !== model.id);
    setModels(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    try {
      await setDoc(doc(db, 'featuredModels', model.id), {
        id: model.id,
        deleted: true,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `featuredModels/${model.id}`);
    }
  };

  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setFormError(null);
      const compressedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const compressed = await compressImage(file, 960, 0.74);
          compressedList.push(compressed);
        }
      }
      if (compressedList.length > 0) {
        const updated = [...formImages, ...compressedList];
        setFormImages(updated);
        setFormImage(updated[0]);
      }
    } catch {
      setFormError('多張照片壓縮處理失敗，請重試');
    } finally {
      e.target.value = '';
    }
  };

  const handleAddHighlightTag = () => {
    if (!newHighlightInput.trim()) return;
    const tag = newHighlightInput.trim();
    if (!formHighlights.includes(tag)) {
      setFormHighlights([...formHighlights, tag]);
    }
    setNewHighlightInput('');
  };

  const handleRemoveHighlightTag = (idx: number) => {
    setFormHighlights(formHighlights.filter((_, i) => i !== idx));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('請填寫款式標題名稱');
      return;
    }
    const finalImages = formImages.length > 0 ? formImages : (formImage ? [formImage] : []);
    if (finalImages.length === 0) {
      setFormError('請至少上傳一張款式外觀照片');
      return;
    }

    const targetId = editingModelId || `custom-model-${Date.now()}`;
    const newModel: VillaModel = {
      id: targetId,
      name: formName.trim(),
      subtitle: formSubtitle.trim() || '純實木無甲醛 · 高透耐磨安全壓克力門',
      heightGroup: formHeightGroup,
      heightGroupLabel: `高${formHeightGroup}cm`,
      badge: formBadge.trim() || undefined,
      price: Number(formPrice) || 0,
      installFee: Number(formInstallFee) || 0,
      dimensions: {
        height: Number(formHeight) || 120,
        depth: Number(formDepth) || 60,
        length: Number(formLength) || 90,
        dimensionCode: `${formHeight}-${formDepth}-${formLength}`
      },
      image: finalImages[0],
      images: finalImages,
      highlights: formHighlights,
      includedAccessories: formHighlights,
      recommendedCats: formRecommendedCats.trim() || '1-2 隻貓咪',
      suitableSpace: '居家室內、客廳或陽台',
      description: formSubtitle.trim() || '花花招財貓實木客製貓別墅'
    };

    const existingIdx = models.findIndex((m) => m.id === targetId);
    let updated: VillaModel[];
    if (existingIdx >= 0) {
      updated = [...models];
      updated[existingIdx] = newModel;
    } else {
      updated = [newModel, ...models];
    }

    setModels(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn(err);
    }

    try {
      await setDoc(doc(db, 'featuredModels', targetId), {
        id: targetId,
        name: newModel.name,
        subtitle: newModel.subtitle,
        heightGroup: newModel.heightGroup,
        badge: newModel.badge || '',
        price: newModel.price,
        installFee: newModel.installFee,
        height: newModel.dimensions.height,
        depth: newModel.dimensions.depth,
        length: newModel.dimensions.length,
        image: newModel.image,
        images: newModel.images || [],
        highlights: newModel.highlights,
        recommendedCats: newModel.recommendedCats,
        suitableSpace: newModel.suitableSpace,
        deleted: false,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `featuredModels/${targetId}`);
    }

    setIsFormModalOpen(false);
  };

  // Filter models based on user selected height group
  const filteredModels = models.filter((model) => {
    if (filter === 'all') return true;
    return model.heightGroup === filter;
  });

  const PAGE_SIZE = 12;
  const totalPages = Math.ceil(filteredModels.length / PAGE_SIZE);

  let displayedModels: VillaModel[] = [];
  if (!showAllCards) {
    displayedModels = filteredModels.slice(0, 6);
  } else {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    displayedModels = filteredModels.slice(startIndex, startIndex + PAGE_SIZE);
  }

  const sectionRef = useRef<HTMLElement>(null);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      document.getElementById('models')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section id="models" ref={sectionRef} className="py-16 sm:py-20 border-b border-stone-200 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Handcrafted Cat Villas · A-Z 款式目錄
            </div>
            <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
              精選貓別墅款式
            </h2>
            <p className="text-sm text-stone-600 mt-1.5 leading-relaxed">
              純實木板厚度足 1.5cm · 天然松木無甲醛 · 高透耐磨安全壓克力門
              <br />
              <span className="text-amber-900 font-medium">支援 1:1 照照片量身訂做，隨心配置跳台與格局</span>
            </p>
          </div>

          {/* Action buttons: Filter & Store Owner Add */}
          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
            >
              {isOwner ? (
                <>
                  <Plus className="w-4 h-4" />
                  <span>店主新增/上傳款式</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-200" />
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span>店主專用 · 新增款式</span>
                </>
              )}
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={logout}
                className="px-2.5 py-2 text-[11px] text-stone-500 hover:text-stone-800 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors shrink-0"
                title="登出店主管理狀態"
              >
                鎖定
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Controls: 全部尺寸、高90、高120、高150、高180 */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8 pb-4 border-b border-stone-200">
          <div className="inline-flex flex-wrap items-center p-1 bg-stone-200/70 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => {
                setFilter('all');
                setShowAllCards(false);
              }}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
                filter === 'all'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              全部尺寸 ({models.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('90')}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
                filter === '90'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              高90 系列
            </button>
            <button
              type="button"
              onClick={() => setFilter('120')}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
                filter === '120'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              高120 系列
            </button>
            <button
              type="button"
              onClick={() => setFilter('150')}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
                filter === '150'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              高150 系列
            </button>
            <button
              type="button"
              onClick={() => setFilter('180')}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
                filter === '180'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              高180 系列
            </button>
          </div>

          {filter === 'all' && models.length > 6 && (
            <div className="text-xs text-stone-500 font-medium">
              預設精選 6 款 · 共 {models.length} 款
            </div>
          )}
        </div>

        {/* Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayedModels.map((model) => {
            const imgs = model.images && model.images.length > 0 ? model.images : [model.image];
            return (
            <div
              key={model.id}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg hover:border-amber-800/40 transition-all flex flex-col group relative"
            >
              {/* Product Studio Refined Photo with Click Zoom */}
              <div
                className="relative aspect-4/3 bg-[#F6F2EC] p-2 cursor-pointer overflow-hidden border-b border-stone-100 flex items-center justify-center"
                onClick={() => {
                  openLightbox(
                    model.name,
                    imgs,
                    `規格：${model.dimensions.dimensionCode}（高${model.dimensions.height} x 深${model.dimensions.depth} x 長${model.dimensions.length} cm）`
                  );
                }}
                title="點擊左右滑動查看多角度實拍細節"
              >
                <img
                  src={imgs[0] || model.image}
                  alt={model.name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />

                {/* Top Right Photo Count + Zoom indicator */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  {imgs.length > 1 && (
                    <span className="px-2 py-1 bg-stone-900/75 text-white text-[11px] font-semibold rounded-lg backdrop-blur-xs flex items-center gap-1">
                      <Images className="w-3.5 h-3.5 text-amber-300" />
                      <span>{imgs.length} 張</span>
                    </span>
                  )}
                  <div className="p-2 bg-white/90 backdrop-blur-xs rounded-lg text-stone-700 shadow-xs group-hover:bg-amber-900 group-hover:text-white transition-colors">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                </div>

                {/* Badge */}
                {model.badge && (
                  <div className="absolute top-3 left-3 bg-amber-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-xs">
                    {model.badge}
                  </div>
                )}

                {/* Dimension tag at bottom */}
                <div className="absolute bottom-3 left-3 bg-stone-900/80 backdrop-blur-xs text-white text-xs px-2.5 py-1 rounded font-mono">
                  {model.dimensions.dimensionCode} cm
                </div>

                {/* Store Owner Quick Controls Overlay */}
                {isOwner && (
                  <div className="absolute inset-x-3 bottom-12 flex items-center justify-between gap-2 z-10">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditModal(model, e)}
                      className="px-2.5 py-1 bg-amber-900/90 hover:bg-amber-900 text-white text-[11px] font-semibold rounded-lg shadow-sm flex items-center gap-1 backdrop-blur-xs"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>編輯/加圖</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteModel(model, e)}
                      className="px-2.5 py-1 bg-red-600/90 hover:bg-red-700 text-white text-[11px] font-semibold rounded-lg shadow-sm flex items-center gap-1 backdrop-blur-xs"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>刪除</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Content Body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-serif-title font-bold text-stone-900 text-lg group-hover:text-amber-900 transition-colors">
                      {model.name}
                    </h3>
                    <span className="text-xs text-stone-500 font-medium whitespace-nowrap">
                      {model.heightGroupLabel}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {model.subtitle}
                  </p>

                  {/* Specs Table */}
                  <div className="mt-4 pt-3 border-t border-stone-100 space-y-1.5 text-xs">
                    <div className="flex justify-between text-stone-600">
                      <span className="text-stone-400">尺寸 (高/深/長)</span>
                      <span className="font-semibold text-stone-800 font-mono">
                        {model.dimensions.height} × {model.dimensions.depth} × {model.dimensions.length} cm
                      </span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span className="text-stone-400">建議貓口</span>
                      <span className="font-medium text-stone-800">{model.recommendedCats}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span className="text-stone-400">板材厚度</span>
                      <span className="text-stone-800 font-bold font-mono">純實木足 1.5cm</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span className="text-stone-400">門片材質</span>
                      <span className="text-stone-700 font-medium">高透耐磨安全壓克力</span>
                    </div>
                  </div>

                  {/* Dynamic Highlights / Included Accessories Tag Cloud */}
                  <div className="mt-3 bg-stone-50 rounded-xl p-3 text-xs space-y-2 border border-stone-100">
                    <div className="font-semibold text-amber-900 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-amber-700" />
                        <span>配置亮點</span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-normal">
                        {((model.includedAccessories && model.includedAccessories.length > 0)
                          ? model.includedAccessories
                          : model.highlights).length} 個標籤
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {((model.includedAccessories && model.includedAccessories.length > 0)
                        ? model.includedAccessories
                        : model.highlights
                      ).map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-stone-200 text-stone-700 rounded-md text-[11px] shadow-2xs font-medium"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-700" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Price & Action row */}
                <div className="pt-4 border-t border-stone-100">
                  <div className="flex items-baseline justify-between mb-3">
                    <div>
                      <span className="text-[11px] text-stone-400">客製空屋價</span>
                      <div className="text-2xl font-bold text-amber-900 font-mono tabular-nums">
                        NT$ {model.price.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-stone-500">
                      <span>到府安裝工資</span>
                      <div className="font-mono text-stone-700 font-semibold">
                        + NT$ {model.installFee.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectForQuote(model)}
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                    >
                      <Calculator className="w-3.5 h-3.5 text-amber-800" />
                      <span>帶入試算</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openLightbox(
                          model.name,
                          imgs,
                          `規格：${model.dimensions.dimensionCode}（高${model.dimensions.height} x 深${model.dimensions.depth} x 長${model.dimensions.length} cm）`
                        )
                      }
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-lg shadow-xs transition-colors"
                    >
                      <Images className="w-3.5 h-3.5" />
                      <span>看細節{imgs.length > 1 ? `(${imgs.length}張)` : '大圖'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        {/* View More & Pagination Controls */}
        <div className="mt-10 space-y-4 text-center">
          {!showAllCards && filteredModels.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllCards(true)}
              className="inline-flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
              <span>查看全部精選款式（共 {filteredModels.length} 款）</span>
            </button>
          )}

          {showAllCards && (
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
                    setShowAllCards(false);
                    setCurrentPage(1);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-stone-600 bg-stone-200/80 hover:bg-stone-300 rounded-xl transition-all cursor-pointer"
                >
                  <ChevronUp className="w-4 h-4" />
                  <span>收起部分款式（恢復顯示預設前 6 款）</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Store Owner Add/Edit Model Modal */}
      {isFormModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setIsFormModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-stone-200 overflow-y-auto max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif-title font-bold text-stone-900 text-base sm:text-lg">
                    {editingModelId ? '編輯貓別墅款式卡片' : '上傳並新增貓別墅款式'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    可自由調整名稱、規格、價格、圖片及新增/刪除配置亮點標籤
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              {/* Photo Upload & Preview */}
              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  款式外觀與多角度實拍照 * (支援連續多選上傳：主圖、開門、關門、內部、內飾等)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleMultipleImagesUpload}
                  className="hidden"
                />
                {formImages.length > 0 ? (
                  <div className="space-y-2">
                    <div className="relative aspect-16/10 rounded-xl overflow-hidden bg-stone-100 border border-stone-300 flex items-center justify-center">
                      <img src={formImage || formImages[0]} alt="款式主圖預覽" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-2 right-2 px-3 py-1.5 bg-stone-900/80 hover:bg-stone-900 text-white rounded-lg text-xs font-semibold shadow-xs"
                      >
                        + 繼續添加照片 (可多選)
                      </button>
                    </div>
                    {/* Thumbnails grid */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {formImages.map((imgUrl, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-stone-300 shrink-0">
                          <img src={imgUrl} alt={`預覽 ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formImages.filter((_, idx) => idx !== i);
                              setFormImages(updated);
                              setFormImage(updated[0] || null);
                            }}
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
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-stone-300 hover:border-amber-700 bg-stone-50 rounded-xl p-6 text-center cursor-pointer transition-colors"
                  >
                    <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                    <p className="font-semibold text-stone-700">點擊連續上傳多張實拍照片（可多選）</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">支援一次選取多張主圖、開關門、內部及配件實拍</p>
                  </div>
                )}
              </div>

              {/* Model Name & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    款式標題名稱 *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="例如：K款（180-60-150）旗艦款"
                    required
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-900/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    醒目標籤 Badge (如：熱賣款、雙門霸主)
                  </label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="例如：人氣首選、多貓推薦"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-900/20"
                  />
                </div>
              </div>

              {/* Subtitle */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  副標題簡述
                </label>
                <input
                  type="text"
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                  placeholder="例如：天然松木無甲醛 · 靜音萬向輪 · 側邊格柵通風"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-900/20"
                />
              </div>

              {/* Height Group & Recommended Cats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    高度分類 (供篩選分組) *
                  </label>
                  <select
                    value={formHeightGroup}
                    onChange={(e) => {
                      const grp = e.target.value as '90' | '120' | '150' | '180';
                      setFormHeightGroup(grp);
                      setFormHeight(Number(grp));
                    }}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="90">高 90cm 系列</option>
                    <option value="120">高 120cm 系列</option>
                    <option value="150">高 150cm 系列</option>
                    <option value="180">高 180cm 系列</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    建議貓口
                  </label>
                  <input
                    type="text"
                    value={formRecommendedCats}
                    onChange={(e) => setFormRecommendedCats(e.target.value)}
                    placeholder="例如：2 - 3 隻貓咪 / 多貓家庭"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Dimensions (Height, Depth, Length) */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <span className="font-bold text-stone-800 block">
                  詳細尺寸規格 (單位：公分 cm)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-stone-500 mb-1">高度 (cm)</label>
                    <input
                      type="number"
                      value={formHeight}
                      onChange={(e) => setFormHeight(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-500 mb-1">深度 (cm)</label>
                    <input
                      type="number"
                      value={formDepth}
                      onChange={(e) => setFormDepth(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-500 mb-1">長度/面寬 (cm)</label>
                    <input
                      type="number"
                      value={formLength}
                      onChange={(e) => setFormLength(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing & Install Fee */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    空屋價 (NT$) *
                  </label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    到府安裝工資 (NT$) *
                  </label>
                  <input
                    type="number"
                    value={formInstallFee}
                    onChange={(e) => setFormInstallFee(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-700"
                    required
                  />
                </div>
              </div>

              {/* Highlight Tag Management (Add/Delete tags dynamically) */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-800">
                    配置亮點標籤（可自由新增或刪除標籤）
                  </label>
                  <span className="text-[11px] text-stone-400">
                    目前 {formHighlights.length} 個標籤
                  </span>
                </div>

                {/* Tag List with Delete Button */}
                <div className="flex flex-wrap gap-1.5 min-h-8 p-2 bg-white rounded-lg border border-stone-200">
                  {formHighlights.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-950 border border-amber-200 rounded-md text-xs font-medium"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveHighlightTag(idx)}
                        className="text-stone-400 hover:text-red-600 transition-colors"
                        title="刪除此標籤"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                {/* Input for adding new tag */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newHighlightInput}
                    onChange={(e) => setNewHighlightInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddHighlightTag();
                      }
                    }}
                    placeholder="輸入新亮點，例如：附實木收納抽屜、高空雙太空艙..."
                    className="flex-1 bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-amber-900/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddHighlightTag}
                    className="px-3.5 py-1.5 bg-amber-900 hover:bg-amber-800 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors shrink-0"
                  >
                    新增標籤
                  </button>
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingModelId ? '儲存變更' : '確認上傳建立款式'}</span>
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
          if (authActionTitle.includes('新增') || authActionTitle.includes('上傳')) {
            handleOpenAddModal();
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
