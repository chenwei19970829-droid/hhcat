import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  HUA_HUA_STORY,
  HuaHuaPhoto,
  STORE_INFO
} from '../data/catVillaData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, getDocsFromServer, onSnapshot, setDoc } from 'firebase/firestore';
import { compressImage } from '../utils/imageCompressor';
import { useStoreOwner } from '../utils/adminAuth';
import { StoreOwnerAuthModal } from './StoreOwnerAuthModal';
import { CloudErrorState, CloudSyncStatusBar } from './CloudSyncStatusBar';
import {
  fitImagesWithinFirestoreLimit,
  formatFirestoreActionError,
  isQuotaError,
  loadRecoveryQueue,
  saveRecoveryQueue
} from '../utils/cloudSync';
import {
  Sparkles,
  Camera,
  Upload,
  Trash2,
  Maximize2,
  ExternalLink,
  Clock,
  Instagram,
  Facebook,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  X
} from 'lucide-react';

interface BrandStorySectionProps {
  onOpenImageZoom?: (title: string, imageUrl: string, subtitle?: string) => void;
}

const LOCAL_STORAGE_KEY = 'huahua_brand_custom_photos_v1';
const DELETED_STORY_KEY = 'huahua_deleted_story_ids_v1';
const STORY_RECOVERY_KEY = 'huahua_brand_unsynced_recovery_v1';
const DEFAULT_STORY_IDS = new Set(HUA_HUA_STORY.initialPhotos.map((p) => p.id));

const getLocalDeletedStoryIds = (): string[] => {
  try {
    const raw = localStorage.getItem(DELETED_STORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

const addLocalDeletedStoryId = (id: string) => {
  try {
    const ids = getLocalDeletedStoryIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(DELETED_STORY_KEY, JSON.stringify(ids));
    }
  } catch (err) {
    console.warn('Could not save deleted story id:', err);
  }
};

const removeLocalDeletedStoryId = (id: string) => {
  try {
    const ids = getLocalDeletedStoryIds();
    if (ids.includes(id)) {
      localStorage.setItem(
        DELETED_STORY_KEY,
        JSON.stringify(ids.filter((x) => x !== id))
      );
    }
  } catch (err) {
    console.warn('Could not remove deleted story id:', err);
  }
};

export const BrandStorySection: React.FC<BrandStorySectionProps> = ({ onOpenImageZoom }) => {
  const { isOwner, logout } = useStoreOwner();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authActionTitle, setAuthActionTitle] = useState('店主管理操作');
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  // Timeline photos state: merges curated photos + Firestore synced uploads
  const [customPhotos, setCustomPhotos] = useState<HuaHuaPhoto[]>([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>(() => getLocalDeletedStoryIds());
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cloud sync & recovery state
  const [cloudError, setCloudError] = useState<CloudErrorState | null>(null);
  const [cloudItemIds, setCloudItemIds] = useState<Set<string>>(() => new Set());
  const [unsyncedLocalPhotos, setUnsyncedLocalPhotos] = useState<HuaHuaPhoto[]>(() =>
    loadRecoveryQueue<HuaHuaPhoto>(STORY_RECOVERY_KEY)
  );
  const [isSyncingManual, setIsSyncingManual] = useState(false);
  const [syncNoticeBanner, setSyncNoticeBanner] = useState<string | null>(null);

  // New photo form state
  const [newTitle, setNewTitle] = useState('');
  const [newAgeStage, setNewAgeStage] = useState('');
  const [newDateStr, setNewDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [newCaption, setNewCaption] = useState('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // In-app delete confirmation modal
  const [deletingPhoto, setDeletingPhoto] = useState<HuaHuaPhoto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const applyFirestoreSnapshotDocs = useCallback(
    (docs: Array<{ id: string; data: () => Record<string, unknown> }>) => {
      const deletedFromCloud = new Set<string>();
      const remotePhotos: HuaHuaPhoto[] = [];

      docs.forEach((docSnap) => {
        const data = docSnap.data();
        const resolvedId = (typeof data.id === 'string' && data.id) || docSnap.id;
        if (data.deleted === true) {
          deletedFromCloud.add(resolvedId);
        } else if (resolvedId && typeof data.title === 'string' && typeof data.imageUrl === 'string') {
          remotePhotos.push({
            id: resolvedId,
            title: data.title,
            ageStage: typeof data.ageStage === 'string' && data.ageStage ? data.ageStage : '幸福日常',
            dateStr: typeof data.dateStr === 'string' && data.dateStr ? data.dateStr : '近期拍攝',
            imageUrl: data.imageUrl,
            storyCaption:
              typeof data.storyCaption === 'string' && data.storyCaption
                ? data.storyCaption
                : '花花在門店的可愛留影',
            isCustomUpload: true
          });
        }
      });

      const mergedDeleted = new Set<string>([
        ...Array.from(deletedFromCloud),
        ...getLocalDeletedStoryIds()
      ]);

      const activeRemotes = remotePhotos.filter((r) => !mergedDeleted.has(r.id));
      const cloudIdsSet = new Set(activeRemotes.map((r) => r.id));

      // Rescue any old localStorage-only HuaHua photos so owner can sync them to Firestore
      const strandedMap = new Map<string, HuaHuaPhoto>();
      loadRecoveryQueue<HuaHuaPhoto>(STORY_RECOVERY_KEY).forEach((p) => {
        if (p && p.id && !cloudIdsSet.has(p.id) && !mergedDeleted.has(p.id)) {
          strandedMap.set(p.id, p);
        }
      });

      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            parsed.forEach((p) => {
              if (
                p &&
                p.id &&
                !DEFAULT_STORY_IDS.has(p.id) &&
                !cloudIdsSet.has(p.id) &&
                !mergedDeleted.has(p.id)
              ) {
                strandedMap.set(p.id, p as HuaHuaPhoto);
              }
            });
          }
        }
      } catch {
        // ignore
      }

      const strandedList = Array.from(strandedMap.values());
      saveRecoveryQueue(STORY_RECOVERY_KEY, strandedList);

      setCloudError(null);
      setCloudItemIds(cloudIdsSet);
      setUnsyncedLocalPhotos(strandedList);
      setDeletedPhotoIds(Array.from(mergedDeleted));
      setCustomPhotos(activeRemotes);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(activeRemotes));
      } catch (err) {
        console.warn('Could not persist story cache:', err);
      }
    },
    []
  );

  // Load initial cache and subscribe to Firestore brandStoryPhotos
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCustomPhotos(parsed);
        }
      }
    } catch (err) {
      console.warn('Failed to parse saved custom Hua Hua photos', err);
    }

    const unsubscribe = onSnapshot(
      collection(db, 'brandStoryPhotos'),
      (snapshot) => {
        applyFirestoreSnapshotDocs(snapshot.docs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'brandStoryPhotos');
        setCloudError({
          message: formatFirestoreActionError(error, '讀取雲端花花成長寫真'),
          isQuota: isQuotaError(error)
        });
      }
    );

    return () => unsubscribe();
  }, [applyFirestoreSnapshotDocs]);

  const saveCustomPhotos = (photos: HuaHuaPhoto[]) => {
    setCustomPhotos(photos);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(photos));
    } catch (err) {
      console.warn('Failed to save to localStorage', err);
    }
  };

  const allPhotos: HuaHuaPhoto[] = [...HUA_HUA_STORY.initialPhotos, ...customPhotos].filter(
    (p) => !deletedPhotoIds.includes(p.id)
  );
  const displayedPhotos: HuaHuaPhoto[] = showAllPhotos ? allPhotos : allPhotos.slice(0, 3);

  const handleManualCloudRefresh = async () => {
    if (isSyncingManual) return;
    setIsSyncingManual(true);
    setSyncNoticeBanner(null);
    try {
      const serverSnap = await getDocsFromServer(collection(db, 'brandStoryPhotos'));
      applyFirestoreSnapshotDocs(serverSnap.docs);
      const activeCount = serverSnap.docs.filter((d) => d.data().deleted !== true).length;
      setSyncNoticeBanner(
        `已完成雲端寫真校對（雲端共 ${activeCount} 張自訂寫真），手機與電腦現為完全一致內容。`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'brandStoryPhotos');
      setCloudError({
        message: formatFirestoreActionError(err, '手動重整花花寫真雲端'),
        isQuota: isQuotaError(err)
      });
    } finally {
      setIsSyncingManual(false);
    }
  };

  const syncStrandedStoryPhoto = async (localPhoto: HuaHuaPhoto): Promise<boolean> => {
    const nowIso = new Date().toISOString();
    const meta = {
      id: localPhoto.id,
      title: localPhoto.title,
      ageStage: localPhoto.ageStage,
      dateStr: localPhoto.dateStr,
      storyCaption: localPhoto.storyCaption,
      isCustomUpload: true,
      deleted: false,
      updatedAt: nowIso
    };
    try {
      const fitted = await fitImagesWithinFirestoreLimit([localPhoto.imageUrl], meta, {
        primaryField: 'imageUrl'
      });
      if (!fitted.ok) {
        setCloudError({ message: fitted.reason, isQuota: false });
        return false;
      }

      await setDoc(doc(db, 'brandStoryPhotos', localPhoto.id), {
        ...meta,
        imageUrl: fitted.images[0]
      });

      const syncedPhoto: HuaHuaPhoto = { ...localPhoto, imageUrl: fitted.images[0], isCustomUpload: true };
      removeLocalDeletedStoryId(localPhoto.id);
      setUnsyncedLocalPhotos((prev) => {
        const next = prev.filter((p) => p.id !== localPhoto.id);
        saveRecoveryQueue(STORY_RECOVERY_KEY, next);
        return next;
      });
      setCloudItemIds((prev) => new Set(prev).add(localPhoto.id));
      setCloudError(null);
      saveCustomPhotos([...customPhotos.filter((p) => p.id !== syncedPhoto.id), syncedPhoto]);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `brandStoryPhotos/${localPhoto.id}`);
      setCloudError({
        message: formatFirestoreActionError(err, `補傳「${localPhoto.title}」至雲端`),
        isQuota: isQuotaError(err)
      });
      return false;
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('請選擇圖片檔案（JPG / PNG / WebP）');
      e.target.value = '';
      return;
    }

    try {
      setFormError('');
      const compressed = await compressImage(file, 840, 0.7);
      setPreviewDataUrl(compressed);
    } catch {
      setFormError('圖片壓縮處理失敗，請換一張再試');
    } finally {
      e.target.value = '';
    }
  };

  const handleAddPhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!previewDataUrl) {
      setFormError('請先選擇並預覽要上傳的花花照片');
      return;
    }
    if (!newTitle.trim()) {
      setFormError('請輸入照片標題');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    const targetId = `hh-custom-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const draftItem: HuaHuaPhoto = {
      id: targetId,
      title: newTitle.trim(),
      ageStage: newAgeStage.trim() || '幸福日常',
      dateStr: newDateStr || '近期拍攝',
      imageUrl: previewDataUrl,
      storyCaption: newCaption.trim() || '花花在門店的可愛留影',
      isCustomUpload: true
    };

    const meta = {
      id: targetId,
      title: draftItem.title,
      ageStage: draftItem.ageStage,
      dateStr: draftItem.dateStr,
      storyCaption: draftItem.storyCaption,
      isCustomUpload: true,
      deleted: false,
      updatedAt: nowIso
    };

    try {
      const fitted = await fitImagesWithinFirestoreLimit([previewDataUrl], meta, {
        primaryField: 'imageUrl'
      });
      if (!fitted.ok) {
        setFormError(fitted.reason);
        setIsSubmitting(false);
        return;
      }

      await setDoc(doc(db, 'brandStoryPhotos', targetId), {
        ...meta,
        imageUrl: fitted.images[0]
      });

      const syncedItem: HuaHuaPhoto = { ...draftItem, imageUrl: fitted.images[0] };
      removeLocalDeletedStoryId(targetId);
      saveCustomPhotos([...customPhotos, syncedItem]);
      setCloudItemIds((prev) => new Set(prev).add(targetId));
      setCloudError(null);
      setSyncNoticeBanner(
        `「${syncedItem.title}」已上傳並寫入雲端資料庫，手機、電腦、平板現在皆會顯示！`
      );

      setNewTitle('');
      setNewAgeStage('');
      setNewCaption('');
      setPreviewDataUrl('');
      setFormError('');
      setIsUploadModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `brandStoryPhotos/${targetId}`);
      const msg = formatFirestoreActionError(err, '上傳花花寫真至雲端');
      setFormError(msg);
      if (isQuotaError(err)) {
        setCloudError({ message: msg, isQuota: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestDeletePhoto = (photo: HuaHuaPhoto) => {
    if (!isOwner) {
      setAuthActionTitle('刪除花花照片卡片');
      setIsAuthModalOpen(true);
      return;
    }
    setDeleteError(null);
    setDeletingPhoto(photo);
  };

  const handleConfirmDeletePhoto = async () => {
    if (!deletingPhoto || isDeleting) return;
    const targetPhoto = deletingPhoto;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await setDoc(doc(db, 'brandStoryPhotos', targetPhoto.id), {
        id: targetPhoto.id,
        deleted: true,
        updatedAt: new Date().toISOString()
      });

      addLocalDeletedStoryId(targetPhoto.id);
      if (targetPhoto.isCustomUpload) {
        saveCustomPhotos(customPhotos.filter((p) => p.id !== targetPhoto.id));
      }
      setDeletedPhotoIds((prev) => (prev.includes(targetPhoto.id) ? prev : [...prev, targetPhoto.id]));
      setCloudItemIds((prev) => {
        const next = new Set(prev);
        next.delete(targetPhoto.id);
        return next;
      });
      setDeletingPhoto(null);
      setSyncNoticeBanner(`已從雲端移除「${targetPhoto.title}」，所有裝置已同步更新。`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `brandStoryPhotos/${targetPhoto.id}`);
      const msg = formatFirestoreActionError(err, '雲端刪除花花寫真');
      setDeleteError(msg);
      if (isQuotaError(err)) {
        setCloudError({ message: msg, isQuota: true });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section id="story" className="py-16 sm:py-24 bg-[#FAF7F2] border-b border-stone-200 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="font-serif-title text-2xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            「花花招財貓」是怎麼開始的
          </h2>
          <p className="text-sm sm:text-base text-stone-600 mt-3 leading-relaxed">
            從當年親手剪臍帶拉拔長大的早產小貓「花花」開始，只想幫牠蓋一個能安心打呼嚕的木頭小窩。
          </p>
        </div>

        {/* Owner Heartfelt Story & Hook Card */}
        <div className="mb-14 bg-gradient-to-br from-[#2D1F17] via-[#3A281E] to-[#1F150F] text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-amber-800/40 relative overflow-hidden">
          {/* Subtle warm glow decoration */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-700/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* Top Hook Banner */}
            <div className="inline-flex items-center gap-2 text-amber-300 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>花花首席鏟屎官的真心話 · 不想毛孩住爛木頭</span>
            </div>

            {/* Hook Headline */}
            <div>
              <blockquote className="font-serif-title text-sm sm:text-xl md:text-2xl lg:text-3xl font-bold text-amber-100 leading-relaxed sm:leading-[1.35] tracking-tight">
                <p className="block">「網路上漂亮的貓屋照片這麼多，</p>
                <p className="text-amber-200 mt-2 text-xs sm:text-lg md:text-xl lg:text-2xl font-bold leading-relaxed">
                  但拆箱後裡面藏的，會不會是一堆刺鼻膠水味跟薄脆碎木板？」
                </p>
              </blockquote>
            </div>

            {/* Narrative 2-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-amber-800/40 text-stone-200 text-xs sm:text-sm leading-relaxed">
              {/* Left Column: Real Cat Owner Experience */}
              <div className="space-y-3 bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/10 backdrop-blur-xs">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
                  <span>🐾</span>
                  <span>當初為什麼想自己做？</span>
                </div>
                <p className="text-stone-300 leading-relaxed">
                  哈囉大家，我是<strong className="text-white font-semibold">花花首席鏟屎官</strong>，平常客人都叫我陳店長。以前我也跟許多貓奴一樣，在網路上看到好看的貓跳台就下單了，結果箱子一打開，一股刺鼻味衝出來，木板還晃來晃去。
                </p>
                <p className="text-amber-200 font-semibold leading-relaxed">
                  看著花花湊上去聞了兩口就掉頭走掉，我心裡超難受：每天捧在手心上疼的小寶貝，怎麼捨得讓牠吸這種刺鼻味、睡在這種爛木頭裡？
                </p>
              </div>

              {/* Right Column: Casual Cat-Owner Decision & Hua Hua Daily Proof */}
              <div className="space-y-4 bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/10 backdrop-blur-xs">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
                    <span>🪵</span>
                    <span>乾脆自己挽袖子來做！</span>
                  </div>
                  <p className="text-stone-300 leading-relaxed">
                    心一橫想說：既然外面買不到放心的，那我自己來挑木頭總行了吧！我不懂什麼華麗的話術，只知道毛孩每天在裡面舔毛、磨爪、睡懶覺，木頭一定要選沒甲醛的天然純松木，板子要夠厚才不會搖晃。就像幫自己家人打櫃子一樣，用料實在、穩穩當當，這就是我做「花花招財貓」最簡單的想法。
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-300">
                    <span>🐱</span>
                    <span>主子睡到翻肚就是最好的證明</span>
                  </div>
                  <p className="text-stone-300 text-xs sm:text-[13px] leading-relaxed">
                    現在家裡這座實木城堡，就是花花每天打滾、伸懶腰、睡到翻肚呼嚕嚕的小天地。看著這小傢伙在裡面玩得安心又自在，就覺得當初決定自己下去做真是太好了！
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Signature */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-300/80 border-t border-amber-800/40">
              <span className="font-serif-title italic">—— 花花首席鏟屎官 陳店長 & 店貓「花花」</span>
              <span className="text-[11px] text-amber-400/70">天然純松木 · 1.5cm 實木板材 · 依圖客製</span>
            </div>
          </div>
        </div>

        {/* Brand Narrative Card & Hua Hua Bio */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-14">
          {/* Left Column: Hua Hua Birth Story */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-stone-100 pb-4">
              <span className="text-xs font-semibold tracking-wider text-amber-800">
                關於花花與我
              </span>
              <h3 className="font-serif-title text-xl sm:text-2xl font-bold text-stone-900 mt-1">
                一切都從這隻巴掌大的早產小貓「花花」開始
              </h3>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-stone-700 leading-relaxed">
              {HUA_HUA_STORY.biography.map((paragraph, idx) => (
                <p key={idx} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Social Media Links */}
            <div className="pt-4 border-t border-stone-100">
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={STORE_INFO.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl transition-colors"
                >
                  <Facebook className="w-3.5 h-3.5 text-blue-600" />
                  <span>FB 粉絲專頁：花花招財貓</span>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </a>

                <a
                  href={STORE_INFO.threadsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl transition-colors"
                >
                  <span className="font-mono text-xs font-bold">@</span>
                  <span>Threads：hhcat.1226</span>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </a>

                <a
                  href={STORE_INFO.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl transition-colors"
                >
                  <Instagram className="w-3.5 h-3.5 text-pink-600" />
                  <span>IG：hhcat.1226</span>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Hua Hua Profile Card */}
          <div className="lg:col-span-5 space-y-6">
            {/* Hua Hua Profile Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="bg-amber-50/80 rounded-2xl p-4 sm:p-5 border border-amber-200/80 text-center space-y-1.5 shadow-2xs">
                <div className="text-[11px] font-bold text-amber-900 tracking-wider">
                  店貓小老闆
                </div>
                <h4 className="font-serif-title text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight leading-tight pt-1">
                  花花
                </h4>
                <div className="text-xs sm:text-sm font-semibold text-amber-900/80 font-mono">
                  （HuaHua）
                </div>
                <div className="pt-1.5 text-xs font-semibold text-amber-950">
                  🐾 {HUA_HUA_STORY.role}
                </div>
              </div>

              {/* Bio Meta Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  <span className="text-[11px] text-stone-400 block">出生日期</span>
                  <span className="font-bold text-stone-800">{HUA_HUA_STORY.birthday}</span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  <span className="text-[11px] text-stone-400 block">性別 / 狀態</span>
                  <span className="font-bold text-stone-800">{HUA_HUA_STORY.gender}</span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  <span className="text-[11px] text-stone-400 block">品種毛色</span>
                  <span className="font-bold text-stone-800">{HUA_HUA_STORY.breed}</span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  <span className="text-[11px] text-stone-400 block">常駐地點</span>
                  <span className="font-bold text-stone-800">臺中市豐原區圓環西路97號</span>
                </div>
              </div>

              {/* Latest Hero Photo of Hua Hua */}
              <div
                className="relative rounded-xl overflow-hidden aspect-4/3 bg-stone-100 border border-stone-200 cursor-pointer group"
                onClick={() =>
                  onOpenImageZoom &&
                  onOpenImageZoom(
                    '花花（店貓小老闆）實拍',
                    '/assets/aistudio/8fdb297a6c7229bdd19a04f83e4243b_0047682f.jpg',
                    '2021年6月23日出生，英短藍貓（母貓已絕育）。打個大哈欠，滿滿幸福安全感！'
                  )
                }
                title="點擊放大查看花花"
              >
                <img
                  src="/assets/aistudio/8fdb297a6c7229bdd19a04f83e4243b_0047682f.jpg"
                  alt="花花在實木貓別墅打哈欠"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 text-white flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold">打個大哈欠 滿滿幸福安全感</div>
                    <div className="text-[10px] text-stone-200">2021/6/23生 · 英短藍貓（已絕育）</div>
                  </div>
                  <div className="p-1.5 bg-black/40 backdrop-blur-xs rounded-lg text-white">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chronological Photo Gallery of Hua Hua's Growth */}
        <div className="pt-8 border-t border-stone-200 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3 max-w-2xl mx-auto">
            <h3 className="font-serif-title text-xl sm:text-2xl md:text-3xl font-bold text-stone-900 leading-snug">
              花花成長歷程寫真
              <span className="block text-xs sm:text-sm font-medium text-stone-500 mt-1">
                （從出生到長大依序排列）
              </span>
            </h3>
            <p className="text-xs sm:text-sm text-stone-500">
              記錄花花從早產只有巴掌大、針筒一滴一滴餵奶，到現在圓滾滾成為店貓小老闆的日常點滴
            </p>

            {isOwner && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleManualCloudRefresh}
                  disabled={isSyncingManual}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl shadow-2xs transition-colors disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingManual ? 'animate-spin' : ''}`} />
                  <span>同步檢查 ({cloudItemIds.size} 筆雲端)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-amber-900 bg-amber-100/90 hover:bg-amber-200 border border-amber-300 rounded-xl transition-all shadow-xs"
                >
                  <Upload className="w-4 h-4 text-amber-900" />
                  <span>店主上傳花花成長紀錄</span>
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="px-2.5 py-2 text-[11px] text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                  title="登出店主管理狀態"
                >
                  鎖定
                </button>
              </div>
            )}
          </div>

          {isOwner && (
            <CloudSyncStatusBar
              sectionLabel="花花成長寫真"
              cloudError={cloudError}
              onDismissError={() => setCloudError(null)}
              onRetrySync={handleManualCloudRefresh}
              syncNoticeBanner={syncNoticeBanner}
              onDismissNotice={() => setSyncNoticeBanner(null)}
              recoveryItems={unsyncedLocalPhotos.map((p) => ({
                id: p.id,
                title: p.title,
                subtitle: `${p.ageStage} · ${p.dateStr}`,
                thumbnailUrl: p.imageUrl
              }))}
              isSyncing={isSyncingManual}
              onSyncRecoveryItem={async (id) => {
                const target = unsyncedLocalPhotos.find((p) => p.id === id);
                if (!target || isSyncingManual) return;
                setIsSyncingManual(true);
                const ok = await syncStrandedStoryPhoto(target);
                if (ok) {
                  setSyncNoticeBanner(`已將「${target.title}」壓縮並補傳至雲端，手機現在也可以看到了！`);
                }
                setIsSyncingManual(false);
              }}
              onDiscardRecoveryItem={(id) => {
                setUnsyncedLocalPhotos((prev) => {
                  const next = prev.filter((p) => p.id !== id);
                  saveRecoveryQueue(STORY_RECOVERY_KEY, next);
                  return next;
                });
                setSyncNoticeBanner('已移除該筆僅存於本機的未同步成長照暫存。');
              }}
            />
          )}

          {/* Timeline Grid (Max 12 initially) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {displayedPhotos.map((photo, index) => (
              <div
                key={photo.id}
                className="bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-md hover:border-amber-800/40 transition-all flex flex-col group relative"
              >
                {/* Photo Thumbnail */}
                <div
                  className="relative aspect-4/3 bg-stone-100 cursor-pointer overflow-hidden flex items-center justify-center"
                  onClick={() =>
                    onOpenImageZoom &&
                    onOpenImageZoom(
                      photo.title,
                      photo.imageUrl,
                      `${photo.ageStage} · ${photo.dateStr} · ${photo.storyCaption}`
                    )
                  }
                  title="點擊放大觀看照片"
                >
                  <img
                    src={photo.imageUrl}
                    alt={`花花招財貓-台中豐原客製化1.5cm松木貓別墅-店貓花花（${photo.title}）`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Stage Badge on Top Left */}
                  <div className="absolute top-2.5 left-2.5 bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-2xs">
                    {index + 1}. {photo.ageStage}
                  </div>

                  {/* Zoom indicator */}
                  <div className="absolute top-2.5 right-2.5 p-1.5 bg-white/80 backdrop-blur-xs rounded-md text-stone-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>

                  {/* Delete card option for Store Owner (Supports deleting any card) */}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestDeletePhoto(photo);
                      }}
                      className="absolute bottom-2.5 right-2.5 p-1.5 bg-red-600/90 text-white rounded-md hover:bg-red-700 transition-colors shadow-xs z-10 flex items-center gap-1 text-[10px]"
                      title="刪除此張寫真照片卡片"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>刪除卡片</span>
                    </button>
                  )}
                </div>

                {/* Caption & Metadata */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-1.5">
                  <div>
                    <h5 className="font-bold text-stone-900 text-xs line-clamp-1 group-hover:text-amber-900 transition-colors">
                      {photo.title}
                    </h5>
                    <div className="text-[11px] text-stone-500 line-clamp-2 mt-1 leading-snug">
                      {photo.storyCaption}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-stone-400" />
                      {photo.dateStr}
                    </span>
                    <span className="text-amber-800 font-medium">花花招財貓</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* View More / Collapse Toggle Button */}
          {allPhotos.length > 3 && (
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => setShowAllPhotos(!showAllPhotos)}
                className="inline-flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-semibold text-amber-950 bg-amber-100/90 hover:bg-amber-200 border border-amber-300 rounded-xl transition-all shadow-xs active:scale-[0.98]"
              >
                {showAllPhotos ? (
                  <>
                    <ChevronUp className="w-4 h-4 text-amber-800" />
                    <span>收起寫真照片（顯示前 3 張）</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 text-amber-800" />
                    <span>查看更多花花成長寫真（還有 {allPhotos.length - 3} 張照片）</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Store Owner to Upload New Photos of Hua Hua */}
      {isUploadModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200 relative animate-fadeIn overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif-title font-bold text-stone-900 text-base">
                    上傳花花新照片 / 成長寫真
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    點擊視窗外不會誤關 · 成功寫入雲端後所有裝置皆可看見
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsUploadModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPhotoSubmit} className="space-y-3.5 text-xs">
              {/* File input */}
              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  選擇照片檔案 (支援 JPG / PNG / WebP)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200 cursor-pointer"
                />
              </div>

              {/* Preview Box */}
              {previewDataUrl && (
                <div className="relative rounded-xl overflow-hidden aspect-4/3 bg-stone-100 border border-stone-200 max-h-48 mx-auto">
                  <img
                    src={previewDataUrl}
                    alt="上傳預覽"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  照片標題 *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例如：花花在門店巡視貓別墅、花花一歲生日..."
                  required
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                />
              </div>

              {/* Age stage & Date row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    成長階段 / 年齡
                  </label>
                  <input
                    type="text"
                    value={newAgeStage}
                    onChange={(e) => setNewAgeStage(e.target.value)}
                    placeholder="例如：3歲成貓、店長上班"
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    拍攝日期
                  </label>
                  <input
                    type="text"
                    value={newDateStr}
                    onChange={(e) => setNewDateStr(e.target.value)}
                    placeholder="例如：2026年近期"
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                  />
                </div>
              </div>

              {/* Story Description */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  照片故事簡述
                </label>
                <textarea
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  rows={2}
                  placeholder="簡短描述當時的故事或花花有趣的舉動..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                />
              </div>

              {formError && (
                <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 bg-amber-900 hover:bg-amber-800 text-white font-semibold rounded-xl transition-colors shadow-xs disabled:opacity-60"
                >
                  {isSubmitting ? '正在寫入雲端資料庫...' : '確認上傳並同步至雲端'}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsUploadModalOpen(false)}
                  className="py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {deletingPhoto && (
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
                    確定要刪除此張花花照片卡片？
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
                  setDeletingPhoto(null);
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
                src={deletingPhoto.imageUrl}
                alt={deletingPhoto.title}
                className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0"
              />
              <div className="min-w-0">
                <div className="font-bold text-stone-900 text-xs truncate">
                  {deletingPhoto.title}
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  {deletingPhoto.ageStage} · {deletingPhoto.dateStr}
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
                  setDeletingPhoto(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeletePhoto}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? '雲端刪除同步中...' : '確認刪除照片'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
