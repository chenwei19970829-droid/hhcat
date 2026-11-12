import React, { useState, useEffect, useRef } from 'react';
import { FEATURED_MODELS, VillaModel, STORE_INFO } from '../data/catVillaData';
import {
  Maximize2,
  Calculator,
  MessageCircle,
  Check,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Upload,
  Lock,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle
} from 'lucide-react';

// Store Owner Auth Inline Helper
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
  actionTitle = '使用款式管理功能'
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
      }, 600);
    } else {
      setErrorMsg('密碼不正確！此功能僅限【花花招財貓】店主陳店長本人使用。');
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
              <p className="text-xs text-amber-200/80">花花招財貓 · 款式管理專區</p>
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
              為維護官網展示品質，精選款式上傳、價格調整與亮點編輯權限僅開放給店主本人使用。
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

interface FeaturedModelsProps {
  onSelectForQuote: (model: VillaModel) => void;
  onOpenImageZoom: (imageTitle: string, imageUrl: string, subtitle?: string) => void;
}

const STORAGE_KEY = 'hhcat_featured_custom_models_v2';
const DELETED_MODELS_KEY = 'hhcat_deleted_models_ids_v1';

export const FeaturedModels: React.FC<FeaturedModelsProps> = ({
  onSelectForQuote,
  onOpenImageZoom
}) => {
  const { isOwner, logout } = useStoreOwner();
  const [filter, setFilter] = useState<'all' | '90' | '120' | '150' | '180'>('all');
  const [showAllCards, setShowAllCards] = useState<boolean>(false);
  const [models, setModels] = useState<VillaModel[]>(FEATURED_MODELS);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authActionTitle, setAuthActionTitle] = useState('款式管理操作');

  // Edit / Add Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formHeightGroup, setFormHeightGroup] = useState<'90' | '120' | '150' | '180'>('150');
  const [formHeight, setFormHeight] = useState<number>(150);
  const [formDepth, setFormDepth] = useState<number>(60);
  const [formLength, setFormLength] = useState<number>(120);
  const [formPrice, setFormPrice] = useState<number>(13800);
  const [formInstallFee, setFormInstallFee] = useState<number>(4500);
  const [formImage, setFormImage] = useState<string>('');
  const [formBadge, setFormBadge] = useState<string>('熱賣款');
  const [formRecommendedCats, setFormRecommendedCats] = useState<string>('2 - 3 隻貓咪');
  const [formHighlights, setFormHighlights] = useState<string[]>([
    '純實木板厚度足 1.5cm',
    '天然松木無甲醛',
    '高透耐磨安全壓克力門'
  ]);
  const [newHighlightInput, setNewHighlightInput] = useState('');
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load models from localStorage and filter out deleted ones
  useEffect(() => {
    try {
      const deletedJson = localStorage.getItem(DELETED_MODELS_KEY);
      const deletedIds: string[] = deletedJson ? JSON.parse(deletedJson) : [];

      const savedJson = localStorage.getItem(STORAGE_KEY);
      let combined: VillaModel[] = [];

      if (savedJson) {
        const parsed: VillaModel[] = JSON.parse(savedJson);
        if (Array.isArray(parsed)) {
          // Map default models with custom overrides / additions
          const customAdded = parsed.filter((m) => m.isCustomUpload);
          const editedDefaults = parsed.filter((m) => !m.isCustomUpload);

          const defaultMapped = FEATURED_MODELS.map((orig) => {
            const foundEdited = editedDefaults.find((e) => e.id === orig.id);
            return foundEdited || orig;
          });

          combined = [...customAdded, ...defaultMapped];
        } else {
          combined = FEATURED_MODELS;
        }
      } else {
        combined = FEATURED_MODELS;
      }

      setModels(combined.filter((m) => !deletedIds.includes(m.id)));
    } catch (e) {
      console.warn('Failed to load featured models from storage', e);
      setModels(FEATURED_MODELS);
    }
  }, []);

  const saveModelsToStorage = (updatedList: VillaModel[]) => {
    setModels(updatedList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  };

  const handleOpenAddModal = () => {
    if (!isOwner) {
      setAuthActionTitle('上傳並新增精選貓別墅款式');
      setIsAuthModalOpen(true);
      return;
    }

    setEditingModelId(null);
    setFormName('');
    setFormSubtitle('天然松木無甲醛 · 實木厚度足 1.5cm · 安全壓克力門');
    setFormHeightGroup('150');
    setFormHeight(150);
    setFormDepth(60);
    setFormLength(120);
    setFormPrice(13800);
    setFormInstallFee(4500);
    setFormImage('');
    setFormBadge('熱賣推薦');
    setFormRecommendedCats('2 - 3 隻貓咪');
    setFormHighlights([
      '純實木板厚度足 1.5cm',
      '天然松木無甲醛',
      '高透耐磨安全壓克力門',
      '免運 (偏遠離島除外)'
    ]);
    setNewHighlightInput('');
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (model: VillaModel, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) {
      setAuthActionTitle(`編輯款式【${model.name}】卡片內容`);
      setIsAuthModalOpen(true);
      return;
    }

    setEditingModelId(model.id);
    setFormName(model.name);
    setFormSubtitle(model.subtitle);
    setFormHeightGroup(model.heightGroup);
    setFormHeight(model.dimensions.height);
    setFormDepth(model.dimensions.depth);
    setFormLength(model.dimensions.length);
    setFormPrice(model.price);
    setFormInstallFee(model.installFee);
    setFormImage(model.image);
    setFormBadge(model.badge || '');
    setFormRecommendedCats(model.recommendedCats);
    setFormHighlights(
      model.includedAccessories && model.includedAccessories.length > 0
        ? [...model.includedAccessories]
        : [...model.highlights]
    );
    setNewHighlightInput('');
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleDeleteModel = (model: VillaModel, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) {
      setAuthActionTitle('刪除款式卡片');
      setIsAuthModalOpen(true);
      return;
    }

    if (window.confirm(`確定要刪除款式【${model.name}】嗎？`)) {
      try {
        const deletedJson = localStorage.getItem(DELETED_MODELS_KEY);
        const deletedIds: string[] = deletedJson ? JSON.parse(deletedJson) : [];
        if (!deletedIds.includes(model.id)) {
          deletedIds.push(model.id);
          localStorage.setItem(DELETED_MODELS_KEY, JSON.stringify(deletedIds));
        }
      } catch (err) {
        console.warn(err);
      }

      const updated = models.filter((m) => m.id !== model.id);
      saveModelsToStorage(updated);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('請選擇圖片檔案（JPG / PNG / WEBP）');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setFormError('圖片大小請小於 8MB');
      return;
    }

    setFormError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddHighlightTag = () => {
    const trimmed = newHighlightInput.trim();
    if (!trimmed) return;
    if (formHighlights.includes(trimmed)) {
      setFormError('該亮點標籤已存在');
      return;
    }
    setFormHighlights([...formHighlights, trimmed]);
    setNewHighlightInput('');
    setFormError('');
  };

  const handleRemoveHighlightTag = (index: number) => {
    setFormHighlights(formHighlights.filter((_, i) => i !== index));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('請輸入款式名稱');
      return;
    }
    if (!formImage) {
      setFormError('請上傳款式照片');
      return;
    }

    const dimensionCode = `${formHeight}-${formDepth}-${formLength}`;
    const heightGroupLabel = `高 ${formHeightGroup}cm 系列`;

    if (editingModelId) {
      // Update existing
      const updated = models.map((m) => {
        if (m.id === editingModelId) {
          return {
            ...m,
            name: formName.trim(),
            subtitle: formSubtitle.trim(),
            heightGroup: formHeightGroup,
            heightGroupLabel,
            dimensions: {
              height: formHeight,
              depth: formDepth,
              length: formLength,
              dimensionCode
            },
            price: formPrice,
            installFee: formInstallFee,
            image: formImage,
            badge: formBadge.trim() || undefined,
            recommendedCats: formRecommendedCats.trim() || '1 - 3 隻貓咪',
            highlights: formHighlights,
            includedAccessories: formHighlights
          };
        }
        return m;
      });
      saveModelsToStorage(updated);
    } else {
      // Add new
      const newModel: VillaModel = {
        id: `model-custom-${Date.now()}`,
        name: formName.trim(),
        subtitle: formSubtitle.trim() || '純實木板厚度足 1.5cm · 天然松木無甲醛',
        heightGroup: formHeightGroup,
        heightGroupLabel,
        dimensions: {
          height: formHeight,
          depth: formDepth,
          length: formLength,
          dimensionCode
        },
        price: formPrice,
        installFee: formInstallFee,
        image: formImage,
        badge: formBadge.trim() || undefined,
        recommendedCats: formRecommendedCats.trim() || '1 - 3 隻貓咪',
        suitableSpace: '客廳主位、寵物房',
        highlights: formHighlights,
        includedAccessories: formHighlights,
        description: `${dimensionCode} 客製款式，純實木板足 1.5cm，提供出貨前預組裝拍照與 1 年保固。`,
        isCustomUpload: true
      };
      saveModelsToStorage([newModel, ...models]);
    }

    setIsFormModalOpen(false);
  };

  // Filter models based on user selected height group
  const filteredModels = models.filter((model) => {
    if (filter === 'all') return true;
    return model.heightGroup === filter;
  });

  // When 'all' is selected: default display only 6 cards, hide remaining with view-more toggle
  const shouldLimit = filter === 'all' && !showAllCards;
  const displayedModels = shouldLimit ? filteredModels.slice(0, 6) : filteredModels;

  return (
    <section id="models" className="py-16 sm:py-20 border-b border-stone-200 scroll-mt-20">
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
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
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
          {displayedModels.map((model) => (
            <div
              key={model.id}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg hover:border-amber-800/40 transition-all flex flex-col group relative"
            >
              {/* Product Studio Refined Photo with Click Zoom */}
              <div
                className="relative aspect-4/3 bg-[#F6F2EC] p-2 cursor-pointer overflow-hidden border-b border-stone-100 flex items-center justify-center"
                onClick={() =>
                  onOpenImageZoom(
                    model.name,
                    model.image,
                    `規格：${model.dimensions.dimensionCode}（高${model.dimensions.height} x 深${model.dimensions.depth} x 長${model.dimensions.length} cm）`
                  )
                }
                title="點擊放大查看高清精修細節圖"
              >
                <img
                  src={model.image}
                  alt={model.name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />

                {/* Zoom indicator overlay */}
                <div className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-xs rounded-lg text-stone-700 shadow-xs group-hover:bg-amber-900 group-hover:text-white transition-colors">
                  <Maximize2 className="w-4 h-4" />
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

                {/* Free shipping pill */}
                <div className="absolute bottom-3 right-3 bg-emerald-700/90 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded font-medium">
                  免運 (偏遠離島除外)
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
                      <span>編輯卡片/標籤</span>
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
                      <span className="text-[11px] text-stone-400">客製空屋價（免運不含偏遠離島）</span>
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

                    <a
                      href={`${STORE_INFO.lineUrl}?text=${encodeURIComponent(
                        `您好！我在花花招財貓網站看到【${model.name} (${model.dimensions.dimensionCode})】，想諮詢客製排單與出貨時程！`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 py-2.5 px-3 text-xs font-semibold text-white bg-[#06C755] hover:bg-[#05b34c] rounded-lg shadow-xs transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>LINE 諮詢此款</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View More Toggle for "All" size filter */}
        {filter === 'all' && filteredModels.length > 6 && (
          <div className="text-center pt-10">
            <button
              type="button"
              onClick={() => setShowAllCards(!showAllCards)}
              className="inline-flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-xl transition-all shadow-md active:scale-95"
            >
              {showAllCards ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>收起部分款式（僅顯示預設前 6 款）</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>查看全部精選款式（還有 {filteredModels.length - 6} 個款式）</span>
                </>
              )}
            </button>
          </div>
        )}
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
                  款式外觀實拍照 * (建議 JPG / PNG)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {formImage ? (
                  <div className="relative aspect-16/10 rounded-xl overflow-hidden bg-stone-100 border border-stone-300 flex items-center justify-center">
                    <img src={formImage} alt="款式預覽" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 px-3 py-1.5 bg-stone-900/80 hover:bg-stone-900 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      更換照片
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-stone-300 hover:border-amber-700 bg-stone-50 rounded-xl p-6 text-center cursor-pointer transition-colors"
                  >
                    <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                    <p className="font-semibold text-stone-700">點擊上傳款式外觀照片</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">支援手機拍照直接上傳或選取檔案</p>
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
    </section>
  );
};
