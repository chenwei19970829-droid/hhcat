import React, { useState, useEffect, useRef } from 'react';
import { FEATURED_MODELS, VillaModel } from '../data/catVillaData';
import { MultiPhotoLightbox } from './MultiPhotoLightbox';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { compressImage } from '../utils/imageCompressor';
import { useStoreOwner } from '../utils/adminAuth';
import { StoreOwnerAuthModal } from './StoreOwnerAuthModal';
import { CloudSyncStatusBar } from './CloudSyncStatusBar';
import {
  fitImagesWithinFirestoreLimit,
  formatFirestoreActionError,
  isQuotaError
} from '../utils/cloudSync';
import {
  VillaCloudError,
  addLocalDeletedModelId,
  buildFirestoreVillaPayload,
  loadCachedVillaModels,
  lookupMenuPricing,
  notifyVillaModelsUpdated,
  removeLocalDeletedModelId,
  sortVillaModels
} from '../utils/villaModels';
import {
  Maximize2,
  Calculator,
  Check,
  Plus,
  Trash2,
  Edit3,
  Upload,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Sparkles,
  X,
  AlertCircle,
  Images,
  RefreshCw
} from 'lucide-react';

export interface FeaturedCloudSyncBridge {
  cloudStatus: 'loading' | 'synced' | 'error';
  cloudError: VillaCloudError | null;
  setCloudStatus: (status: 'loading' | 'synced' | 'error') => void;
  setCloudError: (err: VillaCloudError | null) => void;
  cloudModelIds: Set<string>;
  unsyncedLocalModels: VillaModel[];
  isSyncingManual: boolean;
  refreshFromCloud: () => Promise<{ ok: boolean; count?: number; error?: string }>;
  syncStrandedModel: (
    model: VillaModel
  ) => Promise<{ ok: boolean; syncedModel?: VillaModel; error?: string }>;
  discardStrandedModel: (modelId: string) => void;
  markModelSynced: (model: VillaModel) => void;
  markModelDeleted: (modelId: string) => void;
}

interface FeaturedModelsProps {
  externalModels?: VillaModel[];
  cloudSync?: FeaturedCloudSyncBridge;
  onSelectForQuote: (model: VillaModel) => void;
  onOpenImageZoom: (imageTitle: string, imageUrl: string, subtitle?: string) => void;
  onOpenModelPage?: (model: VillaModel) => void;
}

const DEFAULT_FEATURED_IDS = new Set(FEATURED_MODELS.map((m) => m.id));

export const FeaturedModels: React.FC<FeaturedModelsProps> = ({
  externalModels,
  cloudSync,
  onSelectForQuote,
  onOpenModelPage
}) => {
  const { isOwner, logout } = useStoreOwner();
  const [filter, setFilter] = useState<'all' | '90' | '120' | '150' | '180'>('all');
  const [showAllCards, setShowAllCards] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [models, setModels] = useState<VillaModel[]>(() =>
    externalModels && externalModels.length > 0 ? externalModels : loadCachedVillaModels()
  );
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
  const [formPrice, setFormPrice] = useState(8500);
  const [formInstallFee, setFormInstallFee] = useState(3000);
  const [pricingAutoNote, setPricingAutoNote] = useState<string | null>(null);
  const [formRecommendedCats, setFormRecommendedCats] = useState('1-2 隻貓咪');
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formHighlights, setFormHighlights] = useState<string[]>([]);
  const [newHighlightInput, setNewHighlightInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cloud Sync & In-App Delete Confirmation State
  const [syncNoticeBanner, setSyncNoticeBanner] = useState<string | null>(null);
  const [deletingModel, setDeletingModel] = useState<VillaModel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Drag & Drop States (Desktop photo drop & highlight tag reordering)
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const imageDragDepthRef = useRef(0);
  const [draggedTagIndex, setDraggedTagIndex] = useState<number | null>(null);
  const [dragOverTagIndex, setDragOverTagIndex] = useState<number | null>(null);

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

  useEffect(() => {
    if (externalModels) {
      setModels(sortVillaModels(externalModels));
    }
  }, [externalModels]);

  const applyMenuPricingForDimensions = (
    nextH: number,
    nextD: number,
    nextL: number,
    updateGroup = true
  ) => {
    const matched = lookupMenuPricing(nextH, nextD, nextL);
    if (!matched) {
      setPricingAutoNote(null);
      return;
    }
    if (updateGroup) {
      setFormHeightGroup(matched.heightGroup);
    }
    setFormPrice(matched.price);
    setFormInstallFee(matched.installFee);
    setPricingAutoNote(matched.note);
  };

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
    const defaultPricing = lookupMenuPricing(120, 60, 90);
    setFormPrice(defaultPricing ? defaultPricing.price : 8500);
    setFormInstallFee(defaultPricing ? defaultPricing.installFee : 3000);
    setPricingAutoNote(defaultPricing ? defaultPricing.note : null);
    setFormRecommendedCats('1-2 隻貓咪');
    setFormImage(null);
    setFormImages([]);
    setFormHighlights(['天然松木無甲醛', '靜音萬向輪', '高透壓克力門', '側邊格柵通風']);
    setNewHighlightInput('');
    setFormError(null);
    setIsDraggingImages(false);
    imageDragDepthRef.current = 0;
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
    setPricingAutoNote('編輯尺寸規格（高/深/長）後將自動依菜單更新價格，也可手動微調');
    setFormRecommendedCats(model.recommendedCats || '1-2 隻貓咪');
    setFormImage(model.image);
    const existingImgs = model.images && model.images.length > 0 ? model.images : [model.image];
    setFormImages(existingImgs);
    setFormHighlights(
      model.includedAccessories && model.includedAccessories.length > 0
        ? [...model.includedAccessories]
        : [...model.highlights]
    );
    setNewHighlightInput('');
    setFormError(null);
    setIsDraggingImages(false);
    imageDragDepthRef.current = 0;
    setIsFormModalOpen(true);
  };

  const handleRequestDeleteModel = (model: VillaModel, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) {
      setAuthActionTitle('刪除精選款式');
      setIsAuthModalOpen(true);
      return;
    }
    setDeleteError(null);
    setDeletingModel(model);
  };

  const handleConfirmDeleteModel = async () => {
    if (!deletingModel || isDeleting) return;
    const targetModel = deletingModel;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await setDoc(doc(db, 'featuredModels', targetModel.id), {
        id: targetModel.id,
        deleted: true,
        updatedAt: new Date().toISOString()
      });

      addLocalDeletedModelId(targetModel.id);
      const updated = models.filter((m) => m.id !== targetModel.id);
      setModels(updated);
      notifyVillaModelsUpdated(updated);
      cloudSync?.markModelDeleted(targetModel.id);
      setDeletingModel(null);
      setSyncNoticeBanner(`已將「${targetModel.name}」從雲端資料庫移除，手機、電腦、平板將同步下架。`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `featuredModels/${targetModel.id}`);
      const msg = formatFirestoreActionError(err, '雲端刪除款式');
      setDeleteError(msg);
      if (isQuotaError(err)) {
        cloudSync?.setCloudStatus('error');
        cloudSync?.setCloudError({ message: msg, isQuota: true });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleManualRefresh = async () => {
    if (!cloudSync) return;
    setSyncNoticeBanner(null);
    const result = await cloudSync.refreshFromCloud();
    if (result.ok) {
      setSyncNoticeBanner(
        `已完成雲端款式比對（雲端共 ${result.count ?? cloudSync.cloudModelIds.size} 筆自訂款式），手機與電腦現為完全一致內容。`
      );
    }
  };

  const handleSyncRecoveryItem = async (modelId: string) => {
    if (!cloudSync) return;
    const target = cloudSync.unsyncedLocalModels.find((m) => m.id === modelId);
    if (!target) return;
    setSyncNoticeBanner(null);
    const res = await cloudSync.syncStrandedModel(target);
    if (res.ok && res.syncedModel) {
      setSyncNoticeBanner(`已將「${res.syncedModel.name}」壓縮並補傳至雲端，手機現在也可以看到了！`);
    }
  };

  const handleSyncAllRecoveryItems = async () => {
    if (!cloudSync || cloudSync.unsyncedLocalModels.length === 0) return;
    setSyncNoticeBanner(null);
    const queue = [...cloudSync.unsyncedLocalModels];
    let successCount = 0;
    for (const m of queue) {
      const res = await cloudSync.syncStrandedModel(m);
      if (res.ok) {
        successCount += 1;
      } else {
        break;
      }
    }
    if (successCount > 0) {
      setSyncNoticeBanner(`已成功補傳 ${successCount} 筆款式至雲端資料庫，手機／電腦／平板現在皆可看到！`);
    }
  };

  const processImageFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
    if (files.length === 0) {
      setFormError('請拖曳或選擇圖片檔案（支援 JPG / PNG / WebP）');
      return;
    }

    try {
      setIsProcessingImages(true);
      setFormError(null);
      const compressedList: string[] = [];
      for (const file of files) {
        const compressed = await compressImage(file, 840, 0.7);
        compressedList.push(compressed);
      }
      if (compressedList.length > 0) {
        setFormImages((prev) => {
          const updated = [...prev, ...compressedList];
          setFormImage(updated[0]);
          return updated;
        });
      }
    } catch {
      setFormError('多張照片壓縮處理失敗，請重試');
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

  const hasDraggedFiles = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types || []).includes('Files');

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

  const handleSetPrimaryImage = (index: number) => {
    if (index <= 0 || index >= formImages.length) return;
    setFormImages((prev) => {
      const next = [...prev];
      const [chosen] = next.splice(index, 1);
      next.unshift(chosen);
      setFormImage(next[0]);
      return next;
    });
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

  const moveHighlightTag = (fromIdx: number, toIdx: number) => {
    if (
      fromIdx === toIdx ||
      fromIdx < 0 ||
      toIdx < 0 ||
      fromIdx >= formHighlights.length ||
      toIdx >= formHighlights.length
    ) {
      return;
    }
    setFormHighlights((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!formName.trim()) {
      setFormError('請填寫款式標題名稱');
      return;
    }
    const finalImages = formImages.length > 0 ? formImages : (formImage ? [formImage] : []);
    if (finalImages.length === 0) {
      setFormError('請至少上傳一張款式外觀照片');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const targetId = editingModelId || `custom-model-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const draftModel: VillaModel = {
      id: targetId,
      name: formName.trim(),
      subtitle: formSubtitle.trim() || '純實木無甲醛 · 高透耐磨安全壓克力門',
      heightGroup: formHeightGroup,
      heightGroupLabel: `高 ${formHeightGroup}cm 系列`,
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
      description: formSubtitle.trim() || '花花招財貓實木客製貓別墅',
      isCustomUpload: true
    };

    const firestoreMeta = buildFirestoreVillaPayload(draftModel, nowIso);

    try {
      const fitted = await fitImagesWithinFirestoreLimit(finalImages, firestoreMeta, {
        primaryField: 'image',
        arrayField: 'images'
      });

      if (!fitted.ok) {
        setFormError(fitted.reason);
        setIsSubmitting(false);
        return;
      }

      // Write to Firestore FIRST so desktop never misleads owner when cloud write fails
      await setDoc(doc(db, 'featuredModels', targetId), {
        ...firestoreMeta,
        image: fitted.images[0],
        images: fitted.images
      });

      const syncedModel: VillaModel = {
        ...draftModel,
        image: fitted.images[0],
        images: fitted.images
      };

      removeLocalDeletedModelId(targetId);

      const existingIdx = models.findIndex((m) => m.id === targetId);
      const rawUpdated =
        existingIdx >= 0
          ? models.map((m) => (m.id === targetId ? syncedModel : m))
          : [syncedModel, ...models];
      const updated = sortVillaModels(rawUpdated);

      setModels(updated);
      notifyVillaModelsUpdated(updated);
      cloudSync?.markModelSynced(syncedModel);

      setIsFormModalOpen(false);
      setSyncNoticeBanner(
        `「${syncedModel.name}」已上傳並寫入雲端資料庫，手機、電腦、平板現在皆會同步顯示！`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `featuredModels/${targetId}`);
      const errMsg = formatFirestoreActionError(err, '上傳貓別墅款式至雲端');
      setFormError(errMsg);
      if (isQuotaError(err)) {
        cloudSync?.setCloudStatus('error');
        cloudSync?.setCloudError({ message: errMsg, isQuota: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter & sort models in natural A-Z / 1-99 order
  const filteredModels = sortVillaModels(
    models.filter((model) => {
      if (filter === 'all') return true;
      return model.heightGroup === filter;
    })
  );

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

          {/* Action buttons: Store Owner Sync & Add (hidden from public visitors) */}
          {isOwner && (
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              {cloudSync && (
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={cloudSync.isSyncingManual}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl shadow-2xs transition-colors disabled:opacity-60"
                  title="向雲端資料庫重新抓取最新清單，確認手機與電腦完全一致"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cloudSync.isSyncingManual ? 'animate-spin' : ''}`} />
                  <span>同步檢查 ({cloudSync.cloudModelIds.size} 筆雲端)</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>店主新增/上傳款式</span>
              </button>
              <button
                type="button"
                onClick={logout}
                className="px-2.5 py-2 text-[11px] text-stone-500 hover:text-stone-800 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors shrink-0"
                title="登出店主管理狀態"
              >
                鎖定
              </button>
            </div>
          )}
        </div>

        {/* Owner Cloud Status, Quota Alerts & Stranded Local Model Recovery */}
        {isOwner && (
          <CloudSyncStatusBar
            sectionLabel="精選貓別墅款式"
            cloudError={cloudSync?.cloudError ?? null}
            onDismissError={() => cloudSync?.setCloudError(null)}
            onRetrySync={cloudSync ? handleManualRefresh : undefined}
            syncNoticeBanner={syncNoticeBanner}
            onDismissNotice={() => setSyncNoticeBanner(null)}
            recoveryItems={(cloudSync?.unsyncedLocalModels || []).map((m) => ({
              id: m.id,
              title: m.name,
              subtitle: `${m.dimensions.dimensionCode} cm · NT$ ${m.price.toLocaleString()} · 共 ${(m.images && m.images.length) || 1} 張照片`,
              thumbnailUrl: (m.images && m.images[0]) || m.image
            }))}
            isSyncing={cloudSync?.isSyncingManual ?? false}
            onSyncRecoveryItem={handleSyncRecoveryItem}
            onDiscardRecoveryItem={(id) => {
              cloudSync?.discardStrandedModel(id);
              setSyncNoticeBanner('已移除該筆僅存於本機的未同步暫存款式。');
            }}
            onSyncAllRecoveryItems={handleSyncAllRecoveryItems}
          />
        )}

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
                  alt={`花花招財貓-台中豐原客製化1.5cm松木貓別墅-${model.dimensions.dimensionCode}cm（${model.name}）`}
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
                      onClick={(e) => handleRequestDeleteModel(model, e)}
                      className="px-2.5 py-1 bg-red-600/90 hover:bg-red-700 text-white text-[11px] font-semibold rounded-lg shadow-sm flex items-center gap-1 backdrop-blur-xs"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>刪除</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Owner Sync Status Strip inside card */}
              {isOwner && (
                <div className="px-6 pt-3 pb-0 flex items-center justify-between text-[10px]">
                  {cloudSync?.cloudModelIds.has(model.id) ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      雲端已同步（手機／電腦皆可見）
                    </span>
                  ) : DEFAULT_FEATURED_IDS.has(model.id) ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-stone-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                      官方預設目錄款（所有裝置皆有）
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                      {cloudSync?.cloudStatus === 'error' ? '離線／額度滿快取中' : '等待雲端確認...'}
                    </span>
                  )}
                </div>
              )}

              {/* Content Body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-serif-title font-bold text-stone-900 text-lg group-hover:text-amber-900 transition-colors">
                      <a
                        href={`/villa/${encodeURIComponent(model.id)}`}
                        onClick={(e) => {
                          if (onOpenModelPage) {
                            e.preventDefault();
                            onOpenModelPage(model);
                          }
                        }}
                        className="hover:underline"
                      >
                        {model.name}
                      </a>
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

                    <a
                      href={`/villa/${encodeURIComponent(model.id)}`}
                      onClick={(e) => {
                        if (onOpenModelPage) {
                          e.preventDefault();
                          onOpenModelPage(model);
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-lg shadow-xs transition-colors"
                    >
                      <Images className="w-3.5 h-3.5" />
                      <span>規格與加購細節</span>
                    </a>
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
        >
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-stone-200 overflow-y-auto max-h-[92vh]">
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
                    點擊視窗外側不會自動關閉 · 請使用右上角「✕」或「取消」離開
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
                title="關閉視窗"
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
              {/* Photo Upload & Desktop Drag-and-Drop Preview */}
              <div
                onDragEnter={handleImageDragEnter}
                onDragOver={handleImageDragOver}
                onDragLeave={handleImageDragLeave}
                onDrop={handleImageDrop}
                className="relative rounded-xl transition-all"
              >
                <div className="flex items-center justify-between mb-1 gap-2">
                  <label className="block font-bold text-stone-800">
                    款式外觀與多角度實拍照 * (支援桌面直接拖入多張照片)
                  </label>
                  {isProcessingImages && (
                    <span className="text-[11px] font-semibold text-amber-800 animate-pulse">
                      正在壓縮處理照片...
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
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
                  <div className="space-y-2">
                    <div
                      className={`relative aspect-16/10 rounded-xl overflow-hidden bg-stone-100 border-2 flex items-center justify-center transition-colors ${
                        isDraggingImages ? 'border-amber-700' : 'border-stone-300 border-solid'
                      }`}
                    >
                      <img src={formImage || formImages[0]} alt="款式主圖預覽" className="w-full h-full object-contain" />
                      <div className="absolute bottom-2 inset-x-2 flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 bg-white/90 text-stone-600 rounded-lg text-[10px] font-medium shadow-2xs">
                          可繼續從桌面拖曳圖片至此區批次補圖
                        </span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-stone-900/85 hover:bg-stone-900 text-white rounded-lg text-xs font-semibold shadow-xs shrink-0"
                        >
                          + 選擇添加照片
                        </button>
                      </div>
                    </div>
                    {/* Thumbnails grid */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {formImages.map((imgUrl, i) => (
                        <div
                          key={i}
                          className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 group ${
                            i === 0 ? 'border-amber-800' : 'border-stone-300'
                          }`}
                        >
                          <img
                            src={imgUrl}
                            alt={`預覽 ${i + 1}`}
                            onClick={() => handleSetPrimaryImage(i)}
                            className={`w-full h-full object-cover ${
                              i > 0 ? 'cursor-pointer hover:opacity-90' : ''
                            }`}
                            title={i === 0 ? '目前為主圖' : '點擊設為主圖'}
                          />
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
                          {i === 0 ? (
                            <span className="absolute bottom-0 inset-x-0 bg-amber-900 text-white text-[9px] text-center font-bold py-0.5">
                              主圖
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(i)}
                              className="absolute bottom-0 inset-x-0 bg-black/65 text-white text-[9px] text-center font-medium py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              設為主圖
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      isDraggingImages
                        ? 'border-amber-700 bg-amber-50'
                        : 'border-stone-300 hover:border-amber-700 bg-stone-50'
                    }`}
                  >
                    <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                    <p className="font-semibold text-stone-700">
                      將桌面多張照片拖曳到此處，或點擊批次選取上傳
                    </p>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      支援一次選取／拖入多張主圖、開關門、內部及配件實拍
                    </p>
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
                      const nextH = Number(grp);
                      setFormHeightGroup(grp);
                      setFormHeight(nextH);
                      applyMenuPricingForDimensions(nextH, formDepth, formLength, false);
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

              {/* Dimensions (Height, Depth, Length) with Auto-Pricing */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-stone-800">
                    詳細尺寸規格 (單位：公分 cm)
                  </span>
                  <button
                    type="button"
                    onClick={() => applyMenuPricingForDimensions(formHeight, formDepth, formLength)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 text-[11px] font-semibold transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-amber-800" />
                    <span>依尺寸套用菜單價格</span>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-stone-500 mb-1">高度 (cm)</label>
                    <input
                      type="number"
                      min={30}
                      value={formHeight}
                      onChange={(e) => {
                        const nextH = Number(e.target.value);
                        setFormHeight(nextH);
                        if (nextH > 0) {
                          applyMenuPricingForDimensions(nextH, formDepth, formLength);
                        }
                      }}
                      className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-500 mb-1">深度 (cm)</label>
                    <input
                      type="number"
                      min={30}
                      value={formDepth}
                      onChange={(e) => {
                        const nextD = Number(e.target.value);
                        setFormDepth(nextD);
                        if (nextD > 0) {
                          applyMenuPricingForDimensions(formHeight, nextD, formLength);
                        }
                      }}
                      className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-500 mb-1">長度/面寬 (cm)</label>
                    <input
                      type="number"
                      min={30}
                      value={formLength}
                      onChange={(e) => {
                        const nextL = Number(e.target.value);
                        setFormLength(nextL);
                        if (nextL > 0) {
                          applyMenuPricingForDimensions(formHeight, formDepth, nextL);
                        }
                      }}
                      className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>
                </div>
                {pricingAutoNote && (
                  <div className="text-[11px] text-amber-900 bg-amber-50/90 border border-amber-200 rounded-lg px-2.5 py-1.5 font-medium">
                    {pricingAutoNote}
                  </div>
                )}
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

              {/* Highlight Tag Management (Add/Delete/Drag-to-reorder tags dynamically) */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-bold text-stone-800">
                    配置亮點標籤（可新增、刪除與拖動前後順序）
                  </label>
                  <span className="text-[11px] text-stone-400 shrink-0">
                    目前 {formHighlights.length} 個標籤
                  </span>
                </div>

                {/* Draggable Tag List with Move & Delete Buttons */}
                <div className="flex flex-wrap gap-1.5 min-h-9 p-2 bg-white rounded-lg border border-stone-200">
                  {formHighlights.length === 0 && (
                    <span className="text-[11px] text-stone-400 py-0.5 px-1">
                      尚未新增標籤，請在下方輸入後新增
                    </span>
                  )}
                  {formHighlights.map((tag, idx) => {
                    const isDragged = draggedTagIndex === idx;
                    const isDragOver = dragOverTagIndex === idx && draggedTagIndex !== idx;
                    return (
                      <span
                        key={`${tag}-${idx}`}
                        draggable
                        onDragStart={(e) => {
                          setDraggedTagIndex(idx);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', String(idx));
                        }}
                        onDragOver={(e) => {
                          if (hasDraggedFiles(e)) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverTagIndex !== idx) {
                            setDragOverTagIndex(idx);
                          }
                        }}
                        onDrop={(e) => {
                          if (hasDraggedFiles(e)) return;
                          e.preventDefault();
                          const rawFrom = e.dataTransfer.getData('text/plain');
                          const fromIdx =
                            draggedTagIndex !== null ? draggedTagIndex : Number(rawFrom);
                          if (!Number.isNaN(fromIdx)) {
                            moveHighlightTag(fromIdx, idx);
                          }
                          setDraggedTagIndex(null);
                          setDragOverTagIndex(null);
                        }}
                        onDragEnd={() => {
                          setDraggedTagIndex(null);
                          setDragOverTagIndex(null);
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border select-none cursor-grab active:cursor-grabbing transition-all ${
                          isDragged
                            ? 'opacity-40 scale-95 bg-amber-100 border-amber-400 text-amber-950'
                            : isDragOver
                              ? 'bg-amber-100 border-amber-700 text-amber-950 ring-2 ring-amber-600/40'
                              : 'bg-amber-50 text-amber-950 border-amber-200 hover:border-amber-400'
                        }`}
                        title="按住左鍵可直接拖曳調整前後順序"
                      >
                        <GripVertical className="w-3 h-3 text-amber-700/70 shrink-0" />
                        <span>{tag}</span>
                        <span className="inline-flex items-center gap-0.5 ml-0.5 border-l border-amber-200/80 pl-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveHighlightTag(idx, idx - 1)}
                            className="text-stone-400 hover:text-amber-900 disabled:opacity-25 disabled:cursor-not-allowed p-0.5"
                            title="往前移"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === formHighlights.length - 1}
                            onClick={() => moveHighlightTag(idx, idx + 1)}
                            className="text-stone-400 hover:text-amber-900 disabled:opacity-25 disabled:cursor-not-allowed p-0.5"
                            title="往後移"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveHighlightTag(idx)}
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
                  disabled={isSubmitting}
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? '正在寫入雲端資料庫...'
                      : editingModelId
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
      {deletingModel && (
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
                    確定要刪除此貓別墅款式？
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
                  setDeletingModel(null);
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
                src={(deletingModel.images && deletingModel.images[0]) || deletingModel.image}
                alt={deletingModel.name}
                className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0"
              />
              <div className="min-w-0">
                <div className="inline-block px-2 py-0.5 rounded bg-amber-900 text-white text-[10px] font-bold font-mono mb-1">
                  {deletingModel.dimensions.dimensionCode} cm
                </div>
                <div className="font-bold text-stone-900 text-xs truncate">
                  {deletingModel.name}
                </div>
                <div className="text-[11px] font-semibold text-amber-900 font-mono mt-0.5">
                  NT$ {deletingModel.price.toLocaleString()}
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
                  setDeletingModel(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteModel}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? '雲端刪除同步中...' : '確認刪除款式'}</span>
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
