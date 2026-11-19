import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { FEATURED_MODELS, MENU_CATEGORIES, VillaModel } from '../data/catVillaData';

export const VILLA_STORAGE_KEY = 'hhcat_featured_custom_models_v2';
export const VILLA_DELETED_KEY = 'hhcat_deleted_models_ids_v1';
const VILLA_SYNC_EVENT = 'hhcat-villa-models-updated';

const DEFAULT_HEIGHT_GROUP_LABELS: Record<'90' | '120' | '150' | '180', string> = {
  '90': '高 90cm 系列',
  '120': '高 120cm 系列',
  '150': '高 150cm 系列',
  '180': '高 180cm 系列'
};

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
  // Match leading A-Z letters + optional digits (e.g. "A款", "B1款", "B10款", "J2（...）")
  const alphaMatch = trimmed.match(/^([A-Za-z]+)\s*(\d*)/);
  if (alphaMatch) {
    return {
      groupRank: 0,
      alphaPrefix: alphaMatch[1].toUpperCase(),
      numValue: alphaMatch[2] ? parseInt(alphaMatch[2], 10) : 0,
      rawName: trimmed
    };
  }

  // Match leading digits 1-99 (e.g. "1款", "2款", "10款")
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
 * Sorts VillaModels in natural A-Z and 1-99 order:
 * e.g. A -> A1 -> A2 -> ... -> A99 -> B -> B1 -> B2 -> B10 -> ... -> Z -> 1 -> 2 -> ... -> 99.
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

/**
 * Looks up base empty-villa price & on-site installation fee from MENU_CATEGORIES
 * based on height, depth, and length (in cm), including standard surcharge tiers
 * for depth > 60cm (+3,000 per 10cm) and height > 180cm (+1,000 per 10cm).
 */
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

  // Match menu length (60, 90, 120, 150, 180) -> exact or smallest bracket >= length
  const sortedCategories = [...MENU_CATEGORIES].sort((a, b) => a.length - b.length);
  const exactLengthCategory = sortedCategories.find((c) => c.length === l);
  const matchedCategory =
    exactLengthCategory ||
    sortedCategories.find((c) => c.length >= l) ||
    sortedCategories[sortedCategories.length - 1];

  // Match menu height (90, 120, 150, 180)
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
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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

export function useVillaModels() {
  const [models, setModels] = useState<VillaModel[]>(() => loadCachedVillaModels());
  const [isSyncedWithCloud, setIsSyncedWithCloud] = useState(false);

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
        if (!snapshot.empty) {
          const deletedFromCloud = new Set<string>();
          const remoteModels: VillaModel[] = [];
          snapshot.forEach((docSnap) => {
            const parsed = parseFirestoreVillaModel(
              docSnap.id,
              docSnap.data() as Record<string, unknown>
            );
            if (parsed.deletedId) {
              deletedFromCloud.add(parsed.deletedId);
            } else if (parsed.model) {
              remoteModels.push(parsed.model);
            }
          });

          const deletedIds = getLocalDeletedModelIds();
          const remainingDefaults = FEATURED_MODELS.filter(
            (orig) => !remoteModels.some((r) => r.id === orig.id) && !deletedFromCloud.has(orig.id)
          );
          const activeRemotes = remoteModels.filter((r) => !deletedFromCloud.has(r.id));
          setModels(
            sortVillaModels(
              [...activeRemotes, ...remainingDefaults].filter((m) => !deletedIds.includes(m.id))
            )
          );
        }
        setIsSyncedWithCloud(true);
      },
      (error) => {
        setIsSyncedWithCloud(true);
        handleFirestoreError(error, OperationType.GET, 'featuredModels');
      }
    );

    return () => {
      window.removeEventListener(VILLA_SYNC_EVENT, handleSyncEvent);
      unsubscribe();
    };
  }, []);

  return { models, setModels, isSyncedWithCloud };
}
