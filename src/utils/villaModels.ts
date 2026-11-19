import { useCallback, useEffect, useState } from 'react';
import { collection, doc, getDocsFromServer, onSnapshot, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { FEATURED_MODELS, MENU_CATEGORIES, VillaModel } from '../data/catVillaData';
import {
  fitImagesWithinFirestoreLimit,
  formatFirestoreActionError,
  isQuotaError,
  loadRecoveryQueue,
  saveRecoveryQueue
} from './cloudSync';

export const VILLA_STORAGE_KEY = 'hhcat_featured_custom_models_v2';
export const VILLA_DELETED_KEY = 'hhcat_deleted_models_ids_v1';
export const VILLA_RECOVERY_KEY = 'hhcat_featured_unsynced_recovery_v1';
const VILLA_SYNC_EVENT = 'hhcat-villa-models-updated';

const DEFAULT_HEIGHT_GROUP_LABELS: Record<'90' | '120' | '150' | '180', string> = {
  '90': '高 90cm 系列',
  '120': '高 120cm 系列',
  '150': '高 150cm 系列',
  '180': '高 180cm 系列'
};

export interface VillaCloudError {
  message: string;
  isQuota: boolean;
}

export function resolveHeightGroup(height: number): '90' | '120' | '150' | '180' {
  if (height <= 90) return '90';
  if (height <= 120) return '120';
  if (height <= 150) return '150';
  return '180';
}

interface ParsedModelSortKey {
  groupRank: number; // 0 = A-Z (with optional 1-99), 1 = leading number 1-99, 2 = other
  alphaPrefix: string;
  numValue: number;
  rawName: string;
}

function parseModelSortKey(name: string): ParsedModelSortKey {
  const trimmed = (name || '').trim();
  const alphaMatch = trimmed.match(/^([A-Za-z]+)\s*(\d*)/);
  if (alphaMatch) {
    return {
      groupRank: 0,
      alphaPrefix: alphaMatch[1].toUpperCase(),
      numValue: alphaMatch[2] ? parseInt(alphaMatch[2], 10) : 0,
      rawName: trimmed
    };
  }

  const numMatch = trimmed.match(/^(\d+)/);
  if (numMatch) {
    return {
      groupRank: 1,
      alphaPrefix: '',
      numValue: parseInt(numMatch[1], 10),
      rawName: trimmed
    };
  }

  return {
    groupRank: 2,
    alphaPrefix: trimmed,
    numValue: 0,
    rawName: trimmed
  };
}

/**
 * Sorts VillaModels in natural A-Z and 1-99 order.
 */
export function sortVillaModels(list: VillaModel[]): VillaModel[] {
  return [...list].sort((a, b) => {
    const ka = parseModelSortKey(a.name);
    const kb = parseModelSortKey(b.name);

    if (ka.groupRank !== kb.groupRank) {
      return ka.groupRank - kb.groupRank;
    }

    if (ka.groupRank === 0) {
      if (ka.alphaPrefix !== kb.alphaPrefix) {
        return ka.alphaPrefix < kb.alphaPrefix ? -1 : 1;
      }
      if (ka.numValue !== kb.numValue) {
        return ka.numValue - kb.numValue;
      }
    } else if (ka.groupRank === 1) {
      if (ka.numValue !== kb.numValue) {
        return ka.numValue - kb.numValue;
      }
    }

    const textDiff = ka.rawName.localeCompare(kb.rawName, 'zh-Hant-TW', {
      numeric: true,
      sensitivity: 'base'
    });
    if (textDiff !== 0) return textDiff;

    if (a.dimensions.height !== b.dimensions.height) {
      return a.dimensions.height - b.dimensions.height;
    }
    if (a.dimensions.length !== b.dimensions.length) {
      return a.dimensions.length - b.dimensions.length;
    }
    return a.id.localeCompare(b.id);
  });
}

export interface MenuPricingLookupResult {
  price: number;
  installFee: number;
  heightGroup: '90' | '120' | '150' | '180';
  matchedDimensionCode: string;
  isExactMatch: boolean;
  depthExtraFee: number;
  heightExtraFee: number;
  note: string;
}

export function lookupMenuPricing(
  heightInput: number,
  depthInput: number,
  lengthInput: number
): MenuPricingLookupResult | null {
  const h = Number(heightInput);
  const d = Number(depthInput);
  const l = Number(lengthInput);

  if (!Number.isFinite(h) || !Number.isFinite(l) || h <= 0 || l <= 0) {
    return null;
  }

  const effectiveDepth = Number.isFinite(d) && d > 0 ? d : 60;

  const sortedCategories = [...MENU_CATEGORIES].sort((a, b) => a.length - b.length);
  const exactLengthCategory = sortedCategories.find((c) => c.length === l);
  const matchedCategory =
    exactLengthCategory ||
    sortedCategories.find((c) => c.length >= l) ||
    sortedCategories[sortedCategories.length - 1];

  const heightGroup = resolveHeightGroup(h);
  const targetMenuHeight = Number(heightGroup);
  const sortedItems = [...matchedCategory.items].sort((a, b) => a.height - b.height);
  const exactHeightItem = sortedItems.find((item) => item.height === h);
  const matchedItem =
    exactHeightItem ||
    sortedItems.find((item) => item.height === targetMenuHeight) ||
    sortedItems[sortedItems.length - 1];

  const depthExtraFee =
    effectiveDepth > 60 ? Math.ceil((effectiveDepth - 60) / 10) * 3000 : 0;
  const heightExtraFee =
    h > 180 ? Math.ceil((h - 180) / 10) * 1000 : 0;

  const totalPrice = matchedItem.price + depthExtraFee + heightExtraFee;
  const installFee = matchedItem.installFee;
  const isExactMatch = Boolean(exactLengthCategory && exactHeightItem && effectiveDepth === 60);

  const surchargeParts: string[] = [];
  if (depthExtraFee > 0) {
    surchargeParts.push(`加深 +NT$${depthExtraFee.toLocaleString()}`);
  }
  if (heightExtraFee > 0) {
    surchargeParts.push(`加高 +NT$${heightExtraFee.toLocaleString()}`);
  }

  let note = `已依菜單「${matchedItem.dimensionCode}」`;
  if (!exactLengthCategory || (!exactHeightItem && h <= 180)) {
    note = `已對照最接近上級菜單「${matchedItem.dimensionCode}」`;
  }
  if (surchargeParts.length > 0) {
    note += `（含${surchargeParts.join('、')}）`;
  }
  note += `自動帶入：空屋 NT$${totalPrice.toLocaleString()} · 安裝 NT$${installFee.toLocaleString()}`;

  return {
    price: totalPrice,
    installFee,
    heightGroup,
    matchedDimensionCode: matchedItem.dimensionCode,
    isExactMatch,
    depthExtraFee,
    heightExtraFee,
    note
  };
}

export function getLocalDeletedModelIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VILLA_DELETED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function addLocalDeletedModelId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const deletedIds = getLocalDeletedModelIds();
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem(VILLA_DELETED_KEY, JSON.stringify(deletedIds));
    }
  } catch (err) {
    console.warn('Could not store deleted model id:', err);
  }
}

export function removeLocalDeletedModelId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const deletedIds = getLocalDeletedModelIds();
    if (deletedIds.includes(id)) {
      localStorage.setItem(
        VILLA_DELETED_KEY,
        JSON.stringify(deletedIds.filter((existing) => existing !== id))
      );
    }
  } catch (err) {
    console.warn('Could not remove deleted model id:', err);
  }
}

export function loadCachedVillaModels(): VillaModel[] {
  if (typeof window === 'undefined') return sortVillaModels(FEATURED_MODELS);
  try {
    const deletedIds = getLocalDeletedModelIds();
    const saved = localStorage.getItem(VILLA_STORAGE_KEY);
    let combined: VillaModel[] = FEATURED_MODELS;
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const customOrUpdated = parsed.filter((m): m is VillaModel => Boolean(m && m.id));
        const remainingInitial = FEATURED_MODELS.filter(
          (m) => !customOrUpdated.some((c) => c.id === m.id)
        );
        combined = [...customOrUpdated, ...remainingInitial];
      }
    }
    return sortVillaModels(combined.filter((m) => !deletedIds.includes(m.id)));
  } catch (e) {
    console.warn('Error reading models from storage:', e);
    return sortVillaModels(FEATURED_MODELS);
  }
}

export function notifyVillaModelsUpdated(models: VillaModel[]) {
  if (typeof window === 'undefined') return;
  const sorted = sortVillaModels(models);
  try {
    localStorage.setItem(VILLA_STORAGE_KEY, JSON.stringify(sorted));
  } catch (e) {
    console.warn('Could not persist models to localStorage:', e);
  }
  window.dispatchEvent(new CustomEvent<VillaModel[]>(VILLA_SYNC_EVENT, { detail: sorted }));
}

export function parseFirestoreVillaModel(
  docId: string,
  data: Record<string, unknown>
): { deletedId?: string; model?: VillaModel } {
  const resolvedId = typeof data.id === 'string' && data.id ? data.id : docId;
  if (data.deleted === true) {
    return { deletedId: resolvedId };
  }

  if (typeof data.fullModelData === 'string') {
    try {
      const parsed = JSON.parse(data.fullModelData) as VillaModel;
      if (parsed && parsed.id) {
        return { model: parsed };
      }
    } catch (e) {
      console.warn('Failed parsing fullModelData:', e);
    }
  }

  if (typeof data.name === 'string' && typeof data.image === 'string') {
    const height = Number(data.height) || 120;
    const depth = Number(data.depth) || 60;
    const length = Number(data.length) || 90;
    const heightGroup =
      data.heightGroup === '90' ||
      data.heightGroup === '120' ||
      data.heightGroup === '150' ||
      data.heightGroup === '180'
        ? data.heightGroup
        : resolveHeightGroup(height);

    const highlights = Array.isArray(data.highlights)
      ? data.highlights.filter((x): x is string => typeof x === 'string')
      : ['天然松木', '安全壓克力'];

    const images =
      Array.isArray(data.images) && data.images.length > 0
        ? data.images.filter((x): x is string => typeof x === 'string' && Boolean(x))
        : [data.image];

    const subtitle =
      typeof data.subtitle === 'string' && data.subtitle
        ? data.subtitle
        : '純實木無甲醛 · 高透耐磨安全壓克力門';

    return {
      model: {
        id: resolvedId,
        name: data.name,
        subtitle,
        heightGroup,
        heightGroupLabel: DEFAULT_HEIGHT_GROUP_LABELS[heightGroup],
        badge: typeof data.badge === 'string' && data.badge ? data.badge : undefined,
        price: Number(data.price) || 8500,
        installFee: Number(data.installFee) || 1500,
        dimensions: {
          height,
          depth,
          length,
          dimensionCode: `${height}-${depth}-${length}`
        },
        image: images[0] || data.image,
        images,
        highlights,
        includedAccessories: highlights,
        recommendedCats:
          typeof data.recommendedCats === 'string' && data.recommendedCats
            ? data.recommendedCats
            : '1-2 隻貓咪',
        suitableSpace:
          typeof data.suitableSpace === 'string' && data.suitableSpace
            ? data.suitableSpace
            : '居家室內、客廳或陽台',
        description:
          typeof data.description === 'string' && data.description ? data.description : subtitle,
        isCustomUpload: true
      }
    };
  }

  return {};
}

export function buildFirestoreVillaPayload(model: VillaModel, updatedAtIso: string) {
  return {
    id: model.id,
    name: model.name,
    subtitle: model.subtitle,
    heightGroup: model.heightGroup,
    badge: model.badge || '',
    price: model.price,
    installFee: model.installFee,
    height: model.dimensions.height,
    depth: model.dimensions.depth,
    length: model.dimensions.length,
    highlights: model.includedAccessories || model.highlights || [],
    recommendedCats: model.recommendedCats,
    suitableSpace: model.suitableSpace,
    description: model.description,
    deleted: false,
    updatedAt: updatedAtIso
  };
}

export function useVillaModels() {
  const [models, setModels] = useState<VillaModel[]>(() => loadCachedVillaModels());
  const [isSyncedWithCloud, setIsSyncedWithCloud] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'loading' | 'synced' | 'error'>('loading');
  const [cloudError, setCloudError] = useState<VillaCloudError | null>(null);
  const [cloudModelIds, setCloudModelIds] = useState<Set<string>>(() => new Set());
  const [unsyncedLocalModels, setUnsyncedLocalModels] = useState<VillaModel[]>(() =>
    loadRecoveryQueue<VillaModel>(VILLA_RECOVERY_KEY)
  );
  const [isSyncingManual, setIsSyncingManual] = useState(false);

  const applyFirestoreSnapshotDocs = useCallback(
    (docs: Array<{ id: string; data: () => Record<string, unknown> }>) => {
      const deletedFromCloud = new Set<string>();
      const remoteModels: VillaModel[] = [];

      docs.forEach((docSnap) => {
        const parsed = parseFirestoreVillaModel(docSnap.id, docSnap.data());
        if (parsed.deletedId) {
          deletedFromCloud.add(parsed.deletedId);
        } else if (parsed.model) {
          remoteModels.push(parsed.model);
        }
      });

      const mergedDeletedIds = new Set<string>([
        ...Array.from(deletedFromCloud),
        ...getLocalDeletedModelIds()
      ]);

      const remainingDefaults = FEATURED_MODELS.filter(
        (orig) => !remoteModels.some((r) => r.id === orig.id) && !mergedDeletedIds.has(orig.id)
      );
      const activeRemotes = remoteModels.filter((r) => !mergedDeletedIds.has(r.id));
      const cloudIdsSet = new Set(activeRemotes.map((r) => r.id));

      // Rescue any custom models stranded in localStorage or recovery queue
      const strandedMap = new Map<string, VillaModel>();
      const existingRecovery = loadRecoveryQueue<VillaModel>(VILLA_RECOVERY_KEY);
      existingRecovery.forEach((m) => {
        if (m && m.id && !cloudIdsSet.has(m.id) && !mergedDeletedIds.has(m.id)) {
          strandedMap.set(m.id, m);
        }
      });

      try {
        const cachedRaw = localStorage.getItem(VILLA_STORAGE_KEY);
        if (cachedRaw) {
          const parsedCache = JSON.parse(cachedRaw);
          if (Array.isArray(parsedCache)) {
            parsedCache.forEach((m) => {
              if (
                m &&
                m.id &&
                m.isCustomUpload &&
                !cloudIdsSet.has(m.id) &&
                !mergedDeletedIds.has(m.id)
              ) {
                strandedMap.set(m.id, m as VillaModel);
              }
            });
          }
        }
      } catch {
        // ignore parse errors
      }

      const strandedList = sortVillaModels(Array.from(strandedMap.values()));
      saveRecoveryQueue(VILLA_RECOVERY_KEY, strandedList);

      const nextModels = sortVillaModels([...activeRemotes, ...remainingDefaults]);
      setCloudStatus('synced');
      setCloudError(null);
      setIsSyncedWithCloud(true);
      setCloudModelIds(cloudIdsSet);
      setUnsyncedLocalModels(strandedList);
      setModels(nextModels);
      try {
        localStorage.setItem(VILLA_STORAGE_KEY, JSON.stringify(nextModels));
      } catch (err) {
        console.warn('Could not persist synced villa models:', err);
      }
    },
    []
  );

  useEffect(() => {
    const handleSyncEvent = (e: Event) => {
      const customEvent = e as CustomEvent<VillaModel[]>;
      if (Array.isArray(customEvent.detail)) {
        setModels(sortVillaModels(customEvent.detail));
      }
    };
    window.addEventListener(VILLA_SYNC_EVENT, handleSyncEvent);

    const unsubscribe = onSnapshot(
      collection(db, 'featuredModels'),
      (snapshot) => {
        applyFirestoreSnapshotDocs(snapshot.docs);
      },
      (error) => {
        setIsSyncedWithCloud(true);
        setCloudStatus('error');
        setCloudError({
          message: formatFirestoreActionError(error, '讀取雲端精選款式'),
          isQuota: isQuotaError(error)
        });
        handleFirestoreError(error, OperationType.GET, 'featuredModels');
      }
    );

    return () => {
      window.removeEventListener(VILLA_SYNC_EVENT, handleSyncEvent);
      unsubscribe();
    };
  }, [applyFirestoreSnapshotDocs]);

  const refreshFromCloud = useCallback(async (): Promise<{ ok: boolean; count?: number; error?: string }> => {
    setIsSyncingManual(true);
    try {
      const serverSnap = await getDocsFromServer(collection(db, 'featuredModels'));
      applyFirestoreSnapshotDocs(serverSnap.docs);
      const activeCount = serverSnap.docs.filter((d) => d.data().deleted !== true).length;
      return { ok: true, count: activeCount };
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'featuredModels');
      const msg = formatFirestoreActionError(err, '手動重整雲端精選款式');
      setCloudStatus('error');
      setCloudError({ message: msg, isQuota: isQuotaError(err) });
      return { ok: false, error: msg };
    } finally {
      setIsSyncingManual(false);
    }
  }, [applyFirestoreSnapshotDocs]);

  const syncStrandedModel = useCallback(
    async (localModel: VillaModel): Promise<{ ok: boolean; syncedModel?: VillaModel; error?: string }> => {
      setIsSyncingManual(true);
      try {
        const imgs =
          localModel.images && localModel.images.length > 0
            ? localModel.images.filter(Boolean)
            : [localModel.image].filter(Boolean);
        const nowIso = new Date().toISOString();
        const baseMeta = buildFirestoreVillaPayload(localModel, nowIso);
        const fitted = await fitImagesWithinFirestoreLimit(imgs, baseMeta, {
          primaryField: 'image',
          arrayField: 'images'
        });

        if (!fitted.ok) {
          setCloudError({ message: fitted.reason, isQuota: false });
          return { ok: false, error: fitted.reason };
        }

        await setDoc(doc(db, 'featuredModels', localModel.id), {
          ...baseMeta,
          image: fitted.images[0],
          images: fitted.images
        });

        const syncedModel: VillaModel = {
          ...localModel,
          image: fitted.images[0],
          images: fitted.images,
          isCustomUpload: true
        };

        removeLocalDeletedModelId(localModel.id);
        setUnsyncedLocalModels((prev) => {
          const next = prev.filter((m) => m.id !== localModel.id);
          saveRecoveryQueue(VILLA_RECOVERY_KEY, next);
          return next;
        });
        setCloudModelIds((prev) => new Set(prev).add(localModel.id));
        setCloudStatus('synced');
        setCloudError(null);
        setModels((prev) => {
          const updated = sortVillaModels([syncedModel, ...prev.filter((m) => m.id !== localModel.id)]);
          notifyVillaModelsUpdated(updated);
          return updated;
        });

        return { ok: true, syncedModel };
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `featuredModels/${localModel.id}`);
        const msg = formatFirestoreActionError(err, `補傳「${localModel.name}」至雲端`);
        setCloudError({ message: msg, isQuota: isQuotaError(err) });
        if (isQuotaError(err)) setCloudStatus('error');
        return { ok: false, error: msg };
      } finally {
        setIsSyncingManual(false);
      }
    },
    []
  );

  const discardStrandedModel = useCallback((modelId: string) => {
    setUnsyncedLocalModels((prev) => {
      const next = prev.filter((m) => m.id !== modelId);
      saveRecoveryQueue(VILLA_RECOVERY_KEY, next);
      return next;
    });
  }, []);

  const markModelSynced = useCallback((model: VillaModel) => {
    setUnsyncedLocalModels((prev) => {
      const next = prev.filter((m) => m.id !== model.id);
      saveRecoveryQueue(VILLA_RECOVERY_KEY, next);
      return next;
    });
    setCloudModelIds((prev) => new Set(prev).add(model.id));
    setCloudStatus('synced');
    setCloudError(null);
  }, []);

  const markModelDeleted = useCallback((modelId: string) => {
    setUnsyncedLocalModels((prev) => {
      const next = prev.filter((m) => m.id !== modelId);
      saveRecoveryQueue(VILLA_RECOVERY_KEY, next);
      return next;
    });
    setCloudModelIds((prev) => {
      const next = new Set(prev);
      next.delete(modelId);
      return next;
    });
  }, []);

  return {
    models,
    setModels,
    isSyncedWithCloud,
    cloudStatus,
    cloudError,
    setCloudStatus,
    setCloudError,
    cloudModelIds,
    unsyncedLocalModels,
    isSyncingManual,
    refreshFromCloud,
    syncStrandedModel,
    discardStrandedModel,
    markModelSynced,
    markModelDeleted
  };
}
