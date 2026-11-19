import { ShowcasePhoto } from '../data/catVillaData';

export const SHOWCASE_STORAGE_KEY = 'huahua_custom_showcase_photos_v2';
export const SHOWCASE_ADDED_EVENT = 'hhcat-showcase-photo-added';
export const SHOWCASE_FOCUS_EVENT = 'hhcat-showcase-focus-size';

export type ShowcaseSizeCategory = '60' | '90' | '120' | '150' | '180' | 'custom';

const STANDARD_LENGTHS = new Set(['60', '90', '120', '150', '180']);

/**
 * Extracts length from a dimension tag like "180-60-90 cm" or "150x60x120"
 * and maps it to ShowcaseGallery's sizeCategory ('60'|'90'|'120'|'150'|'180'|'custom').
 */
export function inferShowcaseSizeCategory(
  sizeTag: string,
  titleFallback = ''
): ShowcaseSizeCategory {
  const source = `${sizeTag || ''} ${titleFallback || ''}`;
  // Look for explicit H-D-L or HxDxL pattern first
  const tripleMatch = source.match(/(\d{2,3})\s*[-×xX*＊]\s*(\d{2,3})\s*[-×xX*＊]\s*(\d{2,3})/);
  if (tripleMatch) {
    const lengthStr = tripleMatch[3];
    if (STANDARD_LENGTHS.has(lengthStr)) {
      return lengthStr as ShowcaseSizeCategory;
    }
    return 'custom';
  }

  // Check explicit "長90" / "長度120" mention
  const explicitLengthMatch = source.match(/長(?:度)?\s*(\d{2,3})/);
  if (explicitLengthMatch) {
    const lengthStr = explicitLengthMatch[1];
    return STANDARD_LENGTHS.has(lengthStr)
      ? (lengthStr as ShowcaseSizeCategory)
      : 'custom';
  }

  // Fallback: collect numeric dimensions
  const nums = source.match(/\d{2,3}/g);
  if (nums && nums.length > 0) {
    const candidate = nums[nums.length - 1];
    if (STANDARD_LENGTHS.has(candidate)) {
      return candidate as ShowcaseSizeCategory;
    }
    return 'custom';
  }

  return 'custom';
}

export function publishTransferredShowcasePhoto(photo: ShowcasePhoto) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(SHOWCASE_STORAGE_KEY);
    const existing: ShowcasePhoto[] = raw ? JSON.parse(raw) : [];
    const filtered = Array.isArray(existing)
      ? existing.filter((p) => p && p.id !== photo.id)
      : [];
    localStorage.setItem(SHOWCASE_STORAGE_KEY, JSON.stringify([photo, ...filtered]));
  } catch (err) {
    console.warn('Could not cache transferred showcase photo:', err);
  }
  window.dispatchEvent(new CustomEvent<ShowcasePhoto>(SHOWCASE_ADDED_EVENT, { detail: photo }));
}

export function focusShowcaseSizeCategory(sizeCategory: ShowcaseSizeCategory | 'all') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<ShowcaseSizeCategory | 'all'>(SHOWCASE_FOCUS_EVENT, {
      detail: sizeCategory
    })
  );
  const el = document.getElementById('showcase');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
